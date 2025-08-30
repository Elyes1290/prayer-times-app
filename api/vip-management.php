<?php
/**
 * 🚀 GESTION DES COMPTES VIP - MyAdhan Prayer App
 * Système pour offrir des abonnements premium gratuits à vie
 * à vos parents, famille et amis proches.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'config.php';

// 🔐 SÉCURITÉ : Seul l'admin peut gérer les VIP
function requireAdminAuth() {
    // Vérifier le token admin (à adapter selon votre système)
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    $adminToken = $_ENV['ADMIN_VIP_TOKEN'] ?? 'vip_admin_2024_secure_token';
    
    if (!$authHeader || !str_contains($authHeader, $adminToken)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Accès non autorisé']);
        exit();
    }
}

// Router principal
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    $pdo = getDBConnection();
    
    switch ($method) {
        case 'GET':
            handleGetRequest($pdo, $action);
            break;
        case 'POST':
            handlePostRequest($pdo, $action);
            break;
        case 'PUT':
            handlePutRequest($pdo, $action);
            break;
        case 'DELETE':
            handleDeleteRequest($pdo, $action);
            break;
        default:
            throw new Exception('Méthode non supportée');
    }
    
} catch (Exception $e) {
    error_log("Erreur VIP Management: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => $e->getMessage()
    ]);
}

/**
 * ===============================
 * GESTION DES REQUÊTES GET
 * ===============================
 */
function handleGetRequest($pdo, $action) {
    switch ($action) {
        case 'list_vip':
            requireAdminAuth();
            listVipUsers($pdo);
            break;
        case 'vip_stats':
            requireAdminAuth();
            getVipStats($pdo);
            break;
        case 'check_vip':
            checkUserVipStatus($pdo);
            break;
        default:
            throw new Exception('Action GET non reconnue');
    }
}

/**
 * ===============================
 * GESTION DES REQUÊTES POST
 * ===============================
 */
function handlePostRequest($pdo, $action) {
    switch ($action) {
        case 'grant_vip':
            requireAdminAuth();
            grantVipStatus($pdo);
            break;
        case 'create_vip_user':
            requireAdminAuth();
            createVipUser($pdo);
            break;
        default:
            throw new Exception('Action POST non reconnue');
    }
}

/**
 * ===============================
 * GESTION DES REQUÊTES PUT
 * ===============================
 */
function handlePutRequest($pdo, $action) {
    switch ($action) {
        case 'update_vip':
            requireAdminAuth();
            updateVipUser($pdo);
            break;
        default:
            throw new Exception('Action PUT non reconnue');
    }
}

/**
 * ===============================
 * GESTION DES REQUÊTES DELETE
 * ===============================
 */
function handleDeleteRequest($pdo, $action) {
    switch ($action) {
        case 'revoke_vip':
            requireAdminAuth();
            revokeVipStatus($pdo);
            break;
        default:
            throw new Exception('Action DELETE non reconnue');
    }
}

/**
 * ===============================
 * FONCTIONS VIP
 * ===============================
 */

// Lister tous les utilisateurs VIP
function listVipUsers($pdo) {
    $stmt = $pdo->query("SELECT * FROM v_vip_users ORDER BY vip_granted_at DESC");
    $vipUsers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => $vipUsers,
        'total' => count($vipUsers)
    ]);
}

// Statistiques VIP
function getVipStats($pdo) {
    $stats = [];
    
    // Total VIP
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM users WHERE is_vip = 1");
    $stats['total_vip'] = $stmt->fetchColumn();
    
    // VIP actifs (connectés dans les 30 derniers jours)
    $stmt = $pdo->query("
        SELECT COUNT(*) as active 
        FROM users 
        WHERE is_vip = 1 AND last_seen > DATE_SUB(NOW(), INTERVAL 30 DAY)
    ");
    $stats['active_vip'] = $stmt->fetchColumn();
    
    // VIP par raison
    $stmt = $pdo->query("
        SELECT vip_reason, COUNT(*) as count 
        FROM users 
        WHERE is_vip = 1 AND vip_reason IS NOT NULL
        GROUP BY vip_reason
        ORDER BY count DESC
    ");
    $stats['by_reason'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'data' => $stats]);
}

// Vérifier le statut VIP d'un utilisateur
function checkUserVipStatus($pdo) {
    $email = $_GET['email'] ?? '';
    $user_id = $_GET['user_id'] ?? '';
    
    if (!$email && !$user_id) {
        throw new Exception('Email ou user_id requis');
    }
    
    $where = $email ? 'email = ?' : 'id = ?';
    $param = $email ?: $user_id;
    
    $stmt = $pdo->prepare("
        SELECT id, email, user_first_name, is_vip, vip_reason, 
               vip_granted_by, vip_granted_at, premium_status
        FROM users 
        WHERE $where
    ");
    $stmt->execute([$param]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'Utilisateur non trouvé']);
        return;
    }
    
    $user['is_premium'] = (bool)($user['premium_status'] || $user['is_vip']);
    $user['premium_type'] = $user['is_vip'] ? 'VIP Gratuit' : 'Premium Payant';
    
    echo json_encode(['success' => true, 'data' => $user]);
}

