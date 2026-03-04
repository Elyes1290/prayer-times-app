import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import PaymentCancelScreen from "../../screens/PaymentCancelScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Mock des dépendances
jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: jest.fn(),
  }),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockRouter = {
  replace: jest.fn(),
};

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
}));

const renderPaymentCancelScreen = () => {
  return render(<PaymentCancelScreen />);
};

// Mock fetch global
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ success: true }),
  })
) as jest.Mock;

describe("PaymentCancelScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Configurer getItem par défaut (pas de pending_registration)
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    
    // Configurer removeItem par défaut
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    
    // Configurer fetch par défaut
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    });
  });

  it("renders correctly with cancel message", () => {
    const { getByText } = renderPaymentCancelScreen();

    expect(getByText("❌ Paiement Annulé")).toBeTruthy();
    expect(
      getByText("Aucun montant n'a été débité de votre compte.")
    ).toBeTruthy();
    expect(getByText("Réessayer")).toBeTruthy();
    expect(getByText("Accueil")).toBeTruthy();
  });

  it("cleans up registration data on mount", async () => {
    // Simuler des données de registration en attente
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ email: "test@example.com", subscriptionType: "monthly" })
    );
    
    renderPaymentCancelScreen();

    await waitFor(() => {
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
        "pending_registration"
      );
    });
  });

  it("handles retry button press", () => {
    const { getByText } = renderPaymentCancelScreen();

    const retryButton = getByText("Réessayer");
    fireEvent.press(retryButton);

    expect(mockRouter.replace).toHaveBeenCalledWith("/settings");
  });

  it("handles home button press", () => {
    const { getByText } = renderPaymentCancelScreen();

    const homeButton = getByText("Accueil");
    fireEvent.press(homeButton);

    expect(mockRouter.replace).toHaveBeenCalledWith("/");
  });

  it("displays correct styling", () => {
    const { getByText } = renderPaymentCancelScreen();

    // Vérifier que tous les éléments principaux sont présents
    expect(getByText("❌ Paiement Annulé")).toBeTruthy();
    expect(getByText("Réessayer")).toBeTruthy();
    expect(getByText("Accueil")).toBeTruthy();
  });

  it("handles async storage cleanup error gracefully", async () => {
    // Simuler des données de registration
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ email: "test@example.com" })
    );
    
    // Mock une erreur d'AsyncStorage
    (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(
      new Error("Storage error")
    );

    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    renderPaymentCancelScreen();

    await waitFor(() => {
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
        "pending_registration"
      );
    });

    // Attendre un peu pour que l'erreur soit traitée
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(consoleSpy).toHaveBeenCalledWith(
      "❌ Erreur lors de l'annulation:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it("renders all buttons with correct accessibility", () => {
    const { getByText } = renderPaymentCancelScreen();

    const retryButton = getByText("Réessayer");
    const homeButton = getByText("Accueil");

    // Vérifier que les boutons sont présents et cliquables
    expect(retryButton).toBeTruthy();
    expect(homeButton).toBeTruthy();

    // Tester que les boutons sont pressables
    fireEvent.press(retryButton);
    fireEvent.press(homeButton);

    expect(mockRouter.replace).toHaveBeenCalledTimes(2);
  });

  it("displays correct message content", () => {
    const { getByText } = renderPaymentCancelScreen();

    // Vérifier le titre
    expect(getByText("❌ Paiement Annulé")).toBeTruthy();

    // Vérifier le message
    expect(
      getByText("Aucun montant n'a été débité de votre compte.")
    ).toBeTruthy();
  });

  it("handles multiple button presses correctly", () => {
    const { getByText } = renderPaymentCancelScreen();

    const retryButton = getByText("Réessayer");
    const homeButton = getByText("Accueil");

    // Tester plusieurs pressions
    fireEvent.press(retryButton);
    fireEvent.press(homeButton);
    fireEvent.press(retryButton);

    expect(mockRouter.replace).toHaveBeenCalledTimes(3);
    expect(mockRouter.replace).toHaveBeenNthCalledWith(1, "/settings");
    expect(mockRouter.replace).toHaveBeenNthCalledWith(2, "/");
    expect(mockRouter.replace).toHaveBeenNthCalledWith(3, "/settings");
  });

  it("performs cleanup only once on mount", async () => {
    // Simuler des données de registration
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ email: "test@example.com" })
    );
    
    renderPaymentCancelScreen();

    await waitFor(() => {
      expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(1);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
        "pending_registration"
      );
    });
  });
});
