import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import HadithScreen from "../../screens/HadithScreen";
import { useTranslation } from "react-i18next";

jest.mock("../../locales/i18n", () => ({}));

jest.mock("react-i18next", () => ({
  useTranslation: jest.fn(),
}));

jest.mock("../../components/FavoriteButton", () => {
  const { View } = require("react-native");
  const MockFavoriteButton = (props: any) => (
    <View testID="favorite-btn" {...props} />
  );
  MockFavoriteButton.displayName = "MockFavoriteButton";
  return MockFavoriteButton;
});

jest.mock("expo-font", () => ({
  useFonts: () => [true],
}));

jest.mock("expo-constants", () => ({
  default: {
    expoConfig: {
      extra: {
        hadithApiKey: "test-key",
      },
    },
  },
}));

// Mock fetch pour éviter les appels réseau
beforeAll(() => {
  (global.fetch as any) = jest.fn((url: string) => {
    console.log("🔍 Mock fetch appelé avec URL:", url);

    if (url.includes("hadithapi.com/api/books")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            books: [
              { id: 1, bookName: "Sahih Bukhari", bookSlug: "sahih-bukhari" },
              { id: 2, bookName: "Sahih Muslim", bookSlug: "sahih-muslim" },
            ],
          }),
      });
    }
    if (url.includes("/chapters")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            chapters: [
              {
                id: 1,
                chapterNumber: "1",
                chapterEnglish: "The Book of Faith",
              },
              {
                id: 2,
                chapterNumber: "2",
                chapterEnglish: "The Book of Prayer",
              },
            ],
          }),
      });
    }
    if (url.includes("/hadiths")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            hadiths: {
              data: [
                {
                  id: 1,
                  hadithNumber: "1",
                  hadithEnglish: "The first hadith about faith",
                  hadithArabic: "الحديث الأول عن الإيمان",
                  narrator: "Abu Huraira",
                },
                {
                  id: 2,
                  hadithNumber: "2",
                  hadithEnglish: "The second hadith about prayer",
                  hadithArabic: "الحديث الثاني عن الصلاة",
                  narrator: "Ibn Umar",
                },
              ],
              last_page: 1,
            },
          }),
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });
});

afterAll(() => {
  // @ts-ignore
  global.fetch.mockRestore && global.fetch.mockRestore();
});

describe.skip("HadithScreen", () => {
  const mockT = jest.fn((key) => {
    switch (key) {
      case "select_book":
        return "Sélectionner un livre";
      case "select_chapter":
        return "Sélectionner un chapitre";
      case "no_hadith_found_or_connection_error":
        return "Aucun hadith trouvé ou erreur de connexion";
      case "search_hadiths":
        return "Rechercher des hadiths";
      default:
        return key;
    }
  });

  beforeEach(() => {
    (useTranslation as jest.Mock).mockReturnValue({
      t: mockT,
      i18n: { language: "fr" },
    });
    jest.clearAllMocks();
  });

  it("affiche les sélecteurs de livre et chapitre", async () => {
    render(<HadithScreen />);
    await waitFor(() => {
      expect(screen.getByText("Sélectionner un livre")).toBeTruthy();
      expect(screen.getByText("Sélectionner un chapitre")).toBeTruthy();
    });
  });

  it("charge et affiche la liste des livres", async () => {
    render(<HadithScreen />);
    await waitFor(() => {
      expect(screen.getByText("Sahih Bukhari")).toBeTruthy();
      expect(screen.getByText("Sahih Muslim")).toBeTruthy();
    });
  });

  it("affiche les hadiths après sélection de livre et chapitre", async () => {
    render(<HadithScreen />);

    // Attendre que les livres se chargent
    await waitFor(() => {
      expect(screen.getByText("Sahih Bukhari")).toBeTruthy();
    });

    // Sélectionner un livre
    const bookButton = screen.getByText("Sahih Bukhari");
    fireEvent.press(bookButton);

    // Attendre que les chapitres se chargent
    await waitFor(() => {
      expect(screen.getByText("The Book of Faith")).toBeTruthy();
    });

    // Sélectionner un chapitre
    const chapterButton = screen.getByText("The Book of Faith");
    fireEvent.press(chapterButton);

    // Vérifier que les hadiths s'affichent
    await waitFor(() => {
      expect(screen.getByText("The first hadith about faith")).toBeTruthy();
      expect(screen.getByText("The second hadith about prayer")).toBeTruthy();
    });
  });

  it("affiche les boutons favoris pour chaque hadith", async () => {
    render(<HadithScreen />);

    // Sélectionner un livre et chapitre pour afficher les hadiths
    await waitFor(() => {
      expect(screen.getByText("Sahih Bukhari")).toBeTruthy();
    });

    const bookButton = screen.getByText("Sahih Bukhari");
    fireEvent.press(bookButton);

    await waitFor(() => {
      expect(screen.getByText("The Book of Faith")).toBeTruthy();
    });

    const chapterButton = screen.getByText("The Book of Faith");
    fireEvent.press(chapterButton);

    await waitFor(() => {
      expect(screen.getAllByTestId("favorite-btn").length).toBeGreaterThan(0);
    });
  });

  it("gère l'erreur de réseau", async () => {
    (global.fetch as any).mockImplementationOnce(() =>
      Promise.reject(new Error("Network error"))
    );

    render(<HadithScreen />);
    await waitFor(() => {
      expect(
        screen.getByText("Aucun hadith trouvé ou erreur de connexion")
      ).toBeTruthy();
    });
  });
});
