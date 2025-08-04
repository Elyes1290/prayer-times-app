<?php
/**
 * 🎵 ADHANS PREMIUM - Prayer Times App
 * Gestion des adhans premium stockés sur Infomaniak
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

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
    
    switch ($action) {
        case 'catalog':
            handleCatalog();
            break;
        case 'download':
            handleDownload();
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
                // Extraire le nom de l'adhan depuis le nom de fichier
                $fileName = pathinfo($item, PATHINFO_FILENAME);
                $fileNameFormatted = str_replace(['_', '-'], ' ', $fileName);
                $fileNameFormatted = ucwords($fileNameFormatted);
                
                // Vérifier si c'est l'adhan demandé
                if ($fileNameFormatted === $adhanName) {
                    $fileSize = filesize($itemPath);
                    $fileSizeMB = round($fileSize / (1024 * 1024), 2);
                    
                    // 🚀 FIX: Utiliser une URL directe sans encodage pour éviter la corruption
                    // L'URL doit pointer vers le fichier réel sur le serveur
                    $downloadUrl = "https://elyesnaitliman.ch/private/premium/adhan/" . $item;
                    
                    echo json_encode([
                        'success' => true,
                        'message' => 'URL de téléchargement générée',
                        'timestamp' => date('c'),
                        'data' => [
                            'adhanName' => $adhanName,
                            'downloadUrl' => $downloadUrl,
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
?> 