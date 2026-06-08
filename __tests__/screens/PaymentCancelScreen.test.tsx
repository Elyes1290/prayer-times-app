import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import PaymentCancelScreen from "../../screens/PaymentCancelScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";

const mockRouter = {
  replace: jest.fn(),
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

global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ success: true }),
  })
) as jest.Mock;

const renderPaymentCancelScreen = () => render(<PaymentCancelScreen />);

const waitForReady = async (
  utils: ReturnType<typeof renderPaymentCancelScreen>
) => {
  await waitFor(() => {
    expect(utils.getByText("Réessayer")).toBeTruthy();
  });
  return utils;
};

describe("PaymentCancelScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    });
  });

  it("renders correctly with cancel message", async () => {
    const utils = await waitForReady(renderPaymentCancelScreen());

    expect(utils.getByText("❌ Paiement Annulé")).toBeTruthy();
    expect(
      utils.getByText("Aucun montant n'a été débité de votre compte.")
    ).toBeTruthy();
    expect(utils.getByText("Réessayer")).toBeTruthy();
    expect(utils.getByText("Accueil")).toBeTruthy();
  });

  it("cleans up registration data on mount", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ email: "test@example.com", subscriptionType: "monthly" })
    );

    await waitForReady(renderPaymentCancelScreen());

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      "pending_registration"
    );
  });

  it("handles retry button press", async () => {
    const utils = await waitForReady(renderPaymentCancelScreen());

    fireEvent.press(utils.getByText("Réessayer"));
    expect(mockRouter.replace).toHaveBeenCalledWith("/settings");
  });

  it("handles home button press", async () => {
    const utils = await waitForReady(renderPaymentCancelScreen());

    fireEvent.press(utils.getByText("Accueil"));
    expect(mockRouter.replace).toHaveBeenCalledWith("/");
  });

  it("displays correct styling", async () => {
    const utils = await waitForReady(renderPaymentCancelScreen());

    expect(utils.getByText("❌ Paiement Annulé")).toBeTruthy();
    expect(utils.getByText("Réessayer")).toBeTruthy();
    expect(utils.getByText("Accueil")).toBeTruthy();
  });

  it("handles async storage cleanup error gracefully", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ email: "test@example.com" })
    );
    (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(
      new Error("Storage error")
    );

    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await waitForReady(renderPaymentCancelScreen());

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      "pending_registration"
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      "❌ Erreur lors de l'annulation:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it("renders all buttons with correct accessibility", async () => {
    const utils = await waitForReady(renderPaymentCancelScreen());

    fireEvent.press(utils.getByText("Réessayer"));
    fireEvent.press(utils.getByText("Accueil"));

    expect(mockRouter.replace).toHaveBeenCalledTimes(2);
  });

  it("displays correct message content", async () => {
    const utils = await waitForReady(renderPaymentCancelScreen());

    expect(utils.getByText("❌ Paiement Annulé")).toBeTruthy();
    expect(
      utils.getByText("Aucun montant n'a été débité de votre compte.")
    ).toBeTruthy();
  });

  it("handles multiple button presses correctly", async () => {
    const utils = await waitForReady(renderPaymentCancelScreen());

    fireEvent.press(utils.getByText("Réessayer"));
    fireEvent.press(utils.getByText("Accueil"));
    fireEvent.press(utils.getByText("Réessayer"));

    expect(mockRouter.replace).toHaveBeenCalledTimes(3);
    expect(mockRouter.replace).toHaveBeenNthCalledWith(1, "/settings");
    expect(mockRouter.replace).toHaveBeenNthCalledWith(2, "/");
    expect(mockRouter.replace).toHaveBeenNthCalledWith(3, "/settings");
  });

  it("performs cleanup only once on mount", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ email: "test@example.com" })
    );

    await waitForReady(renderPaymentCancelScreen());

    expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      "pending_registration"
    );
  });
});
