import React from "react";
import { render, act } from "@testing-library/react-native";
import { LocalStorageManager } from "../../utils/localStorageManager";

// Ce test vérifie l'intégration minimale du flux de téléchargement d'adhan
// en simulant la présence d'un contenu téléchargé et en invalidant le cache,
// afin d'éviter toute dépendance à DownloadManager natif.

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string, fb?: string) => fb || k }),
}));
jest.mock("../../locales/i18n", () => ({
  __esModule: true,
  default: { t: (k: string) => k },
  i18n: { language: "fr", changeLanguage: jest.fn(), t: (k: string) => k },
}));
// Mocks Expo modules requis par premiumContent -> audioStreaming -> cdnOptimization
jest.mock("expo-modules-core", () => ({
  NativeModule: class {},
  requireNativeModule: jest.fn(() => ({})),
  NativeModulesProxy: {},
  EventEmitter: class {},
}));
jest.mock("expo-file-system", () => ({
  readAsStringAsync: jest.fn(async () => ""),
  getInfoAsync: jest.fn(async () => ({ exists: true, size: 1024 })),
  downloadAsync: jest.fn(async () => ({
    uri: "file:///tmp/test.mp3",
    status: 200,
  })),
  writeAsStringAsync: jest.fn(async () => undefined),
  deleteAsync: jest.fn(async () => undefined),
  makeDirectoryAsync: jest.fn(async () => undefined),
  StorageAccessFramework: {},
}));

// Mocks utilitaires

describe("Integration: Adhan Download Flow", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Nettoyage du stockage premium simulé
    await LocalStorageManager.removePremium?.("DOWNLOADED_CONTENT");
  });

  test("marque un adhan comme téléchargé et invalide le cache sans erreur", async () => {
    // Simuler un état téléchargé
    const downloadedMap = {
      adhan_test_1: {
        id: "adhan_test_1",
        downloadPath: "file:///tmp/adhan_test_1.mp3",
        size: 1024,
      },
    } as any;

    await LocalStorageManager.savePremium(
      "DOWNLOADED_CONTENT" as any,
      JSON.stringify(downloadedMap),
      true,
      true
    );

    // Import classique (évite experimental vm modules)
    const PremiumContentManager = require("../../utils/premiumContent").default;
    const manager = PremiumContentManager.getInstance();

    // Invalider le cache pour forcer un rescannage dans l'app réelle
    await act(async () => {
      await manager.invalidateAdhanCache();
    });

    // Succès s'il n'y a pas d'exception et les mocks tiennent
    expect(typeof manager.invalidateAdhanCache).toBe("function");
  });
});
