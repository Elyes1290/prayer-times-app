<?php
/**
 * API Gestion des Favoris - Prayer Times App
 * Support des 4 types: quran_verse, hadith, dhikr, asmaul_husna
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'config.php';

try {
    $pdo = getDBConnection();
    // Pas besoin de setAttribute car déjà configuré dans getDBConnection()

    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? '';

    if ($method === 'GET') {
        // Récupérer les favoris
        $user_id = $_GET['user_id'] ?? '';
        $type = $_GET['type'] ?? '';

        if (empty($user_id)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'user_id requis']);
            exit;
        }

        // Vérifier que l'utilisateur existe
        $stmt = $pdo->prepare("SELECT id FROM users WHERE id = ? AND status = 'active'");
        $stmt->execute([$user_id]);
        $user = $stmt->fetch();

        if (!$user) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Utilisateur non trouvé']);
            exit;
        }

        // Construire la requête
        $sql = "SELECT * FROM favorites WHERE user_id = ?";
        $params = [$user_id];

        if (!empty($type)) {
            $sql .= " AND type = ?";
            $params[] = $type;
        }

        $sql .= " ORDER BY date_added DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $favorites = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'data' => $favorites,
            'count' => count($favorites)
        ]);

    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if ($action === 'sync') {
            // 🚀 NOUVEAU : Synchronisation des favoris
            $user_id = $input['user_id'] ?? '';
            $favorites = $input['favorites'] ?? [];

            if (empty($user_id)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'user_id requis']);
                exit;
            }

            // Vérifier que l'utilisateur existe
            $stmt = $pdo->prepare("SELECT id FROM users WHERE id = ? AND status = 'active'");
            $stmt->execute([$user_id]);
            $user = $stmt->fetch();

            if (!$user) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Utilisateur non trouvé']);
                exit;
            }

            // Supprimer les anciens favoris
            $stmt = $pdo->prepare("DELETE FROM favorites WHERE user_id = ?");
            $stmt->execute([$user_id]);

            // Insérer les nouveaux favoris
            $inserted = 0;
            foreach ($favorites as $favorite) {
                try {
                    $stmt = $pdo->prepare("
                        INSERT INTO favorites (
                            user_id, favorite_id, type, chapter_number, verse_number, 
                            chapter_name, juz, page, hadith_number, book_slug, book_name, 
                            narrator, grade, dhikr_category, source, benefits, 
                            asmaul_husna_number, usage, arabic_text, translation, 
                            transliteration, note, date_added, access_count
                        ) VALUES (
                            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                        )
                    ");

                    $stmt->execute([
                        $user_id,
                        $favorite['id'] ?? '',
                        $favorite['type'] ?? '',
                        $favorite['chapterNumber'] ?? null,
                        $favorite['verseNumber'] ?? null,
                        $favorite['chapterName'] ?? null,
                        $favorite['juz'] ?? null,
                        $favorite['page'] ?? null,
                        $favorite['hadithNumber'] ?? null,
                        $favorite['bookSlug'] ?? null,
                        $favorite['bookName'] ?? null,
                        $favorite['narrator'] ?? null,
                        $favorite['grade'] ?? null,
                        $favorite['category'] ?? null,
                        $favorite['source'] ?? null,
                        $favorite['benefits'] ?? null,
                        $favorite['number'] ?? null,
                        $favorite['usage'] ?? null,
                        $favorite['arabicText'] ?? '',
                        $favorite['translation'] ?? '',
                        $favorite['transliteration'] ?? null,
                        $favorite['note'] ?? null,
                        $favorite['dateAdded'] ?? date('Y-m-d H:i:s'),
                        $favorite['accessCount'] ?? 0
                    ]);
                    $inserted++;
                } catch (Exception $e) {
                    error_log("Erreur insertion favori: " . $e->getMessage());
                }
            }

            echo json_encode([
                'success' => true,
                'message' => "$inserted favoris synchronisés",
                'inserted' => $inserted
            ]);

        } else {
            // Ajouter un favori individuel
            $user_id = $input['user_id'] ?? '';
            $type = $input['type'] ?? '';
            $content = $input['content'] ?? [];

            if (empty($user_id) || empty($type)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'user_id et type requis']);
                exit;
            }

            // Vérifier que l'utilisateur existe
            $stmt = $pdo->prepare("SELECT id FROM users WHERE id = ? AND status = 'active'");
            $stmt->execute([$user_id]);
            $user = $stmt->fetch();

            if (!$user) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Utilisateur non trouvé']);
                exit;
            }

            // Insérer le favori
            $stmt = $pdo->prepare("
                INSERT INTO favorites (
                    user_id, favorite_id, type, chapter_number, verse_number, 
                    chapter_name, juz, page, hadith_number, book_slug, book_name, 
                    narrator, grade, dhikr_category, source, benefits, 
                    asmaul_husna_number, usage, arabic_text, translation, 
                    transliteration, note, date_added, access_count
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                )
            ");

            $stmt->execute([
                $user_id,
                $content['id'] ?? '',
                $type,
                $content['chapterNumber'] ?? null,
                $content['verseNumber'] ?? null,
                $content['chapterName'] ?? null,
                $content['juz'] ?? null,
                $content['page'] ?? null,
                $content['hadithNumber'] ?? null,
                $content['bookSlug'] ?? null,
                $content['bookName'] ?? null,
                $content['narrator'] ?? null,
                $content['grade'] ?? null,
                $content['category'] ?? null,
                $content['source'] ?? null,
                $content['benefits'] ?? null,
                $content['number'] ?? null,
                $content['usage'] ?? null,
                $content['arabicText'] ?? '',
                $content['translation'] ?? '',
                $content['transliteration'] ?? null,
                $content['note'] ?? null,
                date('Y-m-d H:i:s'),
                0
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'Favori ajouté avec succès',
                'id' => $pdo->lastInsertId()
            ]);
        }

    } elseif ($method === 'DELETE') {
        $favorite_id = $_GET['id'] ?? '';
        $user_id = $_GET['user_id'] ?? '';
        
        if (empty($favorite_id) || empty($user_id)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'id et user_id requis']);
            exit();
        }
        
        // Vérifier que l'utilisateur existe
        $stmt = $pdo->prepare("SELECT id FROM users WHERE id = ?");
        $stmt->execute([$user_id]);
        $user = $stmt->fetch();

        if (!$user) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Utilisateur non trouvé']);
            exit;
        }

        // Supprimer le favori
        $stmt = $pdo->prepare("DELETE FROM favorites WHERE id = ? AND user_id = ?");
        $stmt->execute([$favorite_id, $user_id]);

        if ($stmt->rowCount() > 0) {
            echo json_encode([
                'success' => true,
                'message' => 'Favori supprimé avec succès'
            ]);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Favori non trouvé']);
        }
    }

} catch (Exception $e) {
    error_log("Erreur favorites.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erreur serveur',
        'error' => $e->getMessage()
    ]);
}
?> 