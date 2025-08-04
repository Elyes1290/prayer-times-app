-- =================================================
-- 🕌 SCRIPT FINAL - PRAYER TIMES APP DATABASE
-- Base de données : ff42hr_MyAdhan  
-- Host : ff42hr.myd.infomaniak.com
-- User : ff42hr_prayer
-- Configuration dans .env du serveur
-- =================================================
-- Version finale optimisée pour production
-- Compatible avec toutes les APIs développées
-- =================================================

-- ✅ Table des utilisateurs (système d'authentification complet)
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL COMMENT 'Hash du mot de passe (bcrypt)',
  `user_first_name` varchar(100) DEFAULT NULL COMMENT 'Prénom ou pseudo de l\'utilisateur',
  
  -- 🔐 Authentification et sécurité
  `email_verified` tinyint(1) DEFAULT 0,
  `verification_token` varchar(255) DEFAULT NULL,
  `reset_password_token` varchar(255) DEFAULT NULL,
  `reset_password_expires` timestamp NULL DEFAULT NULL,
  `last_login` timestamp NULL DEFAULT NULL,
  `login_attempts` int(11) DEFAULT 0,
  `account_locked` tinyint(1) DEFAULT 0,
  `account_locked_until` timestamp NULL DEFAULT NULL,
  
  -- 🎯 Premium (remplace PremiumContext)
  `premium_status` tinyint(1) DEFAULT 0 COMMENT '0=free, 1=premium',
  `subscription_type` enum('monthly','yearly','family','lifetime','test') DEFAULT NULL,
  `subscription_id` varchar(255) DEFAULT NULL,
  `premium_expiry` datetime DEFAULT NULL,
  `premium_features` text DEFAULT NULL COMMENT 'JSON des fonctionnalités premium disponibles',
  `premium_activated_at` timestamp NULL DEFAULT NULL,
  `premium_cancelled_at` timestamp NULL DEFAULT NULL,
  
  -- 🌍 Paramètres de localisation (remplace SettingsContext)
  `location_mode` enum('auto','manual') DEFAULT 'auto',
  `location_city` varchar(255) DEFAULT NULL,
  `location_country` varchar(255) DEFAULT NULL,
  `location_lat` decimal(10,8) DEFAULT NULL,
  `location_lon` decimal(11,8) DEFAULT NULL,
  `timezone` varchar(100) DEFAULT 'Europe/Paris',
  
  -- 🕌 Paramètres de prière (remplace SettingsContext)
  `calc_method` enum('MuslimWorldLeague','Egyptian','Karachi','UmmAlQura','NorthAmerica','Kuwait','Qatar','Singapore','Tehran','Turkey') DEFAULT 'MuslimWorldLeague',
  `adhan_sound` varchar(100) DEFAULT 'misharyrachid',
  `adhan_volume` decimal(3,2) DEFAULT 1.00,
  `notifications_enabled` tinyint(1) DEFAULT 1,
  `reminders_enabled` tinyint(1) DEFAULT 1,
  `reminder_offset` int(11) DEFAULT 10 COMMENT 'Minutes avant la prière',
  `prayer_times_format` enum('12h','24h') DEFAULT '24h',
  `show_seconds` tinyint(1) DEFAULT 0,
  
  -- 🤲 Paramètres Dhikr (remplace SettingsContext.dhikrSettings)
  `dhikr_after_salah_enabled` tinyint(1) DEFAULT 1,
  `dhikr_after_salah_delay` int(11) DEFAULT 5,
  `dhikr_morning_enabled` tinyint(1) DEFAULT 1,
  `dhikr_morning_delay` int(11) DEFAULT 10,
  `dhikr_evening_enabled` tinyint(1) DEFAULT 1,
  `dhikr_evening_delay` int(11) DEFAULT 10,
  `dhikr_selected_dua_enabled` tinyint(1) DEFAULT 1,
  `dhikr_selected_dua_delay` int(11) DEFAULT 15,
  `dhikr_auto_count` tinyint(1) DEFAULT 0 COMMENT 'Comptage automatique des dhikr',
  
  -- 🎨 Préférences UI/UX (remplace SettingsContext)
  `language` varchar(10) DEFAULT 'fr',
  `theme_mode` enum('auto','light','dark') DEFAULT 'auto',
  `font_size` enum('small','medium','large') DEFAULT 'medium',
  `show_arabic_text` tinyint(1) DEFAULT 1,
  `show_translation` tinyint(1) DEFAULT 1,
  `show_transliteration` tinyint(1) DEFAULT 0,
  `is_first_time` tinyint(1) DEFAULT 1,
  `onboarding_completed` tinyint(1) DEFAULT 0,
  
  -- 🎵 Paramètres Audio (remplace SettingsContext)
  `audio_quality` enum('low','medium','high') DEFAULT 'medium',
  `download_strategy` enum('streaming_only','wifi_download','always_download') DEFAULT 'streaming_only',
  `enable_data_saving` tinyint(1) DEFAULT 1,
  `max_cache_size` int(11) DEFAULT 100 COMMENT 'Taille cache en MB',
  `auto_play_next` tinyint(1) DEFAULT 0,
  `background_audio` tinyint(1) DEFAULT 1,
  
  -- 🔄 Synchronisation et Backup (remplace BackupContext)
  `auto_backup_enabled` tinyint(1) DEFAULT 0,
  `backup_frequency` enum('daily','weekly','monthly') DEFAULT 'weekly',
  `last_backup_time` timestamp NULL DEFAULT NULL,
  `last_sync_time` timestamp NULL DEFAULT NULL,
  `sync_enabled` tinyint(1) DEFAULT 1,
  
  -- 📊 Métadonnées système
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_seen` timestamp NULL DEFAULT NULL,
  `login_count` int(11) DEFAULT 0,
  `app_version` varchar(20) DEFAULT NULL,
  `device_model` varchar(100) DEFAULT NULL,
  `os_version` varchar(50) DEFAULT NULL,
  `app_build` varchar(20) DEFAULT NULL,
  `status` enum('active','inactive','suspended','deleted') DEFAULT 'active',
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `premium_status` (`premium_status`),
  KEY `premium_expiry` (`premium_expiry`),
  KEY `last_seen` (`last_seen`),
  KEY `created_at` (`created_at`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Utilisateurs avec système d\'authentification complet';

-- ✅ Table des sessions utilisateur (sécurité)
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `session_token` varchar(255) NOT NULL COMMENT 'Token de session unique',
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NOT NULL,
  `last_activity` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_active` tinyint(1) DEFAULT 1,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_token` (`session_token`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  KEY `user_id` (`user_id`),
  KEY `expires_at` (`expires_at`),
  KEY `is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Sessions utilisateur actives';

-- ✅ Table des logs d'utilisation (analytics)
CREATE TABLE IF NOT EXISTS `usage_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `action` varchar(100) NOT NULL COMMENT 'play_recitation, download_content, add_favorite, etc.',
  `content_type` varchar(50) DEFAULT NULL,
  `content_id` varchar(255) DEFAULT NULL,
  `metadata` text DEFAULT NULL COMMENT 'JSON avec détails supplémentaires',
  `session_id` varchar(255) DEFAULT NULL,
  `device_info` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `timestamp` timestamp DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  KEY `action` (`action`),
  KEY `timestamp` (`timestamp`),
  KEY `user_action` (`user_id`, `action`),
  KEY `content_type` (`content_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Logs d\'utilisation pour analytics';

-- ✅ Table des favoris (remplace FavoritesContext)
CREATE TABLE IF NOT EXISTS `favorites` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `favorite_id` varchar(255) NOT NULL COMMENT 'ID unique du favori (généré côté app)',
  `type` enum('quran_verse','hadith','dhikr','asmaul_husna','prayer_time','mosque') NOT NULL,
  
  -- 📖 Favoris Coran
  `chapter_number` int(11) DEFAULT NULL,
  `verse_number` int(11) DEFAULT NULL,
  `chapter_name` varchar(255) DEFAULT NULL,
  `juz` int(11) DEFAULT NULL,
  `page` int(11) DEFAULT NULL,
  
  -- 📚 Favoris Hadith
  `hadith_number` varchar(50) DEFAULT NULL,
  `book_slug` varchar(100) DEFAULT NULL,
  `book_name` varchar(255) DEFAULT NULL,
  `narrator` varchar(255) DEFAULT NULL,
  `grade` varchar(100) DEFAULT NULL,
  
  -- 🤲 Favoris Dhikr
  `dhikr_category` enum('dailyDua','morningDhikr','eveningDhikr','afterSalah','selectedDua') DEFAULT NULL,
  `source` varchar(255) DEFAULT NULL,
  `benefits` text DEFAULT NULL,
  
  -- 🕌 Favoris Asmaul Husna
  `asmaul_husna_number` int(11) DEFAULT NULL,
  `usage` text DEFAULT NULL,
  
  -- 🕌 Favoris Mosquée
  `mosque_id` varchar(255) DEFAULT NULL,
  `mosque_name` varchar(255) DEFAULT NULL,
  `mosque_address` text DEFAULT NULL,
  `mosque_distance` decimal(8,2) DEFAULT NULL COMMENT 'Distance en km',
  
  -- 📝 Contenu commun
  `arabic_text` text NOT NULL,
  `translation` text DEFAULT NULL,
  `transliteration` text DEFAULT NULL,
  `note` text DEFAULT NULL COMMENT 'Note personnelle de l\'utilisateur',
  `tags` text DEFAULT NULL COMMENT 'JSON des tags personnalisés',
  
  -- 📊 Métadonnées
  `date_added` timestamp DEFAULT CURRENT_TIMESTAMP,
  `last_accessed` timestamp NULL DEFAULT NULL,
  `access_count` int(11) DEFAULT 0,
  `is_public` tinyint(1) DEFAULT 0 COMMENT 'Partageable avec d\'autres utilisateurs',
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_favorite` (`user_id`, `favorite_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  KEY `type` (`type`),
  KEY `date_added` (`date_added`),
  KEY `chapter_number` (`chapter_number`),
  KEY `dhikr_category` (`dhikr_category`),
  KEY `is_public` (`is_public`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Favoris utilisateur';

-- ✅ Table du contenu premium (catalogue complet)
CREATE TABLE IF NOT EXISTS `premium_content` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `content_id` varchar(255) NOT NULL COMMENT 'ID unique du contenu',
  `type` enum('quran_recitation','adhan_voice','hadith_audio','dhikr_audio','dua_audio','lesson_audio','sermon_audio') NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `reciter` varchar(255) DEFAULT NULL,
  `duration` int(11) DEFAULT NULL COMMENT 'Durée en secondes',
  `file_size` bigint(20) DEFAULT NULL COMMENT 'Taille en bytes',
  `file_url` varchar(500) DEFAULT NULL,
  `thumbnail_url` varchar(500) DEFAULT NULL,
  `language` varchar(10) DEFAULT 'ar',
  `quality` enum('low','medium','high') DEFAULT 'medium',
  `is_free` tinyint(1) DEFAULT 0,
  `download_count` int(11) DEFAULT 0,
  `rating` decimal(3,2) DEFAULT NULL,
  `tags` text DEFAULT NULL COMMENT 'JSON des tags',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` enum('active','inactive','deleted') DEFAULT 'active',
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `content_id` (`content_id`),
  KEY `type` (`type`),
  KEY `reciter` (`reciter`),
  KEY `language` (`language`),
  KEY `is_free` (`is_free`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Catalogue du contenu premium';

-- ✅ Table des achats premium (historique complet)
CREATE TABLE IF NOT EXISTS `premium_purchases` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `subscription_type` enum('monthly','yearly','family','lifetime','test') NOT NULL,
  `subscription_id` varchar(255) NOT NULL COMMENT 'ID de l\'abonnement (Store)',
  `premium_expiry` datetime NOT NULL,
  `purchase_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `purchase_amount` decimal(10,2) DEFAULT NULL,
  `currency` varchar(3) DEFAULT 'EUR',
  `payment_method` varchar(50) DEFAULT NULL,
  `transaction_id` varchar(255) DEFAULT NULL,
  `store_receipt` text DEFAULT NULL COMMENT 'Reçu complet du store',
  `status` enum('active','cancelled','expired','refunded') DEFAULT 'active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `subscription_id` (`subscription_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  KEY `user_id` (`user_id`),
  KEY `subscription_type` (`subscription_type`),
  KEY `premium_expiry` (`premium_expiry`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Historique des achats premium';

-- ✅ Table des statistiques utilisateur (analytics)
CREATE TABLE IF NOT EXISTS `user_stats` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `stats_data` json NOT NULL COMMENT 'Données statistiques complètes en JSON',
  `date` date DEFAULT CURRENT_DATE,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_date` (`user_id`, `date`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  KEY `date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Statistiques utilisateur';

-- ✅ Table des logs de prière (suivi détaillé)
CREATE TABLE IF NOT EXISTS `prayer_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `prayer_type` enum('fajr','dhuhr','asr','maghrib','isha') NOT NULL,
  `prayer_time` time DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `is_on_time` tinyint(1) DEFAULT 1,
  `delay_minutes` int(11) DEFAULT 0,
  `location_lat` decimal(10,8) DEFAULT NULL,
  `location_lon` decimal(11,8) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_prayer_date` (`user_id`, `prayer_type`, `date`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  KEY `date` (`date`),
  KEY `prayer_type` (`prayer_type`),
  KEY `completed_at` (`completed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Logs des prières utilisateur';

-- ✅ Table des achievements (gamification)
CREATE TABLE IF NOT EXISTS `achievements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(100) NOT NULL COMMENT 'Code unique de l\'achievement',
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `category` enum('prayer','dhikr','quran','hadith','streak','social','premium') NOT NULL,
  `requirement_type` enum('count','streak','date','custom') NOT NULL,
  `requirement_value` int(11) NOT NULL,
  `points` int(11) DEFAULT 0,
  `is_hidden` tinyint(1) DEFAULT 0,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `category` (`category`),
  KEY `requirement_type` (`requirement_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Achievements disponibles';

-- ✅ Table des achievements utilisateur
CREATE TABLE IF NOT EXISTS `user_achievements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `achievement_id` int(11) NOT NULL,
  `unlocked_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `progress` int(11) DEFAULT 0 COMMENT 'Progression actuelle',
  `completed_at` timestamp NULL DEFAULT NULL,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_achievement` (`user_id`, `achievement_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`achievement_id`) REFERENCES `achievements`(`id`) ON DELETE CASCADE,
  KEY `unlocked_at` (`unlocked_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Achievements débloqués par utilisateur';

-- ✅ Table des backups utilisateur
CREATE TABLE IF NOT EXISTS `user_backups` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `backup_data` longtext NOT NULL COMMENT 'Données de backup complètes (JSON)',
  `backup_type` enum('full','settings','favorites','stats') DEFAULT 'full',
  `backup_name` varchar(255) DEFAULT NULL,
  `backup_size` bigint(20) DEFAULT NULL COMMENT 'Taille en bytes',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  KEY `user_id` (`user_id`),
  KEY `backup_type` (`backup_type`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Backups utilisateur';

-- ✅ Table des rapports de bugs
CREATE TABLE IF NOT EXISTS `bug_reports` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `category` enum('crash','ui','performance','feature','other') DEFAULT 'other',
  `severity` enum('low','medium','high','critical') DEFAULT 'medium',
  `app_version` varchar(20) DEFAULT NULL,
  `device_model` varchar(100) DEFAULT NULL,
  `os_version` varchar(50) DEFAULT NULL,
  `steps_to_reproduce` text DEFAULT NULL,
  `expected_behavior` text DEFAULT NULL,
  `actual_behavior` text DEFAULT NULL,
  `screenshots` text DEFAULT NULL COMMENT 'URLs des screenshots',
  `status` enum('open','in_progress','resolved','closed') DEFAULT 'open',
  `assigned_to` varchar(100) DEFAULT NULL,
  `resolution_notes` text DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  KEY `user_id` (`user_id`),
  KEY `category` (`category`),
  KEY `severity` (`severity`),
  KEY `status` (`status`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Rapports de bugs';

-- ✅ Vues pour les statistiques

-- Vue des statistiques de contenu
CREATE OR REPLACE VIEW `v_content_stats` AS
SELECT 
  'quran' as content_type,
  COUNT(*) as total_items,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(access_count) as avg_access_count
FROM favorites 
WHERE type = 'quran_verse'
UNION ALL
SELECT 
  'hadith' as content_type,
  COUNT(*) as total_items,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(access_count) as avg_access_count
FROM favorites 
WHERE type = 'hadith'
UNION ALL
SELECT 
  'dhikr' as content_type,
  COUNT(*) as total_items,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(access_count) as avg_access_count
FROM favorites 
WHERE type = 'dhikr';

-- Vue des favoris populaires
CREATE OR REPLACE VIEW `v_popular_favorites` AS
SELECT 
  f.type,
  f.arabic_text,
  f.translation,
  COUNT(*) as favorite_count,
  AVG(f.access_count) as avg_access_count
FROM favorites f
WHERE f.is_public = 1
GROUP BY f.type, f.arabic_text, f.translation
HAVING favorite_count > 1
ORDER BY favorite_count DESC, avg_access_count DESC;

-- Vue des utilisateurs actifs
CREATE OR REPLACE VIEW `v_active_users` AS
SELECT 
  u.id,
  u.user_first_name,
  u.email,
  u.premium_status,
  u.last_seen,
  COUNT(f.id) as favorites_count,
  COUNT(p.id) as prayers_logged,
  COUNT(ua.id) as achievements_unlocked
FROM users u
LEFT JOIN favorites f ON u.id = f.user_id
LEFT JOIN prayer_logs p ON u.id = p.user_id
LEFT JOIN user_achievements ua ON u.id = ua.user_id
WHERE u.status = 'active'
GROUP BY u.id
ORDER BY u.last_seen DESC;

-- Vue des statistiques globales
CREATE OR REPLACE VIEW `v_global_stats` AS
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN premium_status = 1 THEN 1 END) as premium_users,
  COUNT(CASE WHEN last_seen >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as active_users_7d,
  COUNT(CASE WHEN last_seen >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as active_users_30d,
  AVG(CASE WHEN premium_status = 1 THEN 1 ELSE 0 END) * 100 as premium_percentage
FROM users 
WHERE status = 'active';

-- ✅ Index supplémentaires pour optimiser les performances

-- Index pour les recherches de contenu
CREATE INDEX IF NOT EXISTS `idx_favorites_user_type` ON `favorites` (`user_id`, `type`);
CREATE INDEX IF NOT EXISTS `idx_favorites_date_added` ON `favorites` (`date_added`);

-- Index pour les statistiques
CREATE INDEX IF NOT EXISTS `idx_user_stats_date` ON `user_stats` (`date`);
CREATE INDEX IF NOT EXISTS `idx_prayer_logs_date_type` ON `prayer_logs` (`date`, `prayer_type`);

-- Index pour les achats premium
CREATE INDEX IF NOT EXISTS `idx_premium_purchases_expiry` ON `premium_purchases` (`premium_expiry`);
CREATE INDEX IF NOT EXISTS `idx_premium_purchases_status` ON `premium_purchases` (`status`);

-- Index pour les sessions
CREATE INDEX IF NOT EXISTS `idx_user_sessions_expires` ON `user_sessions` (`expires_at`);

-- ✅ Fin du script
SELECT 'Base de données Prayer Times App créée avec succès !' AS message; 

-- Script d'insertion du système de badges complet
-- Exécuter ce script pour peupler la table achievements avec tous les badges

-- Vider la table achievements existante (optionnel - décommentez si nécessaire)
-- TRUNCATE TABLE achievements;

-- Insertion des badges du système complet
-- Structure: code, title, description, icon, points, is_hidden, category, requirement_type, requirement_value
-- IMPORTANT: title et description sont maintenant des clés de traduction pour l'i18n
INSERT INTO achievements (code, title, description, icon, points, is_hidden, category, requirement_type, requirement_value) VALUES

-- === BADGES DE PRIÈRES ===
('first_prayer', 'badge_first_prayer', 'badge_first_prayer_desc', 'checkmark-circle', 10, 0, 'prayer', 'count', 1),

('early_bird', 'badge_early_bird', 'badge_early_bird_desc', 'sunny', 30, 0, 'prayer', 'count', 5),

('faithful_worshipper', 'badge_faithful_worshipper', 'badge_faithful_worshipper_desc', 'person', 100, 0, 'prayer', 'count', 50),

('prayer_master', 'badge_prayer_master', 'badge_prayer_master_desc', 'star', 500, 0, 'prayer', 'count', 500),

-- === BADGES DE RÉGULARITÉ (streak) ===
('prayer_streak_7', 'badge_prayer_streak_7', 'badge_prayer_streak_7_desc', 'flame', 50, 0, 'streak', 'streak', 7),

('prayer_streak_30', 'badge_prayer_streak_30', 'badge_prayer_streak_30_desc', 'shield-checkmark', 200, 0, 'streak', 'streak', 30),

('prayer_streak_100', 'badge_prayer_streak_100', 'badge_prayer_streak_100_desc', 'trophy', 1000, 0, 'streak', 'streak', 100),

-- === BADGES DE DHIKR ===
('dhikr_beginner', 'badge_dhikr_beginner', 'badge_dhikr_beginner_desc', 'radio-button-on', 25, 0, 'dhikr', 'count', 10),

('dhikr_master', 'badge_dhikr_master', 'badge_dhikr_master_desc', 'medal', 150, 0, 'dhikr', 'count', 100),

-- === BADGES DE LECTURE CORAN ===
('quran_reader', 'badge_quran_reader', 'badge_quran_reader_desc', 'book', 80, 0, 'quran', 'count', 10),

('quran_scholar', 'badge_quran_scholar', 'badge_quran_scholar_desc', 'library', 400, 0, 'quran', 'count', 100),

-- === BADGES SOCIAUX ===
('community_helper', 'badge_community_helper', 'badge_community_helper_desc', 'share', 60, 0, 'social', 'count', 10),

('social_butterfly', 'badge_social_butterfly', 'badge_social_butterfly_desc', 'people', 200, 0, 'social', 'count', 50),

-- === BADGES HADITH ===
('hadith_student', 'badge_hadith_student', 'badge_hadith_student_desc', 'document-text', 50, 0, 'hadith', 'count', 25),

('hadith_scholar', 'badge_hadith_scholar', 'badge_hadith_scholar_desc', 'school', 200, 0, 'hadith', 'count', 100);

-- Afficher le résultat
SELECT 
    code,
    title,
    description,
    category,
    requirement_type,
    requirement_value,
    points,
    is_hidden
FROM achievements 
ORDER BY 
    CASE category 
        WHEN 'prayer' THEN 1
        WHEN 'streak' THEN 2  
        WHEN 'dhikr' THEN 3
        WHEN 'quran' THEN 4
        WHEN 'hadith' THEN 5
        WHEN 'social' THEN 6
        WHEN 'premium' THEN 7
        ELSE 8
    END,
    points ASC;

-- Statistiques du système
SELECT 
    'Total badges' AS stat_name,
    COUNT(*) AS stat_value
FROM achievements

UNION ALL

SELECT 
    CONCAT('Badges ', category) AS stat_name,
    COUNT(*) AS stat_value
FROM achievements 
GROUP BY category

UNION ALL

SELECT 
    CONCAT('Type ', requirement_type) AS stat_name,
    COUNT(*) AS stat_value
FROM achievements 
GROUP BY requirement_type

UNION ALL

SELECT 
    'Badges cachés' AS stat_name,
    COUNT(*) AS stat_value
FROM achievements 
WHERE is_hidden = 1

UNION ALL

SELECT 
    'Points totaux' AS stat_name,
    SUM(points) AS stat_value
FROM achievements;