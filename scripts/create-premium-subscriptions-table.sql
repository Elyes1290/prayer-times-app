-- Table pour gérer les abonnements premium
CREATE TABLE IF NOT EXISTS premium_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
    customer_id VARCHAR(255) NOT NULL,
    subscription_type ENUM('monthly', 'yearly', 'family') NOT NULL,
    status ENUM('active', 'canceled', 'past_due', 'unpaid', 'incomplete') NOT NULL DEFAULT 'incomplete',
    current_period_start DATETIME NOT NULL,
    current_period_end DATETIME NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_stripe_subscription_id (stripe_subscription_id),
    INDEX idx_customer_id (customer_id),
    INDEX idx_status (status),
    INDEX idx_subscription_type (subscription_type)
);

-- Table pour les fonctionnalités premium par abonnement
CREATE TABLE IF NOT EXISTS premium_features (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subscription_id INT NOT NULL,
    feature_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (subscription_id) REFERENCES premium_subscriptions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_subscription_feature (subscription_id, feature_name)
);

-- Table pour les paiements
CREATE TABLE IF NOT EXISTS premium_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subscription_id INT NOT NULL,
    stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    amount INT NOT NULL, -- Montant en centimes
    currency VARCHAR(3) DEFAULT 'eur',
    status ENUM('succeeded', 'failed', 'pending', 'canceled') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (subscription_id) REFERENCES premium_subscriptions(id) ON DELETE CASCADE,
    INDEX idx_stripe_payment_intent_id (stripe_payment_intent_id),
    INDEX idx_status (status)
);

-- Table pour les utilisateurs premium (liaison avec les utilisateurs existants)
CREATE TABLE IF NOT EXISTS premium_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL, -- Référence vers la table users existante
    subscription_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deactivated_at TIMESTAMP NULL,
    
    FOREIGN KEY (subscription_id) REFERENCES premium_subscriptions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_subscription (user_id, subscription_id)
);

-- Insertion des fonctionnalités par défaut pour chaque type d'abonnement
INSERT INTO premium_features (subscription_id, feature_name) 
SELECT ps.id, feature_name
FROM premium_subscriptions ps
CROSS JOIN (
    SELECT 'prayer_analytics' as feature_name UNION ALL
    SELECT 'custom_adhan_sounds' UNION ALL
    SELECT 'premium_themes' UNION ALL
    SELECT 'unlimited_bookmarks' UNION ALL
    SELECT 'ad_free'
) features
WHERE ps.subscription_type = 'monthly';

-- Fonctionnalités supplémentaires pour l'abonnement annuel
INSERT INTO premium_features (subscription_id, feature_name)
SELECT ps.id, feature_name
FROM premium_subscriptions ps
CROSS JOIN (
    SELECT 'priority_support' as feature_name UNION ALL
    SELECT 'monthly_stats'
) features
WHERE ps.subscription_type = 'yearly';

-- Fonctionnalités supplémentaires pour l'abonnement familial
INSERT INTO premium_features (subscription_id, feature_name)
SELECT ps.id, feature_name
FROM premium_subscriptions ps
CROSS JOIN (
    SELECT 'family_management' as feature_name UNION ALL
    SELECT 'child_profiles'
) features
WHERE ps.subscription_type = 'family';

-- Vue pour faciliter les requêtes sur les abonnements actifs
CREATE VIEW active_premium_subscriptions AS
SELECT 
    ps.*,
    GROUP_CONCAT(pf.feature_name) as features
FROM premium_subscriptions ps
LEFT JOIN premium_features pf ON ps.id = pf.subscription_id AND pf.is_active = TRUE
WHERE ps.status = 'active' 
    AND ps.current_period_end > NOW()
    AND ps.cancel_at_period_end = FALSE
GROUP BY ps.id;

-- Procédure pour nettoyer les abonnements expirés
DELIMITER //
CREATE PROCEDURE CleanupExpiredSubscriptions()
BEGIN
    -- Marquer comme inactifs les abonnements expirés
    UPDATE premium_subscriptions 
    SET status = 'canceled'
    WHERE current_period_end < NOW() 
        AND status = 'active';
    
    -- Désactiver les utilisateurs premium expirés
    UPDATE premium_users pu
    JOIN premium_subscriptions ps ON pu.subscription_id = ps.id
    SET pu.is_active = FALSE, pu.deactivated_at = NOW()
    WHERE ps.current_period_end < NOW() 
        AND pu.is_active = TRUE;
END //
DELIMITER ;

-- Événement pour nettoyer automatiquement les abonnements expirés (quotidien)
CREATE EVENT IF NOT EXISTS cleanup_expired_subscriptions_daily
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO CALL CleanupExpiredSubscriptions(); 