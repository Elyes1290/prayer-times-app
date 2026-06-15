<?php
/**
 * API Authentification - Prayer Times App
 * Gestion connexion, inscription, migration Firebase
 */

require_once 'config.php';
// 🚀 CORRECTION : Supprimer l'inclusion de users.php qui cause un conflit de routage
// require_once 'users.php'; // ❌ SUPPRIMÉ - Cause un conflit de routage

// 🛡️ NOUVEAU : Rate Limiting pour auth.php
require_once 'rate-limiter-new.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = getRequestData();

try {
    switch ($method) {
        case 'POST':
            $action = $data['action'] ?? '';
            switch ($action) {
                case 'login':
                    handleLogin();
                    break;
                case 'refresh':
                    handleRefresh();
                    break;
                case 'register':
                    handleRegister();
                    break;
                case 'add_password':
                    handleAddPassword();
                    break;
                case 'change_password':
                    handleChangePassword();
                    break;
                case 'migrate_firebase':
                    handleMigrateFirebase();
                    break;
                default:
                    handleError("Action non supportée", 400);
            }
            break;
        case 'GET':
            $action = $_GET['action'] ?? '';
            if ($action === 'check_email') {
                handleCheckEmail();
            } else {
                handleVerifyAuth();
            }
            break;
        default:
            handleError("Méthode non supportée", 405);
    }
} catch (Exception $e) {
    error_log("AUTH API ERROR: " . $e->getMessage() . " | File: " . $e->getFile() . " | Line: " . $e->getLine());
    error_log("AUTH REQUEST DATA: " . json_encode($data));
    handleError("Erreur dans l'API auth: " . $e->getMessage(), 500, [
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'request_data' => $data
    ]);
}

/**
 * POST /api/auth.php {"action": "login", "email": "xxx", "password": "xxx"}
 * 🚀 ADAPTÉ : Gestion du mot de passe et structure simplifiée
 */
