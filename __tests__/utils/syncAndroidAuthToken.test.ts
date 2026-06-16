import { NativeModules, Platform } from "react-native";
import {
  clearAndroidAuthTokenSyncCache,
  syncAndroidAuthTokenIfNeeded,
} from "../../utils/syncAndroidAuthToken";

jest.mock("react-native", () => ({
  NativeModules: {
    QuranAudioServiceModule: {
      syncAuthToken: jest.fn(),
    },
  },
  Platform: { OS: "android" },
}));

describe("syncAndroidAuthToken", () => {
  beforeEach(() => {
    (Platform as { OS: string }).OS = "android";
    clearAndroidAuthTokenSyncCache();
    jest.clearAllMocks();
  });

  it("sync une seule fois pour le même token", () => {
    syncAndroidAuthTokenIfNeeded("token-abc");
    syncAndroidAuthTokenIfNeeded("token-abc");
    syncAndroidAuthTokenIfNeeded("token-abc");

    expect(
      NativeModules.QuranAudioServiceModule.syncAuthToken,
    ).toHaveBeenCalledTimes(1);
    expect(
      NativeModules.QuranAudioServiceModule.syncAuthToken,
    ).toHaveBeenCalledWith("token-abc");
  });

  it("resync après changement de token", () => {
    syncAndroidAuthTokenIfNeeded("token-a");
    syncAndroidAuthTokenIfNeeded("token-b");

    expect(
      NativeModules.QuranAudioServiceModule.syncAuthToken,
    ).toHaveBeenCalledTimes(2);
  });

  it("clearAndroidAuthTokenSyncCache envoie null au module natif", () => {
    syncAndroidAuthTokenIfNeeded("token-a");
    jest.clearAllMocks();
    clearAndroidAuthTokenSyncCache();

    expect(
      NativeModules.QuranAudioServiceModule.syncAuthToken,
    ).toHaveBeenCalledTimes(1);
    expect(
      NativeModules.QuranAudioServiceModule.syncAuthToken,
    ).toHaveBeenCalledWith(null);
  });

  it("no-op hors Android", () => {
    (Platform as { OS: string }).OS = "ios";
    syncAndroidAuthTokenIfNeeded("token-a");

    expect(
      NativeModules.QuranAudioServiceModule.syncAuthToken,
    ).not.toHaveBeenCalled();
  });
});
