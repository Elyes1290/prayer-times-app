<?php
/**
 * Script de test pour vérifier si un utilisateur existe
 */

require_once 'api/config.php';

// Récupérer l'ID utilisateur depuis les paramètres
$user_id = $_GET['user_id'] ?? null;

if (!$user_id) {
    echo "❌ Erreur: user_id requis\n";
    echo "Usage: test-user-exists.php?user_id=2\n";
    exit;
}

try {
    $pdo = getDBConnection();
    
    // Vérifier si l'utilisateur existe
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$user_id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user) {
        echo "✅ Utilisateur trouvé:\n";
        echo "ID: " . $user['id'] . "\n";
        echo "Email: " . $user['email'] . "\n";
        echo "Prénom: " . $user['user_first_name'] . "\n";
        echo "Premium: " . $user['premium_status'] . "\n";
        echo "Créé le: " . $user['created_at'] . "\n";
        echo "Dernière connexion: " . $user['last_seen'] . "\n";
    } else {
        echo "❌ Utilisateur avec ID $user_id non trouvé\n";
        
        // Lister tous les utilisateurs
        $allUsers = $pdo->query("SELECT id, email, user_first_name, created_at FROM users ORDER BY id DESC LIMIT 10")->fetchAll();
        echo "\n📋 Derniers utilisateurs créés:\n";
        foreach ($allUsers as $u) {
            echo "- ID: {$u['id']}, Email: {$u['email']}, Prénom: {$u['user_first_name']}, Créé: {$u['created_at']}\n";
        }
    }
    
} catch (Exception $e) {
    echo "❌ Erreur: " . $e->getMessage() . "\n";
}
?> 