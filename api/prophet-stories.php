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

// 🌍 LANGUE : Récupérer la langue depuis les paramètres
$lang = $_GET['lang'] ?? 'en'; // Par défaut : anglais
$allowedLangs = ['fr', 'en', 'ar', 'tr', 'es', 'de', 'it', 'nl', 'pt', 'ru', 'bn', 'ur', 'fa'];
if (!in_array($lang, $allowedLangs)) {
    $lang = 'en'; // Fallback vers anglais pour les langues non traduites
}

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
$allowedActions = ['catalog', 'story', 'progress', 'favorites', 'search', 'prophets'];

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
            handleCatalog($pdo, $isPremium, $userId, $lang);
            break;
            
        case 'story':
            handleStoryContent($pdo, $isPremium, $userId, $lang);
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
            
        case 'prophets':
            handleProphets($pdo, $isPremium, $lang);
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
 * 🌍 HELPER : Charger les traductions depuis JSON
 */
function loadTranslations($lang, $prophetName = 'muhammad') {
    // Chemin sur le serveur : private/premium/prophete_stories/{prophet_name}/
    if ($prophetName === 'adam') {
        // Adam : translations/prophet-stories/adam/
        $jsonFile = __DIR__ . "/translations/prophet-stories/adam/adam_stories_{$lang}.json";
        if (!file_exists($jsonFile)) {
            $jsonFile = __DIR__ . "/../private/premium/prophete_stories/adam/adam_stories_{$lang}.json";
        }
    } elseif ($prophetName === 'nuh') {
        // Noé : translations/prophet-stories/nuh/
        $jsonFile = __DIR__ . "/translations/prophet-stories/nuh/nuh_stories_{$lang}.json";
        if (!file_exists($jsonFile)) {
            $jsonFile = __DIR__ . "/../private/premium/prophete_stories/nuh/nuh_stories_{$lang}.json";
        }
    } elseif ($prophetName === 'hud') {
        // Hud : translations/prophet-stories/hud/
        $jsonFile = __DIR__ . "/translations/prophet-stories/hud/hud_stories_{$lang}.json";
        if (!file_exists($jsonFile)) {
            $jsonFile = __DIR__ . "/../private/premium/prophete_stories/hud/hud_stories_{$lang}.json";
        }
    } elseif ($prophetName === 'salih') {
        // Salih : translations/prophet-stories/salih/
        $jsonFile = __DIR__ . "/translations/prophet-stories/salih/salih_stories_{$lang}.json";
        if (!file_exists($jsonFile)) {
            $jsonFile = __DIR__ . "/../private/premium/prophete_stories/salih/salih_stories_{$lang}.json";
        }
    } elseif ($prophetName === 'ibrahim') {
        // Ibrahim : translations/prophet-stories/ibrahim/
        $jsonFile = __DIR__ . "/translations/prophet-stories/ibrahim/ibrahim_stories_{$lang}.json";
        if (!file_exists($jsonFile)) {
            $jsonFile = __DIR__ . "/../private/premium/prophete_stories/ibrahim/ibrahim_stories_{$lang}.json";
        }
    } elseif ($prophetName === 'lut') {
        // Lut : translations/prophet-stories/lut/
        $jsonFile = __DIR__ . "/translations/prophet-stories/lut/lut_stories_{$lang}.json";
        if (!file_exists($jsonFile)) {
            $jsonFile = __DIR__ . "/../private/premium/prophete_stories/lut/lut_stories_{$lang}.json";
        }
    } elseif ($prophetName === 'yusuf') {
        // Yusuf : translations/prophet-stories/yusuf/
        $jsonFile = __DIR__ . "/translations/prophet-stories/yusuf/yusuf_stories_{$lang}.json";
        if (!file_exists($jsonFile)) {
            $jsonFile = __DIR__ . "/../private/premium/prophete_stories/yusuf/yusuf_stories_{$lang}.json";
        }
    } elseif ($prophetName === 'musa') {
        // Musa : translations/prophet-stories/musa/
        $jsonFile = __DIR__ . "/translations/prophet-stories/musa/musa_stories_{$lang}.json";
        if (!file_exists($jsonFile)) {
            $jsonFile = __DIR__ . "/../private/premium/prophete_stories/musa/musa_stories_{$lang}.json";
        }
    } elseif ($prophetName === 'dawud') {
        // Dawud : translations/prophet-stories/dawud/
        $jsonFile = __DIR__ . "/translations/prophet-stories/dawud/dawud_stories_{$lang}.json";
        if (!file_exists($jsonFile)) {
            $jsonFile = __DIR__ . "/../private/premium/prophete_stories/dawud/dawud_stories_{$lang}.json";
        }
    } elseif ($prophetName === 'sulayman') {
        // Sulayman : translations/prophet-stories/sulayman/
        $jsonFile = __DIR__ . "/translations/prophet-stories/sulayman/sulayman_stories_{$lang}.json";
        if (!file_exists($jsonFile)) {
            $jsonFile = __DIR__ . "/../private/premium/prophete_stories/sulayman/sulayman_stories_{$lang}.json";
        }
    } elseif ($prophetName === 'yunus') {
        // Yunus : translations/prophet-stories/yunus/
        $jsonFile = __DIR__ . "/translations/prophet-stories/yunus/yunus_stories_{$lang}.json";
        if (!file_exists($jsonFile)) {
            $jsonFile = __DIR__ . "/../private/premium/prophete_stories/yunus/yunus_stories_{$lang}.json";
        }
    } elseif ($prophetName === 'ayyub') {
        $jsonFile = __DIR__ . "/translations/prophet-stories/ayyub/ayyub_stories_{$lang}.json";
        if (!file_exists($jsonFile)) $jsonFile = __DIR__ . "/../private/premium/prophete_stories/ayyub/ayyub_stories_{$lang}.json";
    } elseif ($prophetName === 'zakariya') {
        $jsonFile = __DIR__ . "/translations/prophet-stories/zakariya/zakariya_stories_{$lang}.json";
        if (!file_exists($jsonFile)) $jsonFile = __DIR__ . "/../private/premium/prophete_stories/zakariya/zakariya_stories_{$lang}.json";
    } elseif ($prophetName === 'yahya') {
        $jsonFile = __DIR__ . "/translations/prophet-stories/yahya/yahya_stories_{$lang}.json";
        if (!file_exists($jsonFile)) $jsonFile = __DIR__ . "/../private/premium/prophete_stories/yahya/yahya_stories_{$lang}.json";
    } elseif ($prophetName === 'ilyas') {
        $jsonFile = __DIR__ . "/translations/prophet-stories/ilyas/ilyas_stories_{$lang}.json";
        if (!file_exists($jsonFile)) $jsonFile = __DIR__ . "/../private/premium/prophete_stories/ilyas/ilyas_stories_{$lang}.json";
    } elseif ($prophetName === 'alyasa') {
        $jsonFile = __DIR__ . "/translations/prophet-stories/alyasa/alyasa_stories_{$lang}.json";
        if (!file_exists($jsonFile)) $jsonFile = __DIR__ . "/../private/premium/prophete_stories/alyasa/alyasa_stories_{$lang}.json";
    } elseif ($prophetName === 'shuayb') {
        $jsonFile = __DIR__ . "/translations/prophet-stories/shuayb/shuayb_stories_{$lang}.json";
        if (!file_exists($jsonFile)) $jsonFile = __DIR__ . "/../private/premium/prophete_stories/shuayb/shuayb_stories_{$lang}.json";
    } elseif ($prophetName === 'isa') {
        // Isa : translations/prophet-stories/isa/
        $jsonFile = __DIR__ . "/translations/prophet-stories/isa/isa_stories_{$lang}.json";
        if (!file_exists($jsonFile)) {
            $jsonFile = __DIR__ . "/../private/premium/prophete_stories/isa/isa_stories_{$lang}.json";
        }
    } else {
        // Muhammad : prophete_stories/muhammad/prophet_stories_{lang}.json
        $jsonFile = __DIR__ . "/../private/premium/prophete_stories/muhammad/prophet_stories_{$lang}.json";
    }
    
    // Si le fichier n'existe pas, essayer l'anglais par défaut
    if (!file_exists($jsonFile)) {
        error_log("⚠️ Fichier de traduction non trouvé pour '$lang' : {$jsonFile}");
        
        // Fallback vers l'anglais si pas la langue anglaise
        if ($lang !== 'en') {
            error_log("🔄 Tentative de fallback vers l'anglais...");
            if ($prophetName === 'adam') {
                $jsonFile = __DIR__ . "/translations/prophet-stories/adam/adam_stories_en.json";
                if (!file_exists($jsonFile)) $jsonFile = __DIR__ . "/../private/premium/prophete_stories/adam/adam_stories_en.json";
            } elseif ($prophetName === 'nuh') {
                $jsonFile = __DIR__ . "/translations/prophet-stories/nuh/nuh_stories_en.json";
                if (!file_exists($jsonFile)) $jsonFile = __DIR__ . "/../private/premium/prophete_stories/nuh/nuh_stories_en.json";
            } elseif ($prophetName === 'hud') {
                $jsonFile = __DIR__ . "/translations/prophet-stories/hud/hud_stories_en.json";
                if (!file_exists($jsonFile)) $jsonFile = __DIR__ . "/../private/premium/prophete_stories/hud/hud_stories_en.json";
            } elseif ($prophetName === 'salih') {
                $jsonFile = __DIR__ . "/translations/prophet-stories/salih/salih_stories_en.json";
                if (!file_exists($jsonFile)) $jsonFile = __DIR__ . "/../private/premium/prophete_stories/salih/salih_stories_en.json";
            } elseif ($prophetName === 'ibrahim') {
                $jsonFile = __DIR__ . "/translations/prophet-stories/ibrahim/ibrahim_stories_en.json";
                if (!file_exists($jsonFile)) $jsonFile = __DIR__ . "/../private/premium/prophete_stories/ibrahim/ibrahim_stories_en.json";
            } elseif ($prophetName === 'lut') {
                $jsonFile = __DIR__ . "/translations/prophet-stories/lut/lut_stories_en.json";
                if (!file_exists($jsonFile)) $jsonFile = __DIR__ . "/../private/premium/prophete_stories/lut/lut_stories_en.json";
            } elseif ($prophetName === 'yusuf') {
                $jsonFile = __DIR__ . "/translations/prophet-stories/yusuf/yusuf_stories_en.json";
                if (!file_exists($jsonFile)) $jsonFile = __DIR__ . "/../private/premium/prophete_stories/yusuf/yusuf_stories_en.json";
            } elseif ($prophetName === 'musa') {
                $jsonFile = __DIR__ . "/translations/prophet-stories/musa/musa_stories_en.json";
                if (!file_exists($jsonFile)) $jsonFile = __DIR__ . "/../private/premium/prophete_stories/musa/musa_stories_en.json";
            } elseif ($prophetName === 'dawud') {
                $jsonFile = __DIR__ . "/translations/prophet-stories/dawud/dawud_stories_en.json";
                if (!file_exists($jsonFile)) $jsonFile = __DIR__ . "/../private/premium/prophete_stories/dawud/dawud_stories_en.json";
            } elseif ($prophetName === 'sulayman') {
                $jsonFile = __DIR__ . "/translations/prophet-stories/sulayman/sulayman_stories_en.json";
                if (!file_exists($jsonFile)) $jsonFile = __DIR__ . "/../private/premium/prophete_stories/sulayman/sulayman_stories_en.json";
            } elseif ($prophetName === 'yunus') {
                $jsonFile = __DIR__ . "/translations/prophet-stories/yunus/yunus_stories_en.json";
                if (!file_exists($jsonFile)) $jsonFile = __DIR__ . "/../private/premium/prophete_stories/yunus/yunus_stories_en.json";
            } elseif ($prophetName === 'ayyub') {
                $jsonFile = __DIR__ . "/translations/prophet-stories/ayyub/ayyub_stories_en.json";
                if (!file_exists($jsonFile)) $jsonFile = __DIR__ . "/../private/premium/prophete_stories/ayyub/ayyub_stories_en.json";
            } elseif ($prophetName === 'zakariya') {
                $jsonFile = __DIR__ . "/translations/prophet-stories/zakariya/zakariya_stories_en.json";
                if (!file_exists($jsonFile)) $jsonFile = __DIR__ . "/../private/premium/prophete_stories/zakariya/zakariya_stories_en.json";
            } elseif ($prophetName === 'yahya') {
                $jsonFile = __DIR__ . "/translations/prophet-stories/yahya/yahya_stories_en.json";
                if (!file_exists($jsonFile)) $jsonFile = __DIR__ . "/../private/premium/prophete_stories/yahya/yahya_stories_en.json";
            } elseif ($prophetName === 'ilyas') {
                $jsonFile = __DIR__ . "/translations/prophet-stories/ilyas/ilyas_stories_en.json";
                if (!file_exists($jsonFile)) $jsonFile = __DIR__ . "/../private/premium/prophete_stories/ilyas/ilyas_stories_en.json";
            } elseif ($prophetName === 'alyasa') {
                $jsonFile = __DIR__ . "/translations/prophet-stories/alyasa/alyasa_stories_en.json";
                if (!file_exists($jsonFile)) $jsonFile = __DIR__ . "/../private/premium/prophete_stories/alyasa/alyasa_stories_en.json";
            } elseif ($prophetName === 'shuayb') {
                $jsonFile = __DIR__ . "/translations/prophet-stories/shuayb/shuayb_stories_en.json";
                if (!file_exists($jsonFile)) $jsonFile = __DIR__ . "/../private/premium/prophete_stories/shuayb/shuayb_stories_en.json";
            } elseif ($prophetName === 'isa') {
                $jsonFile = __DIR__ . "/translations/prophet-stories/isa/isa_stories_en.json";
                if (!file_exists($jsonFile)) $jsonFile = __DIR__ . "/../private/premium/prophete_stories/isa/isa_stories_en.json";
            } else {
                $jsonFile = __DIR__ . "/../private/premium/prophete_stories/muhammad/prophet_stories_en.json";
            }
            
            if (!file_exists($jsonFile)) {
                error_log("❌ Fichier anglais non trouvé non plus");
                return null;
            }
        } else {
            return null;
        }
    }
    
    $jsonContent = file_get_contents($jsonFile);
    $translations = json_decode($jsonContent, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("❌ Erreur JSON : " . json_last_error_msg());
        return null;
    }
    
    return $translations;
}

