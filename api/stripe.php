<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Gérer les requêtes OPTIONS pour CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'config.php';
require_once 'vendor/autoload.php';

use Stripe\Stripe;
use Stripe\PaymentIntent;
use Stripe\Subscription;
use Stripe\Customer;
use Stripe\Exception\ApiErrorException;

// Configuration Stripe
Stripe::setApiKey(STRIPE_SECRET_KEY);

// Configuration des produits premium
$PREMIUM_PRODUCTS = [
    'monthly' => [
        'price_id' => 'price_monthly_1_99',
        'amount' => 199,
        'currency' => 'eur',
        'interval' => 'month',
    ],
    'yearly' => [
        'price_id' => 'price_yearly_19_99',
        'amount' => 1999,
        'currency' => 'eur',
        'interval' => 'year',
    ],
    'family' => [
        'price_id' => 'price_family_29_99',
        'amount' => 2999,
        'currency' => 'eur',
        'interval' => 'year',
    ],
];

// Fonction pour logger les erreurs
function logError($message, $error = null) {
    error_log("Stripe API Error: " . $message);
    if ($error) {
        error_log("Stripe Error Details: " . json_encode($error));
    }
}

// Fonction pour créer un customer Stripe
function createOrGetCustomer($email) {
    try {
        // Vérifier si le customer existe déjà
        $customers = Customer::all(['email' => $email, 'limit' => 1]);
        
        if (!empty($customers->data)) {
            return $customers->data[0];
        }
        
        // Créer un nouveau customer
        return Customer::create([
            'email' => $email,
            'metadata' => [
                'app' => 'prayer_times_app',
                'created_at' => date('Y-m-d H:i:s'),
            ],
        ]);
    } catch (ApiErrorException $e) {
        logError("Erreur création customer", $e);
        throw $e;
    }
}

// Route pour créer un payment intent
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_SERVER['REQUEST_URI'] === '/api/stripe/create-payment-intent') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['subscriptionType']) || !isset($PREMIUM_PRODUCTS[$input['subscriptionType']])) {
            http_response_code(400);
            echo json_encode(['error' => 'Type d\'abonnement invalide']);
            exit();
        }
        
        $subscriptionType = $input['subscriptionType'];
        $product = $PREMIUM_PRODUCTS[$subscriptionType];
        $email = $input['email'] ?? 'user@example.com';
        
        // Créer ou récupérer le customer
        $customer = createOrGetCustomer($email);
        
        // Créer le payment intent
        $paymentIntent = PaymentIntent::create([
            'amount' => $product['amount'],
            'currency' => $product['currency'],
            'customer' => $customer->id,
            'metadata' => [
                'subscription_type' => $subscriptionType,
                'product_id' => $product['price_id'],
                'app' => 'prayer_times_app',
            ],
            'automatic_payment_methods' => [
                'enabled' => true,
            ],
        ]);
        
        echo json_encode([
            'clientSecret' => $paymentIntent->client_secret,
            'customerId' => $customer->id,
        ]);
        
    } catch (ApiErrorException $e) {
        logError("Erreur création payment intent", $e);
        http_response_code(400);
        echo json_encode(['error' => $e->getMessage()]);
    } catch (Exception $e) {
        logError("Erreur générale", $e);
        http_response_code(500);
        echo json_encode(['error' => 'Erreur interne du serveur']);
    }
}

// Route pour créer un abonnement
elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && $_SERVER['REQUEST_URI'] === '/api/stripe/create-subscription') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['subscriptionType']) || !isset($input['paymentMethodId'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Paramètres manquants']);
            exit();
        }
        
        $subscriptionType = $input['subscriptionType'];
        $paymentMethodId = $input['paymentMethodId'];
        $email = $input['email'] ?? 'user@example.com';
        
        if (!isset($PREMIUM_PRODUCTS[$subscriptionType])) {
            http_response_code(400);
            echo json_encode(['error' => 'Type d\'abonnement invalide']);
            exit();
        }
        
        $product = $PREMIUM_PRODUCTS[$subscriptionType];
        
        // Créer ou récupérer le customer
        $customer = createOrGetCustomer($email);
        
        // Attacher le payment method au customer
        $paymentMethod = \Stripe\PaymentMethod::retrieve($paymentMethodId);
        $paymentMethod->attach(['customer' => $customer->id]);
        
        // Définir comme payment method par défaut
        Customer::update($customer->id, [
            'invoice_settings' => [
                'default_payment_method' => $paymentMethodId,
            ],
        ]);
        
        // Créer l'abonnement
        $subscription = Subscription::create([
            'customer' => $customer->id,
            'items' => [
                ['price' => $product['price_id']],
            ],
            'payment_behavior' => 'default_incomplete',
            'payment_settings' => [
                'save_default_payment_method' => 'on_subscription',
            ],
            'expand' => ['latest_invoice.payment_intent'],
            'metadata' => [
                'subscription_type' => $subscriptionType,
                'app' => 'prayer_times_app',
                'created_at' => date('Y-m-d H:i:s'),
            ],
        ]);
        
        // Sauvegarder les informations d'abonnement dans la base de données
        $pdo = getDatabaseConnection();
        $stmt = $pdo->prepare("
            INSERT INTO premium_subscriptions (
                stripe_subscription_id,
                customer_id,
                subscription_type,
                status,
                current_period_start,
                current_period_end,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            $subscription->id,
            $customer->id,
            $subscriptionType,
            $subscription->status,
            date('Y-m-d H:i:s', $subscription->current_period_start),
            date('Y-m-d H:i:s', $subscription->current_period_end),
        ]);
        
        echo json_encode([
            'subscriptionId' => $subscription->id,
            'status' => $subscription->status,
            'customerId' => $customer->id,
        ]);
        
    } catch (ApiErrorException $e) {
        logError("Erreur création abonnement", $e);
        http_response_code(400);
        echo json_encode(['error' => $e->getMessage()]);
    } catch (Exception $e) {
        logError("Erreur générale création abonnement", $e);
        http_response_code(500);
        echo json_encode(['error' => 'Erreur interne du serveur']);
    }
}

