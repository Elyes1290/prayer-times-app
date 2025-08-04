-- 🧹 Script de nettoyage de la table downloaded_recitations
-- Cette table est inutile car elle cause des désynchronisations entre la base de données et la réalité des fichiers

-- 1. Supprimer la table downloaded_recitations
DROP TABLE IF EXISTS `downloaded_recitations`;

-- 2. Vérifier qu'elle est bien supprimée
SELECT COUNT(*) as tables_remaining 
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'downloaded_recitations';

-- 3. Nettoyer les vues qui référencent cette table (si elles existent)
-- Note: Les vues seront recréées sans cette référence dans le fichier final

-- 4. Vérifier les autres tables restantes
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name IN (
    'users', 
    'favorites', 
    'premium_content', 
    'premium_purchases', 
    'usage_logs', 
    'user_sessions', 
    'user_backups',
    'notifications',
    'mosques',
    'mosque_prayer_times',
    'achievements',
    'user_achievements',
    'user_stats',
    'bug_reports'
)
ORDER BY table_name;

-- ✅ Résultat attendu: downloaded_recitations ne doit plus apparaître 