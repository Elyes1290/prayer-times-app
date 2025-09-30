#!/usr/bin/env node

/**
 * 📚 SCRIPT D'EXTRACTION DES HADITHS - Prayer Times App
 * Extrait tous les hadiths de l'API hadithapi.com et les structure pour le mode hors ligne
 * Structure similaire au Coran avec support multilingue futur
 */

const fs = require("fs");
const path = require("path");

// Configuration
const API_KEY = "$2y$10$doCdBLfM0jONj1evceyDyuFQYeUBzyQsh9NL2sRIuT9wt8GKsXaa";
const BASE_URL = "https://hadithapi.com/api";
const OUTPUT_DIR = path.join(__dirname, "..", "assets", "hadith-offline-data");
const DELAY_BETWEEN_REQUESTS = 1000; // 1 seconde entre les requêtes pour éviter le rate limiting

// Livres indisponibles (comme dans l'app)
const UNAVAILABLE_BOOKS = ["musnad-ahmad", "al-silsila-sahiha"];

// Langues supportées (structure pour futures traductions)
const SUPPORTED_LANGUAGES = [
  "ar",
  "en",
  "fr",
  "es",
  "it",
  "ru",
  "tr",
  "de",
  "pt",
  "nl",
  "ur",
  "bn",
  "fa",
  "id",
  "ms",
];

// Statistiques d'extraction
let extractionStats = {
  totalBooks: 0,
  totalChapters: 0,
  totalHadiths: 0,
  successfulBooks: 0,
  failedBooks: 0,
  startTime: new Date(),
  errors: [],
};

/**
 * Attendre un délai
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Faire une requête HTTP avec gestion d'erreur
 */
async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.log(
        `⚠️  Tentative ${i + 1}/${retries} échouée pour ${url}: ${
          error.message
        }`
      );
      if (i === retries - 1) throw error;
      await delay(2000 * (i + 1)); // Délai progressif
    }
  }
}

/**
 * Récupérer la liste des livres
 */
async function fetchBooks() {
  console.log("📚 Récupération de la liste des livres...");
  const data = await fetchWithRetry(`${BASE_URL}/books?apiKey=${API_KEY}`);
  let books = data.books || [];

  // Filtrer les livres indisponibles
  books = books.filter((book) => !UNAVAILABLE_BOOKS.includes(book.bookSlug));

  console.log(
    `✅ ${books.length} livres trouvés (${UNAVAILABLE_BOOKS.length} filtrés)`
  );
  return books;
}

/**
 * Récupérer les chapitres d'un livre
 */
async function fetchChapters(bookSlug) {
  console.log(`📖 Récupération des chapitres pour ${bookSlug}...`);
  const data = await fetchWithRetry(
    `${BASE_URL}/${bookSlug}/chapters?apiKey=${API_KEY}`
  );
  return data.chapters || [];
}

/**
 * Récupérer tous les hadiths d'un chapitre
 */
async function fetchAllHadithsFromChapter(bookSlug, chapterNumber) {
  console.log(`  📄 Récupération des hadiths du chapitre ${chapterNumber}...`);
  let allHadiths = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const data = await fetchWithRetry(
        `${BASE_URL}/hadiths?apiKey=${API_KEY}&book=${bookSlug}&chapter=${chapterNumber}&page=${page}&limit=50`
      );

      const hadiths = data.hadiths?.data || [];
      if (hadiths.length === 0) {
        hasMore = false;
      } else {
        allHadiths = allHadiths.concat(hadiths);
        page++;
        await delay(DELAY_BETWEEN_REQUESTS);
      }
    } catch (error) {
      console.log(`    ⚠️  Erreur page ${page}: ${error.message}`);
      hasMore = false;
    }
  }

  console.log(
    `    ✅ ${allHadiths.length} hadiths récupérés du chapitre ${chapterNumber}`
  );
  return allHadiths;
}

/**
 * Structurer un hadith pour le stockage hors ligne
 */
