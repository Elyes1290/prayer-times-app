-- Script pour supprimer complètement la colonne device_id de toutes les tables
-- Exécutez ce script sur votre base de données MySQL

-- Supprimer device_id de la table users
ALTER TABLE users DROP COLUMN IF EXISTS device_id;

-- Supprimer device_id de la table user_stats
ALTER TABLE user_stats DROP COLUMN IF EXISTS device_id;

-- Supprimer device_id de la table user_backups
ALTER TABLE user_backups DROP COLUMN IF EXISTS device_id;

-- Supprimer device_id de la table premium_purchases
ALTER TABLE premium_purchases DROP COLUMN IF EXISTS device_id;

-- Supprimer device_id de la table favorites
ALTER TABLE favorites DROP COLUMN IF EXISTS device_id;

-- Supprimer device_id de la table prayer_logs
ALTER TABLE prayer_logs DROP COLUMN IF EXISTS device_id;

-- Supprimer device_id de la table user_achievements
ALTER TABLE user_achievements DROP COLUMN IF EXISTS device_id;

-- Supprimer device_id de la table user_settings
ALTER TABLE user_settings DROP COLUMN IF EXISTS device_id;

-- Supprimer device_id de la table adhans
ALTER TABLE adhans DROP COLUMN IF EXISTS device_id;

-- Supprimer device_id de la table notifications
ALTER TABLE notifications DROP COLUMN IF EXISTS device_id;

-- Supprimer device_id de la table app_usage
ALTER TABLE app_usage DROP COLUMN IF EXISTS device_id;

-- Supprimer device_id de la table error_logs
ALTER TABLE error_logs DROP COLUMN IF EXISTS device_id;

-- Supprimer les index liés à device_id s'ils existent
-- (Ces commandes peuvent échouer si les index n'existent pas, c'est normal)
DROP INDEX IF EXISTS idx_device_id ON users;
DROP INDEX IF EXISTS idx_device_id ON user_stats;
DROP INDEX IF EXISTS idx_device_id ON user_backups;
DROP INDEX IF EXISTS idx_device_id ON premium_purchases;
DROP INDEX IF EXISTS idx_device_id ON favorites;
DROP INDEX IF EXISTS idx_device_id ON prayer_logs;
DROP INDEX IF EXISTS idx_device_id ON user_achievements;
DROP INDEX IF EXISTS idx_device_id ON user_settings;
DROP INDEX IF EXISTS idx_device_id ON adhans;
DROP INDEX IF EXISTS idx_device_id ON notifications;
DROP INDEX IF EXISTS idx_device_id ON app_usage;
DROP INDEX IF EXISTS idx_device_id ON error_logs;

-- Supprimer les contraintes UNIQUE liées à device_id
-- (Ces commandes peuvent échouer si les contraintes n'existent pas)
ALTER TABLE users DROP INDEX IF EXISTS device_id;
ALTER TABLE user_stats DROP INDEX IF EXISTS device_id;
ALTER TABLE user_backups DROP INDEX IF EXISTS device_id;
ALTER TABLE premium_purchases DROP INDEX IF EXISTS device_id;
ALTER TABLE favorites DROP INDEX IF EXISTS device_id;
ALTER TABLE prayer_logs DROP INDEX IF EXISTS device_id;
ALTER TABLE user_achievements DROP INDEX IF EXISTS device_id;
ALTER TABLE user_settings DROP INDEX IF EXISTS device_id;
ALTER TABLE adhans DROP INDEX IF EXISTS device_id;
ALTER TABLE notifications DROP INDEX IF EXISTS device_id;
ALTER TABLE app_usage DROP INDEX IF EXISTS device_id;
ALTER TABLE error_logs DROP INDEX IF EXISTS device_id;

-- Vérifier que les colonnes ont été supprimées
-- (Ces commandes afficheront la structure des tables)
DESCRIBE users;
DESCRIBE user_stats;
DESCRIBE user_backups;
DESCRIBE premium_purchases;
DESCRIBE favorites;
DESCRIBE prayer_logs;
DESCRIBE user_achievements;
DESCRIBE user_settings;
DESCRIBE adhans;
DESCRIBE notifications;
DESCRIBE app_usage;
DESCRIBE error_logs;

-- Afficher un message de confirmation
SELECT 'Script de suppression device_id terminé avec succès' AS message; 