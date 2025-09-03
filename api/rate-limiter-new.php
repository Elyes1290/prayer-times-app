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
            `first_attempt` timestamp NULL DEFAULT NULL,
            `last_attempt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            `blocked_until` timestamp NULL DEFAULT NULL,
            PRIMARY KEY (`id`),
            UNIQUE KEY `ip_action` (`ip_address`, `action`),
            KEY `first_attempt` (`first_attempt`),
            KEY `blocked_until` (`blocked_until`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
        
        try {
            $this->pdo->exec($sql);
            
            // ✅ CORRECTION : S'assurer que les colonnes existent avec le bon schéma
            try {
                $this->pdo->exec("ALTER TABLE `rate_limits` MODIFY `first_attempt` timestamp NULL DEFAULT NULL");
            } catch (PDOException $e) {
                // Ignorer si la colonne existe déjà avec le bon type
            }
            
            try {
                $this->pdo->exec("CREATE INDEX `idx_cleanup` ON `rate_limits` (`first_attempt`, `blocked_until`)");
            } catch (PDOException $e) {
                // Ignorer si l'index existe déjà
            }
            
        } catch (PDOException $e) {
            error_log("Erreur création table: " . $e->getMessage());
        }
    }
    
    public function checkRateLimit($ip, $action, $maxAttempts = 5, $timeWindow = 3600, $userAgent = null) {
        // 🚀 PRODUCTION : Rate limiting intelligent basé sur l'environnement
        $isProduction = isset($_ENV['NODE_ENV']) && $_ENV['NODE_ENV'] === 'production';
        
        if (!$isProduction) {
            // Mode développement : Rate limiting désactivé pour les tests
            error_log("🧪 Rate limiting désactivé en mode développement pour IP: $ip, Action: $action");
            return [
                'allowed' => true,
                'blocked' => false,
                'attempts' => 0,
                'remaining_attempts' => 999,
                'whitelisted' => true,
                'message' => 'Rate limiting désactivé en développement'
            ];
        }
        
        // 🔒 PRODUCTION : Rate limiting activé
        try {
            // 🧹 NOUVEAU : Nettoyage automatique des anciens records
            $this->cleanupExpiredRecords();
            
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
                // ✅ CORRECTION FAILLE #1 : Vérifier la fenêtre de temps
                $timeDiff = time() - strtotime($record['first_attempt']);
                
                if ($timeDiff > $timeWindow) {
                    // Fenêtre de temps dépassée : reset les tentatives
                    error_log("🔄 Fenêtre de temps dépassée pour $identifier:$action - Reset tentatives");
                    $stmt = $this->pdo->prepare("UPDATE rate_limits SET attempts = 1, first_attempt = NOW(), last_attempt = NOW(), blocked_until = NULL WHERE ip_address = ? AND action = ?");
                    $stmt->execute([$identifier, $action]);
                    
                    return [
                        'allowed' => true,
                        'blocked' => false,
                        'attempts' => 1,
                        'remaining_attempts' => $maxAttempts - 1,
                        'time_window_reset' => true
                    ];
                }
                
                // Vérifier si bloqué
                if ($record['blocked_until'] && new DateTime($record['blocked_until']) > new DateTime()) {
                    $remainingSeconds = (new DateTime($record['blocked_until']))->getTimestamp() - time();
                    return [
                        'allowed' => false,
                        'blocked' => true,
                        'remaining_seconds' => $remainingSeconds,
                        'message' => "Trop de tentatives. Réessayez plus tard."
                    ];
                }
                
                // ✅ CORRECTION FAILLE #2 : Si bloqué mais timeout expiré, reset
                if ($record['blocked_until'] && new DateTime($record['blocked_until']) <= new DateTime()) {
                    error_log("🔓 Déblocage automatique pour $identifier:$action");
                    $stmt = $this->pdo->prepare("UPDATE rate_limits SET attempts = 1, first_attempt = NOW(), last_attempt = NOW(), blocked_until = NULL WHERE ip_address = ? AND action = ?");
                    $stmt->execute([$identifier, $action]);
                    
                    return [
                        'allowed' => true,
                        'blocked' => false,
                        'attempts' => 1,
                        'remaining_attempts' => $maxAttempts - 1,
                        'unblocked' => true
                    ];
                }
                
                // Incrémenter les tentatives
                if ($record['attempts'] >= $maxAttempts) {
                    // ✅ AMÉLIORATION : Durée de blocage configurable selon l'action
                    $blockDuration = $this->getBlockDuration($action);
                    $blockedUntil = (new DateTime())->add(new DateInterval($blockDuration));
                    
                    $stmt = $this->pdo->prepare("UPDATE rate_limits SET blocked_until = ?, last_attempt = NOW() WHERE ip_address = ? AND action = ?");
                    $stmt->execute([$blockedUntil->format('Y-m-d H:i:s'), $identifier, $action]);
                    
                    $blockMinutes = $this->getBlockDurationInMinutes($blockDuration);
                    
                    return [
                        'allowed' => false,
                        'blocked' => true,
                        'remaining_seconds' => $this->getBlockDurationInSeconds($blockDuration),
                        'message' => "Trop de tentatives. Réessayez dans $blockMinutes."
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
                $stmt = $this->pdo->prepare("INSERT INTO rate_limits (ip_address, action, attempts, first_attempt, last_attempt) VALUES (?, ?, 1, NOW(), NOW())");
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
            '178.197.198.149', // 🚀 NOUVEAU : Votre IP actuelle
            '2a02:1210:5818:9b00',
            '127.0.0.1',
            '::1',
            // 🚀 NOUVEAU : Adresses IP de développement/test
            '192.168.1.1',
            '192.168.1.2',
            '192.168.1.3',
            '192.168.1.4',
            '192.168.1.5',
            '192.168.1.6',
            '192.168.1.7',
            '192.168.1.8',
            '192.168.1.9',
            '192.168.1.10',
            '10.0.0.1',
            '10.0.0.2',
            '10.0.0.3',
            '10.0.0.4',
            '10.0.0.5',
            '172.16.0.1',
            '172.16.0.2',
            '172.16.0.3',
            '172.16.0.4',
            '172.16.0.5'
        ];
        
        // 🚀 NOUVEAU : Autoriser toutes les adresses IP locales pour le développement
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
            // IP privée/réservée (développement local)
            return true;
        }
        
        foreach ($whitelist as $allowed) {
            if ($ip === $allowed) {
                return true;
            }
            // 🚀 CORRECTION : Comparaison IPv6 plus robuste
            if (strpos($allowed, '2a02:1210:5818:9b00') === 0 && strpos($ip, '2a02:1210:5818:9b00') === 0) {
                return true;
            }
        }
        
        // 🚀 NOUVEAU : Autoriser toute la plage 178.197.x.x (votre réseau)
        if (strpos($ip, '178.197.') === 0) {
            return true;
        }
        
        // 🚀 NOUVEAU : Autoriser toute la plage IPv6 2a02:1210:5818:9b00 (votre réseau IPv6)
        if (strpos($ip, '2a02:1210:5818:9b00') === 0) {
            return true;
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
    
    // ✅ CORRECTION FAILLE #3 : Nettoyage automatique intelligent des anciens records
    private function cleanupExpiredRecords() {
        try {
            // ⚡ OPTIMISATION : Nettoyage seulement si nécessaire (max 1x par heure)
            $cacheKey = 'rate_limit_last_cleanup';
            $lastCleanup = $this->getLastCleanupTime();
            
            // Si nettoyé dans la dernière heure, skip
            if ($lastCleanup && (time() - $lastCleanup) < 3600) {
                return;
            }
            
            // Supprimer les records vieux de plus de 24h sans blocage actif
            $stmt = $this->pdo->prepare("
                DELETE FROM rate_limits 
                WHERE first_attempt < DATE_SUB(NOW(), INTERVAL 24 HOUR) 
                AND (blocked_until IS NULL OR blocked_until < NOW())
            ");
            $stmt->execute();
            
            $deletedCount = $stmt->rowCount();
            if ($deletedCount > 0) {
                error_log("🧹 Nettoyage rate limiting: $deletedCount records supprimés");
            }
            
            // Marquer le dernier nettoyage
            $this->setLastCleanupTime(time());
            
        } catch (Exception $e) {
            error_log("Erreur nettoyage rate limiting: " . $e->getMessage());
        }
    }
    
    // Helper pour éviter le nettoyage trop fréquent
    private function getLastCleanupTime() {
        try {
            $stmt = $this->pdo->prepare("SELECT UNIX_TIMESTAMP(MAX(last_attempt)) as last_cleanup FROM rate_limits WHERE action = '_cleanup_marker'");
            $stmt->execute();
            $result = $stmt->fetch();
            return $result ? $result['last_cleanup'] : null;
        } catch (Exception $e) {
            return null;
        }
    }
    
    private function setLastCleanupTime($timestamp) {
        try {
            $stmt = $this->pdo->prepare("INSERT INTO rate_limits (ip_address, action, attempts, first_attempt, last_attempt) VALUES ('system', '_cleanup_marker', 1, FROM_UNIXTIME(?), FROM_UNIXTIME(?)) ON DUPLICATE KEY UPDATE last_attempt = FROM_UNIXTIME(?)");
            $stmt->execute([$timestamp, $timestamp, $timestamp]);
        } catch (Exception $e) {
            // Ignore errors
        }
    }
    
    // ✅ AMÉLIORATION : Durées de blocage configurables par action
    private function getBlockDuration($action) {
        return match($action) {
            'payment_attempt' => 'PT2H',    // 2 heures pour paiements (plus sensible)
            'auth_login' => 'PT30M',        // 30 minutes pour connexion
            'auth_register' => 'PT1H',      // 1 heure pour inscription
            'auth_verify' => 'PT15M',       // 15 minutes pour vérification
            default => 'PT1H'               // 1 heure par défaut
        };
    }
    
    // Helper pour affichage utilisateur-friendly
    private function getBlockDurationInMinutes($duration) {
        return match($duration) {
            'PT15M' => '15 minutes',
            'PT30M' => '30 minutes', 
            'PT1H' => '1 heure',
            'PT2H' => '2 heures',
            default => '1 heure'
        };
    }
    
    // Helper pour calculs de temps restant
    private function getBlockDurationInSeconds($duration) {
        return match($duration) {
            'PT15M' => 15 * 60,
            'PT30M' => 30 * 60,
            'PT1H' => 60 * 60,
            'PT2H' => 2 * 60 * 60,
            default => 60 * 60
        };
    }
}
?>
