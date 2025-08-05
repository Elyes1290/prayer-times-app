import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import PremiumPaymentScreen from "../../screens/PremiumPaymentScreen";

// Mock des dépendances
jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: jest.fn(),
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("../../hooks/useThemeAssets", () => ({
  useThemeColors: () => ({
    text: { primary: "#FFFFFF", secondary: "#CCCCCC" },
    surface: "#1E1E1E",
    primary: "#007AFF",
    accent: "#FF6B6B",
    success: "#4CAF50",
    secondary: "#FFD700",
  }),
  useCurrentTheme: () => "dark",
}));

jest.mock("../../contexts/PremiumContext", () => ({
  usePremium: () => ({
    activatePremium: jest.fn(),
  }),
}));

jest.mock("../../contexts/ToastContext", () => ({
  useToast: () => ({
    showToast: jest.fn(),
  }),
}));

jest.mock("../../utils/apiClient", () => ({
  __esModule: true,
  default: {
    registerWithData: jest.fn(),
  },
}));

jest.mock("../../components/ThemedImageBackground", () => {
  const { View } = require("react-native");
  return function ThemedImageBackground({ children }: any) {
    return <View testID="themed-background">{children}</View>;
  };
});

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock Alert
jest.spyOn(Alert, "alert");

describe("PremiumPaymentScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("devrait afficher une erreur si aucune donnée d'inscription n'est trouvée", async () => {
    // Mock AsyncStorage pour retourner null (pas de données d'inscription)
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const { getByText } = render(<PremiumPaymentScreen />);

    await waitFor(() => {
      expect(getByText("Erreur")).toBeTruthy();
      expect(
        getByText(
          "Aucune donnée d'inscription trouvée. Veuillez retourner à la page d'inscription."
        )
      ).toBeTruthy();
    });
  });

  it("devrait afficher la page de paiement si des données d'inscription sont trouvées", async () => {
    // Mock AsyncStorage pour retourner des données d'inscription
    const mockRegistrationData = {
      email: "test@example.com",
      user_first_name: "Test",
    };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify(mockRegistrationData)
    );

    const { getByText } = render(<PremiumPaymentScreen />);

    await waitFor(() => {
      expect(getByText("Choisissez votre Plan Premium")).toBeTruthy();
      expect(
        getByText("Débloquez toutes les fonctionnalités premium")
      ).toBeTruthy();
      expect(getByText("Premium Mensuel")).toBeTruthy();
      expect(getByText("Premium Annuel")).toBeTruthy();
      expect(getByText("Premium Familial")).toBeTruthy();
    });
  });

  it("devrait afficher les informations de paiement", async () => {
    const mockRegistrationData = {
      email: "test@example.com",
      user_first_name: "Test",
    };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify(mockRegistrationData)
    );

    const { getByText } = render(<PremiumPaymentScreen />);

    await waitFor(() => {
      expect(getByText("Informations de Paiement")).toBeTruthy();
      expect(getByText("Email: test@example.com")).toBeTruthy();
      expect(getByText("Prénom: Test")).toBeTruthy();
    });
  });
});
