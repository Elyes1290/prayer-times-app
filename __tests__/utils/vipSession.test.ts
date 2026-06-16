import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ensureVipSessionPersistence,
  isStoredUserVip,
} from "../../utils/vipSession";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe("vipSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("detects VIP from premium_user storage", async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "@prayer_app_premium_user") {
        return Promise.resolve(JSON.stringify({ is_vip: 1, isPremium: true }));
      }
      return Promise.resolve(null);
    });

    await expect(isStoredUserVip()).resolves.toBe(true);
  });

  it("detects VIP from user_data numeric flag", async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "user_data") {
        return Promise.resolve(JSON.stringify({ is_vip: 1 }));
      }
      return Promise.resolve(null);
    });

    await expect(isStoredUserVip()).resolves.toBe(true);
  });

  it("restores explicit_connection for VIP users", async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "user_data") {
        return Promise.resolve(
          JSON.stringify({ is_vip: true, email: "pere@example.com" }),
        );
      }
      return Promise.resolve(null);
    });

    await ensureVipSessionPersistence();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "explicit_connection",
      "true",
    );
  });

  it("ne considère pas isVip seul sans is_vip comme VIP", async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "@prayer_app_premium_user") {
        return Promise.resolve(
          JSON.stringify({
            isVip: true,
            isPremium: true,
            premiumType: "VIP Gratuit à Vie",
          }),
        );
      }
      return Promise.resolve(null);
    });

    await expect(isStoredUserVip()).resolves.toBe(false);
  });

  it("ne considère pas subscription_platform vip seul comme VIP", async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "user_data") {
        return Promise.resolve(
          JSON.stringify({
            subscription_platform: "vip",
            is_vip: 0,
            premium_expiry: "2099-12-31T23:59:59.000Z",
          }),
        );
      }
      return Promise.resolve(null);
    });

    await expect(isStoredUserVip()).resolves.toBe(false);
  });
});
