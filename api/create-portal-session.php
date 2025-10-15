<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'config.php';
require_once __DIR__ . '/../vendor/autoload.php';

use Stripe\Stripe;
use Stripe\BillingPortal\Session;

// 🔍 Fonction de log personnalisée
function logDebug($message) {
    $logFile = __DIR__ . '/portal-debug.log';
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

try {
    // Récupérer les données de la requête
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);
    
    logDebug("🔍 [PORTAL] Requête reçue: " . $rawInput);
    
    // Configuration Stripe
    Stripe::setApiKey(STRIPE_SECRET_KEY);
    $customerId = $input['customer_id'] ?? null;
    $returnUrl = $input['return_url'] ?? 'https://myadhanapp.com';
    
    logDebug("🔍 [PORTAL] Customer ID reçu: " . ($customerId ?: 'NULL'));
    logDebug("🔍 [PORTAL] Return URL: " . $returnUrl);
    
    if (!$customerId) {
        logDebug("❌ [PORTAL] Erreur: Customer ID manquant");
        throw new Exception('Customer ID requis');
    }
    
    // Créer une session pour le Customer Portal
    logDebug("🔄 [PORTAL] Création de la session Stripe pour customer: " . $customerId);
    $session = Session::create([
        'customer' => $customerId,
        'return_url' => $returnUrl,
    ]);
    
    logDebug("✅ [PORTAL] Session créée avec succès: " . $session->url);
    
    echo json_encode([
        'success' => true,
        'url' => $session->url
    ]);
    
} catch (Exception $e) {
    logDebug("❌ [PORTAL] Erreur: " . $e->getMessage());
    logDebug("❌ [PORTAL] Trace: " . $e->getTraceAsString());
    
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?> 