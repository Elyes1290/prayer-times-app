import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import DataDeletionScreen from "../../screens/DataDeletionScreen";
import { SettingsProvider } from "../../contexts/SettingsContext";
import { ToastProvider } from "../../contexts/ToastContext";
import { PremiumProvider } from "../../contexts/PremiumContext";

// Mock des modules
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("../../locales/i18n", () => ({
  t: (key: string) => key,
  changeLanguage: jest.fn(),
}));

jest.mock("../../utils/apiClient", () => ({
  __esModule: true,
  default: {
    submitDataDeletionRequest: jest.fn(),
  },
}));

jest.mock("../../hooks/useThemeColor", () => ({
  useCurrentTheme: () => "light",
}));

jest.mock("react-native", () => ({
  View: ({ children }: any) => children,
  Text: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("Text", props, children);
  },
  TextInput: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("Text", props, children);
  },
  TouchableOpacity: ({ children, onPress }: any) => {
    const React = require("react");
    return React.createElement("View", { onPress }, children);
  },
  ScrollView: ({ children }: any) => children,
  ActivityIndicator: () => {
    const React = require("react");
    return React.createElement("View", { "data-testid": "loading" });
  },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (style: any) => style,
  },
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: "android",
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 667 })),
  },
  useColorScheme: jest.fn(() => "light"),
  NativeModules: {
    AdhanModule: {
      setLocation: jest.fn(),
      setCalculationMethod: jest.fn(),
      saveNotificationSettings: jest.fn(),
      getSavedAutoLocation: jest.fn(),
      setAdhanVolume: jest.fn(),
      forceUpdateWidgets: jest.fn(),
      forceUpdateWidgetsWithoutClearingCache: jest.fn(),
      saveTodayPrayerTimes: jest.fn(),
      playAdhan: jest.fn(),
      stopAdhan: jest.fn(),
      setVolume: jest.fn(),
      setAdhanSound: jest.fn(),
      cancelAllAdhanAlarms: jest.fn(),
    },
  },
}));

jest.mock("../../utils/localStorageManager", () => ({
  LocalStorageManager: {
    clearAllData: jest.fn(),
    getDataSize: jest.fn(),
  },
}));

jest.mock("../../utils/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  debugLog: jest.fn(),
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <SettingsProvider>
      <ToastProvider>
        <PremiumProvider>{component}</PremiumProvider>
      </ToastProvider>
    </SettingsProvider>
  );
};

describe("DataDeletionScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("devrait afficher l'écran de suppression de compte", () => {
    const { getByText } = renderWithProviders(<DataDeletionScreen />);

    expect(getByText("Suppression de compte")).toBeTruthy();
    expect(getByText("Demander la suppression")).toBeTruthy();
  });

  it("devrait afficher les informations sur les données", () => {
    const { getByText } = renderWithProviders(<DataDeletionScreen />);

    expect(getByText("Ce qui sera supprimé")).toBeTruthy();
    expect(getByText("Votre compte utilisateur")).toBeTruthy();
    expect(getByText("Vos statistiques de prière")).toBeTruthy();
    expect(getByText("Vos favoris et paramètres")).toBeTruthy();
    expect(getByText("Vos abonnements premium")).toBeTruthy();
    expect(getByText("Toutes vos données personnelles")).toBeTruthy();
  });

  it("devrait afficher le processus de suppression", () => {
    const { getByText } = renderWithProviders(<DataDeletionScreen />);

    expect(getByText("Processus de suppression")).toBeTruthy();
    expect(getByText("Soumettez votre demande via ce formulaire")).toBeTruthy();
    expect(
      getByText("Recevez un email de confirmation avec votre numéro de demande")
    ).toBeTruthy();
    expect(
      getByText(
        "Nous traiterons votre demande dans un délai maximum de 30 jours"
      )
    ).toBeTruthy();
  });

  it("devrait afficher les champs de formulaire", () => {
    const { getByText } = renderWithProviders(<DataDeletionScreen />);

    expect(getByText("Email *")).toBeTruthy();
    expect(getByText("Raison de la suppression (optionnel)")).toBeTruthy();
    expect(getByText("Message (optionnel)")).toBeTruthy();
  });

  it("devrait afficher les informations de contact", () => {
    const { getByText } = renderWithProviders(<DataDeletionScreen />);

    expect(getByText(/Questions \? Contactez-nous à/)).toBeTruthy();
    expect(getByText("myadhan@gmail.com")).toBeTruthy();
  });

  it("devrait afficher l'avertissement", () => {
    const { getByText } = renderWithProviders(<DataDeletionScreen />);

    expect(getByText("⚠️ Attention")).toBeTruthy();
    expect(
      getByText(
        "La suppression de votre compte est définitive et irréversible. Toutes vos données seront supprimées."
      )
    ).toBeTruthy();
  });
});
