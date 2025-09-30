// import AsyncStorage from "@react-native-async-storage/async-storage";

export interface QuranVerse {
  verse_number: number;
  verse_key: string;
  arabic_text: string;
  phonetic_text: string;
  translations: {
    [language: string]: string;
  };
}

export interface QuranSurah {
  surah_number: number;
  verse_count: number;
  available_translations: string[];
}

export interface QuranIndex {
  metadata: {
    total_surahs: number;
    languages: string[];
    extracted_at: string;
    api_source: string;
    version: string;
    extraction_stats: {
      successful: number;
      failed: number;
      total_verses: number;
    };
  };
  surahs: QuranSurah[];
}

export interface QuranSurahData {
  surah_number: number;
  extracted_at: string;
  verses: QuranVerse[];
}

/**
 * 🕌 Service de gestion du Coran en mode offline
 * Utilise les données pré-téléchargées dans assets/quran-offline-data/
 */
class QuranOfflineService {
  private static instance: QuranOfflineService;
  private cache = new Map<string, any>();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 heures

  private constructor() {}

  public static getInstance(): QuranOfflineService {
    if (!QuranOfflineService.instance) {
      QuranOfflineService.instance = new QuranOfflineService();
    }
    return QuranOfflineService.instance;
  }

  /**
   * 📋 Charger l'index des sourates
   */
  async getQuranIndex(): Promise<QuranIndex | null> {
    const cacheKey = "quran_index";

    // Vérifier le cache mémoire
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // Charger depuis les assets avec import dynamique
      const indexModule = await import(
        "../assets/quran-offline-data/quran_index.json"
      );
      const quranIndex =
        (indexModule as any).default || (indexModule as QuranIndex);

      // Mettre en cache
      this.cache.set(cacheKey, quranIndex);

      console.log(
        `✅ [QuranOffline] Index chargé: ${quranIndex.metadata.total_surahs} sourates`
      );
      return quranIndex;
    } catch (error) {
      console.error("❌ [QuranOffline] Erreur chargement index:", error);
      return null;
    }
  }

  /**
   * 📖 Charger une sourate complète avec traductions
   */
  async getSurah(surahNumber: number): Promise<QuranSurahData | null> {
    const cacheKey = `surah_${surahNumber}`;

    // Vérifier le cache mémoire
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // Charger depuis les assets avec mapping statique
      const surahData = await this.loadSurahData(surahNumber);

      if (surahData) {
        // Mettre en cache
        this.cache.set(cacheKey, surahData);

        console.log(
          `✅ [QuranOffline] Sourate ${surahNumber} chargée: ${surahData.verses.length} versets`
        );
        return surahData;
      }
      return null;
    } catch (error) {
      console.error(
        `❌ [QuranOffline] Erreur chargement sourate ${surahNumber}:`,
        error
      );
      return null;
    }
  }

  /**
   * 📚 Charger les données d'une sourate avec mapping statique
   */
  private async loadSurahData(
    surahNumber: number
  ): Promise<QuranSurahData | null> {
    try {
      console.log(
        `🔍 [QuranOffline] Tentative de chargement sourate ${surahNumber}...`
      );

      // Mapping statique pour éviter les require dynamiques
      const surahMappings: { [key: number]: () => Promise<QuranSurahData> } = {
        1: () => import("../assets/quran-offline-data/surah_001.json"),
        2: () => import("../assets/quran-offline-data/surah_002.json"),
        3: () => import("../assets/quran-offline-data/surah_003.json"),
        4: () => import("../assets/quran-offline-data/surah_004.json"),
        5: () => import("../assets/quran-offline-data/surah_005.json"),
        6: () => import("../assets/quran-offline-data/surah_006.json"),
        7: () => import("../assets/quran-offline-data/surah_007.json"),
        8: () => import("../assets/quran-offline-data/surah_008.json"),
        9: () => import("../assets/quran-offline-data/surah_009.json"),
        10: () => import("../assets/quran-offline-data/surah_010.json"),
        11: () => import("../assets/quran-offline-data/surah_011.json"),
        12: () => import("../assets/quran-offline-data/surah_012.json"),
        13: () => import("../assets/quran-offline-data/surah_013.json"),
        14: () => import("../assets/quran-offline-data/surah_014.json"),
        15: () => import("../assets/quran-offline-data/surah_015.json"),
        16: () => import("../assets/quran-offline-data/surah_016.json"),
        17: () => import("../assets/quran-offline-data/surah_017.json"),
        18: () => import("../assets/quran-offline-data/surah_018.json"),
        19: () => import("../assets/quran-offline-data/surah_019.json"),
        20: () => import("../assets/quran-offline-data/surah_020.json"),
        21: () => import("../assets/quran-offline-data/surah_021.json"),
        22: () => import("../assets/quran-offline-data/surah_022.json"),
        23: () => import("../assets/quran-offline-data/surah_023.json"),
        24: () => import("../assets/quran-offline-data/surah_024.json"),
        25: () => import("../assets/quran-offline-data/surah_025.json"),
        26: () => import("../assets/quran-offline-data/surah_026.json"),
        27: () => import("../assets/quran-offline-data/surah_027.json"),
        28: () => import("../assets/quran-offline-data/surah_028.json"),
        29: () => import("../assets/quran-offline-data/surah_029.json"),
        30: () => import("../assets/quran-offline-data/surah_030.json"),
        31: () => import("../assets/quran-offline-data/surah_031.json"),
        32: () => import("../assets/quran-offline-data/surah_032.json"),
        33: () => import("../assets/quran-offline-data/surah_033.json"),
        34: () => import("../assets/quran-offline-data/surah_034.json"),
        35: () => import("../assets/quran-offline-data/surah_035.json"),
        36: () => import("../assets/quran-offline-data/surah_036.json"),
        37: () => import("../assets/quran-offline-data/surah_037.json"),
        38: () => import("../assets/quran-offline-data/surah_038.json"),
        39: () => import("../assets/quran-offline-data/surah_039.json"),
        40: () => import("../assets/quran-offline-data/surah_040.json"),
        41: () => import("../assets/quran-offline-data/surah_041.json"),
        42: () => import("../assets/quran-offline-data/surah_042.json"),
        43: () => import("../assets/quran-offline-data/surah_043.json"),
        44: () => import("../assets/quran-offline-data/surah_044.json"),
        45: () => import("../assets/quran-offline-data/surah_045.json"),
        46: () => import("../assets/quran-offline-data/surah_046.json"),
        47: () => import("../assets/quran-offline-data/surah_047.json"),
        48: () => import("../assets/quran-offline-data/surah_048.json"),
        49: () => import("../assets/quran-offline-data/surah_049.json"),
        50: () => import("../assets/quran-offline-data/surah_050.json"),
        51: () => import("../assets/quran-offline-data/surah_051.json"),
        52: () => import("../assets/quran-offline-data/surah_052.json"),
        53: () => import("../assets/quran-offline-data/surah_053.json"),
        54: () => import("../assets/quran-offline-data/surah_054.json"),
        55: () => import("../assets/quran-offline-data/surah_055.json"),
        56: () => import("../assets/quran-offline-data/surah_056.json"),
        57: () => import("../assets/quran-offline-data/surah_057.json"),
        58: () => import("../assets/quran-offline-data/surah_058.json"),
        59: () => import("../assets/quran-offline-data/surah_059.json"),
        60: () => import("../assets/quran-offline-data/surah_060.json"),
        61: () => import("../assets/quran-offline-data/surah_061.json"),
        62: () => import("../assets/quran-offline-data/surah_062.json"),
        63: () => import("../assets/quran-offline-data/surah_063.json"),
        64: () => import("../assets/quran-offline-data/surah_064.json"),
        65: () => import("../assets/quran-offline-data/surah_065.json"),
        66: () => import("../assets/quran-offline-data/surah_066.json"),
        67: () => import("../assets/quran-offline-data/surah_067.json"),
        68: () => import("../assets/quran-offline-data/surah_068.json"),
        69: () => import("../assets/quran-offline-data/surah_069.json"),
        70: () => import("../assets/quran-offline-data/surah_070.json"),
        71: () => import("../assets/quran-offline-data/surah_071.json"),
        72: () => import("../assets/quran-offline-data/surah_072.json"),
        73: () => import("../assets/quran-offline-data/surah_073.json"),
        74: () => import("../assets/quran-offline-data/surah_074.json"),
        75: () => import("../assets/quran-offline-data/surah_075.json"),
        76: () => import("../assets/quran-offline-data/surah_076.json"),
        77: () => import("../assets/quran-offline-data/surah_077.json"),
        78: () => import("../assets/quran-offline-data/surah_078.json"),
        79: () => import("../assets/quran-offline-data/surah_079.json"),
        80: () => import("../assets/quran-offline-data/surah_080.json"),
        81: () => import("../assets/quran-offline-data/surah_081.json"),
        82: () => import("../assets/quran-offline-data/surah_082.json"),
        83: () => import("../assets/quran-offline-data/surah_083.json"),
        84: () => import("../assets/quran-offline-data/surah_084.json"),
        85: () => import("../assets/quran-offline-data/surah_085.json"),
        86: () => import("../assets/quran-offline-data/surah_086.json"),
        87: () => import("../assets/quran-offline-data/surah_087.json"),
        88: () => import("../assets/quran-offline-data/surah_088.json"),
        89: () => import("../assets/quran-offline-data/surah_089.json"),
        90: () => import("../assets/quran-offline-data/surah_090.json"),
        91: () => import("../assets/quran-offline-data/surah_091.json"),
        92: () => import("../assets/quran-offline-data/surah_092.json"),
        93: () => import("../assets/quran-offline-data/surah_093.json"),
        94: () => import("../assets/quran-offline-data/surah_094.json"),
        95: () => import("../assets/quran-offline-data/surah_095.json"),
        96: () => import("../assets/quran-offline-data/surah_096.json"),
        97: () => import("../assets/quran-offline-data/surah_097.json"),
        98: () => import("../assets/quran-offline-data/surah_098.json"),
        99: () => import("../assets/quran-offline-data/surah_099.json"),
        100: () => import("../assets/quran-offline-data/surah_100.json"),
        101: () => import("../assets/quran-offline-data/surah_101.json"),
        102: () => import("../assets/quran-offline-data/surah_102.json"),
        103: () => import("../assets/quran-offline-data/surah_103.json"),
        104: () => import("../assets/quran-offline-data/surah_104.json"),
        105: () => import("../assets/quran-offline-data/surah_105.json"),
        106: () => import("../assets/quran-offline-data/surah_106.json"),
        107: () => import("../assets/quran-offline-data/surah_107.json"),
        108: () => import("../assets/quran-offline-data/surah_108.json"),
        109: () => import("../assets/quran-offline-data/surah_109.json"),
        110: () => import("../assets/quran-offline-data/surah_110.json"),
        111: () => import("../assets/quran-offline-data/surah_111.json"),
        112: () => import("../assets/quran-offline-data/surah_112.json"),
        113: () => import("../assets/quran-offline-data/surah_113.json"),
        114: () => import("../assets/quran-offline-data/surah_114.json"),
      };

      const loader = surahMappings[surahNumber];
      if (!loader) {
        console.error(
          `❌ [QuranOffline] Sourate ${surahNumber} non trouvée dans le mapping`
        );
        return null;
      }

      console.log(
        `📦 [QuranOffline] Import du module sourate ${surahNumber}...`
      );
      const module = await loader();
      console.log(`📦 [QuranOffline] Module reçu:`, {
        hasDefault: !!(module as any).default,
        moduleType: typeof module,
        moduleKeys: Object.keys(module || {}),
      });

      const result = (module as any).default || (module as QuranSurahData);
      console.log(
        `✅ [QuranOffline] Sourate ${surahNumber} chargée avec succès:`,
        {
          hasVerses: !!result?.verses,
          versesCount: result?.verses?.length || 0,
        }
      );

      return result;
    } catch (error) {
      console.error(
        `❌ [QuranOffline] Erreur import sourate ${surahNumber}:`,
        error
      );
      return null;
    }
  }

  /**
   * 🔍 Rechercher dans le Coran offline
   */
  async searchInQuran(
    query: string,
    language: string = "fr"
  ): Promise<{
    results: {
      surah_number: number;
      verse_number: number;
      verse_key: string;
      arabic_text: string;
      translation: string;
      match_score: number;
    }[];
    total_results: number;
  }> {
    const results: any[] = [];
    const normalizedQuery = this.normalizeText(query.toLowerCase());

    try {
      // Parcourir toutes les sourates
      for (let surahNumber = 1; surahNumber <= 114; surahNumber++) {
        const surahData = await this.getSurah(surahNumber);
        if (!surahData) continue;

        for (const verse of surahData.verses) {
          // Rechercher dans le texte arabe
          const arabicMatch = this.normalizeText(verse.arabic_text).includes(
            normalizedQuery
          );

          // Rechercher dans la traduction
          const translation =
            verse.translations[language] || verse.translations["en"] || "";
          const translationMatch = this.normalizeText(
            translation.toLowerCase()
          ).includes(normalizedQuery);

          // Rechercher dans la translittération
          const phoneticMatch = this.normalizeText(
            verse.phonetic_text.toLowerCase()
          ).includes(normalizedQuery);

          if (arabicMatch || translationMatch || phoneticMatch) {
            let matchScore = 0;
            if (arabicMatch) matchScore += 3;
            if (translationMatch) matchScore += 2;
            if (phoneticMatch) matchScore += 1;

            results.push({
              surah_number: surahNumber,
              verse_number: verse.verse_number,
              verse_key: verse.verse_key,
              arabic_text: verse.arabic_text,
              translation: translation,
              match_score: matchScore,
            });
          }
        }
      }

      // Trier par score de correspondance
      results.sort((a, b) => b.match_score - a.match_score);

      console.log(
        `🔍 [QuranOffline] Recherche "${query}": ${results.length} résultats trouvés`
      );

      return {
        results: results.slice(0, 100), // Limiter à 100 résultats
        total_results: results.length,
      };
    } catch (error) {
      console.error("❌ [QuranOffline] Erreur recherche:", error);
      return { results: [], total_results: 0 };
    }
  }

  /**
   * 📚 Obtenir les sourates disponibles pour une langue
   */
  async getAvailableSurahs(language: string = "fr"): Promise<QuranSurah[]> {
    const index = await this.getQuranIndex();
    if (!index) return [];

    return index.surahs.filter((surah) =>
      surah.available_translations.includes(language)
    );
  }

  /**
   * 🌍 Obtenir les langues disponibles
   */
  async getAvailableLanguages(): Promise<string[]> {
    const index = await this.getQuranIndex();
    return index?.metadata.languages || [];
  }

  /**
   * 📊 Obtenir les statistiques du Coran offline
   */
  async getQuranStats(): Promise<{
    total_surahs: number;
    total_verses: number;
    available_languages: number;
    last_updated: string;
  } | null> {
    const index = await this.getQuranIndex();
    if (!index) return null;

    return {
      total_surahs: index.metadata.total_surahs,
      total_verses: index.metadata.extraction_stats.total_verses,
      available_languages: index.metadata.languages.length,
      last_updated: index.metadata.extracted_at,
    };
  }

  /**
   * 🧹 Nettoyer le cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log("🧹 [QuranOffline] Cache nettoyé");
  }

  /**
   * 🔤 Normaliser le texte pour la recherche
   */
  private normalizeText(text: string): string {
    return text
      .normalize("NFD") // Décompose les caractères accentués
      .replace(/[\u0300-\u036f]/g, "") // Supprime les diacritiques latins
      .replace(/[\u064B-\u0652]/g, "") // Supprime les diacritiques arabes (tashkeel)
      .replace(/[\u0653-\u065F]/g, "") // Supprime autres diacritiques arabes
      .replace(/[\u0670]/g, "") // Supprime alif khanjariyah
      .replace(/[\u200E\u200F]/g, "") // Supprime les marqueurs directionnels
      .replace(/\s+/g, " ") // Normalise les espaces
      .trim();
  }

  /**
   * 🎯 Obtenir une traduction spécifique pour un verset
   */
  async getVerseTranslation(
    surahNumber: number,
    verseNumber: number,
    language: string = "fr"
  ): Promise<string | null> {
    const surahData = await this.getSurah(surahNumber);
    if (!surahData) return null;

    const verse = surahData.verses.find((v) => v.verse_number === verseNumber);
    if (!verse) return null;

    return (
      verse.translations[language] ||
      verse.translations["en"] ||
      verse.translations["ar"] ||
      null
    );
  }

  /**
   * 📖 Obtenir plusieurs versets d'une sourate
   */
  async getVersesRange(
    surahNumber: number,
    startVerse: number,
    endVerse: number,
    language: string = "fr"
  ): Promise<QuranVerse[]> {
    const surahData = await this.getSurah(surahNumber);
    if (!surahData) return [];

    return surahData.verses
      .filter((v) => v.verse_number >= startVerse && v.verse_number <= endVerse)
      .map((verse) => ({
        ...verse,
        // Filtrer les traductions pour ne garder que la langue demandée
        translations: {
          [language]:
            verse.translations[language] ||
            verse.translations["en"] ||
            verse.translations["ar"] ||
            "",
        },
      }));
  }
}

export default QuranOfflineService.getInstance();
