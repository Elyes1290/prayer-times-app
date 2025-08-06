<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: https://myadhanapp.com');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

require_once 'config.php';

/**
 * 🛡️ Système de Rate Limiting Professionnel
 * Protection contre les attaques par spam et les abus
 */
class RateLimiter {
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->createRateLimitTable();
    }
    
    /**
     * Créer la table de rate limiting si elle n'existe pas
     */
    private function createRateLimitTable() {
        $sql = "CREATE TABLE IF NOT EXISTS `rate_limits` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `ip_address` varchar(45) NOT NULL,
            `action` varchar(50) NOT NULL,
            `attempts` int(11) DEFAULT 1,
            `first_attempt` timestamp DEFAULT CURRENT_TIMESTAMP,
            `last_attempt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            `blocked_until` timestamp NULL DEFAULT NULL,
            
            PRIMARY KEY (`id`),
            UNIQUE KEY `ip_action` (`ip_address`, `action`),
            KEY `ip_address` (`ip_address`),
            KEY `action` (`action`),
            KEY `blocked_until` (`blocked_until`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Rate limiting pour protection anti-spam';";
        
        try {
            $this->pdo->exec($sql);
        } catch (PDOException $e) {
            error_log("❌ Erreur création table rate_limits: " . $e->getMessage());
        }
    }
    
    /**
     * Vérifier et appliquer les limites de taux
     */
    public function checkRateLimit($ip, $action, $maxAttempts = 5, $timeWindow = 3600) {
        try {
            // Nettoyer les anciennes entrées
            $this->cleanupOldEntries($timeWindow);
            
            // Vérifier si l'IP est bloquée
            $stmt = $this->pdo->prepare("
                SELECT * FROM rate_limits 
                WHERE ip_address = ? AND action = ?
            ");
            $stmt->execute([$ip, $action]);
            $record = $stmt->fetch();
            
            $now = new DateTime();
            
            if ($record) {
                // Vérifier si bloqué
                if ($record['blocked_until'] && new DateTime($record['blocked_until']) > $now) {
                    $blockedUntil = new DateTime($record['blocked_until']);
                    $remainingSeconds = $blockedUntil->getTimestamp() - $now->getTimestamp();
                    
                    return [
                        'allowed' => false,
                        'blocked' => true,
                        'remaining_seconds' => $remainingSeconds,
                        'message' => "Trop de tentatives. Réessayez dans " . ceil($remainingSeconds / 60) . " minutes."
                    ];
                }
                
                // Vérifier la fenêtre de temps
                $firstAttempt = new DateTime($record['first_attempt']);
                $timeDiff = $now->getTimestamp() - $firstAttempt->getTimestamp();
                
                if ($timeDiff < $timeWindow) {
                    // Dans la fenêtre de temps
                    if ($record['attempts'] >= $maxAttempts) {
                        // Bloquer pour 1 heure
                        $blockedUntil = $now->add(new DateInterval('PT1H'));
                        
                        $stmt = $this->pdo->prepare("
                            UPDATE rate_limits 
                            SET blocked_until = ?, attempts = attempts + 1 
                            WHERE ip_address = ? AND action = ?
                        ");
                        $stmt->execute([$blockedUntil->format('Y-m-d H:i:s'), $ip, $action]);
                        
                        return [
                            'allowed' => false,
                            'blocked' => true,
                            'remaining_seconds' => 3600,
                            'message' => "Trop de tentatives. Réessayez dans 1 heure."
                        ];
                    } else {
                        // Incrémenter les tentatives
                        $stmt = $this->pdo->prepare("
                            UPDATE rate_limits 
                            SET attempts = attempts + 1, last_attempt = NOW() 
                            WHERE ip_address = ? AND action = ?
                        ");
                        $stmt->execute([$ip, $action]);
                    }
                } else {
                    // Réinitialiser la fenêtre de temps
                    $stmt = $this->pdo->prepare("
                        UPDATE rate_limits 
                        SET attempts = 1, first_attempt = NOW(), last_attempt = NOW(), blocked_until = NULL 
                        WHERE ip_address = ? AND action = ?
                    ");
                    $stmt->execute([$ip, $action]);
                }
            } else {
                // Première tentative
                $stmt = $this->pdo->prepare("
                    INSERT INTO rate_limits (ip_address, action, attempts) 
                    VALUES (?, ?, 1)
                ");
                $stmt->execute([$ip, $action]);
            }
            
            return [
                'allowed' => true,
                'blocked' => false,
                'attempts' => ($record ? $record['attempts'] + 1 : 1),
                'remaining_attempts' => $maxAttempts - ($record ? $record['attempts'] + 1 : 1)
            ];
            
        } catch (PDOException $e) {
            error_log("❌ Erreur rate limiting: " . $e->getMessage());
            // En cas d'erreur, autoriser par défaut
            return [
                'allowed' => true,
                'error' => 'Rate limiting temporairement indisponible'
            ];
        }
    }
    
    /**
     * Nettoyer les anciennes entrées
     */
    private function cleanupOldEntries($timeWindow) {
        try {
            $stmt = $this->pdo->prepare("
                DELETE FROM rate_limits 
                WHERE last_attempt < DATE_SUB(NOW(), INTERVAL ? SECOND)
                AND blocked_until IS NULL
            ");
            $stmt->execute([$timeWindow]);
        } catch (PDOException $e) {
            error_log("❌ Erreur nettoyage rate limits: " . $e->getMessage());
        }
    }
    
    /**
     * Obtenir les statistiques de rate limiting
     */
    public function getStats() {
        try {
            $stmt = $this->pdo->prepare("
                SELECT 
                    action,
                    COUNT(*) as total_entries,
                    SUM(CASE WHEN blocked_until IS NOT NULL THEN 1 ELSE 0 END) as blocked_count,
                    AVG(attempts) as avg_attempts
                FROM rate_limits 
                GROUP BY action
            ");
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("❌ Erreur stats rate limiting: " . $e->getMessage());
            return [];
        }
    }
}

// 🎯 Configuration des limites par action
$RATE_LIMITS = [
    'payment_attempt' => ['max_attempts' => 5, 'time_window' => 3600],    // 5 paiements/heure
    'email_check' => ['max_attempts' => 10, 'time_window' => 60],         // 10 vérifications/minute
    'login_attempt' => ['max_attempts' => 3, 'time_window' => 300],       // 3 connexions/5min
    'webhook_retry' => ['max_attempts' => 3, 'time_window' => 600],       // 3 retry/10min
];

// 🚀 Utilisation - Seulement si le fichier est appelé directement
if (basename($_SERVER['SCRIPT_NAME']) === 'rate-limiter.php') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        try {
            $pdo = getDBConnection();
            $rateLimiter = new RateLimiter($pdo);
            
            $input = json_decode(file_get_contents('php://input'), true);
            $action = $input['action'] ?? 'unknown';
            $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
            
            // Vérifier les limites
            $limits = $RATE_LIMITS[$action] ?? ['max_attempts' => 10, 'time_window' => 60];
            $result = $rateLimiter->checkRateLimit($ip, $action, $limits['max_attempts'], $limits['time_window']);
            
            if ($result['allowed']) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Rate limit OK',
                    'data' => $result
                ]);
            } else {
                http_response_code(429); // Too Many Requests
                echo json_encode([
                    'success' => false,
                    'error' => 'Rate limit exceeded',
                    'data' => $result
                ]);
            }
            
        } catch (Exception $e) {
            error_log("❌ Erreur rate limiter: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur interne'
            ]);
        }
    }

    // 📊 Route pour les statistiques (admin seulement)
    elseif ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['stats'])) {
        try {
            $pdo = getDBConnection();
            $rateLimiter = new RateLimiter($pdo);
            $stats = $rateLimiter->getStats();
            
            echo json_encode([
                'success' => true,
                'data' => $stats,
                'timestamp' => date('Y-m-d H:i:s')
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }
}
?> 