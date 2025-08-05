-- Script SQL pour corriger les données utilisateur existantes
-- Exécuter ce script dans votre base de données MySQL

-- 1. Corriger les utilisateurs premium sans date d'activation
-- 🎯 LOGIQUE : Abonné depuis au moins 2 semaines pour avoir une facturation réaliste
UPDATE users 
SET premium_activated_at = COALESCE(
    created_at,
    DATE_SUB(NOW(), INTERVAL 2 WEEK)
)
WHERE premium_status = 1 
AND premium_activated_at IS NULL;

-- 2. Corriger les valeurs NULL avec des valeurs par défaut
UPDATE users 
SET 
    location_mode = COALESCE(location_mode, 'auto'),
    calc_method = COALESCE(calc_method, 'MuslimWorldLeague'),
    adhan_sound = COALESCE(adhan_sound, 'misharyrachid'),
    adhan_volume = COALESCE(adhan_volume, 1.0),
    notifications_enabled = COALESCE(notifications_enabled, 1),
    reminders_enabled = COALESCE(reminders_enabled, 1),
    reminder_offset = COALESCE(reminder_offset, 10),
    dhikr_after_salah_enabled = COALESCE(dhikr_after_salah_enabled, 1),
    dhikr_after_salah_delay = COALESCE(dhikr_after_salah_delay, 5),
    dhikr_morning_enabled = COALESCE(dhikr_morning_enabled, 1),
    dhikr_morning_delay = COALESCE(dhikr_morning_delay, 10),
    dhikr_evening_enabled = COALESCE(dhikr_evening_enabled, 1),
    dhikr_evening_delay = COALESCE(dhikr_evening_delay, 10),
    dhikr_selected_dua_enabled = COALESCE(dhikr_selected_dua_enabled, 1),
    dhikr_selected_dua_delay = COALESCE(dhikr_selected_dua_delay, 15),
    theme_mode = COALESCE(theme_mode, 'auto'),
    is_first_time = COALESCE(is_first_time, 1),
    audio_quality = COALESCE(audio_quality, 'medium'),
    download_strategy = COALESCE(download_strategy, 'streaming_only'),
    enable_data_saving = COALESCE(enable_data_saving, 1),
    max_cache_size = COALESCE(max_cache_size, 100),
    auto_backup_enabled = COALESCE(auto_backup_enabled, 0),
    language = COALESCE(language, 'fr'),
    timezone = COALESCE(timezone, 'Europe/Paris'),
    updated_at = NOW()
WHERE 
    location_mode IS NULL 
    OR calc_method IS NULL 
    OR adhan_sound IS NULL 
    OR adhan_volume IS NULL 
    OR notifications_enabled IS NULL 
    OR reminders_enabled IS NULL 
    OR reminder_offset IS NULL 
    OR dhikr_after_salah_enabled IS NULL 
    OR dhikr_after_salah_delay IS NULL 
    OR dhikr_morning_enabled IS NULL 
    OR dhikr_morning_delay IS NULL 
    OR dhikr_evening_enabled IS NULL 
    OR dhikr_evening_delay IS NULL 
    OR dhikr_selected_dua_enabled IS NULL 
    OR dhikr_selected_dua_delay IS NULL 
    OR theme_mode IS NULL 
    OR is_first_time IS NULL 
    OR audio_quality IS NULL 
    OR download_strategy IS NULL 
    OR enable_data_saving IS NULL 
    OR max_cache_size IS NULL 
    OR auto_backup_enabled IS NULL 
    OR language IS NULL 
    OR timezone IS NULL;

-- 3. Afficher un résumé des utilisateurs
SELECT 
    COUNT(*) as total_users,
    SUM(CASE WHEN premium_status = 1 THEN 1 ELSE 0 END) as premium_users,
    SUM(CASE WHEN premium_status = 0 THEN 1 ELSE 0 END) as free_users,
    SUM(CASE WHEN email IS NOT NULL THEN 1 ELSE 0 END) as users_with_email,
    SUM(CASE WHEN user_first_name IS NOT NULL THEN 1 ELSE 0 END) as users_with_name
FROM users; 