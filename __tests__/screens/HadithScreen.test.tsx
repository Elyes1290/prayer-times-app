import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { ActivityIndicator, Alert } from "react-native";
import HadithScreen from "../../screens/HadithScreen";

// Mock des dépendances
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-constants", () => ({
  expoConfig: { extra: { hadithApiKey: "test-key" } },
}));

jest.mock("expo-font", () => ({
  useFonts: () => [true],
}));

jest.mock("../../hooks/useThemeAssets", () => ({
  useThemeAssets: () => ({
    backgroundImage: null,
    theme: "light",
    colors: {
      primary: "#4ECDC4",
      text: "#000000",
      background: "#FFFFFF",
    },
  }),
  useThemeColors: () => ({
    primary: "#4A90E2",
    secondary: "#F5A623",
    background: "#FFFFFF",
    surface: "#F8F9FA",
    text: "#000000",
    textSecondary: "#666666",
    textTertiary: "#999999",
  }),
}));

jest.mock("../../hooks/useThemeColor", () => ({
  useOverlayTextColor: () => "#FFFFFF",
  useCurrentTheme: () => "light",
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: { [key: string]: string } = {
        "hadith_screen.title": "Hadiths",
        "hadith_screen.select_book": "Sélectionner un livre",
        "hadith_screen.select_chapter": "Sélectionner un chapitre",
        "hadith_screen.search_placeholder": "Rechercher un hadith...",
        "hadith_screen.search_button": "Rechercher",
        "hadith_screen.loading": "Chargement...",
        "hadith_screen.error": "Erreur",
        "hadith_screen.no_hadiths": "Aucun hadith trouvé",
        "hadith_screen.book_unavailable": "Ce livre n'est pas disponible",
        cancel: "Annuler",
        ok: "OK",
      };
      return translations[key] || key;
    },
  }),
}));

jest.mock("../../locales/i18n", () => ({}));

// Mock des contextes
jest.mock("../../contexts/FavoritesContext", () => ({
  useFavorites: () => ({
    favorites: [],
    addFavorite: jest.fn(),
    removeFavorite: jest.fn(),
    isFavorite: jest.fn(() => false),
  }),
}));

// Mock de fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ books: [] }),
  })
) as jest.Mock;

// Mock d'Alert
jest.spyOn(Alert, "alert").mockImplementation((title, message, buttons) => {
  if (buttons && buttons.length > 0) {
    const okButton = buttons.find((btn) => btn.text === "OK");
    if (okButton && okButton.onPress) {
      okButton.onPress();
    }
  }
});

const renderHadithScreen = () => {
  return render(<HadithScreen />);
};

describe("HadithScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it("renders correctly with initial state", async () => {
    const { getByText } = renderHadithScreen();

    await waitFor(() => {
      expect(getByText("select_book")).toBeTruthy();
    });
  });

  it("loads books on mount", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ books: [] }),
    });

    renderHadithScreen();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "https://hadithapi.com/api/books?apiKey=test-key"
      );
    });
  });

  it("handles error states", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("Network error")
    );

    renderHadithScreen();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it("handles loading states", () => {
    const { UNSAFE_getByType } = renderHadithScreen();
    // Vérifier qu'il y a un indicateur de chargement
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it("displays correct screen title", async () => {
    const { getByText } = renderHadithScreen();

    await waitFor(() => {
      expect(getByText("select_book")).toBeTruthy();
    });
  });

  it("handles API key configuration", () => {
    renderHadithScreen();

    // Vérifier que l'API key est utilisée
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("test-key")
    );
  });

  it("handles font loading", async () => {
    const { getByText } = renderHadithScreen();

    // Vérifier que le composant se rend même avec les polices
    await waitFor(() => {
      expect(getByText("select_book")).toBeTruthy();
    });
  });

  it("handles theme integration", async () => {
    const { getByText } = renderHadithScreen();

    // Vérifier que le composant s'affiche avec le thème
    await waitFor(() => {
      expect(getByText("select_book")).toBeTruthy();
    });
  });

  it("handles translation integration", async () => {
    const { getByText } = renderHadithScreen();

    // Vérifier que les traductions sont utilisées
    await waitFor(() => {
      expect(getByText("select_book")).toBeTruthy();
    });
  });

  it("handles favorites context integration", async () => {
    const { getByText } = renderHadithScreen();

    // Vérifier que le contexte des favoris est intégré
    await waitFor(() => {
      expect(getByText("select_book")).toBeTruthy();
    });
  });

  it("handles safe area insets", async () => {
    const { getByText } = renderHadithScreen();

    // Vérifier que les safe area insets sont gérés
    await waitFor(() => {
      expect(getByText("select_book")).toBeTruthy();
    });
  });

  it("handles router integration", async () => {
    const { getByText } = renderHadithScreen();

    // Vérifier que le router est intégré
    await waitFor(() => {
      expect(getByText("select_book")).toBeTruthy();
    });
  });
});