// Accorder le statut VIP à un utilisateur existant
function grantVipStatus($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $email = $data['email'] ?? '';
    $reason = $data['reason'] ?? 'VIP accordé par admin';
    $granted_by = $data['granted_by'] ?? 'admin@myadhanapp.com';
    
    if (!$email) {
        throw new Exception('Email requis');
    }
    
    // Vérifier que l'utilisateur existe
    $stmt = $pdo->prepare("SELECT id, user_first_name FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if (!$user) {
        throw new Exception('Utilisateur non trouvé');
    }
    
    // Mettre à jour le statut VIP
    $stmt = $pdo->prepare("
        UPDATE users SET 
            is_vip = TRUE,
            premium_status = 1,
            premium_expiry = '2099-12-31 23:59:59',
            vip_reason = ?,
            vip_granted_by = ?,
            vip_granted_at = NOW(),
            updated_at = NOW()
        WHERE email = ?
    ");
    
    $stmt->execute([$reason, $granted_by, $email]);
    
    echo json_encode([
        'success' => true,
        'message' => "Statut VIP accordé à {$user['user_first_name']} ({$email})",
        'data' => [
            'user_id' => $user['id'],
            'email' => $email,
            'name' => $user['user_first_name'],
            'reason' => $reason
        ]
    ]);
}

// Créer un nouvel utilisateur VIP
function createVipUser($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $email = $data['email'] ?? '';
    $firstName = $data['first_name'] ?? 'Utilisateur VIP';
    $password = $data['password'] ?? '123456'; // Mot de passe par défaut
    $reason = $data['reason'] ?? 'Utilisateur VIP créé par admin';
    $granted_by = $data['granted_by'] ?? 'admin@myadhanapp.com';
    
    if (!$email) {
        throw new Exception('Email requis');
    }
    
    // Vérifier si l'email existe déjà et gérer intelligemment
    $stmt = $pdo->prepare("SELECT id, is_vip, premium_status FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $existingUser = $stmt->fetch();
    
    if ($existingUser) {
        if ($existingUser['is_vip']) {
            throw new Exception('Cet utilisateur est déjà VIP');
        }
        
        // Transformer l'utilisateur existant en VIP au lieu de créer un nouveau
        $stmt = $pdo->prepare("
            UPDATE users SET 
                is_vip = TRUE,
                premium_status = 1,
                premium_expiry = '2099-12-31 23:59:59',
                vip_reason = ?,
                vip_granted_by = ?,
                vip_granted_at = NOW(),
                updated_at = NOW()
            WHERE id = ?
        ");
        
        $stmt->execute([$reason, $granted_by, $existingUser['id']]);
        
        echo json_encode([
            'success' => true,
            'message' => "Utilisateur existant transformé en VIP avec succès",
            'data' => [
                'user_id' => $existingUser['id'],
                'email' => $email,
                'first_name' => $firstName,
                'reason' => $reason,
                'action' => 'upgraded_to_vip'
            ]
        ]);
        return;
    }
    
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    
    // Créer l'utilisateur VIP
    $stmt = $pdo->prepare("
        INSERT INTO users (
            email, password_hash, user_first_name,
            is_vip, premium_status, premium_expiry,
            vip_reason, vip_granted_by, vip_granted_at,
            created_at, updated_at, status
        ) VALUES (
            ?, ?, ?,
            TRUE, 1, '2099-12-31 23:59:59',
            ?, ?, NOW(),
            NOW(), NOW(), 'active'
        )
    ");
    
    $stmt->execute([$email, $hashedPassword, $firstName, $reason, $granted_by]);
    $userId = $pdo->lastInsertId();
    
    echo json_encode([
        'success' => true,
        'message' => "Utilisateur VIP créé avec succès",
        'data' => [
            'user_id' => $userId,
            'email' => $email,
            'first_name' => $firstName,
            'password' => $password,
            'reason' => $reason
        ]
    ]);
}

// Mettre à jour un utilisateur VIP
function updateVipUser($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $user_id = $data['user_id'] ?? '';
    $reason = $data['reason'] ?? null;
    $granted_by = $data['granted_by'] ?? null;
    
    if (!$user_id) {
        throw new Exception('user_id requis');
    }
    
    $updates = [];
    $params = [];
    
    if ($reason) {
        $updates[] = 'vip_reason = ?';
        $params[] = $reason;
    }
    
    if ($granted_by) {
        $updates[] = 'vip_granted_by = ?';
        $params[] = $granted_by;
    }
    
    if (empty($updates)) {
        throw new Exception('Aucune donnée à mettre à jour');
    }
    
    $updates[] = 'updated_at = NOW()';
    $params[] = $user_id;
    
    $sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    echo json_encode(['success' => true, 'message' => 'Utilisateur VIP mis à jour']);
}

// Révoquer le statut VIP
function revokeVipStatus($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $user_id = $data['user_id'] ?? '';
    
    if (!$user_id) {
        throw new Exception('user_id requis');
    }
    
    // Vérifier que l'utilisateur est bien VIP
    $stmt = $pdo->prepare("SELECT email, user_first_name, is_vip FROM users WHERE id = ?");
    $stmt->execute([$user_id]);
    $user = $stmt->fetch();
    
    if (!$user) {
        throw new Exception('Utilisateur non trouvé');
    }
    
    if (!$user['is_vip']) {
        throw new Exception('Utilisateur n\'est pas VIP');
    }
    
    // Révoquer le statut VIP (mais garder les données historiques)
    $stmt = $pdo->prepare("
        UPDATE users SET 
            is_vip = FALSE,
            premium_status = 0,
            premium_expiry = NULL,
            updated_at = NOW()
        WHERE id = ?
    ");
    
    $stmt->execute([$user_id]);
    
    echo json_encode([
        'success' => true,
        'message' => "Statut VIP révoqué pour {$user['user_first_name']} ({$user['email']})"
    ]);
}
?>
