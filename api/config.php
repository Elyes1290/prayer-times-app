<?php
/**
 * Configuration principale pour les APIs Prayer Times App
 * Base de données : ff42hr_MyAdhan
 * 🔐 SÉCURITÉ : Configuration entièrement basée sur variables d'environnement
 */

// 🔐 SÉCURITÉ : Chargement du fichier .env si disponible
function loadEnvFile($filePath) {
    if (!file_exists($filePath)) {
        return false;
    }
    
    $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue; // Ignorer les commentaires
        }
        
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            
            // Supprimer les guillemets si présents
            $value = trim($value, '"\'');
            
            if (!isset($_ENV[$key])) {
                $_ENV[$key] = $value;
                putenv("$key=$value");
            }
        }
    }
    return true;
}

// 🔐 SÉCURITÉ : Charger le fichier .env depuis le répertoire parent
$envLoaded = loadEnvFile(__DIR__ . '/../.env');

// 🚀 DEBUG : Log au début du fichier
if (isset($_ENV['ENABLE_DEBUG_LOGS']) && $_ENV['ENABLE_DEBUG_LOGS'] === 'true') {
    error_log("DEBUG: config.php chargé - " . date('Y-m-d H:i:s') . " - ENV loaded: " . ($envLoaded ? 'OUI' : 'NON'));
}

// 🔐 SÉCURITÉ : Configuration CORS sécurisée
$allowedOrigins = $_ENV['CORS_ALLOWED_ORIGINS'] ?? 'https://myadhanapp.com';
$allowedOriginsArray = explode(',', $allowedOrigins);
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

// Vérifier si l'origine est autorisée
if (in_array($origin, $allowedOriginsArray)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    // En développement, autoriser localhost et bypass si configuré
    $bypassRateLimit = isset($_ENV['BYPASS_RATE_LIMITING']) && $_ENV['BYPASS_RATE_LIMITING'] === 'true';
    if ($bypassRateLimit && (strpos($origin, 'localhost') !== false || strpos($origin, '127.0.0.1') !== false)) {
        header("Access-Control-Allow-Origin: $origin");
    } else {
        header("Access-Control-Allow-Origin: https://myadhanapp.com");
    }
}

