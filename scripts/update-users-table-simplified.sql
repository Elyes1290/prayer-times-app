-- =================================================
-- 🔄 SCRIPT DE MISE À JOUR - SIMPLIFICATION TABLE USERS
-- Supprime les colonnes non nécessaires des données personnelles
-- =================================================

-- ✅ Supprimer les colonnes non nécessaires
ALTER TABLE `users` 
DROP COLUMN IF EXISTS `user_last_name`,
DROP COLUMN IF EXISTS `phone_number`,
DROP COLUMN IF EXISTS `date_of_birth`,
DROP COLUMN IF EXISTS `gender`,
DROP COLUMN IF EXISTS `profile_picture`,
DROP COLUMN IF EXISTS `phone_verified`;

-- ✅ Mettre à jour le commentaire de user_first_name
ALTER TABLE `users` 
MODIFY COLUMN `user_first_name` varchar(100) DEFAULT NULL COMMENT 'Prénom ou pseudo de l\'utilisateur';

-- ✅ Vérifier la structure finale
DESCRIBE `users`;

-- ✅ Afficher un résumé des modifications
SELECT 
    'Table users simplifiée' as message,
    'Colonnes supprimées: user_last_name, phone_number, date_of_birth, gender, profile_picture, phone_verified' as details,
    NOW() as updated_at; 