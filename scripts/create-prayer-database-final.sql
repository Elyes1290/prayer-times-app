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
  `stripe_customer_id` varchar(255) DEFAULT NULL COMMENT 'ID customer Stripe (cus_xxx) pour les webhooks',
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
  `created_from` enum('app_registration','stripe_payment','stripe_dashboard','admin_import') DEFAULT 'app_registration' COMMENT 'Source de création du compte',
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
  KEY `stripe_customer_id` (`stripe_customer_id`),
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

-- ✅ Table des refresh tokens (auth sécurisée)
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `token_hash` char(64) NOT NULL COMMENT 'SHA-256 hex du refresh token',
  `device_id` varchar(128) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime NOT NULL,
  `last_used_at` datetime DEFAULT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `replaced_by` int(11) DEFAULT NULL,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `user_id` (`user_id`),
  KEY `expires_at` (`expires_at`),
  KEY `revoked_at` (`revoked_at`),
  CONSTRAINT `fk_refresh_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_refresh_tokens_replaced_by` FOREIGN KEY (`replaced_by`) REFERENCES `refresh_tokens`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Refresh tokens (hashés) pour renouveler les access tokens';

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
  `payment_method` varchar(50) DEFAULT 'stripe',
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

-- ✅ Table des abonnements Stripe (gestion technique)
CREATE TABLE IF NOT EXISTS `premium_subscriptions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `stripe_session_id` varchar(255) DEFAULT NULL COMMENT 'Session ID Stripe (temporaire)',
  `stripe_subscription_id` varchar(255) DEFAULT NULL COMMENT 'ID abonnement Stripe réel',
  `stripe_customer_id` varchar(255) DEFAULT NULL COMMENT 'ID customer Stripe',
  `subscription_type` enum('monthly','yearly','family') NOT NULL,
  `status` enum('active','canceled','past_due','unpaid','incomplete') DEFAULT 'active',
  `start_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `end_date` datetime NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `stripe_subscription_id` (`stripe_subscription_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  KEY `user_id` (`user_id`),
  KEY `stripe_session_id` (`stripe_session_id`),
  KEY `stripe_customer_id` (`stripe_customer_id`),
  KEY `status` (`status`),
  KEY `end_date` (`end_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Abonnements Stripe (gestion technique)';

-- ✅ Table des utilisateurs premium (statut actuel)
CREATE TABLE IF NOT EXISTS `premium_users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `subscription_id` int(11) DEFAULT NULL COMMENT 'Référence vers premium_subscriptions',
  `purchase_id` int(11) DEFAULT NULL COMMENT 'Référence vers premium_purchases',
  `is_active` tinyint(1) DEFAULT 1,
  `premium_features` json DEFAULT NULL COMMENT 'Liste des fonctionnalités actives',
  `activated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `deactivated_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`subscription_id`) REFERENCES `premium_subscriptions`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`purchase_id`) REFERENCES `premium_purchases`(`id`) ON DELETE SET NULL,
  KEY `is_active` (`is_active`),
  KEY `activated_at` (`activated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Statut premium des utilisateurs';

-- ✅ Table des paiements Stripe (détails techniques)
CREATE TABLE IF NOT EXISTS `premium_payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `subscription_id` int(11) DEFAULT NULL,
  `purchase_id` int(11) DEFAULT NULL,
  `stripe_payment_intent_id` varchar(255) DEFAULT NULL,
  `stripe_invoice_id` varchar(255) DEFAULT NULL,
  `amount` int(11) NOT NULL COMMENT 'Montant en centimes',
  `currency` varchar(3) DEFAULT 'EUR',
  `status` enum('succeeded','failed','pending','canceled','requires_action') DEFAULT 'pending',
  `payment_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `stripe_payment_intent_id` (`stripe_payment_intent_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`subscription_id`) REFERENCES `premium_subscriptions`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`purchase_id`) REFERENCES `premium_purchases`(`id`) ON DELETE SET NULL,
  KEY `user_id` (`user_id`),
  KEY `status` (`status`),
  KEY `payment_date` (`payment_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Détails des paiements Stripe';

-- ✅ Table des statistiques utilisateur (analytics)
CREATE TABLE IF NOT EXISTS `user_stats` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `date` date DEFAULT (CURRENT_DATE),
  `prayers_completed` int(11) DEFAULT 0,
  `dhikr_count` int(11) DEFAULT 0,
  `quran_verses_read` int(11) DEFAULT 0,
  `hadiths_read` int(11) DEFAULT 0,
  `favorites_added` int(11) DEFAULT 0,
  `content_downloaded` int(11) DEFAULT 0,
  `app_usage_minutes` int(11) DEFAULT 0,
  `streak_days` int(11) DEFAULT 0,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_date` (`user_id`, `date`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  KEY `date` (`date`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Statistiques utilisateur avec colonnes dédiées';

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

-- ✅ Table des tokens temporaires de paiement (sécurité)
CREATE TABLE IF NOT EXISTS `temp_payment_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `token` varchar(64) NOT NULL COMMENT 'Token sécurisé unique',
  `email` varchar(255) NOT NULL,
  `subscription_type` enum('monthly','yearly','family') NOT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `customer_language` varchar(10) DEFAULT 'fr',
  `encrypted_password` text DEFAULT NULL COMMENT 'Mot de passe chiffré (optionnel)',
  `expires_at` datetime NOT NULL COMMENT 'Expiration du token',
  `used` tinyint(1) DEFAULT 0 COMMENT 'Token utilisé ou non',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `email` (`email`),
  KEY `expires_at` (`expires_at`),
  KEY `used` (`used`),
  KEY `subscription_type` (`subscription_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tokens temporaires pour paiements sécurisés';

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

-- 🎯 Vue des utilisateurs premium (MANQUANTE !)
CREATE OR REPLACE VIEW `v_premium_users` AS
SELECT 
  u.id,
  u.email,
  u.user_first_name,
  u.premium_status,
  u.subscription_type,
  u.subscription_id,
  u.premium_expiry,
  u.premium_activated_at,
  pu.is_active as premium_user_active,
  pu.premium_features,
  ps.status as stripe_status,
  ps.stripe_subscription_id,
  pp.purchase_amount,
  pp.currency,
  DATEDIFF(u.premium_expiry, NOW()) as days_remaining,
  CASE 
    WHEN u.premium_expiry < NOW() THEN 'expired'
    WHEN DATEDIFF(u.premium_expiry, NOW()) <= 7 THEN 'expiring_soon'
    ELSE 'active'
  END as premium_health_status
FROM users u
LEFT JOIN premium_users pu ON u.id = pu.user_id
LEFT JOIN premium_subscriptions ps ON u.id = ps.user_id AND ps.status = 'active'
LEFT JOIN premium_purchases pp ON u.id = pp.user_id AND pp.status = 'active'
WHERE u.premium_status = 1
ORDER BY u.premium_activated_at DESC;

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

-- Index pour les refresh tokens
CREATE INDEX IF NOT EXISTS `idx_refresh_tokens_user` ON `refresh_tokens` (`user_id`);
CREATE INDEX IF NOT EXISTS `idx_refresh_tokens_expires` ON `refresh_tokens` (`expires_at`);
CREATE INDEX IF NOT EXISTS `idx_refresh_tokens_revoked` ON `refresh_tokens` (`revoked_at`);

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

-- =================================================
-- 🔧 CORRECTIONS POST-CRÉATION (DATA FIXES)
-- =================================================

-- ✅ Migration 2025-11-17: stripe_customer_id ajouté à la table users
-- Permet de lier les utilisateurs à leur customer ID Stripe (cus_xxx)
-- pour gérer correctement les renouvellements automatiques d'abonnement
-- et la synchronisation avec les webhooks Stripe

-- Corriger les utilisateurs premium sans date d'activation
-- 🎯 LOGIQUE : Si l'utilisateur est premium mais sans date d'activation,
-- on considère qu'il s'est abonné il y a au moins quelques jours/semaines
UPDATE users 
SET premium_activated_at = COALESCE(
    created_at,
    DATE_SUB(NOW(), INTERVAL 2 WEEK)  -- Par défaut, abonné depuis 2 semaines
)
WHERE premium_status = 1 
AND premium_activated_at IS NULL;

-- =================================================
-- 🗑️ TABLE POUR LES DEMANDES DE SUPPRESSION DE DONNÉES
-- Conforme aux exigences Google Play Store et RGPD
-- =================================================

CREATE TABLE IF NOT EXISTS data_deletion_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id VARCHAR(50) UNIQUE NOT NULL,
    user_id INT NULL,
    email VARCHAR(255) NOT NULL,
    reason TEXT,
    user_message TEXT,
    status ENUM('pending', 'processing', 'completed', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    processed_by VARCHAR(100) NULL,
    notes TEXT NULL,
    INDEX idx_email (email),
    INDEX idx_request_id (request_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Commentaires pour documentation
ALTER TABLE data_deletion_requests 
COMMENT = 'Table pour gérer les demandes de suppression de données utilisateur (RGPD/Google Play)';

-- ========================================
-- 📚 TABLES POUR LES HISTOIRES DU PROPHÈTE (PBUH)
-- ========================================

-- Table principale des histoires
CREATE TABLE IF NOT EXISTS `prophet_stories` (
  `id` VARCHAR(50) PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `title_arabic` VARCHAR(255),
  `introduction` TEXT NOT NULL,
  `conclusion` TEXT NOT NULL,
  `moral_lesson` TEXT,
  
  -- Classification
  `category` ENUM('childhood', 'revelation', 'meccan_period', 'hijra', 'medinian_period', 'battles', 'companions', 'family_life', 'final_years', 'character_traits', 'miracles', 'daily_life') NOT NULL,
  `difficulty` ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
  `age_recommendation` INT DEFAULT 12,
  
  -- Métadonnées de contenu
  `reading_time` INT NOT NULL COMMENT 'Temps de lecture en minutes',
  `word_count` INT DEFAULT 0,
  `chronological_order` INT DEFAULT 0,
  
  -- Contexte historique
  `historical_period_start` INT COMMENT 'Année hijrienne de début',
  `historical_period_end` INT COMMENT 'Année hijrienne de fin',
  `historical_location` VARCHAR(100),
  `historical_context` TEXT,
  
  -- Statut premium
  `is_premium` BOOLEAN DEFAULT FALSE,
  `has_interactive_elements` BOOLEAN DEFAULT FALSE,
  
  -- Statistiques
  `view_count` INT DEFAULT 0,
  `rating` DECIMAL(3,2) DEFAULT 0.00,
  `rating_count` INT DEFAULT 0,
  
  -- Index de recherche
  FULLTEXT(`title`, `introduction`, `conclusion`),
  
  -- Timestamps
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  KEY `idx_category` (`category`),
  KEY `idx_difficulty` (`difficulty`),
  KEY `idx_premium` (`is_premium`),
  KEY `idx_chronological` (`chronological_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT = 'Histoires du Prophète Mohammad (PBUH) - Contenu éducatif premium';

-- Chapitres des histoires
CREATE TABLE IF NOT EXISTS `prophet_story_chapters` (
  `id` VARCHAR(50) PRIMARY KEY,
  `story_id` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `chapter_order` INT NOT NULL,
  `reading_time` INT DEFAULT 5 COMMENT 'Temps de lecture du chapitre en minutes',
  
  -- Index de recherche
  FULLTEXT(`title`, `content`),
  
  -- Timestamps
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`story_id`) REFERENCES `prophet_stories`(`id`) ON DELETE CASCADE,
  KEY `idx_story_order` (`story_id`, `chapter_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT = 'Chapitres des histoires du Prophète';

-- Références islamiques (Quran, Hadith, etc.)
CREATE TABLE IF NOT EXISTS `prophet_story_references` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `story_id` VARCHAR(50) NOT NULL,
  `type` ENUM('quran', 'hadith', 'sira', 'historical') NOT NULL,
  `source` VARCHAR(255) NOT NULL COMMENT 'Nom du livre/source',
  `reference_text` VARCHAR(500) NOT NULL COMMENT 'Référence exacte (ex: Bukhari 123)',
  `authenticity` ENUM('sahih', 'hasan', 'daif') DEFAULT 'sahih',
  `content` TEXT COMMENT 'Texte de la référence',
  `translation` TEXT COMMENT 'Traduction française',
  `relevance` TEXT COMMENT 'Pertinence par rapport à l\'histoire',
  `reference_order` INT DEFAULT 0,
  
  FOREIGN KEY (`story_id`) REFERENCES `prophet_stories`(`id`) ON DELETE CASCADE,
  KEY `idx_story_type` (`story_id`, `type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT = 'Références islamiques des histoires';

-- Glossaire des termes islamiques
CREATE TABLE IF NOT EXISTS `prophet_story_glossary` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `story_id` VARCHAR(50) NOT NULL,
  `term` VARCHAR(100) NOT NULL,
  `arabic_term` VARCHAR(100),
  `definition` TEXT NOT NULL,
  `pronunciation` VARCHAR(200),
  `category` VARCHAR(50) COMMENT 'fiqh, aqida, etc.',
  
  FOREIGN KEY (`story_id`) REFERENCES `prophet_stories`(`id`) ON DELETE CASCADE,
  KEY `idx_term` (`term`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT = 'Glossaire des termes islamiques dans les histoires';

-- ========================================
-- 👤 TABLES UTILISATEUR POUR LES HISTOIRES
-- ========================================

-- Progrès de lecture des utilisateurs
CREATE TABLE IF NOT EXISTS `user_story_progress` (
  `user_id` INT NOT NULL,
  `story_id` VARCHAR(50) NOT NULL,
  `current_chapter` INT DEFAULT 0,
  `current_position` INT DEFAULT 0 COMMENT 'Position dans le chapitre (en caractères)',
  `completion_percentage` DECIMAL(5,2) DEFAULT 0.00,
  `time_spent` INT DEFAULT 0 COMMENT 'Temps passé en secondes',
  `last_read_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`user_id`, `story_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`story_id`) REFERENCES `prophet_stories`(`id`) ON DELETE CASCADE,
  KEY `idx_last_read` (`last_read_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT = 'Progrès de lecture des histoires par utilisateur';

-- Notes personnelles des utilisateurs (Premium)
CREATE TABLE IF NOT EXISTS `user_story_notes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `story_id` VARCHAR(50) NOT NULL,
  `chapter_id` VARCHAR(50),
  `position` INT NOT NULL COMMENT 'Position dans le texte',
  `note_text` TEXT NOT NULL,
  `highlight_text` VARCHAR(500) COMMENT 'Texte surligné',
  `note_type` ENUM('personal', 'bookmark', 'question', 'reflection') DEFAULT 'personal',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`story_id`) REFERENCES `prophet_stories`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`chapter_id`) REFERENCES `prophet_story_chapters`(`id`) ON DELETE CASCADE,
  KEY `idx_user_story` (`user_id`, `story_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT = 'Notes personnelles des utilisateurs sur les histoires (Premium)';

-- Favoris des histoires
CREATE TABLE IF NOT EXISTS `user_story_favorites` (
  `user_id` INT NOT NULL,
  `story_id` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`user_id`, `story_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`story_id`) REFERENCES `prophet_stories`(`id`) ON DELETE CASCADE,
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT = 'Histoires favorites des utilisateurs';

-- Évaluations des histoires
CREATE TABLE IF NOT EXISTS `user_story_ratings` (
  `user_id` INT NOT NULL,
  `story_id` VARCHAR(50) NOT NULL,
  `rating` TINYINT CHECK (`rating` >= 1 AND `rating` <= 5),
  `review` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`user_id`, `story_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`story_id`) REFERENCES `prophet_stories`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT = 'Évaluations des histoires par les utilisateurs';

-- Vues des histoires (pour statistiques)
CREATE TABLE IF NOT EXISTS `user_story_views` (
  `user_id` INT NOT NULL,
  `story_id` VARCHAR(50) NOT NULL,
  `viewed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`user_id`, `story_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`story_id`) REFERENCES `prophet_stories`(`id`) ON DELETE CASCADE,
  KEY `idx_viewed` (`viewed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT = 'Suivi des vues des histoires pour analytics';

-- ========================================
-- 📊 VUES ET TRIGGERS POUR LES STATISTIQUES
-- ========================================

-- Vue pour les statistiques globales des histoires
CREATE VIEW `prophet_stories_stats` AS
SELECT 
    ps.id,
    ps.title,
    ps.category,
    ps.view_count,
    ps.rating,
    ps.rating_count,
    COUNT(DISTINCT usf.user_id) as favorite_count,
    COUNT(DISTINCT usp.user_id) as readers_count,
    AVG(usp.completion_percentage) as avg_completion
FROM prophet_stories ps
LEFT JOIN user_story_favorites usf ON ps.id = usf.story_id
LEFT JOIN user_story_progress usp ON ps.id = usp.story_id
GROUP BY ps.id;

-- Trigger pour mettre à jour la note moyenne des histoires
DELIMITER $$
CREATE TRIGGER update_story_rating 
AFTER INSERT ON user_story_ratings
FOR EACH ROW
BEGIN
    UPDATE prophet_stories 
    SET 
        rating = (
            SELECT AVG(rating) 
            FROM user_story_ratings 
            WHERE story_id = NEW.story_id
        ),
        rating_count = (
            SELECT COUNT(*) 
            FROM user_story_ratings 
            WHERE story_id = NEW.story_id
        )
    WHERE id = NEW.story_id;
END$$

CREATE TRIGGER update_story_rating_on_update
AFTER UPDATE ON user_story_ratings
FOR EACH ROW
BEGIN
    UPDATE prophet_stories 
    SET 
        rating = (
            SELECT AVG(rating) 
            FROM user_story_ratings 
            WHERE story_id = NEW.story_id
        ),
        rating_count = (
            SELECT COUNT(*) 
            FROM user_story_ratings 
            WHERE story_id = NEW.story_id
        )
    WHERE id = NEW.story_id;
END$$
DELIMITER ;

-- Index pour optimiser les requêtes de suivi
CREATE INDEX idx_status_created ON data_deletion_requests(status, created_at);
CREATE INDEX idx_email_status ON data_deletion_requests(email, status);

-- =================================================
-- 🛡️ PHASE 1 : TABLES DE SÉCURITÉ ET MONITORING
-- =================================================

-- ✅ Table de Rate Limiting (Protection anti-spam)
CREATE TABLE IF NOT EXISTS `rate_limits` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Rate limiting pour protection anti-spam';

-- ✅ Table de Monitoring (Surveillance système)
CREATE TABLE IF NOT EXISTS `payment_monitoring` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Monitoring des événements de paiement';

-- =================================================
-- 🚀 PHASE 1 : INDEX D'OPTIMISATION PERFORMANCE
-- =================================================

-- ===== INDEX POUR LA TABLE temp_payment_tokens =====
-- Optimisation des requêtes de nettoyage et validation

-- Index composite pour les requêtes de nettoyage
CREATE INDEX IF NOT EXISTS idx_temp_tokens_cleanup 
ON temp_payment_tokens(expires_at, used) 
COMMENT 'Optimisation nettoyage automatique';

-- Index pour les recherches par email
CREATE INDEX IF NOT EXISTS idx_temp_tokens_email 
ON temp_payment_tokens(email) 
COMMENT 'Recherche rapide par email';

-- Index pour les validations de tokens
CREATE INDEX IF NOT EXISTS idx_temp_tokens_validation 
ON temp_payment_tokens(token, expires_at, used) 
COMMENT 'Validation rapide des tokens';

-- Index pour les statistiques
CREATE INDEX IF NOT EXISTS idx_temp_tokens_stats 
ON temp_payment_tokens(created_at, subscription_type) 
COMMENT 'Statistiques de création';

-- ===== INDEX POUR LA TABLE users =====
-- Optimisation des connexions et recherches

-- Index pour les connexions par email
CREATE INDEX IF NOT EXISTS idx_users_email 
ON users(email) 
COMMENT 'Connexion rapide par email';

-- Index pour les recherches par statut
CREATE INDEX IF NOT EXISTS idx_users_status 
ON users(status) 
COMMENT 'Filtrage par statut utilisateur';

-- Index composite pour les recherches avancées
CREATE INDEX IF NOT EXISTS idx_users_search 
ON users(email, status, created_at) 
COMMENT 'Recherche utilisateur optimisée';

-- ===== INDEX POUR LA TABLE premium_subscriptions =====
-- Optimisation des requêtes d'abonnement

-- Index pour les abonnements actifs
CREATE INDEX IF NOT EXISTS idx_premium_active 
ON premium_subscriptions(user_id, status, end_date) 
COMMENT 'Abonnements actifs';

-- Index pour les statistiques de paiement
CREATE INDEX IF NOT EXISTS idx_premium_stats 
ON premium_subscriptions(created_at, subscription_type) 
COMMENT 'Statistiques de paiement';

-- Index pour les webhooks Stripe
CREATE INDEX IF NOT EXISTS idx_premium_stripe 
ON premium_subscriptions(stripe_session_id, stripe_customer_id) 
COMMENT 'Intégration Stripe';

-- ===== INDEX POUR LA TABLE rate_limits =====
-- Optimisation du rate limiting

-- Index pour les vérifications de blocage
CREATE INDEX IF NOT EXISTS idx_rate_blocked 
ON rate_limits(ip_address, action, blocked_until) 
COMMENT 'Vérification blocage IP';

-- Index pour le nettoyage automatique
CREATE INDEX IF NOT EXISTS idx_rate_cleanup 
ON rate_limits(last_attempt, blocked_until) 
COMMENT 'Nettoyage automatique';

-- Index pour les statistiques
CREATE INDEX IF NOT EXISTS idx_rate_stats 
ON rate_limits(action, first_attempt) 
COMMENT 'Statistiques rate limiting';

-- ===== INDEX POUR LA TABLE payment_monitoring =====
-- Optimisation du monitoring

-- Index pour les alertes
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts 
ON payment_monitoring(event_type, status, created_at) 
COMMENT 'Alertes automatiques';

-- Index pour les statistiques de performance
CREATE INDEX IF NOT EXISTS idx_monitoring_perf 
ON payment_monitoring(event_type, response_time, created_at) 
COMMENT 'Statistiques performance';

-- Index pour les rapports
CREATE INDEX IF NOT EXISTS idx_monitoring_reports 
ON payment_monitoring(status, created_at) 
COMMENT 'Rapports de santé';

-- =================================================
-- 📊 ANALYSE DES PERFORMANCES
-- =================================================

-- Analyser les tables principales pour optimiser les requêtes
ANALYZE TABLE temp_payment_tokens;
ANALYZE TABLE users;
ANALYZE TABLE premium_subscriptions;
ANALYZE TABLE rate_limits;
ANALYZE TABLE payment_monitoring;
ANALYZE TABLE refresh_tokens;




-- =================================================
-- 🎯 SYSTÈME VIP GRATUIT À VIE - AJOUT 2024
-- =================================================
-- Système pour offrir des abonnements premium gratuits
-- à vos parents, famille et amis proches.

-- 1. Ajouter les colonnes VIP à la table users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT FALSE COMMENT 'Utilisateur VIP avec premium gratuit à vie';
ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_granted_by VARCHAR(255) DEFAULT NULL COMMENT 'Qui a accordé le statut VIP (email de ladmin)';
ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_granted_at TIMESTAMP NULL DEFAULT NULL COMMENT 'Quand le statut VIP a été accordé';
ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_reason VARCHAR(500) DEFAULT NULL COMMENT 'Raison du statut VIP (ex: Parent, Ami proche, etc.)';

-- 2. Créer un index pour les requêtes VIP
CREATE INDEX IF NOT EXISTS idx_users_vip_status ON users (is_vip);

-- 3. Vue pour lister tous les utilisateurs VIP et Premium
CREATE OR REPLACE VIEW v_vip_users AS
SELECT 
    id,
    email,
    user_first_name,
    is_vip,
    vip_reason,
    vip_granted_by,
    vip_granted_at,
    premium_status,
    subscription_type,
    premium_expiry,
    created_at,
    last_seen,
    CASE 
        WHEN is_vip = 1 THEN 'VIP Gratuit à Vie'
        WHEN premium_status = 1 AND premium_expiry > NOW() THEN 'Premium Payant Actif'
        WHEN premium_status = 1 AND premium_expiry <= NOW() THEN 'Premium Payant Expiré'
        ELSE 'Gratuit'
    END as account_type,
    CASE 
        WHEN is_vip = 1 THEN TRUE
        WHEN premium_status = 1 AND premium_expiry > NOW() THEN TRUE
        ELSE FALSE
    END as has_premium_access
FROM users 
WHERE is_vip = 1 OR premium_status = 1
ORDER BY vip_granted_at DESC, premium_activated_at DESC;

-- 4. Vue pour les statistiques VIP
CREATE OR REPLACE VIEW v_vip_stats AS
SELECT 
    COUNT(*) as total_vip_users,
    COUNT(CASE WHEN last_seen > DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as active_vip_users,
    COUNT(CASE WHEN vip_reason = 'Parent du développeur' THEN 1 END) as family_vip,
    COUNT(CASE WHEN vip_reason = 'Ami proche' THEN 1 END) as friends_vip,
    COUNT(CASE WHEN vip_reason = 'Bêta testeur' THEN 1 END) as beta_testers_vip,
    COUNT(CASE WHEN vip_reason = 'Contributeur' THEN 1 END) as contributors_vip
FROM users WHERE is_vip = 1;

-- =================================================
-- 🎯 EXEMPLES DE DONNÉES VIP (DÉCOMMENTEZ POUR UTILISER)
-- =================================================

-- Créer des comptes VIP pour vos parents (REMPLACEZ LES EMAILS !)
-- INSERT INTO users (
--     email, password_hash, user_first_name,
--     is_vip, premium_status, premium_expiry,
--     vip_reason, vip_granted_by, vip_granted_at,
--     created_at, updated_at, status
-- ) VALUES 
-- ('papa@email.com', '$2y$12$dummy_hash_replace_with_real', 'Papa', TRUE, 1, '2099-12-31 23:59:59', 'Parent du développeur', 'admin@myadhanapp.com', NOW(), NOW(), NOW(), 'active'),
-- ('maman@email.com', '$2y$12$dummy_hash_replace_with_real', 'Maman', TRUE, 1, '2099-12-31 23:59:59', 'Parent du développeur', 'admin@myadhanapp.com', NOW(), NOW(), NOW(), 'active');

-- Transformer un utilisateur existant en VIP
-- UPDATE users SET 
--     is_vip = TRUE, 
--     premium_status = 1,
--     premium_expiry = '2099-12-31 23:59:59',
--     vip_reason = 'Famille proche',
--     vip_granted_by = 'admin@myadhanapp.com',
--     vip_granted_at = NOW(),
--     updated_at = NOW()
-- WHERE email = 'ami@email.com';

-- =================================================
-- 🔍 REQUÊTES UTILES POUR GÉRER LES VIP
-- =================================================

-- Lister tous les VIP
-- SELECT * FROM v_vip_users WHERE is_vip = 1;

-- Statistiques VIP
-- SELECT * FROM v_vip_stats;

-- Compter les utilisateurs par type
-- SELECT account_type, COUNT(*) as count FROM v_vip_users GROUP BY account_type;

-- Voir les VIP actifs récemment
-- SELECT email, user_first_name, vip_reason, last_seen 
-- FROM users 
-- WHERE is_vip = 1 AND last_seen > DATE_SUB(NOW(), INTERVAL 7 DAY)
-- ORDER BY last_seen DESC;

-- =================================================
-- 🕐 SYSTÈME DE GESTION D'EXPIRATION AUTOMATIQUE
-- =================================================
-- Procédures et vues pour gérer automatiquement les abonnements expirés

-- 1. Vue pour identifier les abonnements expirés
CREATE OR REPLACE VIEW v_expired_subscriptions AS
SELECT 
    u.id as user_id,
    u.email,
    u.user_first_name,
    u.premium_expiry,
    u.subscription_type,
    TIMESTAMPDIFF(DAY, u.premium_expiry, NOW()) as days_expired,
    ps.stripe_subscription_id,
    pp.id as purchase_id
FROM users u 
LEFT JOIN premium_subscriptions ps ON u.id = ps.user_id
LEFT JOIN premium_purchases pp ON u.id = pp.user_id AND pp.status = 'active'
WHERE u.premium_status = 1 
    AND u.is_vip = FALSE 
    AND u.premium_expiry IS NOT NULL 
    AND u.premium_expiry < NOW()
ORDER BY u.premium_expiry ASC;

-- 2. Vue pour les abonnements qui expirent bientôt (7 jours)
CREATE OR REPLACE VIEW v_expiring_soon_subscriptions AS
SELECT 
    u.id as user_id,
    u.email,
    u.user_first_name,
    u.premium_expiry,
    u.subscription_type,
    TIMESTAMPDIFF(DAY, NOW(), u.premium_expiry) as days_remaining,
    ps.stripe_subscription_id
FROM users u
LEFT JOIN premium_subscriptions ps ON u.id = ps.user_id
WHERE u.premium_status = 1 
    AND u.is_vip = FALSE 
    AND u.premium_expiry IS NOT NULL 
    AND u.premium_expiry > NOW() 
    AND u.premium_expiry < DATE_ADD(NOW(), INTERVAL 7 DAY)
ORDER BY u.premium_expiry ASC;

-- 3. Requêtes pour le nettoyage des abonnements expirés (sans procédure stockée)
-- Ces requêtes peuvent être exécutées directement ou via le script PHP

-- ⚠️ COMMANDES POUR NETTOYAGE MANUEL DES ABONNEMENTS EXPIRÉS
-- Exécutez ces requêtes quand vous voulez nettoyer les abonnements expirés :

-- Voir combien d'utilisateurs expirés avant nettoyage
-- SELECT COUNT(*) as expired_users FROM v_expired_subscriptions;
-- SELECT COUNT(*) as soon_expiring_users FROM v_expiring_soon_subscriptions;

-- 1. Désactiver les utilisateurs premium expirés (sauf VIP)
-- UPDATE users 
-- SET premium_status = 0, updated_at = NOW()
-- WHERE premium_status = 1 
--     AND is_vip = FALSE 
--     AND premium_expiry IS NOT NULL 
--     AND premium_expiry < NOW();

-- 2. Marquer les abonnements comme expirés
-- UPDATE premium_subscriptions ps
-- JOIN users u ON ps.user_id = u.id
-- SET ps.status = 'expired', ps.updated_at = NOW()
-- WHERE u.premium_expiry < NOW() 
--     AND u.is_vip = FALSE
--     AND ps.status = 'active';

-- 3. Désactiver dans premium_users
-- UPDATE premium_users pu
-- JOIN users u ON pu.user_id = u.id
-- SET pu.is_active = FALSE, pu.deactivated_at = NOW()
-- WHERE u.premium_expiry < NOW() 
--     AND u.is_vip = FALSE
--     AND pu.is_active = TRUE;

-- 4. Marquer les achats comme expirés
-- UPDATE premium_purchases pp
-- JOIN users u ON pp.user_id = u.id
-- SET pp.status = 'expired'
-- WHERE u.premium_expiry < NOW() 
--     AND u.is_vip = FALSE
--     AND pp.status = 'active';

-- 5. Logger le nettoyage (optionnel)
-- INSERT INTO maintenance_logs (operation, users_affected, details, executed_at)
-- VALUES ('manual_cleanup_expired_subscriptions', 
--         (SELECT COUNT(*) FROM users WHERE premium_status = 0 AND premium_expiry < NOW()), 
--         CONCAT('Manual cleanup executed at: ', NOW()), 
--         NOW());

-- 4. Table pour les logs de maintenance (requis pour la procédure ci-dessus)
CREATE TABLE IF NOT EXISTS maintenance_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    operation VARCHAR(100) NOT NULL,
    users_affected INT DEFAULT 0,
    details TEXT,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_maintenance_operation (operation),
    INDEX idx_maintenance_date (executed_at)
);

-- =================================================
-- 🗑️ SUPPRESSION D'UTILISATEUR (RGPD / DEMANDES DE COMPTE)
-- =================================================
-- Section dédiée pour traiter les demandes de suppression de compte
-- Conforme RGPD et réglementations de protection des données
-- ⚠️ TOUTES LES COMMANDES SONT COMMENTÉES POUR ÉVITER LES SUPPRESSIONS ACCIDENTELLES

-- 🔍 ÉTAPE 1: VÉRIFICATION AVANT SUPPRESSION (OBLIGATOIRE)
-- Toujours vérifier les données avant suppression définitive

-- Voir les informations complètes de l'utilisateur (REMPLACEZ L'EMAIL !)
-- SELECT id, email, user_first_name, premium_status, is_vip, created_at, last_seen,
--        subscription_type, premium_expiry, vip_reason
-- FROM users 
-- WHERE email = 'utilisateur@supprimer.com';

-- Compter TOUTES les données associées qui seront supprimées (CASCADE)
-- SELECT 
--     u.id,
--     u.email,
--     u.user_first_name,
--     CASE WHEN u.is_vip THEN 'VIP' WHEN u.premium_status THEN 'Premium' ELSE 'Gratuit' END as account_type,
--     (SELECT COUNT(*) FROM user_sessions WHERE user_id = u.id) as sessions_count,
--     (SELECT COUNT(*) FROM refresh_tokens WHERE user_id = u.id) as refresh_tokens_count,
--     (SELECT COUNT(*) FROM usage_logs WHERE user_id = u.id) as usage_logs_count,
--     (SELECT COUNT(*) FROM favorites WHERE user_id = u.id) as favorites_count,
--     (SELECT COUNT(*) FROM premium_purchases WHERE user_id = u.id) as premium_purchases_count,
--     (SELECT COUNT(*) FROM premium_subscriptions WHERE user_id = u.id) as premium_subscriptions_count,
--     (SELECT COUNT(*) FROM premium_users WHERE user_id = u.id) as premium_users_count,
--     (SELECT COUNT(*) FROM premium_payments WHERE user_id = u.id) as premium_payments_count,
--     (SELECT COUNT(*) FROM user_stats WHERE user_id = u.id) as user_stats_count,
--     (SELECT COUNT(*) FROM prayer_logs WHERE user_id = u.id) as prayer_logs_count,
--     (SELECT COUNT(*) FROM user_achievements WHERE user_id = u.id) as achievements_count,
--     (SELECT COUNT(*) FROM user_backups WHERE user_id = u.id) as backups_count,
--     (SELECT COUNT(*) FROM bug_reports WHERE user_id = u.id) as bug_reports_count
-- FROM users u 
-- WHERE u.email = 'utilisateur@supprimer.com';

-- 🗑️ ÉTAPE 2: SUPPRESSION DÉFINITIVE (DÉCOMMENTEZ ET ADAPTEZ)
-- ⚠️ ATTENTION : Ces commandes suppriment DÉFINITIVEMENT toutes les données !
-- ⚠️ SAUVEGARDEZ les données importantes avant suppression si nécessaire

-- 📝 LOGS DE SUPPRESSION (Recommandé pour traçabilité RGPD)
-- INSERT INTO maintenance_logs (operation, users_affected, details, executed_at)
-- VALUES ('user_deletion_request', 1, 
--         CONCAT('User deleted: Email=utilisateur@supprimer.com, Request_date=', NOW()),
--         NOW());

-- Suppression définitive par email (REMPLACEZ L'EMAIL !)
-- DELETE FROM users WHERE email = 'utilisateur@supprimer.com';

-- 🔍 ÉTAPE 3: VÉRIFICATION POST-SUPPRESSION
-- Confirmer que l'utilisateur et toutes ses données ont été supprimés
-- SELECT COUNT(*) as remaining_user_data FROM users WHERE email = 'utilisateur@supprimer.com';

-- =================================================
-- 💡 PROCÉDURE COMPLÈTE POUR DEMANDE RGPD
-- =================================================
-- Utilisation recommandée pour les demandes de suppression de compte

-- EXEMPLE CONCRET D'UTILISATION :
-- 1. Quelqu'un demande la suppression de son compte : support@exemple.com

-- 2. D'abord IDENTIFIER l'utilisateur
-- SELECT id, email, user_first_name, premium_status, is_vip, created_at
-- FROM users WHERE email = 'support@exemple.com';

-- 3. SAUVEGARDER (optionnel - si données importantes)
-- CREATE TABLE user_deletion_backup_20241201 AS
-- SELECT * FROM users WHERE email = 'support@exemple.com';

-- 4. LOGGER la demande (pour traçabilité)
-- INSERT INTO maintenance_logs (operation, users_affected, details, executed_at)
-- VALUES ('gdpr_deletion_request', 1, 
--         'RGPD deletion request for: support@exemple.com',
--         NOW());

-- 5. SUPPRIMER définitivement
-- DELETE FROM users WHERE email = 'support@exemple.com';

-- 6. CONFIRMER la suppression
-- SELECT 'Suppression RGPD terminée avec succès' as status 
-- WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'support@exemple.com');


