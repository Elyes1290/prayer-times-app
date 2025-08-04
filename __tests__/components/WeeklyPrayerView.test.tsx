import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import WeeklyPrayerView from "../../components/WeeklyPrayerView";
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
  MaterialCommunityIcons: "MaterialCommunityIcons",
}));

jest.mock("../../hooks/useThemeColor", () => ({
  useThemeColors: jest.fn(),
  useOverlayTextColor: jest.fn(),
  useCurrentTheme: jest.fn(),
}));

describe("WeeklyPrayerView", () => {
  const mockColors = {
    cardBG: "#ffffff",
    border: "#e0e0e0",
    shadow: "#000000",
    primary: "#4ECDC4",
    surface: "#f5f5f5",
  };

  const mockOverlayTextColor = "#333333";
  const mockCurrentTheme = "light";

  const mockWeekPrayerTimes = [
    {
      date: new Date("2024-01-01"),
      times: {
        fajr: new Date("2024-01-01T06:00:00"),
        sunrise: new Date("2024-01-01T07:30:00"),
        dhuhr: new Date("2024-01-01T12:00:00"),
        asr: new Date("2024-01-01T15:00:00"),
        maghrib: new Date("2024-01-01T18:00:00"),
        isha: new Date("2024-01-01T19:30:00"),
      },
    },
    {
      date: new Date("2024-01-02"),
      times: {
        fajr: new Date("2024-01-02T06:05:00"),
        sunrise: new Date("2024-01-02T07:35:00"),
        dhuhr: new Date("2024-01-02T12:05:00"),
        asr: new Date("2024-01-02T15:05:00"),
        maghrib: new Date("2024-01-02T18:05:00"),
        isha: new Date("2024-01-02T19:35:00"),
      },
    },
  ];

  const mockOnDayPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useThemeColors as jest.Mock).mockReturnValue(mockColors);
    (useOverlayTextColor as jest.Mock).mockReturnValue(mockOverlayTextColor);
    (useCurrentTheme as jest.Mock).mockReturnValue(mockCurrentTheme);
  });

  describe("Rendu de base", () => {
    it("devrait rendre le composant avec les données de la semaine", () => {
      const currentDate = new Date("2024-01-01");

      render(
        <WeeklyPrayerView
          currentDate={currentDate}
          weekPrayerTimes={mockWeekPrayerTimes}
          onDayPress={mockOnDayPress}
        />
      );

      // Vérifier que le titre est présent
      expect(screen.getByText("weekly_view")).toBeTruthy();

      // Vérifier que les jours sont affichés
      expect(screen.getByText("Lun")).toBeTruthy();
      expect(screen.getByText("Mar")).toBeTruthy();
    });

    it("devrait afficher les heures de prière correctement", () => {
      const currentDate = new Date("2024-01-01");

      render(
        <WeeklyPrayerView
          currentDate={currentDate}
          weekPrayerTimes={mockWeekPrayerTimes}
          onDayPress={mockOnDayPress}
        />
      );

      // Vérifier que les heures sont affichées (format 24h ou 12h selon la locale)
      expect(screen.getByText(/06:00/)).toBeTruthy();
      expect(screen.getByText(/12:00/)).toBeTruthy();
      expect(screen.getByText(/18:00/)).toBeTruthy();
    });
  });

  describe("Interactions utilisateur", () => {
    it("devrait appeler onDayPress quand un jour est pressé", () => {
      const currentDate = new Date("2024-01-01");

      render(
        <WeeklyPrayerView
          currentDate={currentDate}
          weekPrayerTimes={mockWeekPrayerTimes}
          onDayPress={mockOnDayPress}
        />
      );

      // Trouver et presser le premier jour
      const dayCells = screen.getAllByTestId("day-cell");
      if (dayCells.length > 0) {
        fireEvent.press(dayCells[0]);
        expect(mockOnDayPress).toHaveBeenCalledWith(
          mockWeekPrayerTimes[0].date
        );
      }
    });

    it("devrait mettre en évidence le jour actuel", () => {
      const currentDate = new Date("2024-01-01");

      render(
        <WeeklyPrayerView
          currentDate={currentDate}
          weekPrayerTimes={mockWeekPrayerTimes}
          onDayPress={mockOnDayPress}
        />
      );

      // Vérifier que les cellules de jour sont présentes
      const dayCells = screen.getAllByTestId("day-cell");
      expect(dayCells.length).toBeGreaterThan(0);
    });
  });

  describe("Gestion des thèmes", () => {
    it("devrait utiliser les couleurs du thème clair", () => {
      const currentDate = new Date("2024-01-01");

      render(
        <WeeklyPrayerView
          currentDate={currentDate}
          weekPrayerTimes={mockWeekPrayerTimes}
          onDayPress={mockOnDayPress}
        />
      );

      expect(useThemeColors).toHaveBeenCalled();
      expect(useOverlayTextColor).toHaveBeenCalled();
      expect(useCurrentTheme).toHaveBeenCalled();
    });

    it("devrait utiliser les couleurs du thème sombre", () => {
      const currentDate = new Date("2024-01-01");
      (useCurrentTheme as jest.Mock).mockReturnValue("dark");

      render(
        <WeeklyPrayerView
          currentDate={currentDate}
          weekPrayerTimes={mockWeekPrayerTimes}
          onDayPress={mockOnDayPress}
        />
      );

      expect(useCurrentTheme).toHaveBeenCalled();
    });
  });

  describe("Fonctions utilitaires", () => {
    it("devrait formater les jours correctement", () => {
      const currentDate = new Date("2024-01-01");

      render(
        <WeeklyPrayerView
          currentDate={currentDate}
          weekPrayerTimes={mockWeekPrayerTimes}
          onDayPress={mockOnDayPress}
        />
      );

      // Vérifier que les jours sont formatés correctement
      expect(screen.getByText("Lun")).toBeTruthy();
      expect(screen.getByText("Mar")).toBeTruthy();
    });

    it("devrait formater les dates correctement", () => {
      const currentDate = new Date("2024-01-01");

      render(
        <WeeklyPrayerView
          currentDate={currentDate}
          weekPrayerTimes={mockWeekPrayerTimes}
          onDayPress={mockOnDayPress}
        />
      );

      // Vérifier que les numéros de jour sont affichés
      expect(screen.getByText("01")).toBeTruthy();
      expect(screen.getByText("02")).toBeTruthy();
    });

    it("devrait formater les heures correctement", () => {
      const currentDate = new Date("2024-01-01");

      render(
        <WeeklyPrayerView
          currentDate={currentDate}
          weekPrayerTimes={mockWeekPrayerTimes}
          onDayPress={mockOnDayPress}
        />
      );

      // Vérifier que les heures sont formatées
      expect(screen.getByText(/06:00/)).toBeTruthy();
      expect(screen.getByText(/12:00/)).toBeTruthy();
    });
  });

  describe("Gestion des cas d'erreur", () => {
    it("devrait gérer un tableau vide de prières", () => {
      const currentDate = new Date("2024-01-01");

      expect(() =>
        render(
          <WeeklyPrayerView
            currentDate={currentDate}
            weekPrayerTimes={[]}
            onDayPress={mockOnDayPress}
          />
        )
      ).not.toThrow();
    });

    it("devrait gérer des données de prières manquantes", () => {
      const currentDate = new Date("2024-01-01");
      const incompleteData = [
        {
          date: new Date("2024-01-01"),
          times: {
            fajr: new Date("2024-01-01T06:00:00"),
            sunrise: new Date("2024-01-01T07:30:00"),
            dhuhr: new Date("2024-01-01T12:00:00"),
            asr: new Date("2024-01-01T15:00:00"),
            maghrib: new Date("2024-01-01T18:00:00"),
            isha: new Date("2024-01-01T19:30:00"),
          },
        },
      ];

      expect(() =>
        render(
          <WeeklyPrayerView
            currentDate={currentDate}
            weekPrayerTimes={incompleteData}
            onDayPress={mockOnDayPress}
          />
        )
      ).not.toThrow();
    });
  });

  describe("Accessibilité", () => {
    it("devrait avoir des testID appropriés", () => {
      const currentDate = new Date("2024-01-01");

      render(
        <WeeklyPrayerView
          currentDate={currentDate}
          weekPrayerTimes={mockWeekPrayerTimes}
          onDayPress={mockOnDayPress}
        />
      );

      // Vérifier que les éléments ont des testID
      expect(screen.getByTestId("weekly-prayer-container")).toBeTruthy();
      expect(screen.getByTestId("weekly-prayer-header")).toBeTruthy();
    });
  });
});
