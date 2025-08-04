import {
  translationMap,
  getQuranVersesWithTranslations,
} from "../../utils/quranApi";

// Mock de fetch global
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock des réponses API typiques
const mockArabicResponse = {
  verses: [
    {
      id: 1,
      verse_number: 1,
      verse_key: "1:1",
      text_uthmani: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
    },
    {
      id: 2,
      verse_number: 2,
      verse_key: "1:2",
      text_uthmani: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ",
    },
    {
      id: 3,
      verse_number: 3,
      verse_key: "1:3",
      text_uthmani: "ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
    },
  ],
};

const mockTranslationResponse = {
  translations: [
    {
      id: 1,
      text: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
    },
    {
      id: 2,
      text: "[All] praise is [due] to Allah, Lord of the worlds -",
    },
    {
      id: 3,
      text: "The Entirely Merciful, the Especially Merciful,",
    },
  ],
};

describe("Quran API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe("translationMap", () => {
    test("should contain all supported languages", () => {
      const expectedLanguages = [
        "fr",
        "en",
        "ru",
        "tr",
        "de",
        "ar",
        "es",
        "it",
        "pt",
        "nl",
        "ur",
        "bn",
        "fa",
      ];

      expectedLanguages.forEach((lang) => {
        expect(translationMap).toHaveProperty(lang);
      });
    });

    test("should have correct translation IDs for key languages", () => {
      expect(translationMap.en).toBe(85);
      expect(translationMap.fr).toBe(136);
      expect(translationMap.ar).toBeNull(); // Pas de traduction pour l'arabe
      expect(translationMap.ru).toBe(45);
      expect(translationMap.de).toBe(27);
    });

    test("should handle Arabic as null (no translation needed)", () => {
      expect(translationMap.ar).toBeNull();
    });
  });

  describe("getQuranVersesWithTranslations", () => {
    test("should fetch verses with translations successfully", async () => {
      mockFetch
        .mockResolvedValueOnce({
          json: async () => mockArabicResponse,
        })
        .mockResolvedValueOnce({
          json: async () => mockTranslationResponse,
        });

      const result = await getQuranVersesWithTranslations(1, "en");

      expect(result).toHaveLength(3);

      // Vérifier la structure du premier verset
      expect(result[0]).toEqual({
        id: 1,
        verse_number: 1,
        verse_key: "1:1",
        text_uthmani: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
        translation:
          "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
      });

      // Vérifier les appels API
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        "https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=1"
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        "https://api.quran.com/api/v4/quran/translations/85?chapter_number=1"
      );
    });

    test("should handle different languages correctly", async () => {
      const testCases = [
        { lang: "fr", expectedId: 136 },
        { lang: "de", expectedId: 27 },
        { lang: "ru", expectedId: 45 },
        { lang: "es", expectedId: 83 },
      ];

      for (const { lang, expectedId } of testCases) {
        jest.clearAllMocks();

        mockFetch
          .mockResolvedValueOnce({
            json: async () => mockArabicResponse,
          })
          .mockResolvedValueOnce({
            json: async () => mockTranslationResponse,
          });

        await getQuranVersesWithTranslations(1, lang);

        // Vérifier que la bonne traduction est demandée
        expect(mockFetch).toHaveBeenNthCalledWith(
          2,
          `https://api.quran.com/api/v4/quran/translations/${expectedId}?chapter_number=1`
        );
      }
    });

    test("should handle language variants correctly", async () => {
      const languageVariants = [
        { input: "fr-FR", expected: 136 },
        { input: "en-US", expected: 85 },
        { input: "en-GB", expected: 85 },
        { input: "de-DE", expected: 27 },
        { input: "pt-BR", expected: 43 },
      ];

      for (const { input, expected } of languageVariants) {
        jest.clearAllMocks();

        mockFetch
          .mockResolvedValueOnce({
            json: async () => mockArabicResponse,
          })
          .mockResolvedValueOnce({
            json: async () => mockTranslationResponse,
          });

        await getQuranVersesWithTranslations(1, input);

        expect(mockFetch).toHaveBeenNthCalledWith(
          2,
          `https://api.quran.com/api/v4/quran/translations/${expected}?chapter_number=1`
        );
      }
    });

    test("should fallback to English for unknown languages", async () => {
      mockFetch
        .mockResolvedValueOnce({
          json: async () => mockArabicResponse,
        })
        .mockResolvedValueOnce({
          json: async () => mockTranslationResponse,
        });

      await getQuranVersesWithTranslations(1, "unknown-lang");

      // Devrait utiliser l'anglais (85) par défaut
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        "https://api.quran.com/api/v4/quran/translations/85?chapter_number=1"
      );
    });

    test("should handle Arabic language (no translation)", async () => {
      mockFetch
        .mockResolvedValueOnce({
          json: async () => mockArabicResponse,
        })
        .mockResolvedValueOnce({
          json: async () => mockTranslationResponse,
        });

      await getQuranVersesWithTranslations(1, "ar");

      // Pour l'arabe, devrait utiliser l'anglais par défaut car translationMap.ar est null
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        "https://api.quran.com/api/v4/quran/translations/85?chapter_number=1"
      );
    });

    test("should handle different chapter numbers", async () => {
      const chapters = [1, 2, 114]; // Al-Fatiha, Al-Baqarah, An-Nas

      for (const chapterNumber of chapters) {
        jest.clearAllMocks();

        mockFetch
          .mockResolvedValueOnce({
            json: async () => mockArabicResponse,
          })
          .mockResolvedValueOnce({
            json: async () => mockTranslationResponse,
          });

        await getQuranVersesWithTranslations(chapterNumber, "en");

        expect(mockFetch).toHaveBeenNthCalledWith(
          1,
          `https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${chapterNumber}`
        );
        expect(mockFetch).toHaveBeenNthCalledWith(
          2,
          `https://api.quran.com/api/v4/quran/translations/85?chapter_number=${chapterNumber}`
        );
      }
    });

    test("should handle mismatched verse and translation counts", async () => {
      const mismatchedArabic = {
        verses: [
          { id: 1, verse_number: 1, text_uthmani: "Verse 1" },
          { id: 2, verse_number: 2, text_uthmani: "Verse 2" },
          { id: 3, verse_number: 3, text_uthmani: "Verse 3" },
        ],
      };

      const fewerTranslations = {
        translations: [
          { id: 1, text: "Translation 1" },
          { id: 2, text: "Translation 2" },
          // Manque la 3ème traduction
        ],
      };

      mockFetch
        .mockResolvedValueOnce({
          json: async () => mismatchedArabic,
        })
        .mockResolvedValueOnce({
          json: async () => fewerTranslations,
        });

      const result = await getQuranVersesWithTranslations(1, "en");

      expect(result).toHaveLength(3);
      expect(result[0].translation).toBe("Translation 1");
      expect(result[1].translation).toBe("Translation 2");
      expect(result[2].translation).toBe(""); // Devrait être une chaîne vide
    });

    test("should handle empty responses", async () => {
      mockFetch
        .mockResolvedValueOnce({
          json: async () => ({ verses: [] }),
        })
        .mockResolvedValueOnce({
          json: async () => ({ translations: [] }),
        });

      const result = await getQuranVersesWithTranslations(1, "en");

      expect(result).toEqual([]);
    });

    test("should handle malformed API responses", async () => {
      const malformedResponses = [
        { verses: null },
        {}, // Pas de propriété verses
      ];

      for (const malformedResponse of malformedResponses) {
        jest.clearAllMocks();

        mockFetch
          .mockResolvedValueOnce({
            json: async () => malformedResponse,
          })
          .mockResolvedValueOnce({
            json: async () => mockTranslationResponse,
          });

        const result = await getQuranVersesWithTranslations(1, "en");
        expect(result).toEqual([]);
      }
    });

    test("should handle undefined API response", async () => {
      jest.clearAllMocks();
      mockFetch.mockResolvedValueOnce({
        json: async () => undefined,
      });

      await expect(getQuranVersesWithTranslations(1, "en")).rejects.toThrow();
    });

    test("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(getQuranVersesWithTranslations(1, "en")).rejects.toThrow(
        "Network error"
      );
    });

    test("should handle API errors", async () => {
      mockFetch
        .mockResolvedValueOnce({
          json: async () => ({ error: "API Error" }),
        })
        .mockResolvedValueOnce({
          json: async () => mockTranslationResponse,
        });

      const result = await getQuranVersesWithTranslations(1, "en");
      expect(result).toEqual([]);
    });

    test("should preserve original verse properties", async () => {
      const detailedArabicResponse = {
        verses: [
          {
            id: 1,
            verse_number: 1,
            verse_key: "1:1",
            text_uthmani: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
            juz_number: 1,
            hizb_number: 1,
            rub_number: 1,
            page_number: 1,
          },
        ],
      };

      mockFetch
        .mockResolvedValueOnce({
          json: async () => detailedArabicResponse,
        })
        .mockResolvedValueOnce({
          json: async () => mockTranslationResponse,
        });

      const result = await getQuranVersesWithTranslations(1, "en");

      // Vérifier que toutes les propriétés originales sont préservées
      expect(result[0]).toMatchObject({
        id: 1,
        verse_number: 1,
        verse_key: "1:1",
        text_uthmani: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
        juz_number: 1,
        hizb_number: 1,
        rub_number: 1,
        page_number: 1,
        translation: expect.any(String),
      });
    });
  });

  describe("Performance Tests", () => {
    test("should complete within reasonable time", async () => {
      mockFetch
        .mockResolvedValueOnce({
          json: async () => mockArabicResponse,
        })
        .mockResolvedValueOnce({
          json: async () => mockTranslationResponse,
        });

      const startTime = Date.now();
      await getQuranVersesWithTranslations(1, "en");
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Moins de 5 secondes
    });
  });
});