// Route pour annuler un abonnement
elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && $_SERVER['REQUEST_URI'] === '/api/stripe/cancel-subscription') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['subscriptionId'])) {
            http_response_code(400);
            echo json_encode(['error' => 'ID d\'abonnement manquant']);
            exit();
        }
        
        $subscriptionId = $input['subscriptionId'];
        
        // Annuler l'abonnement à la fin de la période
        $subscription = Subscription::update($subscriptionId, [
            'cancel_at_period_end' => true,
        ]);
        
        // Mettre à jour le statut dans la base de données
        $pdo = getDatabaseConnection();
        $stmt = $pdo->prepare("
            UPDATE premium_subscriptions 
            SET status = ?, updated_at = NOW()
            WHERE stripe_subscription_id = ?
        ");
        
        $stmt->execute(['canceled', $subscriptionId]);
        
        echo json_encode([
            'success' => true,
            'subscriptionId' => $subscriptionId,
            'cancelAtPeriodEnd' => true,
        ]);
        
    } catch (ApiErrorException $e) {
        logError("Erreur annulation abonnement", $e);
        http_response_code(400);
        echo json_encode(['error' => $e->getMessage()]);
    } catch (Exception $e) {
        logError("Erreur générale annulation", $e);
        http_response_code(500);
        echo json_encode(['error' => 'Erreur interne du serveur']);
    }
}

// Route pour récupérer les détails d'un abonnement
elseif ($_SERVER['REQUEST_METHOD'] === 'GET' && preg_match('/\/api\/stripe\/subscription\/(.+)/', $_SERVER['REQUEST_URI'], $matches)) {
    try {
        $subscriptionId = $matches[1];
        
        $subscription = Subscription::retrieve($subscriptionId);
        
        echo json_encode([
            'id' => $subscription->id,
            'status' => $subscription->status,
            'currentPeriodStart' => date('Y-m-d H:i:s', $subscription->current_period_start),
            'currentPeriodEnd' => date('Y-m-d H:i:s', $subscription->current_period_end),
            'cancelAtPeriodEnd' => $subscription->cancel_at_period_end,
            'customerId' => $subscription->customer,
        ]);
        
    } catch (ApiErrorException $e) {
        logError("Erreur récupération abonnement", $e);
        http_response_code(400);
        echo json_encode(['error' => $e->getMessage()]);
    } catch (Exception $e) {
        logError("Erreur générale récupération", $e);
        http_response_code(500);
        echo json_encode(['error' => 'Erreur interne du serveur']);
    }
}

// Route pour webhook Stripe (pour gérer les événements)
elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && $_SERVER['REQUEST_URI'] === '/api/stripe/webhook') {
    $payload = file_get_contents('php://input');
    $sigHeader = $_SERVER['HTTP_STRIPE_SIGNATURE'];
    $endpointSecret = STRIPE_WEBHOOK_SECRET;
    
    try {
        $event = \Stripe\Webhook::constructEvent($payload, $sigHeader, $endpointSecret);
    } catch (Exception $e) {
        logError("Erreur webhook signature", $e);
        http_response_code(400);
        echo json_encode(['error' => 'Signature invalide']);
        exit();
    }
    
    // Traiter les événements
    switch ($event->type) {
        case 'customer.subscription.created':
            $subscription = $event->data->object;
            logError("Abonnement créé: " . $subscription->id);
            break;
            
        case 'customer.subscription.updated':
            $subscription = $event->data->object;
            logError("Abonnement mis à jour: " . $subscription->id);
            break;
            
        case 'customer.subscription.deleted':
            $subscription = $event->data->object;
            logError("Abonnement supprimé: " . $subscription->id);
            break;
            
        case 'invoice.payment_succeeded':
            $invoice = $event->data->object;
            logError("Paiement réussi: " . $invoice->id);
            break;
            
        case 'invoice.payment_failed':
            $invoice = $event->data->object;
            logError("Paiement échoué: " . $invoice->id);
            break;
    }
    
    echo json_encode(['received' => true]);
}

// Route non trouvée
else {
    http_response_code(404);
    echo json_encode(['error' => 'Route non trouvée']);
}
?> 