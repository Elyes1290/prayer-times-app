import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import {
  PremiumProvider,
  usePremium,
  useIsPremium,
  useHasFeature,
} from "../../contexts/PremiumContext";
import { Text } from "react-native";

const mockStorage: { [key: string]: string } = {};
const mockGetItem = jest.fn((key: string) => {
  return Promise.resolve(mockStorage[key] || null);
});
const mockSetItem = jest.fn((key: string, value: string) => {
  mockStorage[key] = value;
  return Promise.resolve();
});
const mockRemoveItem = jest.fn((key: string) => {
  delete mockStorage[key];
  return Promise.resolve();
});
const mockClear = jest.fn(() => {
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  return Promise.resolve();
});

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: mockGetItem,
    setItem: mockSetItem,
    removeItem: mockRemoveItem,
    clear: mockClear,
    multiRemove: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("../../contexts/ToastContext", () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

const mockApiClient = {
  getUser: jest.fn().mockResolvedValue({ success: true, data: { user_id: 1 } }),
  verifyAuth: jest.fn().mockResolvedValue({ success: true }),
  getPremiumPurchases: jest.fn().mockResolvedValue({ success: true, data: [] }),
  syncIosPremiumRenewal: jest.fn().mockResolvedValue({ success: true }),
};

jest.mock("../../utils/apiClient", () => ({
  __esModule: true,
  default: mockApiClient,
}));

jest.mock("../../utils/syncManager", () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => ({
      syncPremiumPurchase: jest.fn().mockResolvedValue(true),
    })),
  },
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

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

