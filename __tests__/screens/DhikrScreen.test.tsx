import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { View, Platform } from "react-native";
import DhikrScreen from "../../screens/DhikrScreen";
import { useTranslation } from "react-i18next";

jest.mock("../../locales/i18n", () => ({}));

jest.mock("react-i18next", () => ({
  useTranslation: jest.fn(),
}));

jest.mock("../../components/ThemedImageBackground", () => {
  const { View } = require("react-native");
  const MockThemedImageBackground = ({ children, style }: any) => (
    <View style={style}>{children}</View>
  );
  MockThemedImageBackground.displayName = "MockThemedImageBackground";
  return MockThemedImageBackground;
});

jest.mock("../../components/FavoriteButton", () => {
  const { View } = require("react-native");
  const MockFavoriteButton = (props: any) => (
    <View testID="favorite-btn" {...props} />
  );
  MockFavoriteButton.displayName = "MockFavoriteButton";
  return MockFavoriteButton;
});

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({}),
}));

describe("DhikrScreen", () => {
  const mockT = jest.fn((key) => {
    switch (key) {
      case "dhikr.title":
        return "Invocations";
      case "dhikr.categories.dailyDua":
        return "Quotidien";
      case "dhikr.categories.morning":
        return "Matin";
      case "dhikr.categories.evening":
        return "Soir";
      case "dhikr.categories.afterSalah":
        return "Après la prière";
      case "dhikr.categories.selectedDua":
        return "Sélection";
      default:
        return key;
    }
  });

  const fakeDua = [
    {
      arabic: "سُبْحَانَ اللَّهِ",
      translation: "Gloire à Allah",
      latin: "Subhanallah",
      source: "Bukhari",
      benefits: "Vertu immense",
    },
    {
      arabic: "الْحَمْدُ لِلَّهِ",
      translation: "Louange à Allah",
      latin: "Alhamdulillah",
      source: "Muslim",
      benefits: "Apporte la paix",
    },
  ];

  beforeEach(() => {
    (useTranslation as jest.Mock).mockReturnValue({
      t: mockT,
      i18n: {
        language: "fr",
        getResource: (lang: string, ns: string) => [
          { [ns]: { no_dhikr: "Aucun dhikr" } },
          ...fakeDua,
        ],
      },
    });
    jest.clearAllMocks();
  });

  it("affiche le titre et la liste des dhikr", () => {
    render(<DhikrScreen />);
    expect(screen.getByText("Invocations")).toBeTruthy();
    expect(screen.getByText("سُبْحَانَ اللَّهِ")).toBeTruthy();
    expect(screen.getByText("Gloire à Allah")).toBeTruthy();
    expect(screen.getByText("Subhanallah")).toBeTruthy();
    expect(screen.getByText("Bukhari")).toBeTruthy();
    expect(screen.getByText("Vertu immense")).toBeTruthy();
    expect(screen.getAllByTestId("favorite-btn").length).toBeGreaterThan(0);
  });

  it("change de catégorie via le Picker ou le sélecteur iOS", () => {
    render(<DhikrScreen />);
    
    if (Platform.OS === "ios") {
      // Sur iOS, on clique sur le bouton pour ouvrir la modal, puis sur l'option
      const pickerButton = screen.getByText("Quotidien");
      fireEvent.press(pickerButton);
      const option = screen.getByText("Matin");
      fireEvent.press(option);
    } else {
      // Sur Android, on utilise le Picker
      const picker = screen.UNSAFE_getAllByType(
        require("@react-native-picker/picker").Picker
      )[0];
      fireEvent(picker, "valueChange", "morningDhikr");
    }
    expect(screen.getByText("Invocations")).toBeTruthy();
  });

  it("filtre la liste avec la recherche", () => {
    render(<DhikrScreen />);
    const input = screen.UNSAFE_getByType(require("react-native").TextInput);
    fireEvent.changeText(input, "louange");
    expect(screen.getByText("Louange à Allah")).toBeTruthy();
    expect(screen.queryByText("Gloire à Allah")).toBeNull();
  });

  it("affiche un message si aucun dhikr trouvé", () => {
    (useTranslation as jest.Mock).mockReturnValue({
      t: mockT,
      i18n: {
        language: "fr",
        getResource: (lang: string, ns: string) => [
          { [ns]: { no_dhikr: "Aucun dhikr" } },
        ],
      },
    });
    render(<DhikrScreen />);
    expect(screen.getByText("Aucun dhikr")).toBeTruthy();
  });

  it("supporte le scroll automatique avec dhikrIndex", () => {
    // Mock expo-router avec les paramètres attendus
    jest.doMock("expo-router", () => ({
      useLocalSearchParams: () => ({ dhikrIndex: "1" }),
    }));

    // Re-importer le composant pour appliquer le mock
    const DhikrScreenWithParam = require("../../screens/DhikrScreen").default;
    render(<DhikrScreenWithParam />);
    expect(screen.getByText("الْحَمْدُ لِلَّهِ")).toBeTruthy();
  });
});
