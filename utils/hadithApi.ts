const API_KEY = "$2y$10$doCdBLfM0jONj1evceyDyuFQYeUBzyQsh9NL2sRIuT9wt8GKsXaa";

export type Hadith = {
  id: number;
  hadithNumber: string | number;
  hadithEnglish: string;
  hadithArabic?: string;
  bookSlug?: string;
  chapterNumber?: string;
};

const unavailableBooks = ["musnad-ahmad", "al-silsila-sahiha"];

export async function getRandomHadith(): Promise<Hadith | null> {
  // 1. Récupérer la liste des livres
  const booksRes = await fetch(
    `https://hadithapi.com/api/books?apiKey=${API_KEY}`
  );
  const booksJson = await booksRes.json();
  let books = booksJson.books || [];
  // Filtrer les unavailableBooks
  books = books.filter((b: any) => !unavailableBooks.includes(b.bookSlug));
  if (!books.length) return null;

  // Essayer jusqu'à 10 fois de trouver un hadith valide
  for (let attempt = 0; attempt < 10; attempt++) {
    const randomBook = books[Math.floor(Math.random() * books.length)];
    if (!randomBook.bookSlug) continue;

    // 3. Récupérer les chapitres de ce livre
    const chaptersRes = await fetch(
      `https://hadithapi.com/api/${randomBook.bookSlug}/chapters?apiKey=${API_KEY}`
    );
    const chaptersJson = await chaptersRes.json();
    const chapters = chaptersJson.chapters || [];
    if (!chapters.length) continue;

    // 4. Sélectionner un chapitre aléatoire
    const randomChapter = chapters[Math.floor(Math.random() * chapters.length)];
    if (!randomChapter.chapterNumber) continue;

    // 5. Récupérer les hadiths de ce chapitre
    const hadithsRes = await fetch(
      `https://hadithapi.com/api/hadiths?apiKey=${API_KEY}&book=${randomBook.bookSlug}&chapter=${randomChapter.chapterNumber}&page=1&limit=20`
    );
    const hadithsJson = await hadithsRes.json();
    const hadiths = (hadithsJson.hadiths && hadithsJson.hadiths.data) || [];
    if (!hadiths.length) continue;

    // 6. Sélectionner un hadith aléatoire qui a un texte non vide et assez long
    const validHadiths = hadiths.filter((h: any) => {
      const ar = h.hadithArabic && h.hadithArabic.trim().length > 20;
      const en = h.hadithEnglish && h.hadithEnglish.trim().length > 20;
      return ar || en;
    });
    if (!validHadiths.length) continue;
    const randomHadith =
      validHadiths[Math.floor(Math.random() * validHadiths.length)];
    if (!randomHadith) continue;

    // 7. Retourner le hadith avec infos utiles
    return {
      id: randomHadith.id,
      hadithNumber: randomHadith.hadithNumber,
      hadithEnglish: randomHadith.hadithEnglish,
      hadithArabic: randomHadith.hadithArabic,
      bookSlug: randomBook.bookSlug,
      chapterNumber: randomChapter.chapterNumber,
    };
  }
  // Si aucun hadith trouvé après plusieurs essais
  return null;
}