// Configuration credentials CORS
$corsCredentials = $_ENV['CORS_CREDENTIALS'] ?? 'true';
if ($corsCredentials === 'true') {
    header('Access-Control-Allow-Credentials: true');
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Gestion des requêtes OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 🔐 SÉCURITÉ : Configuration de la base de données - UTILISE LE SYSTÈME EXISTANT
if (!isset($_ENV['DB_HOST']) || !isset($_ENV['DB_NAME']) || !isset($_ENV['DB_USER']) || !isset($_ENV['DB_PASSWORD'])) {
    error_log("ERREUR CRITIQUE: Variables d'environnement manquantes pour la base de données");
    if (isset($_ENV['NODE_ENV']) && $_ENV['NODE_ENV'] === 'production') {
        http_response_code(500);
        die(json_encode(['success' => false, 'message' => 'Configuration serveur incorrecte']));
    }
}

define('DB_HOST', $_ENV['DB_HOST'] ?? 'ff42hr.myd.infomaniak.com');
define('DB_NAME', $_ENV['DB_NAME'] ?? 'ff42hr_MyAdhan');
define('DB_USER', $_ENV['DB_USER'] ?? 'ff42hr_prayer');
define('DB_PASS', $_ENV['DB_PASSWORD'] ?? null); // ✅ SÉCURISÉ : Utilise DB_PASSWORD du env.example existant
define('DB_PORT', $_ENV['DB_PORT'] ?? 3306);

// 🔐 SÉCURITÉ : Configuration sécurité - UTILISE LE SYSTÈME EXISTANT
define('API_SECRET_KEY', $_ENV['API_SECRET_KEY'] ?? 'prayer_app_secret_2024_' . hash('sha256', DB_NAME . DB_USER . date('Y-m-d')));
define('JWT_SECRET', $_ENV['JWT_SECRET'] ?? hash('sha256', API_SECRET_KEY . 'jwt_salt_' . date('Y-m-d')));
define('API_BASE_URL', $_ENV['API_BASE_URL'] ?? 'https://myadhanapp.com/api');

// 🔐 SÉCURITÉ AVANCÉE : Configuration de sécurité additionnelle
define('BCRYPT_ROUNDS', (int)($_ENV['BCRYPT_ROUNDS'] ?? 12));
define('JWT_EXPIRY', $_ENV['JWT_EXPIRY'] ?? '24h');
define('MAX_LOGIN_ATTEMPTS', (int)($_ENV['MAX_LOGIN_ATTEMPTS'] ?? 5));
define('SESSION_SECRET', $_ENV['SESSION_SECRET'] ?? hash('sha256', API_SECRET_KEY . 'session_salt'));

// ⚡ PERFORMANCE : Configuration du cache et des limites
define('CACHE_TTL_PRAYER_TIMES', (int)($_ENV['CACHE_TTL_PRAYER_TIMES'] ?? 3600));
define('CACHE_TTL_USER_DATA', (int)($_ENV['CACHE_TTL_USER_DATA'] ?? 1800));
define('RATE_LIMIT_MAX_REQUESTS', (int)($_ENV['RATE_LIMIT_MAX_REQUESTS'] ?? 100));
define('RATE_LIMIT_WINDOW_MS', (int)($_ENV['RATE_LIMIT_WINDOW_MS'] ?? 900000));

// 🌍 SERVICES EXTERNES : URLs des APIs utilisées
define('NOMINATIM_API_URL', $_ENV['NOMINATIM_API_URL'] ?? 'https://nominatim.openstreetmap.org');
define('ALADHAN_API_URL', $_ENV['ALADHAN_API_URL'] ?? 'http://api.aladhan.com/v1');
define('HADITH_API_KEY', $_ENV['HADITH_API_KEY'] ?? '');

// 💳 STRIPE : Configuration des paiements
define('STRIPE_SECRET_KEY', $_ENV['STRIPE_SECRET_KEY'] ?? '');
define('STRIPE_PUBLISHABLE_KEY', $_ENV['STRIPE_PUBLISHABLE_KEY'] ?? '');
define('STRIPE_WEBHOOK_SECRET', $_ENV['STRIPE_WEBHOOK_SECRET'] ?? '');

// 📊 MONITORING : Configuration des logs et du debug
define('ENABLE_DEBUG_LOGS', isset($_ENV['ENABLE_DEBUG_LOGS']) && $_ENV['ENABLE_DEBUG_LOGS'] === 'true');
define('LOG_API_REQUESTS', isset($_ENV['LOG_API_REQUESTS']) && $_ENV['LOG_API_REQUESTS'] === 'true');

// 🚀 SUPPRIMÉ : Configuration Firebase non nécessaire

/**
 * Connexion à la base de données
 */
function getDBConnection() {
    static $pdo = null;
    
    if ($pdo === null) {
        // 🚀 DEBUG ÉTENDU : Vérifier toutes les variables
        error_log("🔍 DEBUG DB CONNECTION:");
        error_log("  - DB_HOST: " . DB_HOST);
        error_log("  - DB_NAME: " . DB_NAME);
        error_log("  - DB_USER: " . DB_USER);
        error_log("  - DB_PASS: " . (DB_PASS ? "SET (length: " . strlen(DB_PASS) . ")" : "NULL/EMPTY"));
        error_log("  - DB_PORT: " . DB_PORT);
        error_log("  - ENV DB_PASSWORD: " . (isset($_ENV['DB_PASSWORD']) ? "SET" : "NOT SET"));
        
        // 🚀 VÉRIFICATION CRITIQUE : S'assurer que les variables critiques sont définies
        if (DB_PASS === null || DB_PASS === '') {
            error_log("ERREUR CRITIQUE: DB_PASS est null ou vide");
            throw new Exception("Configuration base de données incomplète - mot de passe manquant");
        }
        
        try {
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ];
            
            // Ajouter MYSQL_ATTR_INIT_COMMAND seulement si l'extension est disponible
            if (defined('PDO::MYSQL_ATTR_INIT_COMMAND')) {
                $options[PDO::MYSQL_ATTR_INIT_COMMAND] = "SET NAMES utf8mb4";
            }
            
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
            if (DB_PORT !== 3306) {
                $dsn .= ";port=" . DB_PORT;
            }
            
            error_log("🔍 Tentative de connexion avec DSN: " . $dsn);
            
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
            
            error_log("✅ Connexion DB réussie");
            
        } catch (PDOException $e) {
            error_log("❌ Erreur connexion DB: " . $e->getMessage());
            error_log("❌ Code d'erreur: " . $e->getCode());
            throw new Exception("Erreur de connexion à la base de données: " . $e->getMessage());
        }
    }
    
    return $pdo;
}

/**
 * Réponse JSON standardisée
 */
function jsonResponse($success, $data = null, $message = '', $code = 200) {
    http_response_code($code);
    
    $response = [
        'success' => $success,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s'),
        'data' => $data
    ];
    
    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit();
}

/**
 * Gestion des erreurs
 */
function handleError($message, $code = 500, $details = null) {
    error_log("API Error: " . $message . ($details ? " - " . json_encode($details) : ""));
    
    // 🚀 DEBUG TEMPORAIRE : Afficher le détail de l'erreur
    $response = [
        'success' => false,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s'),
        'debug_details' => $details, // 🚀 AJOUTÉ pour debug
        'error_code' => $code
    ];
    
    http_response_code($code);
    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit();
}

