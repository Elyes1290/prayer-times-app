-- Script pour vérifier et créer la table user_backups si nécessaire
-- À exécuter dans phpMyAdmin

-- Vérifier si la table existe
SELECT 
    TABLE_NAME, 
    CREATE_TIME,
    TABLE_ROWS
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'user_backups';

-- Créer la table si elle n'existe pas (structure corrigée)
CREATE TABLE IF NOT EXISTS `user_backups` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `backup_data` longtext NOT NULL COMMENT 'JSON complet des données utilisateur',
  `backup_size` int(11) DEFAULT NULL COMMENT 'Taille du backup en bytes',
  `device_info` varchar(255) DEFAULT NULL,
  `backup_type` enum('auto','manual','migration','premium_activation') DEFAULT 'manual',
  `backup_version` varchar(10) DEFAULT '1.0',
  `checksum` varchar(64) DEFAULT NULL COMMENT 'Vérification intégrité backup',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `created_at` (`created_at`),
  KEY `backup_type` (`backup_type`),
  KEY `user_date` (`user_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Sauvegardes des données utilisateur';

-- Vérifier la création
SELECT 'Table user_backups créée ou vérifiée avec succès!' as status;

-- Afficher la structure de la table
DESCRIBE user_backups; 