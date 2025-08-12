<?php
/**
 * 🎵 ADHANS PREMIUM - Prayer Times App
 * Gestion des adhans premium stockés sur Infomaniak
 */

// Content-Type sera défini par action (JSON pour catalog/download, audio pour serve)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Gérer les requêtes OPTIONS (CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    $action = $_GET['action'] ?? '';
    
    if (empty($action)) {
        throw new Exception('Paramètre action requis');
    }
    
    // 🔐 Exiger que l'utilisateur soit authentifié et premium pour toutes les actions adhans premium
    require_once 'config.php';
    $auth = requireAuthStrict();
    $isPremium = !empty($auth['is_premium']);

    switch ($action) {
        case 'catalog':
// Content-Type défini par action (JSON pour catalog/download, audio pour serve)
            if (!$isPremium) {
                echo json_encode(['success' => false, 'message' => 'Abonnement Premium requis']);
                return;
            }
            handleCatalog();
            break;
        case 'download':
            header('Content-Type: application/json');
            if (!$isPremium) {
                echo json_encode(['success' => false, 'message' => 'Abonnement Premium requis']);
                return;
            }
            handleDownload();
            break;
        case 'serve':
            if (!$isPremium) {
                echo json_encode(['success' => false, 'message' => 'Abonnement Premium requis']);
                return;
            }
            handleServe();
            break;
        default:
            throw new Exception('Action non reconnue');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'timestamp' => date('c'),
        'data' => null
    ]);
}

function handleCatalog() {
    // 🎵 Scanner le vrai dossier des adhans premium sur Infomaniak
    $adhanDirectory = __DIR__ . '/../private/premium/adhan/';
    
    if (!is_dir($adhanDirectory)) {
        echo json_encode([
            'success' => true,
            'message' => 'Dossier adhan non trouvé',
            'timestamp' => date('c'),
            'data' => [
                'availableAdhans' => [],
                'total' => 0
            ]
        ]);
        return;
    }
    
    $availableAdhans = [];
    $allowedExtensions = ['mp3', 'wav', 'ogg', 'm4a'];
    
    $items = scandir($adhanDirectory);
    
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        
        $itemPath = $adhanDirectory . '/' . $item;
        
        if (is_file($itemPath)) {
            $extension = strtolower(pathinfo($item, PATHINFO_EXTENSION));
            
            if (in_array($extension, $allowedExtensions)) {
                // Extraire le nom de l'adhan depuis le nom de fichier
                $adhanName = pathinfo($item, PATHINFO_FILENAME);
                $adhanName = str_replace(['_', '-'], ' ', $adhanName);
                $adhanName = ucwords($adhanName);
                
                if (!in_array($adhanName, $availableAdhans)) {
                    $availableAdhans[] = $adhanName;
                }
            }
        }
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Catalogue des adhans récupéré',
        'timestamp' => date('c'),
        'data' => [
            'availableAdhans' => $availableAdhans,
            'total' => count($availableAdhans)
        ]
    ]);
}

function handleDownload() {
    $adhanName = $_GET['adhan'] ?? '';
    if (empty($adhanName)) {
        throw new Exception('Nom de l\'adhan requis');
    }

    // 🎵 Scanner le dossier pour trouver le fichier correspondant
    $adhanDirectory = __DIR__ . '/../private/premium/adhan/';
    if (!is_dir($adhanDirectory)) {
        throw new Exception('Dossier adhan non trouvé');
    }

    $allowedExtensions = ['mp3', 'wav', 'ogg', 'm4a'];
    $items = scandir($adhanDirectory);
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        $itemPath = $adhanDirectory . '/' . $item;
        if (is_file($itemPath)) {
            $extension = strtolower(pathinfo($item, PATHINFO_EXTENSION));
            if (in_array($extension, $allowedExtensions)) {
                $fileName = pathinfo($item, PATHINFO_FILENAME);
                $fileNameFormatted = str_replace(['_', '-'], ' ', $fileName);
                $fileNameFormatted = ucwords($fileNameFormatted);
                if ($fileNameFormatted === $adhanName) {
                    $fileSize = filesize($itemPath);
                    $fileSizeMB = round($fileSize / (1024 * 1024), 2);
                    // 🔐 Construire l'URL vers serve, avec token via header ou query
                    $token = getBearerToken();
                    if (!$token && isset($_GET['token']) && !empty($_GET['token'])) {
                        $token = $_GET['token'];
                    }
                    $tokenParam = $token ? ("&token=" . urlencode($token)) : "";
                    $serveUrl = "https://myadhanapp.com/api/adhans.php?action=serve&adhan=" . urlencode($adhanName) . $tokenParam;
                    echo json_encode([
                        'success' => true,
                        'message' => 'URL sécurisée générée',
                        'timestamp' => date('c'),
                        'data' => [
                            'adhanName' => $adhanName,
                            'downloadUrl' => $serveUrl,
                            'fileSizeMB' => $fileSizeMB
                        ]
                    ]);
                    return;
                }
            }
        }
    }
    throw new Exception('Adhan non trouvé');
}