function structureHadith(hadith, bookSlug, bookName, chapterNumber) {
  return {
    id: hadith.id,
    hadith_number: hadith.hadithNumber,
    chapter_number: chapterNumber,
    book_slug: bookSlug,
    book_name: bookName,
    narrator: hadith.narrator || "",
    arabic_text: hadith.hadithArabic || "",
    phonetic_text: hadith.hadithArabic
      ? generatePhonetic(hadith.hadithArabic)
      : "",
    translations: {
      // Seulement anglais et arabe pour le moment
      ar: hadith.hadithArabic || "",
      en: hadith.hadithEnglish || "",
      // Champs vides pour les futures traductions
      fr: "",
      es: "",
      it: "",
      ru: "",
      tr: "",
      de: "",
      pt: "",
      nl: "",
      ur: "",
      bn: "",
      fa: "",
      id: "",
      ms: "",
    },
    metadata: {
      extracted_at: new Date().toISOString(),
      source: "hadithapi.com",
      quality_score: calculateQualityScore(hadith),
    },
  };
}

/**
 * Générer un texte phonétique basique (placeholder)
 */
function generatePhonetic(arabicText) {
  // Placeholder - vous pourriez intégrer une vraie translittération ici
  return arabicText.replace(/[^\u0600-\u06FF\s]/g, "");
}

/**
 * Calculer un score de qualité pour le hadith
 */
function calculateQualityScore(hadith) {
  let score = 0;

  // Texte arabe présent et assez long
  if (hadith.hadithArabic && hadith.hadithArabic.trim().length > 20) {
    score += 40;
  }

  // Texte anglais présent et assez long
  if (hadith.hadithEnglish && hadith.hadithEnglish.trim().length > 20) {
    score += 40;
  }

  // Narrateur présent
  if (hadith.narrator && hadith.narrator.trim().length > 0) {
    score += 20;
  }

  return Math.min(score, 100);
}

/**
 * Extraire tous les hadiths d'un livre
 */
async function extractBookHadiths(book) {
  console.log(`\n📚 Extraction du livre: ${book.bookName} (${book.bookSlug})`);

  try {
    // Récupérer les chapitres
    const chapters = await fetchChapters(book.bookSlug);
    extractionStats.totalChapters += chapters.length;

    if (chapters.length === 0) {
      console.log(`⚠️  Aucun chapitre trouvé pour ${book.bookName}`);
      return null;
    }

    const bookData = {
      book_slug: book.bookSlug,
      book_name: book.bookName,
      book_id: book.id,
      total_chapters: chapters.length,
      total_hadiths: 0,
      chapters: [],
      extracted_at: new Date().toISOString(),
      metadata: {
        source: "hadithapi.com",
        api_key_used: API_KEY.substring(0, 8) + "...",
        extraction_version: "1.0.0",
      },
    };

    // Extraire chaque chapitre
    for (const chapter of chapters) {
      try {
        const hadiths = await fetchAllHadithsFromChapter(
          book.bookSlug,
          chapter.chapterNumber
        );

        const structuredHadiths = hadiths.map((hadith) =>
          structureHadith(
            hadith,
            book.bookSlug,
            book.bookName,
            chapter.chapterNumber
          )
        );

        bookData.chapters.push({
          chapter_number: chapter.chapterNumber,
          chapter_english: chapter.chapterEnglish,
          chapter_arabic: chapter.chapterArabic || "",
          total_hadiths: structuredHadiths.length,
          hadiths: structuredHadiths,
        });

        bookData.total_hadiths += structuredHadiths.length;
        extractionStats.totalHadiths += structuredHadiths.length;

        await delay(DELAY_BETWEEN_REQUESTS);
      } catch (error) {
        console.log(
          `  ❌ Erreur chapitre ${chapter.chapterNumber}: ${error.message}`
        );
        extractionStats.errors.push({
          book: book.bookSlug,
          chapter: chapter.chapterNumber,
          error: error.message,
        });
      }
    }

    // Sauvegarder le livre
    const filename = `book_${book.bookSlug}.json`;
    const filepath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(bookData, null, 2), "utf8");

    console.log(
      `✅ Livre ${book.bookName} sauvegardé: ${bookData.total_hadiths} hadiths`
    );
    extractionStats.successfulBooks++;

    return bookData;
  } catch (error) {
    console.log(
      `❌ Erreur extraction livre ${book.bookName}: ${error.message}`
    );
    extractionStats.failedBooks++;
    extractionStats.errors.push({
      book: book.bookSlug,
      error: error.message,
    });
    return null;
  }
}

