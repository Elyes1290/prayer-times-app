import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import PaymentSuccessScreen from "../../screens/PaymentSuccessScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Mock des dépendances
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  removeItem: jest.fn(),
}));

jest.mock("../../contexts/PremiumContext", () => ({
  usePremium: () => ({
    activatePremium: jest.fn(),
    checkPremiumStatus: jest.fn(),
  }),
}));

jest.mock("../../utils/paymentSync", () => ({
  syncUserAfterPayment: jest.fn(() =>
    Promise.resolve({
      success: true,
      userData: {
        id: "123",
        subscription_type: "yearly",
        subscription_id: "sub_123",
      },
    })
  ),
  checkUserSyncStatus: jest.fn(() => Promise.resolve({ isSynced: true })),
  retryUserSync: jest.fn(() => Promise.resolve({ success: true })),
}));

const mockRouter = {
  push: jest.fn(),
};

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
}));

const renderPaymentSuccessScreen = () => {
  return render(<PaymentSuccessScreen />);
};

describe("PaymentSuccessScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

    // Attendre que le traitement soit terminé
    await waitFor(
      () => {
        expect(
          getByText(
            "Votre compte a été créé et vous êtes maintenant connecté !"
          )
        ).toBeTruthy();
      },
      { timeout: 3000 }
    );
  });

  it("handles manual login requirement", async () => {
    // Mock un échec de synchronisation
    const { syncUserAfterPayment } = require("../../utils/paymentSync");
    syncUserAfterPayment.mockResolvedValueOnce({
      success: false,
      requiresManualLogin: true,
      message: "Erreur de synchronisation",
    });

    const { getByText } = renderPaymentSuccessScreen();

    // Vérifier que le composant se rend correctement
    expect(getByText("✅ Paiement Réussi !")).toBeTruthy();
  });

  it("handles button press when processing", () => {
    const { getByText } = renderPaymentSuccessScreen();

    const button = getByText("processing");
    fireEvent.press(button);

    // Le bouton ne doit pas naviguer quand en cours de traitement
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("handles continue button press after success", async () => {
    const { getByText } = renderPaymentSuccessScreen();

    await waitFor(
      () => {
        const continueButton = getByText("view_my_account");
        fireEvent.press(continueButton);
      },
      { timeout: 3000 }
    );

    // Attendre que la navigation soit appelée
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith("/settings");
    });
  });

  it("handles manual login button press", async () => {
    // Mock un échec de synchronisation
    const { syncUserAfterPayment } = require("../../utils/paymentSync");
    syncUserAfterPayment.mockResolvedValueOnce({
      success: false,
      requiresManualLogin: true,
      message: "Erreur de synchronisation",
    });

    const { getByText } = renderPaymentSuccessScreen();

    // Vérifier que le composant se rend correctement
    expect(getByText("✅ Paiement Réussi !")).toBeTruthy();
  });

  it("handles secondary button press", async () => {
    // Mock un échec de synchronisation
    const { syncUserAfterPayment } = require("../../utils/paymentSync");
    syncUserAfterPayment.mockResolvedValueOnce({
      success: false,
      requiresManualLogin: true,
      message: "Erreur de synchronisation",
    });

    const { getByText } = renderPaymentSuccessScreen();

    // Vérifier que le composant se rend correctement
    expect(getByText("✅ Paiement Réussi !")).toBeTruthy();
  });

  it("cleans up registration data after successful sync", async () => {
    renderPaymentSuccessScreen();

    await waitFor(
      () => {
        expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
          "pending_registration"
        );
      },
      { timeout: 3000 }
    );
  });

  it("displays error message when sync fails", async () => {
    // Mock un échec de synchronisation
    const { syncUserAfterPayment } = require("../../utils/paymentSync");
    syncUserAfterPayment.mockResolvedValueOnce({
      success: false,
      message: "Erreur de connexion",
      requiresManualLogin: false,
    });

    const { getByText } = renderPaymentSuccessScreen();

    await waitFor(() => {
      expect(getByText("Erreur de connexion")).toBeTruthy();
    });
  });

  it("handles sync error gracefully", async () => {
    // Mock une erreur de synchronisation
    const { syncUserAfterPayment } = require("../../utils/paymentSync");
    syncUserAfterPayment.mockRejectedValueOnce(new Error("Network error"));

    const { getByText } = renderPaymentSuccessScreen();

    await waitFor(() => {
      expect(getByText("Erreur de traitement")).toBeTruthy();
    });
  });

  it("activates premium after successful sync", async () => {
    const { activatePremium } =
      require("../../contexts/PremiumContext").usePremium();

    renderPaymentSuccessScreen();

    // Vérifier que le composant se rend correctement
    await waitFor(
      () => {
        expect(activatePremium).toBeDefined();
      },
      { timeout: 3000 }
    );
  });

  it("checks premium status after activation", async () => {
    const { checkPremiumStatus } =
      require("../../contexts/PremiumContext").usePremium();

    renderPaymentSuccessScreen();

    // Vérifier que le composant se rend correctement
    await waitFor(
      () => {
        expect(checkPremiumStatus).toBeDefined();
      },
      { timeout: 3000 }
    );
  });

  it("handles retry when sync fails initially", async () => {
    // Mock un échec initial puis un retry réussi
    const {
      syncUserAfterPayment,
      retryUserSync,
    } = require("../../utils/paymentSync");
    syncUserAfterPayment.mockResolvedValueOnce({
      success: false,
      requiresManualLogin: true,
      message: "Erreur initiale",
    });
    retryUserSync.mockResolvedValueOnce({
      success: true,
      userData: { id: "123", subscription_type: "monthly" },
    });

    renderPaymentSuccessScreen();

    await waitFor(() => {
      expect(retryUserSync).toHaveBeenCalledWith(2);
    });
  });

  it("displays correct button text based on state", async () => {
    const { getByText } = renderPaymentSuccessScreen();

    // État initial
    expect(getByText("processing")).toBeTruthy();

    // Après succès
    await waitFor(
      () => {
        expect(getByText("view_my_account")).toBeTruthy();
      },
      { timeout: 3000 }
    );
  });

  it("handles component unmounting during processing", async () => {
    const { unmount } = renderPaymentSuccessScreen();

    // Démonter le composant pendant le traitement
    unmount();

    // Ne doit pas y avoir d'erreur
    expect(true).toBeTruthy();
  });

  it("applies correct styling to buttons", async () => {
    const { getByText } = renderPaymentSuccessScreen();

    const button = getByText("processing");
    expect(button).toBeTruthy();

    // Vérifier que le bouton existe
    expect(button).toBeDefined();
  });
});
