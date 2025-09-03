<?php
/**
 * 📁 LISTE DES FICHIERS PREMIUM - Prayer Times App
 * Liste les fichiers audio disponibles dans les dossiers premium
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

// 🔐 SÉCURITÉ CRITIQUE : Vérifier que l'utilisateur est premium avant d'accéder aux fichiers
require_once 'config.php';

// ⚡ TRANSITION : Essayer l'authentification stricte, fallback pour les anciennes versions
try {
    $auth = requireAuthStrict();
    $isPremium = !empty($auth['is_premium']);
    
    if (!$isPremium) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Abonnement Premium requis pour accéder aux fichiers premium',
            'timestamp' => date('c'),
            'data' => null
        ]);
        exit();
    }
} catch (Exception $e) {
    // 📱 FALLBACK : Autoriser temporairement les anciennes versions de l'app
    // TODO: SUPPRIMER ce fallback dans 2-3 versions
    error_log("FALLBACK AUTH: Ancienne version app détectée - " . $e->getMessage());
}

try {
    // Récupérer le dossier demandé
    $folder = $_GET['folder'] ?? '';
    
    if (empty($folder)) {
        throw new Exception('Paramètre folder requis');
    }
    
    // Définir le chemin de base pour les fichiers premium
    $basePath = __DIR__ . '/../private/premium/';
    $requestedPath = $basePath . $folder;
    
    // Sécuriser le chemin (empêcher la traversée de répertoires)
    $realBasePath = realpath($basePath);
    $realRequestedPath = realpath($requestedPath);
    
    if ($realRequestedPath === false || strpos($realRequestedPath, $realBasePath) !== 0) {
        throw new Exception('Chemin non autorisé');
    }
    
    // Vérifier que le dossier existe
    if (!is_dir($realRequestedPath)) {
        throw new Exception("Dossier non trouvé: $folder");
    }
    
    // Lister les fichiers audio
    $files = [];
    $allowedExtensions = ['mp3', 'wav', 'ogg', 'm4a'];
    
    $items = scandir($realRequestedPath);
    
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        
        $itemPath = $realRequestedPath . '/' . $item;
        
        if (is_file($itemPath)) {
            $extension = strtolower(pathinfo($item, PATHINFO_EXTENSION));
            
            if (in_array($extension, $allowedExtensions)) {
                $fileSize = filesize($itemPath);
                $fileSizeMB = round($fileSize / (1024 * 1024), 2);
                
                // 🔐 SÉCURISÉ : URL protégée qui passe par l'API avec authentification
                $downloadUrl = "https://myadhanapp.com/api/serve-premium-file.php?folder=" . urlencode($folder) . "&file=" . urlencode($item);
                
                $files[] = [
                    'name' => $item,
                    'size' => $fileSize,
                    'sizeMB' => $fileSizeMB,
                    'url' => $downloadUrl,
                    'extension' => $extension,
                    'modified' => date('Y-m-d H:i:s', filemtime($itemPath))
                ];
            }
        }
    }
    
    // Trier par nom de fichier
    usort($files, function($a, $b) {
        return strnatcmp($a['name'], $b['name']);
    });
    
    // Réponse de succès
    echo json_encode([
        'success' => true,
        'message' => 'Fichiers listés avec succès',
        'timestamp' => date('c'),
        'data' => [
            'folder' => $folder,
            'total_files' => count($files),
            'files' => $files
        ]
    ]);
    
} catch (Exception $e) {
    // Réponse d'erreur
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'timestamp' => date('c'),
        'data' => null
    ]);
}
?> 