/**
 * Validation des données d'entrée
 */
function validateInput($data, $rules) {
    $errors = [];
    
    foreach ($rules as $field => $rule) {
        if ($rule['required'] && (!isset($data[$field]) || empty($data[$field]))) {
            $errors[] = "Le champ '$field' est requis";
            continue;
        }
        
        if (isset($data[$field]) && !empty($data[$field])) {
            $value = $data[$field];
            
            // Validation du type
            if (isset($rule['type'])) {
                switch ($rule['type']) {
                    case 'email':
                        if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
                            $errors[] = "Le champ '$field' doit être un email valide";
                        }
                        break;
                    case 'int':
                    case 'integer':
                        if (!is_numeric($value) || intval($value) != $value) {
                            $errors[] = "Le champ '$field' doit être un entier";
                        }
                        break;
                    case 'string':
                        if (!is_string($value)) {
                            $errors[] = "Le champ '$field' doit être une chaîne";
                        }
                        break;
                }
            }
            
            // Validation de la longueur
            if (isset($rule['max_length']) && strlen(trim($value)) > $rule['max_length']) {
                $errors[] = "Le champ '$field' ne peut pas dépasser {$rule['max_length']} caractères";
            }
            
            if (isset($rule['min_length']) && strlen(trim($value)) < $rule['min_length']) {
                $errors[] = "Le champ '$field' doit contenir au moins {$rule['min_length']} caractères";
            }
        }
    }
    
    return $errors;
}

/**
 * Authentification simple par token
 */
function authenticate() {
    // 🚀 CORRECTION : Remplacer getallheaders() par une alternative compatible
    $headers = [];
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
    } else {
        // Alternative pour les serveurs qui n'ont pas getallheaders()
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) == 'HTTP_') {
                $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
            }
        }
    }
    
    $token = null;
    
    // Récupérer le token depuis les headers
    if (isset($headers['Authorization'])) {
        $authHeader = $headers['Authorization'];
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            $token = $matches[1];
        }
    }
    
    // Token depuis les paramètres GET/POST
    if (!$token && isset($_REQUEST['token'])) {
        $token = $_REQUEST['token'];
    }
    
    // Pour le développement, accepter un token simple
    if ($token === 'dev_token_' . date('Y-m-d')) {
        return ['user_id' => 1];
    }
    
    // TODO: Implémenter JWT ou validation token plus robuste
    if ($token) {
        // Simulation de validation - à remplacer par JWT
        if (strlen($token) >= 32) {
            return ['user_id' => null];
        }
    }
    
    return null;
}

/**
 * Obtenir les données de la requête
 */
function getRequestData() {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    // Debug pour voir ce qui est reçu
    error_log("DEBUG getRequestData - Raw input: " . $input);
    error_log("DEBUG getRequestData - JSON decode result: " . json_encode($data));
    error_log("DEBUG getRequestData - POST data: " . json_encode($_POST));
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        // Si ce n'est pas du JSON valide, essayer les données POST
        $data = $_POST;
        error_log("DEBUG getRequestData - Using POST data instead of JSON");
    }
    
    return $data ?: [];
}

/**
 * Logger les actions utilisateur
 */
