<?php
/**
 * 🎯 SCRIPT DE GESTION VIP AUTOMATISÉ - MyAdhan Prayer App
 * Script en ligne de commande pour gérer rapidement les comptes VIP
 * 
 * Usage: php scripts/manage-vip.php [action] [parameters]
 */

// Vérifier que le script est exécuté en ligne de commande
if (php_sapi_name() !== 'cli') {
    die("❌ Ce script doit être exécuté en ligne de commande uniquement.\n");
}

require_once __DIR__ . '/../api/config.php';

echo "🎯 GESTIONNAIRE VIP - MyAdhan Prayer App\n";
echo "=========================================\n\n";

// Parser les arguments
$action = $argv[1] ?? 'help';

try {
    $pdo = getDBConnection();
    
    switch ($action) {
        case 'create':
            createVipUser($pdo, $argv);
            break;
        case 'grant':
            grantVipToExisting($pdo, $argv);
            break;
        case 'list':
            listVipUsers($pdo);
            break;
        case 'stats':
            showVipStats($pdo);
            break;
        case 'check':
            checkUser($pdo, $argv);
            break;
        case 'revoke':
            revokeVip($pdo, $argv);
            break;
        case 'help':
        default:
            showHelp();
            break;
    }
} catch (Exception $e) {
    echo "❌ Erreur: " . $e->getMessage() . "\n";
    exit(1);
}

/**
 * ================================
 * FONCTIONS DE GESTION VIP
 * ================================
 */

// Créer un nouvel utilisateur VIP
function createVipUser($pdo, $args) {
    if (count($args) < 4) {
        echo "❌ Usage: php manage-vip.php create <email> <prenom> [raison]\n";
        exit(1);
    }
    
    $email = $args[2];
    $firstName = $args[3];
    $reason = $args[4] ?? 'VIP créé via script';
    $password = '123456'; // Mot de passe par défaut
    
    echo "🔄 Création d'un utilisateur VIP...\n";
    echo "📧 Email: $email\n";
    echo "👤 Prénom: $firstName\n";
    echo "🎁 Raison: $reason\n\n";
    
    // Vérifier que l'email n'existe pas
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        echo "❌ Un utilisateur avec cet email existe déjà!\n";
        exit(1);
    }
    
    // Créer l'utilisateur VIP
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    
    $stmt = $pdo->prepare("
        INSERT INTO users (
            email, password_hash, user_first_name,
            is_vip, premium_status, premium_expiry,
            vip_reason, vip_granted_by, vip_granted_at,
            created_at, updated_at, status
        ) VALUES (
            ?, ?, ?,
            TRUE, 1, '2099-12-31 23:59:59',
            ?, 'admin_script', NOW(),
            NOW(), NOW(), 'active'
        )
    ");
    
    $stmt->execute([$email, $hashedPassword, $firstName, $reason]);
    $userId = $pdo->lastInsertId();
    
    echo "✅ Utilisateur VIP créé avec succès!\n";
    echo "🔑 Mot de passe: $password\n";
    echo "🆔 ID utilisateur: $userId\n\n";
    echo "🎉 $firstName peut maintenant se connecter avec:\n";
    echo "   📧 Email: $email\n";
    echo "   🔑 Mot de passe: $password\n\n";
}

