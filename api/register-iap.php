<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

require_once 'config.php';
// ⚠️ SUPPRESSION DE require_once 'users.php' car il court-circuite la requête POST

$input = json_decode(file_get_contents('php://input'), true);

// Log pour debug sur le serveur
error_log("🍎 [IAP Sync] Données reçues: " . json_encode($input));

if (!$input || empty($input['email']) || empty($input['password']) || empty($input['subscriptionType'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Données manquantes']);
    exit;
}

$email = $input['email'];
$password = $input['password'];
$subscriptionType = $input['subscriptionType'];
$name = $input['name'] ?? 'Utilisateur Apple';
$language = $input['language'] ?? 'fr';
$transactionId = $input['transactionId'] ?? 'apple_' . bin2hex(random_bytes(8));

// Fonctionnalités premium par défaut en JSON
$premiumFeatures = json_encode([
    "prayer_analytics",
    "custom_adhan_sounds",
    "premium_themes",
    "unlimited_bookmarks",
    "ad_free"
]);

try {
    $pdo = getDBConnection();
    
    // Vérifier si l'utilisateur existe déjà
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $existingUser = $stmt->fetch();
    
    // Calculer l'expiration
    $expiryInterval = match($subscriptionType) {
        'monthly' => '+1 month',
        'yearly' => '+1 year',
        'family' => '+1 year',
        default => '+1 year'
    };
    $expiryDate = date('Y-m-d H:i:s', strtotime($expiryInterval));

    if ($existingUser) {
        // Mettre à jour l'utilisateur existant
        $userId = $existingUser['id'];
        
        $stmt = $pdo->prepare("
            UPDATE users SET 
                premium_status = 1,
                subscription_type = ?,
                subscription_id = ?,
                subscription_platform = 'apple',
                premium_expiry = ?,
                premium_features = ?,
                premium_activated_at = NOW(),
                updated_at = NOW(),
                status = 'active'
            WHERE id = ?
        ");
        $stmt->execute([$subscriptionType, $transactionId, $expiryDate, $premiumFeatures, $userId]);
        error_log("🍎 [IAP Sync] Utilisateur mis à jour: ID $userId");
    } else {
        // Créer un nouvel utilisateur
        $password_hash = password_hash($password, PASSWORD_DEFAULT);
        
        $stmt = $pdo->prepare("
            INSERT INTO users (
                email, password_hash, language, user_first_name,
                premium_status, subscription_type, subscription_id, subscription_platform, premium_expiry, 
                premium_features, premium_activated_at,
                created_at, updated_at, last_seen, status, created_from
            ) VALUES (
                ?, ?, ?, ?, 
                1, ?, ?, 'apple', ?, 
                ?, NOW(),
                NOW(), NOW(), NOW(), 'active', 'apple_iap'
            )
        ");
        
        $stmt->execute([
            $email, $password_hash, $language, $name,
            $subscriptionType, $transactionId, $expiryDate, $premiumFeatures
        ]);
        
        $userId = $pdo->lastInsertId();
        error_log("🍎 [IAP Sync] Nouvel utilisateur créé: ID $userId");
    }
    
    // Enregistrer l'achat dans premium_purchases pour l'historique
    $stmt = $pdo->prepare("
        INSERT INTO premium_purchases (
            user_id, subscription_type, subscription_id, premium_expiry,
            purchase_amount, currency, payment_method, transaction_id, status
        ) VALUES (?, ?, ?, ?, ?, 'EUR', 'apple_iap', ?, 'active')
    ");
    
    $amount = match($subscriptionType) {
        'monthly' => 1.99,
        'yearly' => 19.99,
        'family' => 29.99,
        default => 19.99
    };
    
    $stmt->execute([
        $userId, $subscriptionType, $transactionId, $expiryDate,
        $amount, $transactionId
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Utilisateur synchronisé avec succès',
        'userId' => $userId
    ]);

} catch (Exception $e) {
    error_log("🍎 [IAP Sync] ERREUR: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
