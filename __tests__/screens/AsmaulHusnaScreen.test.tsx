import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import AsmaulHusnaScreen from "../../screens/AsmaulHusnaScreen";
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

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-linear-gradient", () => ({ LinearGradient: "LinearGradient" }));

describe("AsmaulHusnaScreen", () => {
  const mockTAsma = jest.fn((key) => {
    if (key.startsWith("name_1.")) {
      switch (key) {
        case "name_1.arabic":
          return "الرَّحْمَٰنُ";
        case "name_1.translit":
          return "Ar-Rahman";
        case "name_1.french":
          return "Le Tout Miséricordieux";
        case "name_1.meaning":
          return "Le Très Miséricordieux";
        case "name_1.occurrences":
          return "57 fois dans le Coran";
        case "name_1.benefits":
          return "Apporte la miséricorde";
        default:
          return key;
      }
    }
    if (key.startsWith("name_2.")) {
      switch (key) {
        case "name_2.arabic":
          return "الرَّحِيمُ";
        case "name_2.translit":
          return "Ar-Rahim";
        case "name_2.french":
          return "Le Très Miséricordieux";
        case "name_2.meaning":
          return "Le Très Clément";
        default:
          return key;
      }
    }
    if (key.startsWith("sections.")) {
      switch (key) {
        case "sections.meaning":
          return "Signification";
        case "sections.occurrences":
          return "Occurrences";
        case "sections.benefits":
          return "Bénéfices";
        default:
          return key;
      }
    }
    return key;
  });

  beforeEach(() => {
    (useTranslation as jest.Mock).mockReturnValue({
      t: mockTAsma,
      i18n: { language: "fr" },
    });
    jest.clearAllMocks();
  });

  it("affiche la liste des noms d'Allah", () => {
    render(<AsmaulHusnaScreen />);
    expect(screen.getByText("الرَّحْمَٰنُ")).toBeTruthy();
    expect(screen.getByText("Ar-Rahman")).toBeTruthy();
    expect(screen.getByText("Le Tout Miséricordieux")).toBeTruthy();
    expect(screen.getByText("الرَّحِيمُ")).toBeTruthy();
    expect(screen.getByText("Ar-Rahim")).toBeTruthy();
    expect(
      screen.getAllByText("Le Très Miséricordieux").length
    ).toBeGreaterThan(0);
    expect(screen.getAllByTestId("favorite-btn").length).toBeGreaterThan(0);
  });

  it("affiche les détails d'un nom après expansion", () => {
    render(<AsmaulHusnaScreen />);
    const card = screen.getByText("الرَّحْمَٰنُ").parent.parent;
    fireEvent.press(card);
    expect(screen.getAllByText("Signification").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Le Très Miséricordieux").length
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Occurrences").length).toBeGreaterThan(0);
    expect(screen.getByText("57 fois dans le Coran")).toBeTruthy();
    expect(screen.getAllByText("Bénéfices").length).toBeGreaterThan(0);
    expect(screen.getByText("Apporte la miséricorde")).toBeTruthy();
  });

  it("filtre la liste avec la recherche", () => {
    render(<AsmaulHusnaScreen />);
    const input = screen.UNSAFE_getByType(require("react-native").TextInput);
    fireEvent.changeText(input, "rahman");
    expect(screen.getByText("الرَّحْمَٰنُ")).toBeTruthy();
    expect(screen.queryByText("الرَّحِيمُ")).toBeNull();
  });

  it("recherche par signification", () => {
    render(<AsmaulHusnaScreen />);
    const input = screen.UNSAFE_getByType(require("react-native").TextInput);
    fireEvent.changeText(input, "miséricordieux");
    expect(screen.getByText("الرَّحْمَٰنُ")).toBeTruthy();
    expect(screen.getByText("الرَّحِيمُ")).toBeTruthy();
  });

  it("supporte de nombreux clics sans planter", () => {
    render(<AsmaulHusnaScreen />);
    const cards = screen.getAllByText(/الرَّحْمَٰنُ|الرَّحِيمُ/);
    for (let i = 0; i < 10; i++) {
      fireEvent.press(cards[0]);
      fireEvent.press(cards[1]);
    }
    expect(screen.getByText("الرَّحْمَٰنُ")).toBeTruthy();
  });
});
