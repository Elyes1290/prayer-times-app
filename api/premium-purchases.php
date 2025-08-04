<?php
/**
 * API Gestion des Achats Premium - Prayer Times App
 * Endpoints: GET, POST, PUT pour les achats premium
 * Version adaptée pour la nouvelle structure SQL sans Firebase
 */

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = getRequestData();

try {
    switch ($method) {
        case 'GET':
            handleGetPremiumPurchases();
            break;
        case 'POST':
            handleCreatePremiumPurchase();
            break;
        case 'PUT':
            handleUpdatePremiumPurchase();
            break;
        default:
            handleError("Méthode non supportée", 405);
    }
} catch (Exception $e) {
    handleError("Erreur dans l'API achats premium", 500, $e->getMessage());
}

/**
 * GET /api/premium-purchases.php?user_id=xxx
 */
function handleGetPremiumPurchases() {
    $user_id = $_GET['user_id'] ?? null;
    
    if (!$user_id) {
        handleError("Paramètre requis: user_id", 400);
    }
    
    try {
        $pdo = getDBConnection();
        
        // Vérifier si la table premium_purchases existe
        $tableCheck = $pdo->query("SHOW TABLES LIKE 'premium_purchases'");
        if ($tableCheck->rowCount() === 0) {
            jsonResponse(true, [], "Table premium_purchases non trouvée - aucun achat");
        }
        
        $stmt = $pdo->prepare("
            SELECT * FROM premium_purchases 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        ");
        $stmt->execute([$user_id]);
        
        $purchases = $stmt->fetchAll();
        
        // Formater les données
        foreach ($purchases as &$purchase) {
            $purchase['id'] = (int)$purchase['id'];
            $purchase['user_id'] = (int)$purchase['user_id'];
            $purchase['amount'] = (float)$purchase['amount'];
            if ($purchase['purchase_date']) $purchase['purchase_date'] = date('c', strtotime($purchase['purchase_date']));
            if ($purchase['premium_expiry']) $purchase['premium_expiry'] = date('c', strtotime($purchase['premium_expiry']));
            if ($purchase['cancelled_date']) $purchase['cancelled_date'] = date('c', strtotime($purchase['cancelled_date']));
            if ($purchase['refund_date']) $purchase['refund_date'] = date('c', strtotime($purchase['refund_date']));
            if ($purchase['created_at']) $purchase['created_at'] = date('c', strtotime($purchase['created_at']));
            if ($purchase['updated_at']) $purchase['updated_at'] = date('c', strtotime($purchase['updated_at']));
        }
        
        jsonResponse(true, $purchases, "Achats premium récupérés");
        
    } catch (Exception $e) {
        error_log("Erreur dans handleGetPremiumPurchases: " . $e->getMessage());
        jsonResponse(false, [], "Erreur lors de la récupération des achats premium", 500);
    }
}

/**
 * POST /api/premium-purchases.php - Créer un nouvel achat premium
 */
function handleCreatePremiumPurchase() {
    global $data;
    
    // Validation des données d'entrée
    $rules = [
        'user_id' => ['required' => true, 'type' => 'int'],
        'subscription_type' => ['required' => true, 'type' => 'string'],
        'subscription_id' => ['required' => true, 'type' => 'string', 'max_length' => 255],
        'premium_expiry' => ['required' => true, 'type' => 'datetime'],
        'amount' => ['required' => false, 'type' => 'decimal'],
        'currency' => ['required' => false, 'type' => 'string', 'max_length' => 3],
        'payment_method' => ['required' => false, 'type' => 'string', 'max_length' => 50],
        'payment_status' => ['required' => false, 'type' => 'string']
    ];
    
    $errors = validateInput($data, $rules);
    if (!empty($errors)) {
        handleError("Erreurs de validation", 400, $errors);
    }
    
    $pdo = getDBConnection();
    
    // Récupérer l'utilisateur par user_id
    $userStmt = $pdo->prepare("SELECT id FROM users WHERE id = ? AND status = 'active'");
    $userStmt->execute([$data['user_id']]);
    $user = $userStmt->fetch();
    
    if (!$user) {
        handleError("Utilisateur non trouvé pour ce user_id", 404);
    }
    
    $user_id = $user['id'];
    
    // Insérer l'achat premium
    $insertStmt = $pdo->prepare("
        INSERT INTO premium_purchases (
            user_id, subscription_type, subscription_id, premium_expiry,
            amount, currency, payment_method, payment_status, status,
            purchase_date, created_at, updated_at
        ) VALUES (
            ?, ?, ?, ?,
            ?, ?, ?, ?, 'active',
            NOW(), NOW(), NOW()
        )
    ");
    
    $insertStmt->execute([
        $user_id,
        $data['subscription_type'],
        $data['subscription_id'],
        $data['premium_expiry'],
        $data['amount'] ?? null,
        $data['currency'] ?? 'EUR',
        $data['payment_method'] ?? null,
        $data['payment_status'] ?? 'completed'
    ]);
    
    $purchase_id = $pdo->lastInsertId();
    
    // Mettre à jour l'utilisateur avec le statut premium
    $updateUserStmt = $pdo->prepare("
        UPDATE users SET 
            premium_status = 1,
            subscription_type = ?,
            subscription_id = ?,
            premium_expiry = ?,
            premium_activated_at = NOW(),
            updated_at = NOW()
        WHERE id = ?
    ");
    $updateUserStmt->execute([
        $data['subscription_type'],
        $data['subscription_id'],
        $data['premium_expiry'],
        $user_id
    ]);
    
    // Logger l'action
    logUserAction($user_id, 'premium_purchase_created', 'premium', $purchase_id, [
        'subscription_type' => $data['subscription_type'],
        'amount' => $data['amount'] ?? null,
        'payment_method' => $data['payment_method'] ?? null
    ]);
    
    // Récupérer l'achat créé
    $stmt = $pdo->prepare("SELECT * FROM premium_purchases WHERE id = ?");
    $stmt->execute([$purchase_id]);
    $purchase = $stmt->fetch();
    
    // Formater la réponse
    $purchase['id'] = (int)$purchase['id'];
    $purchase['user_id'] = (int)$purchase['user_id'];
    $purchase['amount'] = (float)$purchase['amount'];
    if ($purchase['purchase_date']) $purchase['purchase_date'] = date('c', strtotime($purchase['purchase_date']));
    if ($purchase['premium_expiry']) $purchase['premium_expiry'] = date('c', strtotime($purchase['premium_expiry']));
    if ($purchase['created_at']) $purchase['created_at'] = date('c', strtotime($purchase['created_at']));
    if ($purchase['updated_at']) $purchase['updated_at'] = date('c', strtotime($purchase['updated_at']));
    
    jsonResponse(true, $purchase, "Achat premium créé avec succès");
}

/**
 * PUT /api/premium-purchases.php - Mettre à jour un achat premium
 */
function handleUpdatePremiumPurchase() {
    global $data;
    
    // Validation des données d'entrée
    $rules = [
        'purchase_id' => ['required' => true, 'type' => 'integer'],
        'status' => ['required' => false, 'type' => 'string'],
        'payment_status' => ['required' => false, 'type' => 'string'],
        'cancelled_date' => ['required' => false, 'type' => 'datetime'],
        'refund_date' => ['required' => false, 'type' => 'datetime']
    ];
    
    $errors = validateInput($data, $rules);
    if (!empty($errors)) {
        handleError("Erreurs de validation", 400, $errors);
    }
    
    $pdo = getDBConnection();
    
    // Vérifier que l'achat existe
    $checkStmt = $pdo->prepare("SELECT * FROM premium_purchases WHERE id = ?");
    $checkStmt->execute([$data['purchase_id']]);
    $purchase = $checkStmt->fetch();
    
    if (!$purchase) {
        handleError("Achat premium non trouvé", 404);
    }
    
    // Construire la requête de mise à jour
    $updateFields = [];
    $updateValues = [];
    
    $fieldsToUpdate = ['status', 'payment_status', 'cancelled_date', 'refund_date'];
    
    foreach ($fieldsToUpdate as $field) {
        if (isset($data[$field])) {
            $updateFields[] = "$field = ?";
            $updateValues[] = $data[$field];
        }
    }
    
    if (empty($updateFields)) {
        handleError("Aucun champ à mettre à jour", 400);
    }
    
    $updateFields[] = "updated_at = NOW()";
    $updateValues[] = $data['purchase_id'];
    
    $sql = "UPDATE premium_purchases SET " . implode(', ', $updateFields) . " WHERE id = ?";
    $updateStmt = $pdo->prepare($sql);
    $updateStmt->execute($updateValues);
    
    // Si l'achat est annulé ou remboursé, mettre à jour l'utilisateur
    if (isset($data['status']) && in_array($data['status'], ['cancelled', 'refunded'])) {
        $updateUserStmt = $pdo->prepare("
            UPDATE users SET 
                premium_status = 0,
                premium_cancelled_at = NOW(),
                updated_at = NOW()
            WHERE id = ?
        ");
        $updateUserStmt->execute([$purchase['user_id']]);
        
        // Logger l'action
        logUserAction($purchase['user_id'], 'premium_cancelled', 'premium', $data['purchase_id'], [
            'status' => $data['status'],
            'subscription_type' => $purchase['subscription_type']
        ]);
    }
    
    // Récupérer l'achat mis à jour
    $stmt = $pdo->prepare("SELECT * FROM premium_purchases WHERE id = ?");
    $stmt->execute([$data['purchase_id']]);
    $updatedPurchase = $stmt->fetch();
    
    // Formater la réponse
    $updatedPurchase['id'] = (int)$updatedPurchase['id'];
    $updatedPurchase['user_id'] = (int)$updatedPurchase['user_id'];
    $updatedPurchase['amount'] = (float)$updatedPurchase['amount'];
    if ($updatedPurchase['purchase_date']) $updatedPurchase['purchase_date'] = date('c', strtotime($updatedPurchase['purchase_date']));
    if ($updatedPurchase['premium_expiry']) $updatedPurchase['premium_expiry'] = date('c', strtotime($updatedPurchase['premium_expiry']));
    if ($updatedPurchase['cancelled_date']) $updatedPurchase['cancelled_date'] = date('c', strtotime($updatedPurchase['cancelled_date']));
    if ($updatedPurchase['refund_date']) $updatedPurchase['refund_date'] = date('c', strtotime($updatedPurchase['refund_date']));
    if ($updatedPurchase['created_at']) $updatedPurchase['created_at'] = date('c', strtotime($updatedPurchase['created_at']));
    if ($updatedPurchase['updated_at']) $updatedPurchase['updated_at'] = date('c', strtotime($updatedPurchase['updated_at']));
    
    jsonResponse(true, $updatedPurchase, "Achat premium mis à jour avec succès");
}

// 🚀 SUPPRIMÉ : logUserAction() est définie dans config.php
?> 