<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'config.php';

// 🔐 Vérifier le token cron pour sécuriser l'endpoint
$cronToken = $_GET['cron_token'] ?? '';
$expectedToken = $_ENV['CRON_TOKEN'] ?? 'prayer_app_cron_2024';

if ($cronToken !== $expectedToken) {
    http_response_code(401);
    echo json_encode(['error' => 'Token cron invalide']);
    exit();
}

try {
    $pdo = getDBConnection();
    
    // Démarrer une transaction
    $pdo->beginTransaction();
    
    // 1. Supprimer les tokens temporaires expirés (paiement)
    $stmt = $pdo->prepare("
        DELETE FROM temp_payment_tokens 
        WHERE expires_at < NOW()
    ");
    $stmt->execute();
    $expiredTokens = $stmt->rowCount();
    
    // 2. Marquer comme utilisés les tokens très anciens (plus de 24h)
    $stmt = $pdo->prepare("
        UPDATE temp_payment_tokens 
        SET used = 1 
        WHERE created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR) 
            AND used = 0
    ");
    $stmt->execute();
    $oldTokens = $stmt->rowCount();
    
    // 3. Supprimer les refresh tokens expirés ou révoqués depuis > 30 jours
    $stmt = $pdo->prepare("\n        DELETE FROM refresh_tokens\n        WHERE expires_at < NOW()\n           OR (revoked_at IS NOT NULL AND revoked_at < DATE_SUB(NOW(), INTERVAL 30 DAY))\n    ");
    $stmt->execute();
    $expiredRefresh = $stmt->rowCount();

    // Valider la transaction
    $pdo->commit();
    
    // Réponse de succès
    echo json_encode([
        'success' => true,
        'message' => 'Nettoyage des tokens terminé avec succès',
        'data' => [
            'expired_tokens_deleted' => $expiredTokens,
            'old_tokens_marked_used' => $oldTokens,
            'expired_refresh_deleted' => $expiredRefresh,
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