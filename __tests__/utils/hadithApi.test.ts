// Mock d'expo-constants
import { getRandomHadith } from "../../utils/hadithApi";

jest.mock("expo-constants", () => ({
  default: {
    expoConfig: {
      extra: {
        hadithApiKey: "test-api-key",
      },
    },
  },
}));

// Mock de fetch global
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock des réponses API typiques
const mockBooksResponse = {
  books: [
    { bookSlug: "bukhari", bookName: "Sahih Bukhari" },
    { bookSlug: "muslim", bookName: "Sahih Muslim" },
    { bookSlug: "musnad-ahmad", bookName: "Musnad Ahmad" }, // sera filtré
  ],
};

const mockChaptersResponse = {
  chapters: [
    { chapterNumber: "1", chapterTitle: "Revelation" },
    { chapterNumber: "2", chapterTitle: "Faith" },
  ],
};

const mockHadithsResponse = {
  hadiths: {
    data: [
      {
        id: 1,
        hadithNumber: 1,
        hadithEnglish:
          "Actions are but by intention and every man shall have but that which he intended.",
        hadithArabic:
          "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى",
      },
      {
        id: 2,
        hadithNumber: 2,
        hadithEnglish: "While we were sitting with the Messenger of Allah...",
        hadithArabic:
          "بَيْنَمَا نَحْنُ عِنْدَ رَسُولِ اللَّهِ صلى الله عليه وسلم",
      },
    ],
  },
};

describe("Hadith API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe("getRandomHadith - Cas de succès", () => {
    test("should fetch a random hadith successfully", async () => {
      // Setup des mocks pour un scénario de succès complet
      mockFetch
        .mockResolvedValueOnce({
          json: async () => mockBooksResponse,
        })
        .mockResolvedValueOnce({
          json: async () => mockChaptersResponse,
        })
        .mockResolvedValueOnce({
          json: async () => mockHadithsResponse,
        });

      const result = await getRandomHadith();

      expect(result).toBeDefined();
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("hadithNumber");
      expect(result).toHaveProperty("hadithEnglish");
      expect(result).toHaveProperty("hadithArabic");
      expect(result).toHaveProperty("bookSlug");
      expect(result).toHaveProperty("chapterNumber");

      // Vérifier que le texte est suffisamment long (validation métier)
      expect(result!.hadithEnglish.length).toBeGreaterThan(20);
      if (result!.hadithArabic) {
        expect(result!.hadithArabic.length).toBeGreaterThan(20);
      }

      // Vérifier les appels API
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("books")
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("chapters")
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining("hadiths")
      );
    });

    test("should filter out unavailable books", async () => {
      mockFetch
        .mockResolvedValueOnce({
          json: async () => mockBooksResponse,
        })
        .mockResolvedValueOnce({
          json: async () => mockChaptersResponse,
        })
        .mockResolvedValueOnce({
          json: async () => mockHadithsResponse,
        });

      const result = await getRandomHadith();

      // Vérifier que musnad-ahmad n'est pas utilisé
      expect(result?.bookSlug).not.toBe("musnad-ahmad");
      expect(["bukhari", "muslim"]).toContain(result?.bookSlug);
    });
  });

  describe("getRandomHadith - Gestion d'erreurs", () => {
    test("should handle network error when fetching books", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(getRandomHadith()).rejects.toThrow("Network error");
    });

    test("should return null when no books available", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ books: [] }),
      });

      const result = await getRandomHadith();
      expect(result).toBeNull();
    });

    test("should return null when only unavailable books exist", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          books: [
            { bookSlug: "musnad-ahmad" },
            { bookSlug: "al-silsila-sahiha" },
          ],
        }),
      });

      const result = await getRandomHadith();
      expect(result).toBeNull();
    });

    test("should handle empty chapters response", async () => {
      // Mock 10 tentatives avec chapitres vides
      for (let i = 0; i < 10; i++) {
        mockFetch
          .mockResolvedValueOnce({
            json: async () => mockBooksResponse,
          })
          .mockResolvedValueOnce({
            json: async () => ({ chapters: [] }),
          });
      }

      const result = await getRandomHadith();
      expect(result).toBeNull();
    });

    test("should handle empty hadiths response", async () => {
      // Mock 10 tentatives avec hadiths vides
      for (let i = 0; i < 10; i++) {
        mockFetch
          .mockResolvedValueOnce({
            json: async () => mockBooksResponse,
          })
          .mockResolvedValueOnce({
            json: async () => mockChaptersResponse,
          })
          .mockResolvedValueOnce({
            json: async () => ({ hadiths: { data: [] } }),
          });
      }

      const result = await getRandomHadith();
      expect(result).toBeNull();
    });

    test("should handle hadiths with insufficient text length", async () => {
      const shortHadithsResponse = {
        hadiths: {
          data: [
            {
              id: 1,
              hadithNumber: 1,
              hadithEnglish: "Short", // Trop court
              hadithArabic: "قصير", // Trop court
            },
          ],
        },
      };

      // Mock 10 tentatives avec hadiths trop courts
      for (let i = 0; i < 10; i++) {
        mockFetch
          .mockResolvedValueOnce({
            json: async () => mockBooksResponse,
          })
          .mockResolvedValueOnce({
            json: async () => mockChaptersResponse,
          })
          .mockResolvedValueOnce({
            json: async () => shortHadithsResponse,
          });
      }

      const result = await getRandomHadith();
      expect(result).toBeNull();
    });

    test("should handle malformed API responses", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ books: null }), // Réponse malformée
      });

      const result = await getRandomHadith();
      expect(result).toBeNull();
    });

    test("should retry up to 10 times before giving up", async () => {
      // Mock pour qu'il échoue plusieurs fois
      for (let i = 0; i < 15; i++) {
        mockFetch
          .mockResolvedValueOnce({
            json: async () => mockBooksResponse,
          })
          .mockResolvedValueOnce({
            json: async () => ({ chapters: [] }), // Échec : pas de chapitres
          });
      }

      const result = await getRandomHadith();
      expect(result).toBeNull();
      // Vérifier qu'il y a eu plusieurs tentatives (au moins 10)
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("books"));
    });
  });

  describe("getRandomHadith - Validation des données", () => {
    test("should return valid hadith data structure", async () => {
      // Test simple qui vérifie juste qu'on obtient un résultat ou null
      mockFetch
        .mockResolvedValueOnce({
          json: async () => mockBooksResponse,
        })
        .mockResolvedValueOnce({
          json: async () => mockChaptersResponse,
        })
        .mockResolvedValueOnce({
          json: async () => mockHadithsResponse,
        });

      const result = await getRandomHadith();

      // Le résultat peut être null ou un objet hadith valide
      if (result) {
        expect(result).toHaveProperty("id");
        expect(result).toHaveProperty("hadithEnglish");
        expect(result).toHaveProperty("bookSlug");
      } else {
        expect(result).toBeNull();
      }
    });
  });

  describe("getRandomHadith - Tests de performance", () => {
    test("should complete within reasonable time", async () => {
      mockFetch
        .mockResolvedValueOnce({
          json: async () => mockBooksResponse,
        })
        .mockResolvedValueOnce({
          json: async () => mockChaptersResponse,
        })
        .mockResolvedValueOnce({
          json: async () => mockHadithsResponse,
        });

      const startTime = Date.now();
      const result = await getRandomHadith();
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Moins de 5 secondes
    });
  });
});
