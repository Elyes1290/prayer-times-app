<?php
/**
 * API Statistiques Utilisateur - Prayer Times App
 * Endpoint: GET /api/user-stats.php?user_id=xxx
 * Récupère et calcule toutes les statistiques de prière d'un utilisateur
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = getRequestData();

try {
    if ($method === 'GET') {
        handleGetUserStats();
    } elseif ($method === 'POST') {
        handleUpdateUserStats();
    } else {
        handleError("Méthode non supportée", 405);
    }
} catch (Exception $e) {
    handleError("Erreur dans l'API statistiques", 500, $e->getMessage());
}

/**
 * GET /api/user-stats.php?user_id=xxx ou ?email=xxx
 * Récupère toutes les statistiques de l'utilisateur
 */
function handleGetUserStats() {
    // 🚀 CORRIGÉ : Activer le vrai code pour les utilisateurs connectés
    /*
    // Code temporaire désactivé
    jsonResponse(false, [
        'premium_required' => true,
        'message' => 'Fonctionnalité premium requise',
        'premium_message' => 'Devenez Premium pour débloquer toutes vos statistiques et suivre votre progression spirituelle',
        'features' => [
            'Statistiques détaillées',
            'Suivi de progression',
            'Conseils personnalisés',
            'Badges et achievements',
            'Historique complet'
        ]
    ], 'Fonctionnalité premium requise', 403);
    return;
    */
    
    // 🚀 ACTIVÉ : Code original 
    
    // 🚀 COLLECTE DES INFOS DE DEBUG
    $debugInfo = [
        'env_file_exists' => file_exists(__DIR__ . '/../.env'),
        'db_constants' => [
            'DB_HOST' => defined('DB_HOST') ? DB_HOST : 'NON DÉFINI',
            'DB_NAME' => defined('DB_NAME') ? DB_NAME : 'NON DÉFINI', 
            'DB_USER' => defined('DB_USER') ? DB_USER : 'NON DÉFINI',
            'DB_PASS' => defined('DB_PASS') ? (DB_PASS ? 'DÉFINI (longueur: ' . strlen(DB_PASS) . ')' : 'VIDE') : 'NON DÉFINI',
            'DB_PORT' => defined('DB_PORT') ? DB_PORT : 'NON DÉFINI'
        ],
        'env_variables' => [
            'DB_PASSWORD' => isset($_ENV['DB_PASSWORD']) ? 'DÉFINI' : 'NON DÉFINI',
            'DB_HOST' => isset($_ENV['DB_HOST']) ? $_ENV['DB_HOST'] : 'NON DÉFINI',
            'DB_NAME' => isset($_ENV['DB_NAME']) ? $_ENV['DB_NAME'] : 'NON DÉFINI',
            'DB_USER' => isset($_ENV['DB_USER']) ? $_ENV['DB_USER'] : 'NON DÉFINI'
        ]
    ];

    try {
        $pdo = getDBConnection();
        
        // 🚀 VÉRIFICATION CRITIQUE : S'assurer que PDO n'est pas null
        if ($pdo === null) {
            jsonResponse(false, [
                'message' => 'Erreur de connexion base de données',
                'debug_details' => 'getDBConnection() returned null',
                'debug_info' => $debugInfo,
                'error_code' => 500
            ], 'Erreur de connexion base de données', 500);
            return;
        }
        
        // Test simple de connexion
        $pdo->query("SELECT 1");
        
    } catch (Exception $e) {
        // Retourner une erreur détaillée pour debug
        jsonResponse(false, [
            'message' => 'Erreur de connexion base de données',
            'debug_details' => $e->getMessage(),
            'debug_info' => $debugInfo,
            'error_code' => 500
        ], 'Erreur de connexion base de données', 500);
        return;
    }
    
    // 🔐 Auth obligatoire
    $auth = requireAuthStrict();
    $authUserId = $auth['user_id'];

    // On autorise en lecture seulement pour l'utilisateur authentifié
    $user_id = $_GET['user_id'] ?? null;
    $email = $_GET['email'] ?? null;
    
    if (!$user_id && !$email) {
        // Si aucun identifiant fourni, retourner un message premium
        jsonResponse(false, [
            'premium_required' => true,
            'message' => 'Connectez-vous pour accéder à vos statistiques détaillées',
            'premium_message' => 'Devenez Premium pour débloquer toutes vos statistiques et suivre votre progression spirituelle'
        ], 'Fonctionnalité premium requise', 403);
        return;
    }
    
    // Forcer l'utilisateur courant: on ignore un user_id/email d'un autre utilisateur
    if ($user_id && (int)$user_id !== (int)$authUserId) {
        handleError('Accès interdit aux stats d’un autre utilisateur', 403);
    }

    // Récupérer l'utilisateur authentifié
    $stmt = $pdo->prepare("SELECT id, premium_status FROM users WHERE id = ? AND status = 'active'");
    $stmt->execute([$authUserId]);
    
    $user = $stmt->fetch();
    
    if (!$user) {
        // Utilisateur non trouvé - retourner un message premium
        jsonResponse(false, [
            'premium_required' => true,
            'message' => 'Compte non trouvé. Créez un compte pour accéder à vos statistiques',
            'premium_message' => 'Devenez Premium pour débloquer toutes vos statistiques et suivre votre progression spirituelle'
        ], 'Utilisateur non trouvé', 404);
        return;
    }
    
    $user_id = $user['id'];
    
    // Vérifier le statut premium
    $is_premium = $user['premium_status'] == 1;
    
    // 🧪 TEMPORAIRE : Permettre l'accès aux statistiques pour tous les utilisateurs connectés
    // TODO: Remettre la vérification premium quand le système sera stable
    /*
    if (!$is_premium) {
        // Utilisateur non premium - retourner un message premium
        jsonResponse(false, [
            'premium_required' => true,
            'message' => 'Fonctionnalité premium requise',
            'premium_message' => 'Devenez Premium pour débloquer toutes vos statistiques et suivre votre progression spirituelle',
            'features' => [
                'Statistiques détaillées',
                'Suivi de progression',
                'Conseils personnalisés',
                'Badges et achievements',
                'Historique complet'
            ]
        ], 'Fonctionnalité premium requise', 403);
        return;
    }
    */
    
    // Récupérer les statistiques de base
    $stats = getUserStats($user_id);
    
    // Calculer les séries et patterns
    $streaks = calculateStreaks($user_id);
    
    // Détecter le profil utilisateur
    $profile = detectUserProfile($stats, $streaks);
    
    // Générer les conseils personnalisés
    $advice = generatePersonalizedAdvice($stats, $streaks, $profile);
    
    // Calculer les points et niveau
    $points = calculatePoints($stats);
    $level = calculateLevel($points);
    
    // Préparer la réponse
    $response = [
        'success' => true,
        'data' => [
            'user_id' => $user_id,
            'is_premium' => $is_premium,
            'stats' => $stats,
            'streaks' => $streaks,
            'profile' => $profile,
            'advice' => $advice,
            'points' => $points,
            'level' => $level,
            'challenges' => getActiveChallenges($user_id),
            'badges' => getUserBadges($user_id),
            'history' => getPrayerHistory($user_id, 30), // 30 derniers jours
            'today_prayers' => getTodayPrayers($user_id),
            'yesterday_prayers' => getPrayersForDate($user_id, date('Y-m-d', strtotime('-1 day'))),
            'smart_notification' => getSmartNotification($stats, $profile)
        ],
        'message' => 'Statistiques récupérées avec succès'
    ];
    
    jsonResponse(true, $response['data'], $response['message']);
}

