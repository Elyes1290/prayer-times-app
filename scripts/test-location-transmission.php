<?php
// Script de test pour vérifier la transmission des données de localisation

// Définir le chemin correct vers le fichier de configuration
$configPath = __DIR__ . '/../api/config.php';
if (!file_exists($configPath)) {
    die("❌ Erreur: Fichier de configuration non trouvé: $configPath\n");
}

require_once $configPath;

echo "🧪 Test de transmission des données de localisation\n";
echo "==================================================\n\n";

// Simuler des données d'inscription avec localisation
$testData = [
    'email' => 'test-location@example.com',
    'password' => 'test123',
    'device_id' => 'test-device-location-' . time(),
    'language' => 'fr',
    'user_first_name' => 'Test Location',
    
    // Données premium
    'premium_status' => 1,
    'subscription_type' => 'yearly',
    'subscription_id' => 'test-premium-' . time(),
    'premium_expiry' => date('Y-m-d H:i:s', strtotime('+1 year')),
    
    // 🚀 NOUVEAU : Données de localisation
    'location_mode' => 'manual',
    'location_city' => 'Paris',
    'location_country' => 'France',
    'location_lat' => 48.8566,
    'location_lon' => 2.3522
];

echo "📤 Données envoyées:\n";
print_r($testData);
echo "\n";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Vérifier si l'utilisateur existe déjà
    $checkStmt = $pdo->prepare("SELECT id, email, location_mode, location_city, location_lat, location_lon FROM users WHERE email = ?");
    $checkStmt->execute([$testData['email']]);
    $existingUser = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    if ($existingUser) {
        echo "⚠️ Utilisateur existant trouvé:\n";
        print_r($existingUser);
        echo "\n";
        
        // Mettre à jour les données de localisation
        $updateStmt = $pdo->prepare("
            UPDATE users SET 
                location_mode = ?,
                location_city = ?,
                location_country = ?,
                location_lat = ?,
                location_lon = ?,
                updated_at = NOW()
            WHERE email = ?
        ");
        
        $updateStmt->execute([
            $testData['location_mode'],
            $testData['location_city'],
            $testData['location_country'],
            $testData['location_lat'],
            $testData['location_lon'],
            $testData['email']
        ]);
        
        echo "✅ Données de localisation mises à jour\n";
    } else {
        // Créer un nouvel utilisateur de test
        $insertStmt = $pdo->prepare("
            INSERT INTO users (
                email, device_id, language, user_first_name,
                premium_status, subscription_type, subscription_id, premium_expiry, premium_activated_at,
                location_mode, location_city, location_country, location_lat, location_lon,
                calc_method, adhan_sound, adhan_volume,
                notifications_enabled, reminders_enabled, reminder_offset,
                dhikr_after_salah_enabled, dhikr_after_salah_delay,
                dhikr_morning_enabled, dhikr_morning_delay,
                dhikr_evening_enabled, dhikr_evening_delay,
                dhikr_selected_dua_enabled, dhikr_selected_dua_delay,
                theme_mode, is_first_time, audio_quality, download_strategy,
                enable_data_saving, max_cache_size, auto_backup_enabled,
                created_at, updated_at, last_seen
            ) VALUES (
                ?, ?, ?, ?, 
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                'MuslimWorldLeague', 'misharyrachid', 1.0,
                1, 1, 10,
                1, 5,
                1, 10,
                1, 10,
                1, 15,
                'auto', 1, 'medium', 'streaming_only',
                1, 100, 0,
                NOW(), NOW(), NOW()
            )
        ");
        
        $insertStmt->execute([
            $testData['email'],
            $testData['device_id'],
            $testData['language'],
            $testData['user_first_name'],
            $testData['premium_status'],
            $testData['subscription_type'],
            $testData['subscription_id'],
            $testData['premium_expiry'],
            date('Y-m-d H:i:s'),
            $testData['location_mode'],
            $testData['location_city'],
            $testData['location_country'],
            $testData['location_lat'],
            $testData['location_lon']
        ]);
        
        echo "✅ Nouvel utilisateur créé avec données de localisation\n";
    }
    
    // Vérifier les données sauvegardées
    $verifyStmt = $pdo->prepare("
        SELECT id, email, location_mode, location_city, location_country, 
               location_lat, location_lon, premium_status, subscription_type
        FROM users 
        WHERE email = ?
    ");
    $verifyStmt->execute([$testData['email']]);
    $savedUser = $verifyStmt->fetch(PDO::FETCH_ASSOC);
    
    echo "\n📥 Données sauvegardées en base:\n";
    print_r($savedUser);
    echo "\n";
    
    // Vérifier que les données correspondent
    $locationMatch = 
        $savedUser['location_mode'] === $testData['location_mode'] &&
        $savedUser['location_city'] === $testData['location_city'] &&
        $savedUser['location_country'] === $testData['location_country'] &&
        abs($savedUser['location_lat'] - $testData['location_lat']) < 0.001 &&
        abs($savedUser['location_lon'] - $testData['location_lon']) < 0.001;
    
    if ($locationMatch) {
        echo "✅ SUCCÈS: Les données de localisation ont été correctement transmises et sauvegardées!\n";
    } else {
        echo "❌ ÉCHEC: Les données de localisation ne correspondent pas!\n";
    }
    
} catch (PDOException $e) {
    echo "❌ Erreur base de données: " . $e->getMessage() . "\n";
} catch (Exception $e) {
    echo "❌ Erreur: " . $e->getMessage() . "\n";
}

echo "\n🧹 Nettoyage: Suppression de l'utilisateur de test...\n";
try {
    $deleteStmt = $pdo->prepare("DELETE FROM users WHERE email = ?");
    $deleteStmt->execute([$testData['email']]);
    echo "✅ Utilisateur de test supprimé\n";
} catch (Exception $e) {
    echo "⚠️ Erreur lors de la suppression: " . $e->getMessage() . "\n";
}

echo "\n🎯 Test terminé!\n";
?> 