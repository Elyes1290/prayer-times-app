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
require_once '../vendor/autoload.php';

use Stripe\Stripe;
use Stripe\Subscription;
use Stripe\Customer;

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
        
        // --- NOUVEAU : Suppression immédiate pour conformité Apple ---
        // On supprime les données tout de suite si l'utilisateur le demande explicitement
        if (isset($data['immediate']) && $data['immediate'] === true) {
            deleteUserData($userId);
            
            echo json_encode([
                'success' => true,
                'message' => 'Votre compte et toutes vos données ont été supprimés avec succès.',
                'request_id' => $requestId,
                'status' => 'deleted'
            ]);
            return;
        }

        // Envoyer un email de confirmation (si pas supprimé immédiatement)
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
 * Supprime toutes les données d'un utilisateur (Doublon de process-data-deletion pour accès direct)
 */
function deleteUserData($userId) {
    $pdo = getDBConnection();
    
    try {
        // 1. Récupérer les informations utilisateur avant de supprimer
        $stmt = $pdo->prepare("SELECT email, stripe_customer_id, subscription_platform, premium_status FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $userInfo = $stmt->fetch();
        
        $subscriptionPlatform = $userInfo['subscription_platform'] ?? 'none';
        error_log("🔍 Platform d'abonnement: $subscriptionPlatform pour l'utilisateur $userId");
        
        // Variables pour tracker les suppressions externes
        $deletedFromStripe = false;
        $deletedFromRevenueCat = false;
        
        // 2. Annuler et supprimer les abonnements Stripe (Android) - SAUF pour VIP
        if ($userInfo && !empty($userInfo['stripe_customer_id']) && $subscriptionPlatform === 'stripe') {
            try {
                Stripe::setApiKey(STRIPE_SECRET_KEY);
                
                // Annuler tous les abonnements actifs de ce client
                $subscriptions = Subscription::all([
                    'customer' => $userInfo['stripe_customer_id'],
                    'status' => 'active'
                ]);
                
                foreach ($subscriptions->data as $sub) {
                    Subscription::update($sub->id, [
                        'cancel_at_period_end' => false // Annulation immédiate
                    ]);
                    $sub->cancel();
                    error_log("💳 Stripe: Abonnement " . $sub->id . " annulé pour l'utilisateur $userId");
                }
                
                // 🚀 NOUVEAU : Supprimer complètement le client Stripe
                try {
                    $customer = Customer::retrieve($userInfo['stripe_customer_id']);
                    $customer->delete();
                    $deletedFromStripe = true;
                    error_log("🗑️ Stripe: Client " . $userInfo['stripe_customer_id'] . " supprimé définitivement");
                } catch (Exception $deleteError) {
                    error_log("⚠️ Impossible de supprimer le client Stripe (peut-être déjà supprimé): " . $deleteError->getMessage());
                }
                
            } catch (Exception $stripeError) {
                error_log("⚠️ Erreur Stripe lors de la suppression (ignorée pour continuer): " . $stripeError->getMessage());
            }
        }
        
        // 3. Supprimer le subscriber RevenueCat (iOS) - SAUF pour VIP
        // Note: RevenueCat ne peut pas annuler directement les abonnements Apple
        // (c'est géré par Apple), mais on supprime le subscriber de RevenueCat
        if ($userInfo && !empty($userInfo['email']) && $subscriptionPlatform === 'apple') {
            try {
                $deletedFromRevenueCat = deleteRevenueCatSubscriber($userInfo['email'], $userId);
            } catch (Exception $rcError) {
                error_log("⚠️ Erreur RevenueCat lors de la suppression (ignorée pour continuer): " . $rcError->getMessage());
            }
        } elseif ($subscriptionPlatform === 'vip') {
            error_log("👑 VIP: Pas de suppression Stripe/RevenueCat (accès à vie)");
        }

        $pdo->beginTransaction();
        
        // Supprimer les statistiques
        $stmt = $pdo->prepare("DELETE FROM user_stats WHERE user_id = ?");
        $stmt->execute([$userId]);
        
        // Supprimer les favoris
        $stmt = $pdo->prepare("DELETE FROM favorites WHERE user_id = ?");
        $stmt->execute([$userId]);
        
        // Supprimer les backups
        $stmt = $pdo->prepare("DELETE FROM user_backups WHERE user_id = ?");
        $stmt->execute([$userId]);
        
        // Supprimer les abonnements premium
        $stmt = $pdo->prepare("DELETE FROM premium_users WHERE user_id = ?");
        $stmt->execute([$userId]);
        
        // Supprimer les achats premium
        $stmt = $pdo->prepare("DELETE FROM premium_purchases WHERE user_id = ?");
        $stmt->execute([$userId]);
        
        // Supprimer les badges/achievements
        $stmt = $pdo->prepare("DELETE FROM user_achievements WHERE user_id = ?");
        $stmt->execute([$userId]);
        
        // 📊 LOGGER la suppression avant de supprimer l'utilisateur (audit RGPD)
        logAccountDeletion($pdo, $userId, $userInfo['email'], $subscriptionPlatform, 
                          $userInfo['premium_status'], $deletedFromStripe, $deletedFromRevenueCat);
        
        // Enfin, supprimer l'utilisateur
        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        
        $pdo->commit();
        
        error_log("✅ Suppression immédiate réussie pour ID: $userId");
        
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("❌ Erreur suppression immédiate ID $userId: " . $e->getMessage());
        throw $e;
    }
}

/**
 * Supprime le subscriber dans RevenueCat (iOS)
 * Note: Cela ne supprime pas l'abonnement Apple (géré par Apple),
 * mais retire le subscriber de RevenueCat pour arrêter le tracking
 */
function deleteRevenueCatSubscriber($email, $userId) {
    // Vérifier si on a les credentials RevenueCat
    if (!defined('REVENUECAT_SECRET_KEY') || empty(REVENUECAT_SECRET_KEY)) {
        error_log("⚠️ RevenueCat: Clé API non configurée, suppression ignorée");
        return;
    }
    
    try {
        // L'app_user_id dans RevenueCat est l'email de l'utilisateur
        $appUserId = $email;
        
        // API RevenueCat pour supprimer un subscriber
        $url = "https://api.revenuecat.com/v1/subscribers/" . urlencode($appUserId);
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "DELETE");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . REVENUECAT_SECRET_KEY,
            'Content-Type: application/json',
            'X-Platform: ios'
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode === 200 || $httpCode === 204) {
            error_log("🍎 RevenueCat: Subscriber $appUserId supprimé avec succès");
            return true;
        } elseif ($httpCode === 404) {
            error_log("ℹ️ RevenueCat: Subscriber $appUserId introuvable (peut-être jamais créé)");
            return false;
        } else {
            error_log("⚠️ RevenueCat: Erreur HTTP $httpCode lors de la suppression de $appUserId - Response: $response");
            return false;
        }
        
    } catch (Exception $e) {
        error_log("❌ RevenueCat: Exception lors de la suppression: " . $e->getMessage());
        throw $e;
    }
}

