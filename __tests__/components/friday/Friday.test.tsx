import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: jest.fn(),
    canGoBack: () => true,
  }),
}));

let mockIsFriday = true;
jest.mock("../../../hooks/useIsFriday", () => ({
  useIsFriday: () => mockIsFriday,
}));

const mockUpdateSettings = jest.fn();
jest.mock("../../../hooks/useFridaySettings", () => ({
  useFridaySettings: () => ({
    settings: { enabled: true, hour: 8, minute: 0 },
    ready: true,
    updateSettings: mockUpdateSettings,
  }),
}));

jest.mock("../../../contexts/SettingsContext", () => ({
  useSettings: () => ({ notificationsEnabled: true }),
}));

jest.mock("../../../hooks/useThemeColor", () => ({
  useThemeColors: () => ({
    cardBG: "#fff",
    primary: "#2E8B57",
    text: "#000",
    textSecondary: "#555",
    textOnPrimary: "#fff",
    border: "#ccc",
    error: "#d00",
    warning: "#e90",
  }),
  useOverlayTextColor: () => "#fff",
}));

jest.mock("../../../components/ThemedImageBackground", () => {
  const { View } = require("react-native");
  return { __esModule: true, default: ({ children }: { children: React.ReactNode }) => <View>{children}</View> };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language: "fr" } }),
}));

import FridayHomeCard from "../../../components/friday/FridayHomeCard";
import FridayScreen from "../../../screens/FridayScreen";

beforeEach(() => {
  jest.clearAllMocks();
  mockIsFriday = true;
});

describe("FridayHomeCard", () => {
  it("n'affiche rien les autres jours", () => {
    mockIsFriday = false;
    const { toJSON } = render(<FridayHomeCard />);
    expect(toJSON()).toBeNull();
  });

  it("le vendredi : ouvre l'écran Vendredi", () => {
    const { getByText } = render(<FridayHomeCard />);
    fireEvent.press(getByText("Jumu'a Moubarak"));
    expect(mockPush).toHaveBeenCalledWith("/friday");
  });
});

describe("FridayScreen", () => {
  it("le bouton mène à la sourate Al-Kahf (18)", () => {
    const { getByText } = render(<FridayScreen />);
    fireEvent.press(getByText("Lire la sourate Al-Kahf"));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/quran",
      params: { surah: "18", ts: expect.any(String) },
    });
  });

  it("affiche le rappel complet (sunnahs et sources)", () => {
    const { getByText, getAllByText } = render(<FridayScreen />);
    expect(getByText("Le ghusl")).toBeTruthy();
    expect(getByText("Se rendre tôt à la mosquée")).toBeTruthy();
    expect(getByText("L'heure où les invocations sont exaucées")).toBeTruthy();
    expect(getAllByText(/Boukhari/).length).toBeGreaterThan(3);
  });

  it("décale l'heure du rappel de 30 minutes", () => {
    const { getByLabelText } = render(<FridayScreen />);
    fireEvent.press(getByLabelText("Plus tard"));
    expect(mockUpdateSettings).toHaveBeenCalledWith({ hour: 8, minute: 30 });
    fireEvent.press(getByLabelText("Plus tôt"));
    expect(mockUpdateSettings).toHaveBeenCalledWith({ hour: 7, minute: 30 });
  });

  it("l'interrupteur désactive la notification", () => {
    const { getByLabelText } = render(<FridayScreen />);
    fireEvent(getByLabelText("Notification du vendredi"), "valueChange", false);
    expect(mockUpdateSettings).toHaveBeenCalledWith({ enabled: false });
  });
});
