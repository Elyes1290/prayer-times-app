import React from "react";
import { render, fireEvent } from "@testing-library/react-native";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, params?: any) => {
      if (params && typeof params === "object" && !Array.isArray(params)) {
        if (k === "stats.prayers_today") return `${params.count} sur 5`;
        if (k === "stats.progress_footer") return `${params.percent}%`;
        if (k === "stats.next_prayer_hint") return `Next: ${params.prayer}`;
        if (k === "stats.heatmap_subtitle") return `${params.days} days`;
        if (k === "pending_sync_actions") return `${params.count} pending`;
        return k;
      }
      return params || k;
    },
    i18n: { language: "fr" },
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
    border: "#ccc",
  }),
}));

jest.mock("../../hooks/useThemeColor", () => ({
  useCurrentTheme: () => "light",
  useOverlayTextColor: () => "#111",
}));

jest.mock("../../components/ThemedImageBackground", () => ({
  __esModule: true,
  default: ({ children }: any) => children,
}));

jest.mock("@/components/ui/LinearGradientView", () => ({
  LinearGradient: ({ children }: any) => children,
}));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium" },
  NotificationFeedbackType: { Success: "success" },
}));

jest.mock("../../hooks/useLocation", () => ({
  useLocation: () => ({ location: null }),
}));

jest.mock("../../hooks/usePrayerTimes", () => ({
  usePrayerTimes: () => ({ prayerTimes: null, isLoading: false }),
}));

jest.mock("../../contexts/PremiumContext", () => ({
  usePremium: () => ({ user: { isPremium: true } }),
}));

jest.mock("../../utils/userAuth", () => ({
  getCurrentUserId: jest.fn().mockResolvedValue(1),
}));

const mockRefresh = jest.fn().mockResolvedValue(undefined);

const mockStats = {
  profile: { title: "beginner" },
  smart_notification: { key: "start_spiritual_journey", params: {} },
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
  history: [{ date: "2026-05-20", complete: false, prayers: 2, dhikr: 0, quran: 0, hadiths: 0 }],
  advice: { advice: [], action_plan: [] },
  challenges: [],
  badges: [],
  today_prayers: {
    fajr: true,
    dhuhr: false,
    asr: false,
    maghrib: false,
    isha: false,
  },
};

jest.mock("../../hooks/useUserStats", () => ({
  useUserStats: jest.fn(),
}));

jest.mock("../../hooks/useUpdateUserStats", () => ({
  useUpdateUserStats: () => ({
    togglePrayer: jest.fn().mockResolvedValue({ success: true }),
    recordDhikr: jest.fn(),
    recordQuranRead: jest.fn(),
    recordHadithRead: jest.fn(),
    resetAllStats: jest.fn(),
  }),
}));

const PrayerStatsPremiumScreen =
  require("../../screens/PrayerStatsPremiumScreen").default;

const defaultUseUserStats = () => ({
  stats: mockStats,
  loading: false,
  error: null,
  premiumRequired: false,
  lastUpdated: new Date(),
  isOffline: false,
  pendingActionsCount: 0,
  refresh: mockRefresh,
});

describe("PrayerStatsPremiumScreen", () => {
  beforeEach(() => {
    (jest.requireMock("../../hooks/useUserStats") as any).useUserStats.mockImplementation(
      defaultUseUserStats,
    );
    mockRefresh.mockClear();
  });

  test("affiche l'onglet Aujourd'hui avec le suivi des prières", () => {
    const { getByText } = render(<PrayerStatsPremiumScreen />);
    expect(getByText("stats.screen_title")).toBeTruthy();
    expect(getByText("stats.tab_today")).toBeTruthy();
    expect(getByText("stats.today_title")).toBeTruthy();
    expect(getByText("1/5")).toBeTruthy();
  });

  test("affiche un message si premiumRequired", () => {
    (jest.requireMock("../../hooks/useUserStats") as any).useUserStats.mockImplementation(
      () => ({
        stats: null,
        loading: false,
        error: null,
        premiumRequired: true,
        lastUpdated: null,
        isOffline: false,
        pendingActionsCount: 0,
        refresh: mockRefresh,
      }),
    );

    const { getAllByText } = render(<PrayerStatsPremiumScreen />);
    expect(getAllByText(/premium/i).length).toBeGreaterThan(0);
  });

  test("gère l'état d'erreur sans crasher", () => {
    (jest.requireMock("../../hooks/useUserStats") as any).useUserStats.mockImplementation(
      () => ({
        stats: null,
        loading: false,
        error: "Erreur stats",
        premiumRequired: false,
        lastUpdated: null,
        isOffline: false,
        pendingActionsCount: 0,
        refresh: mockRefresh,
      }),
    );

    render(<PrayerStatsPremiumScreen />);
  });

  test("bouton Réessayer appelle refresh() en cas d'erreur", () => {
    (jest.requireMock("../../hooks/useUserStats") as any).useUserStats.mockImplementation(
      () => ({
        stats: null,
        loading: false,
        error: "Erreur stats",
        premiumRequired: false,
        lastUpdated: null,
        isOffline: false,
        pendingActionsCount: 0,
        refresh: mockRefresh,
      }),
    );

    const { getByText } = render(<PrayerStatsPremiumScreen />);
    fireEvent.press(getByText("retry"));
    expect(mockRefresh).toHaveBeenCalled();
  });

  test("permet de basculer vers l'onglet Parcours", () => {
    const { getByText } = render(<PrayerStatsPremiumScreen />);
    fireEvent.press(getByText("stats.tab_journey"));
    expect(getByText("stats.heatmap_title")).toBeTruthy();
  });
});
