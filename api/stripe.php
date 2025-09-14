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

// 🛡️ PHASE 1 : Rate Limiting et Monitoring
require_once 'rate-limiter-new.php';
require_once 'monitoring.php';
require_once '../vendor/autoload.php';

use Stripe\Stripe;
use Stripe\PaymentIntent;
use Stripe\Subscription;
use Stripe\Customer;
use Stripe\Checkout\Session;
use Stripe\Exception\ApiErrorException;

// Configuration Stripe
Stripe::setApiKey(STRIPE_SECRET_KEY);

// Configuration des produits premium - MODE TEST TEMPORAIRE 🧪
$PREMIUM_PRODUCTS = [
    'monthly' => [
        // 'price_id' => 'price_1RskBqDJEhmyFnElZtadHqsG', // Premium Mensuel (TEST) 🧪
        'price_id' => 'price_1RsTUJDYlp8PcvcNUQz2zTro', // Premium Mensuel (PROD)
        'amount' => 199,
        'currency' => 'eur',
        'interval' => 'month',
    ],
    'yearly' => [
        // 'price_id' => 'price_1RskCEDJEhmyFnElkaEs0I8O', // Premium Annuel (TEST) 🧪
        'price_id' => 'price_1RsTV3DYlp8PcvcNlOaFW2CW', // Premium Annuel (PROD)
        'amount' => 1999,
        'currency' => 'eur',
        'interval' => 'year',
    ],
    'family' => [
        // 'price_id' => 'price_1RskCeDJEhmyFnElSE6iVxi8', // Premium Familial (TEST) 🧪
        'price_id' => 'price_1RsTVXDYlp8PcvcNERdlWk9n', // Premium Familial (PROD)
        'amount' => 2999,
        'currency' => 'eur',
        'interval' => 'year',
    ],
];

