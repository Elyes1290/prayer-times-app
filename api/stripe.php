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
require_once '../vendor/autoload.php';

use Stripe\Stripe;
use Stripe\PaymentIntent;
use Stripe\Subscription;
use Stripe\Customer;
use Stripe\Checkout\Session;
use Stripe\Exception\ApiErrorException;

// Configuration Stripe
// logError("🔑 DEBUG - STRIPE_SECRET_KEY définie: " . (STRIPE_SECRET_KEY ? 'OUI (' . substr(STRIPE_SECRET_KEY, 0, 7) . '...)' : 'NON'));
Stripe::setApiKey(STRIPE_SECRET_KEY);

// Configuration Stripe

// Configuration des produits premium
$PREMIUM_PRODUCTS = [
    'monthly' => [
        // 'price_id' => 'price_1RskBqDJEhmyFnElZtadHqsG', // Premium Mensuel (TEST)
        'price_id' => 'price_1RsTUJDYlp8PcvcNUQz2zTro', // Premium Mensuel (PROD)
        'amount' => 199,
        'currency' => 'eur',
        'interval' => 'month',
    ],
    'yearly' => [
        // 'price_id' => 'price_1RskCEDJEhmyFnElkaEs0I8O', // Premium Annuel (TEST)
        'price_id' => 'price_1RsTV3DYlp8PcvcNlOaFW2CW', // Premium Annuel (PROD)
        'amount' => 1999,
        'currency' => 'eur',
        'interval' => 'year',
    ],
    'family' => [
        // 'price_id' => 'price_1RskCeDJEhmyFnElSE6iVxi8', // Premium Familial (TEST)
        'price_id' => 'price_1RsTVXDYlp8PcvcNERdlWk9n', // Premium Familial (PROD)
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

// Fonction pour générer un mot de passe temporaire
function generateTempPassword($length = 12) {
    $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    $password = '';
    for ($i = 0; $i < $length; $i++) {
        $password .= $chars[rand(0, strlen($chars) - 1)];
    }
    return $password;
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

// Route pour créer une session Stripe Checkout
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_SERVER['REQUEST_URI'] === '/api/stripe.php/create-checkout-session') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['subscriptionType']) || !isset($PREMIUM_PRODUCTS[$input['subscriptionType']])) {
            http_response_code(400);
            echo json_encode(['error' => 'Type d\'abonnement invalide']);
            exit();
        }
        
        $subscriptionType = $input['subscriptionType'];
        $product = $PREMIUM_PRODUCTS[$subscriptionType];
        $customerEmail = $input['customerEmail'] ?? '';
        $customerName = $input['customerName'] ?? '';
        $customerLanguage = $input['customerLanguage'] ?? 'fr';
        $customerPassword = $input['customerPassword'] ?? null; // 🔑 RÉCUPÉRATION du mot de passe
        $successUrl = $input['successUrl'] ?? 'prayertimesapp://payment-success';
        $cancelUrl = $input['cancelUrl'] ?? 'prayertimesapp://payment-cancel';
        
        // Créer ou récupérer le customer
        $customer = null;
        if ($customerEmail) {
            $customer = createOrGetCustomer($customerEmail);
        }
        
        // Créer la session de checkout
        $sessionData = [
            'payment_method_types' => ['card'],
            'mode' => 'subscription',
            'line_items' => [[
                'price' => $product['price_id'],
                'quantity' => 1,
            ]],
            'success_url' => $successUrl,
            'cancel_url' => $cancelUrl,
            'metadata' => [
                'subscription_type' => $subscriptionType,
                'customer_email' => $customerEmail,
                'customer_name' => $customerName,
                'customer_language' => $customerLanguage,
                'customer_password' => $customerPassword, // 🔑 ENREGISTREMENT du mot de passe
                'app' => 'prayer_times_app',
            ],
        ];
        
        // Ajouter les informations du customer si disponibles
        if ($customer) {
            $sessionData['customer'] = $customer->id;
        } elseif ($customerEmail) {
            $sessionData['customer_email'] = $customerEmail;
        }
        
        $session = Session::create($sessionData);
        
        echo json_encode([
            'sessionUrl' => $session->url,
            'sessionId' => $session->id,
        ]);
        
    } catch (ApiErrorException $e) {
        logError("Erreur création session checkout", $e);
        http_response_code(400);
        echo json_encode(['error' => $e->getMessage()]);
    } catch (Exception $e) {
        logError("Erreur générale création session", $e);
        http_response_code(500);
        echo json_encode(['error' => 'Erreur interne du serveur']);
    }
}

