<?php
/**
 * API « Mon Ramadan » (premium) — synchronisation de la progression.
 *
 *   GET  /api/ramadan.php?hijri_year=1448   → progression enregistrée (ou null)
 *   POST /api/ramadan.php {hijri_year, data} → fusionne `data` avec l'existant et
 *                                              renvoie le résultat fusionné
 *
 * - Authentification Bearer obligatoire (requireAuthStrict) ; l'utilisateur est celui
 *   du token, jamais un identifiant fourni par le client.
 * - Réservé aux abonnés actifs / VIP (isUserPayingMember) : 403 `premium_required` sinon.
 * - La FUSION se fait ici, côté serveur : deux appareils qui synchronisent en même temps
 *   ne s'écrasent pas (pour chaque clé, la version au `updatedAt` le plus récent gagne).
 * - Confidentialité : le motif d'une dispense n'est jamais envoyé ni stocké ; seul le
 *   statut ("exempt") l'est. Toute donnée inconnue est ignorée (liste blanche).
 * - La table est créée à la première utilisation (CREATE TABLE IF NOT EXISTS).
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'config.php';

/** Taille maximale d'un document de progression (largement > un Ramadan complet). */
const RAMADAN_MAX_PAYLOAD_BYTES = 65536;
const RAMADAN_FAST_STATUSES = ['fasted', 'missed', 'exempt', 'none'];

function ramadanEnsureTable(PDO $pdo): void {
    // Cas courant : la table existe déjà → un simple SELECT (ne demande pas le droit CREATE).
    try {
        $pdo->query("SELECT 1 FROM ramadan_progress LIMIT 1");
        return;
    } catch (PDOException $e) {
        if ($e->getCode() !== '42S02') { // 42S02 = table inexistante
            throw $e;
        }
    }

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS ramadan_progress (
            user_id INT NOT NULL,
            hijri_year SMALLINT NOT NULL,
            data LONGTEXT NOT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, hijri_year)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
}

function ramadanIsDateKey($key): bool {
    return is_string($key) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $key) === 1;
}

function ramadanBoundedInt($value, int $min, int $max, int $fallback): int {
    if (!is_numeric($value)) {
        return $fallback;
    }
    return max($min, min($max, (int)round((float)$value)));
}

/**
 * Liste blanche : ne conserve que les champs connus, aux types et bornes valides.
 * Retourne toujours une structure complète.
 */
function ramadanNormalize($raw): array {
    $raw = is_array($raw) ? $raw : [];

    $fasting = [];
    if (isset($raw['fasting']) && is_array($raw['fasting'])) {
        foreach ($raw['fasting'] as $key => $entry) {
            if (!ramadanIsDateKey($key) || !is_array($entry)) continue;
            $status = $entry['status'] ?? null;
            if (!in_array($status, RAMADAN_FAST_STATUSES, true)) continue;
            $fasting[$key] = [
                'status' => $status,
                'updatedAt' => ramadanBoundedInt($entry['updatedAt'] ?? 0, 0, PHP_INT_MAX, 0),
            ];
        }
    }

    $qada = ['count' => 0, 'updatedAt' => 0];
    if (isset($raw['qadaDone']) && is_array($raw['qadaDone'])) {
        $qada = [
            'count' => ramadanBoundedInt($raw['qadaDone']['count'] ?? 0, 0, 366, 0),
            'updatedAt' => ramadanBoundedInt($raw['qadaDone']['updatedAt'] ?? 0, 0, PHP_INT_MAX, 0),
        ];
    }

    $plan = null;
    if (isset($raw['khatmPlan']) && is_array($raw['khatmPlan']) && ramadanIsDateKey($raw['khatmPlan']['startKey'] ?? null)) {
        $plan = [
            'goalKhatms' => ramadanBoundedInt($raw['khatmPlan']['goalKhatms'] ?? 1, 1, 3, 1),
            'days' => ramadanBoundedInt($raw['khatmPlan']['days'] ?? 30, 5, 30, 30),
            'startKey' => $raw['khatmPlan']['startKey'],
            'updatedAt' => ramadanBoundedInt($raw['khatmPlan']['updatedAt'] ?? 0, 0, PHP_INT_MAX, 0),
        ];
    }

    $planDeletedAt = ramadanBoundedInt($raw['khatmPlanDeletedAt'] ?? 0, 0, PHP_INT_MAX, 0);
    if ($plan !== null && $planDeletedAt > 0 && $planDeletedAt >= $plan['updatedAt']) {
        $plan = null;
    }

    $khatmLog = [];
    if (isset($raw['khatmLog']) && is_array($raw['khatmLog'])) {
        foreach ($raw['khatmLog'] as $key => $entry) {
            if (!ramadanIsDateKey($key) || !is_array($entry)) continue;
            $khatmLog[$key] = [
                'juz' => ramadanBoundedInt($entry['juz'] ?? 0, 0, 90, 0),
                'updatedAt' => ramadanBoundedInt($entry['updatedAt'] ?? 0, 0, PHP_INT_MAX, 0),
            ];
        }
    }

    return [
        'version' => 1,
        'hijriYear' => ramadanBoundedInt($raw['hijriYear'] ?? 0, 0, 3000, 0),
        'fasting' => $fasting,
        'qadaDone' => $qada,
        'khatmPlan' => $plan,
        'khatmPlanDeletedAt' => $planDeletedAt,
        'khatmLog' => $khatmLog,
        'tarawih' => ramadanNormalizeDayFlags($raw['tarawih'] ?? null),
        'sadaqa' => ramadanNormalizeDayFlags($raw['sadaqa'] ?? null),
    ];
}

