import Constants from "expo-constants";

const API_KEY =
  Constants.expoConfig?.extra?.hadithApiKey ||
  "demo-key"; // Clé de démo pour développement local

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

  const tryFetch = async (attempt: number): Promise<Hadith | null> => {
    if (attempt >= 10) return null;

    const randomBook = books[Math.floor(Math.random() * books.length)];
    if (!randomBook.bookSlug) return tryFetch(attempt + 1);

    const chaptersRes = await fetch(
      `https://hadithapi.com/api/${randomBook.bookSlug}/chapters?apiKey=${API_KEY}`
    );
    const chaptersJson = await chaptersRes.json();
    const chapters = chaptersJson.chapters || [];
    if (!chapters.length) return tryFetch(attempt + 1);

    const randomChapter = chapters[Math.floor(Math.random() * chapters.length)];
    if (!randomChapter.chapterNumber) return tryFetch(attempt + 1);

    const hadithsRes = await fetch(
      `https://hadithapi.com/api/hadiths?apiKey=${API_KEY}&book=${randomBook.bookSlug}&chapter=${randomChapter.chapterNumber}&page=1&limit=20`
    );
    const hadithsJson = await hadithsRes.json();
    const hadiths = (hadithsJson.hadiths && hadithsJson.hadiths.data) || [];
    if (!hadiths.length) return tryFetch(attempt + 1);

    const validHadiths = hadiths.filter((h: any) => {
      const ar = h.hadithArabic && h.hadithArabic.trim().length > 20;
      const en = h.hadithEnglish && h.hadithEnglish.trim().length > 20;
      return ar || en;
    });
    if (!validHadiths.length) return tryFetch(attempt + 1);
    const randomHadith =
      validHadiths[Math.floor(Math.random() * validHadiths.length)];
    if (!randomHadith) return tryFetch(attempt + 1);

    return {
      id: randomHadith.id,
      hadithNumber: randomHadith.hadithNumber,
      hadithEnglish: randomHadith.hadithEnglish,
      hadithArabic: randomHadith.hadithArabic,
      bookSlug: randomBook.bookSlug,
      chapterNumber: randomChapter.chapterNumber,
    };
  };

  return tryFetch(0);
}
