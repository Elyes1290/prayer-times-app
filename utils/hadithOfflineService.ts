import NetInfo from "@react-native-community/netinfo";

// Types pour les données offline
export interface OfflineBook {
  id: number;
  metadata: {
    id: number;
    length: number;
    arabic: {
      title: string;
      author: string;
      introduction: string;
    };
    english: {
      title: string;
      author: string;
      introduction: string;
    };
  };
  chapters: {
    id: number;
    bookId: number;
    arabic: string;
    english: string;
  }[];
  hadiths: {
    id: number;
    idInBook: number;
    chapterId: number;
    bookId: number;
    arabic: string;
    english: {
      narrator: string;
      text: string;
    };
  }[];
}

// Chargement paresseux par livre : évite d'inliner ~74 Mo de JSON dans le bundle
// JS principal (réduction majeure de la taille Android). Chaque livre n'est
// chargé qu'à l'ouverture ou lors d'une recherche qui le cible.
const BOOK_LOADERS: Record<string, () => Promise<{ default: OfflineBook }>> = {
  bukhari: () =>
    import("../assets/hadith-offline-data/bukhari.json") as Promise<{
      default: OfflineBook;
    }>,
  muslim: () =>
    import("../assets/hadith-offline-data/muslim.json") as Promise<{
      default: OfflineBook;
    }>,
  nasai: () =>
    import("../assets/hadith-offline-data/nasai.json") as Promise<{
      default: OfflineBook;
    }>,
  abudawud: () =>
    import("../assets/hadith-offline-data/abudawud.json") as Promise<{
      default: OfflineBook;
    }>,
  tirmidhi: () =>
    import("../assets/hadith-offline-data/tirmidhi.json") as Promise<{
      default: OfflineBook;
    }>,
  ibnmajah: () =>
    import("../assets/hadith-offline-data/ibnmajah.json") as Promise<{
      default: OfflineBook;
    }>,
  malik: () =>
    import("../assets/hadith-offline-data/malik.json") as Promise<{
      default: OfflineBook;
    }>,
  ahmed: () =>
    import("../assets/hadith-offline-data/ahmed.json") as Promise<{
      default: OfflineBook;
    }>,
  darimi: () =>
    import("../assets/hadith-offline-data/darimi.json") as Promise<{
      default: OfflineBook;
    }>,
  riyad_assalihin: () =>
    import(
      "../assets/hadith-offline-data/other-books/riyad_assalihin.json"
    ) as Promise<{ default: OfflineBook }>,
  mishkat_almasabih: () =>
    import(
      "../assets/hadith-offline-data/other-books/mishkat_almasabih.json"
    ) as Promise<{ default: OfflineBook }>,
  aladab_almufrad: () =>
    import(
      "../assets/hadith-offline-data/other-books/aladab_almufrad.json"
    ) as Promise<{ default: OfflineBook }>,
  shamail_muhammadiyah: () =>
    import(
      "../assets/hadith-offline-data/other-books/shamail_muhammadiyah.json"
    ) as Promise<{ default: OfflineBook }>,
  bulugh_almaram: () =>
    import(
      "../assets/hadith-offline-data/other-books/bulugh_almaram.json"
    ) as Promise<{ default: OfflineBook }>,
};

// Configuration des livres
const HADITH_BOOKS_CONFIG = {
  // Livres principaux (6 Sahih/Sunan)
  main: [
    { id: 1, slug: "bukhari", name: "Sahih al-Bukhari", file: "bukhari.json" },
    { id: 2, slug: "muslim", name: "Sahih Muslim", file: "muslim.json" },
    { id: 3, slug: "nasai", name: "Sunan al-Nasa'i", file: "nasai.json" },
    { id: 4, slug: "abudawud", name: "Sunan Abi Dawud", file: "abudawud.json" },
    {
      id: 5,
      slug: "tirmidhi",
      name: "Jami' al-Tirmidhi",
      file: "tirmidhi.json",
    },
    { id: 6, slug: "ibnmajah", name: "Sunan Ibn Majah", file: "ibnmajah.json" },
  ],
  // Livres complémentaires
  additional: [
    { id: 7, slug: "malik", name: "Muwatta Malik", file: "malik.json" },
    { id: 8, slug: "ahmed", name: "Musnad Ahmad", file: "ahmed.json" },
    { id: 9, slug: "darimi", name: "Sunan al-Darimi", file: "darimi.json" },
  ],
  // Livres spécialisés (other-books)
  specialized: [
    {
      id: 13,
      slug: "riyad_assalihin",
      name: "Riyad as-Salihin",
      file: "other-books/riyad_assalihin.json",
    },
    {
      id: 14,
      slug: "mishkat_almasabih",
      name: "Mishkat al-Masabih",
      file: "other-books/mishkat_almasabih.json",
    },
    {
      id: 15,
      slug: "aladab_almufrad",
      name: "Al-Adab Al-Mufrad",
      file: "other-books/aladab_almufrad.json",
    },
    {
      id: 16,
      slug: "shamail_muhammadiyah",
      name: "Shama'il Muhammadiyah",
      file: "other-books/shamail_muhammadiyah.json",
    },
    {
      id: 17,
      slug: "bulugh_almaram",
      name: "Bulugh al-Maram",
      file: "other-books/bulugh_almaram.json",
    },
  ],
};