function handleLogin() {
    global $data;
    
    // 🛡️ NOUVEAU : Rate Limiting pour login
    $pdo = getDBConnection();
    $rateLimiter = new RateLimiterNew($pdo);
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
    
    $rateLimitResult = $rateLimiter->checkRateLimit($ip, 'auth_login', 10, 3600, $userAgent);
    if (!$rateLimitResult['allowed']) {
        http_response_code(429);
        echo json_encode([
            'success' => false,
            'error' => 'Trop de tentatives de connexion - veuillez patienter',
            'details' => $rateLimitResult,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit();
    }
    
    error_log("handleLogin() called with data: " . json_encode($data));
    
    $email = $data['email'] ?? null;
    $password = $data['password'] ?? null;
    
    if (!$email) {
        handleError("email requis", 400);
    }
    
    if (!$password) {
        handleError("Mot de passe requis pour la connexion", 400);
    }
    
    $pdo = getDBConnection();
    
    // 🚀 ADAPTÉ : Rechercher l'utilisateur par email (obligatoire pour la connexion)
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if (!$user) {
        // Utilisateur non trouvé - suggérer l'inscription
        jsonResponse(false, [
            'should_register' => true,
            'suggested_email' => $email
        ], "Utilisateur non trouvé, inscription requise", 404);
    }
    
    // 🚀 ADAPTÉ : Vérifier le mot de passe (obligatoire)
    if (!$user['password_hash']) {
        handleError("Ce compte n'a pas de mot de passe configuré. Veuillez vous inscrire.", 401);
    }
    
    if (!password_verify($password, $user['password_hash'])) {
        // 🚀 DEBUG : Identifier si c'est un utilisateur Dashboard Stripe avec le mot de passe par défaut
        if ($user['created_from'] === 'stripe_dashboard') {
            error_log("⚠️ [AUTH] Login échoué pour utilisateur Dashboard - mot de passe probablement encore à '123456'");
        }
        handleError("Mot de passe incorrect", 401);
    }
    
    // 🚀 ADAPTÉ : Mettre à jour les statistiques de connexion
    // On le fait une seule fois ici de manière robuste
    $updateStmt = $pdo->prepare("
        UPDATE users SET 
            last_seen = NOW(), 
            last_login = NOW(),
            login_count = login_count + 1,
            updated_at = NOW()
        WHERE id = ?
    ");
    $updateStmt->execute([$user['id']]);
    
    // On recharge l'utilisateur IMMÉDIATEMENT après l'update pour avoir le bon login_count
    $userStmt = $pdo->prepare("
        SELECT u.*, ps.stripe_customer_id 
        FROM users u
        LEFT JOIN premium_subscriptions ps ON u.id = ps.user_id AND ps.status = 'active'
        WHERE u.id = ?
    ");
    $userStmt->execute([$user['id']]);
    $user = $userStmt->fetch(PDO::FETCH_ASSOC);

    // Single-device: révoquer d'abord les anciennes sessions et refresh tokens,
    // puis émettre de nouveaux tokens (évite d'invalider le token fraîchement créé)
    $deviceId = $data['device_id'] ?? null;
    revokeAllRefreshTokensForUser($user['id']);
    revokeAllSessionsForUser($user['id']);
    $accessToken = generateAuthToken($user['id']);
    $refreshTtlDays = getRefreshTokenTtlDaysForUserRecord($user);
    $refreshToken = createRefreshToken($user['id'], $deviceId, $refreshTtlDays);
    $formattedUser = formatUserData($user);

    // 📧 Envoyer le mail de bienvenue UNIQUEMENT lors de la toute première connexion (login_count == 1 après update)
    try {
        if (function_exists('curl_init') && (int)$user['login_count'] === 1) {
            sendLoginEmail($user['email'], $user['user_first_name'] ?: 'Utilisateur', $password);
            error_log("📧 Mail de bienvenue envoyé pour la première connexion (count=1) de: " . $user['email']);
        }
    } catch (Exception $e) {
        error_log("📧 Erreur non bloquante envoi mail login: " . $e->getMessage());
    }

    jsonResponse(true, [
        'user' => $formattedUser,
        'token' => $accessToken,
        'auth_token' => $accessToken,
        'refresh_token' => $refreshToken,
        'login_method' => 'email',
        'has_password' => !empty($user['password_hash'])
    ], "Connexion réussie");
}

/**
 * POST /api/auth.php {"action": "register", "email": "xxx", "password": "xxx", "user_first_name": "xxx"}
 * 🚀 ADAPTÉ : Gestion du mot de passe et structure simplifiée
 */
function handleRegister() {
    global $data;
    
    // 🛡️ NOUVEAU : Rate Limiting pour register
    $pdo = getDBConnection();
    $rateLimiter = new RateLimiterNew($pdo);
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
    
    $rateLimitResult = $rateLimiter->checkRateLimit($ip, 'auth_register', 5, 3600, $userAgent);
    if (!$rateLimitResult['allowed']) {
        http_response_code(429);
        echo json_encode([
            'success' => false,
            'error' => 'Trop de tentatives d\'inscription - veuillez patienter',
            'details' => $rateLimitResult,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit();
    }
    
    $email = $data['email'] ?? null;
    $password = $data['password'] ?? null;
    $user_first_name = $data['user_first_name'] ?? null;
    $language = $data['language'] ?? 'fr';
    
    if (!$email) {
        handleError("email requis", 400);
    }
    
    // 🚀 ADAPTÉ : Validation du mot de passe (obligatoire)
    if (!$password) {
        handleError("Mot de passe requis pour l'inscription", 400);
    }
    
    // 🚀 NOUVEAU : Critères de mot de passe stricts
    if (strlen($password) < 8) {
        handleError("Le mot de passe doit contenir au moins 8 caractères", 400);
    }
    
    // Vérifier les critères de complexité
    if (!preg_match('/[a-z]/', $password)) {
        handleError("Le mot de passe doit contenir au moins une lettre minuscule", 400);
    }
    
    if (!preg_match('/[A-Z]/', $password)) {
        handleError("Le mot de passe doit contenir au moins une lettre majuscule", 400);
    }
    
    if (!preg_match('/\d/', $password)) {
        handleError("Le mot de passe doit contenir au moins un chiffre", 400);
    }
    
    if (!preg_match('/[^a-zA-Z\d]/', $password)) {
        handleError("Le mot de passe doit contenir au moins un caractère spécial", 400);
    }
    
    $pdo = getDBConnection();
    
    // 🚀 ADAPTÉ : Vérifier si l'utilisateur existe déjà par email
    $checkStmt = $pdo->prepare("SELECT id, email FROM users WHERE email = ?");
    $checkStmt->execute([$email]);
    $existingUser = $checkStmt->fetch();
    
    if ($existingUser) {
        handleError("Un compte existe déjà avec cet email", 409);
    }
    
    // 🚀 ADAPTÉ : Hasher le mot de passe
    $password_hash = password_hash($password, PASSWORD_DEFAULT);
    
    // 🚀 ADAPTÉ : Gestion du statut premium
    $premium_status = isset($data['premium_status']) ? (int)$data['premium_status'] : 0;
    $subscription_type = $data['subscription_type'] ?? null;
    $subscription_id = $data['subscription_id'] ?? null;
    $premium_expiry = $data['premium_expiry'] ?? null;

    // Si des données premium sont transmises, forcer le statut premium
    if ($premium_status === 1 || $subscription_type || $subscription_id) {
        $premium_status = 1;
        $subscription_type = $subscription_type ?? 'yearly';
        $subscription_id = $subscription_id ?? "premium-" . time();
        $premium_expiry = $premium_expiry ?? date('Y-m-d H:i:s', strtotime('+1 year'));
    }

    // 🚀 CORRECTION : Forcer le premium si on est en mode test
    if (isset($data['premium_status']) && $data['premium_status'] == 1) {
        $premium_status = 1;
        $subscription_type = $data['subscription_type'] ?? 'yearly';
        $subscription_id = $subscription_id ?? "premium-" . time();
        $premium_expiry = $premium_expiry ?? date('Y-m-d H:i:s', strtotime('+1 year'));
    }

    // 🚀 ADAPTÉ : Récupérer les données de localisation transmises
    $location_mode = $data['location_mode'] ?? 'auto';
    $location_city = $data['location_city'] ?? null;
    $location_country = $data['location_country'] ?? null;
    $location_lat = $data['location_lat'] ?? null;
    $location_lon = $data['location_lon'] ?? null;

    // Logger les données reçues dans un fichier
    $logMessage = date('Y-m-d H:i:s') . " - 📍 Données de localisation reçues: mode=$location_mode, city=$location_city, lat=$location_lat, lon=$location_lon\n";
    $logMessage .= date('Y-m-d H:i:s') . " - 📊 Données premium reçues: status=$premium_status, type=$subscription_type, id=$subscription_id, expiry=$premium_expiry\n";
    $logMessage .= date('Y-m-d H:i:s') . " - 🔐 Données d'inscription: has_email=" . (!empty($email)) . ", has_password=" . (!empty($password)) . ", has_name=" . (!empty($user_first_name)) . "\n";
    $logMessage .= date('Y-m-d H:i:s') . " - 📋 Données complètes reçues: " . json_encode($data) . "\n";
    $logMessage .= date('Y-m-d H:i:s') . " - 🔍 Premium status brut: " . ($data['premium_status'] ?? 'non défini') . "\n";
    $logMessage .= date('Y-m-d H:i:s') . " - 🔍 Premium status traité: $premium_status\n";
    file_put_contents(__DIR__ . '/debug_premium.log', $logMessage, FILE_APPEND);
    
    // Logger aussi dans les logs système
    error_log("📍 Données de localisation reçues: mode=$location_mode, city=$location_city, lat=$location_lat, lon=$location_lon");
    error_log("📊 Données premium reçues: status=$premium_status, type=$subscription_type, id=$subscription_id, expiry=$premium_expiry");
    error_log("🔐 Données d'inscription: has_email=" . (!empty($email)) . ", has_password=" . (!empty($password)) . ", has_name=" . (!empty($user_first_name)));
    error_log("📋 Données complètes reçues: " . json_encode($data));
    
    // 🚀 ADAPTÉ : Créer le nouvel utilisateur avec mot de passe
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
            created_at, updated_at, last_seen, status,
            created_from, subscription_platform
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
            NOW(), NOW(), NOW(), 'active',
            'app_native', 'none'
        )
    ");
    
    // Fallback pour le nom si vide
    if (empty($user_first_name)) {
        $user_first_name = explode('@', $email)[0];
    }

    try {
        $params = [
            $email,
            $password_hash,
            $language,
            $user_first_name,
            $premium_status,
            $subscription_type,
            $subscription_id,
            $premium_expiry,
            $premium_status === 1 ? date('Y-m-d H:i:s') : null,
            $location_mode,
            $location_city,
            $location_country,
            $location_lat,
            $location_lon,
            'MuslimWorldLeague',
            'misharyrachid',
            1.0,
            1,
            1,
            10,
            1,
            5,
            1,
            10,
            1,
            10,
            1,
            15,
            'auto',
            1,
            'medium',
            'streaming_only',
            1,
            100,
            0
        ];
        
        error_log("💾 Tentative d'insertion utilisateur: $email");
        $insertStmt->execute($params);
        error_log("✅ Insertion réussie - user_id: " . $pdo->lastInsertId());
    } catch (Exception $e) {
        error_log("❌ Erreur insertion: " . $e->getMessage());
        handleError("Erreur lors de l'inscription: " . $e->getMessage(), 500);
    }
    
    $user_id = $pdo->lastInsertId();
    
    // 🚀 ADAPTÉ : Logger l'inscription avec plus de détails
    logUserAction($user_id, 'user_registered', null, null, [
        'registration_method' => 'email',
        'has_email' => !empty($email),
        'has_password' => !empty($password_hash),
        'has_name' => !empty($user_first_name),
        'premium_status' => $premium_status
    ]);
    
    // 🚀 CORRECTION : Ne pas appeler updateUserPremiumStatus si l'utilisateur a déjà un statut premium
    // Cette fonction ne doit être appelée que pour les utilisateurs existants qui n'ont pas encore de statut premium
    if ($premium_status === 0) {
        error_log("🔍 Appel updateUserPremiumStatus car premium_status = 0");
        updateUserPremiumStatus($pdo, $user_id, null); // Pass null for device_id as it's not used in this function
    } else {
        error_log("🔍 Pas d'appel updateUserPremiumStatus car premium_status = $premium_status (déjà défini)");
    }
    
    // Récupérer l'utilisateur créé + stripe_customer_id
    $stmt = $pdo->prepare("
        SELECT u.*, ps.stripe_customer_id 
        FROM users u
        LEFT JOIN premium_subscriptions ps ON u.id = ps.user_id AND ps.status = 'active'
        WHERE u.id = ?
    ");
    $stmt->execute([$user_id]);
    $user = $stmt->fetch();
    
    $logMessage = date('Y-m-d H:i:s') . " - 📊 Utilisateur créé - premium_status: " . $user['premium_status'] . ", subscription_type: " . $user['subscription_type'] . ", subscription_id: " . $user['subscription_id'] . "\n";
    file_put_contents(__DIR__ . '/debug_premium.log', $logMessage, FILE_APPEND);
    error_log("📊 Utilisateur créé - premium_status: " . $user['premium_status'] . ", subscription_type: " . $user['subscription_type'] . ", subscription_id: " . $user['subscription_id']);
    
    $formattedUser = formatUserData($user);
    
    // 🚀 DEBUG : Logger la réponse finale
    $logMessage = date('Y-m-d H:i:s') . " - 📤 Réponse finale - premium_status: " . $formattedUser['premium_status'] . ", subscription_type: " . $formattedUser['subscription_type'] . ", subscription_id: " . $formattedUser['subscription_id'] . "\n";
    $logMessage .= date('Y-m-d H:i:s') . " - 📤 Données utilisateur complètes: " . json_encode($formattedUser) . "\n";
    file_put_contents(__DIR__ . '/debug_premium.log', $logMessage, FILE_APPEND);
    error_log("📤 Réponse finale - premium_status: " . $formattedUser['premium_status'] . ", subscription_type: " . $formattedUser['subscription_type'] . ", subscription_id: " . $formattedUser['subscription_id']);
    
    // Générer tokens (ordre corrigé: révoquer puis émettre)
    $deviceId = $data['device_id'] ?? null;
    revokeAllRefreshTokensForUser($user_id);
    revokeAllSessionsForUser($user_id);
    $accessToken = generateAuthToken($user_id);
    $refreshTtlDays = getRefreshTokenTtlDaysForUserRecord($user);
    $refreshToken = createRefreshToken($user_id, $deviceId, $refreshTtlDays);

    // 📧 Envoyer le mail de bienvenue lors de l'inscription (considérée comme première connexion)
    try {
        if ($email && $password) {
            sendLoginEmail($email, $user_first_name ?: 'User', $password);
        }
    } catch (Exception $e) {
        error_log("📧 Erreur non bloquante mail inscription: " . $e->getMessage());
    }

    jsonResponse(true, [
        'user' => $formattedUser,
        'token' => $accessToken,
        'auth_token' => $accessToken,
        'refresh_token' => $refreshToken,
        'registration_method' => 'email',
        'has_password' => !empty($password_hash)
    ], "Inscription réussie");
}

/**
 * 🚀 NOUVEAU : Fonction pour mettre à jour le statut premium d'un utilisateur
 * Cette fonction ne doit être appelée que pour vérifier si un utilisateur a des achats premium
 * dans la table premium_purchases, pas pour les utilisateurs qui ont déjà un statut premium défini
 */
function updateUserPremiumStatus($pdo, $user_id, $device_id = null) {
    try {
        // 🚀 CORRECTION : Vérifier d'abord si l'utilisateur a déjà un statut premium
        $userCheckStmt = $pdo->prepare("SELECT premium_status FROM users WHERE id = ?");
        $userCheckStmt->execute([$user_id]);
        $user = $userCheckStmt->fetch();
        
        if ($user && $user['premium_status'] == 1) {
            error_log("⚠️ Utilisateur $user_id a déjà un statut premium, pas de mise à jour nécessaire");
            return;
        }
        
        // 🚀 ADAPTÉ : Vérifier les achats premium par user_id au lieu de device_id
        $premiumCheckStmt = $pdo->prepare("
            SELECT subscription_type, subscription_id, premium_expiry 
            FROM premium_purchases 
            WHERE user_id = ? AND status = 'active' 
            ORDER BY created_at DESC 
            LIMIT 1
        ");
        $premiumCheckStmt->execute([$user_id]);
        $premiumPurchase = $premiumCheckStmt->fetch();
        
        if ($premiumPurchase) {
            // Mettre à jour le statut premium avec la date d'activation
            $updateStmt = $pdo->prepare("
                UPDATE users 
                SET premium_status = 1, 
                    subscription_type = ?, 
                    subscription_id = ?, 
                    premium_expiry = ?,
                    premium_activated_at = NOW(),
                    updated_at = NOW()
                WHERE id = ?
            ");
            $updateStmt->execute([
                $premiumPurchase['subscription_type'],
                $premiumPurchase['subscription_id'],
                $premiumPurchase['premium_expiry'],
                $user_id
            ]);
            
            error_log("✅ Statut premium mis à jour pour l'utilisateur $user_id depuis premium_purchases");
        } else {
            error_log("ℹ️ Aucun achat premium trouvé pour l'utilisateur $user_id dans premium_purchases");
        }
    } catch (Exception $e) {
        error_log("❌ Erreur mise à jour statut premium: " . $e->getMessage());
    }
}

/**
 * POST /api/auth.php {"action": "migrate_firebase", "firebase_uid": "xxx", "device_id": "xxx"}
 * 🚀 SUPPRIMÉ : Cette fonction n'est plus nécessaire sans Firebase
 */
function handleMigrateFirebase() {
    handleError("Migration Firebase non supportée - Firebase supprimé", 400);
}

/**
 * GET /api/auth.php?token=xxx - Vérifier un token
 */
function handleVerifyAuth() {
    // 🛡️ NOUVEAU : Rate Limiting pour verifyAuth
    $pdo = getDBConnection();
    $rateLimiter = new RateLimiterNew($pdo);
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
    
    $rateLimitResult = $rateLimiter->checkRateLimit($ip, 'auth_verify', 20, 3600, $userAgent);
    if (!$rateLimitResult['allowed']) {
        http_response_code(429);
        echo json_encode([
            'success' => false,
            'error' => 'Trop de vérifications d\'authentification - veuillez patienter',
            'details' => $rateLimitResult,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit();
    }
    
    // 🔐 Nouveau: validation réelle via user_sessions
    $token = getBearerToken();
    if (!$token) {
        handleError('Token requis', 400);
    }

    $auth = validateAuthToken($token);
    if (!$auth || empty($auth['success'])) {
        jsonResponse(false, null, 'Token invalide ou expiré', 401);
    }

    jsonResponse(true, [
        'valid' => true,
        'user_id' => $auth['user_id'],
        'email' => $auth['email'] ?? null,
        'is_premium' => $auth['is_premium'] ?? false,
        'token_type' => 'session_db'
    ], 'Token valide');
}

/**
 * POST /api/auth.php {"action":"refresh", "refresh_token":"..."}
 * Retourne un nouveau access token et un nouveau refresh token (rotation)
 */
function handleRefresh() {
    global $data;
    $providedRefresh = $data['refresh_token'] ?? null;
    if (!$providedRefresh) {
        handleError('refresh_token requis', 400);
    }

    $record = validateRefreshToken($providedRefresh);
    if (!$record) {
        handleError('Refresh token invalide ou expiré', 401);
    }

    // Charger l'utilisateur pour s'assurer qu'il est actif + stripe_customer_id
    $pdo = getDBConnection();
    $stmt = $pdo->prepare("
        SELECT u.*, ps.stripe_customer_id 
        FROM users u
        LEFT JOIN premium_subscriptions ps ON u.id = ps.user_id AND ps.status = 'active'
        WHERE u.id = ? AND u.status = 'active'
    ");
    $stmt->execute([$record['user_id']]);
    $user = $stmt->fetch();
    if (!$user) {
        handleError('Utilisateur inactif ou inexistant', 403);
    }

    // Rotation du refresh token (durée prolongée pour les VIP)
    $refreshTtlDays = getRefreshTokenTtlDaysForUserRecord($user);
    $newRefresh = rotateRefreshToken($providedRefresh, $record['device_id'] ?? null, $refreshTtlDays);
    if (!$newRefresh) {
        handleError('Impossible de renouveler le refresh token', 500);
    }

    // Nouveau access token
    $newAccess = generateAuthToken($record['user_id']);

    jsonResponse(true, [
        'token' => $newAccess,
        'auth_token' => $newAccess,
        'refresh_token' => $newRefresh,
        'user' => formatUserData($user)
    ], 'Token rafraîchi');
}

/**
 * POST /api/auth.php {"action": "add_password", "email": "xxx", "password": "xxx"}
 * 🚀 NOUVEAU : Ajouter un mot de passe à un compte existant
 */
function handleAddPassword() {
    global $data;
    
    $email = $data['email'] ?? null;
    $password = $data['password'] ?? null;
    
    if (!$email) {
        handleError("email requis", 400);
    }
    
    if (!$password) {
        handleError("Mot de passe requis", 400);
    }
    
    // 🚀 NOUVEAU : Critères de mot de passe stricts
    if (strlen($password) < 8) {
        handleError("Le mot de passe doit contenir au moins 8 caractères", 400);
    }
    
    // Vérifier les critères de complexité
    if (!preg_match('/[a-z]/', $password)) {
        handleError("Le mot de passe doit contenir au moins une lettre minuscule", 400);
    }
    
    if (!preg_match('/[A-Z]/', $password)) {
        handleError("Le mot de passe doit contenir au moins une lettre majuscule", 400);
    }
    
    if (!preg_match('/\d/', $password)) {
        handleError("Le mot de passe doit contenir au moins un chiffre", 400);
    }
    
    if (!preg_match('/[^a-zA-Z\d]/', $password)) {
        handleError("Le mot de passe doit contenir au moins un caractère spécial", 400);
    }
    
    $pdo = getDBConnection();
    
    // Rechercher l'utilisateur par email
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if (!$user) {
        handleError("Utilisateur non trouvé", 404);
    }
    
    // Vérifier si l'utilisateur a déjà un mot de passe
    if ($user['password_hash']) {
        handleError("Ce compte a déjà un mot de passe configuré", 409);
    }
    
    // Hasher et sauvegarder le mot de passe
    $password_hash = password_hash($password, PASSWORD_DEFAULT);
    
    $updateStmt = $pdo->prepare("
        UPDATE users SET 
            password_hash = ?,
            email_verified = 1,
            updated_at = NOW()
        WHERE id = ?
    ");
    $updateStmt->execute([$password_hash, $user['id']]);
    
    // Logger l'action
    logUserAction($user['id'], 'password_added', null, null, [
        'method' => 'email'
    ]);
    
    // Récupérer l'utilisateur mis à jour + stripe_customer_id
    $stmt = $pdo->prepare("
        SELECT u.*, ps.stripe_customer_id 
        FROM users u
        LEFT JOIN premium_subscriptions ps ON u.id = ps.user_id AND ps.status = 'active'
        WHERE u.id = ?
    ");
    $stmt->execute([$user['id']]);
    $updatedUser = $stmt->fetch();
    
    $formattedUser = formatUserData($updatedUser);
    
    jsonResponse(true, [
        'user' => $formattedUser,
        'message' => 'Mot de passe ajouté avec succès'
    ], "Mot de passe ajouté avec succès");
}

/**
 * 🚀 NOUVEAU : Changer le mot de passe
 */
function handleChangePassword() {
    global $data;
    
    $email = $data['email'] ?? null;
    $currentPassword = $data['current_password'] ?? null;
    $newPassword = $data['new_password'] ?? null;
    
    if (!$email) {
        handleError("Email requis", 400);
    }
    
    if (!$currentPassword) {
        handleError("Mot de passe actuel requis", 400);
    }
    
    if (!$newPassword) {
        handleError("Nouveau mot de passe requis", 400);
    }
    
    // 🚀 NOUVEAU : Critères de mot de passe stricts (même que l'inscription)
    if (strlen($newPassword) < 8) {
        handleError("Le nouveau mot de passe doit contenir au moins 8 caractères", 400);
    }
    
    // Vérifier les critères de complexité
    if (!preg_match('/[a-z]/', $newPassword)) {
        handleError("Le nouveau mot de passe doit contenir au moins une lettre minuscule", 400);
    }
    
    if (!preg_match('/[A-Z]/', $newPassword)) {
        handleError("Le nouveau mot de passe doit contenir au moins une lettre majuscule", 400);
    }
    
    if (!preg_match('/\d/', $newPassword)) {
        handleError("Le nouveau mot de passe doit contenir au moins un chiffre", 400);
    }
    
    if (!preg_match('/[^a-zA-Z\d]/', $newPassword)) {
        handleError("Le nouveau mot de passe doit contenir au moins un caractère spécial", 400);
    }
    
    $pdo = getDBConnection();
    
    // Rechercher l'utilisateur par email
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if (!$user) {
        handleError("Utilisateur non trouvé", 404);
    }
    
    // Vérifier si l'utilisateur a un mot de passe configuré
    if (!$user['password_hash']) {
        handleError("Ce compte n'a pas de mot de passe configuré", 400);
    }
    
    // Vérifier le mot de passe actuel
    if (!password_verify($currentPassword, $user['password_hash'])) {
        handleError("Mot de passe actuel incorrect", 401);
    }
    
    // 🚀 NOUVEAU : Vérifier que le nouveau mot de passe est différent de l'ancien
    if ($currentPassword === $newPassword) {
        handleError("Le nouveau mot de passe ne peut pas être identique à l'ancien", 400);
    }
    
    // Hasher le nouveau mot de passe
    $newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);
    
    // Mettre à jour le mot de passe
    $updateStmt = $pdo->prepare("
        UPDATE users SET 
            password_hash = ?,
            updated_at = NOW()
        WHERE id = ?
    ");
    $updateStmt->execute([$newPasswordHash, $user['id']]);
    
    // Logger l'action
    logUserAction($user['id'], 'password_changed', null, null, [
        'method' => 'email',
        'changed_at' => date('Y-m-d H:i:s')
    ]);
    
    // Récupérer l'utilisateur mis à jour + stripe_customer_id
    $stmt = $pdo->prepare("
        SELECT u.*, ps.stripe_customer_id 
        FROM users u
        LEFT JOIN premium_subscriptions ps ON u.id = ps.user_id AND ps.status = 'active'
        WHERE u.id = ?
    ");
    $stmt->execute([$user['id']]);
    $updatedUser = $stmt->fetch();
    
    $formattedUser = formatUserData($updatedUser);
    
    jsonResponse(true, [
        'user' => $formattedUser,
        'message' => 'Mot de passe modifié avec succès'
    ], "Mot de passe modifié avec succès");
}

/**
 *  NOUVEAU : Fonction locale pour formater les données utilisateur
 * Remplace la fonction de users.php pour éviter les conflits
 */
function formatUserData($user) {
    return [
        'id' => $user['id'],
        'email' => $user['email'],
        'user_first_name' => $user['user_first_name'],
        'email_verified' => (int)$user['email_verified'],
        'last_login' => $user['last_login'],
        'premium_status' => (int)$user['premium_status'],
        'subscription_type' => $user['subscription_type'],
        'subscription_id' => $user['subscription_id'],
        'stripe_customer_id' => $user['stripe_customer_id'] ?? null,
        'premium_expiry' => $user['premium_expiry'],
        'premium_features' => $user['premium_features'],
        'premium_activated_at' => $user['premium_activated_at'],
        'premium_cancelled_at' => $user['premium_cancelled_at'],
        'location_mode' => $user['location_mode'],
        'location_city' => $user['location_city'],
        'location_country' => $user['location_country'],
        'location_lat' => $user['location_lat'],
        'location_lon' => $user['location_lon'],
        'timezone' => $user['timezone'],
        'calc_method' => $user['calc_method'],
        'adhan_sound' => $user['adhan_sound'],
        'adhan_volume' => $user['adhan_volume'],
        'notifications_enabled' => (int)$user['notifications_enabled'],
        'reminders_enabled' => (int)$user['reminders_enabled'],
        'reminder_offset' => (int)$user['reminder_offset'],
        'prayer_times_format' => $user['prayer_times_format'],
        'show_seconds' => (int)$user['show_seconds'],
        'dhikr_after_salah_enabled' => (int)$user['dhikr_after_salah_enabled'],
        'dhikr_after_salah_delay' => (int)$user['dhikr_after_salah_delay'],
        'dhikr_morning_enabled' => (int)$user['dhikr_morning_enabled'],
        'dhikr_morning_delay' => (int)$user['dhikr_morning_delay'],
        'dhikr_evening_enabled' => (int)$user['dhikr_evening_enabled'],
        'dhikr_evening_delay' => (int)$user['dhikr_evening_delay'],
        'dhikr_selected_dua_enabled' => (int)$user['dhikr_selected_dua_enabled'],
        'dhikr_selected_dua_delay' => (int)$user['dhikr_selected_dua_delay'],
        'dhikr_auto_count' => (int)$user['dhikr_auto_count'],
        'language' => $user['language'],
        'theme_mode' => $user['theme_mode'],
        'font_size' => $user['font_size'],
        'show_arabic_text' => (int)$user['show_arabic_text'],
        'show_translation' => (int)$user['show_translation'],
        'show_transliteration' => (int)$user['show_transliteration'],
        'is_first_time' => (int)$user['is_first_time'],
        'onboarding_completed' => (int)$user['onboarding_completed'],
        'audio_quality' => $user['audio_quality'],
        'download_strategy' => $user['download_strategy'],
        'enable_data_saving' => (int)$user['enable_data_saving'],
        'max_cache_size' => (int)$user['max_cache_size'],
        'auto_play_next' => (int)$user['auto_play_next'],
        'background_audio' => (int)$user['background_audio'],
        'auto_backup_enabled' => (int)$user['auto_backup_enabled'],
        'backup_frequency' => $user['backup_frequency'],
        'last_backup_time' => $user['last_backup_time'],
        'last_sync_time' => $user['last_sync_time'],
        'sync_enabled' => (int)$user['sync_enabled'],
        'created_at' => $user['created_at'],
        'updated_at' => $user['updated_at'],
        'last_seen' => $user['last_seen'],
        'login_count' => (int)$user['login_count'],
        'app_version' => $user['app_version'],
        'device_model' => $user['device_model'],
        'os_version' => $user['os_version'],
        'app_build' => $user['app_build'],
        'status' => $user['status'],
        'has_password' => !empty($user['password_hash']),
        'is_premium' => (int)$user['premium_status'] === 1,
        'premium_active' => (int)$user['premium_status'] === 1 && 
                           ($user['premium_expiry'] === null || strtotime($user['premium_expiry']) > time())
    ];
}

/**
 * 🚀 NOUVEAU : Vérifier si un email existe déjà (sans créer l'utilisateur)
 */
function handleCheckEmail() {
    $email = $_GET['email'] ?? null;
    
    if (!$email) {
        handleError("Email requis", 400);
    }
    
    $pdo = getDBConnection();
    
    // Vérifier si l'utilisateur existe déjà par email
    $checkStmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $checkStmt->execute([$email]);
    $existingUser = $checkStmt->fetch();
    
    jsonResponse(true, [
        'exists' => $existingUser !== false,
        'email' => $email,
        'message' => $existingUser ? 'Email existe déjà' : 'Email disponible'
    ]);
}

/**
 * 🚀 SUPPRIMÉ : Fonctions Firebase non nécessaires
 */

/**
 * 🚀 NOUVEAU : Trouver le customer ID Stripe en utilisant l'email
 * Utile quand stripe_customer_id est NULL dans la base de données
 */
function findStripeCustomerByEmail($email, $pdo) {
    try {
        // Charger Stripe (le dossier vendor est au niveau parent du dossier api/)
        require_once __DIR__ . '/../vendor/autoload.php';
        
        if (!defined('STRIPE_SECRET_KEY')) {
            error_log("⚠️ [AUTH] STRIPE_SECRET_KEY non définie");
            return null;
        }
        
        \Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);
        
        error_log("🔍 [AUTH] Recherche customer Stripe par email: " . $email);
        
        // Rechercher le customer sur Stripe
        $customers = \Stripe\Customer::all([
            'email' => $email,
            'limit' => 1
        ]);
        
        if (empty($customers->data)) {
            error_log("❌ [AUTH] Aucun customer trouvé sur Stripe pour: " . $email);
            return null;
        }
        
        $customer = $customers->data[0];
        error_log("✅ [AUTH] Customer trouvé: " . $customer->id);
        
        return $customer->id;
        
    } catch (\Stripe\Exception\ApiErrorException $e) {
        error_log("❌ [AUTH] Erreur Stripe API lors de la recherche: " . $e->getMessage());
        return null;
    } catch (Exception $e) {
        error_log("❌ [AUTH] Erreur recherche customer: " . $e->getMessage());
        return null;
    }
}

/**
 * 🚀 NOUVEAU : Synchroniser l'utilisateur avec Stripe lors du login
 * Vérifie l'état actuel de l'abonnement sur Stripe et met à jour la base de données
 */
function syncUserWithStripe($userId, $stripeCustomerId, $pdo) {
    try {
        // Charger Stripe (le dossier vendor est au niveau parent du dossier api/)
        require_once __DIR__ . '/../vendor/autoload.php';
        
        if (!defined('STRIPE_SECRET_KEY')) {
            error_log("⚠️ [AUTH] STRIPE_SECRET_KEY non définie, synchronisation impossible");
            return false;
        }
        
        \Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);
        
        error_log("🔍 [AUTH] Récupération des abonnements pour customer: " . $stripeCustomerId);
        
        // Récupérer TOUS les abonnements du customer (pas seulement actifs)
        // pour voir ceux qui sont actifs, trialing, past_due, etc.
        $subscriptions = \Stripe\Subscription::all([
            'customer' => $stripeCustomerId,
            'limit' => 10 // Récupérer plusieurs pour voir
        ]);
        
        // Logger tous les abonnements trouvés pour debug
        error_log("🔍 [AUTH] Nombre d'abonnements trouvés: " . count($subscriptions->data));
        foreach ($subscriptions->data as $index => $sub) {
            error_log("📋 [AUTH] Abonnement #$index - ID: {$sub->id}, Status: {$sub->status}, Period End: " . date('Y-m-d H:i:s', $sub->current_period_end));
        }
        
        // Filtrer pour ne garder que les abonnements actifs ou trialing
        $activeSubscriptions = array_filter($subscriptions->data, function($sub) {
            return in_array($sub->status, ['active', 'trialing']);
        });
        
        // Trier par date de création (le plus récent en premier)
        usort($activeSubscriptions, function($a, $b) {
            return $b->created - $a->created;
        });
        
        if (empty($activeSubscriptions)) {
            error_log("⚠️ [AUTH] Aucun abonnement actif trouvé pour ce customer");
            
            // Vérifier si l'abonnement est expiré dans la base de données
            $stmt = $pdo->prepare("SELECT premium_status, premium_expiry FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $currentUser = $stmt->fetch();
            
            if ($currentUser && $currentUser['premium_status'] == 1) {
                // Désactiver le premium car aucun abonnement actif sur Stripe
                $updateStmt = $pdo->prepare("
                    UPDATE users 
                    SET premium_status = 0,
                        updated_at = NOW()
                    WHERE id = ?
                ");
                $updateStmt->execute([$userId]);
                error_log("❌ [AUTH] Premium désactivé - aucun abonnement actif sur Stripe");
                return true; // Données mises à jour
            }
            
            return false; // Pas de changement
        }
        
        // Récupérer le premier abonnement actif (reset array keys after filter)
        $activeSubscriptions = array_values($activeSubscriptions);
        $subscription = $activeSubscriptions[0];
        
        error_log("✅ [AUTH] Abonnement actif trouvé: " . $subscription->id);
        
        // 🔧 CORRECTION CRITIQUE : current_period_end n'est plus au niveau subscription
        // mais dans items.data[0] depuis la nouvelle API Stripe
        $currentPeriodEnd = null;
        if ($subscription->items && $subscription->items->data && count($subscription->items->data) > 0) {
            $currentPeriodEnd = $subscription->items->data[0]->current_period_end;
            error_log("🔍 [AUTH] Timestamp depuis items[0]: " . $currentPeriodEnd);
        } else {
            // Fallback sur l'ancienne méthode (pour compatibilité)
            $currentPeriodEnd = $subscription->current_period_end ?? time();
            error_log("⚠️ [AUTH] Timestamp depuis subscription (fallback): " . $currentPeriodEnd);
        }
        
        error_log("📅 [AUTH] Date d'expiration Stripe: " . date('Y-m-d H:i:s', $currentPeriodEnd));
        error_log("🚫 [AUTH] Cancel at period end: " . ($subscription->cancel_at_period_end ? 'OUI' : 'NON'));
        
        // Déterminer le type d'abonnement
        $subscriptionType = 'monthly'; // Par défaut
        if ($subscription->items && $subscription->items->data) {
            $priceId = $subscription->items->data[0]->price->id;
            if (strpos($priceId, 'month') !== false) {
                $subscriptionType = 'monthly';
            } elseif (strpos($priceId, 'year') !== false) {
                $subscriptionType = 'yearly';
            }
        }
        
        // Calculer la nouvelle date d'expiration depuis Stripe
        $newExpiryDate = date('Y-m-d H:i:s', $currentPeriodEnd);
        
        // Mettre à jour la base de données
        $updateStmt = $pdo->prepare("
            UPDATE users 
            SET premium_status = 1,
                premium_expiry = ?,
                subscription_type = ?,
                subscription_id = ?,
                stripe_customer_id = ?,
                updated_at = NOW()
            WHERE id = ?
        ");
        
        $updateStmt->execute([
            $newExpiryDate,
            $subscriptionType,
            $subscription->id, // Mettre le vrai subscription_id (sub_xxx) au lieu du checkout session (cs_xxx)
            $stripeCustomerId, // S'assurer que le customer_id est aussi mis à jour
            $userId
        ]);
        
        error_log("✅ [AUTH] Base de données mise à jour avec les données Stripe");
        error_log("📅 [AUTH] Nouvelle date d'expiration: " . $newExpiryDate);
        error_log("🆔 [AUTH] Subscription ID: " . $subscription->id);
        
        // Mettre à jour aussi premium_subscriptions
        $subUpdateStmt = $pdo->prepare("
            UPDATE premium_subscriptions 
            SET stripe_subscription_id = ?,
                stripe_customer_id = ?,
                status = ?,
                updated_at = NOW()
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 1
        ");
        
        $subUpdateStmt->execute([
            $subscription->id,
            $stripeCustomerId,
            $subscription->status,
            $userId
        ]);
        
        return true; // Données mises à jour
        
    } catch (\Stripe\Exception\ApiErrorException $e) {
        error_log("❌ [AUTH] Erreur Stripe API: " . $e->getMessage());
        return false;
    } catch (Exception $e) {
        error_log("❌ [AUTH] Erreur synchronisation Stripe: " . $e->getMessage());
        return false;
    }
}

/**
 * 📧 Send a beautiful welcome email with credentials via Resend (English)
 */
function sendWelcomeEmailResend($email, $firstName, $password) {
    $subject = "Welcome to myAdhan! 🤲";
    
    $htmlContent = "
    <html>
    <body style='font-family: \"Segoe UI\", Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; background-color: #f4f7f6; padding: 20px;'>
        <div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);'>
            <div style='background: linear-gradient(135deg, #4A90E2 0%, #357ABD 100%); padding: 30px; text-align: center;'>
                <h1 style='color: #ffffff; margin: 0; font-size: 28px;'>Welcome to myAdhan</h1>
            </div>
            
            <div style='padding: 30px;'>
                <h2 style='color: #2C3E50; margin-top: 0;'>Assalamu Alaikum $firstName,</h2>
                <p>We are absolutely thrilled to have you join our community! Thank you for choosing <strong>myAdhan</strong> to accompany you in your daily prayers.</p>
                
                <p>Your account has been successfully created. Here are your login credentials to access the app:</p>
                
                <div style='background-color: #f8f9fa; border-left: 4px solid #4A90E2; padding: 20px; margin: 25px 0; border-radius: 4px;'>
                    <p style='margin: 5px 0;'><strong>Email:</strong> <span style='color: #4A90E2;'>$email</span></p>
                    <p style='margin: 5px 0;'><strong>Password:</strong> <span style='color: #4A90E2;'><code>$password</code></span></p>
                </div>
                
                <p style='font-size: 14px; color: #7f8c8d;'><i>Tip: For security reasons, we recommend changing your password in the app settings after your first login.</i></p>
                
                <p>With myAdhan, you can now enjoy accurate prayer times, beautiful Adhan notifications, Qibla finder, and much more.</p>
                
                <div style='text-align: center; margin-top: 35px;'>
                    <p style='margin-bottom: 5px;'>May this app be a source of blessing for you.</p>
                    <p style='font-weight: bold; color: #2C3E50; margin-top: 0;'>The myAdhan Team</p>
                </div>
            </div>
            
            <div style='background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #95a5a6;'>
                <p style='margin: 0;'>&copy; " . date('Y') . " myAdhan. All rights reserved.</p>
                <p style='margin: 5px 0;'>This is an automated message, please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    ";
    
    return sendEmailWithResend($email, $subject, $htmlContent);
}

/**
 * 📧 Envoyer un magnifique email de bienvenue (unique) via Resend
 */
function sendLoginEmail($email, $firstName, $password = null) {
    $subject = "Welcome to myAdhan! 🤲";
    
    $credsHtml = "";
    if ($password) {
        $credsHtml = "
        <div style='background-color: #f8f9fa; border-left: 4px solid #4A90E2; padding: 20px; margin: 25px 0; border-radius: 4px;'>
            <p style='margin: 5px 0;'><strong>Email:</strong> <span style='color: #4A90E2;'>$email</span></p>
            <p style='margin: 5px 0;'><strong>Password:</strong> <span style='color: #4A90E2;'><code>$password</code></span></p>
        </div>";
    }

    $htmlContent = "
    <html>
    <body style='font-family: \"Segoe UI\", Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; background-color: #f4f7f6; padding: 20px;'>
        <div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);'>
            <div style='background: linear-gradient(135deg, #4A90E2 0%, #357ABD 100%); padding: 30px; text-align: center;'>
                <h1 style='color: #ffffff; margin: 0; font-size: 28px;'>Welcome to myAdhan</h1>
            </div>
            
            <div style='padding: 30px;'>
                <h2 style='color: #2C3E50; margin-top: 0;'>Assalamu Alaikum $firstName,</h2>
                <p>We are absolutely thrilled to have you join our community! Thank you for choosing <strong>myAdhan</strong> to accompany you in your daily prayers.</p>
                
                <p>Your account has been successfully set up. Here are your login credentials to access the app:</p>
                
                $credsHtml
                
                <p style='font-size: 14px; color: #7f8c8d;'><i>Tip: You can change your password anytime in the app settings.</i></p>
                
                <p>With myAdhan, you can enjoy accurate prayer times, beautiful Adhan notifications, Qibla finder, and much more.</p>
                
                <div style='text-align: center; margin-top: 35px;'>
                    <p style='margin-bottom: 5px;'>May this app be a source of blessing for you.</p>
                    <p style='font-weight: bold; color: #2C3E50; margin-top: 0;'>The myAdhan Team</p>
                </div>
            </div>
            
            <div style='background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #95a5a6;'>
                <p style='margin: 0;'>&copy; " . date('Y') . " myAdhan. All rights reserved.</p>
                <p style='margin: 5px 0;'>This is an automated message, please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>";
    
    return sendEmailWithResend($email, $subject, $htmlContent);
}
?>