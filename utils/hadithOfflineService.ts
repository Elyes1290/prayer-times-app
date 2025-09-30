import NetInfo from "@react-native-community/netinfo";

// Import statique de tous les fichiers JSON
import bukhariData from "../assets/hadith-offline-data/bukhari.json";
import muslimData from "../assets/hadith-offline-data/muslim.json";
import nasaiData from "../assets/hadith-offline-data/nasai.json";
import abudawudData from "../assets/hadith-offline-data/abudawud.json";
import tirmidhiData from "../assets/hadith-offline-data/tirmidhi.json";
import ibnmajahData from "../assets/hadith-offline-data/ibnmajah.json";
import malikData from "../assets/hadith-offline-data/malik.json";
import ahmedData from "../assets/hadith-offline-data/ahmed.json";
import darimiData from "../assets/hadith-offline-data/darimi.json";
import riyadAssalihinData from "../assets/hadith-offline-data/other-books/riyad_assalihin.json";
import mishkatAlmasabihData from "../assets/hadith-offline-data/other-books/mishkat_almasabih.json";
import aladabAlmufradData from "../assets/hadith-offline-data/other-books/aladab_almufrad.json";
import shamailMuhammadiyahData from "../assets/hadith-offline-data/other-books/shamail_muhammadiyah.json";
import bulughAlmaramData from "../assets/hadith-offline-data/other-books/bulugh_almaram.json";

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

// Configuration des livres
export const HADITH_BOOKS_CONFIG = {
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

// Mapping statique des données JSON
const BOOK_DATA_MAP: Record<string, OfflineBook> = {
  bukhari: bukhariData as OfflineBook,
  muslim: muslimData as OfflineBook,
  nasai: nasaiData as OfflineBook,
  abudawud: abudawudData as OfflineBook,
  tirmidhi: tirmidhiData as OfflineBook,
  ibnmajah: ibnmajahData as OfflineBook,
  malik: malikData as OfflineBook,
  ahmed: ahmedData as OfflineBook,
  darimi: darimiData as OfflineBook,
  riyad_assalihin: riyadAssalihinData as OfflineBook,
  mishkat_almasabih: mishkatAlmasabihData as OfflineBook,
  aladab_almufrad: aladabAlmufradData as OfflineBook,
  shamail_muhammadiyah: shamailMuhammadiyahData as OfflineBook,
  bulugh_almaram: bulughAlmaramData as OfflineBook,
};

// Cache pour les livres chargés
const bookCache = new Map<string, OfflineBook>();

export class HadithOfflineService {
  /**
   * Vérifie si l'utilisateur peut accéder aux hadiths offline
   */
  static async canAccessOffline(isPremium: boolean = false): Promise<boolean> {
    try {
      const netInfo = await NetInfo.fetch();

      // Si l'utilisateur est premium, il peut accéder offline
      if (isPremium) {
        return true;
      }

      // Si l'utilisateur n'est pas premium, il doit être connecté
      return netInfo.isConnected ?? false;
    } catch (error) {
      console.error("❌ Erreur vérification accès offline:", error);
      return false;
    }
  }

  /**
   * Charge un livre depuis les données statiques
   */
  static async loadBook(bookSlug: string): Promise<OfflineBook | null> {
    try {
      // Vérifier le cache
      if (bookCache.has(bookSlug)) {
        return bookCache.get(bookSlug)!;
      }

      // Récupérer les données depuis le mapping statique
      const bookData = BOOK_DATA_MAP[bookSlug];

      if (!bookData) {
        console.error(`❌ Livre non trouvé: ${bookSlug}`);
        return null;
      }

      // Mettre en cache
      bookCache.set(bookSlug, bookData);

      console.log(
        `✅ Livre chargé: ${bookData.metadata.english.title} (${bookData.hadiths.length} hadiths)`
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
    limit: number = 10
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

      // Filtrer les hadiths du chapitre
      const chapterHadiths = book.hadiths.filter(
        (h) => h.chapterId === chapterId
      );

      // Pagination
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
        error
      );
      return null;
    }
  }

  /**
   * Recherche dans les hadiths
   */
  static async searchHadiths(
    query: string,
    bookSlug?: string
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

      for (const bookConfig of booksToSearch) {
        const book = await this.loadBook(bookConfig.slug);
        if (!book) continue;

        // Rechercher dans les hadiths
        const matchingHadiths = book.hadiths.filter((hadith) => {
          const searchText =
            `${hadith.arabic} ${hadith.english.text} ${hadith.english.narrator}`.toLowerCase();
          return searchText.includes(query.toLowerCase());
        });

        // Ajouter les résultats avec les informations du chapitre
        for (const hadith of matchingHadiths) {
          const chapter = book.chapters.find((c) => c.id === hadith.chapterId);
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