// Route pour webhook Stripe (pour gérer les événements)
elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_SERVER['HTTP_STRIPE_SIGNATURE'])) {
    $payload = file_get_contents('php://input');
    $sigHeader = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';
    $endpointSecret = STRIPE_WEBHOOK_SECRET;
    
    try {
        $event = \Stripe\Webhook::constructEvent($payload, $sigHeader, $endpointSecret);
    } catch (Exception $e) {
        logError("Erreur webhook signature", $e);
        http_response_code(400);
        echo json_encode(['error' => 'Signature invalide: ' . $e->getMessage()]);
        exit();
    }
    
    // Traiter les événements
    switch ($event->type) {
        case 'checkout.session.completed':
            $session = $event->data->object;
            handleCheckoutSessionCompleted($session);
            break;
            
        case 'customer.subscription.created':
            $subscription = $event->data->object;
            handleSubscriptionCreated($subscription);
            break;
            
        case 'customer.subscription.updated':
            $subscription = $event->data->object;
            handleSubscriptionUpdated($subscription);
            break;
            
        case 'customer.subscription.deleted':
            $subscription = $event->data->object;
            handleSubscriptionDeleted($subscription);
            break;
            
        case 'invoice.payment_succeeded':
            $invoice = $event->data->object;
            handlePaymentSucceeded($invoice);
            break;
            
        case 'invoice.payment_failed':
            $invoice = $event->data->object;
            handlePaymentFailed($invoice);
            break;
            
        case 'customer.created':
            $customer = $event->data->object;
            handleCustomerCreated($customer);
            break;
            
        case 'customer.deleted':
            $customer = $event->data->object;
            handleCustomerDeleted($customer);
            break;
    }
    
    echo json_encode(['received' => true]);
}