/** Cases cochées par date : { "2027-02-08": { done: bool, updatedAt: int } }. */
function ramadanNormalizeDayFlags($raw): array {
    $flags = [];
    if (!is_array($raw)) {
        return $flags;
    }
    foreach ($raw as $key => $entry) {
        if (!ramadanIsDateKey($key) || !is_array($entry) || !isset($entry['done']) || !is_bool($entry['done'])) continue;
        $flags[$key] = [
            'done' => $entry['done'],
            'updatedAt' => ramadanBoundedInt($entry['updatedAt'] ?? 0, 0, PHP_INT_MAX, 0),
        ];
    }
    return $flags;
}

/** Pour chaque clé, garde l'entrée au `updatedAt` le plus récent. */
function ramadanMergeTimestamped(array $a, array $b): array {
    $merged = $a;
    foreach ($b as $key => $value) {
        if (!isset($merged[$key]) || $value['updatedAt'] > $merged[$key]['updatedAt']) {
            $merged[$key] = $value;
        }
    }
    return $merged;
}

/** Même sémantique que mergeRamadanData (utils/ramadan/storage.ts). */
function ramadanMerge(array $local, array $remote): array {
    $deletedAt = max($local['khatmPlanDeletedAt'], $remote['khatmPlanDeletedAt']);

    $plan = null;
    foreach ([$local['khatmPlan'], $remote['khatmPlan']] as $candidate) {
        if ($candidate !== null && ($plan === null || $candidate['updatedAt'] > $plan['updatedAt'])) {
            $plan = $candidate;
        }
    }
    if ($plan !== null && $deletedAt > 0 && $deletedAt >= $plan['updatedAt']) {
        $plan = null;
    }

    $qada = $remote['qadaDone']['updatedAt'] > $local['qadaDone']['updatedAt']
        ? $remote['qadaDone']
        : $local['qadaDone'];

    // Les entrées antérieures à la création du plan appartiennent à un ancien plan.
    $khatmLog = [];
    if ($plan !== null) {
        $khatmLog = array_filter(
            ramadanMergeTimestamped($local['khatmLog'], $remote['khatmLog']),
            static function ($entry) use ($plan) {
                return $entry['updatedAt'] >= $plan['updatedAt'];
            }
        );
    }

    return [
        'version' => 1,
        'hijriYear' => $local['hijriYear'] ?: $remote['hijriYear'],
        'fasting' => ramadanMergeTimestamped($local['fasting'], $remote['fasting']),
        'qadaDone' => $qada,
        'khatmPlan' => $plan,
        'khatmPlanDeletedAt' => $deletedAt,
        'khatmLog' => $khatmLog,
        'tarawih' => ramadanMergeTimestamped($local['tarawih'], $remote['tarawih']),
        'sadaqa' => ramadanMergeTimestamped($local['sadaqa'], $remote['sadaqa']),
    ];
}

