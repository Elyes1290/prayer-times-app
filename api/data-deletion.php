<?php
/**
 * API Suppression de Données - Prayer Times App
 * Endpoint pour les demandes de suppression de compte et données utilisateur
 * Conforme aux exigences Google Play Store
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = getRequestData();

try {
    if ($method === 'POST') {
        handleDataDeletionRequest();
    } else {
        handleError("Méthode non supportée", 405);
    }
} catch (Exception $e) {
    error_log("DATA DELETION API ERROR: " . $e->getMessage());
    handleError("Erreur dans l'API suppression de données", 500, $e->getMessage());
}

/**
 * POST /api/data-deletion.php
 * Gère les demandes de suppression de compte et données utilisateur
 */
function handleDataDeletionRequest() {
    global $data;
    
    // Validation des données requises
    $email = $data['email'] ?? '';
    $reason = $data['reason'] ?? '';
    $userMessage = $data['message'] ?? '';
    
    if (empty($email)) {
        handleError("Email requis pour la demande de suppression", 400);
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        handleError("Format d'email invalide", 400);
    }
    
    try {
        $pdo = getDBConnection();
        
        // Vérifier si l'utilisateur existe
        $stmt = $pdo->prepare("SELECT id, user_first_name, email FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if (!$user) {
            // Même si l'utilisateur n'existe pas, on enregistre la demande
            // (pour les utilisateurs qui ont supprimé leur compte mais veulent s'assurer)
            logDeletionRequest($email, $reason, $userMessage, null);
            
            echo json_encode([
                'success' => true,
                'message' => 'Demande de suppression enregistrée. Nous traiterons votre demande dans les 30 jours.',
                'request_id' => generateRequestId($email)
            ]);
            return;
        }
        
        $userId = $user['id'];
        $userName = $user['user_first_name'] ?? 'Utilisateur';
        
        // Enregistrer la demande de suppression
        $requestId = logDeletionRequest($email, $reason, $userMessage, $userId);
        
        // Envoyer un email de confirmation
        sendDeletionConfirmationEmail($email, $userName, $requestId);
        
        // Envoyer un email à l'équipe support
        sendSupportNotification($email, $userName, $reason, $userMessage, $requestId);
        
        echo json_encode([
            'success' => true,
            'message' => 'Votre demande de suppression a été enregistrée. Vous recevrez un email de confirmation.',
            'request_id' => $requestId,
            'processing_time' => '30 jours maximum'
        ]);
        
    } catch (Exception $e) {
        error_log("Erreur lors de la demande de suppression: " . $e->getMessage());
        handleError("Erreur lors du traitement de votre demande", 500);
    }
}

/**
 * Enregistre la demande de suppression dans la base de données
 */
