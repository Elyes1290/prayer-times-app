<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Configuration
$basePath = '../private/premium/quran/';
$allowedActions = ['catalog', 'surah', 'stream', 'download'];

// Récupérer l'action demandée
$action = $_GET['action'] ?? '';

if (!in_array($action, $allowedActions)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Action non autorisée'
    ]);
    exit;
}

try {
    switch ($action) {
        case 'catalog':
            echo json_encode(getCatalog());
            break;
            
        case 'surah':
            $reciter = $_GET['reciter'] ?? '';
            $surah = $_GET['surah'] ?? '';
            echo json_encode(getSurahInfo($reciter, $surah));
            break;
            
        case 'stream':
            $reciter = $_GET['reciter'] ?? '';
            $surah = $_GET['surah'] ?? '';
            streamAudio($reciter, $surah);
            break;
            
        case 'download':
            $reciter = $_GET['reciter'] ?? '';
            $surah = $_GET['surah'] ?? '';
            downloadAudio($reciter, $surah);
            break;

        case 'sync_downloads':
            // 🚀 NOUVEAU : Synchronisation des téléchargements
            $input = json_decode(file_get_contents('php://input'), true);
            
            $user_id = $input['user_id'] ?? null;
            $email = $input['email'] ?? null;
            $downloads = $input['downloads'] ?? [];

            if (!$user_id && !$email) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'user_id ou email requis']);
                exit;
            }

            // Récupérer l'utilisateur
            if ($user_id) {
                $stmt = $pdo->prepare("SELECT id FROM users WHERE id = ?");
                $stmt->execute([$user_id]);
            } else {
                $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
                $stmt->execute([$email]);
            }
            $user = $stmt->fetch();

            if (!$user) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Utilisateur non trouvé']);
                exit;
            }

            $user_id = $user['id'];

            // 🗑️ SUPPRIMÉ: Synchronisation avec downloaded_recitations
            // Cette table causait des désynchronisations entre la base de données et la réalité des fichiers
            // Le stockage local (AsyncStorage) est suffisant et plus fiable
            
            $inserted = 0; // Pas d'insertion en base de données

            echo json_encode([
                'success' => true,
                'message' => "$inserted téléchargements synchronisés",
                'inserted' => $inserted
            ]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erreur serveur: ' . $e->getMessage()
    ]);
}

function getCatalog() {
    global $basePath;
    
    if (!is_dir($basePath)) {
        return [
            'success' => false,
            'message' => 'Dossier des récitations non trouvé'
        ];
    }
    
    $reciters = [];
    $directories = scandir($basePath);
    
    foreach ($directories as $dir) {
        if ($dir !== '.' && $dir !== '..' && is_dir($basePath . $dir)) {
            $reciters[] = $dir;
        }
    }
    
    return [
        'success' => true,
        'data' => [
            'availableReciters' => $reciters,
            'totalReciters' => count($reciters)
        ]
    ];
}

function getSurahInfo($reciter, $surah) {
    global $basePath;
    
    if (empty($reciter) || empty($surah)) {
        return [
            'success' => false,
            'message' => 'Récitateur et sourate requis'
        ];
    }
    
    $reciterPath = $basePath . $reciter . '/';
    $surahFile = $reciterPath . $surah . '.mp3';
    
    if (!is_dir($reciterPath)) {
        return [
            'success' => false,
            'message' => 'Récitateur non trouvé'
        ];
    }
    
    if (!file_exists($surahFile)) {
        return [
            'success' => false,
            'message' => 'Sourate non trouvée'
        ];
    }
    
    $fileSize = filesize($surahFile);
    $fileSizeMB = round($fileSize / (1024 * 1024), 2);
    
    return [
        'success' => true,
        'data' => [
            'reciter' => $reciter,
            'surah' => $surah,
            'fileSize' => $fileSize,
            'fileSizeMB' => $fileSizeMB,
            'streamUrl' => "https://myadhanapp.com/api/recitations.php?action=stream&reciter=" . urlencode($reciter) . "&surah=" . urlencode($surah),
            'downloadUrl' => "https://myadhanapp.com/api/recitations.php?action=download&reciter=" . urlencode($reciter) . "&surah=" . urlencode($surah)
        ]
    ];
}

function streamAudio($reciter, $surah) {
    global $basePath;
    
    if (empty($reciter) || empty($surah)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Récitateur et sourate requis'
        ]);
        exit;
    }
    
    $filePath = $basePath . $reciter . '/' . $surah . '.mp3';
    
    if (!file_exists($filePath)) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Fichier audio non trouvé'
        ]);
        exit;
    }
    
    // Headers pour streaming audio
    header('Content-Type: audio/mpeg');
    header('Content-Length: ' . filesize($filePath));
    header('Accept-Ranges: bytes');
    header('Cache-Control: public, max-age=3600');
    
    // Lire et envoyer le fichier
    readfile($filePath);
    exit;
}

function downloadAudio($reciter, $surah) {
    global $basePath;
    
    if (empty($reciter) || empty($surah)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Récitateur et sourate requis'
        ]);
        exit;
    }
    
    $filePath = $basePath . $reciter . '/' . $surah . '.mp3';
    
    if (!file_exists($filePath)) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Fichier audio non trouvé'
        ]);
        exit;
    }
    
    // Headers pour téléchargement
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . $reciter . '_' . $surah . '.mp3"');
    header('Content-Length: ' . filesize($filePath));
    header('Cache-Control: no-cache');
    
    // Lire et envoyer le fichier
    readfile($filePath);
    exit;
}
?> 