<?php
// Test de l'API d'inscription avec données de localisation
echo "🧪 Test API inscription avec localisation\n";

$apiUrl = 'https://elyesnaitliman.ch/api/auth.php';
$testData = [
    'action' => 'register',
    'email' => 'test-location-' . time() . '@example.com',
    'password' => 'test123',
    'device_id' => 'test-device-' . time(),
    'language' => 'fr',
    'user_first_name' => 'Test Location',
    'premium_status' => 1,
    'subscription_type' => 'yearly',
    'subscription_id' => 'test-premium-' . time(),
    'premium_expiry' => date('Y-m-d H:i:s', strtotime('+1 year')),
    'location_mode' => 'manual',
    'location_city' => 'Paris',
    'location_country' => 'France',
    'location_lat' => 48.8566,
    'location_lon' => 2.3522
];

echo "📤 Données envoyées:\n";
print_r($testData);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $apiUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($testData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "\n📥 Réponse HTTP: $httpCode\n";
echo "📥 Réponse API:\n$response\n";

$responseData = json_decode($response, true);
if ($responseData && $responseData['success']) {
    echo "\n✅ SUCCÈS: Inscription réussie!\n";
    if (isset($responseData['data']['user'])) {
        $user = $responseData['data']['user'];
        echo "📍 Données localisation sauvegardées:\n";
        echo "- Mode: " . ($user['location_mode'] ?? 'NULL') . "\n";
        echo "- Ville: " . ($user['location_city'] ?? 'NULL') . "\n";
        echo "- Pays: " . ($user['location_country'] ?? 'NULL') . "\n";
        echo "- Lat: " . ($user['location_lat'] ?? 'NULL') . "\n";
        echo "- Lon: " . ($user['location_lon'] ?? 'NULL') . "\n";
    }
} else {
    echo "\n❌ ÉCHEC: " . ($responseData['message'] ?? 'Erreur inconnue') . "\n";
}
?> 