<?php
/**
 * Webhook RevenueCat — renouvelle premium_expiry en base lors des paiements Apple.
 * Sécurité : définissez REVENUECAT_WEBHOOK_AUTH dans .env, puis renseignez la même valeur
 * comme "Authorization header" dans RevenueCat Dashboard → App → Webhooks.
 */

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

/** Produits d'abonnement iOS connus (équivalent iapConfig.ts) */
function rc_apple_subscription_products(): array
{
    return [
        'com.drogbinho.myadhan.sub.monthly' => true,
        'com.drogbinho.myadhan.sub.yearly' => true,
    ];
}

function rc_webhook_auth_ok(): bool
{
    $secret = REVENUECAT_WEBHOOK_AUTH ?? '';
    if ($secret === '') {
        error_log('[RC webhook] REVENUECAT_WEBHOOK_AUTH non défini — refus sécuritaire');
        return false;
    }
    $auth = trim((string)getHeaderValue('Authorization'));
    if ($auth === '') {
        return false;
    }
    // Cas fréquent : Bearer <secret>
    if (stripos($auth, 'Bearer ') === 0) {
        $auth = trim(substr($auth, 7));
    }
    return hash_equals($secret, $auth);
}

/**
 * Détermine si l'évent concerne notre entitlement ou un produit connu Apple.
 */
function rc_event_grant_relevant(array $event): bool
{
    $ent = REVENUECAT_ENTITLEMENT_ID;
    $ids = $event['entitlement_ids'] ?? null;
    if (is_array($ids) && in_array($ent, $ids, true)) {
        return true;
    }
    $pid = (string)($event['product_id'] ?? '');
    if ($pid !== '' && isset(rc_apple_subscription_products()[$pid])) {
        return true;
    }
    return false;
}

/**
 * Collecte tous les IDs pour retrouver l'utilisateur (email, id numérique, alias).
 */
function rc_collect_lookup_ids(array $event): array
{
    $out = [];
    foreach (['app_user_id', 'original_app_user_id'] as $k) {
        if (!empty($event[$k]) && is_string($event[$k])) {
            $out[] = $event[$k];
        }
    }
    if (!empty($event['aliases']) && is_array($event['aliases'])) {
        foreach ($event['aliases'] as $a) {
            if ($a && is_string($a) && strpos($a, '$RCAnonymousID:') !== 0) {
                $out[] = $a;
            }
        }
    }
    return array_values(array_unique($out));
}

function rc_map_product_to_subscription_type(string $productId): string
{
    if (strpos($productId, 'yearly') !== false) {
        return 'yearly';
    }
    return 'monthly';
}

