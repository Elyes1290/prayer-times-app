<?php
// Test simple de l'API users.php
$url = 'https://ton-domaine.com/api/users.php'; // Remplace par ton URL

// Données de test
$data = [
    'email' => 'test@example.com',
    'user_first_name' => 'Test User',
    'language' => 'fr',
    'premium_status' => 1,
    'subscription_type' => 'yearly',
    'subscription_id' => 'test_premium_' . time(),
    'premium_expiry' => date('Y-m-d H:i:s', strtotime('+1 year')),
    'location_mode' => 'auto',
    'location_city' => 'Paris',
    'location_country' => 'France',
    'location_lat' => 48.8566,
    'location_lon' => 2.3522
];

// Configuration cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

// Exécuter la requête
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

// Afficher les résultats
echo "=== TEST API USERS.PHP ===\n";
echo "URL: $url\n";
echo "HTTP Code: $httpCode\n";
echo "cURL Error: " . ($error ?: 'Aucune erreur') . "\n";
echo "Response: $response\n";
echo "=== FIN TEST ===\n";
?> 