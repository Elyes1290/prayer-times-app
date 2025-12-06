<?php
/**
 * 🔔 CRON JOB : Envoi quotidien de Silent Push Notifications iOS
 * 
 * OBJECTIF :
 * Envoyer UNE SEULE notification silencieuse au topic Firebase "ios_notifications"
 * pour réveiller tous les iPhones et leur permettre de reprogrammer leurs notifications locales.
 * 
 * FRÉQUENCE :
 * Tous les jours à minuit (00:00)
 * 
 * COMMANDE CRON (cPanel Infomaniak) :
 * 0 0 * * * php /home/votre-user/public_html/api/cron/send-silent-push.php
 * 
 * URL ALTERNATIVE (si cron PHP indisponible) :
 * 0 0 * * * curl "https://myadhanapp.com/api/cron/send-silent-push.php?secret=VOTRE_SECRET"
 * 
 * CONFIGURATION REQUISE :
 * - Fichier JSON service account dans api/config/firebase-service-account.json
 * - Projet Firebase configuré avec Cloud Messaging v1 activé
 * - App iOS abonnée au topic "ios_notifications"
 */

// 🔧 Configuration
error_reporting(E_ALL);
ini_set('display_errors', 1);

// 📁 Charger le fichier .env manuellement AVANT la vérification du secret
$envFile = __DIR__ . '/../../.env';

if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        // Ignorer les commentaires et les lignes vides
        if (empty($line) || strpos($line, '#') === 0) continue;
        // Parser la ligne KEY=VALUE
        if (strpos($line, '=') !== false) {
            list($name, $value) = explode('=', $line, 2);
            $name = trim($name);
            $value = trim($value);
            // Retirer les guillemets si présents
            $value = trim($value, '"\'');
            putenv("$name=$value");
            $_ENV[$name] = $value;
        }
    }
}

// 🔐 SÉCURITÉ : Vérifier le secret APRÈS avoir chargé le .env
if (php_sapi_name() !== 'cli') {
    // Si exécuté via HTTP, vérifier le secret
    $secret = $_GET['secret'] ?? '';
    $validSecret = getenv('CRON_SECRET') ?: 'CHANGEZ_CE_SECRET_UNIQUE_ICI_123456';
    
    if ($secret !== $validSecret) {
        http_response_code(403);
        die("❌ Accès refusé - Secret invalide\n");
    }
}

echo "╔═══════════════════════════════════════════════════════════╗\n";
echo "║  🔔 CRON : Envoi Silent Push Notifications iOS (API v1) ║\n";
echo "╚═══════════════════════════════════════════════════════════╝\n\n";

$startTime = microtime(true);
$timestamp = date('Y-m-d H:i:s');
echo "⏰ Démarrage : $timestamp\n\n";

// 🔑 Charger le fichier JSON service account
$serviceAccountPath = __DIR__ . '/../config/firebase-service-account.json';

if (!file_exists($serviceAccountPath)) {
    echo "❌ ERREUR CRITIQUE : Fichier firebase-service-account.json introuvable\n";
    echo "📝 Chemin attendu : $serviceAccountPath\n";
    echo "💡 Téléchargez-le depuis Firebase Console > Paramètres > Comptes de service\n";
    exit(1);
}

$serviceAccountJson = file_get_contents($serviceAccountPath);
$serviceAccount = json_decode($serviceAccountJson, true);

if (!$serviceAccount || !isset($serviceAccount['project_id'])) {
    echo "❌ ERREUR : Fichier JSON invalide ou corrompu\n";
    exit(1);
}

$projectId = $serviceAccount['project_id'];
echo "✅ Service Account chargé : Projet Firebase \"$projectId\"\n\n";

// 🔐 Générer un JWT (JSON Web Token) pour l'authentification OAuth2
function generateJWT($serviceAccount) {
    $now = time();
    $header = base64_encode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
    $payload = base64_encode(json_encode([
        'iss' => $serviceAccount['client_email'],
        'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
        'aud' => 'https://oauth2.googleapis.com/token',
        'iat' => $now,
        'exp' => $now + 3600
    ]));
    
    $signatureInput = "$header.$payload";
    $privateKey = openssl_pkey_get_private($serviceAccount['private_key']);
    openssl_sign($signatureInput, $signature, $privateKey, OPENSSL_ALGO_SHA256);
    
    return "$signatureInput." . base64_encode($signature);
}

// 🎫 Obtenir un Access Token OAuth2
echo "🔐 Génération du token d'authentification...\n";

$jwt = generateJWT($serviceAccount);

$ch = curl_init('https://oauth2.googleapis.com/token');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
    'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    'assertion' => $jwt
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$tokenResponse = curl_exec($ch);
$tokenData = json_decode($tokenResponse, true);
curl_close($ch);