/** Les tableaux PHP vides s'encodent en [] : on force {} pour les dictionnaires. */
function ramadanForJson(array $data): array {
    $data['fasting'] = (object)$data['fasting'];
    $data['khatmLog'] = (object)$data['khatmLog'];
    $data['tarawih'] = (object)$data['tarawih'];
    $data['sadaqa'] = (object)$data['sadaqa'];
    return $data;
}

function ramadanReadStored(PDO $pdo, int $userId, int $hijriYear): ?array {
    $stmt = $pdo->prepare("SELECT data FROM ramadan_progress WHERE user_id = ? AND hijri_year = ? LIMIT 1");
    $stmt->execute([$userId, $hijriYear]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        return null;
    }
    $decoded = json_decode($row['data'], true);
    return is_array($decoded) ? ramadanNormalize($decoded) : null;
}

try {
    $auth = requireAuthStrict();
    $userId = (int)$auth['user_id'];

    if (!isUserPayingMember($userId)) {
        handleError('Fonctionnalité réservée aux abonnés Premium', 403, null, ['reason' => 'premium_required']);
    }

    $hijriYear = ramadanBoundedInt($_GET['hijri_year'] ?? 0, 0, 3000, 0);
    $input = null;

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = getRequestData();
        $hijriYear = ramadanBoundedInt($input['hijri_year'] ?? 0, 0, 3000, 0);
    }

    if ($hijriYear < 1400 || $hijriYear > 1600) {
        handleError('hijri_year invalide', 400);
    }

    $pdo = getDBConnection();
    ramadanEnsureTable($pdo);

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stored = ramadanReadStored($pdo, $userId, $hijriYear);
        jsonResponse(true, [
            'hijri_year' => $hijriYear,
            'data' => $stored !== null ? ramadanForJson($stored) : null,
        ], 'OK');
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $payloadSize = strlen(json_encode($input['data'] ?? null));
        if ($payloadSize > RAMADAN_MAX_PAYLOAD_BYTES) {
            handleError('Données trop volumineuses', 413);
        }

        $incoming = ramadanNormalize($input['data'] ?? null);
        $incoming['hijriYear'] = $hijriYear;

        // Lecture + écriture dans une transaction avec verrou : deux synchronisations
        // simultanées s'appliquent l'une après l'autre au lieu de se perdre.
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("SELECT data FROM ramadan_progress WHERE user_id = ? AND hijri_year = ? FOR UPDATE");
            $stmt->execute([$userId, $hijriYear]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $existing = $row ? json_decode($row['data'], true) : null;

            $merged = is_array($existing)
                ? ramadanMerge(ramadanNormalize($existing), $incoming)
                : $incoming;
            $merged['hijriYear'] = $hijriYear;

            $save = $pdo->prepare("
                INSERT INTO ramadan_progress (user_id, hijri_year, data)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE data = VALUES(data)
            ");
            $save->execute([$userId, $hijriYear, json_encode(ramadanForJson($merged), JSON_UNESCAPED_UNICODE)]);

            $pdo->commit();
        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }

        jsonResponse(true, [
            'hijri_year' => $hijriYear,
            'data' => ramadanForJson($merged),
        ], 'Progression synchronisée');
    }

    handleError('Méthode non supportée', 405);
} catch (ServiceUnavailableException $e) {
    error_log('RAMADAN API UNAVAILABLE: ' . $e->getMessage());
    respondServiceUnavailable();
} catch (PDOException $e) {
    error_log('RAMADAN API DB ERROR: ' . $e->getMessage());
    respondServiceUnavailable();
} catch (Exception $e) {
    error_log('RAMADAN API ERROR: ' . $e->getMessage());
    handleError('Erreur dans l\'API Ramadan', 500);
}
