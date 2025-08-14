<?php
require_once 'config.php';

class RateLimiterNew {
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->createRateLimitTable();
    }
    
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
            UNIQUE KEY `ip_action` (`ip_address`, `action`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
        
        try {
            $this->pdo->exec($sql);
        } catch (PDOException $e) {
            error_log("Erreur création table: " . $e->getMessage());
        }
    }
    
    public function checkRateLimit($ip, $action, $maxAttempts = 5, $timeWindow = 3600, $userAgent = null) {
        try {
            // WHITELIST SIMPLE
            if ($this->isWhitelisted($ip)) {
                error_log("IP whitelistée: $ip");
                return [
                    'allowed' => true,
                    'blocked' => false,
                    'attempts' => 0,
                    'remaining_attempts' => 999,
                    'whitelisted' => true,
                    'message' => 'IP whitelistée - Tests illimités autorisés'
                ];
            }
            
            error_log("IP NON whitelistée: $ip");
            
            // Rate limiting normal
            $identifier = $ip;
            if ($userAgent) {
                $userAgentHash = substr(md5($userAgent), 0, 8);
                $identifier = $ip . '_' . $userAgentHash;
            }
            
            // Vérifier les tentatives
            $stmt = $this->pdo->prepare("SELECT * FROM rate_limits WHERE ip_address = ? AND action = ?");
            $stmt->execute([$identifier, $action]);
            $record = $stmt->fetch();
            
            if ($record) {
                // Vérifier si bloqué
                if ($record['blocked_until'] && new DateTime($record['blocked_until']) > new DateTime()) {
                    return [
                        'allowed' => false,
                        'blocked' => true,
                        'message' => "Trop de tentatives. Réessayez plus tard."
                    ];
                }
                
                // Incrémenter les tentatives
                if ($record['attempts'] >= $maxAttempts) {
                    $blockedUntil = (new DateTime())->add(new DateInterval('PT1H'));
                    $stmt = $this->pdo->prepare("UPDATE rate_limits SET blocked_until = ? WHERE ip_address = ? AND action = ?");
                    $stmt->execute([$blockedUntil->format('Y-m-d H:i:s'), $identifier, $action]);
                    
                    return [
                        'allowed' => false,
                        'blocked' => true,
                        'message' => "Trop de tentatives. Réessayez dans 1 heure."
                    ];
                } else {
                    $stmt = $this->pdo->prepare("UPDATE rate_limits SET attempts = attempts + 1, last_attempt = NOW() WHERE ip_address = ? AND action = ?");
                    $stmt->execute([$identifier, $action]);
                    
                    return [
                        'allowed' => true,
                        'blocked' => false,
                        'attempts' => $record['attempts'] + 1,
                        'remaining_attempts' => $maxAttempts - ($record['attempts'] + 1)
                    ];
                }
            } else {
                // Première tentative
                $stmt = $this->pdo->prepare("INSERT INTO rate_limits (ip_address, action, attempts) VALUES (?, ?, 1)");
                $stmt->execute([$identifier, $action]);
                
                return [
                    'allowed' => true,
                    'blocked' => false,
                    'attempts' => 1,
                    'remaining_attempts' => $maxAttempts - 1
                ];
            }
            
        } catch (Exception $e) {
            error_log("Erreur rate limiting: " . $e->getMessage());
            return [
                'allowed' => true,
                'error' => 'Rate limiting temporairement indisponible'
            ];
        }
    }
    
    private function isWhitelisted($ip) {
        $whitelist = [
            '178.197.195.194',
            '2a02:1210:5818:9b00',
            '127.0.0.1',
            '::1'
        ];
        
        foreach ($whitelist as $allowed) {
            if ($ip === $allowed) {
                return true;
            }
            if (strpos($allowed, '2a02:1210:5818:9b00') === 0 && strpos($ip, '2a02:1210:5818:9b00') === 0) {
                return true;
            }
        }
        
        return false;
    }
    
    public function getStats() {
        try {
            $stmt = $this->pdo->prepare("SELECT action, COUNT(*) as total FROM rate_limits GROUP BY action");
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            return [];
        }
    }
}
?>