// 🚀 NOUVEAU : Route pour forcer la création d'utilisateur depuis un customer Stripe existant
elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && $_SERVER['REQUEST_URI'] === '/api/stripe.php/create-user-from-customer') {
    try {
        Stripe::setApiKey(STRIPE_SECRET_KEY);
        
        $input = json_decode(file_get_contents('php://input'), true);
        $customerId = $input['customer_id'] ?? null;
        
        if (!$customerId) {
            http_response_code(400);
            echo json_encode(['error' => 'customer_id requis']);
            exit();
        }
        
        // Récupérer le customer depuis Stripe
        $customer = Customer::retrieve($customerId);
        
        if (!$customer) {
            http_response_code(404);
            echo json_encode(['error' => 'Customer non trouvé']);
            exit();
        }
        
        // Simuler l'événement customer.created
        handleCustomerCreated($customer);
        
        echo json_encode([
            'success' => true,
            'message' => 'Utilisateur créé avec succès',
            'customer_id' => $customerId,
            'email' => $customer->email
        ]);
        
    } catch (Exception $e) {
        logError("❌ Erreur création utilisateur depuis customer", $e);
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}



// Route pour créer un payment intent (ancienne approche)
elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && $_SERVER['REQUEST_URI'] === '/api/stripe/create-payment-intent') {
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
        $pdo = getDBConnection();
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
        $pdo = getDBConnection();
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

// Route de test GET pour vérifier que le fichier fonctionne
elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode([
        'status' => 'file_accessible',
        'message' => 'Le fichier stripe.php est accessible',
        'method' => $_SERVER['REQUEST_METHOD'],
        'uri' => $_SERVER['REQUEST_URI'],
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
// Route non trouvée
else {
    http_response_code(404);
    echo json_encode(['error' => 'Route non trouvée']);
}

// ===== FONCTIONS WEBHOOK =====

// Fonction pour gérer la session de checkout complétée
function handleCheckoutSessionCompleted($session) {
    try {
        // Récupérer les métadonnées de la session
        $subscriptionType = $session->metadata->subscription_type ?? '';
        $customerEmail = $session->metadata->customer_email ?? $session->customer_details->email ?? '';
        $customerName = $session->metadata->customer_name ?? $session->customer_details->name ?? '';
        $customerLanguage = $session->metadata->customer_language ?? 'fr';
        $customerPassword = $session->metadata->customer_password ?? null;
        
        // Si on n'a pas l'email depuis les métadonnées, essayer de le récupérer depuis le customer
        if (empty($customerEmail) && !empty($session->customer)) {
            try {
                $customer = Customer::retrieve($session->customer);
                $customerEmail = $customer->email;
                $customerName = $customer->name ?? $customerName;
            } catch (Exception $e) {
                logError("Erreur récupération customer", $e);
            }
        }
        
        // Créer le compte utilisateur si les données sont disponibles
        if ($customerEmail && $subscriptionType) {
            createUserViaExistingAPI($customerEmail, $customerName, $subscriptionType, $session->id, $customerLanguage, $customerPassword);
        }
        
    } catch (Exception $e) {
        logError("❌ Erreur traitement session checkout", $e);
    }
}

// Fonction pour créer un utilisateur via l'API existante qui fonctionne
function createUserViaExistingAPI($email, $name, $subscriptionType, $sessionId, $language = 'fr', $originalPassword = null) {
    try {
        // Vérifier d'abord si l'utilisateur existe
        $pdo = getDBConnection();
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $existingUser = $stmt->fetch();
        
        if ($existingUser) {
            // Mettre à jour le statut premium
            updateUserPremiumStatus($existingUser['id'], $subscriptionType, $sessionId);
            return;
        }
        
        // Utiliser le mot de passe original ou générer un temporaire
        if ($originalPassword) {
            $passwordToUse = $originalPassword;
        } else {
            $passwordToUse = generateTempPassword();
        }
        
        // Créer l'utilisateur directement avec le même code que auth.php
        $password_hash = password_hash($passwordToUse, PASSWORD_DEFAULT);
        
        $insertStmt = $pdo->prepare("
            INSERT INTO users (
                email, password_hash, language, user_first_name,
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
                created_at, updated_at, last_seen, status
            ) VALUES (
                ?, ?, ?, ?, 
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?,
                ?, ?,
                ?, ?,
                ?, ?,
                ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?,
                NOW(), NOW(), NOW(), 'active'
            )
        ");
        
        // Utiliser les MÊMES paramètres que auth.php
        $params = [
            $email,
            $password_hash,
            $language,
            $name ?: 'Utilisateur Premium',
            1, // premium_status
            $subscriptionType,
            $sessionId,
            date('Y-m-d H:i:s', strtotime('+1 year')), // premium_expiry
            date('Y-m-d H:i:s'), // premium_activated_at
            'auto', // location_mode
            null, // location_city
            null, // location_country
            null, // location_lat
            null, // location_lon
            'MuslimWorldLeague', // calc_method
            'misharyrachid', // adhan_sound
            1.0, // adhan_volume
            1, // notifications_enabled
            1, // reminders_enabled
            10, // reminder_offset
            1, // dhikr_after_salah_enabled
            5, // dhikr_after_salah_delay
            1, // dhikr_morning_enabled
            10, // dhikr_morning_delay
            1, // dhikr_evening_enabled
            10, // dhikr_evening_delay
            1, // dhikr_selected_dua_enabled
            15, // dhikr_selected_dua_delay
            'auto', // theme_mode
            1, // is_first_time
            'medium', // audio_quality
            'streaming_only', // download_strategy
            1, // enable_data_saving
            100, // max_cache_size
            0 // auto_backup_enabled
        ];
        
        $insertStmt->execute($params);
        
        $userId = $pdo->lastInsertId();
        
        // Enregistrer l'abonnement premium dans la table dédiée
        insertPremiumSubscription($userId, $sessionId, $subscriptionType);
        
    } catch (Exception $e) {
        logError("Erreur création utilisateur via API existante", $e);
    }
}

// Fonction pour enregistrer l'abonnement premium dans toutes les tables
function insertPremiumSubscription($userId, $sessionId, $subscriptionType) {
    try {
        $pdo = getDBConnection();
        
        // Calculer les données communes
        $expiryDate = match($subscriptionType) {
            'monthly' => date('Y-m-d H:i:s', strtotime('+1 month')),
            'yearly' => date('Y-m-d H:i:s', strtotime('+1 year')),
            'family' => date('Y-m-d H:i:s', strtotime('+1 year')),
            default => date('Y-m-d H:i:s', strtotime('+1 year'))
        };
        
        $amount = match($subscriptionType) {
            'monthly' => 199, // 1.99€ en centimes
            'yearly' => 1999, // 19.99€ en centimes  
            'family' => 2999, // 29.99€ en centimes
            default => 1999
        };
        
        // Insérer dans premium_subscriptions (gestion Stripe)
        $subscriptionStmt = $pdo->prepare("
            INSERT INTO premium_subscriptions (
                user_id, stripe_session_id, stripe_subscription_id, 
                subscription_type, status, start_date, end_date
            ) VALUES (?, ?, ?, ?, 'active', NOW(), ?)
        ");
        
        $subscriptionStmt->execute([
            $userId, $sessionId, $sessionId, $subscriptionType, $expiryDate
        ]);
        
        $subscriptionId = $pdo->lastInsertId();
        
        // Insérer dans premium_purchases (historique)
        $purchaseStmt = $pdo->prepare("
            INSERT INTO premium_purchases (
                user_id, subscription_type, subscription_id, premium_expiry,
                purchase_amount, currency, payment_method, transaction_id, status
            ) VALUES (?, ?, ?, ?, ?, 'EUR', 'stripe', ?, 'active')
        ");
        
        $purchaseStmt->execute([
            $userId, $subscriptionType, $sessionId, $expiryDate, 
            ($amount / 100), $sessionId // Montant en euros
        ]);
        
        $purchaseId = $pdo->lastInsertId();
        
        // Insérer dans premium_users (statut actuel)
        $features = json_encode([
            "prayer_analytics", "custom_adhan_sounds", "premium_themes", 
            "unlimited_bookmarks", "ad_free"
        ]);
        
        $userStmt = $pdo->prepare("
            INSERT INTO premium_users (
                user_id, subscription_id, purchase_id, is_active, premium_features
            ) VALUES (?, ?, ?, 1, ?)
            ON DUPLICATE KEY UPDATE 
                subscription_id = VALUES(subscription_id),
                purchase_id = VALUES(purchase_id),
                is_active = 1,
                premium_features = VALUES(premium_features),
                activated_at = NOW()
        ");
        
        $userStmt->execute([$userId, $subscriptionId, $purchaseId, $features]);
        
        // Insérer dans premium_payments (détail paiement)
        $paymentStmt = $pdo->prepare("
            INSERT INTO premium_payments (
                user_id, subscription_id, purchase_id, amount, currency, 
                status, payment_date
            ) VALUES (?, ?, ?, ?, 'EUR', 'succeeded', NOW())
        ");
        
        $paymentStmt->execute([$userId, $subscriptionId, $purchaseId, $amount]);
        
    } catch (Exception $e) {
        logError("Erreur insertion premium complète", $e);
    }
}

// Ancienne fonction supprimée - on utilise maintenant createUserViaExistingAPI()

// Fonction pour mettre à jour le statut premium d'un utilisateur existant
function updateUserPremiumStatus($userId, $subscriptionType, $sessionId) {
    try {
        $pdo = getDBConnection();
        
        // Mettre à jour l'utilisateur
        $stmt = $pdo->prepare("
            UPDATE users 
            SET is_premium = 1, 
                premium_type = ?, 
                premium_start_date = NOW(),
                updated_at = NOW()
            WHERE id = ?
        ");
        
        $stmt->execute([$subscriptionType, $userId]);
        
        // Enregistrer l'abonnement
        $stmt = $pdo->prepare("
            INSERT INTO premium_subscriptions (
                user_id,
                stripe_subscription_id,
                subscription_type,
                status,
                created_at
            ) VALUES (?, ?, ?, 'active', NOW())
        ");
        
        $stmt->execute([
            $userId,
            $sessionId,
            $subscriptionType
        ]);
        
        
    } catch (Exception $e) {
        logError("Erreur mise à jour statut premium", $e);
    }
}

// Fonction pour gérer la création d'abonnement
function handleSubscriptionCreated($subscription) {
    try {
        $pdo = getDBConnection();
        
        // Trouver l'abonnement via l'email du customer
        \Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);
        $customer = \Stripe\Customer::retrieve($subscription->customer);
        $customerEmail = $customer->email;
        
        // Trouver l'utilisateur par email
        $userStmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $userStmt->execute([$customerEmail]);
        $user = $userStmt->fetch();
        
        if ($user) {
            $userId = $user['id'];
            
            // Mettre à jour l'abonnement le plus récent de cet utilisateur
            $stmt = $pdo->prepare("
                UPDATE premium_subscriptions 
                SET stripe_subscription_id = ?, 
                    status = ?, 
                    updated_at = NOW()
                WHERE user_id = ? 
                AND stripe_subscription_id LIKE 'cs_%'
                ORDER BY created_at DESC 
                LIMIT 1
            ");
            
            $stmt->execute([
                $subscription->id,
                $subscription->status,
                $userId
            ]);
        }
        
    } catch (Exception $e) {
        logError("Erreur traitement création abonnement", $e);
    }
}

// Fonction pour gérer la mise à jour d'abonnement
function handleSubscriptionUpdated($subscription) {
    try {
        logError("🔄 Abonnement mis à jour: " . $subscription->id);
        logError("📦 Nouveau status: " . $subscription->status);
        
        // Mettre à jour le statut dans la base de données
        $pdo = getDBConnection();
        $stmt = $pdo->prepare("
            UPDATE premium_subscriptions 
            SET status = ?, 
                updated_at = NOW()
            WHERE stripe_subscription_id = ?
        ");
        
        $stmt->execute([$subscription->status, $subscription->id]);
        
    } catch (Exception $e) {
        logError("❌ Erreur traitement mise à jour abonnement", $e);
    }
}

// Fonction pour gérer la suppression d'abonnement
function handleSubscriptionDeleted($subscription) {
    try {
        logError("🗑️ Abonnement supprimé: " . $subscription->id);
        
        // Désactiver le premium pour l'utilisateur
        $pdo = getDBConnection();
        $stmt = $pdo->prepare("
            UPDATE users u
            JOIN premium_subscriptions ps ON u.id = ps.user_id
            SET u.is_premium = 0, 
                u.premium_end_date = NOW(),
                u.updated_at = NOW()
            WHERE ps.stripe_subscription_id = ?
        ");
        
        $stmt->execute([$subscription->id]);
        
        // Mettre à jour le statut de l'abonnement
        $stmt = $pdo->prepare("
            UPDATE premium_subscriptions 
            SET status = 'canceled', 
                updated_at = NOW()
            WHERE stripe_subscription_id = ?
        ");
        
        $stmt->execute([$subscription->id]);
        
    } catch (Exception $e) {
        logError("❌ Erreur traitement suppression abonnement", $e);
    }
}

// Fonction pour gérer le paiement réussi
function handlePaymentSucceeded($invoice) {
    try {
        logError("💰 Paiement réussi: " . $invoice->id);
        logError("📧 Customer: " . $invoice->customer);
        logError("💵 Montant: " . $invoice->amount_paid);
        
        // Mettre à jour le statut de paiement si nécessaire
        $pdo = getDBConnection();
        $stmt = $pdo->prepare("
            UPDATE premium_subscriptions 
            SET last_payment_date = NOW(), 
                updated_at = NOW()
            WHERE stripe_subscription_id = ?
        ");
        
        $stmt->execute([$invoice->subscription]);
        
    } catch (Exception $e) {
        logError("❌ Erreur traitement paiement réussi", $e);
    }
}

// Fonction pour gérer le paiement échoué
function handlePaymentFailed($invoice) {
    try {
        logError("❌ Paiement échoué: " . $invoice->id);
        logError("📧 Customer: " . $invoice->customer);
        
        // Mettre à jour le statut de paiement
        $pdo = getDBConnection();
        $stmt = $pdo->prepare("
            UPDATE premium_subscriptions 
            SET status = 'past_due', 
                updated_at = NOW()
            WHERE stripe_subscription_id = ?
        ");
        
        $stmt->execute([$invoice->subscription]);
        
    } catch (Exception $e) {
        logError("❌ Erreur traitement paiement échoué", $e);
    }
}

// 🚀 NOUVEAU : Fonction pour gérer la création de customer
function handleCustomerCreated($customer) {
    try {
        logError("🆕 Customer créé dans Stripe: " . $customer->id);
        logError("📧 Email: " . ($customer->email ?? 'N/A'));
        logError("👤 Nom: " . ($customer->name ?? 'N/A'));
        
        // 🚀 DEBUG : Vérifier la connexion DB
        logError("🔍 DEBUG - Test connexion DB...");
        $pdo = getDBConnection();
        logError("✅ Connexion DB réussie");
        
        if (!$customer->email) {
            logError("❌ Pas d'email - impossible de créer l'utilisateur");
            return;
        }
        
        $pdo = getDBConnection();
        
        // Vérifier si l'utilisateur existe déjà
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$customer->email]);
        $existingUser = $stmt->fetch();
        
        if ($existingUser) {
            logError("👤 Utilisateur existe déjà avec l'email: " . $customer->email);
            return;
        }
        
        // 🚀 NOUVEAU : Créer un utilisateur avec mot de passe fixe
        $tempPassword = '123456';
        $hashedPassword = password_hash($tempPassword, PASSWORD_DEFAULT);
        
        // Extraire le prénom du nom complet ou utiliser "Utilisateur"
        $firstName = 'Utilisateur';
        if ($customer->name) {
            $nameParts = explode(' ', trim($customer->name));
            $firstName = $nameParts[0];
        }
        
        // Créer l'utilisateur dans la base de données
        $stmt = $pdo->prepare("
            INSERT INTO users (
                email, 
                password_hash, 
                user_first_name, 
                stripe_customer_id,
                created_from,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, 'stripe_dashboard', NOW(), NOW())
        ");
        
        $stmt->execute([
            $customer->email,
            $hashedPassword,
            $firstName,
            $customer->id
        ]);
        
        $userId = $pdo->lastInsertId();
        
        logError("✅ Utilisateur créé depuis Stripe Dashboard - ID: " . $userId);
        logError("🔑 Mot de passe par défaut: 123456");
        logError("👤 Prénom: " . $firstName);
        
        // 🚀 NOUVEAU : Envoyer un email avec le mot de passe temporaire
        sendWelcomeEmail($customer->email, $firstName, $tempPassword);
        
        // Note: Le mot de passe sera aussi visible dans les logs (ligne ci-dessus) pour récupération manuelle
        
    } catch (Exception $e) {
        logError("❌ Erreur traitement customer créé", $e);
    }
}

// 🚀 NOUVEAU : Fonction pour envoyer un email de bienvenue avec mot de passe temporaire
function sendWelcomeEmail($email, $firstName, $tempPassword) {
    try {
        $subject = "Bienvenue dans Prayer Times - Votre compte a été créé";
        
        $message = "
        <html>
        <head>
            <title>Bienvenue dans Prayer Times</title>
        </head>
        <body>
            <h2>Assalamu Alaykum $firstName ! 🕌</h2>
            <p>Votre compte Prayer Times a été créé avec succès.</p>
            
            <div style='background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;'>
                <h3>🔑 Vos informations de connexion :</h3>
                <p><strong>Email :</strong> $email</p>
                <p><strong>Mot de passe :</strong> <code>$tempPassword</code></p>
            </div>
            
            <p><strong>Important :</strong></p>
            <ul>
                <li>✅ Connectez-vous dans l'application Prayer Times</li>
                <li>🔄 Changez votre mot de passe dans Paramètres → Compte</li>
                <li>🔒 Pour des raisons de sécurité, changez ce mot de passe dès votre première connexion</li>
            </ul>
            
            <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
            <p>Barakallahu fik ! 🤲</p>
            
            <hr>
            <p><small>Email automatique - Ne pas répondre</small></p>
        </body>
        </html>
        ";
        
        // Headers pour email HTML
        $headers = array(
            'MIME-Version' => '1.0',
            'Content-type' => 'text/html; charset=UTF-8',
            'From' => 'noreply@elyesnaitliman.ch',
            'Reply-To' => 'support@elyesnaitliman.ch',
            'X-Mailer' => 'PHP/' . phpversion()
        );
        
        // Convertir headers en string
        $headerString = '';
        foreach($headers as $key => $value) {
            $headerString .= "$key: $value\r\n";
        }
        
        // Envoyer l'email
        $sent = mail($email, $subject, $message, $headerString);
        
        if ($sent) {
            logError("📧 Email de bienvenue envoyé à: " . $email);
        } else {
            logError("❌ Échec envoi email à: " . $email);
        }
        
    } catch (Exception $e) {
        logError("❌ Erreur envoi email de bienvenue", $e);
    }
}

// 🚀 NOUVEAU : Fonction pour gérer la suppression de customer
function handleCustomerDeleted($customer) {
    try {
        logError("🗑️ Customer supprimé dans Stripe: " . $customer->id);
        logError("📧 Email: " . ($customer->email ?? 'N/A'));
        
        if (!$customer->email) {
            logError("❌ Pas d'email - impossible de supprimer l'utilisateur");
            return;
        }
        
        $pdo = getDBConnection();
        
        // Trouver l'utilisateur par email
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$customer->email]);
        $user = $stmt->fetch();
        
        if (!$user) {
            logError("❌ Utilisateur non trouvé avec l'email: " . $customer->email);
            return;
        }
        
        $userId = $user['id'];
        logError("👤 Utilisateur trouvé ID: " . $userId);
        
        // Supprimer en cascade (les clés étrangères s'occupent du reste)
        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        
        logError("✅ Utilisateur supprimé avec succès ID: " . $userId);
        
    } catch (Exception $e) {
        logError("❌ Erreur suppression customer", $e);
    }
}

?>