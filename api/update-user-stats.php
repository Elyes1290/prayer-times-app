<?php
/**
 * API pour mettre à jour les statistiques utilisateur
 * 
 * Méthode: POST
 * Endpoint: POST /api/update-user-stats.php
 * 
 * Paramètres requis:
 * - user_id: ID de l'utilisateur
 * - stats_data: Données des statistiques (JSON)
 * 
 * Réponse:
 * - success: true/false
 * - message: Message de succès ou d'erreur
 */

require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
    exit();
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Données JSON invalides']);
        exit();
    }
    
    $user_id = $input['user_id'] ?? null;
    $stats_data = $input['stats_data'] ?? null;
    
    if (!$user_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'user_id requis']);
        exit();
    }
    
    if (!$stats_data) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'stats_data requis']);
        exit();
    }
    
    // Vérifier que l'utilisateur existe et a le statut premium
    $stmt = $pdo->prepare("SELECT premium_status FROM users WHERE id = ?");
    $stmt->execute([$user_id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Utilisateur non trouvé']);
        exit();
    }
    
    // Mettre à jour ou insérer les statistiques
    $stats_json = json_encode($stats_data);
    
    $upsertStmt = $pdo->prepare("
        INSERT INTO user_stats (user_id, stats_data, updated_at) 
        VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
        stats_data = VALUES(stats_data),
        updated_at = NOW()
    ");
    
    $result = $upsertStmt->execute([$user_id, $stats_json]);
    
    if ($result) {
        echo json_encode([
            'success' => true,
            'message' => 'Statistiques mises à jour avec succès',
            'user_id' => $user_id
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur lors de la mise à jour']);
    }
    
} catch (Exception $e) {
    error_log("Erreur update-user-stats: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur serveur']);
}
?> 