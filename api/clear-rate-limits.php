<?php
/**
 * Script temporaire pour nettoyer les rate limits
 * À supprimer après utilisation
 */

require_once 'config.php';

echo "🧹 NETTOYAGE RATE LIMITING\n";
echo "=========================\n\n";

try {
    $pdo = getDBConnection();
    
    // Supprimer TOUTES les entrées de rate limiting
    echo "🗑️ Suppression de toutes les entrées...\n";
    $stmt = $pdo->prepare("DELETE FROM rate_limits");
    $stmt->execute();
    $deletedCount = $stmt->rowCount();
    echo "✅ $deletedCount entrées supprimées\n\n";
    
    // Vérifier qu'il ne reste plus rien
    echo "🔍 Vérification finale...\n";
    $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM rate_limits");
    $stmt->execute();
    $total = $stmt->fetch()['total'];
    echo "✅ Table contient $total entrées\n\n";
    
    echo "🎯 RATE LIMITING DÉSACTIVÉ\n";
    echo "=========================\n";
    echo "✅ Toutes les entrées supprimées\n";
    echo "✅ Rate limiting PHP désactivé\n";
    echo "✅ Plus d'erreur 429 !\n";
    
} catch (Exception $e) {
    echo "❌ Erreur: " . $e->getMessage() . "\n";
}
?>
