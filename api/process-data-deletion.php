<?php
/**
 * Script de traitement des demandes de suppression de données
 * Usage interne pour l'équipe support
 * Conforme aux exigences Google Play Store et RGPD
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = getRequestData();

try {
    switch ($method) {
        case 'GET':
            handleGetRequests();
            break;
        case 'POST':
            handleProcessRequest();
            break;
        default:
            handleError("Méthode non supportée", 405);
    }
} catch (Exception $e) {
    error_log("PROCESS DATA DELETION ERROR: " . $e->getMessage());
    handleError("Erreur dans le traitement des demandes", 500, $e->getMessage());
}

/**
 * GET /api/process-data-deletion.php
 * Liste les demandes de suppression en attente
 */
function handleGetRequests() {
    $pdo = getDBConnection();
    
    $status = $_GET['status'] ?? 'pending';
    $limit = min((int)($_GET['limit'] ?? 50), 100); // Max 100 résultats
    
    $sql = "
        SELECT 
            id,
            request_id,
            user_id,
            email,
            reason,
            user_message,
            status,
            created_at,
            processed_at,
            processed_by,
            notes
        FROM data_deletion_requests 
        WHERE status = ?
        ORDER BY created_at ASC
        LIMIT ?
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$status, $limit]);
    $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => $requests,
        'count' => count($requests),
        'status' => $status
    ]);
}

/**
 * POST /api/process-data-deletion.php
 * Traite une demande de suppression spécifique
 */
function handleProcessRequest() {
    global $data;
    
    $requestId = $data['request_id'] ?? '';
    $action = $data['action'] ?? ''; // 'approve', 'reject', 'complete'
    $notes = $data['notes'] ?? '';
    $processedBy = $data['processed_by'] ?? 'admin';
    
    if (empty($requestId) || empty($action)) {
        handleError("Paramètres requis: request_id et action", 400);
    }
    
    if (!in_array($action, ['approve', 'reject', 'complete'])) {
        handleError("Action invalide. Utilisez: approve, reject, complete", 400);
    }
    
    try {
        $pdo = getDBConnection();
        
        // Récupérer la demande
        $stmt = $pdo->prepare("
            SELECT * FROM data_deletion_requests 
            WHERE request_id = ?
        ");
        $stmt->execute([$requestId]);
        $request = $stmt->fetch();
        
        if (!$request) {
            handleError("Demande non trouvée", 404);
        }
        
        if ($request['status'] !== 'pending') {
            handleError("Cette demande a déjà été traitée", 400);
        }
        
        $newStatus = '';
        $emailSubject = '';
        $emailMessage = '';
        
        switch ($action) {
            case 'approve':
                $newStatus = 'processing';
                $emailSubject = "Demande de suppression approuvée - Prayer Times";
                $emailMessage = "
                    <h2>Votre demande de suppression a été approuvée</h2>
                    <p>Nous procédons actuellement à la suppression de vos données.</p>
                    <p><strong>Numéro de demande :</strong> $requestId</p>
                    <p>Vous recevrez une confirmation finale une fois la suppression terminée.</p>
                ";
                break;
                
            case 'reject':
                $newStatus = 'rejected';
                $emailSubject = "Demande de suppression rejetée - Prayer Times";
                $emailMessage = "
                    <h2>Votre demande de suppression a été rejetée</h2>
                    <p><strong>Numéro de demande :</strong> $requestId</p>
                    <p><strong>Raison :</strong> $notes</p>
                    <p>Si vous avez des questions, contactez-nous à support@myadhanapp.com</p>
                ";
                break;
                
            case 'complete':
                $newStatus = 'completed';
                $emailSubject = "Suppression de compte terminée - Prayer Times";
                $emailMessage = "
                    <h2>Votre compte a été supprimé avec succès</h2>
                    <p><strong>Numéro de demande :</strong> $requestId</p>
                    <p>Toutes vos données ont été supprimées de nos serveurs conformément au RGPD.</p>
                    <p>Merci d'avoir utilisé Prayer Times.</p>
                ";
                
                // Supprimer effectivement les données utilisateur
                if ($request['user_id']) {
                    deleteUserData($request['user_id']);
                }
                break;
        }
        
        // Mettre à jour le statut
        $stmt = $pdo->prepare("
            UPDATE data_deletion_requests 
            SET status = ?, processed_at = NOW(), processed_by = ?, notes = ?
            WHERE request_id = ?
        ");
        $stmt->execute([$newStatus, $processedBy, $notes, $requestId]);
        
        // Envoyer un email de notification
        if (!empty($emailSubject) && !empty($emailMessage)) {
            sendProcessNotificationEmail($request['email'], $emailSubject, $emailMessage);
        }
        
        echo json_encode([
            'success' => true,
            'message' => "Demande traitée avec succès",
            'request_id' => $requestId,
            'new_status' => $newStatus
        ]);
        
    } catch (Exception $e) {
        error_log("Erreur traitement demande $requestId: " . $e->getMessage());
        handleError("Erreur lors du traitement de la demande", 500);
    }
}

/**
 * Supprime toutes les données d'un utilisateur
 */
function deleteUserData($userId) {
    $pdo = getDBConnection();
    
    try {
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
        
        // Enfin, supprimer l'utilisateur
        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        
        $pdo->commit();
        
        error_log("✅ Données utilisateur supprimées pour ID: $userId");
        
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log("❌ Erreur suppression données utilisateur ID $userId: " . $e->getMessage());
        throw $e;
    }
}

/**
 * Envoie un email de notification de traitement
 */
function sendProcessNotificationEmail($email, $subject, $message) {
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
        error_log("📧 Email de traitement envoyé à: $email");
    } else {
        error_log("❌ Échec envoi email de traitement à: $email");
    }
}

?> 