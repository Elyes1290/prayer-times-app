<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
/**
 * API Gestion des Utilisateurs - Prayer Times App
 * Endpoints: GET, POST, PUT pour les utilisateurs et leurs settings
 * Version adaptée pour la nouvelle structure SQL sans Firebase
 */

require_once 'config.php';

// Authentification (optionnelle pour certaines routes)
$auth = authenticate();
$method = $_SERVER['REQUEST_METHOD'];
$data = getRequestData();

try {
    // 🚀 DEBUG GLOBAL : Log de début de requête
    error_log("=== DEBUG API USERS.PHP ===");
    error_log("Méthode: " . $method);
    error_log("URI: " . ($_SERVER['REQUEST_URI'] ?? 'N/A'));
    error_log("Données reçues: " . json_encode($data));
    error_log("Auth status: " . ($auth ? 'OK' : 'FAILED'));
    
    switch ($method) {
        case 'GET':
            error_log("DEBUG: Appel GET - handleGetUser()");
            handleGetUser();
            break;
        case 'POST':
            error_log("DEBUG: Appel POST");
            // Vérifier s'il y a une action spécifique
            $action = $data['action'] ?? null;
            error_log("DEBUG: Action détectée: " . ($action ?? 'AUCUNE'));
            
            if ($action === 'sync_premium_purchase') {
                error_log("DEBUG: Appel handleSyncPremiumPurchase()");
                handleSyncPremiumPurchase();
            } elseif ($action === 'save_backup') {
                error_log("DEBUG: Appel handleSaveBackup()");
                handleSaveBackup();
            } elseif ($action === 'get_backups') {
                error_log("DEBUG: Appel handleGetBackups()");
                handleGetBackups();
            } elseif (isset($data['user_id']) || isset($data['email'])) {
                error_log("DEBUG: Appel handleGetUser() via POST");
                // 🚀 CORRECTION : Si on a user_id ou email dans POST, traiter comme un GET
                handleGetUser();
            } else {
                error_log("DEBUG: Appel handleCreateUser()");
                handleCreateUser();
            }
            break;
        case 'PUT':
            error_log("DEBUG: Appel PUT - handleUpdateUser()");
            handleUpdateUser();
            break;
        default:
            error_log("DEBUG: Méthode non supportée: " . $method);
            handleError("Méthode non supportée", 405);
    }
    error_log("=== FIN DEBUG API USERS.PHP ===");
} catch (Exception $e) {
    error_log("=== ERREUR CRITIQUE API USERS.PHP ===");
    error_log("Exception: " . $e->getMessage());
    error_log("Fichier: " . $e->getFile() . " ligne " . $e->getLine());
    error_log("Trace: " . $e->getTraceAsString());
    error_log("=== FIN ERREUR CRITIQUE ===");
    handleError("Erreur dans l'API utilisateurs", 500, $e->getMessage());
}

/**
 * GET /api/users.php?user_id=xxx ou ?email=xxx
 */