/**
 * Créer l'index des hadiths
 */
function createHadithIndex(books) {
  console.log("\n📋 Création de l'index des hadiths...");

  const index = {
    metadata: {
      total_books: books.length,
      total_hadiths: extractionStats.totalHadiths,
      total_chapters: extractionStats.totalChapters,
      languages: SUPPORTED_LANGUAGES,
      extracted_at: new Date().toISOString(),
      api_source: "hadithapi.com",
      version: "1.0.0",
      extraction_stats: {
        successful_books: extractionStats.successfulBooks,
        failed_books: extractionStats.failedBooks,
        total_errors: extractionStats.errors.length,
        extraction_duration:
          Math.round((new Date() - extractionStats.startTime) / 1000) + "s",
      },
    },
    books: books.map((book) => ({
      book_slug: book.bookSlug,
      book_name: book.bookName,
      book_id: book.id,
      total_chapters: book.total_chapters || 0,
      total_hadiths: book.total_hadiths || 0,
      available_translations: ["ar", "en"], // Seulement pour le moment
      filename: `book_${book.bookSlug}.json`,
    })),
  };

  const indexPath = path.join(OUTPUT_DIR, "hadith_index.json");
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), "utf8");

  console.log(`✅ Index créé: ${indexPath}`);
  return index;
}

/**
 * Fonction principale
 */
async function main() {
  console.log("🚀 DÉMARRAGE DE L'EXTRACTION DES HADITHS");
  console.log(`📁 Répertoire de sortie: ${OUTPUT_DIR}`);
  console.log(`🔑 Clé API: ${API_KEY.substring(0, 8)}...`);
  console.log(`⏱️  Délai entre requêtes: ${DELAY_BETWEEN_REQUESTS}ms\n`);

  // Créer le répertoire de sortie
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  try {
    // 1. Récupérer la liste des livres
    const books = await fetchBooks();
    extractionStats.totalBooks = books.length;

    // 2. Extraire chaque livre
    const extractedBooks = [];
    for (let i = 0; i < books.length; i++) {
      const book = books[i];
      console.log(
        `\n📚 [${i + 1}/${books.length}] Extraction: ${book.bookName}`
      );

      const bookData = await extractBookHadiths(book);
      if (bookData) {
        extractedBooks.push(bookData);
      }

      // Délai entre les livres
      if (i < books.length - 1) {
        await delay(DELAY_BETWEEN_REQUESTS * 2);
      }
    }

    // 3. Créer l'index
    createHadithIndex(extractedBooks);

    // 4. Afficher les statistiques finales
    console.log("\n🎉 EXTRACTION TERMINÉE !");
    console.log("=".repeat(50));
    console.log(
      `📚 Livres traités: ${extractionStats.successfulBooks}/${extractionStats.totalBooks}`
    );
    console.log(`📄 Chapitres: ${extractionStats.totalChapters}`);
    console.log(`📝 Hadiths: ${extractionStats.totalHadiths}`);
    console.log(
      `⏱️  Durée: ${Math.round(
        (new Date() - extractionStats.startTime) / 1000
      )}s`
    );
    console.log(`❌ Erreurs: ${extractionStats.errors.length}`);

    if (extractionStats.errors.length > 0) {
      console.log("\n⚠️  ERREURS:");
      extractionStats.errors.forEach((error) => {
        console.log(`  - ${error.book}: ${error.error}`);
      });
    }

    console.log(`\n📁 Fichiers sauvegardés dans: ${OUTPUT_DIR}`);
  } catch (error) {
    console.error("❌ ERREUR CRITIQUE:", error.message);
    process.exit(1);
  }
}

// Vérifier la clé API
if (API_KEY === "demo-key") {
  console.log(
    "⚠️  ATTENTION: Utilisation de la clé de démo. Les données peuvent être limitées."
  );
  console.log(
    "   Pour une extraction complète, définissez HADITH_API_KEY dans votre environnement."
  );
}

// Lancer l'extraction
main().catch(console.error);
