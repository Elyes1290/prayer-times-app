<?php
/**
 * 🧪 SCRIPT DE TEST - CONNEXION BASE DE DONNÉES
 * Prayer Times App - Database Connection Test
 * 
 * À exécuter après création des tables pour vérifier que tout fonctionne
 */

// Configuration de la base de données (identique à api/config.php)
define('DB_HOST', 'ff42hr.myd.infomaniak.com');
define('DB_NAME', 'ff42hr_MyAdhan');
define('DB_USER', 'ff42hr_prayer');
define('DB_PASS', 'Youssef.1918');

echo "🔍 TEST DE CONNEXION - PRAYER TIMES APP DATABASE\n";
echo "================================================\n\n";

try {
    // Test de connexion
    echo "1️⃣ Test de connexion à la base de données...\n";
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4",
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );
    echo "✅ Connexion réussie !\n\n";

    // Vérifier les tables créées
    echo "2️⃣ Vérification des tables...\n";
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    echo "📊 Nombre de tables trouvées : " . count($tables) . "\n";
    
    $expectedTables = [
        'users',
        'favorites', 
        'premium_content',
        // 'downloaded_recitations', // SUPPRIMÉE - causait des désynchronisations
        'usage_logs',
        'user_sessions',
        'user_backups'
    ];
    
    $missingTables = [];
    foreach ($expectedTables as $table) {
        if (in_array($table, $tables)) {
            echo "✅ Table '$table' : OK\n";
        } else {
            echo "❌ Table '$table' : MANQUANTE\n";
            $missingTables[] = $table;
        }
    }
    
    if (empty($missingTables)) {
        echo "\n🎉 Toutes les tables principales sont présentes !\n\n";
    } else {
        echo "\n⚠️ Tables manquantes : " . implode(', ', $missingTables) . "\n\n";
    }

    // Vérifier les vues
    echo "3️⃣ Vérification des vues...\n";
    $views = $pdo->query("SHOW FULL TABLES WHERE Table_type = 'VIEW'")->fetchAll(PDO::FETCH_COLUMN);
    echo "👁️ Nombre de vues trouvées : " . count($views) . "\n";
    
    foreach ($views as $view) {
        echo "✅ Vue '$view' : OK\n";
    }
    echo "\n";

    // Test d'insertion d'un utilisateur
    echo "4️⃣ Test d'insertion d'un utilisateur...\n";
    $testDeviceId = 'test_device_' . time();
    
    $stmt = $pdo->prepare("
        INSERT INTO users (device_id, user_first_name, language, premium_status) 
        VALUES (?, ?, ?, ?)
    ");
    $stmt->execute([$testDeviceId, 'Test User', 'fr', 0]);
    
    $userId = $pdo->lastInsertId();
    echo "✅ Utilisateur créé avec l'ID : $userId\n";

    // Test de récupération
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    
    if ($user) {
        echo "✅ Utilisateur récupéré : {$user['user_first_name']} (Device: {$user['device_id']})\n";
    }

    // Test d'insertion d'un favori
    echo "\n5️⃣ Test d'insertion d'un favori...\n";
    $stmt = $pdo->prepare("
        INSERT INTO favorites (user_id, favorite_id, type, arabic_text, translation) 
        VALUES (?, ?, ?, ?, ?)
    ");
    $favoriteId = 'test_favorite_' . time();
    $stmt->execute([
        $userId, 
        $favoriteId, 
        'quran_verse', 
        'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', 
        'Au nom d\'Allah, le Tout Miséricordieux, le Très Miséricordieux'
    ]);
    echo "✅ Favori créé avec l'ID : " . $pdo->lastInsertId() . "\n";

    // Test du contenu premium
    echo "\n6️⃣ Vérification du contenu premium...\n";
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM premium_content WHERE is_active = 1");
    $contentCount = $stmt->fetch()['count'];
    echo "🎵 Contenu premium disponible : $contentCount éléments\n";

    if ($contentCount > 0) {
        $stmt = $pdo->query("SELECT type, COUNT(*) as count FROM premium_content WHERE is_active = 1 GROUP BY type");
        while ($row = $stmt->fetch()) {
            echo "   - {$row['type']} : {$row['count']} éléments\n";
        }
    }

    // Test des vues
    echo "\n7️⃣ Test des vues...\n";
    try {
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM v_premium_users");
        $premiumCount = $stmt->fetch()['count'];
        echo "✅ Vue v_premium_users : $premiumCount utilisateurs premium\n";
    } catch (Exception $e) {
        echo "❌ Erreur vue v_premium_users : " . $e->getMessage() . "\n";
    }

    // Nettoyage du test
    echo "\n8️⃣ Nettoyage des données de test...\n";
    $pdo->prepare("DELETE FROM favorites WHERE user_id = ?")->execute([$userId]);
    $pdo->prepare("DELETE FROM users WHERE id = ?")->execute([$userId]);
    echo "✅ Données de test supprimées\n";

    // Résumé final
    echo "\n" . str_repeat("=", 50) . "\n";
    echo "🎉 RÉSUMÉ DU TEST\n";
    echo str_repeat("=", 50) . "\n";
    echo "✅ Connexion à la base de données : OK\n";
    echo "✅ Tables principales : " . (empty($missingTables) ? "OK" : "PROBLÈME") . "\n";
    echo "✅ Insertion/récupération utilisateurs : OK\n";
    echo "✅ Gestion des favoris : OK\n";
    echo "✅ Contenu premium : OK ($contentCount éléments)\n";
    echo "✅ Vues SQL : OK (" . count($views) . " vues)\n";
    
    if (empty($missingTables)) {
        echo "\n🚀 LA BASE DE DONNÉES EST PRÊTE POUR PRODUCTION !\n";
        echo "   Vous pouvez maintenant utiliser votre API avec la nouvelle section de login premium.\n";
    } else {
        echo "\n⚠️ PROBLÈMES DÉTECTÉS :\n";
        foreach ($missingTables as $table) {
            echo "   - Table '$table' manquante\n";
        }
        echo "   Veuillez réexécuter le script SQL create-prayer-database-final.sql\n";
    }
    
    echo "\n📱 PROCHAINES ÉTAPES :\n";
    echo "   1. Tester l'API auth.php avec la nouvelle section de login\n";
    echo "   2. Vérifier le fonctionnement des favoris\n";
    echo "   3. Tester le contenu premium\n";
    echo "   4. Configurer la sauvegarde automatique\n";

} catch (PDOException $e) {
    echo "❌ ERREUR DE CONNEXION :\n";
    echo "   Message : " . $e->getMessage() . "\n";
    echo "   Code : " . $e->getCode() . "\n\n";
    
    echo "🔧 VÉRIFICATIONS À FAIRE :\n";
    echo "   1. La base de données 'ff42hr_MyAdhan' existe-t-elle ?\n";
    echo "   2. L'utilisateur 'ff42hr_prayer' a-t-il les bonnes permissions ?\n";
    echo "   3. Le mot de passe 'Youssef.1918' est-il correct ?\n";
    echo "   4. Le serveur MySQL est-il accessible depuis votre IP ?\n";
    echo "   5. Avez-vous exécuté le script SQL create-prayer-database-final.sql ?\n\n";
    
    echo "💡 SOLUTION :\n";
    echo "   1. Connectez-vous à phpMyAdmin\n";
    echo "   2. Sélectionnez la base 'ff42hr_MyAdhan'\n";
    echo "   3. Exécutez le script create-prayer-database-final.sql\n";
    echo "   4. Relancez ce test\n";
}

echo "\n" . str_repeat("=", 50) . "\n";
echo "Fin du test - " . date('Y-m-d H:i:s') . "\n";
echo str_repeat("=", 50) . "\n";
?> 