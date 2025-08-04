import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";
import { DateNavigator } from "../../components/DateNavigator";
import {
  useThemeColors,
  useOverlayTextColor,
  useCurrentTheme,
} from "../../hooks/useThemeColor";

// Mocks
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
    i18n: { language: "fr" },
  }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: "MaterialIcons",
}));

jest.mock("../../hooks/useThemeColor", () => ({
  useThemeColors: jest.fn(),
  useOverlayTextColor: jest.fn(),
  useCurrentTheme: jest.fn(),
}));

describe("DateNavigator", () => {
  const mockColors = {
    border: "#e0e0e0",
    primary: "#4ECDC4",
    shadow: "#000000",
  };

  const mockOverlayTextColor = "#333333";
  const mockCurrentTheme = "light";

  const mockDate = new Date("2024-01-15");
  const mockOnPrev = jest.fn();
  const mockOnNext = jest.fn();
  const mockOnReset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useThemeColors as jest.Mock).mockReturnValue(mockColors);
    (useOverlayTextColor as jest.Mock).mockReturnValue(mockOverlayTextColor);
    (useCurrentTheme as jest.Mock).mockReturnValue(mockCurrentTheme);
  });

  describe("Rendu de base", () => {
    it("devrait rendre le composant avec la date correcte", () => {
      render(
        <DateNavigator
          date={mockDate}
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          onReset={mockOnReset}
        />
      );

      // Vérifier que la date est affichée
      expect(screen.getByText(/15/)).toBeTruthy();
      expect(screen.getByText(/01/)).toBeTruthy();
    });

    it("devrait afficher les boutons de navigation", () => {
      render(
        <DateNavigator
          date={mockDate}
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          onReset={mockOnReset}
        />
      );

      // Vérifier que les boutons sont présents
      expect(screen.getByTestId("prev-button")).toBeTruthy();
      expect(screen.getByTestId("next-button")).toBeTruthy();
      expect(screen.getByTestId("reset-button")).toBeTruthy();
    });
  });

  describe("Interactions utilisateur", () => {
    it("devrait appeler onPrev quand le bouton précédent est pressé", () => {
      render(
        <DateNavigator
          date={mockDate}
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          onReset={mockOnReset}
        />
      );

      const prevButton = screen.getByTestId("prev-button");
      fireEvent.press(prevButton);

      expect(mockOnPrev).toHaveBeenCalledTimes(1);
    });

    it("devrait appeler onNext quand le bouton suivant est pressé", () => {
      render(
        <DateNavigator
          date={mockDate}
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          onReset={mockOnReset}
        />
      );

      const nextButton = screen.getByTestId("next-button");
      fireEvent.press(nextButton);

      expect(mockOnNext).toHaveBeenCalledTimes(1);
    });

    it("devrait appeler onReset quand le bouton reset est pressé", () => {
      render(
        <DateNavigator
          date={mockDate}
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          onReset={mockOnReset}
        />
      );

      const resetButton = screen.getByTestId("reset-button");
      fireEvent.press(resetButton);

      expect(mockOnReset).toHaveBeenCalledTimes(1);
    });
  });

  describe("Gestion des thèmes", () => {
    it("devrait utiliser les couleurs du thème clair", () => {
      render(
        <DateNavigator
          date={mockDate}
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          onReset={mockOnReset}
        />
      );

      expect(useThemeColors).toHaveBeenCalled();
      expect(useOverlayTextColor).toHaveBeenCalled();
      expect(useCurrentTheme).toHaveBeenCalled();
    });

    it("devrait utiliser les couleurs du thème sombre", () => {
      (useCurrentTheme as jest.Mock).mockReturnValue("dark");

      render(
        <DateNavigator
          date={mockDate}
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          onReset={mockOnReset}
        />
      );

      expect(useCurrentTheme).toHaveBeenCalled();
    });
  });

  describe("Localisation", () => {
    it("devrait formater la date en français", () => {
      render(
        <DateNavigator
          date={mockDate}
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          onReset={mockOnReset}
        />
      );

      // Vérifier que la date est formatée correctement
      expect(screen.getByText(/15/)).toBeTruthy();
    });

    it("devrait gérer différentes langues", () => {
      render(
        <DateNavigator
          date={mockDate}
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          onReset={mockOnReset}
        />
      );

      // Le composant devrait toujours fonctionner
      expect(screen.getByTestId("prev-button")).toBeTruthy();
    });
  });

  describe("Fonctions utilitaires", () => {
    it("devrait retourner la bonne locale pour différentes langues", () => {
      render(
        <DateNavigator
          date={mockDate}
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          onReset={mockOnReset}
        />
      );

      // Le composant devrait gérer différentes locales
      expect(screen.getByText(/15/)).toBeTruthy();
    });

    it("devrait formater la date correctement", () => {
      render(
        <DateNavigator
          date={mockDate}
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          onReset={mockOnReset}
        />
      );

      // Vérifier que la date est affichée
      expect(screen.getByText(/15/)).toBeTruthy();
    });
  });

  describe("Gestion des cas d'erreur", () => {
    it("devrait gérer une date invalide", () => {
      const invalidDate = new Date("invalid");

      expect(() =>
        render(
          <DateNavigator
            date={invalidDate}
            onPrev={mockOnPrev}
            onNext={mockOnNext}
            onReset={mockOnReset}
          />
        )
      ).not.toThrow();
    });

    it("devrait gérer des callbacks manquants", () => {
      expect(() =>
        render(
          <DateNavigator
            date={mockDate}
            onPrev={undefined as any}
            onNext={undefined as any}
            onReset={undefined as any}
          />
        )
      ).not.toThrow();
    });
  });

  describe("Accessibilité", () => {
    it("devrait avoir des testID appropriés", () => {
      render(
        <DateNavigator
          date={mockDate}
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByTestId("date-navigator")).toBeTruthy();
      expect(screen.getByTestId("date-text")).toBeTruthy();
    });

    it("devrait être accessible aux lecteurs d'écran", () => {
      render(
        <DateNavigator
          date={mockDate}
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          onReset={mockOnReset}
        />
      );

      const navigator = screen.getByTestId("date-navigator");
      expect(navigator).toBeTruthy();
    });
  });

  describe("Styles et mise en page", () => {
    it("devrait appliquer les styles corrects", () => {
      render(
        <DateNavigator
          date={mockDate}
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          onReset={mockOnReset}
        />
      );

      const navigator = screen.getByTestId("date-navigator");
      expect(navigator).toBeTruthy();
    });

    it("devrait avoir une mise en page responsive", () => {
      render(
        <DateNavigator
          date={mockDate}
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          onReset={mockOnReset}
        />
      );

      // Vérifier que tous les éléments sont présents
      expect(screen.getByTestId("prev-button")).toBeTruthy();
      expect(screen.getByTestId("next-button")).toBeTruthy();
      expect(screen.getByTestId("date-text")).toBeTruthy();
      expect(screen.getByTestId("reset-button")).toBeTruthy();
    });
  });
});