describe("PremiumContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    mockGetItem.mockImplementation((key: string) =>
      Promise.resolve(mockStorage[key] || null)
    );
  });

  describe("Initialisation", () => {
    it("should initialize with default non-premium state", async () => {
      const TestComponent = () => {
        const { user } = usePremium();
        return (
          <Text testID="premium-status">
            {user.isPremium ? "premium" : "free"}
          </Text>
        );
      };

      const { getByTestId } = render(
        <PremiumProvider>
          <TestComponent />
        </PremiumProvider>
      );

      await waitFor(() => {
        expect(getByTestId("premium-status").props.children).toBe("free");
      });
    });

    it("should have correct default user properties", async () => {
      const TestComponent = () => {
        const { user } = usePremium();
        return (
          <>
            <Text testID="isPremium">{user.isPremium.toString()}</Text>
            <Text testID="subscriptionType">
              {user.subscriptionType || "null"}
            </Text>
            <Text testID="features">{user.features.length.toString()}</Text>
            <Text testID="hasPurchasedPremium">
              {user.hasPurchasedPremium?.toString() || "false"}
            </Text>
          </>
        );
      };

      const { getByTestId } = render(
        <PremiumProvider>
          <TestComponent />
        </PremiumProvider>
      );

      await waitFor(() => {
        expect(getByTestId("isPremium").props.children).toBe("false");
      });
      expect(getByTestId("subscriptionType").props.children).toBe("null");
      expect(getByTestId("features").props.children).toBe("0");
      expect(getByTestId("hasPurchasedPremium").props.children).toBe("false");
    });
  });

  describe("Hooks Spécialisés", () => {
    it("should useIsPremium hook work correctly", async () => {
      const TestComponent = () => {
        const isPremium = useIsPremium();
        return <Text testID="isPremium">{isPremium.toString()}</Text>;
      };

      const { getByTestId } = render(
        <PremiumProvider>
          <TestComponent />
        </PremiumProvider>
      );

      await waitFor(() => {
        expect(getByTestId("isPremium").props.children).toBe("false");
      });
    });

    it("should useHasFeature hook work correctly", async () => {
      const TestComponent = () => {
        const hasFeature = useHasFeature("test-feature");
        return <Text testID="hasFeature">{hasFeature.toString()}</Text>;
      };

      const { getByTestId } = render(
        <PremiumProvider>
          <TestComponent />
        </PremiumProvider>
      );

      await waitFor(() => {
        expect(getByTestId("hasFeature").props.children).toBe("false");
      });
    });
  });

  describe("Fonctions Utilitaires", () => {
    it("should check features correctly for non-premium user", async () => {
      const TestComponent = () => {
        const { hasFeature, canUseFeature } = usePremium();
        return (
          <>
            <Text testID="feature1">{hasFeature("feature1").toString()}</Text>
            <Text testID="canUseFeature1">
              {canUseFeature("feature1").toString()}
            </Text>
          </>
        );
      };

      const { getByTestId } = render(
        <PremiumProvider>
          <TestComponent />
        </PremiumProvider>
      );

      await waitFor(() => {
        expect(getByTestId("feature1").props.children).toBe("false");
      });
      expect(getByTestId("canUseFeature1").props.children).toBe("true");
    });

    it("should provide all required context methods", async () => {
      const TestComponent = () => {
        const context = usePremium();
        return (
          <>
            <Text testID="hasCheckPremiumStatus">
              {typeof context.checkPremiumStatus === "function"
                ? "true"
                : "false"}
            </Text>
            <Text testID="hasActivatePremium">
              {typeof context.activatePremium === "function" ? "true" : "false"}
            </Text>
            <Text testID="hasDeactivatePremium">
              {typeof context.deactivatePremium === "function"
                ? "true"
                : "false"}
            </Text>
            <Text testID="hasHasFeature">
              {typeof context.hasFeature === "function" ? "true" : "false"}
            </Text>
            <Text testID="hasCanUseFeature">
              {typeof context.canUseFeature === "function" ? "true" : "false"}
            </Text>
            <Text testID="hasForceCheckConnection">
              {typeof context.forceCheckConnection === "function"
                ? "true"
                : "false"}
            </Text>
            <Text testID="hasForceLogout">
              {typeof context.forceLogout === "function" ? "true" : "false"}
            </Text>
            <Text testID="hasActivatePremiumAfterLogin">
              {typeof context.activatePremiumAfterLogin === "function"
                ? "true"
                : "false"}
            </Text>
            <Text testID="hasCheckExistingPremium">
              {typeof context.checkExistingPremium === "function"
                ? "true"
                : "false"}
            </Text>
          </>
        );
      };

      const { getByTestId } = render(
        <PremiumProvider>
          <TestComponent />
        </PremiumProvider>
      );

      await waitFor(() => {
        expect(getByTestId("hasCheckPremiumStatus").props.children).toBe("true");
      });
      expect(getByTestId("hasActivatePremium").props.children).toBe("true");
      expect(getByTestId("hasDeactivatePremium").props.children).toBe("true");
      expect(getByTestId("hasHasFeature").props.children).toBe("true");
      expect(getByTestId("hasCanUseFeature").props.children).toBe("true");
      expect(getByTestId("hasForceCheckConnection").props.children).toBe(
        "true"
      );
      expect(getByTestId("hasForceLogout").props.children).toBe("true");
      expect(getByTestId("hasActivatePremiumAfterLogin").props.children).toBe(
        "true"
      );
      expect(getByTestId("hasCheckExistingPremium").props.children).toBe(
        "true"
      );
    });
  });

  describe("Gestion des Erreurs", () => {
    it("should handle AsyncStorage errors gracefully", async () => {
      mockGetItem.mockRejectedValueOnce(new Error("Storage error"));

      const TestComponent = () => {
        const { user } = usePremium();
        return (
          <Text testID="premium-status">
            {user.isPremium ? "premium" : "free"}
          </Text>
        );
      };

      const { getByTestId } = render(
        <PremiumProvider>
          <TestComponent />
        </PremiumProvider>
      );

      await waitFor(() => {
        expect(getByTestId("premium-status").props.children).toBe("free");
      });
    });

    it("should handle invalid JSON in storage", async () => {
      mockStorage["@prayer_app_premium_user"] = "invalid json";

      const TestComponent = () => {
        const { user } = usePremium();
        return (
          <Text testID="premium-status">
            {user.isPremium ? "premium" : "free"}
          </Text>
        );
      };

      const { getByTestId } = render(
        <PremiumProvider>
          <TestComponent />
        </PremiumProvider>
      );

      await waitFor(() => {
        expect(getByTestId("premium-status").props.children).toBe("free");
      });
    });
  });

  describe("Performance et Stabilité", () => {
    it("should maintain state consistency", async () => {
      const TestComponent = () => {
        const { user } = usePremium();
        return (
          <Text testID="isPremium">{user.isPremium.toString()}</Text>
        );
      };

      const { getByTestId } = render(
        <PremiumProvider>
          <TestComponent />
        </PremiumProvider>
      );

      await waitFor(() => {
        expect(getByTestId("isPremium").props.children).toBe("false");
      });
    });
  });
});
