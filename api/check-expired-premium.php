<?php
/**
 * 🕐 VÉRIFICATION AUTOMATIQUE DES ABONNEMENTS EXPIRÉS
 * Script de maintenance à exécuter régulièrement (cron job)
 * Désactive automatiquement les premium expirés
 */

// Configuration
header('Content-Type: application/json');
require_once 'config.php';

// Vérifier que le script est autorisé
$cronToken = $_GET['cron_token'] ?? '';
$expectedToken = $_ENV['CRON_TOKEN'] ?? 'prayer_app_cron_2024';

if ($cronToken !== $expectedToken) {
    http_response_code(401);
    echo json_encode(['error' => 'Token cron invalide']);
    exit();
}

try {
    $pdo = getDBConnection();
    $results = [];
    
    // 🔍 1. IDENTIFIER LES PREMIUM EXPIRÉS (sauf VIP)
    $expiredUsersStmt = $pdo->query("
        SELECT id, email, user_first_name, premium_expiry, subscription_type,
               TIMESTAMPDIFF(DAY, NOW(), premium_expiry) as days_remaining
        FROM users 
        WHERE premium_status = 1 
            AND is_vip = FALSE 
            AND premium_expiry IS NOT NULL 
            AND premium_expiry < NOW()
        ORDER BY premium_expiry ASC
    ");
    
    $expiredUsers = $expiredUsersStmt->fetchAll(PDO::FETCH_ASSOC);
    $results['expired_users_found'] = count($expiredUsers);
    
    if (empty($expiredUsers)) {
        $results['message'] = 'Aucun abonnement expiré trouvé';
        echo json_encode(['success' => true, 'data' => $results]);
        exit();
    }
    
    // 🚫 2. DÉSACTIVER LES PREMIUM EXPIRÉS
    $pdo->beginTransaction();
    
    $expiredUserIds = [];
    foreach ($expiredUsers as $user) {
        $expiredUserIds[] = $user['id'];
        
        // Log pour traçabilité
        error_log("⏰ Désactivation premium expiré - User: {$user['email']}, Expiré le: {$user['premium_expiry']}");
    }
    
    // Désactiver en lot pour performance
    if (!empty($expiredUserIds)) {
        $placeholders = str_repeat('?,', count($expiredUserIds) - 1) . '?';
        $stmt = $pdo->prepare("
            UPDATE users 
            SET premium_status = 0,
                updated_at = NOW()
            WHERE id IN ($placeholders)
                AND is_vip = FALSE
        ");
        $stmt->execute($expiredUserIds);
        
        $results['users_deactivated'] = $stmt->rowCount();
    }
    
    // 🔄 3. MARQUER LES ABONNEMENTS COMME EXPIRÉS
    $stmt = $pdo->prepare("
        UPDATE premium_subscriptions ps
        JOIN users u ON ps.user_id = u.id
        SET ps.status = 'expired',
            ps.updated_at = NOW()
        WHERE u.premium_expiry < NOW()
            AND u.is_vip = FALSE
            AND ps.status = 'active'
    ");
    $stmt->execute();
    $results['subscriptions_marked_expired'] = $stmt->rowCount();
    
    // 🔄 4. DÉSACTIVER DANS PREMIUM_USERS
    $stmt = $pdo->prepare("
        UPDATE premium_users pu
        JOIN users u ON pu.user_id = u.id
        SET pu.is_active = FALSE,
            pu.deactivated_at = NOW()
        WHERE u.premium_expiry < NOW()
            AND u.is_vip = FALSE
            AND pu.is_active = TRUE
    ");
    $stmt->execute();
    $results['premium_users_deactivated'] = $stmt->rowCount();
    
    // 🔄 5. MARQUER LES ACHATS COMME EXPIRÉS
    $stmt = $pdo->prepare("
        UPDATE premium_purchases pp
        JOIN users u ON pp.user_id = u.id
        SET pp.status = 'expired'
        WHERE u.premium_expiry < NOW()
            AND u.is_vip = FALSE
            AND pp.status = 'active'
    ");
    $stmt->execute();
    $results['purchases_marked_expired'] = $stmt->rowCount();
    
    // 📊 6. IDENTIFIER LES PREMIUM QUI EXPIRENT BIENTÔT (7 jours)
    $soonExpiringStmt = $pdo->query("
        SELECT id, email, user_first_name, premium_expiry,
               TIMESTAMPDIFF(DAY, NOW(), premium_expiry) as days_remaining
        FROM users 
        WHERE premium_status = 1 
            AND is_vip = FALSE 
            AND premium_expiry IS NOT NULL 
            AND premium_expiry > NOW() 
            AND premium_expiry < DATE_ADD(NOW(), INTERVAL 7 DAY)
        ORDER BY premium_expiry ASC
    ");
    
    $soonExpiringUsers = $soonExpiringStmt->fetchAll(PDO::FETCH_ASSOC);
    $results['soon_expiring_users'] = count($soonExpiringUsers);
    
    // 📝 7. LOG DES EXPIRATIONS BIENTÔT
    if (!empty($soonExpiringUsers)) {
        foreach ($soonExpiringUsers as $user) {
            error_log("⚠️ Premium expire bientôt - User: {$user['email']}, dans {$user['days_remaining']} jour(s)");
        }
    }
    
    $pdo->commit();
    
    // 📊 8. STATISTIQUES FINALES
    $stats = [
        'total_expired_processed' => $results['users_deactivated'] ?? 0,
        'subscriptions_updated' => $results['subscriptions_marked_expired'] ?? 0,
        'premium_users_deactivated' => $results['premium_users_deactivated'] ?? 0,
        'purchases_updated' => $results['purchases_marked_expired'] ?? 0,
        'soon_expiring_count' => $results['soon_expiring_users'] ?? 0,
        'executed_at' => date('Y-m-d H:i:s')
    ];
    
    $results['summary'] = $stats;
    $results['message'] = "Maintenance des abonnements terminée";
    
    echo json_encode([
        'success' => true, 
        'data' => $results
    ]);
    
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    
    error_log("❌ Erreur maintenance abonnements: " . $e->getMessage());
    
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
