<?php
/**
 * Synchronisation manuelle depuis l'app iOS : envoie la date d'expiration Réelle depuis RevenueCat
 * (secours si webhook retardé ou indisponible).
 * POST JSON : { "expiration_at_ms": number, "product_id": string, "original_transaction_id": string|null }
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

require_once __DIR__ . '/config.php';

$allowedProducts = [
    'com.drogbinho.myadhan.sub.monthly' => true,
    'com.drogbinho.myadhan.sub.yearly' => true,
];

function map_product_to_sub_type(string $pid): string
{
    return strpos($pid, 'yearly') !== false ? 'yearly' : 'monthly';
}

try {
    $token = getBearerToken();
    if (!$token) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Token requis']);
        exit();
    }
    $auth = validateAuthToken($token);
    if (!$auth || empty($auth['success'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Token invalide']);
        exit();
    }

    $input = json_decode(file_get_contents('php://input') ?: 'null', true);
    if (!is_array($input)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'JSON invalide']);
        exit();
    }

    $expMs = $input['expiration_at_ms'] ?? null;
    $productId = (string)($input['product_id'] ?? '');
    $origTxn = isset($input['original_transaction_id']) ? (string)$input['original_transaction_id'] : '';

    if ($expMs === null || !is_numeric($expMs)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'expiration_at_ms requis']);
        exit();
    }
    if ($productId === '' || !isset($allowedProducts[$productId])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'product_id invalide']);
        exit();
    }

    $userId = (int)$auth['user_id'];
    $pdo = getDBConnection();
    $stmt = $pdo->prepare('SELECT id, subscription_platform FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Utilisateur introuvable']);
        exit();
    }

    $plat = $row['subscription_platform'] ?? null;
    if ($plat !== null && $plat !== '' && $plat !== 'apple') {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Plateforme abonnement non Apple']);
        exit();
    }

    $expiryDate = date('Y-m-d H:i:s', (int) floor((int)$expMs / 1000));
    $subType = map_product_to_sub_type($productId);

    $upd = $pdo->prepare("
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
    $upd->execute([$subType, $origTxn, $origTxn, $expiryDate, $userId]);

    echo json_encode([
        'success' => true,
        'message' => 'Synchronisation iOS OK',
        'data' => [
            'premium_expiry' => $expiryDate,
            'subscription_type' => $subType,
        ],
        'timestamp' => date('c'),
    ]);
} catch (Exception $e) {
    error_log('[sync-ios-premium] ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur serveur']);
}
