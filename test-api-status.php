<?php
// Test simple pour diagnostiquer l'API
header('Content-Type: application/json');

echo "=== DIAGNOSTIC API ===\n";

// 1. Vérifier les extensions PHP
echo "1. Extensions PHP:\n";
$extensions = get_loaded_extensions();
if (in_array('pdo', $extensions)) {
    echo "✅ PDO activé\n";
} else {
    echo "❌ PDO NON activé\n";
}

if (in_array('pdo_mysql', $extensions)) {
    echo "✅ PDO MySQL activé\n";
} else {
    echo "❌ PDO MySQL NON activé\n";
}

// 2. Vérifier la configuration PHP
echo "\n2. Configuration PHP:\n";
echo "Version PHP: " . phpversion() . "\n";
echo "Fichier php.ini: " . php_ini_loaded_file() . "\n";

// 3. Tester la connexion à la base de données
echo "\n3. Test connexion base de données:\n";
try {
    // Inclure le fichier de configuration
    if (file_exists('config.php')) {
        require_once 'config.php';
        
        // Tester la connexion PDO
        $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        echo "✅ Connexion à la base de données réussie\n";
        
        // Vérifier si la table users existe
        $stmt = $pdo->query("SHOW TABLES LIKE 'users'");
        if ($stmt->rowCount() > 0) {
            echo "✅ Table 'users' existe\n";
            
            // Vérifier la structure de la table
            $stmt = $pdo->query("DESCRIBE users");
            $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo "Colonnes de la table users: " . implode(', ', $columns) . "\n";
        } else {
            echo "❌ Table 'users' n'existe pas\n";
        }
        
    } else {
        echo "❌ Fichier config.php non trouvé\n";
    }
    
} catch (PDOException $e) {
    echo "❌ Erreur connexion base de données: " . $e->getMessage() . "\n";
} catch (Exception $e) {
    echo "❌ Erreur générale: " . $e->getMessage() . "\n";
}

// 4. Tester les headers HTTP
echo "\n4. Test headers HTTP:\n";
if (function_exists('getallheaders')) {
    echo "✅ Fonction getallheaders() disponible\n";
} else {
    echo "❌ Fonction getallheaders() non disponible\n";
    echo "Headers disponibles:\n";
    foreach ($_SERVER as $key => $value) {
        if (strpos($key, 'HTTP_') === 0) {
            echo "  $key: $value\n";
        }
    }
}

echo "\n=== FIN DIAGNOSTIC ===\n";
?> 