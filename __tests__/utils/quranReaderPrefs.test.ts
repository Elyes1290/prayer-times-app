import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createBookmark,
  loadQuranBookmark,
  loadQuranDisplayMode,
  normalizeBookmark,
  normalizeDisplayMode,
  QURAN_BOOKMARK_KEY,
  saveQuranBookmark,
  saveQuranDisplayMode,
} from "../../utils/quranReaderPrefs";
import { findVerseIndex } from "../../utils/quranListScroll";

describe("quranReaderPrefs — normalisation", () => {
  it("n'accepte que les deux modes d'affichage connus", () => {
    expect(normalizeDisplayMode("arabic")).toBe("arabic");
    expect(normalizeDisplayMode("full")).toBe("full");
    expect(normalizeDisplayMode("n'importe quoi")).toBe("full");
    expect(normalizeDisplayMode(null)).toBe("full");
  });

  it("crée un marque-page valide à partir d'une clé sourate:verset", () => {
    expect(createBookmark("67:28", "Al-Mulk", 123)).toEqual({
      surah: 67,
      ayah: 28,
      verseKey: "67:28",
      surahLabel: "Al-Mulk",
      savedAt: 123,
    });
  });

  it.each([undefined, "", "67", "0:1", "115:1", "2:0", "a:b", "2:255:1"])(
    "refuse la clé invalide %p",
    (key) => {
      expect(createBookmark(key, "x")).toBeNull();
    },
  );

  it("revalide un marque-page lu sur le disque", () => {
    expect(normalizeBookmark(null)).toBeNull();
    expect(normalizeBookmark("texte")).toBeNull();
    expect(normalizeBookmark({ verseKey: "999:1" })).toBeNull();
    expect(
      normalizeBookmark({ verseKey: "2:255", surahLabel: 42, savedAt: "hier" }),
    ).toEqual({ surah: 2, ayah: 255, verseKey: "2:255", surahLabel: "", savedAt: 0 });
  });
});

describe("quranReaderPrefs — persistance", () => {
  const store = new Map<string, string>();
  const mocked = AsyncStorage as unknown as {
    getItem: jest.Mock;
    setItem: jest.Mock;
    removeItem: jest.Mock;
  };

  beforeEach(() => {
    store.clear();
    mocked.getItem.mockImplementation((key: string) =>
      Promise.resolve(store.get(key) ?? null),
    );
    mocked.setItem.mockImplementation((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    });
    mocked.removeItem.mockImplementation((key: string) => {
      store.delete(key);
      return Promise.resolve();
    });
  });

  afterEach(() => {
    mocked.getItem.mockImplementation(() => Promise.resolve(null));
    mocked.setItem.mockImplementation(() => Promise.resolve());
    mocked.removeItem.mockImplementation(() => Promise.resolve());
  });

  it("enregistre et relit le mode d'affichage (défaut : complet)", async () => {
    expect(await loadQuranDisplayMode()).toBe("full");
    await saveQuranDisplayMode("arabic");
    expect(await loadQuranDisplayMode()).toBe("arabic");
  });

  it("enregistre, relit puis supprime le marque-page", async () => {
    expect(await loadQuranBookmark()).toBeNull();
    const bookmark = createBookmark("67:28", "Al-Mulk", 5)!;
    await saveQuranBookmark(bookmark);
    expect(await loadQuranBookmark()).toEqual(bookmark);
    await saveQuranBookmark(null);
    expect(store.has(QURAN_BOOKMARK_KEY)).toBe(false);
    expect(await loadQuranBookmark()).toBeNull();
  });

  it("ignore un marque-page corrompu", async () => {
    store.set(QURAN_BOOKMARK_KEY, "{pas du json");
    expect(await loadQuranBookmark()).toBeNull();
  });

  it("ne lève pas d'exception si le stockage échoue", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    mocked.setItem.mockRejectedValueOnce(new Error("disque plein"));
    await expect(saveQuranDisplayMode("arabic")).resolves.toBeUndefined();
    mocked.getItem.mockRejectedValueOnce(new Error("illisible"));
    expect(await loadQuranBookmark()).toBeNull();
    warn.mockRestore();
  });
});

describe("quranListScroll", () => {
  it("retrouve l'index d'un verset par sa clé", () => {
    const verses = [{ verse_key: "1:1" }, { verse_key: "1:2" }, {}];
    expect(findVerseIndex(verses, "1:2")).toBe(1);
    expect(findVerseIndex(verses, "2:1")).toBe(-1);
  });
});