if (!isset($tokenData['access_token'])) {
    echo "❌ ERREUR : Impossible d'obtenir le token OAuth2\n";
    echo "Réponse : $tokenResponse\n";
    exit(1);
}

$accessToken = $tokenData['access_token'];
echo "✅ Token OAuth2 obtenu\n\n";

// 📱 Préparer la Silent Push Notification (API v1)
$message = [
    'message' => [
        'topic' => 'ios_notifications',
        'apns' => [
            'payload' => [
                'aps' => [
                    'content-available' => 1,  // Silent notification
                    'priority' => 'high'
                ]
            ]
        ],
        'data' => [
            'action' => 'refresh_notifications',
            'timestamp' => (string)time(),
            'server_time' => $timestamp
        ]
    ]
];

echo "📦 Préparation de la notification...\n";
echo "   🎯 Destination : /topics/ios_notifications\n";
echo "   🔕 Type : Silent (content-available)\n";
echo "   ⚡ Priorité : High\n";
echo "   📅 Timestamp : " . $message['message']['data']['timestamp'] . "\n\n";

// 🚀 Envoi via Firebase Cloud Messaging v1
echo "🚀 Envoi à Firebase Cloud Messaging v1...\n";

$fcmUrl = "https://fcm.googleapis.com/v1/projects/$projectId/messages:send";

$ch = curl_init($fcmUrl);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $accessToken,
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($message));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

echo "\n";
echo "═══════════════════════════════════════════════════════════\n";
echo "   RÉSULTAT DE L'ENVOI\n";
echo "═══════════════════════════════════════════════════════════\n";

if ($httpCode === 200) {
    $responseData = json_decode($response, true);
    $messageId = $responseData['name'] ?? 'N/A';
    
    echo "✅ SUCCÈS ! Notification envoyée avec succès\n\n";
    echo "📊 STATISTIQUES :\n";
    echo "   • Code HTTP : $httpCode\n";
    echo "   • Message ID : $messageId\n";
    echo "   • Topic : ios_notifications\n";
    echo "   • API : Firebase Cloud Messaging v1\n";
    echo "   • Réponse complète : $response\n";
    
    // 📝 Log dans un fichier (optionnel)
    $logFile = __DIR__ . '/../../logs/silent-push.log';
    $logDir = dirname($logFile);
    if (!file_exists($logDir)) {
        mkdir($logDir, 0755, true);
    }
    file_put_contents(
        $logFile,
        "[" . date('Y-m-d H:i:s') . "] ✅ Envoi réussi (API v1) - Message ID: $messageId\n",
        FILE_APPEND
    );
} else {
    echo "❌ ÉCHEC DE L'ENVOI\n\n";
    echo "📊 DÉTAILS DE L'ERREUR :\n";
    echo "   • Code HTTP : $httpCode\n";
    echo "   • Erreur cURL : $curlError\n";
    echo "   • Réponse Firebase : $response\n";
    
    // Analyse des erreurs courantes
    if ($httpCode === 401 || $httpCode === 403) {
        echo "\n💡 DIAGNOSTIC : Problème d'authentification\n";
        echo "   → Vérifiez que firebase-service-account.json est correct\n";
        echo "   → Vérifiez que l'API Cloud Messaging v1 est activée dans Firebase\n";
    } elseif ($httpCode === 400) {
        echo "\n💡 DIAGNOSTIC : Requête mal formée\n";
        echo "   → Vérifiez le format de la notification\n";
    } elseif ($httpCode === 404) {
        echo "\n💡 DIAGNOSTIC : Projet ou topic introuvable\n";
        echo "   → Vérifiez le project_id dans firebase-service-account.json\n";
        echo "   → Vérifiez que le topic 'ios_notifications' existe\n";
    } elseif ($httpCode === 0) {
        echo "\n💡 DIAGNOSTIC : Problème de connexion réseau\n";
        echo "   → Vérifiez que le serveur peut accéder à fcm.googleapis.com\n";
    }
    
    // 📝 Log dans un fichier
    $logFile = __DIR__ . '/../../logs/silent-push.log';
    $logDir = dirname($logFile);
    if (!file_exists($logDir)) {
        mkdir($logDir, 0755, true);
    }
    file_put_contents(
        $logFile,
        "[" . date('Y-m-d H:i:s') . "] ❌ Échec (API v1) - HTTP $httpCode - $curlError\n",
        FILE_APPEND
    );
    
    exit(1);
}

$endTime = microtime(true);
$duration = round(($endTime - $startTime) * 1000);

echo "\n═══════════════════════════════════════════════════════════\n";
echo "⏱️  Durée totale : {$duration}ms\n";
echo "✅ CRON terminé avec succès\n";
echo "═══════════════════════════════════════════════════════════\n";

exit(0);

