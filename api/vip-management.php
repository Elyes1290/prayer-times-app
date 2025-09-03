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
    // Vérifier le token admin depuis les headers avec correspondance EXACTE
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    $adminToken = ADMIN_VIP_TOKEN;
    
    // Extraire le token Bearer
    if (!$authHeader || !preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Accès non autorisé - Header manquant']);
        exit();
    }
    
    $providedToken = trim($matches[1]);
    
    // Comparaison EXACTE et sécurisée du token
    if (!hash_equals($adminToken, $providedToken)) {
        error_log("Tentative d'accès VIP non autorisée avec token: " . substr($providedToken, 0, 10) . "...");
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Accès non autorisé - Token invalide']);
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
            requireAdminAuth();
            checkUserVipStatus($pdo);
            break;
            
        // 📚 NOUVELLES ACTIONS : Histoires du Prophète
        case 'stories_list':
            requireAdminAuth();
            listStories($pdo);
            break;
            
        case 'story_stats':
            requireAdminAuth();
            getStoryStats($pdo);
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
            
        // 📚 NOUVELLE ACTION : Créer une histoire
        case 'create_story':
            requireAdminAuth();
            createStoryAdmin($pdo);
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
            
        // 📚 NOUVELLE ACTION : Supprimer une histoire
        case 'delete_story':
            requireAdminAuth();
            deleteStoryAdmin($pdo);
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
    try {
        // Utiliser directement la table users au lieu de la vue
        $stmt = $pdo->query("
            SELECT 
                id,
                email,
                user_first_name,
                is_vip,
                vip_reason,
                vip_granted_by,
                vip_granted_at,
                premium_status,
                subscription_type,
                premium_expiry,
                created_at,
                last_seen
            FROM users 
            WHERE is_vip = 1 OR premium_status = 1
            ORDER BY vip_granted_at DESC, created_at DESC
        ");
        
        $vipUsers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $vipUsers,
            'total' => count($vipUsers)
        ]);
    } catch (PDOException $e) {
        error_log("Erreur SQL dans listVipUsers: " . $e->getMessage());
        throw new Exception("Erreur lors de la récupération des utilisateurs VIP: " . $e->getMessage());
    }
}

