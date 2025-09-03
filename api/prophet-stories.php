<?php
/**
 * 📚 API HISTOIRES DU PROPHÈTE (PBUH) - Prayer Times App
 * Gestion des histoires textuelles premium du Prophète Mohammad (PBUH)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Gérer les requêtes OPTIONS (CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'config.php';

// 🔐 AUTHENTIFICATION : Flexible selon l'action
$auth = null;
$isPremium = false;
$userId = null;

// Essayer l'authentification, mais ne pas la forcer pour toutes les actions
try {
    $token = getBearerToken();
    if ($token) {
        $auth = validateAuthToken($token);
        if ($auth && $auth['success']) {
            $isPremium = !empty($auth['is_premium']);
            $userId = $auth['user_id'];
        }
    }
} catch (Exception $e) {
    // Authentification échouée, mais on continue en mode non authentifié
    error_log("⚠️ Authentification échouée (mode dégradé): " . $e->getMessage());
}

$action = $_GET['action'] ?? '';
$allowedActions = ['catalog', 'story', 'progress', 'favorites', 'search'];

if (!in_array($action, $allowedActions)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Action non autorisée'
    ]);
    exit;
}

try {
    $pdo = getDBConnection();
    
    switch ($action) {
        case 'catalog':
            handleCatalog($pdo, $isPremium, $userId);
            break;
            
        case 'story':
            handleStoryContent($pdo, $isPremium, $userId);
            break;
            
        case 'progress':
            // Authentification requise pour le progrès
            if (!$userId) {
                http_response_code(401);
                echo json_encode(['success' => false, 'message' => 'Authentification requise pour sauvegarder le progrès']);
                exit();
            }
            handleProgress($pdo, $userId);
            break;
            
        case 'favorites':
            // Authentification requise pour les favoris
            if (!$userId) {
                http_response_code(401);
                echo json_encode(['success' => false, 'message' => 'Authentification requise pour gérer les favoris']);
                exit();
            }
            handleFavorites($pdo, $userId);
            break;
            
        case 'search':
            handleSearch($pdo, $isPremium, $userId);
            break;
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erreur serveur: ' . $e->getMessage(),
        'timestamp' => date('c')
    ]);
}

/**
 * 📖 CATALOG : Liste toutes les histoires disponibles
 */
function handleCatalog($pdo, $isPremium, $userId) {
    $category = $_GET['category'] ?? null;
    $difficulty = $_GET['difficulty'] ?? null;
    
    // 🔐 SÉCURITÉ FLEXIBLE : Requête différente selon l'authentification
    if ($userId) {
        // Utilisateur authentifié : inclure les données personnelles avec NULL protection
        $sql = "SELECT 
                    ps.id, 
                    ps.title, 
                    IFNULL(ps.title_arabic, '') as title_arabic, 
                    ps.category, ps.difficulty, 
                    ps.age_recommendation, ps.reading_time, ps.word_count,
                    IFNULL(ps.historical_period_start, 0) as historical_period_start, 
                    IFNULL(ps.historical_period_end, 0) as historical_period_end, 
                    IFNULL(ps.historical_location, '') as historical_location,
                    ps.is_premium, ps.created_at, 
                    IFNULL(ps.view_count, 0) as view_count, 
                    IFNULL(ps.rating, 0.00) as rating,
                    -- Statistiques utilisateur
                    CASE 
                        WHEN up.story_id IS NOT NULL THEN IFNULL(up.completion_percentage, 0)
                        ELSE 0 
                    END as user_progress,
                    CASE 
                        WHEN uf.story_id IS NOT NULL THEN 1 
                        ELSE 0 
                    END as is_favorited
                FROM prophet_stories ps
                LEFT JOIN user_story_progress up ON ps.id = up.story_id AND up.user_id = ?
                LEFT JOIN user_story_favorites uf ON ps.id = uf.story_id AND uf.user_id = ?
                WHERE 1=1";
        $params = [$userId, $userId];
    } else {
        // Utilisateur non authentifié : données publiques seulement avec NULL protection
        $sql = "SELECT 
                    ps.id, 
                    ps.title, 
                    IFNULL(ps.title_arabic, '') as title_arabic, 
                    ps.category, ps.difficulty, 
                    ps.age_recommendation, ps.reading_time, ps.word_count,
                    IFNULL(ps.historical_period_start, 0) as historical_period_start, 
                    IFNULL(ps.historical_period_end, 0) as historical_period_end, 
                    IFNULL(ps.historical_location, '') as historical_location,
                    ps.is_premium, ps.created_at, 
                    IFNULL(ps.view_count, 0) as view_count, 
                    IFNULL(ps.rating, 0.00) as rating,
                    -- Valeurs par défaut pour les utilisateurs non authentifiés
                    0 as user_progress,
                    0 as is_favorited
                FROM prophet_stories ps
                WHERE 1=1";
        $params = [];
    }
    
    // 🔐 Filtrer par premium si nécessaire
    if (!$isPremium) {
        $sql .= " AND ps.is_premium = 0";
    }
    
    if ($category) {
        $sql .= " AND ps.category = ?";
        $params[] = $category;
    }
    
    if ($difficulty) {
        $sql .= " AND ps.difficulty = ?";
        $params[] = $difficulty;
    }
    
    $sql .= " ORDER BY ps.chronological_order ASC, ps.created_at DESC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $stories = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 📊 Statistiques globales
    $statsStmt = $pdo->prepare("
        SELECT 
            COUNT(*) as total_stories,
            COUNT(CASE WHEN is_premium = 0 THEN 1 END) as free_stories,
            COUNT(CASE WHEN is_premium = 1 THEN 1 END) as premium_stories,
            AVG(reading_time) as avg_reading_time
        FROM prophet_stories
    ");
    $statsStmt->execute();
    $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'message' => 'Catalogue récupéré avec succès',
        'timestamp' => date('c'),
        'data' => [
            'stories' => $stories,
            'stats' => $stats,
            'user_premium' => $isPremium,
            'categories' => getCategoriesWithCounts($pdo)
        ]
    ]);
}

