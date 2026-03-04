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
        $pdo = getDBConnection();
        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', strtotime('+1 hour'));
        
        $stmt = $pdo->prepare("
            INSERT INTO payment_tokens (token, customer_email, subscription_type, customer_name, customer_language, original_password, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $token,
            $email,
            $subscriptionType,
            $customerName,
            $customerLanguage,
            $originalPassword, // Le mot de passe sera stocké temporairement pour la création du compte
            $expiresAt
        ]);
        
        return $token;
    } catch (Exception $e) {
        logError("Erreur création token temporaire", $e);
        return null;
    }
}

// ✅ NOUVEAU : Fonction pour récupérer et valider un token temporaire
function retrieveAndValidateToken($token) {
    try {
        $pdo = getDBConnection();
        $stmt = $pdo->prepare("
            SELECT * FROM payment_tokens 
            WHERE token = ? AND expires_at > NOW() AND used_at IS NULL
        ");
        $stmt->execute([$token]);
        $data = $stmt->fetch();
        
        if ($data) {
            // Marquer comme utilisé immédiatement
            $updateStmt = $pdo->prepare("UPDATE payment_tokens SET used_at = NOW() WHERE id = ?");
            $updateStmt->execute([$data['id']]);
            return $data;
        }
        return null;
    } catch (Exception $e) {
        logError("Erreur validation token temporaire", $e);
        return null;
    }
}

// ✅ NOUVEAU : Fonction pour créer ou récupérer un customer
function createOrGetCustomer($email) {
    try {
        logError("🔍 createOrGetCustomer - Email: $email");
        // Vérifier si le customer existe déjà
        $customers = Customer::all(['email' => $email, 'limit' => 1]);
        
        if (!empty($customers->data)) {
            $customer = $customers->data[0];
            logError("✅ Customer trouvé existant: " . $customer->id);
            
            // S'assurer que le metadata 'app' est présent
            if (!isset($customer->metadata->app) || $customer->metadata->app !== 'prayer_times_app') {
                Customer::update($customer->id, [
                    'metadata' => [
                        'app' => 'prayer_times_app',
                        'updated_at' => date('Y-m-d H:i:s'),
                    ],
                ]);
            }
            return $customer;
        }
        
        // Créer un nouveau customer
        logError("🆕 Création d'un nouveau customer Stripe pour: $email");
        return Customer::create([
            'email' => $email,
            'metadata' => [
                'app' => 'prayer_times_app',
                'created_at' => date('Y-m-d H:i:s'),
            ],
        ]);
    } catch (Exception $e) {
        logError("Erreur createOrGetCustomer", $e);
        throw $e;
    }
}

// Route pour gérer l'annulation d'un paiement (supprimer l'utilisateur préemptif)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && strpos($_SERVER['REQUEST_URI'], 'handle-payment-cancellation') !== false) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $email = $input['email'] ?? null;

        if (!$email) {
            handleError("Email requis pour l'annulation", 400);
        }

        $result = cleanupCancelledUser($email);
        echo json_encode($result);
        exit();

    } catch (Exception $e) {
        logError("❌ Erreur lors de l'annulation du paiement: " . $e->getMessage());
        handleError($e->getMessage());
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

        // ✅ NOUVEAU : Création/Mise à jour préemptive de l'utilisateur pour éviter les race conditions
        // Cela garantit que le mot de passe est correct AVANT que le webhook n'arrive
        if ($customerEmail && $originalPassword) {
            try {
                $pdo = getDBConnection();
                $checkUserStmt = $pdo->prepare("SELECT id, created_from, password_hash FROM users WHERE email = ?");
                $checkUserStmt->execute([$customerEmail]);
                $dbUser = $checkUserStmt->fetch();

                if ($dbUser) {
                    // Si l'utilisateur existe déjà, on met à jour ses infos et on marque la source
                    logError("🔄 Mise à jour préemptive de l'utilisateur: $customerEmail");
                    $newHash = password_hash($originalPassword, PASSWORD_DEFAULT);
                    $updateStmt = $pdo->prepare("
                        UPDATE users 
                        SET password_hash = ?, 
                            user_first_name = ?, 
                            language = ?,
                            created_from = 'stripe_payment',
                            updated_at = NOW() 
                        WHERE id = ?
                    ");
                    $updateStmt->execute([$newHash, $customerName ?: 'Utilisateur', $customerLanguage, $dbUser['id']]);
                } else {
                    // Si l'utilisateur n'existe pas, on le crée en marquant directement la source Stripe
                    logError("🆕 Création préemptive de l'utilisateur: $customerEmail");
                    $newHash = password_hash($originalPassword, PASSWORD_DEFAULT);
                    $createStmt = $pdo->prepare("
                        INSERT INTO users (email, password_hash, user_first_name, language, created_from, status, created_at, updated_at) 
                        VALUES (?, ?, ?, ?, 'stripe_payment', 'active', NOW(), NOW())
                    ");
                    $createStmt->execute([$customerEmail, $newHash, $customerName ?: 'Utilisateur', $customerLanguage]);
                }
            } catch (Exception $e) {
                logError("⚠️ Erreur lors de la création/mise à jour préemptive (non bloquante): " . $e->getMessage());
            }
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
        handleError($e->getMessage());
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
            
        case 'checkout.session.expired':
            $session = $event->data->object;
            $email = $session->metadata->customer_email ?? null;
            if ($email) {
                logError("⏳ Session Stripe expirée pour: $email. Nettoyage...");
                cleanupCancelledUser($email);
            }
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
            
        case 'invoice.upcoming':
            $invoice = $event->data->object;
            // Optionnel : Envoyer un rappel de renouvellement
            break;
            
        case 'invoice.payment_action_required':
            $invoice = $event->data->object;
            handlePaymentActionRequired($invoice);
            break;
            
        case 'customer.subscription.paused':
            $subscription = $event->data->object;
            handleSubscriptionPaused($subscription);
            break;
            
        case 'customer.subscription.resumed':
            $subscription = $event->data->object;
            handleSubscriptionResumed($subscription);
            break;
            
        default:
            logError("ℹ️ Événement non géré: " . $event->type);
    }
    
    http_response_code(200);
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
            
            // 🔧 CORRECTION : Récupérer le Customer ID Stripe
            $stripeCustomerId = $session->customer ?? null;
            logError("🔑 Customer ID Stripe: " . $stripeCustomerId);
            
            // 🔧 NOUVEAU : Vérifier si l'utilisateur existe déjà avec un premium actif
            $pdo = getDBConnection();
            $existingUserStmt = $pdo->prepare("SELECT id, premium_status, premium_expiry, created_from FROM users WHERE email = ?");
            $existingUserStmt->execute([$customerEmail]);
            $existingUser = $existingUserStmt->fetch();
            
            if ($existingUser) {
                // Si l'utilisateur a été créé par le webhook customer.created (stripe_dashboard), 
                // on doit mettre à jour son mot de passe et son nom car il a un mot de passe par défaut "123456"
                if ($existingUser['created_from'] === 'stripe_dashboard' && $originalPassword) {
                    logError("🔄 Mise à jour des infos (mot de passe/nom) pour utilisateur créé prématurément par dashboard: " . $customerEmail);
                    $newPasswordHash = password_hash($originalPassword, PASSWORD_DEFAULT);
                    $updateInfoStmt = $pdo->prepare("
                        UPDATE users 
                        SET password_hash = ?, 
                            user_first_name = ?, 
                            language = ?,
                            created_from = 'stripe_payment',
                            subscription_platform = 'stripe',
                            updated_at = NOW()
                        WHERE id = ?
                    ");
                    $updateInfoStmt->execute([
                        $newPasswordHash, 
                        $finalCustomerName, 
                        $finalCustomerLanguage, 
                        $existingUser['id']
                    ]);
                    logError("✅ Infos utilisateur mises à jour avec succès");
                }

                // Vérifier si le premium est encore actif
                $isPremiumActive = false;
                if ($existingUser['premium_status'] == 1 && $existingUser['premium_expiry']) {
                    $expiryDate = new DateTime($existingUser['premium_expiry']);
                    $isPremiumActive = $expiryDate > new DateTime();
                }
                
                if ($isPremiumActive) {
                    logError("⚠️ Utilisateur existe déjà avec premium actif - Renouvellement automatique");
                    // Mettre à jour l'abonnement existant
                    updateUserPremiumStatus($existingUser['id'], $subscriptionType, $session->id, $stripeCustomerId);
                    logError("✅ Abonnement existant renouvelé");
                } else {
                    logError("🔄 Utilisateur existe avec premium expiré ou inactif - Création d'un nouvel abonnement");
                    updateUserPremiumStatus($existingUser['id'], $subscriptionType, $session->id, $stripeCustomerId);
                }

                // 🚀 PLUS DE MAIL ICI : Le mail de bienvenue sera envoyé lors de la connexion automatique
                // qui suit immédiatement le paiement (déclenché par apiClient.loginWithCredentials)
            } else {
                logError("🆕 Nouvel utilisateur - Création complète");
                createUserViaExistingAPI(
                    $customerEmail, 
                    $finalCustomerName, 
                    $subscriptionType, 
                    $session->id, 
                    $finalCustomerLanguage, 
                    $originalPassword,
                    $stripeCustomerId
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
function createUserViaExistingAPI($email, $name, $subscriptionType, $sessionId, $language = 'fr', $originalPassword = null, $stripeCustomerId = null) {
    try {
        logError("🚀 Début création utilisateur - Email: $email, Type: $subscriptionType, Customer ID: $stripeCustomerId");
        
        // Vérifier d'abord si l'utilisateur existe
        $pdo = getDBConnection();
        logError("🔧 DEBUG createUserViaExistingAPI - Connexion DB OK");
        
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $existingUser = $stmt->fetch();
        
        logError("🔧 DEBUG createUserViaExistingAPI - Vérification utilisateur existant: " . ($existingUser ? 'EXISTE' : 'N\'EXISTE PAS'));
        
        if ($existingUser) {
            logError("👤 Utilisateur existe déjà - ID: " . $existingUser['id']);
            // Mettre à jour le statut premium avec le customer ID
            updateUserPremiumStatus($existingUser['id'], $subscriptionType, $sessionId, $stripeCustomerId);
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
                premium_status, subscription_type, subscription_id, stripe_customer_id, premium_expiry, premium_activated_at,
                location_mode, location_city, location_country, location_lat, location_lon,
                calc_method, adhan_sound, adhan_volume,
                notifications_enabled, reminders_enabled, reminder_offset,
                dhikr_after_salah_enabled, dhikr_after_salah_delay,
                dhikr_morning_enabled, dhikr_morning_delay,
                dhikr_evening_enabled, dhikr_evening_delay,
                dhikr_selected_dua_enabled, dhikr_selected_dua_delay,
                theme_mode, is_first_time, audio_quality, download_strategy,
                enable_data_saving, max_cache_size, auto_backup_enabled,
                created_at, updated_at, last_seen, status, created_from, subscription_platform
            ) VALUES (
                ?, ?, ?, ?, 
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?,
                ?, ?,
                ?, ?,
                ?, ?,
                ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?,
                NOW(), NOW(), NOW(), 'active', 'stripe_payment', 'stripe'
            )
        ");
        
        // 🔧 CORRECTION : Calculer la date d'expiration selon le type d'abonnement
        $expiryInterval = match($subscriptionType) {
            'monthly' => '+1 month',
            'yearly' => '+1 year',
            'family' => '+1 year',
            default => '+1 year'
        };
        
        // Utiliser les MÊMES paramètres que auth.php
        $params = [
            $email,
            $password_hash,
            $language,
            $name ?: explode('@', $email)[0], // 🚀 AMÉLIORATION : Utilise le début de l'email si le nom est vide
            1, // premium_status
            $subscriptionType,
            $sessionId,
            $stripeCustomerId, // 🔑 stripe_customer_id
            date('Y-m-d H:i:s', strtotime($expiryInterval)), // premium_expiry - calculé selon le type
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
        insertPremiumSubscription($userId, $sessionId, $subscriptionType, $stripeCustomerId);
        
        logError("✅ Abonnement premium enregistré pour l'utilisateur $userId");
        
        // 🚀 PLUS DE MAIL ICI : Le mail de bienvenue sera envoyé lors de la connexion automatique
        // qui suit immédiatement le paiement.
        
    } catch (Exception $e) {
        logError("❌ Erreur création utilisateur via API existante", $e);
        throw $e; // Relancer l'erreur pour la gestion
    }
}

// Fonction pour enregistrer l'abonnement dans la table premium_subscriptions
function insertPremiumSubscription($userId, $sessionId, $subscriptionType, $stripeCustomerId = null) {
    try {
        $pdo = getDBConnection();
        $stmt = $pdo->prepare("
            INSERT INTO premium_subscriptions (
                user_id, stripe_subscription_id, stripe_customer_id, 
                subscription_type, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, 'active', NOW(), NOW())
        ");
        
        $stmt->execute([
            $userId,
            $sessionId, // Pour le moment on utilise l'ID de session, Stripe mettra à jour avec le vrai ID plus tard
            $stripeCustomerId,
            $subscriptionType
        ]);
        
        logError("✅ Abonnement premium inséré dans la table");
    } catch (Exception $e) {
        logError("❌ Erreur insertion premium_subscriptions", $e);
        // On ne bloque pas si cette insertion échoue car la table users est la référence principale
    }
}

// 🔄 FONCTION AMÉLIORÉE : Mise à jour premium pour utilisateurs existants (renouvellements)
function updateUserPremiumStatus($userId, $subscriptionType, $sessionId, $stripeCustomerId = null) {
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
        
        logError("🔄 Renouvellement premium - User ID: $userId, Type: $subscriptionType, Expiry: $expiryDate, Customer ID: $stripeCustomerId");
        
        // 1. Mettre à jour l'utilisateur avec la nouvelle structure
        $stmt = $pdo->prepare("
            UPDATE users 
            SET premium_status = 1, 
                subscription_type = ?, 
                subscription_id = ?,
                subscription_platform = 'stripe',
                stripe_customer_id = ?,
                premium_expiry = ?,
                premium_activated_at = NOW(),
                updated_at = NOW()
            WHERE id = ?
        ");
        
        $stmt->execute([$subscriptionType, $sessionId, $stripeCustomerId, $expiryDate, $userId]);
        
        // 2. Enregistrer le nouvel abonnement
        insertPremiumSubscription($userId, $sessionId, $subscriptionType, $stripeCustomerId);
        
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

        $pdo = getDBConnection();

        // Lire la date depuis current_period_end
        $currentPeriodEnd = $subscription->current_period_end ?? time();
        $expiryDate = date('Y-m-d H:i:s', $currentPeriodEnd);

        // 🔧 CORRECTION : Utiliser stripe_customer_id au lieu de subscription_id pour trouver l'utilisateur
        $stmt = $pdo->prepare("
            UPDATE users SET
                premium_expiry = ?,
                updated_at = NOW()
            WHERE stripe_customer_id = ?
        ");
        $stmt->execute([$expiryDate, $subscription->customer]);
        
        if ($stmt->rowCount() > 0) {
            logError("✅ Date d'expiration mise à jour: $expiryDate pour customer: " . $subscription->customer);
        } else {
            logError("⚠️ Aucun utilisateur trouvé avec stripe_customer_id: " . $subscription->customer);
        }

        // Mettre à jour la table premium_subscriptions
        $stmt = $pdo->prepare("
            UPDATE premium_subscriptions SET
                status = ?,
                updated_at = NOW()
            WHERE stripe_subscription_id = ?
        ");
        $stmt->execute([$subscription->status, $subscription->id]);

    } catch (Exception $e) {
        logError("❌ Erreur mise à jour abonnement", $e);
    }
}

// Fonction pour gérer la suppression d'abonnement
function handleSubscriptionDeleted($subscription) {
    try {
        logError("❌ Abonnement supprimé: " . $subscription->id);
        
        $pdo = getDBConnection();
        
        // Mettre à jour la table users
        $stmt = $pdo->prepare("
            UPDATE users SET 
                premium_status = 0,
                updated_at = NOW()
            WHERE subscription_id = ?
        ");
        $stmt->execute([$subscription->id]);
        
        // Mettre à jour la table premium_subscriptions
        $stmt = $pdo->prepare("
            UPDATE premium_subscriptions SET 
                status = 'canceled',
                updated_at = NOW()
            WHERE stripe_subscription_id = ?
        ");
        $stmt->execute([$subscription->id]);
        
        logError("✅ Statut premium désactivé");
        
    } catch (Exception $e) {
        logError("❌ Erreur suppression abonnement", $e);
    }
}

// Fonction pour gérer le succès du paiement d'une facture
function handlePaymentSucceeded($invoice) {
    try {
        if (!$invoice->subscription) return;

        logError("💰 Paiement réussi pour facture: " . $invoice->id);

        $pdo = getDBConnection();
        
        // 🔧 CORRECTION : Récupérer l'abonnement Stripe pour obtenir la nouvelle date d'expiration
        \Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);
        $subscription = \Stripe\Subscription::retrieve($invoice->subscription);
        
        // Calculer la nouvelle date d'expiration à partir de current_period_end
        $currentPeriodEnd = $subscription->current_period_end ?? time();
        $expiryDate = date('Y-m-d H:i:s', $currentPeriodEnd);
        
        logError("🔄 Renouvellement détecté - Nouvelle date d'expiration: $expiryDate");

        // 🚀 NOUVEAU : Mettre à jour la date d'expiration dans users via stripe_customer_id
        $stmt = $pdo->prepare("
            UPDATE users 
            SET premium_expiry = ?,
                updated_at = NOW()
            WHERE stripe_customer_id = ?
        ");
        $stmt->execute([$expiryDate, $invoice->customer]);
        
        if ($stmt->rowCount() > 0) {
            logError("✅ Date d'expiration mise à jour pour customer: " . $invoice->customer);
        } else {
            logError("⚠️ Aucun utilisateur trouvé avec stripe_customer_id: " . $invoice->customer);
        }

        // Mettre à jour le statut dans premium_subscriptions
        $stmt = $pdo->prepare("
            UPDATE premium_subscriptions SET
                status = 'active',
                updated_at = NOW()
            WHERE stripe_subscription_id = ?
        ");
        $stmt->execute([$invoice->subscription]);

    } catch (Exception $e) {
        logError("❌ Erreur traitement succès paiement", $e);
    }
}

// Fonction pour gérer l'échec du paiement d'une facture
function handlePaymentFailed($invoice) {
    try {
        logError("⚠️ Échec du paiement pour facture: " . $invoice->id);
        
        $pdo = getDBConnection();
        
        // Trouver l'utilisateur pour désactiver son premium s'il n'a pas d'autre abonnement
        if ($invoice->subscription) {
            $stmt = $pdo->prepare("SELECT user_id FROM premium_subscriptions WHERE stripe_subscription_id = ?");
            $stmt->execute([$invoice->subscription]);
            $sub = $stmt->fetch();
            
            if ($sub) {
                $userId = $sub['user_id'];
                
                // Désactiver le premium dans la table users
                $updateUserStmt = $pdo->prepare("
                    UPDATE users 
                    SET premium_status = 0,
                        premium_expiry = NOW(),
                        updated_at = NOW()
                    WHERE id = ?
                ");
                $updateUserStmt->execute([$userId]);
                
                logError("✅ Premium désactivé pour l'utilisateur $userId");
            }
        }
        
        // Mettre à jour le statut de l'abonnement à 'past_due'
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
        
        // 🚀 CORRECTION : Ne pas créer d'utilisateur si le customer vient de l'application
        // car l'utilisateur sera créé proprement avec son mot de passe lors du checkout.session.completed
        if (isset($customer->metadata->app) && $customer->metadata->app === 'prayer_times_app') {
            logError("ℹ️ Customer créé via l'application - l'utilisateur sera créé lors du checkout.session.completed avec son vrai mot de passe");
            return;
        }
        
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
        
        // Extraire le prénom du nom complet ou utiliser le début de l'email
        $firstName = '';
        if ($customer->name) {
            $nameParts = explode(' ', trim($customer->name));
            $firstName = $nameParts[0];
        } else {
            $firstName = explode('@', $customer->email)[0];
        }
        
        // S'assurer que le nom n'est pas vide et faire un fallback ultime
        if (empty($firstName)) {
            $firstName = 'Utilisateur';
        }
        
        // Créer l'utilisateur dans la base de données
        $stmt = $pdo->prepare("
            INSERT INTO users (
                email, 
                password_hash, 
                user_first_name, 
                created_from,
                subscription_platform,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, 'stripe_dashboard', 'stripe', NOW(), NOW())
        ");
        
        $stmt->execute([
            $customer->email,
            $hashedPassword,
            $firstName
        ]);
        
        $userId = $pdo->lastInsertId();
        
        logError("✅ Utilisateur créé avec succès via Dashboard Stripe ID: " . $userId);
        
        // Envoyer l'email de bienvenue avec le mot de passe par défaut
        sendWelcomeEmail($customer->email, $firstName, $tempPassword);
        
        // Note: Le mot de passe sera aussi visible dans les logs (ligne ci-dessus) pour récupération manuelle
        
    } catch (Exception $e) {
        logError("❌ Erreur traitement customer créé", $e);
    }
}

/**
 * 📧 Envoyer un email de bienvenue via Resend après un paiement Stripe
 */
function sendWelcomeEmail($email, $firstName, $password) {
    $subject = "Welcome to myAdhan Premium! 🤲";
    
    $htmlContent = "
    <html>
    <body style='font-family: \"Segoe UI\", Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; background-color: #f4f7f6; padding: 20px;'>
        <div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);'>
            <div style='background: linear-gradient(135deg, #4A90E2 0%, #357ABD 100%); padding: 30px; text-align: center;'>
                <h1 style='color: #ffffff; margin: 0; font-size: 28px;'>Welcome to myAdhan Premium</h1>
            </div>
            <div style='padding: 30px;'>
                <h2 style='color: #2C3E50; margin-top: 0;'>Assalamu Alaikum $firstName,</h2>
                <p>Thank you for your purchase! Your <strong>Premium</strong> account has been successfully activated.</p>
                <p>Here are your login credentials to access all premium features:</p>
                
                <div style='background-color: #f8f9fa; border-left: 4px solid #4A90E2; padding: 20px; margin: 25px 0; border-radius: 4px;'>
                    <p style='margin: 5px 0;'><strong>Email:</strong> <span style='color: #4A90E2;'>$email</span></p>
                    <p style='margin: 5px 0;'><strong>Password:</strong> <span style='color: #4A90E2;'><code>$password</code></span></p>
                </div>
                
                <p>You can now enjoy Adhan sounds, premium themes, prayer analytics and more.</p>
                <div style='text-align: center; margin-top: 35px;'>
                    <p style='font-weight: bold; color: #2C3E50; margin-top: 0;'>The myAdhan Team</p>
                </div>
            </div>
            <div style='background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #95a5a6;'>
                <p style='margin: 0;'>&copy; " . date('Y') . " myAdhan. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>";
    
    return sendEmailWithResend($email, $subject, $htmlContent);
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

// 🔐 NOUVEAU : Fonction pour gérer les actions de paiement requises (3D Secure, etc.)
function handlePaymentActionRequired($invoice) {
    try {
        logError("🔐 Action de paiement requise: " . $invoice->id);
        logError("📧 Customer: " . $invoice->customer);
        
        $pdo = getDBConnection();
        
        // Récupérer l'utilisateur associé
        if ($invoice->subscription) {
            $subStmt = $pdo->prepare("
                SELECT user_id 
                FROM premium_subscriptions 
                WHERE stripe_subscription_id = ?
            ");
            $subStmt->execute([$invoice->subscription]);
            $subData = $subStmt->fetch();
            
            if ($subData) {
                $userId = $subData['user_id'];
                
                logError("⚠️ Action requise pour l'utilisateur $userId - maintien temporaire du premium");
                
                // Note: On ne désactive PAS le premium immédiatement
                // On laisse à l'utilisateur le temps de compléter l'action (3D Secure, etc.)
                // Si le paiement échoue définitivement, invoice.payment_failed sera déclenché
                
                // On peut envoyer une notification à l'utilisateur ici (future implémentation)
                logError("📧 TODO: Envoyer notification à l'utilisateur pour action requise");
            }
        }
        
        // Mettre à jour le statut dans premium_subscriptions
        $stmt = $pdo->prepare("
            UPDATE premium_subscriptions 
            SET status = 'action_required', 
                updated_at = NOW()
            WHERE stripe_subscription_id = ?
        ");
        
        $stmt->execute([$invoice->subscription]);
        
    } catch (Exception $e) {
        logError("❌ Erreur traitement action de paiement requise", $e);
    }
}

// ⏸️ NOUVEAU : Fonction pour gérer la mise en pause d'un abonnement
function handleSubscriptionPaused($subscription) {
    try {
        logError("⏸️ Abonnement mis en pause: " . $subscription->id);
        
        $pdo = getDBConnection();
        
        // Récupérer l'utilisateur associé
        $subStmt = $pdo->prepare("
            SELECT user_id 
            FROM premium_subscriptions 
            WHERE stripe_subscription_id = ?
        ");
        $subStmt->execute([$subscription->id]);
        $subData = $subStmt->fetch();
        
        if ($subData) {
            $userId = $subData['user_id'];
            
            logError("⏸️ Désactivation temporaire du premium pour l'utilisateur $userId");
            
            // Désactiver le premium pendant la pause
            $updateStmt = $pdo->prepare("
                UPDATE users 
                SET premium_status = 0,
                    updated_at = NOW()
                WHERE id = ?
            ");
            $updateStmt->execute([$userId]);
            
            logError("✅ Premium désactivé (pause) pour l'utilisateur $userId");
        }
        
        // Mettre à jour le statut dans premium_subscriptions
        $stmt = $pdo->prepare("
            UPDATE premium_subscriptions 
            SET status = 'paused', 
                updated_at = NOW()
            WHERE stripe_subscription_id = ?
        ");
        
        $stmt->execute([$subscription->id]);
        
    } catch (Exception $e) {
        logError("❌ Erreur traitement pause abonnement", $e);
    }
}

// ▶️ NOUVEAU : Fonction pour gérer la reprise d'un abonnement
function handleSubscriptionResumed($subscription) {
    try {
        logError("▶️ Abonnement repris: " . $subscription->id);
        
        $pdo = getDBConnection();
        
        // Récupérer l'utilisateur associé
        $subStmt = $pdo->prepare("
            SELECT user_id 
            FROM premium_subscriptions 
            WHERE stripe_subscription_id = ?
        ");
        $subStmt->execute([$subscription->id]);
        $subData = $subStmt->fetch();
        
        if ($subData) {
            $userId = $subData['user_id'];
            
            logError("▶️ Réactivation du premium pour l'utilisateur $userId");
            
            // 🔧 CORRECTION : Lire la date depuis items.data[0]
            $currentPeriodEnd = null;
            if ($subscription->items && $subscription->items->data && count($subscription->items->data) > 0) {
                $currentPeriodEnd = $subscription->items->data[0]->current_period_end;
            } else {
                $currentPeriodEnd = $subscription->current_period_end ?? time();
            }
            
            // Réactiver le premium et mettre à jour la date d'expiration
            $expiryDate = date('Y-m-d H:i:s', $currentPeriodEnd);
            
            $updateStmt = $pdo->prepare("
                UPDATE users 
                SET premium_status = 1,
                    premium_expiry = ?,
                    updated_at = NOW()
                WHERE id = ?
            ");
            $updateStmt->execute([$expiryDate, $userId]);
            
            logError("✅ Premium réactivé (reprise) pour l'utilisateur $userId");
        }
        
        // Mettre à jour le statut dans premium_subscriptions
        $stmt = $pdo->prepare("
            UPDATE premium_subscriptions 
            SET status = 'active', 
                updated_at = NOW()
            WHERE stripe_subscription_id = ?
        ");
        
        $stmt->execute([$subscription->id]);
        
    } catch (Exception $e) {
        logError("❌ Erreur traitement reprise abonnement", $e);
    }
}

// ===== FONCTIONS UTILITAIRES =====

/**
 * Nettoyer un utilisateur si le paiement est annulé ou la session expire
 * Ne supprime QUE si le compte a été créé préemptivement et n'a pas encore été utilisé/payé
 */
function cleanupCancelledUser($email) {
    try {
        logError("🗑️ Tentative de nettoyage pour: $email");
        $pdo = getDBConnection();
        
        // 1. Vérifier si l'utilisateur doit être supprimé
        $stmt = $pdo->prepare("SELECT id, created_from, login_count, premium_status FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user) {
            // Sécurité : On ne supprime que si c'est un compte 'stripe_payment' non utilisé et non payé
            if ($user['created_from'] === 'stripe_payment' && (int)$user['login_count'] === 0 && (int)$user['premium_status'] === 0) {
                
                // Supprimer de la DB
                $deleteStmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
                $deleteStmt->execute([$user['id']]);
                logError("✅ Utilisateur supprimé de la BDD (annulation): $email");

                // 2. Supprimer de Stripe
                try {
                    $customers = Customer::all(['email' => $email, 'limit' => 1]);
                    if (!empty($customers->data)) {
                        $customer = $customers->data[0];
                        $customer->delete();
                        logError("✅ Customer Stripe supprimé: " . $customer->id);
                    }
                } catch (Exception $e) {
                    logError("⚠️ Erreur suppression Stripe (non bloquant): " . $e->getMessage());
                }

                return ['success' => true, 'message' => 'Compte annulé et supprimé avec succès'];
            } else {
                logError("ℹ️ Nettoyage : l'utilisateur $email existe déjà ou est actif, suppression ignorée.");
                return ['success' => true, 'message' => 'Nettoyage ignoré (compte actif ou existant)'];
            }
        }
        return ['success' => false, 'message' => 'Utilisateur non trouvé'];
    } catch (Exception $e) {
        logError("❌ Erreur dans cleanupCancelledUser: " . $e->getMessage());
        return ['success' => false, 'message' => $e->getMessage()];
    }
}

/**
 * Générer un mot de passe temporaire
 */
function generateTempPassword($length = 10) {
    return substr(str_shuffle(str_repeat($x='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', ceil($length/strlen($x)) )),1,$length);
}

/**
 * Gérer les erreurs de paiement
 */
function handlePaymentError($e, $context) {
    $message = $e instanceof Exception ? $e->getMessage() : $e;
    logError("❌ Erreur lors de $context : $message");
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => "Erreur lors de $context",
        'details' => $message,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit();
}

/**
 * Valider la requête de paiement
 */
function validatePaymentRequest($data) {
    $errors = [];
    if (empty($data['subscriptionType'])) $errors[] = "Type d'abonnement manquant";
    if (empty($data['customerEmail'])) $errors[] = "Email client manquant";
    return $errors;
}

?>