// Statistiques VIP
function getVipStats($pdo) {
    try {
        $stats = [];
        
        // Total VIP
        $stmt = $pdo->query("SELECT COUNT(*) as total FROM users WHERE is_vip = 1");
        $stats['total_vip'] = $stmt->fetchColumn();
        
        // VIP actifs (connectés dans les 30 derniers jours) - vérifier si last_seen existe
        try {
            $stmt = $pdo->query("
                SELECT COUNT(*) as active 
                FROM users 
                WHERE is_vip = 1 AND last_seen > DATE_SUB(NOW(), INTERVAL 30 DAY)
            ");
            $stats['active_vip'] = $stmt->fetchColumn();
        } catch (PDOException $e) {
            // Si last_seen n'existe pas, utiliser une valeur par défaut
            $stats['active_vip'] = $stats['total_vip'];
        }
        
        // VIP par raison
        try {
            $stmt = $pdo->query("
                SELECT vip_reason, COUNT(*) as count 
                FROM users 
                WHERE is_vip = 1 AND vip_reason IS NOT NULL
                GROUP BY vip_reason
                ORDER BY count DESC
            ");
            $stats['by_reason'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            // Si vip_reason n'existe pas, utiliser un tableau vide
            $stats['by_reason'] = [];
        }
        
        echo json_encode(['success' => true, 'data' => $stats]);
    } catch (PDOException $e) {
        error_log("Erreur SQL dans getVipStats: " . $e->getMessage());
        throw new Exception("Erreur lors de la récupération des statistiques VIP: " . $e->getMessage());
    }
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

/**
 * ===============================
 * 📚 FONCTIONS HISTOIRES DU PROPHÈTE
 * ===============================
 */

// Lister toutes les histoires
function listStories($pdo) {
    $stmt = $pdo->prepare("
        SELECT id, title, title_arabic, category, difficulty, 
               age_recommendation, reading_time, word_count,
               is_premium, view_count, rating, created_at
        FROM prophet_stories 
        ORDER BY chronological_order ASC, created_at DESC
    ");
    $stmt->execute();
    $stories = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => $stories,
        'message' => count($stories) . ' histoire(s) trouvée(s)'
    ]);
}

// Créer une nouvelle histoire
function createStoryAdmin($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $story = $data['story'] ?? [];
    $chapters = $data['chapters'] ?? [];
    
    // Validation
    if (empty($story['id']) || empty($story['title']) || empty($chapters)) {
        throw new Exception('Données story, title et chapters requis');
    }
    
    try {
        $pdo->beginTransaction();
        
        // Insérer l'histoire principale
        $stmt = $pdo->prepare("
            INSERT INTO prophet_stories (
                id, title, title_arabic, introduction, conclusion, moral_lesson,
                category, difficulty, age_recommendation, reading_time, word_count,
                chronological_order, historical_location, is_premium, created_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()
            )
        ");
        
        $stmt->execute([
            $story['id'],
            $story['title'],
            $story['title_arabic'] ?? null,
            $story['introduction'],
            $story['conclusion'],
            $story['moral_lesson'] ?? null,
            $story['category'],
            $story['difficulty'],
            $story['age_recommendation'],
            $story['reading_time'],
            $story['word_count'],
            $story['chronological_order'] ?? 1,
            $story['historical_location'] ?? null,
            $story['is_premium'] ? 1 : 0
        ]);
        
        // Insérer les chapitres
        foreach ($chapters as $chapter) {
            $chapterId = $story['id'] . '_chapter_' . $chapter['order'];
            $stmt = $pdo->prepare("
                INSERT INTO prophet_story_chapters (
                    id, story_id, title, content, chapter_order, reading_time
                ) VALUES (?, ?, ?, ?, ?, ?)
            ");
            
            $chapterReadingTime = max(1, floor($story['reading_time'] / count($chapters)));
            
            $stmt->execute([
                $chapterId,
                $story['id'],
                $chapter['title'],
                $chapter['content'],
                $chapter['order'],
                $chapterReadingTime
            ]);
        }
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => "Histoire '{$story['title']}' créée avec " . count($chapters) . " chapitre(s)"
        ]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw new Exception('Erreur création histoire: ' . $e->getMessage());
    }
}

// Supprimer une histoire
function deleteStoryAdmin($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    $storyId = $data['story_id'] ?? '';
    
    if (!$storyId) {
        throw new Exception('story_id requis');
    }
    
    try {
        // Vérifier que l'histoire existe
        $stmt = $pdo->prepare("SELECT title FROM prophet_stories WHERE id = ?");
        $stmt->execute([$storyId]);
        $story = $stmt->fetch();
        
        if (!$story) {
            throw new Exception('Histoire non trouvée');
        }
        
        // Supprimer l'histoire (CASCADE supprimera automatiquement les chapitres)
        $stmt = $pdo->prepare("DELETE FROM prophet_stories WHERE id = ?");
        $stmt->execute([$storyId]);
        
        echo json_encode([
            'success' => true,
            'message' => "Histoire '{$story['title']}' supprimée"
        ]);
        
    } catch (Exception $e) {
        throw new Exception('Erreur suppression: ' . $e->getMessage());
    }
}

// Statistiques des histoires
function getStoryStats($pdo) {
    // Statistiques globales
    $stmt = $pdo->prepare("
        SELECT 
            COUNT(*) as total_stories,
            COUNT(CASE WHEN is_premium = 0 THEN 1 END) as free_stories,
            COUNT(CASE WHEN is_premium = 1 THEN 1 END) as premium_stories,
            AVG(reading_time) as avg_reading_time,
            SUM(view_count) as total_views
        FROM prophet_stories
    ");
    $stmt->execute();
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Statistiques par catégorie
    $stmt = $pdo->prepare("
        SELECT category, COUNT(*) as count,
               COUNT(CASE WHEN is_premium = 0 THEN 1 END) as free_count,
               COUNT(CASE WHEN is_premium = 1 THEN 1 END) as premium_count
        FROM prophet_stories 
        GROUP BY category 
        ORDER BY count DESC
    ");
    $stmt->execute();
    $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $stats['categories'] = $categories;
    
    echo json_encode([
        'success' => true,
        'data' => $stats
    ]);
}

?>
