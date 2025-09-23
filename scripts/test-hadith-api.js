#!/usr/bin/env node

/**
 * 🧪 SCRIPT DE TEST API HADITH - Prayer Times App
 * Teste l'API hadithapi.com avant l'extraction complète
 */

const API_KEY = "$2y$10$doCdBLfM0jONj1evceyDyuFQYeUBzyQsh9NL2sRIuT9wt8GKsXaa";
const BASE_URL = "https://hadithapi.com/api";

async function testAPI() {
  console.log("🧪 TEST DE L'API HADITH");
  console.log("=".repeat(40));
  console.log(`🔑 Clé API: ${API_KEY.substring(0, 8)}...`);
  console.log(`🌐 URL de base: ${BASE_URL}\n`);

  try {
    // 1. Tester la récupération des livres
    console.log("📚 Test 1: Récupération des livres...");
    const booksResponse = await fetch(`${BASE_URL}/books?apiKey=${API_KEY}`);
    const booksData = await booksResponse.json();

    if (!booksResponse.ok) {
      throw new Error(
        `HTTP ${booksResponse.status}: ${booksResponse.statusText}`
      );
    }

    const books = booksData.books || [];
    console.log(`✅ ${books.length} livres trouvés`);

    if (books.length > 0) {
      console.log("📖 Premiers livres:");
      books.slice(0, 5).forEach((book) => {
        console.log(`  - ${book.bookName} (${book.bookSlug})`);
      });
    }

    // 2. Tester un livre spécifique
    if (books.length > 0) {
      const testBook = books[0];
      console.log(`\n📖 Test 2: Chapitres du livre "${testBook.bookName}"...`);

      const chaptersResponse = await fetch(
        `${BASE_URL}/${testBook.bookSlug}/chapters?apiKey=${API_KEY}`
      );
      const chaptersData = await chaptersResponse.json();

      if (!chaptersResponse.ok) {
        throw new Error(
          `HTTP ${chaptersResponse.status}: ${chaptersResponse.statusText}`
        );
      }

      const chapters = chaptersData.chapters || [];
      console.log(`✅ ${chapters.length} chapitres trouvés`);

      if (chapters.length > 0) {
        console.log("📄 Premiers chapitres:");
        chapters.slice(0, 3).forEach((chapter) => {
          console.log(
            `  - Chapitre ${chapter.chapterNumber}: ${chapter.chapterEnglish}`
          );
        });
      }

      // 3. Tester un chapitre spécifique
      if (chapters.length > 0) {
        const testChapter = chapters[0];
        console.log(
          `\n📄 Test 3: Hadiths du chapitre ${testChapter.chapterNumber}...`
        );

        const hadithsResponse = await fetch(
          `${BASE_URL}/hadiths?apiKey=${API_KEY}&book=${testBook.bookSlug}&chapter=${testChapter.chapterNumber}&page=1&limit=5`
        );
        const hadithsData = await hadithsResponse.json();

        if (!hadithsResponse.ok) {
          throw new Error(
            `HTTP ${hadithsResponse.status}: ${hadithsResponse.statusText}`
          );
        }

        const hadiths = hadithsData.hadiths?.data || [];
        console.log(`✅ ${hadiths.length} hadiths trouvés`);

        if (hadiths.length > 0) {
          console.log("📝 Premier hadith:");
          const hadith = hadiths[0];
          console.log(`  - ID: ${hadith.id}`);
          console.log(`  - Numéro: ${hadith.hadithNumber}`);
          console.log(`  - Narrateur: ${hadith.narrator || "N/A"}`);
          console.log(
            `  - Arabe: ${
              hadith.hadithArabic
                ? hadith.hadithArabic.substring(0, 100) + "..."
                : "N/A"
            }`
          );
          console.log(
            `  - Anglais: ${
              hadith.hadithEnglish
                ? hadith.hadithEnglish.substring(0, 100) + "..."
                : "N/A"
            }`
          );
        }
      }
    }

    // 4. Tester les limites de l'API
    console.log("\n🔍 Test 4: Vérification des limites...");
    const rateLimitResponse = await fetch(
      `${BASE_URL}/books?apiKey=${API_KEY}`
    );
    const rateLimitHeaders = rateLimitResponse.headers;

    console.log("📊 Headers de réponse:");
    console.log(`  - Content-Type: ${rateLimitHeaders.get("content-type")}`);
    console.log(
      `  - X-RateLimit-Limit: ${
        rateLimitHeaders.get("x-ratelimit-limit") || "N/A"
      }`
    );
    console.log(
      `  - X-RateLimit-Remaining: ${
        rateLimitHeaders.get("x-ratelimit-remaining") || "N/A"
      }`
    );
    console.log(
      `  - X-RateLimit-Reset: ${
        rateLimitHeaders.get("x-ratelimit-reset") || "N/A"
      }`
    );

    console.log("\n✅ TOUS LES TESTS RÉUSSIS !");
    console.log("🚀 L'API est prête pour l'extraction complète.");
  } catch (error) {
    console.error("\n❌ ERREUR LORS DU TEST:");
    console.error(`   ${error.message}`);

    if (error.message.includes("401") || error.message.includes("403")) {
      console.error("\n💡 SOLUTION: Vérifiez votre clé API HADITH_API_KEY");
    } else if (error.message.includes("429")) {
      console.error(
        "\n💡 SOLUTION: Attendez avant de refaire des requêtes (rate limit)"
      );
    } else if (error.message.includes("500")) {
      console.error(
        "\n💡 SOLUTION: Problème côté serveur, réessayez plus tard"
      );
    }

    process.exit(1);
  }
}

// Lancer le test
testAPI().catch(console.error);
