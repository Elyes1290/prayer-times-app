<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Charger les variables d'environnement
require_once __DIR__ . '/../vendor/autoload.php';

// 🔐 Vérifier le token cron pour sécuriser l'endpoint
$cronToken = $_GET['cron_token'] ?? '';
$expectedToken = $_ENV['CRON_TOKEN'] ?? 'prayer_app_cron_2024';

if ($cronToken !== $expectedToken) {
    http_response_code(401);
    echo json_encode(['error' => 'Token cron invalide']);
    exit();
}

// Configuration de la base de données
$host = $_ENV['DB_HOST'] ?? 'localhost';
$dbname = $_ENV['DB_NAME'] ?? 'ff42hr_MyAdhan';
$username = $_ENV['DB_USER'] ?? 'ff42hr_temp_1';
$password = $_ENV['DB_PASS'] ?? '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Démarrer une transaction
    $pdo->beginTransaction();
    
    // 1. Marquer comme inactifs les abonnements expirés
    $stmt = $pdo->prepare("
        UPDATE premium_subscriptions 
        SET status = 'canceled', updated_at = NOW()
        WHERE current_period_end < NOW() 
            AND status = 'active'
    ");
    $stmt->execute();
    $expiredSubscriptions = $stmt->rowCount();
    
    // 2. Désactiver les utilisateurs premium expirés
    $stmt = $pdo->prepare("
        UPDATE premium_users pu
        JOIN premium_subscriptions ps ON pu.subscription_id = ps.id
        SET pu.is_active = FALSE, pu.deactivated_at = NOW()
        WHERE ps.current_period_end < NOW() 
            AND pu.is_active = TRUE
    ");
    $stmt->execute();
    $deactivatedUsers = $stmt->rowCount();
    
    // Valider la transaction
    $pdo->commit();
    
    // Réponse de succès
    echo json_encode([
        'success' => true,
        'message' => 'Nettoyage terminé avec succès',
        'data' => [
            'expired_subscriptions' => $expiredSubscriptions,
            'deactivated_users' => $deactivatedUsers,
            'timestamp' => date('Y-m-d H:i:s')
        ]
    ]);
    
} catch (PDOException $e) {
    // Annuler la transaction en cas d'erreur
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    
    echo json_encode([
        'success' => false,
        'error' => 'Erreur de base de données',
        'message' => $e->getMessage()
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Erreur générale',
        'message' => $e->getMessage()
    ]);
}
?> 