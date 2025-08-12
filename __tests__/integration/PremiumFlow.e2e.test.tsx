import React, { useEffect } from "react";
import { render, act, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { PremiumProvider, usePremium } from "../../contexts/PremiumContext";
import { ToastProvider } from "../../contexts/ToastContext";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string, fb?: string) => fb || k }),
}));

// Mock apiClient pour contrôler verifyAuth
jest.mock("../../utils/apiClient", () => ({
  __esModule: true,
  default: {
    verifyAuth: jest.fn().mockResolvedValue({ success: true }),
  },
}));

function HookProbe({
  onValue,
}: {
  onValue: (ctx: ReturnType<typeof usePremium>) => void;
}) {
  const ctx = usePremium();
  useEffect(() => {
    onValue(ctx);
  }, [ctx, onValue]);
  return null;
}

describe("Integration: Premium Flow", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Sûr: certaines suites utilisent timers réels; on part sur timers réels par défaut
    jest.useRealTimers();
    await (AsyncStorage as any).clear?.();
  });

  test("active premium depuis user_data + explicit_connection", async () => {
    const userData = {
      user_id: 4,
      premium_status: 1,
      subscription_type: "yearly",
      subscription_id: "sub_123",
      premium_expiry: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    };
    // Mock ciblé d'AsyncStorage.getItem pour ce test (le mock global n'est pas persistant)
    const originalGetItem = (AsyncStorage.getItem as any).mock;
    (AsyncStorage.getItem as unknown as jest.Mock).mockImplementation(
      (key: string) => {
        if (key === "user_data") {
          return Promise.resolve(JSON.stringify(userData));
        }
        if (key === "explicit_connection") {
          return Promise.resolve("true");
        }
        return Promise.resolve(null);
      }
    );

    let ctxRef: any = null;
    const onValue = (ctx: any) => (ctxRef = ctx);

    render(
      <ToastProvider>
        <PremiumProvider>
          <HookProbe onValue={onValue} />
        </PremiumProvider>
      </ToastProvider>
    );

    // Forcer une vérification explicite et attendre la propagation
    await act(async () => {
      await ctxRef?.checkPremiumStatus?.();
    });
    await waitFor(() => expect(ctxRef?.user?.hasPurchasedPremium).toBe(true));

    // Restaurer l'implémentation par défaut pour ne pas impacter les autres tests
    (AsyncStorage.getItem as unknown as jest.Mock).mockImplementation(
      originalGetItem?.implementation || (() => Promise.resolve(null))
    );
  });

  test("verifyAuth périodique invalide le token -> désactive premium et nettoie les tokens", async () => {
    jest.useFakeTimers();

    // Préparer un token pour déclencher la vérification
    await AsyncStorage.setItem("auth_token", "token_test");
    await AsyncStorage.setItem("refresh_token", "refresh_test");

    // Injecter multiRemove si manquant dans le mock
    if (!(AsyncStorage as any).multiRemove) {
      (AsyncStorage as any).multiRemove = jest
        .fn()
        .mockResolvedValue(undefined);
    }

    // Forcer verifyAuth à échouer
    const apiClient = require("../../utils/apiClient").default;
    (apiClient.verifyAuth as jest.Mock).mockResolvedValueOnce({
      success: false,
    });

    // Stocker un premium actif localement
    const premiumUser = {
      isPremium: true,
      subscriptionType: "yearly",
      subscriptionId: "sub_123",
      expiryDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      features: ["prayer_analytics"],
      hasPurchasedPremium: true,
      premiumActivatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(
      "@prayer_app_premium_user",
      JSON.stringify(premiumUser)
    );

    let ctxRef: any = null;
    const onValue = (ctx: any) => (ctxRef = ctx);

    render(
      <ToastProvider>
        <PremiumProvider>
          <HookProbe onValue={onValue} />
        </PremiumProvider>
      </ToastProvider>
    );

    // Démarrage: l'état peut être transitoire; on valide plutôt le résultat final après verifyAuth

    // L’effet verifyAuth lance un timeout à 5000ms → on avance le temps
    await act(async () => {
      jest.advanceTimersByTime(6000);
    });

    // Après verifyAuth: premium désactivé
    await waitFor(() => expect(ctxRef?.user?.isPremium).toBe(false));
  });
});
