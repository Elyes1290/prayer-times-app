<?php
/**
 * 🔐 TEMPLATE DE CONFIGURATION SÉCURISÉE - Prayer Times App
 * Copiez ce fichier vers config.php et ajustez les variables d'environnement
 */

// 🚀 DEBUG : Log au début du fichier
error_log("DEBUG: config.php chargé - " . date('Y-m-d H:i:s'));

// En-têtes CORS pour React Native
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Gestion des requêtes OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 🔐 SÉCURITÉ : Configuration de la base de données via variables d'environnement
// IMPORTANT : Créez un fichier .env avec ces variables ou configurez-les sur votre serveur
define('DB_HOST', $_ENV['DB_HOST'] ?? 'localhost');
define('DB_NAME', $_ENV['DB_NAME'] ?? 'your_database_name');
define('DB_USER', $_ENV['DB_USER'] ?? 'your_database_user');
define('DB_PASS', $_ENV['DB_PASS'] ?? 'your_database_password');

// 🔐 SÉCURITÉ : Configuration sécurité via variables d'environnement
define('API_SECRET_KEY', $_ENV['API_SECRET_KEY'] ?? 'your_api_secret_key_here');
define('JWT_SECRET', $_ENV['JWT_SECRET'] ?? 'your_jwt_secret_here');

/**
 * Connexion à la base de données
 */
function getDBConnection() {
    try {
        $pdo = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4",
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_TIMEOUT => 30
            ]
        );
        
        return $pdo;
    } catch (PDOException $e) {
        error_log("Erreur connexion DB: " . $e->getMessage());
        throw new Exception("Erreur de connexion à la base de données");
    }
}

/**
 * Fonction pour générer des réponses API standardisées
 */
function sendApiResponse($success = true, $message = "", $data = null, $httpCode = 200) {
    http_response_code($httpCode);
    
    $response = [
        'success' => $success,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s'),
        'data' => $data
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit();
}

/**
 * Fonction pour valider les données d'entrée
 */
function validateInput($data, $required = []) {
    $errors = [];
    
    foreach ($required as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            $errors[] = "Champ requis manquant: $field";
        }
    }
    
    return $errors;
}

/**
 * Fonction pour nettoyer les données d'entrée
 */
function sanitizeInput($data) {
    if (is_array($data)) {
        return array_map('sanitizeInput', $data);
    }
    return htmlspecialchars(trim($data), ENT_QUOTES, 'UTF-8');
}

/**
 * Fonction pour logger les erreurs de manière sécurisée
 */
function logError($message, $context = []) {
    $logMessage = date('Y-m-d H:i:s') . ' - ' . $message;
    if (!empty($context)) {
        $logMessage .= ' - Context: ' . json_encode($context);
    }
    error_log($logMessage);
}

/**
 * Fonction pour vérifier les permissions API
 */
function checkApiPermission($requiredPermission = null) {
    // Implémentation future si nécessaire
    return true;
}

/**
 * Fonction pour hash les mots de passe de manière sécurisée
 */
function hashPassword($password) {
    return password_hash($password, PASSWORD_DEFAULT);
}

/**
 * Fonction pour vérifier les mots de passe
 */
function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

/**
 * Fonction pour générer des tokens sécurisés
 */
function generateSecureToken($length = 32) {
    return bin2hex(random_bytes($length));
}

/**
 * Fonction pour valider les adresses email
 */
function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

/**
 * Fonction pour limiter les tentatives de connexion (protection contre brute force)
 */
function checkRateLimit($identifier, $maxAttempts = 5, $timeWindow = 300) {
    // Implémentation future si nécessaire
    return true;
}

?> 