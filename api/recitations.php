<?php
// Content-Type sera défini par action (JSON pour catalog/surah, audio pour stream)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once 'config.php';
require_once __DIR__ . '/mp3_duration_helper.php';

// 🔐 Exiger auth pour toutes les actions premium (catalog/surah/stream/download)
// Note: on autorise temporairement catalog/surah sans premium strict si besoin, mais on lit l’utilisateur
$auth = requireAuthStrict();

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
            header('Content-Type: application/json');
            echo json_encode(getCatalog());
            break;
            
        case 'surah':
            header('Content-Type: application/json');
            header('Cache-Control: no-store, no-cache, must-revalidate');
            header('Pragma: no-cache');
            $reciter = $_GET['reciter'] ?? '';
            $surah = normalizeSurahCode($_GET['surah'] ?? '');
            echo json_encode(getSurahInfo($reciter, $surah));
            break;
            
        case 'stream':
            // Vérifier premium
            if (empty($auth['is_premium'])) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Abonnement Premium requis']);
                exit;
            }
            $reciter = $_GET['reciter'] ?? '';
            $surah = normalizeSurahCode($_GET['surah'] ?? '');
            streamAudio($reciter, $surah);
            break;
            
        case 'download':
            // Vérifier premium
            if (empty($auth['is_premium'])) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Abonnement Premium requis']);
                exit;
            }
            $reciter = $_GET['reciter'] ?? '';
            $surah = normalizeSurahCode($_GET['surah'] ?? '');
            downloadAudio($reciter, $surah);
            break;

        case 'sync_downloads':
            header('Content-Type: application/json');
            if (empty($auth['is_premium'])) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Abonnement Premium requis']);
                exit;
            }
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
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erreur serveur: ' . $e->getMessage()
    ]);
}

/** Normalise "2" → "002" pour correspondre aux noms de fichiers sur le serveur. */
function normalizeSurahCode($surah) {
    if ($surah === '' || $surah === null) {
        return '';
    }
    if (preg_match('/^\d{1,3}$/', (string)$surah)) {
        $n = (int)$surah;
        if ($n >= 1 && $n <= 114) {
            return str_pad((string)$n, 3, '0', STR_PAD_LEFT);
        }
    }
    return (string)$surah;
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

    $surah = normalizeSurahCode($surah);
    
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
    $durationSeconds = round(getMp3DurationSeconds($surahFile), 2);
    $fileMtime = @filemtime($surahFile);
    
    // 🔐 Ajouter le token courant dans les URLs pour permettre aux clients audio
    // d'accéder sans headers (expo-av ne permet pas toujours d'ajouter Authorization)
    $token = getBearerToken();
    $tokenParam = $token ? ("&token=" . urlencode($token)) : "";

    return [
        'success' => true,
        'data' => [
            'reciter' => $reciter,
            'surah' => $surah,
            'fileSize' => $fileSize,
            'fileSizeMB' => $fileSizeMB,
            'fileSizeBytes' => $fileSize,
            'fileModified' => $fileMtime ? date('c', $fileMtime) : null,
            'durationSeconds' => $durationSeconds,
            'durationMs' => (int) round($durationSeconds * 1000),
            'streamUrl' => "https://myadhanapp.com/api/recitations.php?action=stream&reciter=" . urlencode($reciter) . "&surah=" . urlencode($surah) . $tokenParam,
            'downloadUrl' => "https://myadhanapp.com/api/recitations.php?action=download&reciter=" . urlencode($reciter) . "&surah=" . urlencode($surah) . $tokenParam
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
    
    // Nettoyer tout buffer et définir les headers audio avec support des requêtes Range
    while (ob_get_level()) { ob_end_clean(); }
    header_remove('Content-Type');
    $size = filesize($filePath);
    $mime = 'audio/mpeg';
    header("Content-Type: $mime");
    header('Accept-Ranges: bytes');
    header('Cache-Control: public, max-age=3600');

    $start = 0;
    $length = $size;
    $end = $size - 1;

    if (isset($_SERVER['HTTP_RANGE'])) {
        if (preg_match('/bytes=([0-9]+)-([0-9]*)/i', $_SERVER['HTTP_RANGE'], $matches)) {
            $start = intval($matches[1]);
            if (!empty($matches[2])) {
                $end = intval($matches[2]);
            }
            if ($end >= $size) { $end = $size - 1; }
            $length = $end - $start + 1;
            header('HTTP/1.1 206 Partial Content');
            header("Content-Range: bytes $start-$end/$size");
        }
    }

    header("Content-Length: $length");

    $fp = fopen($filePath, 'rb');
    if ($start > 0) { fseek($fp, $start); }
    $bufferSize = 8192;
    $bytesSent = 0;
    while (!feof($fp) && $bytesSent < $length) {
        $read = ($length - $bytesSent) > $bufferSize ? $bufferSize : ($length - $bytesSent);
        $buffer = fread($fp, $read);
        echo $buffer;
        flush();
        $bytesSent += strlen($buffer);
    }
    fclose($fp);
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
    
    // Même logique Range que stream (seek MediaPlayer si lecture via download)
    while (ob_get_level()) { ob_end_clean(); }
    header_remove('Content-Type');
    $size = filesize($filePath);
    header('Content-Type: audio/mpeg');
    header('Content-Disposition: attachment; filename="' . $reciter . '_' . $surah . '.mp3"');
    header('Accept-Ranges: bytes');
    header('Cache-Control: public, max-age=3600');

    $start = 0;
    $length = $size;
    $end = $size - 1;

    if (isset($_SERVER['HTTP_RANGE'])) {
        if (preg_match('/bytes=([0-9]+)-([0-9]*)/i', $_SERVER['HTTP_RANGE'], $matches)) {
            $start = intval($matches[1]);
            if (!empty($matches[2])) {
                $end = intval($matches[2]);
            }
            if ($end >= $size) { $end = $size - 1; }
            $length = $end - $start + 1;
            header('HTTP/1.1 206 Partial Content');
            header("Content-Range: bytes $start-$end/$size");
        }
    }

    header("Content-Length: $length");

    $fp = fopen($filePath, 'rb');
    if ($start > 0) { fseek($fp, $start); }
    $bufferSize = 8192;
    $bytesSent = 0;
    while (!feof($fp) && $bytesSent < $length) {
        $read = ($length - $bytesSent) > $bufferSize ? $bufferSize : ($length - $bytesSent);
        $buffer = fread($fp, $read);
        echo $buffer;
        flush();
        $bytesSent += strlen($buffer);
    }
    fclose($fp);
    exit;
}
?> 