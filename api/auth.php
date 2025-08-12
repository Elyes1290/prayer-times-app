<?php
/**
 * API Authentification - Prayer Times App
 * Gestion connexion, inscription, migration Firebase
 */

require_once 'config.php';
// 🚀 CORRECTION : Supprimer l'inclusion de users.php qui cause un conflit de routage
// require_once 'users.php'; // ❌ SUPPRIMÉ - Cause un conflit de routage

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
        handleError("Mot de passe incorrect", 401);
    }
    
    // 🚀 ADAPTÉ : Mettre à jour les statistiques de connexion
    $updateStmt = $pdo->prepare("
        UPDATE users SET 
            last_seen = NOW(), 
            last_login = NOW(),
            login_count = login_count + 1,
            updated_at = NOW()
        WHERE id = ?
    ");
    $updateStmt->execute([$user['id']]);
    
    // 🚀 CORRECTION : Récupérer l'utilisateur avec les données mises à jour
    $userStmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $userStmt->execute([$user['id']]);
    $user = $userStmt->fetch(PDO::FETCH_ASSOC);
    
    // Logger la connexion
    logUserAction($user['id'], 'user_login', null, null, [
        'login_method' => 'email',
        'has_password' => !empty($user['password_hash'])
    ]);
    
    // Retourner les données utilisateur + tokens
    $formattedUser = formatUserData($user);

    // Single-device: révoquer d'abord les anciennes sessions et refresh tokens,
    // puis émettre de nouveaux tokens (évite d'invalider le token fraîchement créé)
    $deviceId = $data['device_id'] ?? null;
    revokeAllRefreshTokensForUser($user['id']);
    revokeAllSessionsForUser($user['id']);
    $accessToken = generateAuthToken($user['id']);
    $refreshToken = createRefreshToken($user['id'], $deviceId, 30);
    
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
    
    if (strlen($password) < 6) {
        handleError("Le mot de passe doit contenir au moins 6 caractères", 400);
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
        $subscription_id = $data['subscription_id'] ?? "premium-" . time();
        $premium_expiry = $data['premium_expiry'] ?? date('Y-m-d H:i:s', strtotime('+1 year'));
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
    
    $logMessage = date('Y-m-d H:i:s') . " - 💾 Insertion utilisateur avec premium_status=$premium_status, subscription_type=$subscription_type, subscription_id=$subscription_id, premium_expiry=$premium_expiry\n";
    $logMessage .= date('Y-m-d H:i:s') . " - 💾 Valeurs à insérer: email=$email, user_first_name=$user_first_name, premium_status=$premium_status, subscription_type=$subscription_type, subscription_id=$subscription_id, premium_expiry=$premium_expiry\n";
    $logMessage .= date('Y-m-d H:i:s') . " - 💾 Paramètres execute: " . json_encode([$email, $password_hash, $language, $user_first_name, $premium_status, $subscription_type, $subscription_id, $premium_expiry, $premium_status === 1 ? date('Y-m-d H:i:s') : null, $location_mode, $location_city, $location_country, $location_lat, $location_lon]) . "\n";
    $logMessage .= date('Y-m-d H:i:s') . " - 🔍 Données reçues dans \$data: " . json_encode($data) . "\n";
    $logMessage .= date('Y-m-d H:i:s') . " - 🔍 Premium status dans \$data: " . ($data['premium_status'] ?? 'non défini') . "\n";
    file_put_contents(__DIR__ . '/debug_premium.log', $logMessage, FILE_APPEND);
    
    error_log("💾 Insertion utilisateur avec premium_status=$premium_status, subscription_type=$subscription_type, subscription_id=$subscription_id, premium_expiry=$premium_expiry");
    error_log("💾 Valeurs à insérer: email=$email, user_first_name=$user_first_name, premium_status=$premium_status, subscription_type=$subscription_type, subscription_id=$subscription_id, premium_expiry=$premium_expiry");
    error_log("💾 Paramètres execute: " . json_encode([$email, $password_hash, $language, $user_first_name, $premium_status, $subscription_type, $subscription_id, $premium_expiry, $premium_status === 1 ? date('Y-m-d H:i:s') : null, $location_mode, $location_city, $location_country, $location_lat, $location_lon]));
    
    try {
        $params = [
            $email,
            $password_hash, // 🚀 ADAPTÉ : Hash du mot de passe
            $language,
            $user_first_name,
            $premium_status, // 🚀 ADAPTÉ : Statut premium dynamique
            $subscription_type,
            $subscription_id,
            $premium_expiry,
            $premium_status === 1 ? date('Y-m-d H:i:s') : null, // Date d'activation si premium
            $location_mode, // 🚀 ADAPTÉ : Mode de localisation
            $location_city, // 🚀 ADAPTÉ : Ville
            $location_country, // 🚀 ADAPTÉ : Pays
            $location_lat, // 🚀 ADAPTÉ : Latitude
            $location_lon, // 🚀 ADAPTÉ : Longitude
            // Valeurs par défaut pour les paramètres de configuration
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
        
        $logMessage = date('Y-m-d H:i:s') . " - 🔍 Paramètres d'exécution: " . json_encode($params) . "\n";
        file_put_contents(__DIR__ . '/debug_premium.log', $logMessage, FILE_APPEND);
        error_log("🔍 Paramètres d'exécution: " . json_encode($params));
        
        $insertStmt->execute($params);
        
        $logMessage = date('Y-m-d H:i:s') . " - ✅ Insertion réussie - user_id: " . $pdo->lastInsertId() . "\n";
        file_put_contents(__DIR__ . '/debug_premium.log', $logMessage, FILE_APPEND);
        error_log("✅ Insertion réussie - user_id: " . $pdo->lastInsertId());
    } catch (Exception $e) {
        $logMessage = date('Y-m-d H:i:s') . " - ❌ Erreur insertion: " . $e->getMessage() . "\n";
        file_put_contents(__DIR__ . '/debug_premium.log', $logMessage, FILE_APPEND);
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
    
    // Récupérer l'utilisateur créé
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
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
    $refreshToken = createRefreshToken($user_id, $deviceId, 30);

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

    // Charger l'utilisateur pour s'assurer qu'il est actif
    $pdo = getDBConnection();
    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ? AND status = \"active\"');
    $stmt->execute([$record['user_id']]);
    $user = $stmt->fetch();
    if (!$user) {
        handleError('Utilisateur inactif ou inexistant', 403);
    }

    // Rotation du refresh token
    $newRefresh = rotateRefreshToken($providedRefresh, $record['device_id'] ?? null, 30);
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
    
    if (strlen($password) < 6) {
        handleError("Le mot de passe doit contenir au moins 6 caractères", 400);
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
    
    // Récupérer l'utilisateur mis à jour
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$user['id']]);
    $updatedUser = $stmt->fetch();
    
    $formattedUser = formatUserData($updatedUser);
    
    jsonResponse(true, [
        'user' => $formattedUser,
        'message' => 'Mot de passe ajouté avec succès'
    ], "Mot de passe ajouté avec succès");
}

/**
 * �� NOUVEAU : Fonction locale pour formater les données utilisateur
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
?> 