/**
 * Nombre total de prières Fajr accomplies (depuis prayer_logs)
 */
function getTotalFajrPrayers($user_id) {
    try {
        $pdo = getDBConnection();
        if ($pdo === null || !prayerLogsTableExists($pdo)) {
            return 0;
        }
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as total
            FROM prayer_logs
            WHERE user_id = ? AND prayer_type = 'fajr'
        ");
        $stmt->execute([$user_id]);
        $row = $stmt->fetch();
        return (int) ($row['total'] ?? 0);
    } catch (Exception $e) {
        error_log("Erreur getTotalFajrPrayers: " . $e->getMessage());
        return 0;
    }
}

/**
 * Nombre total de contenus partagés
 */
function getTotalContentShared($user_id) {
    try {
        $pdo = getDBConnection();
        if ($pdo === null) {
            return 0;
        }
        $stmt = $pdo->prepare("
            SELECT COALESCE(SUM(content_shared), 0) as total
            FROM user_stats
            WHERE user_id = ?
        ");
        $stmt->execute([$user_id]);
        $row = $stmt->fetch();
        return (int) ($row['total'] ?? 0);
    } catch (Exception $e) {
        error_log("Avertissement getTotalContentShared (colonne peut-être absente): " . $e->getMessage());
        return 0;
    }
}

/**
 * Récupère les statistiques de base de l'utilisateur
 */
function getUserStats($user_id) {
    try {
        $pdo = getDBConnection();
        
        // 🚀 VÉRIFICATION CRITIQUE : S'assurer que PDO n'est pas null
        if ($pdo === null) {
            error_log("ERROR: getDBConnection() a retourné null dans getUserStats()");
            // Retourner des statistiques par défaut en cas d'erreur
            return [
                'total_days' => 0,
                'complete_days' => 0,
                'success_rate' => 0,
                'success_rate_all_time' => 0,
                'total_prayers' => 0,
                'total_prayers_all_time' => 0,
                'avg_prayers_per_day' => 0,
                'total_dhikr' => 0,
                'total_quran_verses' => 0,
                'total_hadiths' => 0,
                'total_favorites' => 0,
                'total_downloads' => 0,
                'total_usage_minutes' => 0,
                'best_streak' => 0,
                'current_streak' => 0,
                'total_fajr_prayers' => 0,
                'total_shares' => 0
            ];
        }
    } catch (Exception $e) {
        error_log("Erreur connexion DB dans getUserStats: " . $e->getMessage());
        // Retourner des statistiques par défaut en cas d'erreur
        return [
            'total_days' => 0,
            'complete_days' => 0,
            'success_rate' => 0,
            'success_rate_all_time' => 0,
            'total_prayers' => 0,
            'total_prayers_all_time' => 0,
            'avg_prayers_per_day' => 0,
            'total_dhikr' => 0,
            'total_quran_verses' => 0,
            'total_hadiths' => 0,
            'total_favorites' => 0,
            'total_downloads' => 0,
            'total_usage_minutes' => 0,
            'best_streak' => 0,
            'current_streak' => 0,
            'total_fajr_prayers' => 0,
            'total_shares' => 0
        ];
    }
    
    try {
        // Vérifier si la table user_stats existe
        $stmt = $pdo->prepare("SHOW TABLES LIKE 'user_stats'");
        $stmt->execute();
        $tableExists = $stmt->fetch();
        
        if (!$tableExists) {
            // Table n'existe pas - retourner des statistiques par défaut
            return [
                'total_days' => 0,
                'complete_days' => 0,
                'success_rate' => 0,
                'success_rate_all_time' => 0,
                'total_prayers' => 0,
                'total_prayers_all_time' => 0,
                'avg_prayers_per_day' => 0,
                'total_dhikr' => 0,
                'total_quran_verses' => 0,
                'total_hadiths' => 0,
                'total_favorites' => 0,
                'total_downloads' => 0,
                'total_usage_minutes' => 0,
                'best_streak' => 0,
                'current_streak' => 0,
                'total_fajr_prayers' => 0,
                'total_shares' => 0
            ];
        }
        
        // Statistiques des 30 derniers jours
        $stmt = $pdo->prepare("
            SELECT 
                SUM(prayers_completed) as total_prayers,
                SUM(dhikr_count) as total_dhikr,
                SUM(quran_verses_read) as total_quran_verses,
                SUM(hadiths_read) as total_hadiths,
                SUM(favorites_added) as total_favorites,
                SUM(content_downloaded) as total_downloads,
                SUM(app_usage_minutes) as total_usage_minutes,
                COUNT(*) as total_days,
                COUNT(CASE WHEN prayers_completed >= 5 THEN 1 END) as complete_days,
                MAX(streak_days) as best_streak,
                AVG(prayers_completed) as avg_prayers_per_day
            FROM user_stats 
            WHERE user_id = ? 
            AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        ");
        $stmt->execute([$user_id]);
        $stats = $stmt->fetch();

        $recent_days = buildRecentDayPrayerCounts($pdo, $user_id, 30);
        $tracked_days = 0;
        $complete_days_recent = 0;
        $total_prayers_recent = 0;
        foreach ($recent_days as $day) {
            $count = (int) $day['prayers_completed'];
            if ($count > 0) {
                $tracked_days++;
                $total_prayers_recent += $count;
                if (isCompletePrayerDay($count)) {
                    $complete_days_recent++;
                }
            }
        }
        
        // Statistiques globales
        $stmt = $pdo->prepare("
            SELECT 
                SUM(prayers_completed) as total_prayers_all_time,
                SUM(dhikr_count) as total_dhikr_all_time,
                SUM(quran_verses_read) as total_quran_verses_all_time,
                SUM(hadiths_read) as total_hadiths_all_time,
                COUNT(*) as total_days_all_time,
                COUNT(CASE WHEN prayers_completed >= 5 THEN 1 END) as complete_days_all_time
            FROM user_stats 
            WHERE user_id = ?
        ");
        $stmt->execute([$user_id]);
        $global_stats = $stmt->fetch();
        
        $streaks = calculateStreaks($user_id);
        $success_rate = $tracked_days > 0 ? round(($complete_days_recent / $tracked_days) * 100) : 0;
        $success_rate_all_time = $global_stats['total_days_all_time'] > 0 ? round(($global_stats['complete_days_all_time'] / $global_stats['total_days_all_time']) * 100) : 0;
        $avg_prayers = $tracked_days > 0 ? round($total_prayers_recent / $tracked_days, 1) : 0;
        
        return [
            'total_days' => $tracked_days,
            'complete_days' => $complete_days_recent,
            'success_rate' => $success_rate,
            'success_rate_all_time' => $success_rate_all_time,
            'total_prayers' => $total_prayers_recent > 0 ? $total_prayers_recent : (int) $stats['total_prayers'],
            'total_prayers_all_time' => (int)$global_stats['total_prayers_all_time'],
            'avg_prayers_per_day' => $avg_prayers > 0 ? $avg_prayers : round($stats['avg_prayers_per_day'] ?? 0, 1),
            'total_dhikr' => (int)$stats['total_dhikr'],
            'total_dhikr_all_time' => (int)($global_stats['total_dhikr_all_time'] ?? 0),
            'total_quran_verses' => (int)$stats['total_quran_verses'],
            'total_quran_verses_all_time' => (int)($global_stats['total_quran_verses_all_time'] ?? 0),
            'total_hadiths' => (int)$stats['total_hadiths'],
            'total_hadiths_all_time' => (int)($global_stats['total_hadiths_all_time'] ?? 0),
            'total_favorites' => (int)$stats['total_favorites'],
            'total_downloads' => (int)$stats['total_downloads'],
            'total_usage_minutes' => (int)$stats['total_usage_minutes'],
            'best_streak' => max((int) ($stats['best_streak'] ?? 0), (int) $streaks['max_streak']),
            'current_streak' => (int) $streaks['current_streak'],
            'total_fajr_prayers' => getTotalFajrPrayers($user_id),
            'total_shares' => getTotalContentShared($user_id),
        ];
    } catch (Exception $e) {
        error_log("Erreur getUserStats: " . $e->getMessage());
        // En cas d'erreur, retourner des statistiques par défaut
        return [
            'total_days' => 0,
            'complete_days' => 0,
            'success_rate' => 0,
            'success_rate_all_time' => 0,
            'total_prayers' => 0,
            'total_prayers_all_time' => 0,
            'avg_prayers_per_day' => 0,
            'total_dhikr' => 0,
            'total_quran_verses' => 0,
            'total_hadiths' => 0,
            'total_favorites' => 0,
            'total_downloads' => 0,
            'total_usage_minutes' => 0,
            'best_streak' => 0,
            'current_streak' => 0
        ];
    }
}

/**
 * Compte de prières par jour calendaire (prayer_logs + user_stats), aujourd'hui en premier
 */
function buildRecentDayPrayerCounts($pdo, $user_id, $days = 90) {
    $counts = [];

    if ($pdo !== null && prayerLogsTableExists($pdo)) {
        $stmt = $pdo->prepare("
            SELECT date, COUNT(DISTINCT prayer_type) as cnt
            FROM prayer_logs
            WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY date
        ");
        $stmt->execute([$user_id, max(0, $days - 1)]);
        foreach ($stmt->fetchAll() as $row) {
            $counts[$row['date']] = (int) $row['cnt'];
        }
    }

    if ($pdo !== null) {
        $stmt = $pdo->prepare("
            SELECT date, prayers_completed
            FROM user_stats
            WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        ");
        $stmt->execute([$user_id, max(0, $days - 1)]);
        foreach ($stmt->fetchAll() as $row) {
            $date = $row['date'];
            $counts[$date] = max($counts[$date] ?? 0, (int) $row['prayers_completed']);
        }
    }

    $result = [];
    for ($i = 0; $i < $days; $i++) {
        $date = date('Y-m-d', strtotime("-{$i} days"));
        $result[] = [
            'date' => $date,
            'prayers_completed' => $counts[$date] ?? 0,
        ];
    }

    return $result;
}

function isCompletePrayerDay($count) {
    return (int) $count >= 5;
}

function computeCurrentStreakFromDays($days) {
    $streak = 0;
    foreach ($days as $index => $day) {
        if (isCompletePrayerDay($day['prayers_completed'])) {
            $streak++;
        } elseif ($index === 0) {
            // Aujourd'hui pas encore complet : la série peut continuer depuis hier
            continue;
        } else {
            break;
        }
    }
    return $streak;
}

function computeMaxStreakFromDays($days) {
    $max_streak = 0;
    $run = 0;
    $ascending = array_reverse($days);

    foreach ($ascending as $day) {
        if (isCompletePrayerDay($day['prayers_completed'])) {
            $run++;
            $max_streak = max($max_streak, $run);
        } else {
            $run = 0;
        }
    }

    return $max_streak;
}

/**
 * Calcule les séries de prières
 */
function calculateStreaks($user_id) {
    try {
        $pdo = getDBConnection();
        
        if ($pdo === null) {
            error_log("ERROR: getDBConnection() a retourné null dans calculateStreaks()");
            return [
                'current_streak' => 0,
                'max_streak' => 0,
                'total_streaks' => 0,
                'short_streaks' => 0,
                'long_gaps' => 0,
                'avg_streak_length' => 0
            ];
        }
        
        $days = buildRecentDayPrayerCounts($pdo, $user_id, 90);
        $current_streak = computeCurrentStreakFromDays($days);
        $max_streak = computeMaxStreakFromDays($days);

        $streaks = [];
        $gaps = [];
        $run = 0;
        $gap = 0;
        $ascending = array_reverse($days);

        foreach ($ascending as $day) {
            if (isCompletePrayerDay($day['prayers_completed'])) {
                $run++;
                if ($gap > 0) {
                    $gaps[] = $gap;
                    $gap = 0;
                }
            } else {
                if ($run > 0) {
                    $streaks[] = $run;
                    $run = 0;
                }
                $gap++;
            }
        }
        if ($run > 0) {
            $streaks[] = $run;
        }

        $total_streaks = count($streaks);
        $short_streaks = count(array_filter($streaks, function ($s) { return $s <= 3; }));
        $long_gaps = count(array_filter($gaps, function ($g) { return $g >= 7; }));
        $avg_streak_length = $total_streaks > 0 ? array_sum($streaks) / $total_streaks : 0;
        
        return [
            'current_streak' => $current_streak,
            'max_streak' => $max_streak,
            'total_streaks' => $total_streaks,
            'short_streaks' => $short_streaks,
            'long_gaps' => $long_gaps,
            'avg_streak_length' => round($avg_streak_length, 1)
        ];
    } catch (Exception $e) {
        error_log("Erreur calculateStreaks: " . $e->getMessage());
        return [
            'current_streak' => 0,
            'max_streak' => 0,
            'total_streaks' => 0,
            'short_streaks' => 0,
            'long_gaps' => 0,
            'avg_streak_length' => 0
        ];
    }
}

/**
 * Récupère la série actuelle (jours consécutifs complets)
 */
function getCurrentStreak($user_id) {
    try {
        $pdo = getDBConnection();
        if ($pdo === null) {
            error_log("ERROR: getDBConnection() a retourné null dans getCurrentStreak()");
            return 0;
        }

        $days = buildRecentDayPrayerCounts($pdo, $user_id, 90);
        return computeCurrentStreakFromDays($days);
    } catch (Exception $e) {
        error_log("Erreur getCurrentStreak: " . $e->getMessage());
        return 0;
    }
}

/**
 * Détecte le profil utilisateur
 */
function detectUserProfile($stats, $streaks) {
    $total_days = $stats['total_days'];
    $complete_days = $stats['complete_days'];
    $success_rate = $stats['success_rate'];
    $current_streak = $streaks['current_streak'];
    $short_streaks = $streaks['short_streaks'];
    $long_gaps = $streaks['long_gaps'];
    
    if ($complete_days === 0) return 'beginner';
    if ($current_streak === 0 && $long_gaps > 7) return 'stopped';
    if ($short_streaks > 2 && $long_gaps > 0) return 'yoyo';
    if ($success_rate >= 70 && $current_streak >= 7) return 'regular';
    if ($success_rate < 30) return 'beginner';
    if ($success_rate < 70) return 'yoyo';
    
    return 'regular';
}

/**
 * Génère des conseils personnalisés
 */
function generatePersonalizedAdvice($stats, $streaks, $profile) {
    $advice = [];
    $action_plan = [];
    
    // Conseils basés sur les patterns
    if ($stats['avg_prayers_per_day'] < 3) {
        $advice[] = [
            'key' => 'advice_low_prayers',
            'params' => ['avg' => $stats['avg_prayers_per_day']]
        ];
        $action_plan[] = [
            'step_key' => 'action_increase_prayers',
            'duration_key' => 'duration_this_week',
            'reward_key' => 'reward_improved_regularity'
        ];
    }
    
    if ($streaks['short_streaks'] > 2) {
        $advice[] = [
            'key' => 'advice_short_streaks',
            'params' => []
        ];
        $action_plan[] = [
            'step_key' => 'action_small_goal',
            'duration_key' => 'duration_2_weeks',
            'reward_key' => 'reward_habit_installed'
        ];
    }
    
    if ($streaks['long_gaps'] > 7) {
        $advice[] = [
            'key' => 'advice_long_gaps',
            'params' => []
        ];
        $action_plan[] = [
            'step_key' => 'action_daily_alarm',
            'duration_key' => 'duration_1_month',
            'reward_key' => 'reward_constant_regularity'
        ];
    }
    
    // Conseils selon le profil
    switch ($profile) {
        case 'beginner':
            $advice[] = [
                'key' => 'advice_beginner',
                'params' => []
            ];
            $action_plan[] = [
                'step_key' => 'action_minimum_daily',
                'duration_key' => 'duration_2_weeks',
                'reward_key' => 'reward_self_confidence'
            ];
            break;
        case 'yoyo':
            $advice[] = [
                'key' => 'advice_yoyo',
                'params' => []
            ];
            $action_plan[] = [
                'step_key' => 'action_restart_today',
                'duration_key' => 'duration_1_week',
                'reward_key' => 'reward_new_streak'
            ];
            break;
        case 'regular':
            $advice[] = [
                'key' => 'advice_regular',
                'params' => []
            ];
            $action_plan[] = [
                'step_key' => 'action_maintain_streak',
                'duration_key' => 'duration_this_week',
                'reward_key' => 'reward_new_record'
            ];
            break;
    }
    
    return [
        'advice' => $advice,
        'action_plan' => $action_plan
    ];
}

/**
 * Calcule les points utilisateur
 */
function calculatePoints($stats) {
    $points = 0;
    $points += $stats['total_prayers'] * 10; // 10 points par prière
    $points += $stats['best_streak'] * 50; // 50 points par jour de série
    $points += $stats['complete_days'] * 20; // 20 points par jour complet
    $points += $stats['total_dhikr'] * 5; // 5 points par dhikr
    $points += $stats['total_quran_verses'] * 2; // 2 points par verset
    
    return $points;
}

/**
 * Calcule le niveau utilisateur
 */
function calculateLevel($points) {
    if ($points < 100) return ['level' => 1, 'title' => 'Débutant', 'progress' => $points / 100];
    if ($points < 300) return ['level' => 2, 'title' => 'Fidèle', 'progress' => ($points - 100) / 200];
    if ($points < 600) return ['level' => 3, 'title' => 'Expert', 'progress' => ($points - 300) / 300];
    if ($points < 1000) return ['level' => 4, 'title' => 'Maître', 'progress' => ($points - 600) / 400];
    return ['level' => 5, 'title' => 'Sage', 'progress' => 1];
}

/**
 * Récupère les challenges actifs
 */
function getActiveChallenges($user_id) {
    try {
        $pdo = getDBConnection();
        
        // 🚀 VÉRIFICATION CRITIQUE : S'assurer que PDO n'est pas null
        if ($pdo === null) {
            error_log("ERROR: getDBConnection() a retourné null dans getActiveChallenges()");
            // Retourner des challenges par défaut en cas d'erreur
            return [
                [
                    'id' => 'prayer_streak',
                    'title' => 'Série de Prières',
                    'description' => 'Prie 5 fois par jour pendant 7 jours consécutifs',
                    'reward' => '50 points + Badge "Fidèle"',
                    'progress' => 0,
                    'icon' => 'flame',
                    'color' => '#FF6B6B'
                ]
            ];
        }
        
        // Vérifier si la table achievements existe
        $stmt = $pdo->prepare("SHOW TABLES LIKE 'achievements'");
        $stmt->execute();
        $tableExists = $stmt->fetch();
        
        if (!$tableExists) {
            // Table n'existe pas - retourner des challenges par défaut
            return [
                [
                    'id' => 'prayer_streak',
                    'title' => 'Série de Prières',
                    'description' => 'Prie 5 fois par jour pendant 7 jours consécutifs',
                    'reward' => '50 points + Badge "Fidèle"',
                    'progress' => 0,
                    'icon' => 'flame',
                    'color' => '#FF6B6B'
                ]
            ];
        }
        
        // Récupérer les challenges actifs
        $stmt = $pdo->prepare("
            SELECT 
                a.code as id,
                a.title as title_key,
                a.description as description_key,
                CONCAT(a.points, ' points') as reward,
                COALESCE(ua.progress, 0) as progress,
                a.icon,
                '#FF6B6B' as color,
                a.points,
                a.requirement_type,
                a.requirement_value,
                a.category
            FROM achievements a
            LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
            WHERE a.is_hidden = 0
            ORDER BY a.points ASC
            LIMIT 5
        ");
        $stmt->execute([$user_id]);
        $challenges = $stmt->fetchAll();
        
        // Transformer les résultats pour utiliser les clés de traduction
        $formattedChallenges = array_map(function($challenge) {
            return [
                'id' => $challenge['id'],
                'title' => $challenge['title_key'], // Clé de traduction
                'description' => $challenge['description_key'], // Clé de traduction
                'reward' => $challenge['reward'],
                'progress' => (float)$challenge['progress'],
                'icon' => $challenge['icon'],
                'color' => $challenge['color'],
                'points' => (int)$challenge['points'],
                'requirement_type' => $challenge['requirement_type'],
                'requirement_value' => (int)$challenge['requirement_value'],
                'category' => $challenge['category']
            ];
        }, $challenges);
        
        return $formattedChallenges ?: [
            [
                'id' => 'prayer_streak',
                'title' => 'Série de Prières',
                'description' => 'Prie 5 fois par jour pendant 7 jours consécutifs',
                'reward' => '50 points + Badge "Fidèle"',
                'progress' => 0,
                'icon' => 'flame',
                'color' => '#FF6B6B'
            ]
        ];
    } catch (Exception $e) {
        error_log("Erreur getActiveChallenges: " . $e->getMessage());
        return [
            [
                'id' => 'prayer_streak',
                'title' => 'Série de Prières',
                'description' => 'Prie 5 fois par jour pendant 7 jours consécutifs',
                'reward' => '50 points + Badge "Fidèle"',
                'progress' => 0,
                'icon' => 'flame',
                'color' => '#FF6B6B'
            ]
        ];
    }
}

/**
 * Récupère les badges de l'utilisateur
 */
function getUserBadges($user_id) {
    try {
        $pdo = getDBConnection();
        
        // 🚀 VÉRIFICATION CRITIQUE : S'assurer que PDO n'est pas null
        if ($pdo === null) {
            error_log("ERROR: getDBConnection() a retourné null dans getUserBadges()");
            // En cas d'erreur de connexion, retourner un tableau vide
            return [];
        }
        
        // Vérifier si la table achievements existe
        $stmt = $pdo->prepare("SHOW TABLES LIKE 'achievements'");
        $stmt->execute();
        $tableExists = $stmt->fetch();
        
        if (!$tableExists) {
            // Table n'existe pas - retourner un tableau vide
            return [];
        }
        
        // Récupérer tous les badges
        $stmt = $pdo->prepare("
            SELECT 
                a.code as id,
                a.title as name_key,
                a.description as description_key,
                a.icon,
                a.points,
                a.category,
                CASE WHEN ua.unlocked_at IS NOT NULL THEN 1 ELSE 0 END as unlocked,
                ua.unlocked_at
            FROM achievements a
            LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
            WHERE a.is_hidden = 0
            ORDER BY a.points ASC
        ");
        $stmt->execute([$user_id]);
        $badges = $stmt->fetchAll();
        
        // Transformer les résultats pour utiliser les clés de traduction
        $formattedBadges = array_map(function($badge) {
            return [
                'id' => $badge['id'],
                'name' => $badge['name_key'], // Clé de traduction
                'description' => $badge['description_key'], // Clé de traduction
                'icon' => $badge['icon'],
                'points' => (int)$badge['points'],
                'category' => $badge['category'],
                'unlocked' => (bool)$badge['unlocked'],
                'unlocked_at' => $badge['unlocked_at']
            ];
        }, $badges);
        
        // Si aucun badge n'est défini dans la table achievements, retourner un tableau vide
        // au lieu d'un badge fictif par défaut
        return $formattedBadges ?: [];
    } catch (Exception $e) {
        error_log("Erreur getUserBadges: " . $e->getMessage());
        // En cas d'erreur, retourner un tableau vide au lieu d'un badge fictif
        return [];
    }
}

/**
 * Vérifie si la table prayer_logs existe
 */
function prayerLogsTableExists($pdo) {
    $stmt = $pdo->prepare("SHOW TABLES LIKE 'prayer_logs'");
    $stmt->execute();
    return (bool) $stmt->fetch();
}

/**
 * État des 5 prières du jour
 */
function getPrayersForDate($user_id, $date) {
    $default = [
        'fajr' => false,
        'dhuhr' => false,
        'asr' => false,
        'maghrib' => false,
        'isha' => false,
    ];

    try {
        $pdo = getDBConnection();
        if ($pdo === null || !prayerLogsTableExists($pdo)) {
            return $default;
        }

        $stmt = $pdo->prepare("
            SELECT prayer_type
            FROM prayer_logs
            WHERE user_id = ? AND date = ?
        ");
        $stmt->execute([$user_id, $date]);
        $rows = $stmt->fetchAll();

        foreach ($rows as $row) {
            $type = strtolower($row['prayer_type']);
            if (array_key_exists($type, $default)) {
                $default[$type] = true;
            }
        }

        return $default;
    } catch (Exception $e) {
        error_log("Erreur getPrayersForDate: " . $e->getMessage());
        return $default;
    }
}

function getTodayPrayers($user_id) {
    return getPrayersForDate($user_id, date('Y-m-d'));
}

/**
 * Limite le rattrapage à aujourd'hui et hier
 */
function normalizePrayerActionDate($action_data, $today) {
    $requested = $action_data['date'] ?? $today;
    $yesterday = date('Y-m-d', strtotime('-1 day'));
    if ($requested === $today || $requested === $yesterday) {
        return $requested;
    }
    return $today;
}

/**
 * Assure une ligne user_stats pour la date donnée
 */
function ensureTodayStatsRow($pdo, $user_id, $today) {
    $stmt = $pdo->prepare("SELECT id FROM user_stats WHERE user_id = ? AND date = ?");
    $stmt->execute([$user_id, $today]);
    if ($stmt->fetch()) {
        return;
    }

    $stmt = $pdo->prepare("
        INSERT INTO user_stats (
            user_id, date, prayers_completed, dhikr_count, quran_verses_read,
            hadiths_read, favorites_added, content_downloaded, app_usage_minutes, streak_days
        ) VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0, 0)
    ");
    $stmt->execute([$user_id, $today]);
}

/**
 * Synchronise prayers_completed depuis prayer_logs (source de vérité)
 */
function syncPrayerCountFromLogs($pdo, $user_id, $date) {
    if (!prayerLogsTableExists($pdo)) {
        return;
    }

    $stmt = $pdo->prepare("
        SELECT COUNT(DISTINCT prayer_type) as cnt
        FROM prayer_logs
        WHERE user_id = ? AND date = ?
    ");
    $stmt->execute([$user_id, $date]);
    $count = (int) ($stmt->fetchColumn() ?: 0);

    ensureTodayStatsRow($pdo, $user_id, $date);
    $stmt = $pdo->prepare("
        UPDATE user_stats
        SET prayers_completed = ?
        WHERE user_id = ? AND date = ?
    ");
    $stmt->execute([$count, $user_id, $date]);
}

/**
 * Incrémente / décrémente prayers_completed du jour
 */
function adjustTodayPrayerCount($pdo, $user_id, $today, $delta) {
    ensureTodayStatsRow($pdo, $user_id, $today);
    $stmt = $pdo->prepare("
        UPDATE user_stats
        SET prayers_completed = GREATEST(0, prayers_completed + ?)
        WHERE user_id = ? AND date = ?
    ");
    $stmt->execute([$delta, $user_id, $today]);
}

/**
 * Gère le toggle d'une prière précise (fajr…isha)
 */
function handlePrayerTypeToggle($pdo, $user_id, $action, $action_data, $today) {
    $valid_types = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    $prayer_type = strtolower($action_data['prayer_type'] ?? 'general');
    $completing = ($action === 'prayer_completed');

    if (!in_array($prayer_type, $valid_types, true)) {
        if ($completing) {
            adjustTodayPrayerCount($pdo, $user_id, $today, 1);
        }
        return;
    }

    if (prayerLogsTableExists($pdo)) {
        if ($completing) {
            $stmt = $pdo->prepare("
                INSERT IGNORE INTO prayer_logs (user_id, date, prayer_type, completed_at)
                VALUES (?, ?, ?, NOW())
            ");
            $stmt->execute([$user_id, $today, $prayer_type]);
        } else {
            $stmt = $pdo->prepare("
                DELETE FROM prayer_logs
                WHERE user_id = ? AND date = ? AND prayer_type = ?
            ");
            $stmt->execute([$user_id, $today, $prayer_type]);
        }
        syncPrayerCountFromLogs($pdo, $user_id, $today);
        return;
    }

    adjustTodayPrayerCount($pdo, $user_id, $today, $completing ? 1 : -1);
}

/**
 * Récupère l'historique des prières
 */
function getPrayerHistory($user_id, $days = 30) {
    try {
        $pdo = getDBConnection();
        
        // 🚀 VÉRIFICATION CRITIQUE : S'assurer que PDO n'est pas null
        if ($pdo === null) {
            error_log("ERROR: getDBConnection() a retourné null dans getPrayerHistory()");
            return [];
        }
        
        // Vérifier si la table user_stats existe
        $stmt = $pdo->prepare("SHOW TABLES LIKE 'user_stats'");
        $stmt->execute();
        $tableExists = $stmt->fetch();
        
        if (!$tableExists) {
            return [];
        }
        
        $usePrayerLogs = prayerLogsTableExists($pdo);

        if ($usePrayerLogs) {
            $stmt = $pdo->prepare("
                SELECT 
                    us.date,
                    CASE WHEN GREATEST(COALESCE(us.prayers_completed, 0), COALESCE(pl.cnt, 0)) >= 5 THEN 1 ELSE 0 END as complete,
                    GREATEST(COALESCE(us.prayers_completed, 0), COALESCE(pl.cnt, 0)) as prayers,
                    COALESCE(us.dhikr_count, 0) as dhikr,
                    COALESCE(us.quran_verses_read, 0) as quran,
                    COALESCE(us.hadiths_read, 0) as hadiths
                FROM user_stats us
                LEFT JOIN (
                    SELECT date, COUNT(DISTINCT prayer_type) as cnt
                    FROM prayer_logs
                    WHERE user_id = ?
                    GROUP BY date
                ) pl ON pl.date = us.date
                WHERE us.user_id = ? 
                AND us.date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                ORDER BY us.date DESC
            ");
            $stmt->execute([$user_id, $user_id, $days]);
        } else {
            $stmt = $pdo->prepare("
                SELECT 
                    date,
                    CASE WHEN prayers_completed >= 5 THEN 1 ELSE 0 END as complete,
                    prayers_completed as prayers,
                    dhikr_count as dhikr,
                    quran_verses_read as quran,
                    hadiths_read as hadiths
                FROM user_stats 
                WHERE user_id = ? 
                AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                ORDER BY date DESC
            ");
            $stmt->execute([$user_id, $days]);
        }

        $history = $stmt->fetchAll();
        
        return $history;
    } catch (Exception $e) {
        error_log("Erreur getPrayerHistory: " . $e->getMessage());
        return [];
    }
}

/**
 * Génère une notification intelligente
 */
function getSmartNotification($stats, $profile) {
    $notifications = [
        'regular' => [
            'notification_regular_1',
            'notification_regular_2',
            'notification_regular_3'
        ],
        'yoyo' => [
            'notification_yoyo_1',
            'notification_yoyo_2',
            'notification_yoyo_3'
        ],
        'beginner' => [
            'notification_beginner_1',
            'notification_beginner_2',
            'notification_beginner_3'
        ],
        'stopped' => [
            'notification_stopped_1',
            'notification_stopped_2',
            'notification_stopped_3'
        ]
    ];
    
    $profile_notifications = $notifications[$profile] ?? $notifications['beginner'];
    return [
        'key' => $profile_notifications[array_rand($profile_notifications)],
        'params' => []
    ];
}

/**
 * POST /api/user-stats.php
 * Met à jour les statistiques de l'utilisateur
 */
function handleUpdateUserStats() {
    try {
        $pdo = getDBConnection();
        
        // 🚀 VÉRIFICATION CRITIQUE : S'assurer que PDO n'est pas null
        if ($pdo === null) {
            error_log("ERROR: getDBConnection() a retourné null dans handleUpdateUserStats()");
            jsonResponse(false, [
                'message' => 'Erreur de connexion base de données'
            ], 'Erreur de connexion base de données', 500);
            return;
        }
        
        // Vérifier si la table user_stats existe
        $stmt = $pdo->prepare("SHOW TABLES LIKE 'user_stats'");
        $stmt->execute();
        $tableExists = $stmt->fetch();
        
        if (!$tableExists) {
            // Table n'existe pas - retourner un message premium
            jsonResponse(false, [
                'premium_required' => true,
                'message' => 'Fonctionnalité premium requise',
                'premium_message' => 'Devenez Premium pour débloquer le suivi de vos statistiques'
            ], 'Fonctionnalité premium requise', 403);
            return;
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        $user_id = $input['user_id'] ?? null;
        $email = $input['email'] ?? null;
        $action = $input['action'] ?? null;
        
        if ((!$user_id && !$email) || !$action) {
            handleError("user_id ou email et action requis", 400);
        }
        
        // Récupérer l'utilisateur
        if ($user_id) {
            $stmt = $pdo->prepare("SELECT id FROM users WHERE id = ? AND status = 'active'");
            $stmt->execute([$user_id]);
        } else {
            $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND status = 'active'");
            $stmt->execute([$email]);
        }
        
        $user = $stmt->fetch();
        
        if (!$user) {
            handleError("Utilisateur non trouvé", 404);
        }
        
        $user_id = $user['id'];
        $today = date('Y-m-d');
        $action_data = $input['action_data'] ?? [];

        if (in_array($action, ['prayer_completed', 'prayer_uncompleted'], true)) {
            $prayer_date = normalizePrayerActionDate($action_data, $today);
            handlePrayerTypeToggle($pdo, $user_id, $action, $action_data, $prayer_date);
            updateStreakDays($user_id);
            jsonResponse(true, [
                'message' => 'Prière mise à jour avec succès',
                'today_prayers' => getTodayPrayers($user_id),
                'yesterday_prayers' => getPrayersForDate($user_id, date('Y-m-d', strtotime('-1 day'))),
                'updated_prayers' => getPrayersForDate($user_id, $prayer_date),
                'updated_date' => $prayer_date,
            ]);
            return;
        }
        
        // Vérifier si les stats du jour existent
        $stmt = $pdo->prepare("SELECT * FROM user_stats WHERE user_id = ? AND date = ?");
        $stmt->execute([$user_id, $today]);
        $existing_stats = $stmt->fetch();
        
        if ($existing_stats) {
            // Mettre à jour les stats existantes
            $update_fields = [];
            $params = [];
            
            switch ($action) {
                case 'dhikr_completed':
                    $update_fields[] = "dhikr_count = dhikr_count + 1";
                    break;
                case 'quran_read':
                    $update_fields[] = "quran_verses_read = quran_verses_read + 1";
                    break;
                case 'hadith_read':
                    $update_fields[] = "hadiths_read = hadiths_read + 1";
                    break;
                case 'favorite_added':
                    $update_fields[] = "favorites_added = favorites_added + 1";
                    break;
                case 'content_downloaded':
                    $update_fields[] = "content_downloaded = content_downloaded + 1";
                    break;
                case 'content_shared':
                    $update_fields[] = "content_shared = content_shared + 1";
                    break;
                case 'reset_all':
                    // 🔥 RÉINITIALISATION COMPLÈTE DES STATISTIQUES ET BADGES
                    
                    // Supprimer toutes les statistiques de l'utilisateur
                    $stmt = $pdo->prepare("DELETE FROM user_stats WHERE user_id = ?");
                    $stmt->execute([$user_id]);
                    $stats_deleted = $stmt->rowCount();
                    
                    // Supprimer tous les badges/achievements de l'utilisateur
                    $badges_deleted = 0;
                    try {
                        // Vérifier si la table user_achievements existe
                        $checkStmt = $pdo->prepare("SHOW TABLES LIKE 'user_achievements'");
                        $checkStmt->execute();
                        $tableExists = $checkStmt->fetch();
                        
                        if ($tableExists) {
                            $badgeStmt = $pdo->prepare("DELETE FROM user_achievements WHERE user_id = ?");
                            $badgeStmt->execute([$user_id]);
                            $badges_deleted = $badgeStmt->rowCount();
                        }
                    } catch (Exception $e) {
                        error_log("Avertissement lors de la suppression des badges: " . $e->getMessage());
                        // Continuer même en cas d'erreur avec les badges
                    }
                    
                    jsonResponse(true, [
                        'message' => 'Toutes les statistiques et badges ont été réinitialisés avec succès',
                        'stats_deleted' => $stats_deleted,
                        'badges_deleted' => $badges_deleted,
                        'total_deleted' => $stats_deleted + $badges_deleted
                    ]);
                    return; // Sortir de la fonction car on a déjà envoyé la réponse
            }
            
            if (!empty($update_fields)) {
                $sql = "UPDATE user_stats SET " . implode(', ', $update_fields) . " WHERE user_id = ? AND date = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$user_id, $today]);
            }
        } else {
            // Gérer reset_all même s'il n'y a pas de stats existantes
            if ($action === 'reset_all') {
                // 🔥 RÉINITIALISATION COMPLÈTE DES STATISTIQUES ET BADGES
                
                // Supprimer toutes les stats existantes (au cas où il y en aurait d'autres dates)
                $stmt = $pdo->prepare("DELETE FROM user_stats WHERE user_id = ?");
                $stmt->execute([$user_id]);
                $stats_deleted = $stmt->rowCount();
                
                // Supprimer tous les badges/achievements de l'utilisateur
                $badges_deleted = 0;
                try {
                    // Vérifier si la table user_achievements existe
                    $checkStmt = $pdo->prepare("SHOW TABLES LIKE 'user_achievements'");
                    $checkStmt->execute();
                    $tableExists = $checkStmt->fetch();
                    
                    if ($tableExists) {
                        $badgeStmt = $pdo->prepare("DELETE FROM user_achievements WHERE user_id = ?");
                        $badgeStmt->execute([$user_id]);
                        $badges_deleted = $badgeStmt->rowCount();
                    }
                } catch (Exception $e) {
                    error_log("Avertissement lors de la suppression des badges: " . $e->getMessage());
                    // Continuer même en cas d'erreur avec les badges
                }
                
                jsonResponse(true, [
                    'message' => 'Toutes les statistiques et badges ont été réinitialisés avec succès',
                    'stats_deleted' => $stats_deleted,
                    'badges_deleted' => $badges_deleted,
                    'total_deleted' => $stats_deleted + $badges_deleted
                ]);
                return;
            }
            
            // Créer de nouvelles stats pour aujourd'hui
            $initial_values = [
                'prayers_completed' => $action === 'prayer_completed' ? 1 : 0,
                'dhikr_count' => $action === 'dhikr_completed' ? 1 : 0,
                'quran_verses_read' => $action === 'quran_read' ? 1 : 0,
                'hadiths_read' => $action === 'hadith_read' ? 1 : 0,
                'favorites_added' => $action === 'favorite_added' ? 1 : 0,
                'content_downloaded' => $action === 'content_downloaded' ? 1 : 0,
                'content_shared' => $action === 'content_shared' ? 1 : 0,
                'app_usage_minutes' => 0,
                'streak_days' => 0
            ];
            
            $stmt = $pdo->prepare("
                INSERT INTO user_stats (
                    user_id, date, prayers_completed, dhikr_count, quran_verses_read,
                    hadiths_read, favorites_added, content_downloaded, content_shared, app_usage_minutes, streak_days
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $user_id, $today,
                $initial_values['prayers_completed'],
                $initial_values['dhikr_count'],
                $initial_values['quran_verses_read'],
                $initial_values['hadiths_read'],
                $initial_values['favorites_added'],
                $initial_values['content_downloaded'],
                $initial_values['content_shared'],
                $initial_values['app_usage_minutes'],
                $initial_values['streak_days']
            ]);
        }
        
        // Mettre à jour les séries
        updateStreakDays($user_id);
        
        jsonResponse(true, ['message' => 'Statistiques mises à jour avec succès']);
    } catch (Exception $e) {
        error_log("Erreur handleUpdateUserStats: " . $e->getMessage());
        handleError("Erreur lors de la mise à jour des statistiques", 500);
    }
}

/**
 * Met à jour les jours de série de l'utilisateur
 */
function updateStreakDays($user_id) {
    try {
        $pdo = getDBConnection();
        
        // 🚀 VÉRIFICATION CRITIQUE : S'assurer que PDO n'est pas null
        if ($pdo === null) {
            error_log("ERROR: getDBConnection() a retourné null dans updateStreakDays()");
            return; // Table n'existe pas, pas besoin de mettre à jour
        }
        
        // Vérifier si la table user_stats existe
        $stmt = $pdo->prepare("SHOW TABLES LIKE 'user_stats'");
        $stmt->execute();
        $tableExists = $stmt->fetch();
        
        if (!$tableExists) {
            return; // Table n'existe pas, pas besoin de mettre à jour
        }
        
        // Calculer la série actuelle
        $current_streak = getCurrentStreak($user_id);
        
        // Mettre à jour toutes les entrées du jour avec la série actuelle
        $stmt = $pdo->prepare("
            UPDATE user_stats 
            SET streak_days = ? 
            WHERE user_id = ? AND date = CURDATE()
        ");
        $stmt->execute([$current_streak, $user_id]);
    } catch (Exception $e) {
        error_log("Erreur updateStreakDays: " . $e->getMessage());
        // En cas d'erreur, on continue sans mettre à jour les séries
    }
}
?> 