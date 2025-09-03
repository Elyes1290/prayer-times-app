<?php
/**
 * 🔐 SERVEUR DE FICHIERS PREMIUM SÉCURISÉ - Prayer Times App
 * Sert les fichiers premium uniquement aux utilisateurs authentifiés et premium
 */

// Pas de Content-Type JSON ici - sera défini selon le type de fichier
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Gérer les requêtes OPTIONS (CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 🔐 SÉCURITÉ : Vérifier que l'utilisateur est premium
require_once 'config.php';

try {
    $auth = requireAuthStrict();
    $isPremium = !empty($auth['is_premium']);
    
    if (!$isPremium) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'message' => 'Abonnement Premium requis pour accéder à ce fichier',
            'timestamp' => date('c')
        ]);
        exit();
    }
    
    // Récupérer les paramètres
    $folder = $_GET['folder'] ?? '';
    $filename = $_GET['file'] ?? '';
    
    if (empty($folder) || empty($filename)) {
        throw new Exception('Paramètres folder et file requis');
    }
    
    // Définir le chemin de base pour les fichiers premium
    $basePath = __DIR__ . '/../private/premium/';
    $requestedPath = $basePath . $folder;
    $filePath = $requestedPath . '/' . $filename;
    
    // 🔐 SÉCURITÉ : Sécuriser le chemin (empêcher la traversée de répertoires)
    $realBasePath = realpath($basePath);
    $realRequestedPath = realpath($requestedPath);
    $realFilePath = realpath($filePath);
    
    if ($realRequestedPath === false || strpos($realRequestedPath, $realBasePath) !== 0) {
        throw new Exception('Chemin non autorisé');
    }
    
    if ($realFilePath === false || strpos($realFilePath, $realRequestedPath) !== 0) {
        throw new Exception('Fichier non autorisé');
    }
    
    // Vérifier que le fichier existe
    if (!is_file($realFilePath)) {
        throw new Exception("Fichier non trouvé: $filename");
    }
    
    // Vérifier l'extension
    $allowedExtensions = ['mp3', 'wav', 'ogg', 'm4a'];
    $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    
    if (!in_array($extension, $allowedExtensions)) {
        throw new Exception("Type de fichier non autorisé: $extension");
    }
    
    // 📊 LOG : Enregistrer l'accès premium pour analytics
    $userId = $auth['user_id'] ?? 'unknown';
    error_log("PREMIUM ACCESS: User $userId accessed $folder/$filename");
    
    // 🎵 SERVIR LE FICHIER : Définir le bon Content-Type
    $contentTypes = [
        'mp3' => 'audio/mpeg',
        'wav' => 'audio/wav',
        'ogg' => 'audio/ogg',
        'm4a' => 'audio/mp4'
    ];
    
    $contentType = $contentTypes[$extension] ?? 'application/octet-stream';
    $fileSize = filesize($realFilePath);
    
    // Headers pour le streaming audio
    header("Content-Type: $contentType");
    header("Content-Length: $fileSize");
    header("Accept-Ranges: bytes");
    header("Cache-Control: private, max-age=3600");
    header("Content-Disposition: inline; filename=\"" . basename($filename) . "\"");
    
    // 📱 SUPPORT DES RANGE REQUESTS pour le streaming
    if (isset($_SERVER['HTTP_RANGE'])) {
        $range = $_SERVER['HTTP_RANGE'];
        
        if (preg_match('/bytes=(\d+)-(\d*)/i', $range, $matches)) {
            $start = intval($matches[1]);
            $end = !empty($matches[2]) ? intval($matches[2]) : $fileSize - 1;
            
            if ($start <= $end && $start < $fileSize) {
                $length = $end - $start + 1;
                
                http_response_code(206); // Partial Content
                header("Content-Range: bytes $start-$end/$fileSize");
                header("Content-Length: $length");
                
                // Servir la portion demandée
                $handle = fopen($realFilePath, 'rb');
                fseek($handle, $start);
                echo fread($handle, $length);
                fclose($handle);
                exit();
            }
        }
    }
    
    // 🎵 SERVIR LE FICHIER COMPLET
    readfile($realFilePath);
    
} catch (Exception $e) {
    // 🚨 ERREUR : Réponse JSON pour les erreurs
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'timestamp' => date('c')
    ]);
}
?>