/**
 * 📊 Enregistre la suppression d'un compte dans l'historique (audit RGPD)
 */
function logAccountDeletion($pdo, $userId, $email, $subscriptionPlatform, $premiumStatus, $deletedFromStripe, $deletedFromRevenueCat) {
    try {
        // Récupérer l'IP du client
        $ipAddress = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? 
                     $_SERVER['HTTP_X_REAL_IP'] ?? 
                     $_SERVER['REMOTE_ADDR'] ?? 
                     'unknown';
        
        // Si multiple IPs (proxy), prendre la première
        if (strpos($ipAddress, ',') !== false) {
            $ipAddress = trim(explode(',', $ipAddress)[0]);
        }
        
        $stmt = $pdo->prepare("
            INSERT INTO account_deletions_log 
            (user_id, email, subscription_platform, premium_status, ip_address, 
             deleted_from_stripe, deleted_from_revenuecat)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $userId,
            $email,
            $subscriptionPlatform,
            $premiumStatus ? 1 : 0,
            $ipAddress,
            $deletedFromStripe ? 1 : 0,
            $deletedFromRevenueCat ? 1 : 0
        ]);
        
        error_log("📊 LOG: Suppression de compte loggée pour user_id=$userId, email=$email, platform=$subscriptionPlatform, IP=$ipAddress");
    } catch (Exception $e) {
        // Ne pas bloquer la suppression si le log échoue
        error_log("⚠️ LOG: Erreur lors du logging de suppression (ignorée): " . $e->getMessage());
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