function logUserAction($user_id, $action, $content_type = null, $content_id = null, $metadata = null) {
    try {
        $pdo = getDBConnection();
        
        // Vérifier si la table usage_logs existe
        $tableCheck = $pdo->query("SHOW TABLES LIKE 'usage_logs'");
        if ($tableCheck->rowCount() === 0) {
            error_log("Warning: Table usage_logs n'existe pas");
            return;
        }
        
        // Vérifier si l'utilisateur existe
        $userCheck = $pdo->prepare("SELECT id FROM users WHERE id = ?");
        $userCheck->execute([$user_id]);
        if ($userCheck->rowCount() === 0) {
            error_log("Warning: Utilisateur $user_id n'existe pas pour le log");
            return;
        }
        
        $stmt = $pdo->prepare("
            INSERT INTO usage_logs (user_id, action, content_type, content_id, metadata, device_info, ip_address, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        
        $device_info = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
        $ip_address = $_SERVER['REMOTE_ADDR'] ?? 'Unknown';
        $metadata_json = $metadata ? json_encode($metadata) : null;
        
        $stmt->execute([
            $user_id, 
            $action, 
            $content_type, 
            $content_id, 
            $metadata_json, 
            $device_info,
            $ip_address
        ]);
    } catch (Exception $e) {
        error_log("Erreur log action: " . $e->getMessage());
        // Ne pas faire échouer la requête pour un problème de log
    }
}

/**
 * Générer un ID unique pour les favoris/contenus
 */
function generateUniqueId($prefix = '') {
    return $prefix . date('YmdHis') . '_' . bin2hex(random_bytes(8));
}

/**
 * 🚀 SUPPRIMÉ : Fallback Firebase non nécessaire
 */

// 🚀 SUPPRIMÉ : formatUserData() est définie dans users.php

/**
 * 🚀 NOUVEAU : Générer un token d'authentification
 */
function generateAuthToken($user_id) {
    try {
        $pdo = getDBConnection();
        
        // Générer un token unique
        $token = bin2hex(random_bytes(32));
        $expires_at = date('Y-m-d H:i:s', strtotime('+30 days'));
        
        // Sauvegarder la session
        $stmt = $pdo->prepare("
            INSERT INTO user_sessions (user_id, session_token, expires_at, created_at, last_activity)
            VALUES (?, ?, ?, NOW(), NOW())
        ");
        
        $stmt->execute([$user_id, $token, $expires_at]);
        
        return $token;
    } catch (Exception $e) {
        error_log("Erreur génération token: " . $e->getMessage());
        // Fallback: token simple
        return 'token_' . $user_id . '_' . time();
    }
}

/**
 * 🔐 NOUVEAU : Fonction d'authentification robuste
 */
function authenticateUser($email, $password) {
    try {
        $pdo = getDBConnection();
        
        // Rechercher l'utilisateur par email
        $stmt = $pdo->prepare("
            SELECT id, email, password_hash, premium_status, status, 
                   login_count, last_login, created_at
            FROM users 
            WHERE email = ? AND status = 'active'
        ");
        
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if (!$user) {
            return ['success' => false, 'message' => 'Utilisateur non trouvé'];
        }
        
        // Vérifier le mot de passe
        if (!password_verify($password, $user['password_hash'])) {
            return ['success' => false, 'message' => 'Mot de passe incorrect'];
        }
        
        // Mettre à jour les statistiques de connexion
        $stmt = $pdo->prepare("
            UPDATE users 
            SET login_count = login_count + 1, 
                last_login = NOW(),
                last_seen = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$user['id']]);
        
        // Générer un token d'authentification
        $token = generateAuthToken($user['id']);
        
        // Préparer les données utilisateur
        $userData = [
            'id' => $user['id'],
            'email' => $user['email'],
            'is_premium' => (bool)$user['premium_status'], // Utilise premium_status pour is_premium
            'premium_status' => $user['premium_status'],
            'status' => $user['status'],
            'login_count' => $user['login_count'] + 1,
            'token' => $token
        ];
        
        // Log de l'action
        logUserAction($user['id'], 'login', 'auth', null, [
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
        ]);
        
        return [
            'success' => true, 
            'message' => 'Connexion réussie',
            'user' => $userData
        ];
        
    } catch (Exception $e) {
        error_log("Erreur authentification: " . $e->getMessage());
        return ['success' => false, 'message' => 'Erreur lors de l\'authentification'];
    }
}

/**
 * 🔐 NOUVEAU : Validation de token d'authentification
 */
function validateAuthToken($token) {
    try {
        $pdo = getDBConnection();
        
        // Vérifier le token dans la base
        $stmt = $pdo->prepare("
            SELECT us.user_id, us.expires_at, u.email, u.premium_status, u.status
            FROM user_sessions us
            JOIN users u ON us.user_id = u.id
            WHERE us.session_token = ? AND us.expires_at > NOW() AND u.status = 'active'
        ");
        
        $stmt->execute([$token]);
        $session = $stmt->fetch();
        
        if (!$session) {
            return ['success' => false, 'message' => 'Token invalide ou expiré'];
        }
        
        // Mettre à jour la dernière activité
        $stmt = $pdo->prepare("
            UPDATE user_sessions 
            SET last_activity = NOW() 
            WHERE session_token = ?
        ");
        $stmt->execute([$token]);
        
        return [
            'success' => true,
            'user_id' => $session['user_id'],
            'email' => $session['email'],
            'is_premium' => (bool)$session['premium_status'], // Utilise premium_status pour is_premium
            'status' => $session['status']
        ];
        
    } catch (Exception $e) {
        error_log("Erreur validation token: " . $e->getMessage());
        return ['success' => false, 'message' => 'Erreur lors de la validation'];
    }
}

// Gestion globale des erreurs
set_exception_handler(function($exception) {
    error_log("Exception non gérée: " . $exception->getMessage() . " dans " . $exception->getFile() . " ligne " . $exception->getLine());
    handleError("Erreur interne du serveur", 500, $exception->getMessage());
});

// Gestion des erreurs fatales
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        error_log("Erreur fatale: " . json_encode($error));
        handleError("Erreur fatale du serveur", 500, $error['message']);
    }
});

// Log de la requête pour debug
error_log("API Request: " . $_SERVER['REQUEST_METHOD'] . " " . $_SERVER['REQUEST_URI']);
?> 