import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useQuranReader } from "../../hooks/useQuranReader";
import {
  QURAN_BOOKMARK_KEY,
  QURAN_DISPLAY_MODE_KEY,
} from "../../utils/quranReaderPrefs";

describe("useQuranReader", () => {
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

  it("démarre en mode complet, sans marque-page, hors plein écran", async () => {
    const { result } = renderHook(() => useQuranReader());
    await waitFor(() => expect(mocked.getItem).toHaveBeenCalled());
    expect(result.current.displayMode).toBe("full");
    expect(result.current.bookmark).toBeNull();
    expect(result.current.fullscreen).toBe(false);
  });

  it("recharge les préférences enregistrées", async () => {
    store.set(QURAN_DISPLAY_MODE_KEY, "arabic");
    store.set(
      QURAN_BOOKMARK_KEY,
      JSON.stringify({ verseKey: "67:28", surahLabel: "Al-Mulk", savedAt: 1 }),
    );
    const { result } = renderHook(() => useQuranReader());
    await waitFor(() => expect(result.current.displayMode).toBe("arabic"));
    expect(result.current.bookmark?.verseKey).toBe("67:28");
  });

  it("bascule le mode d'affichage et l'enregistre", async () => {
    const { result } = renderHook(() => useQuranReader());
    await waitFor(() => expect(mocked.getItem).toHaveBeenCalled());

    act(() => {
      expect(result.current.toggleDisplayMode()).toBe("arabic");
    });
    expect(result.current.displayMode).toBe("arabic");
    expect(store.get(QURAN_DISPLAY_MODE_KEY)).toBe("arabic");

    act(() => {
      expect(result.current.toggleDisplayMode()).toBe("full");
    });
    expect(store.get(QURAN_DISPLAY_MODE_KEY)).toBe("full");
  });

  it("garde un seul marque-page : le nouveau remplace l'ancien, le même le retire", async () => {
    const { result } = renderHook(() => useQuranReader());
    await waitFor(() => expect(mocked.getItem).toHaveBeenCalled());

    act(() => {
      result.current.toggleBookmark("2:255", "Al-Baqara");
    });
    expect(result.current.bookmark?.verseKey).toBe("2:255");

    act(() => {
      result.current.toggleBookmark("67:28", "Al-Mulk");
    });
    expect(result.current.bookmark?.verseKey).toBe("67:28");
    expect(JSON.parse(store.get(QURAN_BOOKMARK_KEY) as string).verseKey).toBe("67:28");

    act(() => {
      expect(result.current.toggleBookmark("67:28", "Al-Mulk")).toBeNull();
    });
    expect(result.current.bookmark).toBeNull();
    expect(store.has(QURAN_BOOKMARK_KEY)).toBe(false);
  });

  it("ignore une clé de verset invalide", async () => {
    const { result } = renderHook(() => useQuranReader());
    await waitFor(() => expect(mocked.getItem).toHaveBeenCalled());
    act(() => {
      result.current.toggleBookmark("n'importe quoi", "x");
    });
    expect(result.current.bookmark).toBeNull();
  });

  it("ouvre et ferme le plein écran", async () => {
    const { result } = renderHook(() => useQuranReader());
    await waitFor(() => expect(mocked.getItem).toHaveBeenCalled());
    act(() => result.current.openFullscreen());
    expect(result.current.fullscreen).toBe(true);
    act(() => result.current.closeFullscreen());
    expect(result.current.fullscreen).toBe(false);
  });
});