/**
 * 📖 CATALOG : Liste toutes les histoires disponibles
 */
function handleCatalog($pdo, $isPremium, $userId, $lang) {
    $prophetName = $_GET['prophet'] ?? 'muhammad'; // Par défaut: Muhammad (PBUH)
    $category = $_GET['category'] ?? null;
    $difficulty = $_GET['difficulty'] ?? null;
    
    // 🔐 Requête BDD : Métadonnées uniquement (pas de contenu textuel)
    if ($userId) {
        // Utilisateur authentifié : inclure les statistiques personnelles
        $sql = "SELECT 
                    ps.id, 
                    ps.category, ps.difficulty, 
                    ps.age_recommendation, ps.reading_time, ps.word_count,
                    IFNULL(ps.historical_period_start, 0) as historical_period_start, 
                    IFNULL(ps.historical_period_end, 0) as historical_period_end,
                    ps.is_premium, ps.created_at, 
                    IFNULL(ps.view_count, 0) as view_count, 
                    IFNULL(ps.rating, 0.00) as rating,
                    ps.has_interactive_elements,
                    ps.chronological_order,
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
        // Utilisateur non authentifié : métadonnées publiques
        $sql = "SELECT 
                    ps.id, 
                    ps.category, ps.difficulty, 
                    ps.age_recommendation, ps.reading_time, ps.word_count,
                    IFNULL(ps.historical_period_start, 0) as historical_period_start, 
                    IFNULL(ps.historical_period_end, 0) as historical_period_end,
                    ps.is_premium, ps.created_at, 
                    IFNULL(ps.view_count, 0) as view_count, 
                    IFNULL(ps.rating, 0.00) as rating,
                    ps.has_interactive_elements,
                    ps.chronological_order,
                    -- Valeurs par défaut
                    0 as user_progress,
                    0 as is_favorited
                FROM prophet_stories ps
                WHERE 1=1";
        $params = [];
    }
    
    // 🕌 Filtrer par prophète
    $sql .= " AND ps.prophet_name = ?";
    $params[] = $prophetName;
    
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
    
    // 🌍 Fusionner avec les traductions JSON
    $translations = loadTranslations($lang, $prophetName);
    if ($translations) {
        foreach ($stories as &$story) {
            $storyId = $story['id'];
            if (isset($translations[$storyId])) {
                $trans = $translations[$storyId];
                // Ajouter tous les champs textuels depuis le JSON
                $story['title'] = $trans['title'] ?? '';
                $story['title_arabic'] = $trans['title_arabic'] ?? '';
                $story['introduction'] = $trans['introduction'] ?? '';
                $story['conclusion'] = $trans['conclusion'] ?? '';
                $story['moral_lesson'] = $trans['moral_lesson'] ?? '';
                $story['historical_location'] = $trans['historical_location'] ?? '';
                $story['historical_context'] = $trans['historical_context'] ?? '';
            } else {
                // Si pas de traduction, mettre des valeurs vides
                $story['title'] = '';
                $story['title_arabic'] = '';
                $story['introduction'] = '';
                $story['conclusion'] = '';
                $story['moral_lesson'] = '';
                $story['historical_location'] = '';
                $story['historical_context'] = '';
            }
        }
        unset($story); // Libérer la référence
    }
    
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
function handleStoryContent($pdo, $isPremium, $userId, $lang) {
    $storyId = $_GET['id'] ?? '';
    
    if (empty($storyId)) {
        throw new Exception('ID de l\'histoire requis');
    }
    
    // Récupérer les métadonnées depuis la BDD
    $storyStmt = $pdo->prepare("SELECT * FROM prophet_stories WHERE id = ?");
    $storyStmt->execute([$storyId]);
    $story = $storyStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$story) {
        throw new Exception('Histoire non trouvée');
    }
    
    // 🔐 SÉCURITÉ : Vérifier l'accès premium
    if ($story['is_premium'] && !$isPremium) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Abonnement Premium requis pour cette histoire',
            'requires_auth' => !$userId ? 'Vous devez vous connecter pour accéder au contenu premium' : 'Abonnement Premium requis'
        ]);
        return;
    }
    
    // 🌍 Charger le contenu complet depuis le JSON
    $prophetName = $story['prophet_name'] ?? 'muhammad';
    $translations = loadTranslations($lang, $prophetName);
    if (!$translations || !isset($translations[$storyId])) {
        throw new Exception('Traduction non disponible pour cette histoire');
    }
    
    $storyContent = $translations[$storyId];
    
    // Fusionner métadonnées BDD + contenu JSON
    $story['title'] = $storyContent['title'] ?? '';
    $story['title_arabic'] = $storyContent['title_arabic'] ?? '';
    $story['introduction'] = $storyContent['introduction'] ?? '';
    $story['conclusion'] = $storyContent['conclusion'] ?? '';
    $story['moral_lesson'] = $storyContent['moral_lesson'] ?? '';
    $story['historical_location'] = $storyContent['historical_location'] ?? '';
    $story['historical_context'] = $storyContent['historical_context'] ?? '';
    
    // Récupérer les métadonnées des chapitres depuis la BDD
    $chaptersStmt = $pdo->prepare("
        SELECT id, chapter_order, reading_time
        FROM prophet_story_chapters 
        WHERE story_id = ? 
        ORDER BY chapter_order ASC
    ");
    $chaptersStmt->execute([$storyId]);
    $chaptersFromDB = $chaptersStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Fusionner avec le contenu JSON
    $chapters = [];
    foreach ($chaptersFromDB as $chapterMeta) {
        $chapterId = $chapterMeta['id'];
        // Chercher le contenu dans le JSON
        $chapterContent = null;
        foreach ($storyContent['chapters'] as $jsonChapter) {
            if ($jsonChapter['id'] === $chapterId) {
                $chapterContent = $jsonChapter;
                break;
            }
        }
        
        if ($chapterContent) {
            $chapters[] = [
                'id' => $chapterId,
                'title' => $chapterContent['title'] ?? '',
                'content' => $chapterContent['content'] ?? '',
                'chapter_order' => $chapterMeta['chapter_order'],
                'reading_time' => $chapterMeta['reading_time']
            ];
        }
    }
    
    // Récupérer les références depuis la BDD
    $referencesStmt = $pdo->prepare("
        SELECT id, type, source, reference_text, authenticity, content, reference_order
        FROM prophet_story_references 
        WHERE story_id = ?
        ORDER BY reference_order ASC
    ");
    $referencesStmt->execute([$storyId]);
    $referencesFromDB = $referencesStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Fusionner avec les traductions JSON
    $references = [];
    foreach ($referencesFromDB as $ref) {
        $refId = $ref['id'];
        // Chercher les traductions dans le JSON
        $refTranslation = null;
        foreach ($storyContent['references'] as $jsonRef) {
            if ($jsonRef['id'] == $refId) {
                $refTranslation = $jsonRef;
                break;
            }
        }
        
        $references[] = [
            'id' => $refId,
            'type' => $ref['type'],
            'source' => $ref['source'],
            'reference_text' => $ref['reference_text'],
            'authenticity' => $ref['authenticity'],
            'content' => $ref['content'], // Texte arabe original
            'translation' => $refTranslation['translation'] ?? '',
            'relevance' => $refTranslation['relevance'] ?? ''
        ];
    }
    
    // Récupérer le glossaire depuis la BDD
    $glossaryStmt = $pdo->prepare("
        SELECT id, term_key, arabic_term, pronunciation, category
        FROM prophet_story_glossary 
        WHERE story_id = ?
    ");
    $glossaryStmt->execute([$storyId]);
    $glossaryFromDB = $glossaryStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Fusionner avec les traductions JSON
    $glossary = [];
    foreach ($glossaryFromDB as $term) {
        $termKey = $term['term_key'];
        // Chercher les traductions dans le JSON
        $termTranslation = null;
        foreach ($storyContent['glossary'] as $jsonTerm) {
            if (isset($jsonTerm['term_key']) && $jsonTerm['term_key'] === $termKey) {
                $termTranslation = $jsonTerm;
                break;
            }
        }
        
        $glossary[] = [
            'term' => $termTranslation['term'] ?? '',
            'arabic_term' => $term['arabic_term'],
            'definition' => $termTranslation['definition'] ?? '',
            'pronunciation' => $term['pronunciation'],
            'category' => $term['category']
        ];
    }
    
    // 📊 Mettre à jour les statistiques de vue
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
 * 🕌 PROPHETS : Liste tous les prophètes disponibles avec leurs statistiques
 */
function handleProphets($pdo, $isPremium, $lang) {
    $sql = "
        SELECT 
            prophet_name,
            COUNT(*) as total_stories,
            COUNT(CASE WHEN is_premium = 0 THEN 1 END) as free_stories,
            COUNT(CASE WHEN is_premium = 1 THEN 1 END) as premium_stories,
            MIN(chronological_order) as first_order,
            MAX(chronological_order) as last_order
        FROM prophet_stories
        GROUP BY prophet_name
        ORDER BY 
            CASE prophet_name
                WHEN 'adam' THEN 1
                WHEN 'nuh' THEN 2
                WHEN 'hud' THEN 3
                WHEN 'salih' THEN 4
                WHEN 'ibrahim' THEN 5
                WHEN 'lut' THEN 6
                WHEN 'yusuf' THEN 7
                WHEN 'musa' THEN 8
                WHEN 'dawud' THEN 9
                WHEN 'sulayman' THEN 10
                WHEN 'yunus' THEN 11
                WHEN 'ayyub' THEN 12
                WHEN 'zakariya' THEN 13
                WHEN 'yahya' THEN 14
                WHEN 'ilyas' THEN 15
                WHEN 'alyasa' THEN 16
                WHEN 'shuayb' THEN 17
                WHEN 'isa' THEN 18
                WHEN 'muhammad' THEN 19
                ELSE 99
            END
    ";
    
    $stmt = $pdo->query($sql);
    $prophets = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Traductions des noms de prophètes
    $prophetNames = [
        'adam' => [
            'fr' => 'Adam', 'en' => 'Adam', 'ar' => 'آدم',
            'es' => 'Adán', 'de' => 'Adam', 'it' => 'Adamo',
            'tr' => 'Adem', 'pt' => 'Adão', 'nl' => 'Adam',
            'ru' => 'Адам', 'bn' => 'আদম', 'fa' => 'آدم', 'ur' => 'آدم'
        ],
        'nuh' => [
            'fr' => 'Noé', 'en' => 'Noah', 'ar' => 'نوح',
            'es' => 'Noé', 'de' => 'Noah', 'it' => 'Noè',
            'tr' => 'Nuh', 'pt' => 'Noé', 'nl' => 'Noach',
            'ru' => 'Нух', 'bn' => 'নূহ', 'fa' => 'نوح', 'ur' => 'نوح'
        ],
        'hud' => [
            'fr' => 'Hud', 'en' => 'Hud', 'ar' => 'هود',
            'es' => 'Hud', 'de' => 'Hud', 'it' => 'Hud',
            'tr' => 'Hud', 'pt' => 'Hud', 'nl' => 'Hud',
            'ru' => 'Худ', 'bn' => 'হুদ', 'fa' => 'هود', 'ur' => 'ہود'
        ],
        'salih' => [
            'fr' => 'Salih', 'en' => 'Salih', 'ar' => 'صالح',
            'es' => 'Salih', 'de' => 'Salih', 'it' => 'Salih',
            'tr' => 'Salih', 'pt' => 'Salé', 'nl' => 'Salih',
            'ru' => 'Салих', 'bn' => 'সালিহ', 'fa' => 'صالح', 'ur' => 'صالح'
        ],
        'ibrahim' => [
            'fr' => 'Ibrahim', 'en' => 'Abraham', 'ar' => 'إبراهيم',
            'es' => 'Ibrahim', 'de' => 'Ibrahim', 'it' => 'Ibrahim',
            'tr' => 'İbrahim', 'pt' => 'Ibrahim', 'nl' => 'Ibrahim',
            'ru' => 'Ибрахим', 'bn' => 'ইব্রাহীম', 'fa' => 'ابراهیم', 'ur' => 'ابراہیم'
        ],
        'lut' => [
            'fr' => 'Lut', 'en' => 'Lot', 'ar' => 'لوط',
            'es' => 'Lot', 'de' => 'Lot', 'it' => 'Lot',
            'tr' => 'Lut', 'pt' => 'Ló', 'nl' => 'Lot',
            'ru' => 'Лут', 'bn' => 'লূত', 'fa' => 'لوط', 'ur' => 'لوط'
        ],
        'yusuf' => [
            'fr' => 'Yusuf', 'en' => 'Joseph', 'ar' => 'يوسف',
            'es' => 'José', 'de' => 'Josef', 'it' => 'Giuseppe',
            'tr' => 'Yusuf', 'pt' => 'José', 'nl' => 'Jozef',
            'ru' => 'Юсуф', 'bn' => 'ইউসুফ', 'fa' => 'یوسف', 'ur' => 'یوسف'
        ],
        'musa' => [
            'fr' => 'Musa', 'en' => 'Moses', 'ar' => 'موسى',
            'es' => 'Musa', 'de' => 'Musa', 'it' => 'Musa',
            'tr' => 'Musa', 'pt' => 'Musa', 'nl' => 'Musa',
            'ru' => 'Муса', 'bn' => 'মূসা', 'fa' => 'موسی', 'ur' => 'موسی'
        ],
        'dawud' => [
            'fr' => 'Dawud', 'en' => 'David', 'ar' => 'داوود',
            'es' => 'Dawud', 'de' => 'Dawud', 'it' => 'Dawud',
            'tr' => 'Davut', 'pt' => 'Dawud', 'nl' => 'Dawud',
            'ru' => 'Дауд', 'bn' => 'দাউদ', 'fa' => 'داوود', 'ur' => 'داؤد'
        ],
        'sulayman' => [
            'fr' => 'Sulayman', 'en' => 'Solomon', 'ar' => 'سليمان',
            'es' => 'Sulayman', 'de' => 'Sulayman', 'it' => 'Sulayman',
            'tr' => 'Süleyman', 'pt' => 'Sulayman', 'nl' => 'Sulayman',
            'ru' => 'Сулейман', 'bn' => 'সুলাইমান', 'fa' => 'سلیمان', 'ur' => 'سلیمان'
        ],
        'yunus' => [
            'fr' => 'Yunus', 'en' => 'Jonah', 'ar' => 'يونس',
            'es' => 'Yunus', 'de' => 'Yunus', 'it' => 'Yunus',
            'tr' => 'Yunus', 'pt' => 'Yunus', 'nl' => 'Yunus',
            'ru' => 'Юнус', 'bn' => 'ইউনুস', 'fa' => 'یونس', 'ur' => 'یونس'
        ],
        'ayyub' => [
            'fr' => 'Ayyub', 'en' => 'Job', 'ar' => 'أيوب',
            'es' => 'Ayyub', 'de' => 'Ayyub', 'it' => 'Ayyub',
            'tr' => 'Eyyub', 'pt' => 'Ayyub', 'nl' => 'Ayyub',
            'ru' => 'Айюб', 'bn' => 'আইয়ুব', 'fa' => 'ایوب', 'ur' => 'ایوب'
        ],
        'zakariya' => [
            'fr' => 'Zakariya', 'en' => 'Zechariah', 'ar' => 'زكريا',
            'es' => 'Zakariya', 'de' => 'Zakariya', 'it' => 'Zaccaria',
            'tr' => 'Zekeriya', 'pt' => 'Zakariya', 'nl' => 'Zakariya',
            'ru' => 'Закария', 'bn' => 'জাকারিয়া', 'fa' => 'زکریا', 'ur' => 'زکریا'
        ],
        'yahya' => [
            'fr' => 'Yahya', 'en' => 'John', 'ar' => 'يحيى',
            'es' => 'Yahya', 'de' => 'Yahya', 'it' => 'Yahya',
            'tr' => 'Yahya', 'pt' => 'Yahya', 'nl' => 'Yahya',
            'ru' => 'Яхья', 'bn' => 'ইয়াহিয়া', 'fa' => 'یحیی', 'ur' => 'یحیی'
        ],
        'ilyas' => [
            'fr' => 'Ilyas', 'en' => 'Elijah', 'ar' => 'إلياس',
            'es' => 'Ilyas', 'de' => 'Ilyas', 'it' => 'Elia',
            'tr' => 'İlyas', 'pt' => 'Ilyas', 'nl' => 'Ilyas',
            'ru' => 'Ильяс', 'bn' => 'ইলিয়াস', 'fa' => 'الیاس', 'ur' => 'الیاس'
        ],
        'alyasa' => [
            'fr' => "Al-Yasa", 'en' => 'Elisha', 'ar' => 'اليسع',
            'es' => 'Al-Yasa', 'de' => 'Al-Yasa', 'it' => 'Eliseo',
            'tr' => 'Elyesa', 'pt' => 'Al-Yasa', 'nl' => 'Al-Yasa',
            'ru' => 'Аль-Яса', 'bn' => 'আল-ইয়াসা', 'fa' => 'الیسع', 'ur' => 'الیسع'
        ],
        'shuayb' => [
            'fr' => "Shu'ayb", 'en' => "Shu'ayb", 'ar' => 'شعيب',
            'es' => "Shu'ayb", 'de' => "Schu'aib", 'it' => "Shu'ayb",
            'tr' => 'Şuayb', 'pt' => "Shu'ayb", 'nl' => "Shu'ayb",
            'ru' => 'Шуайб', 'bn' => 'শুআইব', 'fa' => 'شعیب', 'ur' => 'شعیب'
        ],
        'isa' => [
            'fr' => 'Isa', 'en' => 'Jesus', 'ar' => 'عيسى',
            'es' => 'Isa', 'de' => 'Isa', 'it' => 'Isa',
            'tr' => 'İsa', 'pt' => 'Isa', 'nl' => 'Isa',
            'ru' => 'Иса', 'bn' => 'ঈসা', 'fa' => 'عیسی', 'ur' => 'عیسی'
        ],
        'muhammad' => [
            'fr' => 'Muhammad', 'en' => 'Muhammad', 'ar' => 'محمد',
            'es' => 'Muhammad', 'de' => 'Muhammad', 'it' => 'Muhammad',
            'tr' => 'Muhammed', 'pt' => 'Muhammad', 'nl' => 'Muhammad',
            'ru' => 'Мухаммад', 'bn' => 'মুহাম্মদ', 'fa' => 'محمد', 'ur' => 'محمد'
        ]
    ];
    
    // Ajouter les noms traduits
    foreach ($prophets as &$prophet) {
        $key = $prophet['prophet_name'];
        $prophet['display_name'] = $prophetNames[$key][$lang] ?? ucfirst($key);
        $prophet['display_name_arabic'] = $prophetNames[$key]['ar'] ?? '';
    }
    unset($prophet);
    
    echo json_encode([
        'success' => true,
        'message' => 'Liste des prophètes récupérée',
        'timestamp' => date('c'),
        'data' => [
            'prophets' => $prophets,
            'user_premium' => $isPremium
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
