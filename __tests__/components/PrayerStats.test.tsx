import React from "react";
import { render, screen } from "@testing-library/react-native";
import PrayerStats from "../../components/PrayerStats";
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
    surface: "#F5F5F5",
  }),
  useOverlayTextColor: () => "#000000",
  useCurrentTheme: () => "light",
}));

describe("PrayerStats", () => {
  const mockT = jest.fn((key) => key);

  const defaultProps = {
    dayLength: 720, // 12 heures
    fajrToSunrise: 90, // 1h30
    sunsetToIsha: 60, // 1h
    prayerSpacing: {
      fajrToSunrise: 90,
      sunriseToZuhr: 300, // 5h
      zuhrToAsr: 180, // 3h
      asrToMaghrib: 120, // 2h
      maghribToIsha: 90, // 1h30
    },
  };

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
    it("devrait afficher le composant avec les statistiques de prières", () => {
      render(<PrayerStats {...defaultProps} />);

      expect(screen.getByText("prayer_stats")).toBeTruthy();
      expect(screen.getByText("day_length")).toBeTruthy();
      expect(screen.getByText("fajr_to_sunrise")).toBeTruthy();
      expect(screen.getByText("sunset_to_isha")).toBeTruthy();
    });

    it("devrait afficher les durées formatées correctement", () => {
      render(<PrayerStats {...defaultProps} />);

      expect(screen.getByText("12h 0m")).toBeTruthy(); // dayLength
      expect(screen.getAllByText("1h 30m")[0]).toBeTruthy(); // fajrToSunrise (peut apparaître plusieurs fois)
      expect(screen.getByText("1h 0m")).toBeTruthy(); // sunsetToIsha
    });

    it("devrait afficher la section d'espacement des prières", () => {
      render(<PrayerStats {...defaultProps} />);

      expect(screen.getByText("prayer_spacing")).toBeTruthy();
      expect(screen.getByText("fajr_to_sunrise_time")).toBeTruthy();
      expect(screen.getByText("sunrise_to_zuhr_time")).toBeTruthy();
      expect(screen.getByText("zuhr_to_asr_time")).toBeTruthy();
      expect(screen.getByText("asr_to_maghrib_time")).toBeTruthy();
      expect(screen.getByText("maghrib_to_isha_time")).toBeTruthy();
    });

    it("devrait afficher toutes les durées d'espacement formatées", () => {
      render(<PrayerStats {...defaultProps} />);

      expect(screen.getAllByText("1h 30m").length).toBeGreaterThanOrEqual(2); // fajrToSunrise et maghribToIsha (et possiblement plus)
      expect(screen.getByText("5h 0m")).toBeTruthy(); // sunriseToZuhr
      expect(screen.getByText("3h 0m")).toBeTruthy(); // zuhrToAsr
      expect(screen.getAllByText("2h 0m")[0]).toBeTruthy(); // asrToMaghrib (peut apparaître plusieurs fois)
    });
  });

  describe("Formatage des durées", () => {
    it("devrait formater correctement les minutes en heures et minutes", () => {
      const propsWithDifferentTimes = {
        ...defaultProps,
        dayLength: 840, // 14h
        fajrToSunrise: 75, // 1h15
        sunsetToIsha: 45, // 45min
      };

      render(<PrayerStats {...propsWithDifferentTimes} />);

      expect(screen.getByText("14h 0m")).toBeTruthy();
      expect(screen.getByText("1h 15m")).toBeTruthy();
      expect(screen.getByText("0h 45m")).toBeTruthy();
    });

    it("devrait gérer les durées exactes en heures", () => {
      const propsExactHours = {
        ...defaultProps,
        dayLength: 600, // 10h exactes
        fajrToSunrise: 120, // 2h exactes
      };

      render(<PrayerStats {...propsExactHours} />);

      expect(screen.getByText("10h 0m")).toBeTruthy();
      expect(screen.getAllByText("2h 0m")[0]).toBeTruthy();
    });

    it("devrait arrondir les minutes", () => {
      const propsWithDecimalMinutes = {
        ...defaultProps,
        dayLength: 725.7, // 12h 5.7min -> 12h 6m
        fajrToSunrise: 92.3, // 1h 32.3min -> 1h 32m
      };

      render(<PrayerStats {...propsWithDecimalMinutes} />);

      expect(screen.getByText("12h 6m")).toBeTruthy();
      expect(screen.getByText("1h 32m")).toBeTruthy();
    });
  });

  describe("Cas limites", () => {
    it("devrait gérer des durées de 0 minute", () => {
      const propsWithZero = {
        ...defaultProps,
        fajrToSunrise: 0,
        sunsetToIsha: 0,
        prayerSpacing: {
          fajrToSunrise: 0,
          sunriseToZuhr: 0,
          zuhrToAsr: 0,
          asrToMaghrib: 0,
          maghribToIsha: 0,
        },
      };

      render(<PrayerStats {...propsWithZero} />);

      expect(screen.getAllByText("0h 0m")).toHaveLength(7); // Toutes les durées à 0
    });

    it("devrait gérer des durées très longues", () => {
      const propsWithLongDurations = {
        ...defaultProps,
        dayLength: 1440, // 24h
        fajrToSunrise: 360, // 6h
        sunsetToIsha: 300, // 5h
      };

      render(<PrayerStats {...propsWithLongDurations} />);

      expect(screen.getByText("24h 0m")).toBeTruthy();
      expect(screen.getByText("6h 0m")).toBeTruthy();
      expect(screen.getAllByText("5h 0m")[0]).toBeTruthy();
    });

    it("devrait gérer des durées négatives (devrait être rare)", () => {
      const propsWithNegative = {
        ...defaultProps,
        fajrToSunrise: -30, // Cas exceptionnel
      };

      render(<PrayerStats {...propsWithNegative} />);

      // Math.floor(-30 / 60) = -1, Math.round(-30 % 60) = -30
      // Le composant devrait gérer gracieusement ce cas
      expect(screen.getByText("prayer_stats")).toBeTruthy();
    });
  });

  describe("Traductions", () => {
    it("devrait utiliser les clés de traduction correctes", () => {
      render(<PrayerStats {...defaultProps} />);

      expect(mockT).toHaveBeenCalledWith("prayer_stats");
      expect(mockT).toHaveBeenCalledWith("day_length");
      expect(mockT).toHaveBeenCalledWith("fajr_to_sunrise");
      expect(mockT).toHaveBeenCalledWith("sunset_to_isha");
      expect(mockT).toHaveBeenCalledWith("prayer_spacing");
      expect(mockT).toHaveBeenCalledWith("fajr_to_sunrise_time");
      expect(mockT).toHaveBeenCalledWith("sunrise_to_zuhr_time");
      expect(mockT).toHaveBeenCalledWith("zuhr_to_asr_time");
      expect(mockT).toHaveBeenCalledWith("asr_to_maghrib_time");
      expect(mockT).toHaveBeenCalledWith("maghrib_to_isha_time");
    });
  });

  describe("Propriétés requises", () => {
    it("devrait afficher correctement avec toutes les propriétés fournies", () => {
      render(<PrayerStats {...defaultProps} />);

      // Vérifier que le composant se rend sans erreur
      expect(screen.getByText("prayer_stats")).toBeTruthy();
    });

    it("devrait afficher tous les espacements de prières", () => {
      const customSpacing = {
        dayLength: 600,
        fajrToSunrise: 60,
        sunsetToIsha: 90,
        prayerSpacing: {
          fajrToSunrise: 75,
          sunriseToZuhr: 285,
          zuhrToAsr: 195,
          asrToMaghrib: 135,
          maghribToIsha: 105,
        },
      };

      render(<PrayerStats {...customSpacing} />);

      expect(screen.getByText("1h 15m")).toBeTruthy(); // fajrToSunrise
      expect(screen.getByText("4h 45m")).toBeTruthy(); // sunriseToZuhr
      expect(screen.getByText("3h 15m")).toBeTruthy(); // zuhrToAsr
      expect(screen.getByText("2h 15m")).toBeTruthy(); // asrToMaghrib
      expect(screen.getByText("1h 45m")).toBeTruthy(); // maghribToIsha
    });
  });
});
