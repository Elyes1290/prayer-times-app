<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: https://myadhanapp.com');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

require_once 'config.php';

/**
 * 📊 Système de Monitoring Professionnel
 * Surveillance de la santé du système de paiement
 */
class PaymentMonitor {
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->createMonitoringTable();
    }
    
    /**
     * Créer la table de monitoring si elle n'existe pas
     */
    private function createMonitoringTable() {
        $sql = "CREATE TABLE IF NOT EXISTS `payment_monitoring` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `event_type` varchar(50) NOT NULL,
            `status` enum('success','warning','error') NOT NULL,
            `message` text,
            `data` json DEFAULT NULL,
            `ip_address` varchar(45) DEFAULT NULL,
            `user_agent` text DEFAULT NULL,
            `response_time` int(11) DEFAULT NULL,
            `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
            
            PRIMARY KEY (`id`),
            KEY `event_type` (`event_type`),
            KEY `status` (`status`),
            KEY `created_at` (`created_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Monitoring des événements de paiement';";
        
        try {
            $this->pdo->exec($sql);
        } catch (PDOException $e) {
            error_log("❌ Erreur création table monitoring: " . $e->getMessage());
        }
    }
    
    /**
     * Logger un événement de paiement
     */
    public function logPaymentEvent($eventType, $status, $message, $data = null, $responseTime = null) {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO payment_monitoring 
                (event_type, status, message, data, ip_address, user_agent, response_time) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $eventType,
                $status,
                $message,
                $data ? json_encode($data) : null,
                $_SERVER['REMOTE_ADDR'] ?? null,
                $_SERVER['HTTP_USER_AGENT'] ?? null,
                $responseTime
            ]);
            
            // Alertes automatiques pour les erreurs critiques
            if ($status === 'error') {
                $this->sendAlert($eventType, $message, $data);
            }
            
        } catch (PDOException $e) {
            error_log("❌ Erreur logging monitoring: " . $e->getMessage());
        }
    }
    
    /**
     * Envoyer une alerte (simulation - à connecter avec un vrai système)
     */
    private function sendAlert($eventType, $message, $data) {
        $alert = [
            'type' => 'payment_error',
            'event_type' => $eventType,
            'message' => $message,
            'data' => $data,
            'timestamp' => date('Y-m-d H:i:s'),
            'severity' => 'high'
        ];
        
        // Log de l'alerte (remplacer par webhook/email)
        error_log("🚨 ALERTE PAIEMENT: " . json_encode($alert));
    }
    
    /**
     * Vérifier la santé du système
     */
    public function checkSystemHealth() {
        $health = [
            'database' => $this->checkDatabaseHealth(),
            'stripe_webhook' => $this->checkWebhookHealth(),
            'token_cleanup' => $this->checkTokenCleanupHealth(),
            'rate_limiting' => $this->checkRateLimitHealth(),
            'overall_score' => 0
        ];
        
        // Calculer le score global
        $scores = array_column($health, 'score');
        $health['overall_score'] = array_sum($scores) / count($scores);
        
        return $health;
    }
    
    /**
     * Vérifier la santé de la base de données
     */
    private function checkDatabaseHealth() {
        try {
            // Test de connexion simple
            $stmt = $this->pdo->query("SELECT 1");
            $stmt->fetch();
            
            // Vérifier les tables critiques avec une approche plus simple
            $tables = ['users', 'premium_subscriptions', 'temp_payment_tokens', 'rate_limits'];
            $missingTables = [];
            
            foreach ($tables as $table) {
                try {
                    $stmt = $this->pdo->query("SELECT COUNT(*) FROM `$table` LIMIT 1");
                    $stmt->fetch();
                } catch (PDOException $e) {
                    $missingTables[] = $table;
                }
            }
            
            return [
                'status' => empty($missingTables) ? 'healthy' : 'warning',
                'score' => empty($missingTables) ? 100 : 70,
                'message' => empty($missingTables) ? 'Base de données OK' : 'Tables manquantes: ' . implode(', ', $missingTables),
                'details' => [
                    'connection' => 'OK',
                    'missing_tables' => $missingTables
                ]
            ];
            
        } catch (PDOException $e) {
            return [
                'status' => 'error',
                'score' => 0,
                'message' => 'Erreur de connexion DB: ' . $e->getMessage(),
                'details' => ['error' => $e->getMessage()]
            ];
        }
    }
    
    /**
     * Vérifier la santé des webhooks Stripe
     */
    private function checkWebhookHealth() {
        try {
            // Vérifier les webhooks récents (dernières 24h)
            $stmt = $this->pdo->prepare("
                SELECT 
                    COUNT(*) as total_events,
                    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
                    SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count,
                    MAX(created_at) as last_event
                FROM payment_monitoring 
                WHERE event_type LIKE '%webhook%' 
                AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
            ");
            $stmt->execute();
            $stats = $stmt->fetch();
            
            $successRate = $stats['total_events'] > 0 ? 
                ($stats['success_count'] / $stats['total_events']) * 100 : 100;
            
            $status = $successRate >= 95 ? 'healthy' : ($successRate >= 80 ? 'warning' : 'error');
            $score = min(100, $successRate);
            
            return [
                'status' => $status,
                'score' => $score,
                'message' => "Webhooks: {$successRate}% de succès",
                'details' => [
                    'total_events' => $stats['total_events'],
                    'success_rate' => $successRate,
                    'last_event' => $stats['last_event']
                ]
            ];
            
        } catch (PDOException $e) {
            return [
                'status' => 'error',
                'score' => 0,
                'message' => 'Erreur vérification webhooks',
                'details' => ['error' => $e->getMessage()]
            ];
        }
    }
    
    /**
     * Vérifier la santé du nettoyage des tokens
     */
    private function checkTokenCleanupHealth() {
        try {
            // Vérifier les tokens expirés non nettoyés
            $stmt = $this->pdo->prepare("
                SELECT COUNT(*) as expired_tokens
                FROM temp_payment_tokens 
                WHERE expires_at < NOW() AND used = 0
            ");
            $stmt->execute();
            $result = $stmt->fetch();
            
            $expiredTokens = $result['expired_tokens'];
            $status = $expiredTokens === 0 ? 'healthy' : ($expiredTokens < 10 ? 'warning' : 'error');
            $score = $expiredTokens === 0 ? 100 : max(0, 100 - ($expiredTokens * 10));
            
            return [
                'status' => $status,
                'score' => $score,
                'message' => $expiredTokens === 0 ? 'Nettoyage OK' : "{$expiredTokens} tokens expirés non nettoyés",
                'details' => [
                    'expired_tokens' => $expiredTokens,
                    'cleanup_needed' => $expiredTokens > 0
                ]
            ];
            
        } catch (PDOException $e) {
            return [
                'status' => 'error',
                'score' => 0,
                'message' => 'Erreur vérification nettoyage',
                'details' => ['error' => $e->getMessage()]
            ];
        }
    }
    
    /**
     * Vérifier la santé du rate limiting
     */
    private function checkRateLimitHealth() {
        try {
            // Vérifier les IPs bloquées
            $stmt = $this->pdo->prepare("
                SELECT COUNT(*) as blocked_ips
                FROM rate_limits 
                WHERE blocked_until > NOW()
            ");
            $stmt->execute();
            $result = $stmt->fetch();
            
            $blockedIPs = $result['blocked_ips'];
            $status = $blockedIPs === 0 ? 'healthy' : ($blockedIPs < 5 ? 'warning' : 'error');
            $score = $blockedIPs === 0 ? 100 : max(0, 100 - ($blockedIPs * 20));
            
            return [
                'status' => $status,
                'score' => $score,
                'message' => $blockedIPs === 0 ? 'Rate limiting OK' : "{$blockedIPs} IPs bloquées",
                'details' => [
                    'blocked_ips' => $blockedIPs,
                    'protection_active' => true
                ]
            ];
            
        } catch (PDOException $e) {
            return [
                'status' => 'error',
                'score' => 0,
                'message' => 'Erreur vérification rate limiting',
                'details' => ['error' => $e->getMessage()]
            ];
        }
    }
    
    /**
     * Obtenir les statistiques de performance
     */
    public function getPerformanceStats($hours = 24) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT 
                    event_type,
                    status,
                    COUNT(*) as count,
                    AVG(response_time) as avg_response_time,
                    MIN(response_time) as min_response_time,
                    MAX(response_time) as max_response_time
                FROM payment_monitoring 
                WHERE created_at > DATE_SUB(NOW(), INTERVAL ? HOUR)
                GROUP BY event_type, status
                ORDER BY event_type, status
            ");
            $stmt->execute([$hours]);
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (PDOException $e) {
            error_log("❌ Erreur stats performance: " . $e->getMessage());
            return [];
        }
    }
}

// 🚀 Utilisation - Seulement si le fichier est appelé directement
if (basename($_SERVER['SCRIPT_NAME']) === 'monitoring.php') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        try {
            $pdo = getDBConnection();
            $monitor = new PaymentMonitor($pdo);
            
            $input = json_decode(file_get_contents('php://input'), true);
            $eventType = $input['event_type'] ?? 'unknown';
            $status = $input['status'] ?? 'success';
            $message = $input['message'] ?? '';
            $data = $input['data'] ?? null;
            $responseTime = $input['response_time'] ?? null;
            
            $monitor->logPaymentEvent($eventType, $status, $message, $data, $responseTime);
            
            echo json_encode([
                'success' => true,
                'message' => 'Événement loggé avec succès'
            ]);
            
        } catch (Exception $e) {
            error_log("❌ Erreur monitoring: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur interne'
            ]);
        }
    }

    // 📊 Route pour la santé du système
    elseif ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['health'])) {
        try {
            $pdo = getDBConnection();
            $monitor = new PaymentMonitor($pdo);
            $health = $monitor->checkSystemHealth();
            
            echo json_encode([
                'success' => true,
                'data' => $health,
                'timestamp' => date('Y-m-d H:i:s')
            ]);
            
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    // 📈 Route pour les statistiques de performance
    elseif ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['performance'])) {
        try {
            $pdo = getDBConnection();
            $monitor = new PaymentMonitor($pdo);
            $hours = $_GET['hours'] ?? 24;
            $stats = $monitor->getPerformanceStats($hours);
            
            echo json_encode([
                'success' => true,
                'data' => $stats,
                'period_hours' => $hours,
                'timestamp' => date('Y-m-d H:i:s')
            ]);
            
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }
}
?> 