/**
 * 📝 STORY : Récupère le contenu complet d'une histoire
 */
function handleStoryContent($pdo, $isPremium, $userId) {
    $storyId = $_GET['id'] ?? '';
    
    if (empty($storyId)) {
        throw new Exception('ID de l\'histoire requis');
    }
    
    // Vérifier l'accès à l'histoire
    $storyStmt = $pdo->prepare("SELECT * FROM prophet_stories WHERE id = ?");
    $storyStmt->execute([$storyId]);
    $story = $storyStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$story) {
        throw new Exception('Histoire non trouvée');
    }
    
    // 🔐 SÉCURITÉ : Vérifier l'accès premium seulement si l'histoire est premium
    if ($story['is_premium'] && !$isPremium) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Abonnement Premium requis pour cette histoire',
            'story_title' => $story['title'],
            'requires_auth' => !$userId ? 'Vous devez vous connecter pour accéder au contenu premium' : 'Abonnement Premium requis'
        ]);
        return;
    }
    
    // Récupérer les chapitres
    $chaptersStmt = $pdo->prepare("
        SELECT id, title, content, chapter_order, reading_time
        FROM prophet_story_chapters 
        WHERE story_id = ? 
        ORDER BY chapter_order ASC
    ");
    $chaptersStmt->execute([$storyId]);
    $chapters = $chaptersStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Récupérer les références
    $referencesStmt = $pdo->prepare("
        SELECT type, source, reference_text, authenticity
        FROM prophet_story_references 
        WHERE story_id = ?
        ORDER BY reference_order ASC
    ");
    $referencesStmt->execute([$storyId]);
    $references = $referencesStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Récupérer les termes du glossaire
    $glossaryStmt = $pdo->prepare("
        SELECT term, arabic_term, definition, pronunciation
        FROM prophet_story_glossary 
        WHERE story_id = ?
        ORDER BY term ASC
    ");
    $glossaryStmt->execute([$storyId]);
    $glossary = $glossaryStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 📊 Mettre à jour les statistiques de vue (même pour les utilisateurs non connectés)
    updateViewStats($pdo, $storyId, $userId);
    
    echo json_encode([
        'success' => true,
        'message' => 'Histoire récupérée avec succès',
        'timestamp' => date('c'),
        'data' => [
            'story' => $story,
            'chapters' => $chapters,
            'references' => $references,
            'glossary' => $glossary,
            'user_premium' => $isPremium
        ]
    ]);
}

/**
 * 📊 PROGRESS : Gestion du progrès de lecture
 */
function handleProgress($pdo, $userId) {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Sauvegarder le progrès
        $input = json_decode(file_get_contents('php://input'), true);
        $storyId = $input['story_id'] ?? '';
        $chapterIndex = $input['chapter_index'] ?? 0;
        $position = $input['position'] ?? 0;
        $completionPercentage = $input['completion_percentage'] ?? 0;
        $timeSpent = $input['time_spent'] ?? 0;
        
        $stmt = $pdo->prepare("
            INSERT INTO user_story_progress 
            (user_id, story_id, current_chapter, current_position, completion_percentage, time_spent, last_read_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
            current_chapter = VALUES(current_chapter),
            current_position = VALUES(current_position),
            completion_percentage = VALUES(completion_percentage),
            time_spent = time_spent + VALUES(time_spent),
            last_read_at = VALUES(last_read_at)
        ");
        
        $stmt->execute([$userId, $storyId, $chapterIndex, $position, $completionPercentage, $timeSpent]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Progrès sauvegardé'
        ]);
    } else {
        // Récupérer le progrès
        $storyId = $_GET['story_id'] ?? null;
        
        if ($storyId) {
            $stmt = $pdo->prepare("SELECT * FROM user_story_progress WHERE user_id = ? AND story_id = ?");
            $stmt->execute([$userId, $storyId]);
            $progress = $stmt->fetch(PDO::FETCH_ASSOC);
        } else {
            $stmt = $pdo->prepare("SELECT * FROM user_story_progress WHERE user_id = ? ORDER BY last_read_at DESC");
            $stmt->execute([$userId]);
            $progress = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        
        echo json_encode([
            'success' => true,
            'data' => $progress
        ]);
    }
}

/**
 * ⭐ FAVORITES : Gestion des favoris
 */
function handleFavorites($pdo, $userId) {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $storyId = $input['story_id'] ?? '';
        $action = $input['action'] ?? 'add'; // add ou remove
        
        if ($action === 'add') {
            $stmt = $pdo->prepare("
                INSERT IGNORE INTO user_story_favorites (user_id, story_id, created_at)
                VALUES (?, ?, NOW())
            ");
            $stmt->execute([$userId, $storyId]);
        } else {
            $stmt = $pdo->prepare("DELETE FROM user_story_favorites WHERE user_id = ? AND story_id = ?");
            $stmt->execute([$userId, $storyId]);
        }
        
        echo json_encode(['success' => true]);
    } else {
        $stmt = $pdo->prepare("
            SELECT ps.*, 1 as is_favorited
            FROM prophet_stories ps
            JOIN user_story_favorites uf ON ps.id = uf.story_id
            WHERE uf.user_id = ?
            ORDER BY uf.created_at DESC
        ");
        $stmt->execute([$userId]);
        $favorites = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $favorites
        ]);
    }
}

/**
 * 🔍 SEARCH : Recherche dans les histoires
 */
function handleSearch($pdo, $isPremium, $userId) {
    $query = $_GET['q'] ?? '';
    
    if (strlen($query) < 2) {
        throw new Exception('Requête de recherche trop courte');
    }
    
    $sql = "
        SELECT DISTINCT ps.id, ps.title, ps.category, ps.difficulty, ps.is_premium,
               MATCH(ps.title, ps.introduction, ps.conclusion) AGAINST (? IN NATURAL LANGUAGE MODE) as relevance
        FROM prophet_stories ps
        LEFT JOIN prophet_story_chapters psc ON ps.id = psc.story_id
        WHERE (
            MATCH(ps.title, ps.introduction, ps.conclusion) AGAINST (? IN NATURAL LANGUAGE MODE)
            OR MATCH(psc.title, psc.content) AGAINST (? IN NATURAL LANGUAGE MODE)
        )
    ";
    
    if (!$isPremium) {
        $sql .= " AND ps.is_premium = 0";
    }
    
    $sql .= " ORDER BY relevance DESC LIMIT 20";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$query, $query, $query]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => [
            'results' => $results,
            'query' => $query,
            'total' => count($results)
        ]
    ]);
}

/**
 * 📊 Fonctions utilitaires
 */
function getCategoriesWithCounts($pdo) {
    $stmt = $pdo->query("
        SELECT category, COUNT(*) as count, 
               COUNT(CASE WHEN is_premium = 0 THEN 1 END) as free_count,
               COUNT(CASE WHEN is_premium = 1 THEN 1 END) as premium_count
        FROM prophet_stories 
        GROUP BY category 
        ORDER BY count DESC
    ");
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function updateViewStats($pdo, $storyId, $userId) {
    // Mettre à jour le compteur de vues (toujours)
    $pdo->prepare("UPDATE prophet_stories SET view_count = view_count + 1 WHERE id = ?")
        ->execute([$storyId]);
    
    // Enregistrer la vue utilisateur seulement si connecté
    if ($userId) {
        $pdo->prepare("
            INSERT INTO user_story_views (user_id, story_id, viewed_at)
            VALUES (?, ?, NOW())
            ON DUPLICATE KEY UPDATE viewed_at = VALUES(viewed_at)
        ")->execute([$userId, $storyId]);
    }
}

?>