function handleGetUser() {
    global $auth, $data;
    
    // 🚀 DEBUG : Log pour voir si la fonction est appelée
    error_log("DEBUG: handleGetUser() appelée");
    
    // 🔍 DEBUG ÉTENDU : Lire les paramètres depuis plusieurs sources
    $user_id = $_GET['user_id'] ?? $_POST['user_id'] ?? null;
    $email = $_GET['email'] ?? $_POST['email'] ?? null;
    
    // 🔍 DEBUG COMPLET
    error_log("DEBUG: REQUEST_METHOD: " . ($_SERVER['REQUEST_METHOD'] ?? 'N/A'));
    error_log("DEBUG: REQUEST_URI: " . ($_SERVER['REQUEST_URI'] ?? 'N/A'));
    error_log("DEBUG: QUERY_STRING: " . ($_SERVER['QUERY_STRING'] ?? 'N/A'));
    error_log("DEBUG: GET params: " . json_encode($_GET));
    error_log("DEBUG: POST params: " . json_encode($_POST));
    error_log("DEBUG: Data params: " . json_encode($data));
    error_log("DEBUG: Paramètres reçus - user_id: $user_id, email: $email");
    
    if (!$user_id && !$email) {
        // Log détaillé avant l'erreur
        error_log("ERROR: Aucun paramètre trouvé. GET=" . json_encode($_GET) . ", POST=" . json_encode($_POST) . ", URI=" . ($_SERVER['REQUEST_URI'] ?? 'N/A'));
        handleError("Paramètre requis: user_id ou email", 400);
    }
    
    try {
        error_log("DEBUG: Tentative de connexion à la base de données");
        $pdo = getDBConnection();
        
        if ($pdo === null) {
            error_log("ERROR: getDBConnection() a retourné null");
            handleError("Erreur de connexion à la base de données", 500);
            return;
        }
        
        error_log("DEBUG: Connexion DB réussie");
        
        // Vérifier si la table users existe
        error_log("DEBUG: Vérification de l'existence de la table users");
        $tableCheck = $pdo->query("SHOW TABLES LIKE 'users'");
        error_log("DEBUG: Nombre de tables users trouvées: " . $tableCheck->rowCount());
        
        if ($tableCheck->rowCount() === 0) {
            error_log("DEBUG: Table users non trouvée");
            jsonResponse(false, [
                'user_found' => false,
                'error' => 'Table users non trouvée',
                'suggestion' => 'La base de données doit être initialisée.'
            ], "Table users non trouvée", 404);
        }
        
        // Construire la requête selon le paramètre fourni
        // 🔧 CORRECTION : Récupérer stripe_customer_id depuis premium_subscriptions
        if ($user_id) {
            $stmt = $pdo->prepare("
                SELECT u.*, ps.stripe_customer_id 
                FROM users u
                LEFT JOIN premium_subscriptions ps ON u.id = ps.user_id AND ps.status = 'active'
                WHERE u.id = ? AND u.status = 'active'
            ");
            $stmt->execute([$user_id]);
        } elseif ($email) {
            $stmt = $pdo->prepare("
                SELECT u.*, ps.stripe_customer_id 
                FROM users u
                LEFT JOIN premium_subscriptions ps ON u.id = ps.user_id AND ps.status = 'active'
                WHERE u.email = ? AND u.status = 'active'
            ");
            $stmt->execute([$email]);
        } else {
            handleError("Paramètre requis: user_id ou email", 400);
        }
        
        $user = $stmt->fetch();
        
        if (!$user) {
            // Utilisateur non trouvé - proposer la création
            jsonResponse(false, [
                'user_found' => false,
                'suggestion' => 'Utilisateur non trouvé. Utilisez POST pour créer un nouvel utilisateur.'
            ], "Utilisateur non trouvé", 404);
        }
        
        // Logger l'accès (avec gestion d'erreur)
        try {
            logUserAction($user['id'], 'get_user_profile');
        } catch (Exception $e) {
            // Ignorer les erreurs de log pour ne pas faire échouer la requête
            error_log("Warning: Impossible de logger l'action: " . $e->getMessage());
        }
        
        // 🚀 NOUVEAU : Mettre à jour last_login et login_count (avec vérification des colonnes)
        try {
            // Vérifier si les colonnes existent avant de les utiliser
            $columnsCheck = $pdo->query("SHOW COLUMNS FROM users LIKE 'last_login'");
            $hasLastLogin = $columnsCheck->rowCount() > 0;
            
            $columnsCheck = $pdo->query("SHOW COLUMNS FROM users LIKE 'login_count'");
            $hasLoginCount = $columnsCheck->rowCount() > 0;
            
            $columnsCheck = $pdo->query("SHOW COLUMNS FROM users LIKE 'last_seen'");
            $hasLastSeen = $columnsCheck->rowCount() > 0;
            
            // Construire la requête UPDATE dynamiquement
            $updateFields = [];
            $updateParams = [];
            
            if ($hasLastLogin) {
                $updateFields[] = "last_login = NOW()";
            }
            if ($hasLoginCount) {
                $updateFields[] = "login_count = login_count + 1";
            }
            if ($hasLastSeen) {
                $updateFields[] = "last_seen = NOW()";
            }
            
            // Ajouter last_sync_time si la colonne existe
            $columnsCheck = $pdo->query("SHOW COLUMNS FROM users LIKE 'last_sync_time'");
            $hasLastSyncTime = $columnsCheck->rowCount() > 0;
            if ($hasLastSyncTime) {
                $updateFields[] = "last_sync_time = NOW()";
            }
            
            if (!empty($updateFields)) {
                $updateQuery = "UPDATE users SET " . implode(", ", $updateFields) . " WHERE id = ?";
                $updateLoginStmt = $pdo->prepare($updateQuery);
                $updateLoginStmt->execute([$user['id']]);
            }
        } catch (Exception $e) {
            // Ignorer les erreurs de mise à jour des colonnes manquantes
            error_log("Warning: Impossible de mettre à jour les colonnes de connexion: " . $e->getMessage());
        }
        
        // Récupérer l'utilisateur avec toutes les données mises à jour + stripe_customer_id
        $userStmt = $pdo->prepare("
            SELECT u.*, ps.stripe_customer_id 
            FROM users u
            LEFT JOIN premium_subscriptions ps ON u.id = ps.user_id AND ps.status = 'active'
            WHERE u.id = ?
        ");
        $userStmt->execute([$user['id']]);
        $user = $userStmt->fetch(PDO::FETCH_ASSOC);
        
        // Formater et retourner les données
        $formattedUser = formatUserData($user);
        jsonResponse(true, $formattedUser, "Données utilisateur récupérées");
        
    } catch (Exception $e) {
        error_log("Erreur dans handleGetUser: " . $e->getMessage());
        jsonResponse(false, [
            'user_found' => false,
            'error' => 'Erreur base de données',
            'details' => $e->getMessage()
        ], "Erreur lors de la récupération de l'utilisateur", 500);
    }
}

/**
 * POST /api/users.php - Créer un nouvel utilisateur
 */
function handleCreateUser() {
    global $data;
    try {
        // Validation des données d'entrée
        $rules = [
            'language' => ['required' => false, 'type' => 'string', 'max_length' => 10],
            'email' => ['required' => false, 'type' => 'email', 'max_length' => 255],
            'password' => ['required' => false, 'type' => 'string', 'min_length' => 6, 'max_length' => 50],
            'user_first_name' => ['required' => false, 'type' => 'string', 'max_length' => 100],
            'user_last_name' => ['required' => false, 'type' => 'string', 'max_length' => 100]
        ];
        
        $errors = validateInput($data, $rules);
        if (!empty($errors)) {
            handleError("Erreurs de validation", 400, $errors);
        }
        
        $pdo = getDBConnection();
        
        if ($pdo === null) {
            error_log("ERROR: getDBConnection() a retourné null dans handleCreateUser()");
            handleError("Erreur de connexion à la base de données", 500);
            return;
        }
        
        // 🔄 NOUVEAU : Gérer intelligemment les utilisateurs existants pour les renouvellements
        if (!empty($data['email'])) {
            $checkStmt = $pdo->prepare("SELECT id, premium_status, premium_expiry FROM users WHERE email = ? AND status = 'active'");
            $checkStmt->execute([$data['email']]);
            $existingUser = $checkStmt->fetch();
            
            if ($existingUser) {
                // 🎯 Si c'est un renouvellement/upgrade premium, mettre à jour au lieu de bloquer
                if (isset($data['premium_status']) && $data['premium_status'] == 1) {
                    error_log("🔄 Utilisateur existant - Mise à jour premium pour: " . $data['email']);
                    
                    // Mettre à jour le statut premium de l'utilisateur existant
                    $updateStmt = $pdo->prepare("
                        UPDATE users SET 
                            premium_status = ?, 
                            subscription_type = ?, 
                            subscription_id = ?, 
                            premium_expiry = ?,
                            premium_activated_at = NOW(),
                            updated_at = NOW()
                        WHERE id = ?
                    ");
                    
                    $updateStmt->execute([
                        $data['premium_status'],
                        $data['subscription_type'] ?? null,
                        $data['subscription_id'] ?? null,
                        $data['premium_expiry'] ?? null,
                        $existingUser['id']
                    ]);
                    
                    // Retourner les données de l'utilisateur mis à jour + stripe_customer_id
                    $userStmt = $pdo->prepare("
                        SELECT u.*, ps.stripe_customer_id 
                        FROM users u
                        LEFT JOIN premium_subscriptions ps ON u.id = ps.user_id AND ps.status = 'active'
                        WHERE u.id = ?
                    ");
                    $userStmt->execute([$existingUser['id']]);
                    $updatedUser = $userStmt->fetch();
                    
                    jsonResponse(true, formatUserData($updatedUser), "Abonnement premium renouvelé avec succès");
                    return;
                } else {
                    // Blocage seulement pour les créations normales (non-premium)
                    handleError("Un utilisateur avec cet email existe déjà", 409);
                }
            }
        }

        // 🚀 CORRECTION : Gestion du statut premium depuis les données POST
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

        // 🚀 FALLBACK : Vérifier si l'utilisateur a déjà acheté le premium dans premium_purchases
        if ($premium_status === 0 && !empty($data['user_id'])) {
            $premiumCheckStmt = $pdo->prepare("
                SELECT subscription_type, subscription_id, premium_expiry 
                FROM premium_purchases 
                WHERE user_id = ? AND status = 'active' 
                ORDER BY created_at DESC 
                LIMIT 1
            ");
            $premiumCheckStmt->execute([$data['user_id']]);
            $premiumPurchase = $premiumCheckStmt->fetch();
            
            if ($premiumPurchase) {
                $premium_status = 1;
                $subscription_type = $premiumPurchase['subscription_type'];
                $subscription_id = $premiumPurchase['subscription_id'];
                $premium_expiry = $premiumPurchase['premium_expiry'];
            }
        }

        // 🚀 CORRECTION : Récupérer les données de localisation transmises
        $location_mode = $data['location_mode'] ?? 'auto';
        $location_city = $data['location_city'] ?? null;
        $location_country = $data['location_country'] ?? null;
        $location_lat = $data['location_lat'] ?? null;
        $location_lon = $data['location_lon'] ?? null;

        // Logger les données reçues pour debug
        error_log("📍 [users.php] Données de localisation reçues: mode=$location_mode, city=$location_city, lat=$location_lat, lon=$location_lon");
        error_log("📊 [users.php] Données premium reçues: status=$premium_status, type=$subscription_type, id=$subscription_id, expiry=$premium_expiry");
        
        // 🚀 NOUVEAU : Hasher le mot de passe si fourni
        $password_hash = null;
        if (!empty($data['password'])) {
            $password_hash = password_hash($data['password'], PASSWORD_DEFAULT);
        }
        
        // 🚀 CORRECTION : Insérer le nouvel utilisateur - VERSION SIMPLE QUI FONCTIONNE
        $insertStmt = $pdo->prepare("
            INSERT INTO users (
                email, password_hash, user_first_name,
                language, premium_status, subscription_type, subscription_id, premium_expiry,
                status, created_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW()
            )
        ");
        
        $insertStmt->execute([
            $data['email'] ?? null,
            $password_hash,
            $data['user_first_name'] ?? null,
            $data['language'] ?? 'fr',
            $premium_status,
            $subscription_type,
            $subscription_id,
            $premium_expiry
        ]);
        
        $user_id = $pdo->lastInsertId();
        
        // Logger la création avec plus de détails
        logUserAction($user_id, 'user_created', null, null, [
            'creation_method' => !empty($data['email']) ? 'email_registration' : 'device_registration',
            'has_premium' => $premium_status === 1,
            'has_location' => !empty($location_city) || (!empty($location_lat) && !empty($location_lon))
        ]);
        
        // Logger le résultat pour debug
        error_log("✅ [users.php] Utilisateur créé - ID: $user_id, premium_status: $premium_status, location_city: $location_city");
        
        // Récupérer et retourner l'utilisateur créé + stripe_customer_id
        $stmt = $pdo->prepare("
            SELECT u.*, ps.stripe_customer_id 
            FROM users u
            LEFT JOIN premium_subscriptions ps ON u.id = ps.user_id AND ps.status = 'active'
            WHERE u.id = ?
        ");
        $stmt->execute([$user_id]);
        $user = $stmt->fetch();
        
        $formattedUser = formatUserData($user);
        
        // Logger la réponse finale pour debug
        error_log("📤 [users.php] Réponse finale - premium_status: " . $formattedUser['premium_status'] . ", location_city: " . ($formattedUser['location_city'] ?? 'NULL'));
        
        jsonResponse(true, $formattedUser, "Utilisateur créé avec succès");
    } catch (Exception $e) {
        file_put_contents(__DIR__ . '/debug-create-user.txt', date('c') . ' - ERREUR CREATE: ' . $e->getMessage() . "\n", FILE_APPEND);
        handleError("Erreur lors de la création de l'utilisateur", 500, $e->getMessage());
    }
}

/**
 * PUT /api/users.php - Mettre à jour un utilisateur
 */
function handleUpdateUser() {
    global $data;
    
    // Validation des données d'entrée
    $rules = [
        'user_id' => ['required' => true, 'type' => 'integer'],
        'email' => ['required' => false, 'type' => 'email', 'max_length' => 255],
        'password' => ['required' => false, 'type' => 'string', 'min_length' => 6, 'max_length' => 50],
        'user_first_name' => ['required' => false, 'type' => 'string', 'max_length' => 100],
        'language' => ['required' => false, 'type' => 'string', 'max_length' => 10],
        'premium_status' => ['required' => false, 'type' => 'integer', 'min' => 0, 'max' => 1],
        'subscription_type' => ['required' => false, 'type' => 'string'],
        'subscription_id' => ['required' => false, 'type' => 'string'],
        'premium_expiry' => ['required' => false, 'type' => 'datetime'],
        'location_mode' => ['required' => false, 'type' => 'string'],
        'location_city' => ['required' => false, 'type' => 'string'],
        'location_country' => ['required' => false, 'type' => 'string'],
        'location_lat' => ['required' => false, 'type' => 'decimal'],
        'location_lon' => ['required' => false, 'type' => 'decimal'],
        'calc_method' => ['required' => false, 'type' => 'string'],
        'adhan_sound' => ['required' => false, 'type' => 'string'],
        'adhan_volume' => ['required' => false, 'type' => 'decimal'],
        'notifications_enabled' => ['required' => false, 'type' => 'integer'],
        'reminders_enabled' => ['required' => false, 'type' => 'integer'],
        'reminder_offset' => ['required' => false, 'type' => 'integer'],
        'theme_mode' => ['required' => false, 'type' => 'string'],
        'audio_quality' => ['required' => false, 'type' => 'string'],
        'download_strategy' => ['required' => false, 'type' => 'string'],
        'enable_data_saving' => ['required' => false, 'type' => 'integer'],
        'max_cache_size' => ['required' => false, 'type' => 'integer']
    ];
    
    $errors = validateInput($data, $rules);
    if (!empty($errors)) {
        handleError("Erreurs de validation", 400, $errors);
    }
    
    $pdo = getDBConnection();
    
    if ($pdo === null) {
        error_log("ERROR: getDBConnection() a retourné null dans handleUpdateUser()");
        handleError("Erreur de connexion à la base de données", 500);
        return;
    }
    
    // Vérifier que l'utilisateur existe
    $checkStmt = $pdo->prepare("SELECT id FROM users WHERE id = ? AND status = 'active'");
    $checkStmt->execute([$data['user_id']]);
    if (!$checkStmt->fetch()) {
        handleError("Utilisateur non trouvé", 404);
    }
    
    // 🚀 NOUVEAU : Hasher le mot de passe si fourni
    $password_hash = null;
    if (!empty($data['password'])) {
        $password_hash = password_hash($data['password'], PASSWORD_DEFAULT);
    }
    
    // Construire la requête de mise à jour dynamiquement
    $updateFields = [];
    $updateValues = [];
    
    $fieldsToUpdate = [
        'email', 'password_hash', 'user_first_name',
        'language', 'premium_status', 'subscription_type', 
        'subscription_id', 'premium_expiry', 'location_mode', 'location_city',
        'location_country', 'location_lat', 'location_lon', 'calc_method',
        'adhan_sound', 'adhan_volume', 'notifications_enabled', 'reminders_enabled',
        'reminder_offset', 'theme_mode', 'audio_quality', 'download_strategy',
        'enable_data_saving', 'max_cache_size'
    ];
    
    foreach ($fieldsToUpdate as $field) {
        if (isset($data[$field])) {
            $updateFields[] = "$field = ?";
            $updateValues[] = $data[$field];
        }
    }
    
    // Ajouter password_hash si fourni
    if ($password_hash) {
        $updateFields[] = "password_hash = ?";
        $updateValues[] = $password_hash;
    }
    
    if (empty($updateFields)) {
        handleError("Aucun champ à mettre à jour", 400);
    }
    
    $updateFields[] = "updated_at = NOW()";
    $updateValues[] = $data['user_id'];
    
    $sql = "UPDATE users SET " . implode(', ', $updateFields) . " WHERE id = ?";
    $updateStmt = $pdo->prepare($sql);
    $updateStmt->execute($updateValues);
    
    // Logger la mise à jour
    logUserAction($data['user_id'], 'user_updated', null, null, [
        'updated_fields' => array_keys(array_filter($data, function($value) { return $value !== null; }))
    ]);
    
    // Récupérer et retourner l'utilisateur mis à jour + stripe_customer_id
    $stmt = $pdo->prepare("
        SELECT u.*, ps.stripe_customer_id 
        FROM users u
        LEFT JOIN premium_subscriptions ps ON u.id = ps.user_id AND ps.status = 'active'
        WHERE u.id = ?
    ");
    $stmt->execute([$data['user_id']]);
    $user = $stmt->fetch();
    
    $formattedUser = formatUserData($user);
    jsonResponse(true, $formattedUser, "Utilisateur mis à jour avec succès");
}

/**
 * POST /api/users.php {"action": "sync_premium_purchase", "user_id": "xxx", ...}
 * Synchroniser un achat premium avec la base de données
 */
function handleSyncPremiumPurchase() {
    global $data;
    
    $validations = [
        'user_id' => ['required' => true, 'type' => 'integer'],
        'subscription_type' => ['required' => true, 'type' => 'string', 'max_length' => 50],
        'subscription_id' => ['required' => true, 'type' => 'string', 'max_length' => 255],
        'premium_expiry' => ['required' => true, 'type' => 'string', 'max_length' => 50],
        'purchase_date' => ['required' => false, 'type' => 'string', 'max_length' => 50],
        'purchase_amount' => ['required' => false, 'type' => 'string', 'max_length' => 20]
    ];
    
    $errors = validateInput($data, $validations);
    if (!empty($errors)) {
        handleError("Erreurs de validation", 400, $errors);
    }
    
    $pdo = getDBConnection();
    
    if ($pdo === null) {
        error_log("ERROR: getDBConnection() a retourné null dans handleSyncPremiumPurchase()");
        handleError("Erreur de connexion à la base de données", 500);
        return;
    }
    
    // Récupérer l'utilisateur par user_id
    $userStmt = $pdo->prepare("SELECT id FROM users WHERE id = ? AND status = 'active'");
    $userStmt->execute([$data['user_id']]);
    $user = $userStmt->fetch();
    
    if (!$user) {
        handleError("Utilisateur non trouvé", 404);
    }
    
    $user_id = $user['id'];
    
    // Mettre à jour les informations premium
    $updateStmt = $pdo->prepare("
        UPDATE users SET 
        premium_status = 1,
        subscription_type = ?,
        subscription_id = ?,
        premium_expiry = ?,
        updated_at = NOW()
        WHERE id = ?
    ");
    
    $updateStmt->execute([
        $data['subscription_type'],
        $data['subscription_id'],
        $data['premium_expiry'],
        $user_id
    ]);
    
    // Enregistrer l'achat dans la table des achats premium
    $purchaseStmt = $pdo->prepare("
        INSERT INTO premium_purchases (
        user_id, subscription_type, subscription_id, premium_expiry,
        purchase_date, purchase_amount, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())
    ");
    
    $purchaseStmt->execute([
        $user_id,
        $data['subscription_type'],
        $data['subscription_id'],
        $data['premium_expiry'],
        $data['purchase_date'] ?? date('Y-m-d H:i:s'),
        $data['purchase_amount'] ?? null
    ]);
    
    jsonResponse(true, [
        'user_id' => $user_id,
        'subscription_type' => $data['subscription_type'],
        'subscription_id' => $data['subscription_id'],
        'premium_expiry' => $data['premium_expiry'],
        'message' => 'Achat premium synchronisé avec succès'
    ], "Achat premium synchronisé avec succès");
}

/**
 * 🚀 NOUVEAU : Formater les données utilisateur pour l'API
 * Supprime les champs sensibles et formate les données
 */
function formatUserData($user) {
    if (!$user) {
        return null;
    }
    
    // Champs à exclure (données sensibles)
    $excludedFields = [
        'password_hash', 'verification_token', 'reset_password_token',
        'reset_password_expires', 'login_attempts', 'account_locked',
        'account_locked_until'
    ];
    
    // Filtrer les champs sensibles
    $formattedUser = [];
    foreach ($user as $key => $value) {
        if (!in_array($key, $excludedFields)) {
            $formattedUser[$key] = $value;
        }
    }
    
    // 🚀 NOUVEAU : Ajouter des champs calculés avec vérification d'existence
    $formattedUser['has_password'] = !empty($user['password_hash'] ?? '');
    
    // 🎯 VIP SYSTEM : Vérifier le statut VIP pour le premium gratuit
    $isVip = (bool)($user['is_vip'] ?? 0);
    $hasPremiumStatus = (bool)($user['premium_status'] ?? 0);
    
    // Un utilisateur est premium s'il a un abonnement payant OU s'il est VIP
    $formattedUser['is_premium'] = $hasPremiumStatus || $isVip;
    $formattedUser['premium_active'] = false;
    
    // 🎯 VIP SYSTEM : Ajouter les champs VIP
    $formattedUser['is_vip'] = $isVip;
    $formattedUser['vip_reason'] = $user['vip_reason'] ?? null;
    $formattedUser['vip_granted_by'] = $user['vip_granted_by'] ?? null;
    $formattedUser['vip_granted_at'] = $user['vip_granted_at'] ?? null;
    
    // 🚀 CORRECTION : S'assurer que les champs premium sont bien présents avec valeurs par défaut
    $formattedUser['premium_status'] = (int)($user['premium_status'] ?? 0);
    $formattedUser['subscription_type'] = $user['subscription_type'] ?? null;
    $formattedUser['subscription_id'] = $user['subscription_id'] ?? null;
    $formattedUser['premium_expiry'] = $user['premium_expiry'] ?? null;
    $formattedUser['premium_activated_at'] = $user['premium_activated_at'] ?? null;
    
    // 🎯 VIP SYSTEM : Premium type pour l'affichage
    if ($isVip) {
        $formattedUser['premium_type'] = 'VIP Gratuit à Vie';
        $formattedUser['premium_active'] = true; // VIP = toujours actif
    } else if ($hasPremiumStatus && ($user['premium_expiry'] ?? null)) {
        // Vérifier si le premium payant est encore actif
        try {
            $expiryDate = new DateTime($user['premium_expiry']);
            $now = new DateTime();
            $formattedUser['premium_active'] = $expiryDate > $now;
            $formattedUser['premium_type'] = $formattedUser['premium_active'] ? 'Premium Payant' : 'Premium Expiré';
        } catch (Exception $e) {
            error_log("Warning: Erreur parsing date premium_expiry: " . $e->getMessage());
            $formattedUser['premium_active'] = false;
            $formattedUser['premium_type'] = 'Premium Expiré';
        }
    } else {
        $formattedUser['premium_type'] = 'Gratuit';
    }
    
    // 🚀 DEBUG : Logger les données premium formatées
    error_log("🔍 formatUserData - Données premium formatées: " . json_encode([
        'premium_status' => $formattedUser['premium_status'],
        'subscription_type' => $formattedUser['subscription_type'],
        'subscription_id' => $formattedUser['subscription_id'],
        'premium_expiry' => $formattedUser['premium_expiry'],
        'premium_activated_at' => $formattedUser['premium_activated_at'],
        'is_premium' => $formattedUser['is_premium'],
        'premium_active' => $formattedUser['premium_active']
    ]));
    
    return $formattedUser;
}

/**
 * 🚀 NOUVEAU : Sauvegarder un backup utilisateur
 * POST avec action=save_backup
 */
function handleSaveBackup() {
    global $data;
    
    // Validation des données
    $rules = [
        'user_id' => ['required' => true, 'type' => 'integer'],
        'backup_data' => ['required' => true, 'type' => 'string'],
        'backup_type' => ['required' => false, 'type' => 'string'],
        'backup_name' => ['required' => false, 'type' => 'string'] // On l'accepte mais on ne l'utilise pas
    ];
    
    $errors = validateInput($data, $rules);
    if (!empty($errors)) {
        handleError("Erreurs de validation", 400, $errors);
    }
    
    $pdo = getDBConnection();
    
    if ($pdo === null) {
        error_log("ERROR: getDBConnection() a retourné null dans handleSaveBackup()");
        handleError("Erreur de connexion à la base de données", 500);
        return;
    }
    
    // Récupérer l'utilisateur par user_id - CRÉER s'il n'existe pas
    $userStmt = $pdo->prepare("SELECT id FROM users WHERE id = ? AND status = 'active'");
    $userStmt->execute([$data['user_id']]);
    $user = $userStmt->fetch();
    
    if (!$user) {
        // Créer automatiquement l'utilisateur pour le backup - VERSION SIMPLIFIÉE
        $createUserStmt = $pdo->prepare("
            INSERT INTO users (
                id, language, premium_status, status, created_at
            ) VALUES (
                ?, 'fr', 0, 'active', NOW()
            )
        ");
        
        $createUserStmt->execute([$data['user_id']]);
        $user_id = $data['user_id'];
        
        error_log("📦 Utilisateur créé automatiquement pour backup: user_id=" . $data['user_id']);
    } else {
        $user_id = $user['id'];
    }
    
    // 🚀 OPTIMISATION : Supprimer TOUS les anciens backups pour ne garder qu'un seul backup par utilisateur
    $deleteOldStmt = $pdo->prepare("DELETE FROM user_backups WHERE user_id = ?");
    $deleteOldStmt->execute([$user_id]);
    
    // Préparer les données pour le backup avec métadonnées
    $backup_type = $data['backup_type'] ?? 'manual';
    $backup_size = strlen($data['backup_data']);
    
    // Créer le nouveau backup (structure corrigée pour colonnes existantes)
    $insertStmt = $pdo->prepare("
        INSERT INTO user_backups (
            user_id, backup_data, backup_size, backup_type, backup_name,
            created_at
        ) VALUES (
            ?, ?, ?, ?, ?, NOW()
        )
    ");
    
    $insertStmt->execute([
        $user_id,
        $data['backup_data'],
        $backup_size,
        $backup_type,
        "Backup-" . date('Y-m-d')
    ]);
    
    $backup_id = $pdo->lastInsertId();
    
    // 🚀 CORRECTION CRITIQUE : Synchroniser les paramètres importants avec la table users
    $backupJson = json_decode($data['backup_data'], true);
    
    // 📝 DEBUG : Logger la structure complète pour comprendre le format
    error_log("🔍 DEBUG BACKUP - Structure complète : " . json_encode($backupJson, JSON_PRETTY_PRINT));
    
    if ($backupJson && isset($backupJson['settings'])) {
        $settingsRoot = $backupJson['settings'];
        
        // 🚀 CORRECTION : Utiliser directement les paramètres du niveau racine
        $settings = $settingsRoot;
        
        error_log("🔍 DEBUG BACKUP - Paramètres extraits : " . json_encode($settings));
        
        // Préparer les champs à mettre à jour
        $updateFields = [];
        $updateValues = [];
        
        // Mapper les paramètres du backup vers les colonnes users
        $settingsMapping = [
            'calcMethod' => 'calc_method',
            'adhanSound' => 'adhan_sound', 
            'adhanVolume' => 'adhan_volume',
            'locationMode' => 'location_mode',
            'currentLanguage' => 'language',  // 🚀 CORRECTION : currentLanguage au lieu de language
            'userFirstName' => 'user_first_name',
            'notificationsEnabled' => 'notifications_enabled',
            'remindersEnabled' => 'reminders_enabled',
            'reminderOffset' => 'reminder_offset',
            'themeMode' => 'theme_mode',
            'audioQuality' => 'audio_quality',
            'downloadStrategy' => 'download_strategy',
            'enableDataSaving' => 'enable_data_saving',
            'maxCacheSize' => 'max_cache_size'
        ];
        
        // Ajouter les champs de localisation
        if (isset($settings['manualLocation'])) {
            $location = $settings['manualLocation'];
            if (!empty($location['city'])) {
                $updateFields[] = 'location_city = ?';
                $updateValues[] = $location['city'];
            }
            if (!empty($location['country'])) {
                $updateFields[] = 'location_country = ?';
                $updateValues[] = $location['country'];
            }
            if (isset($location['lat'])) {
                $updateFields[] = 'location_lat = ?';
                $updateValues[] = floatval($location['lat']);
            }
            if (isset($location['lon'])) {
                $updateFields[] = 'location_lon = ?';
                $updateValues[] = floatval($location['lon']);
            }
        }
        
        // Mapper les paramètres du backup
        foreach ($settingsMapping as $backupKey => $dbColumn) {
            if (isset($settings[$backupKey]) && $settings[$backupKey] !== null) {
                $updateFields[] = "$dbColumn = ?";
                $updateValues[] = $settings[$backupKey];
            }
        }
        
        // 🚀 CORRECTION : Paramètres dhikr maintenant dans la structure dhikrSettings
        if (isset($settings['dhikrSettings'])) {
            $dhikr = $settings['dhikrSettings'];
            $dhikrMapping = [
                'enabledAfterSalah' => 'dhikr_after_salah_enabled',
                'delayAfterSalah' => 'dhikr_after_salah_delay',
                'enabledMorningDhikr' => 'dhikr_morning_enabled', 
                'delayMorningDhikr' => 'dhikr_morning_delay',
                'enabledEveningDhikr' => 'dhikr_evening_enabled',
                'delayEveningDhikr' => 'dhikr_evening_delay',
                'enabledSelectedDua' => 'dhikr_selected_dua_enabled',
                'delaySelectedDua' => 'dhikr_selected_dua_delay'
            ];
            
            foreach ($dhikrMapping as $dhikrKey => $dbColumn) {
                if (isset($dhikr[$dhikrKey])) {
                    $updateFields[] = "$dbColumn = ?";
                    $updateValues[] = $dhikr[$dhikrKey] ? 1 : 0;
                }
            }
        } else {
            // 📊 FALLBACK : Paramètres dhikr directement dans settings (ancien système)
            $dhikrMappingDirect = [
                'enabledAfterSalah' => 'dhikr_after_salah_enabled',
                'delayAfterSalah' => 'dhikr_after_salah_delay',
                'enabledMorningDhikr' => 'dhikr_morning_enabled', 
                'delayMorningDhikr' => 'dhikr_morning_delay',
                'enabledEveningDhikr' => 'dhikr_evening_enabled',
                'delayEveningDhikr' => 'dhikr_evening_delay',
                'enabledSelectedDua' => 'dhikr_selected_dua_enabled',
                'delaySelectedDua' => 'dhikr_selected_dua_delay'
            ];
            
            foreach ($dhikrMappingDirect as $dhikrKey => $dbColumn) {
                if (isset($settings[$dhikrKey])) {
                    $updateFields[] = "$dbColumn = ?";
                    $updateValues[] = $settings[$dhikrKey] ? 1 : 0;
                }
            }
        }
        
        // Mettre à jour la table users si on a des champs à modifier
        if (!empty($updateFields)) {
            $updateFields[] = 'updated_at = NOW()';
            $updateValues[] = $user_id;
            
            $updateSql = "UPDATE users SET " . implode(', ', $updateFields) . " WHERE id = ?";
            $updateStmt = $pdo->prepare($updateSql);
            $updateStmt->execute($updateValues);
            
            error_log("📦 CORRECTION: Paramètres utilisateur synchronisés - " . (count($updateFields) - 1) . " champs mis à jour");
            error_log("📦 CORRECTION: SQL exécuté : " . $updateSql);
            error_log("📦 CORRECTION: Valeurs : " . json_encode($updateValues));
        } else {
            error_log("⚠️ ATTENTION: Aucun champ à mettre à jour trouvé dans le backup !");
        }
    } else {
        error_log("⚠️ ATTENTION: Pas de section 'settings' trouvée dans le backup JSON !");
    }
    
    // Logger l'action
    logUserAction($user_id, 'backup_saved', 'backup', $backup_id, [
        'backup_type' => $backup_type,
        'backup_size' => $backup_size,
        'backup_name' => "Backup-" . date('Y-m-d'),
        'fields_updated' => isset($updateFields) ? count($updateFields) : 0
    ]);
    
    jsonResponse(true, [
        'backup_id' => $backup_id,
        'backup_type' => $backup_type,
        'backup_size' => $backup_size,
        'user_id' => $user_id,
        'backup_name' => "Backup-" . date('Y-m-d')
    ], "Backup sauvegardé avec succès");
}

/**
 * 🚀 NOUVEAU : Récupérer les backups utilisateur
 * POST avec action=get_backups
 */
function handleGetBackups() {
    global $data;
    
    // Validation des données
    $rules = [
        'user_id' => ['required' => true, 'type' => 'integer']
    ];
    
    $errors = validateInput($data, $rules);
    if (!empty($errors)) {
        handleError("Erreurs de validation", 400, $errors);
    }
    
    $pdo = getDBConnection();
    
    if ($pdo === null) {
        error_log("ERROR: getDBConnection() a retourné null dans handleGetBackups()");
        handleError("Erreur de connexion à la base de données", 500);
        return;
    }
    
    // Récupérer l'utilisateur par user_id
    $userStmt = $pdo->prepare("SELECT id FROM users WHERE id = ? AND status = 'active'");
    $userStmt->execute([$data['user_id']]);
    $user = $userStmt->fetch();
    
    if (!$user) {
        jsonResponse(false, [], "Aucun utilisateur trouvé avec ce user_id", 404);
        return;
    }
    
    $user_id = $user['id'];
    
    // 🚀 OPTIMISATION : Récupérer seulement le backup le plus récent (un seul par utilisateur)
    $backupsStmt = $pdo->prepare("
        SELECT id, backup_data, backup_size, backup_type, backup_name, created_at
        FROM user_backups 
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 1
    ");
    
    $backupsStmt->execute([$user_id]);
    $backups = $backupsStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Logger l'action
    logUserAction($user_id, 'backups_retrieved', 'backup', null, [
        'backups_count' => count($backups),
        'strategy' => 'single_backup_per_user'
    ]);
    
    jsonResponse(true, $backups, "Backups récupérés avec succès");
}
?> 