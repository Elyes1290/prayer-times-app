-- =================================================
-- 🔧 SCRIPT DE CORRECTION SÛR - TABLE USERS
-- Ajoute uniquement les colonnes manquantes
-- =================================================

-- Fonction pour ajouter une colonne seulement si elle n'existe pas
SET @sql = '';

-- Colonnes à vérifier et ajouter si nécessaire
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'ALTER TABLE `users` ADD COLUMN `user_last_name` varchar(100) DEFAULT NULL AFTER `user_first_name`;'
    ELSE 'SELECT "Column user_last_name already exists" as message;'
  END INTO @sql
FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'user_last_name';
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'ALTER TABLE `users` ADD COLUMN `timezone` varchar(100) DEFAULT "Europe/Paris" AFTER `location_lon`;'
    ELSE 'SELECT "Column timezone already exists" as message;'
  END INTO @sql
FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'timezone';
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'ALTER TABLE `users` ADD COLUMN `prayer_times_format` enum("12h","24h") DEFAULT "24h" AFTER `reminder_offset`;'
    ELSE 'SELECT "Column prayer_times_format already exists" as message;'
  END INTO @sql
FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'prayer_times_format';
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'ALTER TABLE `users` ADD COLUMN `show_seconds` tinyint(1) DEFAULT 0 AFTER `prayer_times_format`;'
    ELSE 'SELECT "Column show_seconds already exists" as message;'
  END INTO @sql
FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'show_seconds';
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'ALTER TABLE `users` ADD COLUMN `dhikr_auto_count` tinyint(1) DEFAULT 0 COMMENT "Comptage automatique des dhikr" AFTER `dhikr_selected_dua_delay`;'
    ELSE 'SELECT "Column dhikr_auto_count already exists" as message;'
  END INTO @sql
FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'dhikr_auto_count';
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'ALTER TABLE `users` ADD COLUMN `font_size` enum("small","medium","large") DEFAULT "medium" AFTER `theme_mode`;'
    ELSE 'SELECT "Column font_size already exists" as message;'
  END INTO @sql
FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'font_size';
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'ALTER TABLE `users` ADD COLUMN `show_arabic_text` tinyint(1) DEFAULT 1 AFTER `font_size`;'
    ELSE 'SELECT "Column show_arabic_text already exists" as message;'
  END INTO @sql
FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'show_arabic_text';
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'ALTER TABLE `users` ADD COLUMN `show_translation` tinyint(1) DEFAULT 1 AFTER `show_arabic_text`;'
    ELSE 'SELECT "Column show_translation already exists" as message;'
  END INTO @sql
FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'show_translation';
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'ALTER TABLE `users` ADD COLUMN `show_transliteration` tinyint(1) DEFAULT 0 AFTER `show_translation`;'
    ELSE 'SELECT "Column show_transliteration already exists" as message;'
  END INTO @sql
FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'show_transliteration';
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'ALTER TABLE `users` ADD COLUMN `onboarding_completed` tinyint(1) DEFAULT 0 AFTER `is_first_time`;'
    ELSE 'SELECT "Column onboarding_completed already exists" as message;'
  END INTO @sql
FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'onboarding_completed';
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'ALTER TABLE `users` ADD COLUMN `auto_play_next` tinyint(1) DEFAULT 0 AFTER `max_cache_size`;'
    ELSE 'SELECT "Column auto_play_next already exists" as message;'
  END INTO @sql
FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'auto_play_next';
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'ALTER TABLE `users` ADD COLUMN `background_audio` tinyint(1) DEFAULT 1 AFTER `auto_play_next`;'
    ELSE 'SELECT "Column background_audio already exists" as message;'
  END INTO @sql
FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'background_audio';
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'ALTER TABLE `users` ADD COLUMN `backup_frequency` enum("daily","weekly","monthly") DEFAULT "weekly" AFTER `auto_backup_enabled`;'
    ELSE 'SELECT "Column backup_frequency already exists" as message;'
  END INTO @sql
FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'backup_frequency';
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'ALTER TABLE `users` ADD COLUMN `last_backup_time` timestamp NULL DEFAULT NULL AFTER `backup_frequency`;'
    ELSE 'SELECT "Column last_backup_time already exists" as message;'
  END INTO @sql
FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'last_backup_time';
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'ALTER TABLE `users` ADD COLUMN `last_sync_time` timestamp NULL DEFAULT NULL AFTER `last_backup_time`;'
    ELSE 'SELECT "Column last_sync_time already exists" as message;'
  END INTO @sql
FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'last_sync_time';
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'ALTER TABLE `users` ADD COLUMN `sync_enabled` tinyint(1) DEFAULT 1 AFTER `last_sync_time`;'
    ELSE 'SELECT "Column sync_enabled already exists" as message;'
  END INTO @sql
FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'sync_enabled';
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'ALTER TABLE `users` ADD COLUMN `app_version` varchar(20) DEFAULT NULL AFTER `login_count`;'
    ELSE 'SELECT "Column app_version already exists" as message;'
  END INTO @sql
FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'app_version';
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'ALTER TABLE `users` ADD COLUMN `device_model` varchar(100) DEFAULT NULL AFTER `app_version`;'
    ELSE 'SELECT "Column device_model already exists" as message;'
  END INTO @sql
FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'device_model';
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'ALTER TABLE `users` ADD COLUMN `os_version` varchar(50) DEFAULT NULL AFTER `device_model`;'
    ELSE 'SELECT "Column os_version already exists" as message;'
  END INTO @sql
FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'os_version';
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'ALTER TABLE `users` ADD COLUMN `app_build` varchar(20) DEFAULT NULL AFTER `os_version`;'
    ELSE 'SELECT "Column app_build already exists" as message;'
  END INTO @sql
FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'app_build';
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Message de fin
SELECT 'Script de correction terminé avec succès !' AS message; 