// Test des fonctions utilitaires pour les favoris
describe("Favorites Logic", () => {
  // Fonction helper pour générer un ID unique de favori
  const generateFavoriteId = (type: string, data: any): string => {
    switch (type) {
      case "quran_verse":
        return `quran_${data.chapterNumber}_${data.verseNumber}`;
      case "hadith":
        return `hadith_${data.bookSlug}_${data.chapterNumber}_${data.hadithNumber}`;
      case "dhikr":
        return `dhikr_${data.dhikrType}_${data.index}`;
      default:
        return `${type}_${Date.now()}`;
    }
  };

  // Fonction pour vérifier si un favori existe déjà
  const isDuplicateFavorite = (favorites: any[], newFavorite: any): boolean => {
    const newId = generateFavoriteId(newFavorite.type, newFavorite);
    return favorites.some((fav) => {
      const existingId = generateFavoriteId(fav.type, fav);
      return existingId === newId;
    });
  };

  test("should generate unique IDs for different favorite types", () => {
    const quranFav = { type: "quran_verse", chapterNumber: 1, verseNumber: 1 };
    const hadithFav = {
      type: "hadith",
      bookSlug: "bukhari",
      chapterNumber: 1,
      hadithNumber: 1,
    };
    const dhikrFav = { type: "dhikr", dhikrType: "morning", index: 0 };

    const quranId = generateFavoriteId("quran_verse", quranFav);
    const hadithId = generateFavoriteId("hadith", hadithFav);
    const dhikrId = generateFavoriteId("dhikr", dhikrFav);

    expect(quranId).toBe("quran_1_1");
    expect(hadithId).toBe("hadith_bukhari_1_1");
    expect(dhikrId).toBe("dhikr_morning_0");

    // Tous les IDs doivent être différents
    expect(quranId).not.toBe(hadithId);
    expect(hadithId).not.toBe(dhikrId);
    expect(quranId).not.toBe(dhikrId);
  });

  test("should detect duplicate favorites correctly", () => {
    const existingFavorites = [
      { type: "quran_verse", chapterNumber: 1, verseNumber: 1 },
      {
        type: "hadith",
        bookSlug: "bukhari",
        chapterNumber: 1,
        hadithNumber: 1,
      },
    ];

    // Favori identique (devrait être détecté comme doublon)
    const duplicateQuran = {
      type: "quran_verse",
      chapterNumber: 1,
      verseNumber: 1,
    };
    expect(isDuplicateFavorite(existingFavorites, duplicateQuran)).toBe(true);

    // Favori différent (ne devrait pas être doublon)
    const newQuran = { type: "quran_verse", chapterNumber: 1, verseNumber: 2 };
    expect(isDuplicateFavorite(existingFavorites, newQuran)).toBe(false);

    // Nouveau type de favori
    const newDhikr = { type: "dhikr", dhikrType: "evening", index: 0 };
    expect(isDuplicateFavorite(existingFavorites, newDhikr)).toBe(false);
  });

  test("should filter favorites by type", () => {
    const allFavorites = [
      { type: "quran_verse", chapterNumber: 1, verseNumber: 1 },
      { type: "quran_verse", chapterNumber: 2, verseNumber: 5 },
      {
        type: "hadith",
        bookSlug: "bukhari",
        chapterNumber: 1,
        hadithNumber: 1,
      },
      { type: "dhikr", dhikrType: "morning", index: 0 },
    ];

    const quranFavorites = allFavorites.filter(
      (fav) => fav.type === "quran_verse"
    );
    const hadithFavorites = allFavorites.filter((fav) => fav.type === "hadith");
    const dhikrFavorites = allFavorites.filter((fav) => fav.type === "dhikr");

    expect(quranFavorites).toHaveLength(2);
    expect(hadithFavorites).toHaveLength(1);
    expect(dhikrFavorites).toHaveLength(1);

    // Vérifier le contenu
    expect(quranFavorites[0].chapterNumber).toBe(1);
    expect(quranFavorites[1].chapterNumber).toBe(2);
    expect(hadithFavorites[0].bookSlug).toBe("bukhari");
  });

  test("should validate favorite data structure", () => {
    const validateQuranFavorite = (fav: any): boolean => {
      return (
        fav.type === "quran_verse" &&
        typeof fav.chapterNumber === "number" &&
        typeof fav.verseNumber === "number" &&
        fav.chapterNumber > 0 &&
        fav.verseNumber > 0
      );
    };

    const validateHadithFavorite = (fav: any): boolean => {
      return (
        fav.type === "hadith" &&
        typeof fav.bookSlug === "string" &&
        typeof fav.hadithNumber !== "undefined" &&
        fav.bookSlug.length > 0
      );
    };

    // Tests valides
    const validQuran = {
      type: "quran_verse",
      chapterNumber: 1,
      verseNumber: 1,
    };
    const validHadith = {
      type: "hadith",
      bookSlug: "bukhari",
      hadithNumber: 1,
    };

    expect(validateQuranFavorite(validQuran)).toBe(true);
    expect(validateHadithFavorite(validHadith)).toBe(true);

    // Tests invalides
    const invalidQuran1 = {
      type: "quran_verse",
      chapterNumber: -1,
      verseNumber: 1,
    };
    const invalidQuran2 = {
      type: "quran_verse",
      chapterNumber: "1",
      verseNumber: 1,
    };
    const invalidHadith = { type: "hadith", bookSlug: "", hadithNumber: 1 };

    expect(validateQuranFavorite(invalidQuran1)).toBe(false);
    expect(validateQuranFavorite(invalidQuran2)).toBe(false);
    expect(validateHadithFavorite(invalidHadith)).toBe(false);
  });
});
