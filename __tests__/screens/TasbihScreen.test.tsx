import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import TasbihScreen from "../../screens/TasbihScreen";
import { useTranslation } from "react-i18next";
import { Vibration } from "react-native";

jest.mock("../../locales/i18n", () => ({}));

jest.mock("react-i18next", () => ({
  useTranslation: jest.fn(),
}));

jest.mock("../../hooks/useThemeColor", () => ({
  useThemeColors: () => ({
    primary: "#4ECDC4",
    text: "#000000",
    background: "#FFFFFF",
    surface: "#F5F5F5",
    border: "#E0E0E0",
    shadow: "#000000",
    accent: "#FF6B6B",
    cardBG: "#F5F5F5",
    notification: "#FFD700",
  }),
  useOverlayTextColor: () => "#000000",
  useCurrentTheme: () => "light",
}));

jest.mock("../../components/ThemedImageBackground", () => {
  const { View } = require("react-native");
  const MockThemedImageBackground = ({ children, style }: any) => (
    <View style={style}>{children}</View>
  );
  MockThemedImageBackground.displayName = "MockThemedImageBackground";
  return MockThemedImageBackground;
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@react-navigation/native", () => ({
  useTheme: () => ({ colors: {} }),
}));

jest.mock("expo-linear-gradient", () => ({ LinearGradient: "LinearGradient" }));

jest.spyOn(Vibration, "vibrate").mockImplementation(() => {});

describe("TasbihScreen", () => {
  const mockT = jest.fn((key) => {
    switch (key) {
      case "tasbih.title":
        return "Compteur de Tasbih";
      case "tasbih.dhikr.subhanallah":
        return "Gloire à Allah";
      case "tasbih.dhikr.alhamdulillah":
        return "Louange à Allah";
      case "tasbih.dhikr.allahouakbar":
        return "Allah est le plus grand";
      case "tasbih.dhikr.la_ilaha_illallah":
        return "Nul dieu sauf Allah";
      case "tasbih.reset":
        return "Réinitialiser";
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

  it("affiche le titre, le dhikr courant et le compteur", () => {
    render(<TasbihScreen />);
    expect(screen.getByText("Compteur de Tasbih")).toBeTruthy();
    expect(screen.getByText("سُبْحَانَ اللَّهِ")).toBeTruthy();
    expect(screen.getByText("Gloire à Allah")).toBeTruthy();
    expect(screen.getByText("0")).toBeTruthy();
    expect(screen.getByText("Réinitialiser")).toBeTruthy();
  });

  it("incrémente le compteur et vibre à chaque clic", () => {
    render(<TasbihScreen />);
    const bouton = screen.getByText("0").parent;
    fireEvent.press(bouton);
    expect(screen.getByText("1")).toBeTruthy();
    expect(Vibration.vibrate).toHaveBeenCalledWith(50);
    fireEvent.press(bouton);
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("change de dhikr tous les 33 coups et boucle après 100", () => {
    render(<TasbihScreen />);
    const bouton = screen.getByText("0").parent;
    // 33 clics → change de dhikr
    for (let i = 0; i < 33; i++) {
      fireEvent.press(bouton);
    }
    expect(screen.getByText("الْحَمْدُ لِلَّهِ")).toBeTruthy();
    expect(screen.getByText("Louange à Allah")).toBeTruthy();
    // 33 de plus → change encore
    for (let i = 0; i < 33; i++) {
      fireEvent.press(bouton);
    }
    expect(screen.getByText("اللَّهُ أَكْبَرُ")).toBeTruthy();
    expect(screen.getByText("Allah est le plus grand")).toBeTruthy();
    // 34 de plus → boucle (total 100)
    for (let i = 0; i < 34; i++) {
      fireEvent.press(bouton);
    }
    // Après 100, on doit être sur le dernier dhikr ("لَا إِلَٰهَ إِلَّا اللَّهُ") et compteur à 100
    expect(screen.getByText("لَا إِلَٰهَ إِلَّا اللَّهُ")).toBeTruthy();
    expect(screen.getByText("Nul dieu sauf Allah")).toBeTruthy();
    expect(screen.getByText("100")).toBeTruthy();
    // Un clic de plus → retour au début
    fireEvent.press(bouton);
    expect(screen.getByText("سُبْحَانَ اللَّهِ")).toBeTruthy();
    expect(screen.getByText("Gloire à Allah")).toBeTruthy();
    expect(screen.getByText("0")).toBeTruthy();
  });

  it("le bouton reset remet tout à zéro", () => {
    render(<TasbihScreen />);
    const bouton = screen.getByText("0").parent;
    for (let i = 0; i < 10; i++) fireEvent.press(bouton);
    expect(screen.getByText("10")).toBeTruthy();
    fireEvent.press(screen.getByText("Réinitialiser"));
    expect(screen.getByText("0")).toBeTruthy();
    expect(screen.getByText("سُبْحَانَ اللَّهِ")).toBeTruthy();
    expect(screen.getByText("Gloire à Allah")).toBeTruthy();
  });

  it("supporte de nombreux clics sans planter", () => {
    render(<TasbihScreen />);
    const bouton = screen.getByText("0").parent;
    for (let i = 0; i < 500; i++) fireEvent.press(bouton);
    expect(screen.getByText(/\d+/)).toBeTruthy();
  });
});
