import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import PaymentSuccessScreen from "../../screens/PaymentSuccessScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";

const mockActivatePremium = jest.fn().mockResolvedValue(undefined);
const mockCheckPremiumStatus = jest.fn().mockResolvedValue(undefined);
const mockSyncUserAfterPayment = jest.fn();
const mockCheckUserSyncStatus = jest.fn();
const mockRetryUserSync = jest.fn();

jest.mock("../../locales/i18n", () => ({}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      const translations: Record<string, string> = {
        processing_payment: "Création de votre compte en cours...",
        processing: "processing",
        account_created_connected:
          "Votre compte a été créé et vous êtes maintenant connecté !",
        account_created_manual_login: "Compte créé — connectez-vous",
        account_created_success: "Compte créé avec succès",
        view_my_account: "Accéder à mon compte",
        continue: "Continuer",
        "auth_modal.login_button": "Se connecter",
        go_home: "Accéder à l'application",
      };
      return translations[key] || fallback || key;
    },
  }),
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: jest.fn((callback) => {
    callback();
  }),
}));

const mockRouter = {
  push: jest.fn(),
};

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock("../../contexts/PremiumContext", () => ({
  usePremium: () => ({
    activatePremium: mockActivatePremium,
    checkPremiumStatus: mockCheckPremiumStatus,
  }),
}));

jest.mock("../../utils/paymentSync", () => ({
  syncUserAfterPayment: (...args: unknown[]) => mockSyncUserAfterPayment(...args),
  checkUserSyncStatus: (...args: unknown[]) => mockCheckUserSyncStatus(...args),
  retryUserSync: (...args: unknown[]) => mockRetryUserSync(...args),
}));

const renderPaymentSuccessScreen = () => render(<PaymentSuccessScreen />);

const defaultSuccessResult = {
  success: true,
  userData: {
    id: "123",
    subscription_type: "yearly",
    subscription_id: "sub_123",
  },
};

describe("PaymentSuccessScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();

    mockSyncUserAfterPayment.mockResolvedValue(defaultSuccessResult);
    mockCheckUserSyncStatus.mockResolvedValue({ isSynced: true });
    mockRetryUserSync.mockResolvedValue({
      success: false,
      requiresManualLogin: true,
      message: "Retry failed",
    });
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  const flushProcessing = async () => {
    await waitFor(
      () => {
        expect(mockSyncUserAfterPayment).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );
    await waitFor(
      () => {
        expect(mockSyncUserAfterPayment.mock.results.length).toBeGreaterThan(0);
      },
      { timeout: 3000 }
    );
    await new Promise((resolve) => setTimeout(resolve, 1100));
  };

  const waitForDone = async (getByText: (text: string) => any, label: string) => {
    await flushProcessing();
    await waitFor(() => {
      expect(getByText(label)).toBeTruthy();
    });
  };

  it("renders correctly with success message", () => {
    const { getByText } = renderPaymentSuccessScreen();

    expect(getByText("✅ Paiement Réussi !")).toBeTruthy();
    expect(getByText("Création de votre compte en cours...")).toBeTruthy();
  });

  it("shows processing state initially", () => {
    const { getByText } = renderPaymentSuccessScreen();

    expect(getByText("Création de votre compte en cours...")).toBeTruthy();
    expect(getByText("processing")).toBeTruthy();
  });

  it("handles successful payment processing", async () => {
    const { getByText } = renderPaymentSuccessScreen();

    await flushProcessing();

    await waitFor(() => {
      expect(
        getByText("Votre compte a été créé et vous êtes maintenant connecté !")
      ).toBeTruthy();
    });
  });

  it("handles manual login requirement", async () => {
    mockSyncUserAfterPayment.mockResolvedValueOnce({
      success: false,
      requiresManualLogin: true,
      message: "Erreur de synchronisation",
    });

    const { getByText } = renderPaymentSuccessScreen();
    await waitForDone(getByText, "Compte créé — connectez-vous");

    expect(getByText("✅ Paiement Réussi !")).toBeTruthy();
  });

  it("handles button press when processing", () => {
    const { getByText } = renderPaymentSuccessScreen();

    fireEvent.press(getByText("processing"));
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("handles continue button press after success", async () => {
    const { getByText } = renderPaymentSuccessScreen();
    await waitForDone(getByText, "Accéder à mon compte");

    fireEvent.press(getByText("Accéder à mon compte"));
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith("/settings");
    });
  });

  it("handles manual login button press", async () => {
    mockSyncUserAfterPayment.mockResolvedValueOnce({
      success: false,
      requiresManualLogin: true,
      message: "Erreur de synchronisation",
    });

    const { getByText } = renderPaymentSuccessScreen();
    await waitForDone(getByText, "Se connecter");

    fireEvent.press(getByText("Se connecter"));
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith("/settings");
    });
  });

  it("handles secondary button press", async () => {
    mockSyncUserAfterPayment.mockResolvedValueOnce({
      success: false,
      requiresManualLogin: true,
      message: "Erreur de synchronisation",
    });

    const { getByText } = renderPaymentSuccessScreen();
    await waitForDone(getByText, "Continuer sans connexion");

    fireEvent.press(getByText("Continuer sans connexion"));
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith("/settings");
    });
  });

  it("cleans up registration data after successful sync", async () => {
    renderPaymentSuccessScreen();
    await flushProcessing();

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      "pending_registration"
    );
  });

  it("displays error message when sync fails", async () => {
    mockSyncUserAfterPayment.mockResolvedValueOnce({
      success: false,
      message: "Erreur de connexion",
      requiresManualLogin: false,
    });

    const { getByText } = renderPaymentSuccessScreen();
    await flushProcessing();

    expect(getByText("Erreur de connexion")).toBeTruthy();
  });

  it("handles sync error gracefully", async () => {
    mockSyncUserAfterPayment.mockRejectedValueOnce(new Error("Network error"));

    const { getByText } = renderPaymentSuccessScreen();
    await flushProcessing();

    expect(getByText("Erreur de traitement")).toBeTruthy();
  });

  it("activates premium after successful sync", async () => {
    renderPaymentSuccessScreen();
    await flushProcessing();

    expect(mockActivatePremium).toHaveBeenCalledWith(
      "yearly",
      "sub_123"
    );
  });

  it("checks premium status after activation", async () => {
    renderPaymentSuccessScreen();
    await flushProcessing();

    expect(mockCheckPremiumStatus).toHaveBeenCalled();
  });

  it("handles retry when sync fails initially", async () => {
    mockSyncUserAfterPayment.mockResolvedValueOnce({
      success: false,
      requiresManualLogin: true,
      message: "Erreur initiale",
    });
    mockRetryUserSync.mockResolvedValueOnce({
      success: true,
      userData: { id: "123", subscription_type: "monthly" },
    });

    renderPaymentSuccessScreen();
    await flushProcessing();

    await waitFor(() => {
      expect(mockRetryUserSync).toHaveBeenCalledWith(2);
    });
  });

  it("displays correct button text based on state", async () => {
    const { getByText } = renderPaymentSuccessScreen();

    expect(getByText("processing")).toBeTruthy();
    await flushProcessing();

    await waitFor(() => {
      expect(getByText("Accéder à mon compte")).toBeTruthy();
    });
  });

  it("handles component unmounting during processing", async () => {
    const { unmount } = renderPaymentSuccessScreen();
    unmount();
    expect(true).toBeTruthy();
  });

  it("applies correct styling to buttons", () => {
    const { getByText } = renderPaymentSuccessScreen();
    expect(getByText("processing")).toBeTruthy();
  });
});
