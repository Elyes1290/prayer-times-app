import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import { PremiumProvider, usePremium } from "../../contexts/PremiumContext";

const storage: Record<string, string> = {};

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) =>
      Promise.resolve(storage[key] ?? null)
    ),
    setItem: jest.fn((key: string, value: string) => {
      storage[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete storage[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      Object.keys(storage).forEach((key) => delete storage[key]);
      return Promise.resolve();
    }),
    multiRemove: jest.fn((keys: string[]) => {
      keys.forEach((key) => delete storage[key]);
      return Promise.resolve();
    }),
  },
}));

jest.mock("../../contexts/ToastContext", () => ({
  useToast: () => ({ showToast: jest.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string, fb?: string) => fb || k }),
}));

const mockApiClient = {
  verifyAuth: jest.fn().mockResolvedValue({ success: true }),
  getUser: jest.fn().mockResolvedValue({ success: true, data: { user_id: 1 } }),
  getPremiumPurchases: jest.fn().mockResolvedValue({ success: true, data: [] }),
  syncIosPremiumRenewal: jest.fn().mockResolvedValue({ success: true }),
};

jest.mock("../../utils/apiClient", () => ({
  __esModule: true,
  default: mockApiClient,
}));

jest.mock("../../hooks/useNetworkStatus", () => ({
  useNetworkStatus: () => ({
    isConnected: true,
    isInternetReachable: true,
    type: "wifi",
    isWifi: true,
    isCellular: false,
    isEthernet: false,
  }),
}));

jest.mock("../../utils/iapService", () => ({
  IapService: {
    getInstance: () => ({
      checkPremiumStatus: jest.fn().mockResolvedValue(false),
      getActiveEntitlementSnapshot: jest.fn().mockResolvedValue(null),
    }),
  },
}));

jest.mock("../../utils/premiumContent", () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      syncDownloadedContentWithFiles: jest
        .fn()
        .mockResolvedValue({ fixed: 0, errors: [] }),
    }),
  },
}));

jest.mock("../../utils/syncManager", () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => ({
      syncPremiumPurchase: jest.fn().mockResolvedValue(true),
    })),
  },
}));

function HookProbe({
  onValue,
}: {
  onValue: (ctx: ReturnType<typeof usePremium>) => void;
}) {
  const ctx = usePremium();
  onValue(ctx);
  return null;
}

describe("Integration: Premium Flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    Object.keys(storage).forEach((key) => delete storage[key]);
    mockApiClient.verifyAuth.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("active premium depuis user_data + explicit_connection", async () => {
    const premiumExpiry = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const premiumUserData = {
      user_id: 4,
      id: 4,
      email: "premium@test.com",
      user_first_name: "Premium",
      language: "fr",
      premium_status: 1,
      subscription_type: "yearly",
      subscription_id: "sub_123",
      premium_expiry: premiumExpiry,
    };

    storage.user_data = JSON.stringify(premiumUserData);
    storage.explicit_connection = "true";
    storage.auth_token = "test-auth-token";

    mockApiClient.getUser.mockResolvedValue({
      success: true,
      data: premiumUserData,
    });

    let ctxRef: ReturnType<typeof usePremium> | null = null;

    render(
      <PremiumProvider>
        <HookProbe onValue={(ctx) => (ctxRef = ctx)} />
      </PremiumProvider>
    );

    await waitFor(
      () => expect(ctxRef?.user?.hasPurchasedPremium).toBe(true),
      { timeout: 10000 }
    );
    expect(ctxRef?.user?.isPremium).toBe(true);
  });
});
