import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";

// Mocks basiques
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, params?: any) => {
      // Si params est un objet (interpolation), retourner la clé
      if (params && typeof params === "object" && !Array.isArray(params)) {
        return k;
      }
      // Sinon, params est un fallback string
      return params || k;
    },
  }),
}));
jest.mock("../../hooks/useThemeAssets", () => ({
  useThemeColors: () => ({
    background: "#fff",
    text: "#000",
    textSecondary: "#666",
    cardBG: "#eee",
    primary: "#09f",
    success: "#0a0",
    warning: "#fc0",
    error: "#f00",
    accent: "#f0f",
  }),
  useCurrentTheme: () => "light",
}));
jest.mock("../../locales/i18n", () => ({
  __esModule: true,
  default: { t: (k: string) => k },
  i18n: { language: "fr", changeLanguage: jest.fn(), t: (k: string) => k },
}));
jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: any) => children,
}));
jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));
jest.mock("../../components/ThemedImageBackground", () => ({
  __esModule: true,
  default: ({ children }: any) => children,
}));

// Mock des hooks de stats
const mockStats = {
  profile: { name: "User", consistency: "medium" },
  smart_notification: { key: "smart_tip", params: [] },
  level: { level: 1, title: "Novice", progress: 0.25 },
  points: 10,
  stats: {
    total_days: 1,
    success_rate: 50,
    total_prayers: 2,
    total_dhikr: 3,
    total_quran_verses: 1,
    total_hadiths: 0,
    total_favorites: 0,
  },
  streaks: { current_streak: 1, max_streak: 1 },
  history: Array.from({ length: 7 }, () => ({ score: 0 })),
  advice: { advice: [], action_plan: [] },
  challenges: [],
  badges: [],
};

jest.mock("../../hooks/useUserStats", () => ({
  useUserStats: () => ({
    stats: mockStats,
    loading: false,
    error: null,
    premiumRequired: false,
    lastUpdated: new Date(),
    refresh: jest.fn().mockResolvedValue(undefined),
  }),
}));
jest.mock("../../hooks/useUpdateUserStats", () => ({
  useUpdateUserStats: () => ({
    recordPrayer: jest.fn(),
    recordDhikr: jest.fn(),
    recordQuranRead: jest.fn(),
    recordHadithRead: jest.fn(),
    resetAllStats: jest.fn(),
  }),
}));

// Import après mocks pour éviter l'init i18n réel
const PrayerStatsPremiumScreen =
  require("../../screens/PrayerStatsPremiumScreen").default;

describe("PrayerStatsPremiumScreen", () => {
  // Test de refresh simplifié omis (RefreshControl sans testID)

  test("affiche un message si premiumRequired", () => {
    (jest.requireMock("../../hooks/useUserStats") as any).useUserStats =
      () => ({
        stats: null,
        loading: false,
        error: null,
        premiumRequired: true,
        lastUpdated: null,
        refresh: jest.fn(),
      });

    const { getAllByText } = render(<PrayerStatsPremiumScreen />);
    expect(getAllByText(/premium/i).length).toBeGreaterThan(0);
  });

  test("gère l'état d'erreur sans crasher", () => {
    (jest.requireMock("../../hooks/useUserStats") as any).useUserStats =
      () => ({
        stats: null,
        loading: false,
        error: "Erreur stats",
        premiumRequired: false,
        lastUpdated: null,
        refresh: jest.fn(),
      });

    render(<PrayerStatsPremiumScreen />);
  });

  test("affiche l'état vide quand stats est null", () => {
    (jest.requireMock("../../hooks/useUserStats") as any).useUserStats =
      () => ({
        stats: null,
        loading: false,
        error: null,
        premiumRequired: false,
        lastUpdated: null,
        refresh: jest.fn(),
      });

    const { getByText } = render(<PrayerStatsPremiumScreen />);
    // Quand stats est null, le composant utilise defaultStats avec profile_user
    expect(getByText("profile_user")).toBeTruthy();
    expect(getByText("stats_overview")).toBeTruthy();
  });

  test("bouton Réessayer appelle refresh() en cas d'erreur", () => {
    const mockRefresh = jest.fn();
    (jest.requireMock("../../hooks/useUserStats") as any).useUserStats =
      () => ({
        stats: null,
        loading: false,
        error: "Erreur stats",
        premiumRequired: false,
        lastUpdated: null,
        refresh: mockRefresh,
      });

    const { getByText } = render(<PrayerStatsPremiumScreen />);
    fireEvent.press(getByText("retry"));
    expect(mockRefresh).toHaveBeenCalled();
  });
});
