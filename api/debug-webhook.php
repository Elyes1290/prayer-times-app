<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: https://myadhanapp.com');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

require_once 'config.php';

// 🚀 DEBUG : Test manuel du webhook
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        echo json_encode([
            'success' => true,
            'message' => 'Test webhook reçu',
            'data' => $input,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
}

// 🚀 DEBUG : Test de création d'utilisateur manuel
elseif ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['test_user'])) {
    try {
        $pdo = getDBConnection();
        
        // Simuler les données d'un utilisateur
        $email = 'test@example.com';
        $name = 'Test User';
        $subscriptionType = 'monthly';
        $sessionId = 'cs_test_manual';
        $language = 'fr';
        $password = 'Test123!';
        
        // Créer l'utilisateur
        $userId = createUserViaExistingAPI($email, $name, $subscriptionType, $sessionId, $language, $password);
        
        echo json_encode([
            'success' => true,
            'message' => 'Utilisateur créé manuellement',
            'user_id' => $userId,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
}

// 🚀 DEBUG : Vérifier les tokens temporaires
elseif ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['check_tokens'])) {
    try {
        $pdo = getDBConnection();
        
        $stmt = $pdo->prepare("SELECT * FROM temp_payment_tokens ORDER BY created_at DESC LIMIT 5");
        $stmt->execute();
        $tokens = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'message' => 'Tokens temporaires trouvés',
            'tokens' => $tokens,
            'count' => count($tokens),
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
}

// 🚀 DEBUG : Vérifier les utilisateurs
elseif ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['check_users'])) {
    try {
        $pdo = getDBConnection();
        
        $stmt = $pdo->prepare("SELECT id, email, user_first_name, created_at FROM users ORDER BY created_at DESC LIMIT 5");
        $stmt->execute();
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'message' => 'Utilisateurs trouvés',
            'users' => $users,
            'count' => count($users),
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
}

else {
    echo json_encode([
        'success' => false,
        'error' => 'Route non trouvée',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?> 