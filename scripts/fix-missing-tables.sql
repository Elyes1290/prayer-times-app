-- =================================================
-- 🔧 CORRECTION RAPIDE - TABLES MANQUANTES
-- =================================================
-- Script pour créer les tables qui ont échoué lors de la première migration
-- À exécuter dans phpMyAdmin si certaines tables sont manquantes
-- =================================================

-- Table premium_content (CRITIQUE pour la section login premium)
CREATE TABLE IF NOT EXISTS `premium_content` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `content_id` varchar(255) NOT NULL COMMENT 'ID unique du contenu',
  `type` enum('quran_recitation','adhan_voice','hadith_audio','dhikr_audio','dua_audio') NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `reciter` varchar(255) DEFAULT NULL,
  `surah_number` int(11) DEFAULT NULL,
  `surah_name` varchar(255) DEFAULT NULL,
  `file_url` varchar(500) NOT NULL COMMENT 'URL Firebase Storage ou chemin local',
  `file_size` decimal(8,2) NOT NULL COMMENT 'Taille en MB',
  `duration` int(11) DEFAULT NULL COMMENT 'Durée en secondes',
  `quality` enum('low','medium','high') DEFAULT 'medium',
  `language` varchar(10) DEFAULT 'ar',
  `premium_required` tinyint(1) DEFAULT 1,
  `sort_order` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `download_count` int(11) DEFAULT 0,
  `play_count` int(11) DEFAULT 0,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `content_id` (`content_id`),
  KEY `type` (`type`),
  KEY `reciter` (`reciter`),
  KEY `surah_number` (`surah_number`),
  KEY `premium_required` (`premium_required`),
  KEY `is_active` (`is_active`),
  KEY `sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Catalogue du contenu premium';

-- 🗑️ Table downloaded_recitations SUPPRIMÉE
-- Cette table causait des désynchronisations entre la base de données et la réalité des fichiers
-- Le stockage local (AsyncStorage) est suffisant et plus fiable

-- Table usage_logs
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
  KEY `action` (`action`),
  KEY `timestamp` (`timestamp`),
  KEY `user_action` (`user_id`, `action`),
  KEY `content_type` (`content_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Logs d\'utilisation pour analytics';

-- Table user_sessions
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `session_token` varchar(255) NOT NULL,
  `device_info` text DEFAULT NULL COMMENT 'JSON avec infos de l\'appareil',
  `ip_address` varchar(45) DEFAULT NULL,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `last_activity` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_active` tinyint(1) DEFAULT 1,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_token` (`session_token`),
  KEY `expires_at` (`expires_at`),
  KEY `last_activity` (`last_activity`),
  KEY `is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Sessions utilisateur actives';

-- Table user_backups
CREATE TABLE IF NOT EXISTS `user_backups` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `backup_data` longtext NOT NULL COMMENT 'JSON complet des données utilisateur',
  `backup_size` int(11) DEFAULT NULL COMMENT 'Taille du backup en bytes',
  `device_info` varchar(255) DEFAULT NULL,
  `backup_type` enum('auto','manual','migration','premium_activation') DEFAULT 'manual',
  `backup_version` varchar(10) DEFAULT '1.0',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  KEY `created_at` (`created_at`),
  KEY `backup_type` (`backup_type`),
  KEY `user_date` (`user_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Backups des données utilisateur';

-- =================================================
-- 🎯 DONNÉES DE TEST POUR PREMIUM_CONTENT
-- =================================================

-- Insérer du contenu premium de test (le plus critique)
INSERT IGNORE INTO `premium_content` (`content_id`, `type`, `title`, `reciter`, `surah_number`, `surah_name`, `file_url`, `file_size`, `quality`, `premium_required`, `sort_order`, `duration`) VALUES
-- Récitations Coran Premium
('sudais_001', 'quran_recitation', 'Al-Fatiha - Abdul Rahman Al-Sudais', 'Abdul Rahman Al-Sudais', 1, 'Al-Fatiha', 'premium/quran/sudais/001.mp3', 2.1, 'high', 1, 1, 75),
('sudais_002', 'quran_recitation', 'Al-Baqarah - Abdul Rahman Al-Sudais', 'Abdul Rahman Al-Sudais', 2, 'Al-Baqarah', 'premium/quran/sudais/002.mp3', 65.4, 'high', 1, 2, 3900),
('shuraim_001', 'quran_recitation', 'Al-Fatiha - Saad Al-Ghamidi', 'Saad Al-Ghamidi', 1, 'Al-Fatiha', 'premium/quran/shuraim/001.mp3', 2.3, 'high', 1, 3, 80),
('luhaidan_001', 'quran_recitation', 'Al-Fatiha - Salah Al-Luhaidan', 'Salah Al-Luhaidan', 1, 'Al-Fatiha', 'premium/quran/luhaidan/001.mp3', 1.9, 'high', 1, 4, 70),

-- Sons d'Adhan Premium
('adhan_mecca_premium', 'adhan_voice', 'Adhan de La Mecque - Premium', 'Masjid Al-Haram', NULL, NULL, 'premium/adhan/mecca_premium.mp3', 4.2, 'high', 1, 10, 210),
('adhan_medina_premium', 'adhan_voice', 'Adhan de Médine - Premium', 'Masjid An-Nabawi', NULL, NULL, 'premium/adhan/medina_premium.mp3', 3.8, 'high', 1, 11, 195),
('adhan_istanbul_premium', 'adhan_voice', 'Adhan d\'Istanbul - Premium', 'Sultanahmet Mosque', NULL, NULL, 'premium/adhan/istanbul_premium.mp3', 3.5, 'high', 1, 12, 180);

-- =================================================
-- 🧪 TEST IMMÉDIAT
-- =================================================

-- Vérifier que tout fonctionne
SELECT 'Tables manquantes créées avec succès!' as status;
SELECT COUNT(*) as premium_content_count FROM premium_content WHERE is_active = 1;
SELECT COUNT(*) as tables_created FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('premium_content', 'usage_logs', 'user_sessions', 'user_backups'); -- downloaded_recitations supprimée

-- Afficher les tables premium disponibles
SELECT content_id, title, reciter, type FROM premium_content WHERE is_active = 1 ORDER BY sort_order; 