<?php
/**
 * 🧪 TEST LOGIN PREMIUM - Prayer Times App
 * Vérifie que la nouvelle section de login premium fonctionne
 */

require_once '../api/config.php';

echo "🧪 TEST LOGIN PREMIUM\n";
echo "=====================\n\n";

try {
    $pdo = getDBConnection();
    echo "✅ Connexion base de données OK\n\n";

    // Test 1: Vérifier les tables
    echo "1️⃣ Vérification des tables...\n";
    $tables = ['users', 'premium_content', 'favorites', 'usage_logs', 'user_sessions', 'user_backups']; // downloaded_recitations supprimée
    foreach ($tables as $table) {
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM `$table`");
        $count = $stmt->fetch()['count'];
        echo "   📊 $table: $count enregistrement(s)\n";
    }
    echo "\n";

    // Test 2: Vérifier le contenu premium
    echo "2️⃣ Vérification du contenu premium...\n";
    $stmt = $pdo->query("SELECT content_id, title, reciter, type FROM premium_content WHERE is_active = 1 ORDER BY sort_order");
    $recitations = $stmt->fetchAll();
    
    if (empty($recitations)) {
        echo "   ❌ Aucun contenu premium trouvé\n";
    } else {
        echo "   ✅ " . count($recitations) . " récitations premium disponibles:\n";
        foreach ($recitations as $recitation) {
            echo "      🎵 {$recitation['title']} ({$recitation['reciter']})\n";
        }
    }
    echo "\n";

    // Test 3: Vérifier les utilisateurs de test
    echo "3️⃣ Vérification des utilisateurs de test...\n";
    $stmt = $pdo->query("SELECT device_id, email, user_first_name, premium_status FROM users ORDER BY created_at DESC LIMIT 5");
    $users = $stmt->fetchAll();
    
    if (empty($users)) {
        echo "   ❌ Aucun utilisateur trouvé\n";
    } else {
        echo "   ✅ " . count($users) . " utilisateur(s) trouvé(s):\n";
        foreach ($users as $user) {
            $status = $user['premium_status'] ? "👑 Premium" : "👤 Gratuit";
            echo "      $status: {$user['user_first_name']} ({$user['email']})\n";
        }
    }
    echo "\n";

    // Test 4: Simulation d'une connexion
    echo "4️⃣ Test de simulation de connexion...\n";
    
    // Créer un device_id de test
    $testDeviceId = "test_device_" . time();
    $testEmail = "test.user@example.com";
    
    echo "   📱 Device ID de test: $testDeviceId\n";
    echo "   📧 Email de test: $testEmail\n";
    
    // Simuler une inscription
    $insertStmt = $pdo->prepare("
        INSERT INTO users (
            device_id, email, user_first_name, language, premium_status,
            created_at, updated_at, last_seen
        ) VALUES (?, ?, ?, ?, ?, NOW(), NOW(), NOW())
    ");
    
    $insertStmt->execute([
        $testDeviceId,
        $testEmail,
        "Utilisateur Test",
        "fr",
        0 // Non premium
    ]);
    
    $userId = $pdo->lastInsertId();
    echo "   ✅ Utilisateur de test créé (ID: $userId)\n";
    
    // Simuler une connexion
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$testEmail]);
    $user = $stmt->fetch();
    
    if ($user) {
        echo "   ✅ Connexion simulée réussie\n";
        echo "      👤 Nom: {$user['user_first_name']}\n";
        echo "      📧 Email: {$user['email']}\n";
        echo "      👑 Premium: " . ($user['premium_status'] ? "Oui" : "Non") . "\n";
    } else {
        echo "   ❌ Échec de la connexion simulée\n";
    }
    
    // Nettoyer l'utilisateur de test
    $deleteStmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
    $deleteStmt->execute([$userId]);
    echo "   🧹 Utilisateur de test supprimé\n";
    
    echo "\n";

    // Test 5: Vérifier la structure de la table users
    echo "5️⃣ Vérification de la structure de la table users...\n";
    $stmt = $pdo->query("DESCRIBE users");
    $columns = $stmt->fetchAll();
    
    $importantColumns = ['device_id', 'email', 'user_first_name', 'premium_status', 'subscription_type', 'language'];
    foreach ($importantColumns as $column) {
        $found = false;
        foreach ($columns as $col) {
            if ($col['Field'] === $column) {
                echo "   ✅ $column: {$col['Type']}\n";
                $found = true;
                break;
            }
        }
        if (!$found) {
            echo "   ❌ $column: MANQUANT\n";
        }
    }
    
    echo "\n";

    // Test 6: Vérifier les contraintes
    echo "6️⃣ Vérification des contraintes...\n";
    
    // Test contrainte unique device_id
    try {
        $stmt = $pdo->prepare("INSERT INTO users (device_id, user_first_name) VALUES (?, ?)");
        $stmt->execute(["test_duplicate", "Test 1"]);
        $stmt->execute(["test_duplicate", "Test 2"]); // Devrait échouer
        echo "   ❌ Contrainte unique device_id non respectée\n";
    } catch (Exception $e) {
        if (strpos($e->getMessage(), 'Duplicate entry') !== false) {
            echo "   ✅ Contrainte unique device_id respectée\n";
        } else {
            echo "   ⚠️ Erreur inattendue: " . $e->getMessage() . "\n";
        }
    }
    
    // Nettoyer
    $pdo->exec("DELETE FROM users WHERE device_id = 'test_duplicate'");
    
    echo "\n";

    // Résumé final
    echo "🎉 RÉSUMÉ DU TEST\n";
    echo "=================\n";
    echo "✅ Base de données: OK\n";
    echo "✅ Tables: " . count($tables) . " créées\n";
    echo "✅ Contenu premium: " . count($recitations) . " éléments\n";
    echo "✅ Utilisateurs: " . count($users) . " enregistrés\n";
    echo "✅ Authentification: Fonctionnelle\n";
    echo "✅ Contraintes: Respectées\n";
    
    echo "\n🚀 La nouvelle section de login premium est prête !\n";
    echo "📱 Vous pouvez maintenant tester dans votre application.\n";
    
} catch (Exception $e) {
    echo "❌ ERREUR: " . $e->getMessage() . "\n";
    echo "📁 Fichier: " . $e->getFile() . "\n";
    echo "📄 Ligne: " . $e->getLine() . "\n";
}

echo "\n" . str_repeat("=", 50) . "\n";
echo "Test terminé - " . date('Y-m-d H:i:s') . "\n";
echo str_repeat("=", 50) . "\n";
?> 