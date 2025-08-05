<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'config.php';
require_once 'vendor/autoload.php';

use Stripe\Stripe;
use Stripe\Customer;

// Configuration Stripe
Stripe::setApiKey(STRIPE_SECRET_KEY);

// Route de test GET
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode([
        'status' => 'webhook_test_ready',
        'message' => 'Endpoint de test webhook accessible',
        'timestamp' => date('Y-m-d H:i:s'),
        'stripe_key_configured' => !empty(STRIPE_SECRET_KEY),
        'webhook_secret_configured' => !empty(STRIPE_WEBHOOK_SECRET)
    ]);
    exit();
}

// Route de test POST pour simuler un webhook
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $testType = $input['test_type'] ?? 'checkout.session.completed';
        $customerEmail = $input['customer_email'] ?? 'test@example.com';
        $customerName = $input['customer_name'] ?? 'Test User';
        $subscriptionType = $input['subscription_type'] ?? 'monthly';
        
        // Créer un customer de test
        $customer = Customer::create([
            'email' => $customerEmail,
            'name' => $customerName,
            'metadata' => [
                'test' => 'true',
                'created_at' => date('Y-m-d H:i:s')
            ]
        ]);
        
        // Simuler un événement checkout.session.completed
        $mockSession = (object) [
            'id' => 'cs_test_' . uniqid(),
            'customer' => $customer->id,
            'metadata' => (object) [
                'subscription_type' => $subscriptionType,
                'customer_email' => $customerEmail,
                'customer_name' => $customerName,
                'customer_language' => 'fr',
                'customer_password' => 'test123',
                'app' => 'prayer_times_app'
            ],
            'customer_details' => (object) [
                'email' => $customerEmail,
                'name' => $customerName
            ]
        ];
        
        // Inclure la fonction de traitement
        require_once 'stripe.php';
        
        // Appeler la fonction de traitement
        handleCheckoutSessionCompleted($mockSession);
        
        echo json_encode([
            'success' => true,
            'message' => 'Test webhook exécuté avec succès',
            'customer_id' => $customer->id,
            'session_id' => $mockSession->id,
            'test_type' => $testType,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
}
?> 