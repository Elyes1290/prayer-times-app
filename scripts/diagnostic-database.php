<?php
/**
 * 🔍 DIAGNOSTIC BASE DE DONNÉES - PRAYER TIMES APP
 * Vérifie l'état actuel de la base de données après tentative de migration
 */

// Configuration de la base de données
define('DB_HOST', 'ff42hr.myd.infomaniak.com');
define('DB_NAME', 'ff42hr_MyAdhan');
define('DB_USER', 'ff42hr_prayer');
define('DB_PASS', 'Youssef.1918');

echo "🔍 DIAGNOSTIC DE LA BASE DE DONNÉES\n";
echo "==================================\n\n";

try {
    // Connexion à la base de données
    echo "1️⃣ Test de connexion...\n";
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
    echo "✅ Connexion réussie!\n\n";

    // Lister toutes les tables existantes
    echo "2️⃣ Tables existantes dans la base de données...\n";
    $stmt = $pdo->query("SHOW TABLES");
    $existingTables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (empty($existingTables)) {
        echo "❌ Aucune table trouvée dans la base de données!\n";
    } else {
        echo "📊 " . count($existingTables) . " table(s) trouvée(s):\n";
        foreach ($existingTables as $table) {
            echo "   ✅ $table\n";
        }
    }
    echo "\n";

    // Tables attendues
    $expectedTables = [
        'users',
        'favorites', 
        'premium_content',
        // 'downloaded_recitations', // SUPPRIMÉE - causait des désynchronisations
        'usage_logs',
        'user_sessions',
        'user_backups'
    ];

    echo "3️⃣ Vérification des tables attendues...\n";
    $missingTables = [];
    $presentTables = [];
    
    foreach ($expectedTables as $table) {
        if (in_array($table, $existingTables)) {
            echo "   ✅ $table - OK\n";
            $presentTables[] = $table;
        } else {
            echo "   ❌ $table - MANQUANTE\n";
            $missingTables[] = $table;
        }
    }
    echo "\n";

    // Vérifier les données dans les tables existantes
    if (!empty($presentTables)) {
        echo "4️⃣ Contenu des tables existantes...\n";
        foreach ($presentTables as $table) {
            try {
                $stmt = $pdo->query("SELECT COUNT(*) as count FROM `$table`");
                $count = $stmt->fetch()['count'];
                echo "   📊 $table: $count enregistrement(s)\n";
            } catch (Exception $e) {
                echo "   ⚠️ $table: Erreur lors du comptage - " . $e->getMessage() . "\n";
            }
        }
        echo "\n";
    }

    // Résumé et recommandations
    echo "5️⃣ RÉSUMÉ DU DIAGNOSTIC\n";
    echo str_repeat("=", 50) . "\n";
    
    if (empty($missingTables)) {
        echo "🎉 PARFAIT! Toutes les tables sont présentes.\n";
        echo "✅ Votre base de données est prête à l'emploi.\n";
        
        // Test rapide de fonctionnalité
        if (in_array('users', $presentTables)) {
            try {
                $stmt = $pdo->query("SELECT COUNT(*) as count FROM users WHERE premium_status = 1");
                $premiumUsers = $stmt->fetch()['count'];
                echo "👑 Utilisateurs premium: $premiumUsers\n";
            } catch (Exception $e) {
                echo "⚠️ Structure de la table users à vérifier\n";
            }
        }
        
        if (in_array('premium_content', $presentTables)) {
            try {
                $stmt = $pdo->query("SELECT COUNT(*) as count FROM premium_content WHERE is_active = 1");
                $activeContent = $stmt->fetch()['count'];
                echo "🎵 Contenu premium actif: $activeContent\n";
            } catch (Exception $e) {
                echo "⚠️ Structure de la table premium_content à vérifier\n";
            }
        }
        
    } else {
        echo "⚠️ PROBLÈME DÉTECTÉ!\n";
        echo "📊 Tables présentes: " . count($presentTables) . "/" . count($expectedTables) . "\n";
        echo "❌ Tables manquantes: " . implode(', ', $missingTables) . "\n\n";
        
        echo "💡 SOLUTIONS POSSIBLES:\n";
        echo "1. Le script SQL ne s'est pas exécuté complètement\n";
        echo "2. Il y a eu des erreurs lors de la création de certaines tables\n";
        echo "3. Les privilèges de l'utilisateur sont insuffisants\n\n";
        
        echo "🔧 ACTIONS RECOMMANDÉES:\n";
        echo "1. Réexécuter le script SQL complet dans phpMyAdmin\n";
        echo "2. Vérifier les erreurs dans l'onglet SQL de phpMyAdmin\n";
        echo "3. Créer les tables manquantes individuellement\n\n";
        
        // Génerer un script SQL pour les tables manquantes
        if (!empty($missingTables)) {
            echo "📋 Script SQL pour les tables manquantes:\n";
            echo str_repeat("-", 50) . "\n";
            
            foreach ($missingTables as $table) {
                echo "-- Il manque la table: $table\n";
                
                if ($table == 'premium_content') {
                    echo "-- Cette table est essentielle pour la section login premium!\n";
                }
            }
            
            echo "\n💾 SOLUTION: Utilisez le script create-prayer-database-simple-final.sql\n";
        }
    }
    
    echo "\n📱 PROCHAINES ÉTAPES:\n";
    if (!empty($missingTables)) {
        echo "1. ❌ Corriger les tables manquantes\n";
        echo "2. ❌ Retester après correction\n";
        echo "3. ❌ Vérifier la nouvelle section de login premium\n";
    } else {
        echo "1. ✅ Tester l'API auth.php avec la nouvelle section de login\n";
        echo "2. ✅ Vérifier le fonctionnement des favoris\n";
        echo "3. ✅ Tester le contenu premium\n";
    }
    
} catch (PDOException $e) {
    echo "❌ ERREUR DE CONNEXION:\n";
    echo "Message: " . $e->getMessage() . "\n";
    echo "Code: " . $e->getCode() . "\n\n";
    
    echo "🔧 VÉRIFICATIONS:\n";
    echo "1. La base de données 'ff42hr_MyAdhan' existe-t-elle?\n";
    echo "2. L'utilisateur 'ff42hr_prayer' a-t-il accès?\n";
    echo "3. Le mot de passe 'Youssef.1918' est-il correct?\n";
}

echo "\n" . str_repeat("=", 50) . "\n";
echo "Diagnostic terminé - " . date('Y-m-d H:i:s') . "\n";
echo str_repeat("=", 50) . "\n";
?> 