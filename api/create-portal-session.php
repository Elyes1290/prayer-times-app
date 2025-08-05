<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'config.php';
require_once 'vendor/autoload.php';

use Stripe\Stripe;
use Stripe\BillingPortal\Session;

try {
    // Configuration Stripe
    Stripe::setApiKey(STRIPE_SECRET_KEY);
    
    // Récupérer les données de la requête
    $input = json_decode(file_get_contents('php://input'), true);
    $customerId = $input['customer_id'] ?? null;
    $returnUrl = $input['return_url'] ?? 'https://myadhanapp.com';
    
    if (!$customerId) {
        throw new Exception('Customer ID requis');
    }
    
    // Créer une session pour le Customer Portal
    $session = Session::create([
        'customer' => $customerId,
        'return_url' => $returnUrl,
    ]);
    
    echo json_encode([
        'success' => true,
        'url' => $session->url
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?> 