import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AUTH_SESSION_STORAGE_KEYS,
  clearLocalAuthSession,
  hasExplicitAuthSession,
} from "../../utils/userAuth";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe("clearLocalAuthSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  it("removes all auth session keys", async () => {
    await clearLocalAuthSession();

    expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(
      AUTH_SESSION_STORAGE_KEYS.length,
    );
    for (const key of AUTH_SESSION_STORAGE_KEYS) {
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(key);
    }
  });

  it("detects explicit auth session only when token and flag are present", async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "auth_token") return Promise.resolve("token-123");
      if (key === "explicit_connection") return Promise.resolve("true");
      return Promise.resolve(null);
    });

    await expect(hasExplicitAuthSession()).resolves.toBe(true);

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    await expect(hasExplicitAuthSession()).resolves.toBe(false);
  });
});
