-- Script pour corriger les données de localisation des utilisateurs existants
-- Ce script met à jour les utilisateurs qui ont des données de localisation NULL

-- 1. Voir les utilisateurs avec des données de localisation NULL
SELECT 
    id, 
    email, 
    location_mode, 
    location_city, 
    location_country, 
    location_lat, 
    location_lon,
    created_at
FROM users 
WHERE location_city IS NULL 
   OR location_lat IS NULL 
   OR location_lon IS NULL
ORDER BY created_at DESC;

-- 2. Mettre à jour les utilisateurs avec des valeurs par défaut
-- (Optionnel - à utiliser seulement si vous voulez des valeurs par défaut)

-- Pour les utilisateurs avec location_mode = 'auto' ou NULL
UPDATE users 
SET 
    location_mode = 'auto',
    location_lat = 48.8566,  -- Paris par défaut
    location_lon = 2.3522,
    location_city = 'Paris',
    location_country = 'France',
    updated_at = NOW()
WHERE (location_city IS NULL OR location_lat IS NULL OR location_lon IS NULL)
  AND (location_mode = 'auto' OR location_mode IS NULL);

-- Pour les utilisateurs avec location_mode = 'manual'
UPDATE users 
SET 
    location_mode = 'manual',
    location_lat = 48.8566,  -- Paris par défaut
    location_lon = 2.3522,
    location_city = 'Paris',
    location_country = 'France',
    updated_at = NOW()
WHERE (location_city IS NULL OR location_lat IS NULL OR location_lon IS NULL)
  AND location_mode = 'manual';

-- 3. Vérifier les résultats
SELECT 
    id, 
    email, 
    location_mode, 
    location_city, 
    location_country, 
    location_lat, 
    location_lon,
    updated_at
FROM users 
WHERE location_city IS NOT NULL 
  AND location_lat IS NOT NULL 
  AND location_lon IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;

-- 4. Statistiques
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN location_city IS NOT NULL THEN 1 END) as users_with_city,
    COUNT(CASE WHEN location_lat IS NOT NULL THEN 1 END) as users_with_lat,
    COUNT(CASE WHEN location_lon IS NOT NULL THEN 1 END) as users_with_lon,
    COUNT(CASE WHEN location_mode IS NOT NULL THEN 1 END) as users_with_mode
FROM users;

-- 5. Utilisateurs encore avec des données NULL (après correction)
SELECT 
    COUNT(*) as remaining_null_users
FROM users 
WHERE location_city IS NULL 
   OR location_lat IS NULL 
   OR location_lon IS NULL; 