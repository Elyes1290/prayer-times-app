import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import QuranScreen from "../../screens/QuranScreen";
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

jest.mock("../../contexts/PremiumContext", () => ({
  usePremium: () => ({ user: { isPremium: false } }),
}));

jest.mock("../../contexts/ToastContext", () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

jest.mock("../../hooks/useNativeDownload", () => ({
  useNativeDownload: () => ({
    downloadState: new Map(),
    startDownload: jest.fn(),
    cancelDownload: jest.fn(),
    isNativeAvailable: false,
  }),
}));

jest.mock("expo-font", () => ({
  useFonts: () => [true],
}));

jest.mock("expo-image", () => ({
  Image: (props: any) => {
    const { View } = require("react-native");
    return <View {...props} />;
  },
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: (props: any) => {
    const { View } = require("react-native");
    const MockIcon = (props: any) => <View testID="icon" {...props} />;
    MockIcon.displayName = "MockMaterialCommunityIcons";
    return MockIcon(props);
  },
}));

jest.mock(
  "react-native/Libraries/Components/ActivityIndicator/ActivityIndicator",
  () => {
    const MockActivityIndicator = (props: any) => (
      <div data-testid="ActivityIndicator" {...props} />
    );
    MockActivityIndicator.displayName = "MockActivityIndicator";
    return MockActivityIndicator;
  }
);
jest.mock("react-native/Libraries/Components/TextInput/TextInput", () => {
  const MockTextInput = (props: any) => (
    <input data-testid="TextInput" {...props} />
  );
  MockTextInput.displayName = "MockTextInput";
  return MockTextInput;
});

// Mock fetch pour éviter les appels réseau
beforeAll(() => {
  (global.fetch as any) = jest.fn((url: any) => {
    url = String(url);
    const baseResponse = {
      ok: true,
      status: 200,
      headers: {
        get: () => null,
        append: () => {},
        delete: () => {},
        has: () => false,
        set: () => {},
        entries: function* (): IterableIterator<[string, string]> {
          return;
        },
        keys: function* (): IterableIterator<string> {
          return;
        },
        values: function* (): IterableIterator<string> {
          return;
        },
        forEach: () => {},
        getSetCookie: () => [],
        [Symbol.iterator]: function* () {},
      },
      redirected: false,
      statusText: "OK",
      type: "basic",
      url: url,
      clone: () => baseResponse,
      body: null,
      bodyUsed: false,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      blob: () => Promise.resolve(new Blob()),
      formData: () => Promise.resolve({}),
      text: () => Promise.resolve(""),
      bytes: () => Promise.resolve(new Uint8Array()),
    };
    if (url.includes("/quran/verses/uthmani")) {
      return Promise.resolve({
        ...baseResponse,
        json: () =>
          Promise.resolve({
            verses: [
              { id: 1, text_uthmani: "بِسْمِ اللَّهِ", verse_key: "1:1" },
              { id: 2, text_uthmani: "الْحَمْدُ لِلَّهِ", verse_key: "1:2" },
            ],
          }),
      });
    }
    if (url.includes("/quran/translations/57")) {
      return Promise.resolve({
        ...baseResponse,
        json: () =>
          Promise.resolve({
            translations: [{ text: "Bismillah" }, { text: "Alhamdulillah" }],
          }),
      });
    }
    if (url.includes("/quran/translations/")) {
      return Promise.resolve({
        ...baseResponse,
        json: () =>
          Promise.resolve({
            translations: [
              { text: "Au nom d'Allah" },
              { text: "Louange à Allah" },
            ],
          }),
      });
    }
    return Promise.resolve({
      ...baseResponse,
      json: () => Promise.resolve({}),
    });
  });
});

afterAll(() => {
  // @ts-ignore
  global.fetch.mockRestore && global.fetch.mockRestore();
});

const fakeSourates = [
  { id: 1, name_simple: "Al-Fatiha", name_arabic: "الفاتحة" },
  { id: 2, name_simple: "Al-Baqara", name_arabic: "البقرة" },
];

describe.skip("QuranScreen", () => {
  const mockT = jest.fn((key) => {
    switch (key) {
      case "choose_sourate":
        return "Choisir une sourate";
      case "surah":
        return "Sourate";
      case "download_progress":
        return "Téléchargement";
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
    // @ts-ignore
    jest
      .spyOn(React, "useState")
      .mockImplementation((init: any): [any, jest.Mock] => {
        if (Array.isArray(init) && init.length === 0) {
          // Pour sourates
          return [fakeSourates, jest.fn()];
        }
        return [typeof init === "function" ? init() : init, jest.fn()];
      });
  });

  it("affiche la liste des versets avec traduction et translittération", async () => {
    render(<QuranScreen />);
    await waitFor(() => {
      expect(screen.getByText("بِسْمِ اللَّهِ")).toBeTruthy();
      expect(screen.getByText("الْحَمْدُ لِلَّهِ")).toBeTruthy();
      expect(screen.getByText("Bismillah")).toBeTruthy();
      expect(screen.getByText("Alhamdulillah")).toBeTruthy();
      expect(screen.getByText("Au nom d'Allah")).toBeTruthy();
      expect(screen.getByText("Louange à Allah")).toBeTruthy();
    });
  });

  it("ouvre le sélecteur de sourate et sélectionne une sourate", async () => {
    render(<QuranScreen />);
    const openSelector = screen.getByText(/choisir une sourate/i);
    fireEvent.press(openSelector);
    // Le modal devrait s'ouvrir (présence du titre)
    await waitFor(() => {
      expect(screen.getByText("Choisir une sourate")).toBeTruthy();
    });
  });

  it("filtre les versets avec la recherche", async () => {
    render(<QuranScreen />);
    const input = screen.UNSAFE_getByType(require("react-native").TextInput);
    fireEvent.changeText(input, "louange");
    await waitFor(() => {
      expect(screen.getByText("Louange à Allah")).toBeTruthy();
      expect(screen.queryByText("Au nom d'Allah")).toBeNull();
    });
  });

  it("affiche le bouton favoris pour chaque verset", async () => {
    render(<QuranScreen />);
    await waitFor(() => {
      expect(screen.getAllByTestId("favorite-btn").length).toBeGreaterThan(0);
    });
  });

  it("affiche le loader pendant le chargement", () => {
    // On force le chargement
    jest
      .spyOn(React, "useState")
      .mockImplementationOnce(() => [true, jest.fn()]);
    render(<QuranScreen />);
    expect(screen.getByTestId("ActivityIndicator")).toBeTruthy();
  });
});