function logDeletionRequest($email, $reason, $userMessage, $userId = null) {
    $pdo = getDBConnection();
    
    $requestId = generateRequestId($email);
    $timestamp = date('Y-m-d H:i:s');
    
    // Créer la table si elle n'existe pas
    $createTable = "
        CREATE TABLE IF NOT EXISTS data_deletion_requests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            request_id VARCHAR(50) UNIQUE NOT NULL,
            user_id INT NULL,
            email VARCHAR(255) NOT NULL,
            reason TEXT,
            user_message TEXT,
            status ENUM('pending', 'processing', 'completed', 'rejected') DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            processed_at TIMESTAMP NULL,
            processed_by VARCHAR(100) NULL,
            notes TEXT NULL,
            INDEX idx_email (email),
            INDEX idx_request_id (request_id),
            INDEX idx_status (status),
            INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ";
    
    $pdo->exec($createTable);
    
    // Insérer la demande
    $stmt = $pdo->prepare("
        INSERT INTO data_deletion_requests 
        (request_id, user_id, email, reason, user_message, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'pending', ?)
    ");
    
    $stmt->execute([$requestId, $userId, $email, $reason, $userMessage, $timestamp]);
    
    error_log("🗑️ Demande de suppression enregistrée: $requestId pour $email");
    
    return $requestId;
}

/**
 * Génère un ID unique pour la demande
 */
function generateRequestId($email) {
    $timestamp = time();
    $emailHash = substr(md5($email), 0, 8);
    return "DEL_" . $timestamp . "_" . $emailHash;
}

/**
 * Envoie un email de confirmation à l'utilisateur
 */
function sendDeletionConfirmationEmail($email, $userName, $requestId) {
    $subject = "Demande de suppression de compte - Prayer Times";
    
    $message = "
    <html>
    <head>
        <title>Demande de suppression de compte</title>
    </head>
    <body>
        <h2>Assalamu Alaykum $userName !</h2>
        
        <p>Nous avons bien reçu votre demande de suppression de compte et de données personnelles.</p>
        
        <div style='background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;'>
            <h3>📋 Détails de votre demande :</h3>
            <p><strong>Numéro de demande :</strong> $requestId</p>
            <p><strong>Date de demande :</strong> " . date('d/m/Y à H:i') . "</p>
            <p><strong>Email concerné :</strong> $email</p>
        </div>
        
        <h3>⏰ Délai de traitement :</h3>
        <p>Conformément au RGPD et aux exigences Google Play, nous traiterons votre demande dans un délai maximum de <strong>30 jours</strong>.</p>
        
        <h3>🗑️ Ce qui sera supprimé :</h3>
        <ul>
            <li>Votre compte utilisateur</li>
            <li>Toutes vos données personnelles</li>
            <li>Vos statistiques de prière</li>
            <li>Vos favoris et paramètres</li>
            <li>Vos abonnements premium (annulés automatiquement)</li>
        </ul>
        
        <h3>⚠️ Important :</h3>
        <ul>
            <li>La suppression est <strong>définitive et irréversible</strong></li>
            <li>Vous perdrez l'accès à tous vos contenus premium</li>
            <li>Vos abonnements seront annulés automatiquement</li>
        </ul>
        
        <p>Si vous changez d'avis, vous pouvez nous contacter à <strong>support@myadhanapp.com</strong> en mentionnant votre numéro de demande.</p>
        
        <p>Barakallahu fik ! 🤲</p>
        
        <hr>
        <p><small>Email automatique - Ne pas répondre</small></p>
    </body>
    </html>
    ";
    
    $headers = array(
        'MIME-Version' => '1.0',
        'Content-type' => 'text/html; charset=UTF-8',
        'From' => 'noreply@myadhanapp.com',
        'Reply-To' => 'support@myadhanapp.com',
        'X-Mailer' => 'PHP/' . phpversion()
    );
    
    $headerString = '';
    foreach($headers as $key => $value) {
        $headerString .= "$key: $value\r\n";
    }
    
    $sent = mail($email, $subject, $message, $headerString);
    
    if ($sent) {
        error_log("📧 Email de confirmation de suppression envoyé à: $email");
    } else {
        error_log("❌ Échec envoi email de confirmation à: $email");
    }
}

/**
 * Envoie une notification à l'équipe support
 */
function sendSupportNotification($email, $userName, $reason, $userMessage, $requestId) {
    $supportEmail = 'support@myadhanapp.com';
    $subject = "🚨 NOUVELLE DEMANDE DE SUPPRESSION - $requestId";
    
    $message = "
    <html>
    <head>
        <title>Demande de suppression de compte</title>
    </head>
    <body>
        <h2 style='color: #dc3545;'>🚨 NOUVELLE DEMANDE DE SUPPRESSION</h2>
        
        <div style='background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;'>
            <h3>📋 Informations de la demande :</h3>
            <p><strong>Numéro de demande :</strong> $requestId</p>
            <p><strong>Utilisateur :</strong> $userName</p>
            <p><strong>Email :</strong> $email</p>
            <p><strong>Date :</strong> " . date('d/m/Y à H:i') . "</p>
        </div>
        
        <h3>📝 Détails :</h3>
        <p><strong>Raison :</strong> " . ($reason ?: 'Non spécifiée') . "</p>
        <p><strong>Message utilisateur :</strong></p>
        <div style='background-color: #f8f9fa; padding: 10px; border-radius: 3px; margin: 10px 0;'>
            " . ($userMessage ?: 'Aucun message') . "
        </div>
        
        <h3>⚡ Actions requises :</h3>
        <ol>
            <li>Vérifier l'identité de l'utilisateur</li>
            <li>Confirmer la demande par email</li>
            <li>Supprimer les données dans la base de données</li>
            <li>Annuler les abonnements Stripe si nécessaire</li>
            <li>Marquer la demande comme traitée</li>
        </ol>
        
        <p><strong>⚠️ Délai légal : 30 jours maximum</strong></p>
        
        <hr>
        <p><small>Notification automatique - Prayer Times App</small></p>
    </body>
    </html>
    ";
    
    $headers = array(
        'MIME-Version' => '1.0',
        'Content-type' => 'text/html; charset=UTF-8',
        'From' => 'noreply@myadhanapp.com',
        'Reply-To' => 'noreply@myadhanapp.com',
        'X-Mailer' => 'PHP/' . phpversion()
    );
    
    $headerString = '';
    foreach($headers as $key => $value) {
        $headerString .= "$key: $value\r\n";
    }
    
    $sent = mail($supportEmail, $subject, $message, $headerString);
    
    if ($sent) {
        error_log("📧 Notification support envoyée pour la demande: $requestId");
    } else {
        error_log("❌ Échec envoi notification support pour: $requestId");
    }
}

?> 