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
        return Promise.resolve(JSON.stringify({ isVip: true }));
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
});
