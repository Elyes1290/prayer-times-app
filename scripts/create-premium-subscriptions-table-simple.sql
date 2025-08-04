-- =====================================================
-- Script de création des tables pour les abonnements premium
-- Version simplifiée (sans procédures stockées)
-- =====================================================

-- Table des fonctionnalités premium (créer en premier)
CREATE TABLE IF NOT EXISTS premium_features (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des abonnements premium
CREATE TABLE IF NOT EXISTS premium_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    product_id VARCHAR(255) NOT NULL,
    status ENUM('active', 'canceled', 'past_due', 'unpaid') DEFAULT 'active',
    current_period_start DATETIME NOT NULL,
    current_period_end DATETIME NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_period_end (current_period_end)
);

-- Table des paiements premium
CREATE TABLE IF NOT EXISTS premium_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    subscription_id INT,
    user_id VARCHAR(255) NOT NULL,
    amount INT NOT NULL, -- Montant en centimes
    currency VARCHAR(3) DEFAULT 'CHF',
    status ENUM('succeeded', 'failed', 'pending') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subscription_id) REFERENCES premium_subscriptions(id) ON DELETE SET NULL
);

-- Table des utilisateurs premium
CREATE TABLE IF NOT EXISTS premium_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    subscription_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deactivated_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (subscription_id) REFERENCES premium_subscriptions(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_is_active (is_active)
);

-- Vue pour les abonnements actifs
CREATE OR REPLACE VIEW active_subscriptions AS
SELECT 
    ps.*,
    pu.user_id as premium_user_id,
    pu.is_active as user_is_active
FROM premium_subscriptions ps
LEFT JOIN premium_users pu ON ps.id = pu.subscription_id
WHERE ps.status = 'active' 
    AND ps.current_period_end > NOW()
    AND (pu.is_active IS NULL OR pu.is_active = TRUE);

-- Insérer les fonctionnalités premium de base
INSERT IGNORE INTO premium_features (name, description) VALUES
('unlimited_favorites', 'Favoris illimités'),
('daily_prayer_history', 'Historique des prières quotidiennes'),
('advanced_dhikr', 'Dhikr avancé avec plus de catégories'),
('prayer_analytics', 'Analyses détaillées des prières'),
('custom_notifications', 'Notifications personnalisées'),
('ad_free', 'Sans publicités'),
('priority_support', 'Support prioritaire');

-- Index pour optimiser les performances
CREATE INDEX idx_subscription_user ON premium_subscriptions(user_id, status);
CREATE INDEX idx_payment_user ON premium_payments(user_id, status);
CREATE INDEX idx_premium_user_active ON premium_users(user_id, is_active); 