import React, { useEffect } from "react";
import { render, act, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePremium } from "../../contexts/PremiumContext";
import apiClient from "../../utils/apiClient";
import { BackupProvider, useBackup } from "../../contexts/BackupContext";

// Mocks des dépendances de contexte
jest.mock("../../contexts/PremiumContext", () => ({
  usePremium: jest.fn(),
}));
jest.mock("../../contexts/ToastContext", () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (_k: string, fb?: string) => fb || _k }),
}));
jest.mock("../../utils/apiClient", () => ({
  __esModule: true,
  default: {
    getUserBackups: jest.fn(),
    saveUserBackup: jest.fn(),
  },
}));

function Harness({
  onReady,
}: {
  onReady: (ctx: ReturnType<typeof useBackup>) => void;
}) {
  const ctx = useBackup();
  useEffect(() => {
    onReady(ctx);
  }, [ctx, onReady]);
  return null;
}

describe("BackupContext", () => {
  // In-memory AsyncStorage overlay
  const store: Record<string, string> = {};

  const setPremium = (isPremium: boolean) => {
    (usePremium as jest.Mock).mockReturnValue({ user: { isPremium } });
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    setPremium(false);
    // reset local store and override AsyncStorage methods
    for (const k of Object.keys(store)) delete store[k];
    (AsyncStorage.getItem as unknown as jest.Mock).mockImplementation(
      (key: string) =>
        Promise.resolve(
          Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null
        )
    );
    (AsyncStorage.setItem as unknown as jest.Mock).mockImplementation(
      (key: string, value: string) => {
        store[key] = value;
        return Promise.resolve();
      }
    );
    (AsyncStorage.removeItem as unknown as jest.Mock).mockImplementation(
      (key: string) => {
        delete store[key];
        return Promise.resolve();
      }
    );
    (AsyncStorage.clear as unknown as jest.Mock).mockImplementation(() => {
      for (const k of Object.keys(store)) delete store[k];
      return Promise.resolve();
    });
    await AsyncStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("non-premium: backup et signInAnonymously refusés", async () => {
    setPremium(false);
    let api: any;
    render(
      <BackupProvider>
        <Harness onReady={(ctx) => (api = ctx)} />
      </BackupProvider>
    );

    await act(async () => {
      const ok1 = await api.backupData();
      const ok2 = await api.signInAnonymously();
      expect(ok1).toBe(false);
      expect(ok2).toBe(false);
    });
  });

  test("premium: signInAnonymously nécessite user_data, puis active la session explicite", async () => {
    setPremium(true);
    await AsyncStorage.setItem(
      "user_data",
      JSON.stringify({ email: "user@test.com", device_id: "abcdef123456" })
    );
    (apiClient.getUserBackups as jest.Mock).mockResolvedValue({
      success: true,
      data: [],
    });

    let api: any;
    render(
      <BackupProvider>
        <Harness onReady={(ctx) => (api = ctx)} />
      </BackupProvider>
    );

    await act(async () => {
      const ok = await api.signInAnonymously();
      expect(ok).toBe(true);
    });
    const explicit = await AsyncStorage.getItem("explicit_connection");
    expect(explicit).toBe("true");
    await waitFor(() => expect(api.isSignedIn).toBe(true));
    expect(api.userEmail).toContain("user@test.com");
  });

  test("backupData: succès complet avec données et saveUserBackup OK", async () => {
    setPremium(true);
    await AsyncStorage.setItem(
      "user_data",
      JSON.stringify({ email: "u@t.com", device_id: "dev123" })
    );
    (apiClient.getUserBackups as jest.Mock).mockResolvedValue({
      success: true,
      data: [],
    });
    await AsyncStorage.setItem(
      "@prayer_app_favorites_local",
      JSON.stringify([{ type: "dhikr", id: "d1" }])
    );
    (apiClient.saveUserBackup as jest.Mock).mockResolvedValue({
      success: true,
    });

    let api: any;
    render(
      <BackupProvider>
        <Harness onReady={(ctx) => (api = ctx)} />
      </BackupProvider>
    );

    await act(async () => {
      await api.signInAnonymously();
    });
    await waitFor(() => expect(api.isSignedIn).toBe(true));
    const ok = await api.backupData();
    expect(ok).toBe(true);
    const last = await AsyncStorage.getItem("lastBackupTime");
    expect(last).toBeTruthy();
    expect(apiClient.saveUserBackup).toHaveBeenCalled();
  });

  test("restoreData: pas de backups -> info et false", async () => {
    setPremium(true);
    await AsyncStorage.setItem(
      "user_data",
      JSON.stringify({ email: "u@t.com", device_id: "dev123" })
    );
    await AsyncStorage.setItem("explicit_connection", "true");
    (apiClient.getUserBackups as jest.Mock).mockResolvedValue({
      success: true,
      data: [],
    });

    let api: any;
    render(
      <BackupProvider>
        <Harness onReady={(ctx) => (api = ctx)} />
      </BackupProvider>
    );

    await act(async () => {
      const ok = await api.restoreData();
      expect(ok).toBe(false);
    });
  });

  test("restoreData: applique les données du cloud et succès", async () => {
    setPremium(true);
    await AsyncStorage.setItem(
      "user_data",
      JSON.stringify({ email: "u@t.com", device_id: "dev123" })
    );
    (apiClient.getUserBackups as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: [],
    });

    const cloudPayload = {
      favorites: { dhikr: [{ id: "x", type: "dhikr" }] },
      settings: {
        userFirstName: "Elyes",
        customSettings: { a: 1 },
        userSettings: { b: 2 },
      },
      premiumData: {
        userProfile: { premium: true },
        downloadedContent: {},
        catalogCache: {},
        audioSettings: {},
      },
    };
    (apiClient.getUserBackups as jest.Mock).mockResolvedValue({
      success: true,
      data: [
        {
          backup_data: JSON.stringify(cloudPayload),
          created_at: new Date().toISOString(),
        },
      ],
    });

    let api: any;
    render(
      <BackupProvider>
        <Harness onReady={(ctx) => (api = ctx)} />
      </BackupProvider>
    );

    await act(async () => {
      await api.signInAnonymously();
    });
    await waitFor(() => expect(api.isSignedIn).toBe(true));
    const ok = await api.restoreData();
    expect(ok).toBe(true);
    const favs = await AsyncStorage.getItem("@prayer_app_favorites_local");
    expect(favs).toBeTruthy();
    const name = await AsyncStorage.getItem("userFirstName");
    expect(name).toBe("Elyes");
  });

  test("enableAutoBackup: active le flag et déclenche un backup immédiat si connecté", async () => {
    setPremium(true);
    await AsyncStorage.setItem(
      "user_data",
      JSON.stringify({ email: "u@t.com", device_id: "dev123" })
    );
    await AsyncStorage.setItem("explicit_connection", "true");
    (apiClient.saveUserBackup as jest.Mock).mockResolvedValue({
      success: true,
    });

    let api: any;
    render(
      <BackupProvider>
        <Harness onReady={(ctx) => (api = ctx)} />
      </BackupProvider>
    );

    await act(async () => {
      // d’abord ouvrir la session explicite via signIn
      await api.signInAnonymously();
      const before = await AsyncStorage.getItem("autoBackupEnabled");
      expect(before).toBeNull();
      await api.enableAutoBackup(true);
      const after = await AsyncStorage.getItem("autoBackupEnabled");
      expect(after).toBe("true");
    });
  });

  test("signOut: réinitialise l’état local et nettoie les flags", async () => {
    setPremium(true);
    await AsyncStorage.setItem("lastBackupTime", "2024-01-01T00:00:00.000Z");
    await AsyncStorage.setItem("autoBackupEnabled", "true");

    let api: any;
    render(
      <BackupProvider>
        <Harness onReady={(ctx) => (api = ctx)} />
      </BackupProvider>
    );

    await act(async () => {
      await api.signOut();
      const last = await AsyncStorage.getItem("lastBackupTime");
      expect(last).toBeNull();
      const auto = await AsyncStorage.getItem("autoBackupEnabled");
      expect(auto).toBeNull();
    });
  });

  test("migrateFavoritesFromOldSystem: migre et supprime l’ancienne clé", async () => {
    setPremium(true);
    await AsyncStorage.setItem(
      "@prayer_app_favorites",
      JSON.stringify([{ id: "old" }])
    );

    let api: any;
    render(
      <BackupProvider>
        <Harness onReady={(ctx) => (api = ctx)} />
      </BackupProvider>
    );

    await act(async () => {
      const ok = await api.migrateFavoritesFromOldSystem();
      expect(ok).toBe(true);
      expect(await AsyncStorage.getItem("@prayer_app_favorites")).toBeNull();
      expect(
        await AsyncStorage.getItem("@prayer_app_favorites_local")
      ).toBeTruthy();
    });
  });
});