/**
 * 🔐 Servir le fichier d'adhan après vérification premium
 */
function handleServe() {
    $adhanName = $_GET['adhan'] ?? '';
    if (empty($adhanName)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Nom de l\'adhan requis']);
        return;
    }

    $adhanDirectory = __DIR__ . '/../private/premium/adhan/';
    if (!is_dir($adhanDirectory)) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Dossier adhan non trouvé']);
        return;
    }

    $allowedExtensions = ['mp3', 'wav', 'ogg', 'm4a'];
    $items = scandir($adhanDirectory);
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        $itemPath = $adhanDirectory . '/' . $item;
        if (is_file($itemPath)) {
            $extension = strtolower(pathinfo($item, PATHINFO_EXTENSION));
            if (!in_array($extension, $allowedExtensions)) continue;

            $fileName = pathinfo($item, PATHINFO_FILENAME);
            $fileNameFormatted = str_replace(['_', '-'], ' ', $fileName);
            $fileNameFormatted = ucwords($fileNameFormatted);
            if ($fileNameFormatted === $adhanName) {
                $fileSize = filesize($itemPath);
                $mime = 'application/octet-stream';
                if ($extension === 'mp3') $mime = 'audio/mpeg';
                if ($extension === 'wav') $mime = 'audio/wav';
                if ($extension === 'ogg') $mime = 'audio/ogg';
                if ($extension === 'm4a') $mime = 'audio/mp4';

                @ini_set('zlib.output_compression', 'Off');
                if (function_exists('apache_setenv')) @apache_setenv('no-gzip', '1');

                if ($_SERVER['REQUEST_METHOD'] === 'HEAD') {
                    header("Content-Type: $mime");
                    header('Accept-Ranges: bytes');
                    header('Cache-Control: private, max-age=3600');
                    header('Content-Length: ' . $fileSize);
                    header('Content-Transfer-Encoding: binary');
                    header('Content-Disposition: attachment; filename="' . basename($itemPath) . '"');
                    return;
                }

                $range = isset($_SERVER['HTTP_RANGE']) ? $_SERVER['HTTP_RANGE'] : null;
                if ($range && preg_match('/bytes=(\d+)-(\d*)/', $range, $matches)) {
                    $start = (int)$matches[1];
                    $end = ($matches[2] !== '') ? (int)$matches[2] : ($fileSize - 1);
                    if ($start > $end || $end >= $fileSize) {
                        http_response_code(416);
                        header("Content-Range: bytes */$fileSize");
                        return;
                    }
                    $length = $end - $start + 1;
                    http_response_code(206);
                    header("Content-Type: $mime");
                    header('Accept-Ranges: bytes');
                    header("Content-Range: bytes $start-$end/$fileSize");
                    header("Content-Length: $length");
                    header('Cache-Control: private, max-age=3600');
                    header('Content-Transfer-Encoding: binary');
                    header('Content-Disposition: attachment; filename="' . basename($itemPath) . '"');

                    $fp = fopen($itemPath, 'rb');
                    fseek($fp, $start);
                    $bufferSize = 8192;
                    while (!feof($fp) && $length > 0) {
                        $read = ($length > $bufferSize) ? $bufferSize : $length;
                        echo fread($fp, $read);
                        $length -= $read;
                        @ob_flush();
                        flush();
                    }
                    fclose($fp);
                    return;
                }

                header("Content-Type: $mime");
                header('Accept-Ranges: bytes');
                header('Cache-Control: private, max-age=3600');
                header('Content-Length: ' . $fileSize);
                header('Content-Transfer-Encoding: binary');
                header('Content-Disposition: attachment; filename="' . basename($itemPath) . '"');
                @ob_end_clean();
                readfile($itemPath);
                return;
            }
        }
    }
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Adhan non trouvé']);
}
?> 