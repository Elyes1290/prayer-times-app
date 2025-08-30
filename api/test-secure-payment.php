<?php
// 🚫 FICHIER DE TEST DÉSACTIVÉ EN PRODUCTION
// Ce fichier est utilisé uniquement pour les tests de développement
// Il DOIT être désactivé en production pour éviter l'exposition d'informations sensibles

// ⚠️ VÉRIFICATION MODE PRODUCTION
$isProduction = isset($_ENV['NODE_ENV']) && $_ENV['NODE_ENV'] === 'production';
if ($isProduction) {
    http_response_code(404);
    echo json_encode(['error' => 'Endpoint non disponible en production']);
    exit();
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'config.php';

try {
    $pdo = getDBConnection();
    
    // Tests de sécurité
    $tests = [];
    
    // Test 1: Vérifier que la table temp_payment_tokens existe
    try {
        $stmt = $pdo->query("DESCRIBE temp_payment_tokens");
        $tests['table_exists'] = true;
    } catch (Exception $e) {
        $tests['table_exists'] = false;
        $tests['table_error'] = $e->getMessage();
    }
    
    // Test 2: Vérifier les variables d'environnement critiques
    $tests['stripe_secret_key'] = !empty(STRIPE_SECRET_KEY);
    $tests['stripe_webhook_secret'] = !empty(STRIPE_WEBHOOK_SECRET);
    $tests['encryption_key'] = !empty(getenv('ENCRYPTION_KEY'));
    
    // Test 3: Vérifier la configuration des produits
    $tests['products_configured'] = count($PREMIUM_PRODUCTS) > 0;
    
    // Test 4: Test de chiffrement/déchiffrement
    $testPassword = 'TestPassword123!';
    $encryptionKey = getenv('ENCRYPTION_KEY') ?: hash('sha256', STRIPE_SECRET_KEY);
    $iv = substr(hash('sha256', STRIPE_SECRET_KEY), 0, 16);
    
    $encrypted = openssl_encrypt($testPassword, 'AES-256-CBC', $encryptionKey, 0, $iv);
    $decrypted = openssl_decrypt($encrypted, 'AES-256-CBC', $encryptionKey, 0, $iv);
    
    $tests['encryption_works'] = $decrypted === $testPassword;
    
    // Test 5: Vérifier les tokens expirés
    try {
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM temp_payment_tokens WHERE expires_at < NOW()");
        $stmt->execute();
        $result = $stmt->fetch();
        $tests['expired_tokens_count'] = $result['count'];
    } catch (Exception $e) {
        $tests['expired_tokens_error'] = $e->getMessage();
    }
    
    // Test 6: Vérifier la validation des emails
    $testEmails = [
        'valid@example.com' => filter_var('valid@example.com', FILTER_VALIDATE_EMAIL),
        'invalid-email' => filter_var('invalid-email', FILTER_VALIDATE_EMAIL),
        'test@domain' => filter_var('test@domain', FILTER_VALIDATE_EMAIL)
    ];
    $tests['email_validation'] = $testEmails;
    
    // Test 7: Vérifier la validation des mots de passe
    $testPasswords = [
        'weak' => '123',
        'medium' => 'password123',
        'strong' => 'Password123!'
    ];
    
    $passwordTests = [];
    foreach ($testPasswords as $type => $password) {
        $passwordTests[$type] = [
            'length_ok' => strlen($password) >= 8,
            'has_lowercase' => preg_match('/[a-z]/', $password),
            'has_uppercase' => preg_match('/[A-Z]/', $password),
            'has_digit' => preg_match('/\d/', $password),
            'overall_valid' => strlen($password) >= 8 && 
                              preg_match('/[a-z]/', $password) && 
                              preg_match('/[A-Z]/', $password) && 
                              preg_match('/\d/', $password)
        ];
    }
    $tests['password_validation'] = $passwordTests;
    
    // Résumé des tests
    $allTestsPassed = $tests['table_exists'] && 
                     $tests['stripe_secret_key'] && 
                     $tests['stripe_webhook_secret'] && 
                     $tests['products_configured'] && 
                     $tests['encryption_works'];
    
    echo json_encode([
        'success' => $allTestsPassed,
        'message' => $allTestsPassed ? 'Tous les tests de sécurité sont passés' : 'Certains tests de sécurité ont échoué',
        'tests' => $tests,
        'timestamp' => date('Y-m-d H:i:s'),
        'recommendations' => [
            'security_level' => $allTestsPassed ? 'EXCELLENT' : 'CRITIQUE',
            'next_steps' => $allTestsPassed ? [
                'Configurer un cron job pour nettoyer les tokens expirés',
                'Ajouter un rate limiting',
                'Implémenter des logs de sécurité détaillés'
            ] : [
                'Corriger les tests échoués avant la production',
                'Vérifier la configuration des variables d\'environnement',
                'Créer la table temp_payment_tokens si elle n\'existe pas'
            ]
        ]
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Erreur lors des tests de sécurité',
        'message' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?> 