// ✅ NOUVEAU : Fonction pour créer un token temporaire sécurisé
function createTemporaryToken($email, $subscriptionType, $customerName = '', $customerLanguage = 'fr', $originalPassword = null) {
    try {
        logError("🔧 DEBUG createTemporaryToken - Début avec email: $email, type: $subscriptionType");
        
        $pdo = getDBConnection();
        
        // Générer un token sécurisé
        $token = bin2hex(random_bytes(32));
        $expiry = date('Y-m-d H:i:s', time() + 3600); // Expire dans 1 heure
        
        logError("🔧 DEBUG createTemporaryToken - Token généré: $token");
        logError("🔧 DEBUG createTemporaryToken - Expiry: $expiry");
        
        // Chiffrer le mot de passe si fourni
        $encryptedPassword = null;
        if ($originalPassword) {
            $encryptedPassword = openssl_encrypt(
                $originalPassword,
                'AES-256-CBC',
                getenv('ENCRYPTION_KEY') ?: hash('sha256', STRIPE_SECRET_KEY),
                0,
                substr(hash('sha256', STRIPE_SECRET_KEY), 0, 16)
            );
            logError("🔧 DEBUG createTemporaryToken - Mot de passe chiffré: " . ($encryptedPassword ? 'OUI' : 'NON'));
        }
        
        // Insérer le token temporaire
        $stmt = $pdo->prepare("
            INSERT INTO temp_payment_tokens (
                token, email, subscription_type, customer_name, 
                customer_language, encrypted_password, expires_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        
        $result = $stmt->execute([
            $token, $email, $subscriptionType, $customerName,
            $customerLanguage, $encryptedPassword, $expiry
        ]);
        
        logError("🔧 DEBUG createTemporaryToken - Insertion réussie: " . ($result ? 'OUI' : 'NON'));
        logError("🔧 DEBUG createTemporaryToken - Token final: $token");
        
        return $token;
        
    } catch (Exception $e) {
        logError("❌ Erreur création token temporaire", $e);
        logError("❌ Détails erreur: " . $e->getMessage());
        throw new Exception("Impossible de créer le token de paiement");
    }
}

// ✅ NOUVEAU : Fonction pour récupérer et valider un token
function retrieveAndValidateToken($token) {
    try {
        logError("🔧 DEBUG retrieveAndValidateToken - Début avec token: $token");
        
        $pdo = getDBConnection();
        
        // Récupérer le token
        $stmt = $pdo->prepare("
            SELECT * FROM temp_payment_tokens 
            WHERE token = ? AND expires_at > NOW() AND used = 0
        ");
        $stmt->execute([$token]);
        $tokenData = $stmt->fetch();
        
        logError("🔧 DEBUG retrieveAndValidateToken - Token trouvé: " . ($tokenData ? 'OUI' : 'NON'));
        
        if (!$tokenData) {
            logError("❌ DEBUG retrieveAndValidateToken - Token invalide ou expiré");
            throw new Exception("Token invalide ou expiré");
        }
        
        logError("🔧 DEBUG retrieveAndValidateToken - Email: " . $tokenData['email'] . ", Type: " . $tokenData['subscription_type']);
        
        // Marquer le token comme utilisé
        $stmt = $pdo->prepare("UPDATE temp_payment_tokens SET used = 1 WHERE token = ?");
        $stmt->execute([$token]);
        
        logError("🔧 DEBUG retrieveAndValidateToken - Token marqué comme utilisé");
        
        // Déchiffrer le mot de passe si présent
        $originalPassword = null;
        if ($tokenData['encrypted_password']) {
            $originalPassword = openssl_decrypt(
                $tokenData['encrypted_password'],
                'AES-256-CBC',
                getenv('ENCRYPTION_KEY') ?: hash('sha256', STRIPE_SECRET_KEY),
                0,
                substr(hash('sha256', STRIPE_SECRET_KEY), 0, 16)
            );
            logError("🔧 DEBUG retrieveAndValidateToken - Mot de passe déchiffré: " . ($originalPassword ? 'OUI' : 'NON'));
        }
        
        $result = [
            'email' => $tokenData['email'],
            'subscription_type' => $tokenData['subscription_type'],
            'customer_name' => $tokenData['customer_name'],
            'customer_language' => $tokenData['customer_language'],
            'original_password' => $originalPassword
        ];
        
        logError("🔧 DEBUG retrieveAndValidateToken - Résultat: " . json_encode($result));
        
        return $result;
        
    } catch (Exception $e) {
        logError("❌ Erreur validation token", $e);
        logError("❌ Détails erreur: " . $e->getMessage());
        throw new Exception("Token invalide");
    }
}

// ✅ NOUVEAU : Fonction de validation renforcée
function validatePaymentRequest($input) {
    global $PREMIUM_PRODUCTS;
    $errors = [];
    
    // 🔍 DEBUG TEMPORAIRE : Logs pour diagnostiquer
    error_log("🔍 DEBUG validatePaymentRequest - Input reçu: " . json_encode($input));
    error_log("🔍 DEBUG validatePaymentRequest - PREMIUM_PRODUCTS: " . json_encode($PREMIUM_PRODUCTS));
    error_log("🔍 DEBUG validatePaymentRequest - subscriptionType: " . ($input['subscriptionType'] ?? 'NULL'));
    error_log("🔍 DEBUG validatePaymentRequest - Existe dans PREMIUM_PRODUCTS: " . (isset($PREMIUM_PRODUCTS[$input['subscriptionType']]) ? 'OUI' : 'NON'));
    
    // Validation du type d'abonnement
    if (!isset($input['subscriptionType'])) {
        $errors[] = 'Type d\'abonnement requis';
    } elseif (!isset($PREMIUM_PRODUCTS[$input['subscriptionType']])) {
        $errors[] = 'Type d\'abonnement invalide';
    }
    
    // Validation de l'email
    if (!isset($input['customerEmail']) || empty($input['customerEmail'])) {
        $errors[] = 'Email requis';
    } elseif (!filter_var($input['customerEmail'], FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Format d\'email invalide';
    }
    
    // Validation du nom (optionnel mais si fourni, doit être valide)
    if (isset($input['customerName']) && !empty($input['customerName'])) {
        if (strlen($input['customerName']) < 2 || strlen($input['customerName']) > 100) {
            $errors[] = 'Le nom doit contenir entre 2 et 100 caractères';
        }
        if (!preg_match('/^[a-zA-ZÀ-ÿ\s\-\.]+$/', $input['customerName'])) {
            $errors[] = 'Le nom contient des caractères non autorisés';
        }
    }
    
    // Validation de la langue
    if (isset($input['customerLanguage'])) {
        $allowedLanguages = ['fr', 'en', 'ar', 'bn', 'de'];
        if (!in_array($input['customerLanguage'], $allowedLanguages)) {
            $errors[] = 'Langue non supportée';
        }
    }
    
    // Validation du mot de passe (optionnel mais si fourni, doit être sécurisé)
    if (isset($input['customerPassword']) && !empty($input['customerPassword'])) {
        if (strlen($input['customerPassword']) < 8) {
            $errors[] = 'Le mot de passe doit contenir au moins 8 caractères';
        }
        if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/', $input['customerPassword'])) {
            $errors[] = 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre';
        }
    }
    
    return $errors;
}

// ✅ NOUVEAU : Fonction de gestion d'erreur améliorée
function handlePaymentError($error, $context = '') {
    $errorCode = 500;
    $errorMessage = 'Erreur interne du serveur';
    $logMessage = "Erreur paiement [$context]: " . $error->getMessage();
    
    if ($error instanceof ApiErrorException) {
        $errorCode = 400;
        $errorMessage = 'Erreur de paiement: ' . $error->getMessage();
        
        // Logs détaillés pour Stripe
        logError($logMessage, $error);
    } elseif ($error instanceof PDOException) {
        $errorCode = 500;
        $errorMessage = 'Erreur de base de données';
        logError($logMessage, $error);
    } elseif ($error instanceof Exception) {
        $errorCode = 400;
        $errorMessage = $error->getMessage();
        logError($logMessage, $error);
    }
    
    http_response_code($errorCode);
    echo json_encode([
        'success' => false,
        'error' => $errorMessage,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit();
}

// Fonction pour logger les erreurs
function logError($message, $error = null) {
    $logData = [
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s'),
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
    ];
    
    if ($error) {
        $logData['error_type'] = get_class($error);
        $logData['error_message'] = $error->getMessage();
        $logData['error_code'] = $error->getCode();
        $logData['error_file'] = $error->getFile();
        $logData['error_line'] = $error->getLine();
    }
    
    error_log("Stripe API Error: " . json_encode($logData));
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
// ✅ SÉCURISÉ : Route pour créer une session de checkout
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_SERVER['HTTP_STRIPE_SIGNATURE']) === false && (
    $_SERVER['REQUEST_URI'] === '/api/stripe.php/create-checkout-session' || 
    $_SERVER['REQUEST_URI'] === '/api/stripe.php' || 
    $_SERVER['REQUEST_URI'] === '/api/stripe.php/' ||
    strpos($_SERVER['REQUEST_URI'], 'create-checkout-session') !== false
)) {
    try {
        $startTime = microtime(true);
        $input = json_decode(file_get_contents('php://input'), true);
        
        // 🛡️ PHASE 1 : Rate Limiting et Monitoring
        $pdo = getDBConnection();
        require_once 'rate-limiter-new.php';
        $rateLimiter = new RateLimiterNew($pdo);
        $monitor = new PaymentMonitor($pdo);
        
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
        $rateLimitResult = $rateLimiter->checkRateLimit($ip, 'payment_attempt', 5, 3600, $userAgent);
        
        if (!$rateLimitResult['allowed']) {
            $monitor->logPaymentEvent('payment_attempt', 'error', 'Rate limit exceeded', $rateLimitResult);
            http_response_code(429);
            
            // ✅ AMÉLIORÉ : Message d'erreur plus clair et utile
            $remainingTime = '';
            if (isset($rateLimitResult['remaining_seconds'])) {
                $minutes = ceil($rateLimitResult['remaining_seconds'] / 60);
                $remainingTime = " Vous pouvez réessayer dans $minutes minute" . ($minutes > 1 ? 's' : '') . ".";
            }
            
            echo json_encode([
                'success' => false,
                'error' => 'Limite de tentatives de paiement atteinte.' . $remainingTime . ' Pour des raisons de sécurité, veuillez attendre ou utiliser un autre appareil.',
                'details' => $rateLimitResult,
                'timestamp' => date('Y-m-d H:i:s'),
                'user_friendly' => true
            ]);
            exit();
        }
        
        // ✅ NOUVEAU : Log du rate limit sans réponse JSON
        logError("🔧 DEBUG Rate limit OK - IP: $ip, Tentatives: " . $rateLimitResult['attempts']);
        
        // ✅ NOUVEAU : Validation renforcée - Seulement si les données sont présentes ET pas un webhook
        $isWebhook = !empty($_SERVER['HTTP_STRIPE_SIGNATURE']);
        
        if (!$isWebhook && !empty($input['subscriptionType']) && !empty($input['customerEmail'])) {
            $validationErrors = validatePaymentRequest($input);
            if (!empty($validationErrors)) {
                $monitor->logPaymentEvent('payment_validation', 'error', 'Validation failed', $validationErrors);
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Données invalides',
                    'details' => $validationErrors,
                    'timestamp' => date('Y-m-d H:i:s')
                ]);
                exit();
            }
        } else {
            logError("🔧 DEBUG - Webhook ou données manquantes, validation ignorée");
        }
        
        $subscriptionType = $input['subscriptionType'];
        $product = $PREMIUM_PRODUCTS[$subscriptionType];
        $customerEmail = $input['customerEmail'];
        $customerName = $input['customerName'] ?? '';
        $customerLanguage = $input['customerLanguage'] ?? 'fr';
        $originalPassword = $input['customerPassword'] ?? null;
        $successUrl = $input['successUrl'] ?? 'prayertimesapp://payment-success';
        $cancelUrl = $input['cancelUrl'] ?? 'prayertimesapp://payment-cancel';
        
        // ✅ NOUVEAU : Vérification que les données sont complètes - Seulement pour les requêtes normales
        $isWebhook = !empty($_SERVER['HTTP_STRIPE_SIGNATURE']);
        
        if (!$isWebhook && (empty($customerEmail) || empty($subscriptionType))) {
            logError("❌ Données manquantes - Email: " . ($customerEmail ? 'OK' : 'MANQUANT') . ", Type: " . ($subscriptionType ? 'OK' : 'MANQUANT'));
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Données manquantes',
                'timestamp' => date('Y-m-d H:i:s')
            ]);
            exit();
        }
        
        // ✅ NOUVEAU : Créer un token temporaire sécurisé au lieu de stocker le mot de passe
        logError("🔧 DEBUG Route - Avant création token - Email: $customerEmail, Type: $subscriptionType");
        $temporaryToken = createTemporaryToken(
            $customerEmail, 
            $subscriptionType, 
            $customerName, 
            $customerLanguage, 
            $originalPassword
        );
        logError("🔧 DEBUG Route - Token créé: $temporaryToken");
        
        // Créer ou récupérer le customer
        $customer = null;
        if ($customerEmail) {
            $customer = createOrGetCustomer($customerEmail);
        }
        
        // ✅ SÉCURISÉ : Créer la session de checkout sans données sensibles
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
                'payment_token' => $temporaryToken, // ✅ SÉCURISÉ : Token au lieu du mot de passe
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
        
        $responseTime = round((microtime(true) - $startTime) * 1000);
        
        // ✅ NOUVEAU : Log du monitoring sans réponse JSON
        logError("🔧 DEBUG Monitoring - Session créée - ID: " . $session->id . ", Type: $subscriptionType, Email: $customerEmail, Temps: ${responseTime}ms");
        
        echo json_encode([
            'success' => true,
            'sessionUrl' => $session->url,
            'sessionId' => $session->id,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        
    } catch (ApiErrorException $e) {
        $responseTime = round((microtime(true) - $startTime) * 1000);
        $monitor->logPaymentEvent('payment_session_error', 'error', 'Erreur Stripe API', [
            'error' => $e->getMessage(),
            'subscription_type' => $subscriptionType ?? 'unknown'
        ], $responseTime);
        handlePaymentError($e, 'création session checkout');
    } catch (Exception $e) {
        $responseTime = round((microtime(true) - $startTime) * 1000);
        $monitor->logPaymentEvent('payment_session_error', 'error', 'Erreur générale', [
            'error' => $e->getMessage(),
            'subscription_type' => $subscriptionType ?? 'unknown'
        ], $responseTime);
        handlePaymentError($e, 'création session checkout');
    }
}

// Route pour webhook Stripe (pour gérer les événements)
elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_SERVER['HTTP_STRIPE_SIGNATURE'])) {
    $payload = file_get_contents('php://input');
    $sigHeader = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';
    $endpointSecret = STRIPE_WEBHOOK_SECRET;
    
    // 🔧 CORRECTION : Vérifier que le webhook secret est défini
    if (empty($endpointSecret)) {
        logError("❌ STRIPE_WEBHOOK_SECRET non défini dans les variables d'environnement");
        http_response_code(500);
        echo json_encode(['error' => 'Configuration webhook manquante']);
        exit();
    }
    
    try {
        $event = \Stripe\Webhook::constructEvent($payload, $sigHeader, $endpointSecret);
        logError("✅ Webhook Stripe validé avec succès - Type: " . $event->type);
    } catch (Exception $e) {
        logError("❌ Erreur webhook signature: " . $e->getMessage());
        logError("❌ Payload reçu: " . substr($payload, 0, 200) . "...");
        logError("❌ Signature header: " . $sigHeader);
        logError("❌ Endpoint secret défini: " . (empty($endpointSecret) ? 'NON' : 'OUI'));
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
// ✅ SÉCURISÉ : Route pour créer un payment intent
elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && $_SERVER['REQUEST_URI'] === '/api/stripe/create-payment-intent') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        // ✅ NOUVEAU : Validation renforcée
        if (!isset($input['subscriptionType']) || !isset($PREMIUM_PRODUCTS[$input['subscriptionType']])) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Type d\'abonnement invalide',
                'timestamp' => date('Y-m-d H:i:s')
            ]);
            exit();
        }
        
        // ✅ NOUVEAU : Validation de l'email
        if (!isset($input['email']) || !filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Email invalide',
                'timestamp' => date('Y-m-d H:i:s')
            ]);
            exit();
        }
        
        $subscriptionType = $input['subscriptionType'];
        $product = $PREMIUM_PRODUCTS[$subscriptionType];
        $email = $input['email'];
        
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
            'success' => true,
            'clientSecret' => $paymentIntent->client_secret,
            'customerId' => $customer->id,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        
    } catch (ApiErrorException $e) {
        handlePaymentError($e, 'création payment intent');
    } catch (Exception $e) {
        handlePaymentError($e, 'création payment intent');
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

// ✅ SÉCURISÉ : Fonction pour gérer la session de checkout complétée
function handleCheckoutSessionCompleted($session) {
    try {
        logError("🎯 Traitement session checkout complétée - ID: " . $session->id);
        
        // ✅ NOUVEAU : Récupérer les métadonnées de la session
        $subscriptionType = $session->metadata->subscription_type ?? '';
        $customerEmail = $session->metadata->customer_email ?? $session->customer_details->email ?? '';
        $customerName = $session->metadata->customer_name ?? $session->customer_details->name ?? '';
        $customerLanguage = $session->metadata->customer_language ?? 'fr';
        $paymentToken = $session->metadata->payment_token ?? null; // ✅ SÉCURISÉ : Token au lieu du mot de passe
        
        logError("📧 Email: $customerEmail, Nom: $customerName, Type: $subscriptionType, Token: $paymentToken");
        
        // Si on n'a pas l'email depuis les métadonnées, essayer de le récupérer depuis le customer
        if (empty($customerEmail) && !empty($session->customer)) {
            try {
                $customer = Customer::retrieve($session->customer);
                $customerEmail = $customer->email;
                $customerName = $customer->name ?? $customerName;
                logError("🔍 Email récupéré depuis customer: $customerEmail");
            } catch (Exception $e) {
                logError("❌ Erreur récupération customer", $e);
            }
        }
        
        // ✅ NOUVEAU : Récupérer et valider le token de paiement
        $tokenData = null;
        if ($paymentToken) {
            try {
                logError("🔧 DEBUG handleCheckoutSessionCompleted - Avant retrieveAndValidateToken");
                $tokenData = retrieveAndValidateToken($paymentToken);
                logError("✅ Token validé avec succès");
            } catch (Exception $e) {
                logError("❌ Erreur validation token: " . $e->getMessage());
                // Continuer sans les données du token
            }
        } else {
            logError("❌ Pas de payment_token dans les métadonnées");
        }
        
        // Créer le compte utilisateur si les données sont disponibles
        if ($customerEmail && $subscriptionType) {
            logError("✅ Données complètes - création utilisateur...");
            
            // ✅ SÉCURISÉ : Utiliser les données du token si disponibles
            $originalPassword = $tokenData['original_password'] ?? null;
            $finalCustomerName = $tokenData['customer_name'] ?? $customerName;
            $finalCustomerLanguage = $tokenData['customer_language'] ?? $customerLanguage;
            
            // 🔧 NOUVEAU : Vérifier si l'utilisateur existe déjà avec un premium actif
            $pdo = getDBConnection();
            $existingUserStmt = $pdo->prepare("SELECT id, premium_status, premium_expiry FROM users WHERE email = ?");
            $existingUserStmt->execute([$customerEmail]);
            $existingUser = $existingUserStmt->fetch();
            
            if ($existingUser) {
                // Vérifier si le premium est encore actif
                $isPremiumActive = false;
                if ($existingUser['premium_status'] == 1 && $existingUser['premium_expiry']) {
                    $expiryDate = new DateTime($existingUser['premium_expiry']);
                    $isPremiumActive = $expiryDate > new DateTime();
                }
                
                if ($isPremiumActive) {
                    logError("⚠️ Utilisateur existe déjà avec premium actif - Renouvellement automatique");
                    // Mettre à jour l'abonnement existant
                    updateUserPremiumStatus($existingUser['id'], $subscriptionType, $session->id);
                    logError("✅ Abonnement existant renouvelé");
                } else {
                    logError("🔄 Utilisateur existe avec premium expiré - Création d'un nouvel abonnement");
                    // Continuer avec la création normale
                    createUserViaExistingAPI(
                        $customerEmail, 
                        $finalCustomerName, 
                        $subscriptionType, 
                        $session->id, 
                        $finalCustomerLanguage, 
                        $originalPassword
                    );
                }
            } else {
                logError("🆕 Nouvel utilisateur - Création complète");
                createUserViaExistingAPI(
                    $customerEmail, 
                    $finalCustomerName, 
                    $subscriptionType, 
                    $session->id, 
                    $finalCustomerLanguage, 
                    $originalPassword
                );
            }
            
            logError("✅ Processus utilisateur terminé");
        } else {
            logError("❌ Données manquantes - Email: " . ($customerEmail ? 'OK' : 'MANQUANT') . ", Type: " . ($subscriptionType ? 'OK' : 'MANQUANT'));
        }
        
    } catch (Exception $e) {
        logError("❌ Erreur traitement session checkout", $e);
        logError("❌ Détails erreur: " . $e->getMessage());
    }
}

// Fonction pour créer un utilisateur via l'API existante qui fonctionne
function createUserViaExistingAPI($email, $name, $subscriptionType, $sessionId, $language = 'fr', $originalPassword = null) {
    try {
        logError("🚀 Début création utilisateur - Email: $email, Type: $subscriptionType");
        
        // Vérifier d'abord si l'utilisateur existe
        $pdo = getDBConnection();
        logError("🔧 DEBUG createUserViaExistingAPI - Connexion DB OK");
        
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $existingUser = $stmt->fetch();
        
        logError("🔧 DEBUG createUserViaExistingAPI - Vérification utilisateur existant: " . ($existingUser ? 'EXISTE' : 'N\'EXISTE PAS'));
        
        if ($existingUser) {
            logError("👤 Utilisateur existe déjà - ID: " . $existingUser['id']);
            // Mettre à jour le statut premium
            updateUserPremiumStatus($existingUser['id'], $subscriptionType, $sessionId);
            return;
        }
        
        // Utiliser le mot de passe original ou générer un temporaire
        if ($originalPassword) {
            $passwordToUse = $originalPassword;
            logError("🔑 Utilisation mot de passe original");
        } else {
            $passwordToUse = generateTempPassword();
            logError("🔑 Génération mot de passe temporaire: $passwordToUse");
        }
        
        logError("🔧 DEBUG createUserViaExistingAPI - Avant hash du mot de passe");
        
        // Créer l'utilisateur directement avec le même code que auth.php
        $password_hash = password_hash($passwordToUse, PASSWORD_DEFAULT);
        
        logError("🔧 DEBUG createUserViaExistingAPI - Mot de passe hashé, préparation requête INSERT");
        
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
        
        logError("🔧 DEBUG createUserViaExistingAPI - Avant exécution INSERT");
        $insertStmt->execute($params);
        
        $userId = $pdo->lastInsertId();
        
        logError("✅ Utilisateur créé avec succès - ID: $userId, Email: $email");
        
        // Enregistrer l'abonnement premium dans la table dédiée
        insertPremiumSubscription($userId, $sessionId, $subscriptionType);
        
        logError("✅ Abonnement premium enregistré pour l'utilisateur $userId");
        
        // 🚀 NOUVEAU : Envoyer un email de bienvenue
        if ($originalPassword) {
            sendWelcomeEmail($email, $name ?: 'Utilisateur', $originalPassword);
        }
        
    } catch (Exception $e) {
        logError("❌ Erreur création utilisateur via API existante", $e);
        throw $e; // Relancer l'erreur pour la gestion
    }
}

// ✅ SÉCURISÉ : Fonction pour enregistrer l'abonnement premium dans toutes les tables
function insertPremiumSubscription($userId, $sessionId, $subscriptionType) {
    $pdo = getDBConnection();
    
    // ✅ NOUVEAU : Démarrer une transaction pour garantir la cohérence
    $pdo->beginTransaction();
    
    try {
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
        
        // ✅ NOUVEAU : Validation des données avant insertion
        if (!$userId || !$sessionId || !$subscriptionType) {
            throw new Exception("Données manquantes pour l'insertion premium");
        }
        
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
        
        // ✅ NOUVEAU : Valider la transaction
        $pdo->commit();
        
        logError("✅ Transaction premium réussie pour l'utilisateur $userId");
        
    } catch (Exception $e) {
        // ✅ NOUVEAU : Rollback en cas d'erreur
        $pdo->rollBack();
        logError("❌ Erreur insertion premium - rollback effectué", $e);
        throw $e; // Relancer l'erreur pour la gestion
    }
}

// Ancienne fonction supprimée - on utilise maintenant createUserViaExistingAPI()

// 🔄 FONCTION AMÉLIORÉE : Mise à jour premium pour utilisateurs existants (renouvellements)
function updateUserPremiumStatus($userId, $subscriptionType, $sessionId) {
    try {
        $pdo = getDBConnection();
        $pdo->beginTransaction();
        
        // Calculer la nouvelle date d'expiration
        $expiryDate = match($subscriptionType) {
            'monthly' => date('Y-m-d H:i:s', strtotime('+1 month')),
            'yearly' => date('Y-m-d H:i:s', strtotime('+1 year')),
            'family' => date('Y-m-d H:i:s', strtotime('+1 year')),
            default => date('Y-m-d H:i:s', strtotime('+1 year'))
        };
        
        logError("🔄 Renouvellement premium - User ID: $userId, Type: $subscriptionType, Expiry: $expiryDate");
        
        // 1. Mettre à jour l'utilisateur avec la nouvelle structure
        $stmt = $pdo->prepare("
            UPDATE users 
            SET premium_status = 1, 
                subscription_type = ?, 
                subscription_id = ?,
                premium_expiry = ?,
                premium_activated_at = NOW(),
                updated_at = NOW()
            WHERE id = ?
        ");
        
        $stmt->execute([$subscriptionType, $sessionId, $expiryDate, $userId]);
        
        // 2. Enregistrer le nouvel abonnement
        insertPremiumSubscription($userId, $sessionId, $subscriptionType);
        
        $pdo->commit();
        logError("✅ Renouvellement premium réussi pour l'utilisateur $userId");
        
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        logError("❌ Erreur renouvellement premium", $e);
        throw $e;
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
            SET u.premium_status = 0, 
                u.premium_expiry = NOW(),
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
            'From' => 'noreply@myadhanapp.com',
            'Reply-To' => 'support@myadhanapp.com',
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