// Accorder VIP à un utilisateur existant
function grantVipToExisting($pdo, $args) {
    if (count($args) < 3) {
        echo "❌ Usage: php manage-vip.php grant <email> [raison]\n";
        exit(1);
    }
    
    $email = $args[2];
    $reason = $args[3] ?? 'VIP accordé via script';
    
    echo "🔄 Attribution du statut VIP...\n";
    echo "📧 Email: $email\n";
    echo "🎁 Raison: $reason\n\n";
    
    // Vérifier que l'utilisateur existe
    $stmt = $pdo->prepare("SELECT id, user_first_name, is_vip FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if (!$user) {
        echo "❌ Utilisateur non trouvé!\n";
        exit(1);
    }
    
    if ($user['is_vip']) {
        echo "⚠️  L'utilisateur {$user['user_first_name']} est déjà VIP!\n";
        exit(0);
    }
    
    // Accorder le VIP
    $stmt = $pdo->prepare("
        UPDATE users SET 
            is_vip = TRUE,
            premium_status = 1,
            premium_expiry = '2099-12-31 23:59:59',
            vip_reason = ?,
            vip_granted_by = 'admin_script',
            vip_granted_at = NOW(),
            updated_at = NOW()
        WHERE email = ?
    ");
    
    $stmt->execute([$reason, $email]);
    
    echo "✅ Statut VIP accordé avec succès!\n";
    echo "👤 {$user['user_first_name']} est maintenant VIP à vie!\n\n";
}

// Lister tous les VIP
function listVipUsers($pdo) {
    echo "👑 LISTE DES UTILISATEURS VIP\n";
    echo "==============================\n\n";
    
    $stmt = $pdo->query("
        SELECT email, user_first_name, vip_reason, vip_granted_by, 
               vip_granted_at, last_seen
        FROM users 
        WHERE is_vip = TRUE 
        ORDER BY vip_granted_at DESC
    ");
    
    $vips = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($vips)) {
        echo "ℹ️  Aucun utilisateur VIP trouvé.\n\n";
        return;
    }
    
    foreach ($vips as $vip) {
        echo "📧 " . $vip['email'] . "\n";
        echo "👤 " . ($vip['user_first_name'] ?: 'N/A') . "\n";
        echo "🎁 " . ($vip['vip_reason'] ?: 'N/A') . "\n";
        echo "👨‍💼 " . ($vip['vip_granted_by'] ?: 'N/A') . "\n";
        echo "📅 " . ($vip['vip_granted_at'] ? date('d/m/Y H:i', strtotime($vip['vip_granted_at'])) : 'N/A') . "\n";
        echo "👁️  " . ($vip['last_seen'] ? date('d/m/Y H:i', strtotime($vip['last_seen'])) : 'Jamais') . "\n";
        echo "---\n";
    }
    
    echo "\n📊 Total: " . count($vips) . " utilisateur(s) VIP\n\n";
}

// Afficher les statistiques VIP
function showVipStats($pdo) {
    echo "📊 STATISTIQUES VIP\n";
    echo "===================\n\n";
    
    // Total VIP
    $stmt = $pdo->query("SELECT COUNT(*) FROM users WHERE is_vip = TRUE");
    $totalVip = $stmt->fetchColumn();
    
    // VIP actifs (30 derniers jours)
    $stmt = $pdo->query("
        SELECT COUNT(*) FROM users 
        WHERE is_vip = TRUE AND last_seen > DATE_SUB(NOW(), INTERVAL 30 DAY)
    ");
    $activeVip = $stmt->fetchColumn();
    
    // Répartition par raison
    $stmt = $pdo->query("
        SELECT vip_reason, COUNT(*) as count 
        FROM users 
        WHERE is_vip = TRUE AND vip_reason IS NOT NULL
        GROUP BY vip_reason 
        ORDER BY count DESC
    ");
    $reasons = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "👑 Total VIP: $totalVip\n";
    echo "✅ VIP Actifs (30j): $activeVip\n";
    echo "💤 VIP Inactifs: " . ($totalVip - $activeVip) . "\n\n";
    
    if (!empty($reasons)) {
        echo "📈 RÉPARTITION PAR RAISON:\n";
        foreach ($reasons as $reason) {
            echo "  • " . ($reason['vip_reason'] ?: 'Non spécifiée') . ": " . $reason['count'] . "\n";
        }
        echo "\n";
    }
}

// Vérifier un utilisateur
function checkUser($pdo, $args) {
    if (count($args) < 3) {
        echo "❌ Usage: php manage-vip.php check <email>\n";
        exit(1);
    }
    
    $email = $args[2];
    
    echo "🔍 VÉRIFICATION UTILISATEUR\n";
    echo "===========================\n\n";
    
    $stmt = $pdo->prepare("
        SELECT id, email, user_first_name, is_vip, premium_status,
               vip_reason, vip_granted_by, vip_granted_at,
               premium_expiry, created_at, last_seen, status
        FROM users 
        WHERE email = ?
    ");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        echo "❌ Utilisateur non trouvé!\n\n";
        return;
    }
    
    echo "📧 Email: " . $user['email'] . "\n";
    echo "👤 Nom: " . ($user['user_first_name'] ?: 'N/A') . "\n";
    echo "🆔 ID: " . $user['id'] . "\n";
    echo "📅 Créé: " . date('d/m/Y H:i', strtotime($user['created_at'])) . "\n";
    echo "👁️  Dernière visite: " . ($user['last_seen'] ? date('d/m/Y H:i', strtotime($user['last_seen'])) : 'Jamais') . "\n";
    echo "🎯 Statut: " . $user['status'] . "\n\n";
    
    // Statut Premium/VIP
    if ($user['is_vip']) {
        echo "👑 TYPE: VIP GRATUIT À VIE\n";
        echo "🎁 Raison VIP: " . ($user['vip_reason'] ?: 'N/A') . "\n";
        echo "👨‍💼 Accordé par: " . ($user['vip_granted_by'] ?: 'N/A') . "\n";
        echo "📅 Accordé le: " . ($user['vip_granted_at'] ? date('d/m/Y H:i', strtotime($user['vip_granted_at'])) : 'N/A') . "\n";
    } else if ($user['premium_status']) {
        echo "💳 TYPE: PREMIUM PAYANT\n";
        echo "⏰ Expire le: " . ($user['premium_expiry'] ? date('d/m/Y H:i', strtotime($user['premium_expiry'])) : 'N/A') . "\n";
        
        // Vérifier si encore valide
        if ($user['premium_expiry']) {
            $expiry = new DateTime($user['premium_expiry']);
            $now = new DateTime();
            if ($expiry > $now) {
                echo "✅ Statut: ACTIF\n";
            } else {
                echo "❌ Statut: EXPIRÉ\n";
            }
        }
    } else {
        echo "🆓 TYPE: GRATUIT\n";
    }
    
    echo "\n";
}

// Révoquer le statut VIP
function revokeVip($pdo, $args) {
    if (count($args) < 3) {
        echo "❌ Usage: php manage-vip.php revoke <email>\n";
        exit(1);
    }
    
    $email = $args[2];
    
    echo "🔄 Révocation du statut VIP...\n";
    echo "📧 Email: $email\n\n";
    
    // Vérifier que l'utilisateur existe et est VIP
    $stmt = $pdo->prepare("SELECT id, user_first_name, is_vip FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if (!$user) {
        echo "❌ Utilisateur non trouvé!\n";
        exit(1);
    }
    
    if (!$user['is_vip']) {
        echo "⚠️  L'utilisateur {$user['user_first_name']} n'est pas VIP!\n";
        exit(0);
    }
    
    echo "⚠️  Êtes-vous sûr de vouloir révoquer le VIP de {$user['user_first_name']} ? (y/N): ";
    $confirmation = trim(fgets(STDIN));
    
    if (strtolower($confirmation) !== 'y' && strtolower($confirmation) !== 'yes') {
        echo "❌ Révocation annulée.\n";
        exit(0);
    }
    
    // Révoquer le VIP
    $stmt = $pdo->prepare("
        UPDATE users SET 
            is_vip = FALSE,
            premium_status = 0,
            premium_expiry = NULL,
            updated_at = NOW()
        WHERE email = ?
    ");
    
    $stmt->execute([$email]);
    
    echo "✅ Statut VIP révoqué avec succès!\n";
    echo "👤 {$user['user_first_name']} n'est plus VIP.\n\n";
}

// Afficher l'aide
function showHelp() {
    echo "COMMANDES DISPONIBLES:\n\n";
    
    echo "📝 CRÉATION:\n";
    echo "  create <email> <prénom> [raison]  - Créer un nouvel utilisateur VIP\n";
    echo "    Exemple: php manage-vip.php create papa@email.com Papa \"Parent du développeur\"\n\n";
    
    echo "🎁 ATTRIBUTION:\n";
    echo "  grant <email> [raison]            - Accorder VIP à un utilisateur existant\n";
    echo "    Exemple: php manage-vip.php grant ami@email.com \"Ami proche\"\n\n";
    
    echo "📋 CONSULTATION:\n";
    echo "  list                              - Lister tous les utilisateurs VIP\n";
    echo "  stats                             - Afficher les statistiques VIP\n";
    echo "  check <email>                     - Vérifier le statut d'un utilisateur\n\n";
    
    echo "🗑️  GESTION:\n";
    echo "  revoke <email>                    - Révoquer le statut VIP\n\n";
    
    echo "❓ AIDE:\n";
    echo "  help                              - Afficher cette aide\n\n";
    
    echo "💡 EXEMPLES RAPIDES:\n";
    echo "  # Créer VIP pour vos parents\n";
    echo "  php manage-vip.php create papa@email.com Papa\n";
    echo "  php manage-vip.php create maman@email.com Maman\n\n";
    
    echo "  # Voir tous les VIP\n";
    echo "  php manage-vip.php list\n\n";
    
    echo "  # Statistiques\n";
    echo "  php manage-vip.php stats\n\n";
}
?>