function rc_find_user_by_rc_ids(PDO $pdo, array $ids): ?array
{
    foreach ($ids as $id) {
        if ($id === '' || strpos($id, '$RCAnonymousID:') === 0) {
            continue;
        }
        $stmt = $pdo->prepare('SELECT id, email, subscription_platform FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$id]);
        $u = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($u) {
            return $u;
        }
        if (ctype_digit((string)$id)) {
            $stmt = $pdo->prepare('SELECT id, email, subscription_platform FROM users WHERE id = ? LIMIT 1');
            $stmt->execute([(int)$id]);
            $u = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($u) {
                return $u;
            }
        }
    }
    return null;
}

/** Email envoyé par RevenueCat dans subscriber_attributes ($email) */
function rc_email_from_event(array $event): ?string
{
    $attrs = $event['subscriber_attributes'] ?? null;
    if (!is_array($attrs)) {
        return null;
    }
    $emailAttr = $attrs['$email'] ?? $attrs['email'] ?? null;
    if (is_array($emailAttr) && !empty($emailAttr['value'])) {
        $email = trim((string)$emailAttr['value']);
        return $email !== '' ? $email : null;
    }
    return null;
}

function rc_find_user_by_email(PDO $pdo, string $email): ?array
{
    if ($email === '') {
        return null;
    }
    $stmt = $pdo->prepare('SELECT id, email, subscription_platform FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $u = $stmt->fetch(PDO::FETCH_ASSOC);
    return $u ?: null;
}

/**
 * Clé stable Apple : identique à chaque renouvellement mensuel.
 * C'est l'identifiant principal pour un flux 100 % webhook (comme stripe_subscription_id).
 */
function rc_find_user_by_apple_transaction(PDO $pdo, string $txn): ?array
{
    if ($txn === '') {
        return null;
    }

    $stmt = $pdo->prepare("
        SELECT id, email, subscription_platform FROM users
        WHERE subscription_id = ? AND subscription_platform = 'apple'
        LIMIT 1
    ");
    $stmt->execute([$txn]);
    $u = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($u) {
        return $u;
    }

    $stmt = $pdo->prepare("
        SELECT u.id, u.email, u.subscription_platform
        FROM premium_purchases pp
        JOIN users u ON u.id = pp.user_id
        WHERE pp.payment_method = 'apple_iap'
          AND (pp.transaction_id = ? OR pp.subscription_id = ?)
        ORDER BY pp.created_at DESC
        LIMIT 1
    ");
    $stmt->execute([$txn, $txn]);
    $u = $stmt->fetch(PDO::FETCH_ASSOC);
    return $u ?: null;
}

/**
 * Premier achat : register-iap a créé le compte avec le product_id comme subscription_id
 * quelques secondes avant le webhook INITIAL_PURCHASE (profil RC encore anonyme).
 */
function rc_find_user_by_recent_apple_signup(PDO $pdo, array $event): ?array
{
    $productId = (string)($event['product_id'] ?? '');
    if ($productId === '' || !isset(rc_apple_subscription_products()[$productId])) {
        return null;
    }

    $stmt = $pdo->prepare("
        SELECT id, email, subscription_platform FROM users
        WHERE subscription_platform = 'apple'
          AND subscription_id = ?
          AND (created_from = 'apple_iap' OR created_from IS NULL)
          AND created_at >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)
        ORDER BY created_at DESC
        LIMIT 1
    ");
    $stmt->execute([$productId]);
    $u = $stmt->fetch(PDO::FETCH_ASSOC);
    return $u ?: null;
}

/**
 * Comptes historiques (ex. abo créé avant liaison RC) : product_id + date d'expiration proche.
 */
function rc_find_user_by_apple_product_expiry(PDO $pdo, array $event): ?array
{
    $productId = (string)($event['product_id'] ?? '');
    $expMs = $event['expiration_at_ms'] ?? null;
    if ($productId === '' || !isset(rc_apple_subscription_products()[$productId]) || !is_numeric($expMs)) {
        return null;
    }

    $expiryDate = date('Y-m-d H:i:s', (int) floor((int)$expMs / 1000));
    $stmt = $pdo->prepare("
        SELECT id, email, subscription_platform FROM users
        WHERE subscription_platform = 'apple'
          AND subscription_id = ?
          AND premium_expiry IS NOT NULL
          AND ABS(TIMESTAMPDIFF(DAY, premium_expiry, ?)) <= 35
        ORDER BY ABS(TIMESTAMPDIFF(SECOND, premium_expiry, ?)) ASC
        LIMIT 1
    ");
    $stmt->execute([$productId, $expiryDate, $expiryDate]);
    $u = $stmt->fetch(PDO::FETCH_ASSOC);
    return $u ?: null;
}

/**
 * Réabonnement après expiration : ancien original_transaction_id en base, nouveau dans le webhook.
 * On ne matche que s'il n'y a qu'un seul candidat (évite les collisions).
 */
function rc_find_user_by_recent_apple_lapse(PDO $pdo, array $event): ?array
{
    $productId = (string)($event['product_id'] ?? '');
    if ($productId === '' || !isset(rc_apple_subscription_products()[$productId])) {
        return null;
    }

    $subType = rc_map_product_to_subscription_type($productId);
    $stmt = $pdo->prepare("
        SELECT id, email, subscription_platform FROM users
        WHERE subscription_platform = 'apple'
          AND premium_status = 0
          AND subscription_type = ?
          AND premium_expiry IS NOT NULL
          AND premium_expiry <= NOW()
          AND premium_expiry >= DATE_SUB(NOW(), INTERVAL 180 DAY)
        ORDER BY premium_expiry DESC
        LIMIT 2
    ");
    $stmt->execute([$subType]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (count($rows) !== 1) {
        if (count($rows) > 1) {
            error_log('[RC webhook] Réabonnement ambigu — plusieurs comptes Apple expirés pour type ' . $subType);
        }
        return null;
    }

    error_log('[RC webhook] Match réabonnement (lapse) user ' . $rows[0]['id']);
    return $rows[0];
}

/**
 * Secours : même type d'abo + date d'expiration proche, un seul compte Apple candidat.
 * Couvre réabonnement avec ancien subscription_id numérique encore en base.
 */
function rc_find_user_by_apple_type_expiry_singleton(PDO $pdo, array $event): ?array
{
    $productId = (string)($event['product_id'] ?? '');
    $expMs = $event['expiration_at_ms'] ?? null;
    if ($productId === '' || !isset(rc_apple_subscription_products()[$productId]) || !is_numeric($expMs)) {
        return null;
    }

    $subType = rc_map_product_to_subscription_type($productId);
    $expiryDate = date('Y-m-d H:i:s', (int) floor((int)$expMs / 1000));
    $stmt = $pdo->prepare("
        SELECT id, email, subscription_platform FROM users
        WHERE subscription_platform = 'apple'
          AND subscription_type = ?
          AND premium_expiry IS NOT NULL
          AND ABS(TIMESTAMPDIFF(DAY, premium_expiry, ?)) <= 35
        ORDER BY ABS(TIMESTAMPDIFF(SECOND, premium_expiry, ?)) ASC
        LIMIT 2
    ");
    $stmt->execute([$subType, $expiryDate, $expiryDate]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (count($rows) !== 1) {
        if (count($rows) > 1) {
            error_log('[RC webhook] Match expiry ambigu — plusieurs comptes Apple pour type ' . $subType);
        }
        return null;
    }

    error_log('[RC webhook] Match singleton type+expiry user ' . $rows[0]['id']);
    return $rows[0];
}

/**
 * Résolution utilisateur pour webhook seul — même logique que Stripe (ID abonnement stable).
 */
function rc_resolve_user(PDO $pdo, array $event, string $eventType): ?array
{
    $user = rc_find_user_by_rc_ids($pdo, rc_collect_lookup_ids($event));
    if ($user) {
        return $user;
    }

    $email = rc_email_from_event($event);
    if ($email) {
        $user = rc_find_user_by_email($pdo, $email);
        if ($user) {
            return $user;
        }
    }

    $txn = (string)($event['original_transaction_id'] ?? $event['transaction_id'] ?? '');
    if ($txn !== '') {
        $user = rc_find_user_by_apple_transaction($pdo, $txn);
        if ($user) {
            return $user;
        }
    }

    if ($eventType === 'INITIAL_PURCHASE') {
        $user = rc_find_user_by_recent_apple_signup($pdo, $event);
        if ($user) {
            return $user;
        }

        $user = rc_find_user_by_recent_apple_lapse($pdo, $event);
        if ($user) {
            return $user;
        }
    }

    $user = rc_find_user_by_apple_product_expiry($pdo, $event);
    if ($user) {
        return $user;
    }

    return rc_find_user_by_apple_type_expiry_singleton($pdo, $event);
}

function rc_apply_active_subscription(PDO $pdo, array $user, array $event): void
{
    $expMs = $event['expiration_at_ms'] ?? null;
    if ($expMs === null || !is_numeric($expMs)) {
        error_log('[RC webhook] expiration_at_ms manquant pour user ' . ($user['id'] ?? '?'));
        return;
    }
    $expiryDate = date('Y-m-d H:i:s', (int) floor(((int)$expMs) / 1000));
    $productId = (string)($event['product_id'] ?? '');
    $subType = $productId !== '' ? rc_map_product_to_subscription_type($productId) : 'monthly';
    $txn = (string)($event['original_transaction_id'] ?? $event['transaction_id'] ?? '');

    $stmt = $pdo->prepare("
        UPDATE users SET
            premium_status = 1,
            subscription_platform = 'apple',
            subscription_type = ?,
            subscription_id = CASE WHEN ? <> '' THEN ? ELSE subscription_id END,
            premium_expiry = ?,
            updated_at = NOW()
        WHERE id = ?
          AND (subscription_platform = 'apple' OR subscription_platform IS NULL OR subscription_platform = '')
    ");
    $stmt->execute([$subType, $txn, $txn, $expiryDate, $user['id']]);
    $n = $stmt->rowCount();
    error_log("[RC webhook] Mise à jour premium Apple user {$user['id']}, rows=$n, expiry=$expiryDate type=$subType env=" . ($event['environment'] ?? ''));
}

function rc_apply_expiration(PDO $pdo, array $user): void
{
    $stmt = $pdo->prepare("
        UPDATE users SET premium_status = 0, updated_at = NOW()
        WHERE id = ? AND subscription_platform = 'apple'
    ");
    $stmt->execute([$user['id']]);
    error_log('[RC webhook] EXPIRATION — premium désactivé user ' . $user['id']);
}

// --- Main ---

if (!rc_webhook_auth_ok()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

$raw = file_get_contents('php://input');
$data = json_decode($raw ?: 'null', true);
if (!is_array($data) || empty($data['event'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
    exit();
}

$event = $data['event'];
if (!is_array($event)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid event']);
    exit();
}

$type = (string)($event['type'] ?? '');
$store = (string)($event['store'] ?? '');

try {
    $pdo = getDBConnection();

    if ($type === 'TEST') {
        echo json_encode(['success' => true, 'message' => 'test ok']);
        exit();
    }

    // Hors App Store Apple : ignoré pour cette base MyAdhan Apple (stripe géré séparément)
    if ($store !== '' && $store !== 'APP_STORE') {
        echo json_encode(['success' => true, 'ignored_store' => $store]);
        exit();
    }

    $ids = rc_collect_lookup_ids($event);
    $user = rc_resolve_user($pdo, $event, $type);

    if (!$user) {
        $txn = (string)($event['original_transaction_id'] ?? '');
        error_log('[RC webhook] Utilisateur introuvable pour ' . $type . ' ids=' . json_encode($ids) . ' txn=' . $txn);
        echo json_encode(['success' => true, 'warning' => 'user_not_found']);
        exit();
    }

    $grantTypes = [
        'INITIAL_PURCHASE',
        'RENEWAL',
        'UNCANCELLATION',
        'SUBSCRIPTION_EXTENDED',
        'PRODUCT_CHANGE',
        'NON_RENEWING_PURCHASE',
        'TEMPORARY_ENTITLEMENT_GRANT',
    ];

    if (in_array($type, $grantTypes, true)) {
        if (!rc_event_grant_relevant($event)) {
            echo json_encode(['success' => true, 'skipped' => 'not_our_entitlement']);
            exit();
        }
        rc_apply_active_subscription($pdo, $user, $event);
        echo json_encode(['success' => true, 'handled' => $type]);
        exit();
    }

    if ($type === 'EXPIRATION') {
        if (rc_event_grant_relevant($event) || (($event['product_id'] ?? '') && isset(rc_apple_subscription_products()[(string)$event['product_id']]))) {
            rc_apply_expiration($pdo, $user);
        }
        echo json_encode(['success' => true, 'handled' => 'EXPIRATION']);
        exit();
    }

    // BILLING_ISSUE, CANCELLATION (toujours accès jusqu'à expiration RC) : ne pas désactiver ici ; EXPIRATION le fera.

    echo json_encode(['success' => true, 'noop' => $type]);
} catch (Exception $e) {
    error_log('[RC webhook] Exception: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'server']);
}
