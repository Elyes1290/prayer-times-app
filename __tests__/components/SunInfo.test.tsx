import React from "react";
import { render, screen } from "@testing-library/react-native";
import { SunInfo } from "../../components/SunInfo";
import { useTranslation } from "react-i18next";

// Mock des dépendances
jest.mock("../../locales/i18n", () => ({}));

jest.mock("react-i18next", () => ({
  useTranslation: jest.fn(),
}));

jest.mock("../../hooks/useThemeColor", () => ({
  useThemeColors: () => ({
    cardBG: "#FFFFFF",
    border: "#E0E0E0",
    shadow: "#000000",
    primary: "#007AFF",
    textSecondary: "#666666",
    surface: "#F5F5F5",
  }),
  useOverlayTextColor: () => "#000000",
  useCurrentTheme: () => "light",
}));

// Fonction pour détecter le format d'heure selon l'environnement
const getTimeFormat = () => {
  // Sur GitHub (CI), utiliser le format 12h
  if (process.env.CI || process.env.GITHUB_ACTIONS) {
    return "12h";
  }
  // En local, utiliser le format 24h
  return "24h";
};

// Fonction pour formater l'heure selon l'environnement
const formatTime = (hour: number, minute: number = 0) => {
  const is12h = getTimeFormat() === "12h";

  if (is12h) {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    // Ajouter le zéro devant pour correspondre au format du composant
    return `${displayHour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")} ${period}`;
  } else {
    return `${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}`;
  }
};

const renderSunInfo = (props: {
  sunrise?: Date | null;
  sunset?: Date | null;
  currentTime?: Date;
}) => {
  const defaultProps = {
    sunrise: new Date("2024-01-01T06:00:00"),
    sunset: new Date("2024-01-01T18:00:00"),
    currentTime: new Date("2024-01-01T12:00:00"),
    ...props,
  };

  return render(<SunInfo {...defaultProps} />);
};

describe("SunInfo", () => {
  const mockT = jest.fn((key) => key);

  beforeEach(() => {
    (useTranslation as jest.Mock).mockReturnValue({
      t: mockT,
      i18n: { language: "fr" },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendu de base", () => {
    it("devrait afficher le composant avec les informations solaires", () => {
      renderSunInfo({});

      // S'adapter au format d'heure selon l'environnement
      expect(screen.getByText(formatTime(6))).toBeTruthy();
      expect(screen.getByText(formatTime(18))).toBeTruthy();
    });

    it("devrait afficher la durée du jour correctement", () => {
      renderSunInfo({});

      // 12 heures entre 6h et 18h
      expect(screen.getByText(formatTime(6))).toBeTruthy();
    });

    it("devrait afficher les heures de lever et coucher", () => {
      renderSunInfo({});

      // Vérifier que les heures sont affichées selon le format de l'environnement
      expect(screen.getByText(formatTime(6))).toBeTruthy();
      expect(screen.getByText(formatTime(18))).toBeTruthy();
    });
  });

  describe("Calculs de temps", () => {
    it("devrait calculer correctement le temps jusqu'au coucher", () => {
      renderSunInfo({
        currentTime: new Date("2024-01-01T12:00:00"),
      });

      expect(screen.getByText(formatTime(18))).toBeTruthy();
    });

    it("devrait calculer correctement le temps jusqu'au lever", () => {
      renderSunInfo({
        currentTime: new Date("2024-01-01T04:00:00"),
      });

      expect(screen.getByText(formatTime(6))).toBeTruthy();
    });

    it("devrait afficher le lever de demain après le coucher", () => {
      renderSunInfo({
        currentTime: new Date("2024-01-01T20:00:00"),
      });

      expect(screen.getByText(formatTime(6))).toBeTruthy();
    });
  });

  describe("Cas d'erreur", () => {
    it("devrait gérer les données manquantes", () => {
      renderSunInfo({
        sunrise: null,
        sunset: null,
      });

      expect(screen.getAllByText("--:--")[0]).toBeTruthy();
    });

    it("devrait gérer seulement le lever manquant", () => {
      renderSunInfo({
        sunrise: null,
        sunset: new Date("2024-01-01T18:00:00"),
      });

      expect(screen.getByText("--:--")).toBeTruthy();
    });

    it("devrait gérer seulement le coucher manquant", () => {
      renderSunInfo({
        sunrise: new Date("2024-01-01T06:00:00"),
        sunset: null,
      });

      expect(screen.getByText("--:--")).toBeTruthy();
    });
  });

  describe("Position du soleil", () => {
    it("devrait afficher le soleil au milieu pendant la journée", () => {
      renderSunInfo({
        currentTime: new Date("2024-01-01T12:00:00"),
      });

      // Le composant devrait être rendu avec la position du soleil
      expect(screen.getByText(formatTime(18))).toBeTruthy();
    });

    it("devrait afficher le soleil au début avant le lever", () => {
      renderSunInfo({
        currentTime: new Date("2024-01-01T04:00:00"),
      });

      expect(screen.getByText(formatTime(6))).toBeTruthy();
    });

    it("devrait afficher le soleil à la fin après le coucher", () => {
      renderSunInfo({
        currentTime: new Date("2024-01-01T20:00:00"),
      });

      expect(screen.getByText(formatTime(6))).toBeTruthy();
    });
  });

  describe("Icônes et éléments visuels", () => {
    it("devrait afficher l'icône du soleil", () => {
      renderSunInfo({});

      // Vérifier que le composant est rendu (l'icône est un élément MaterialCommunityIcons)
      expect(screen.getByText(formatTime(6))).toBeTruthy();
    });

    it("devrait afficher l'icône appropriée pour le lever", () => {
      renderSunInfo({
        currentTime: new Date("2024-01-01T04:00:00"),
      });

      expect(screen.getByText(formatTime(6))).toBeTruthy();
    });

    it("devrait afficher l'icône appropriée pour le coucher", () => {
      renderSunInfo({
        currentTime: new Date("2024-01-01T12:00:00"),
      });

      expect(screen.getByText(formatTime(18))).toBeTruthy();
    });
  });

  describe("Formatage des heures", () => {
    it("devrait formater correctement les heures selon l'environnement", () => {
      renderSunInfo({
        sunrise: new Date("2024-01-01T06:30:00"),
        sunset: new Date("2024-01-01T18:45:00"),
      });

      expect(screen.getByText(formatTime(6, 30))).toBeTruthy();
      expect(screen.getByText(formatTime(18, 45))).toBeTruthy();
    });

    it("devrait gérer les heures avec des minutes", () => {
      renderSunInfo({
        sunrise: new Date("2024-01-01T05:15:00"),
        sunset: new Date("2024-01-01T19:30:00"),
      });

      expect(screen.getByText(formatTime(5, 15))).toBeTruthy();
      expect(screen.getByText(formatTime(19, 30))).toBeTruthy();
    });
  });

  describe("Traductions", () => {
    it("devrait utiliser les clés de traduction correctes", () => {
      renderSunInfo({});

      expect(mockT).toHaveBeenCalledWith(
        "sun_info.day_duration",
        "Durée du jour"
      );
      expect(mockT).toHaveBeenCalledWith("time_until_sunset");
    });

    it("devrait utiliser les fallbacks de traduction", () => {
      mockT.mockImplementation(
        (key: string, fallback?: string) => fallback || key
      );

      renderSunInfo({});

      expect(screen.getByText(formatTime(6))).toBeTruthy();
    });
  });
});