// Cache pour les livres chargés
const bookCache = new Map<string, OfflineBook>();

export class HadithOfflineService {
  /**
   * Vérifie si l'utilisateur peut accéder aux hadiths offline
   */
  static async canAccessOffline(isPremium: boolean = false): Promise<boolean> {
    if (isPremium) {
      return true;
    }

    try {
      const netInfo = await NetInfo.fetch();
      return netInfo.isConnected ?? false;
    } catch (error) {
      console.error("❌ Erreur vérification accès offline:", error);
      return false;
    }
  }

  /**
   * Charge un livre à la demande (import dynamique + cache mémoire)
   */
  static async loadBook(bookSlug: string): Promise<OfflineBook | null> {
    try {
      if (bookCache.has(bookSlug)) {
        return bookCache.get(bookSlug)!;
      }

      const loader = BOOK_LOADERS[bookSlug];
      if (!loader) {
        console.error(`❌ Livre non trouvé: ${bookSlug}`);
        return null;
      }

      const module = await loader();
      const bookData = module.default as OfflineBook;

      bookCache.set(bookSlug, bookData);

      console.log(
        `✅ Livre chargé: ${bookData.metadata.english.title} (${bookData.hadiths.length} hadiths)`,
      );
      return bookData;
    } catch (error) {
      console.error(`❌ Erreur chargement livre ${bookSlug}:`, error);
      return null;
    }
  }

  /**
   * Récupère la liste de tous les livres disponibles
   */
  static getAllBooks() {
    return {
      main: HADITH_BOOKS_CONFIG.main,
      additional: HADITH_BOOKS_CONFIG.additional,
      specialized: HADITH_BOOKS_CONFIG.specialized,
    };
  }

  /**
   * Récupère les chapitres d'un livre
   */
  static async getChapters(bookSlug: string): Promise<
    | {
        id: number;
        bookId: number;
        arabic: string;
        english: string;
      }[]
    | null
  > {
    try {
      const book = await this.loadBook(bookSlug);
      return book?.chapters || null;
    } catch (error) {
      console.error(`❌ Erreur récupération chapitres ${bookSlug}:`, error);
      return null;
    }
  }

  /**
   * Récupère les hadiths d'un chapitre
   */
  static async getHadiths(
    bookSlug: string,
    chapterId: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    hadiths: {
      id: number;
      idInBook: number;
      chapterId: number;
      bookId: number;
      arabic: string;
      english: { narrator: string; text: string };
    }[];
    totalPages: number;
    currentPage: number;
  } | null> {
    try {
      const book = await this.loadBook(bookSlug);
      if (!book) return null;

      const chapterHadiths = book.hadiths.filter(
        (h) => h.chapterId === chapterId,
      );

      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedHadiths = chapterHadiths.slice(startIndex, endIndex);

      const totalPages = Math.ceil(chapterHadiths.length / limit);

      return {
        hadiths: paginatedHadiths,
        totalPages,
        currentPage: page,
      };
    } catch (error) {
      console.error(
        `❌ Erreur récupération hadiths ${bookSlug}/${chapterId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Recherche dans les hadiths
   */
  static async searchHadiths(
    query: string,
    bookSlug?: string,
  ): Promise<
    {
      hadith: any;
      bookName: string;
      bookSlug: string;
      chapterName: string;
    }[]
  > {
    try {
      const results: {
        hadith: any;
        bookName: string;
        bookSlug: string;
        chapterName: string;
      }[] = [];

      const allBooks = [
        ...HADITH_BOOKS_CONFIG.main,
        ...HADITH_BOOKS_CONFIG.additional,
        ...HADITH_BOOKS_CONFIG.specialized,
      ];

      const booksToSearch = bookSlug
        ? allBooks.filter((book) => book.slug === bookSlug)
        : allBooks;

      const loaded = await Promise.all(
        booksToSearch.map(async (bookConfig) => ({
          bookConfig,
          book: await this.loadBook(bookConfig.slug),
        })),
      );

      for (const { bookConfig, book } of loaded) {
        if (!book) continue;

        const matchingHadiths = book.hadiths.filter((hadith) => {
          const searchText =
            `${hadith.arabic} ${hadith.english.text} ${hadith.english.narrator}`.toLowerCase();
          return searchText.includes(query.toLowerCase());
        });

        const chapterById = new Map(
          book.chapters.map((chapter) => [chapter.id, chapter]),
        );

        for (const hadith of matchingHadiths) {
          const chapter = chapterById.get(hadith.chapterId);
          results.push({
            hadith,
            bookName: book.metadata.english.title,
            bookSlug: bookConfig.slug,
            chapterName: chapter?.english || `Chapitre ${hadith.chapterId}`,
          });
        }
      }

      return results;
    } catch (error) {
      console.error("❌ Erreur recherche hadiths:", error);
      return [];
    }
  }

  /**
   * Vide le cache
   */
  static clearCache() {
    bookCache.clear();
    console.log("🧹 Cache hadiths vidé");
  }
}
