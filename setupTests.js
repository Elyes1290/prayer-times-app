/* global jest */

// Définir window avant d'importer react-native
if (typeof window === "undefined") {
  global.window = {};
}

// Mock de fetch
global.fetch = require("jest-fetch-mock");

// 🚀 MOCK GLOBAL ROBUSTE D'ASYNCSTORAGE
// Doit être défini AVANT tous les autres mocks
const mockAsyncStorage = {
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
};

// Mock global d'AsyncStorage (doit être le premier)
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: mockAsyncStorage,
}));

// Mock de la fenêtre et du document pour React Native Web
global.window = global;
global.window.addEventListener = () => {};
global.window.removeEventListener = () => {};

// 🎯 NOUVEAU : Mock expo-constants (cause principale des échecs)
jest.mock("expo-constants", () => ({
  expoConfig: {
    extra: {
      hadithApiKey: "test-hadith-api-key",
      apiBaseUrl: "https://test-api.com",
      premiumUrl: "https://test-premium.com",
    },
  },
  Constants: {
    expoConfig: {
      extra: {
        hadithApiKey: "test-hadith-api-key",
        apiBaseUrl: "https://test-api.com",
        premiumUrl: "https://test-premium.com",
      },
    },
  },
}));

// 🎯 NOUVEAU : Mock react-native-fs (cause des échecs QuranScreen)
jest.mock("react-native-fs", () => ({
  DocumentDirectoryPath: "/test/docs",
  CachesDirectoryPath: "/test/cache",
  downloadFile: jest.fn(() => Promise.resolve({ statusCode: 200 })),
  exists: jest.fn(() => Promise.resolve(true)),
  mkdir: jest.fn(() => Promise.resolve()),
  readFile: jest.fn(() => Promise.resolve("test content")),
  writeFile: jest.fn(() => Promise.resolve()),
  unlink: jest.fn(() => Promise.resolve()),
  stat: jest.fn(() => Promise.resolve({ size: 1024 })),
  readDir: jest.fn(() => Promise.resolve([])),
  copyFile: jest.fn(() => Promise.resolve()),
  moveFile: jest.fn(() => Promise.resolve()),
  appendFile: jest.fn(() => Promise.resolve()),
  hash: jest.fn(() => Promise.resolve("test-hash")),
  stopDownload: jest.fn(),
  resumeDownload: jest.fn(),
  isResumable: jest.fn(() => Promise.resolve(true)),
  completeHandlerIOS: jest.fn(),
  readDirAssets: jest.fn(() => Promise.resolve([])),
  existsAssets: jest.fn(() => Promise.resolve(false)),
  copyFileAssets: jest.fn(() => Promise.resolve()),
  copyAssetsFileIOS: jest.fn(() => Promise.resolve()),
  copyFileRes: jest.fn(() => Promise.resolve()),
  copyResFileIOS: jest.fn(() => Promise.resolve()),
  loadAssetsFileAsync: jest.fn(() => Promise.resolve("test content")),
  loadResFileAsync: jest.fn(() => Promise.resolve("test content")),
  getFSInfo: jest.fn(() =>
    Promise.resolve({ freeSpace: 1000000, totalSpace: 2000000 })
  ),
  getAllExternalFilesDirs: jest.fn(() => Promise.resolve([])),
  unlinkAssets: jest.fn(() => Promise.resolve()),
  existsRes: jest.fn(() => Promise.resolve(false)),
  copyResFile: jest.fn(() => Promise.resolve()),
  downloadFileAssets: jest.fn(() => Promise.resolve({ statusCode: 200 })),
  uploadFiles: jest.fn(() => Promise.resolve({ statusCode: 200 })),
  uploadFile: jest.fn(() => Promise.resolve({ statusCode: 200 })),
  touch: jest.fn(() => Promise.resolve()),
  MainBundlePath: "/test/bundle",
  LibraryDirectoryPath: "/test/library",
  ExternalDirectoryPath: "/test/external",
  ExternalCachesDirectoryPath: "/test/external-cache",
  PicturesDirectoryPath: "/test/pictures",
  TemporaryDirectoryPath: "/test/temp",
  BundleDirectoryPath: "/test/bundle",
  RoamingDirectoryPath: "/test/roaming",
  DownloadDirectoryPath: "/test/downloads",
  UploadDirectoryPath: "/test/uploads",
  VideoDirectoryPath: "/test/videos",
  AudioDirectoryPath: "/test/audio",
  DCIMDirectoryPath: "/test/dcim",
  SDCardDirectoryPath: "/test/sdcard",
  SDCardApplicationDirectoryPath: "/test/sdcard-app",
  MusicDirectoryPath: "/test/music",
  PodcastsDirectoryPath: "/test/podcasts",
  RingtonesDirectoryPath: "/test/ringtones",
  MoviesDirectoryPath: "/test/movies",
  DownloadsDirectoryPath: "/test/downloads",
  NotificationsDirectoryPath: "/test/notifications",
  ScreenshotsDirectoryPath: "/test/screenshots",
  DocumentsDirectoryPath: "/test/documents",
  SharedDirectoryPath: "/test/shared",
  LegacyExternalDirectoryPath: "/test/legacy-external",
  LegacyExternalCachesDirectoryPath: "/test/legacy-external-cache",
  LegacyPicturesDirectoryPath: "/test/legacy-pictures",
  LegacyTemporaryDirectoryPath: "/test/legacy-temp",
  LegacyBundleDirectoryPath: "/test/legacy-bundle",
  LegacyRoamingDirectoryPath: "/test/legacy-roaming",
  LegacyDownloadDirectoryPath: "/test/legacy-downloads",
  LegacyUploadDirectoryPath: "/test/legacy-uploads",
  LegacyVideoDirectoryPath: "/test/legacy-videos",
  LegacyAudioDirectoryPath: "/test/legacy-audio",
  LegacyDCIMDirectoryPath: "/test/legacy-dcim",
  LegacySDCardDirectoryPath: "/test/legacy-sdcard",
  LegacySDCardApplicationDirectoryPath: "/test/legacy-sdcard-app",
  LegacyMusicDirectoryPath: "/test/legacy-music",
  LegacyPodcastsDirectoryPath: "/test/legacy-podcasts",
  LegacyRingtonesDirectoryPath: "/test/legacy-ringtones",
  LegacyMoviesDirectoryPath: "/test/legacy-movies",
  LegacyDownloadsDirectoryPath: "/test/legacy-downloads",
  LegacyNotificationsDirectoryPath: "/test/legacy-notifications",
  LegacyScreenshotsDirectoryPath: "/test/legacy-screenshots",
  LegacyDocumentsDirectoryPath: "/test/legacy-documents",
  LegacySharedDirectoryPath: "/test/legacy-shared",
}));

// Mock des modules Expo
jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en", countryCode: "US" }],
}));

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted" })
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: {
        latitude: 48.8566,
        longitude: 2.3522,
        accuracy: 5,
      },
    })
  ),
}));

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
}));

// Mock des modules audio
jest.mock("expo-av", () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn(() =>
        Promise.resolve({
          sound: {
            playAsync: jest.fn(),
            stopAsync: jest.fn(),
            unloadAsync: jest.fn(),
          },
        })
      ),
    },
    setAudioModeAsync: jest.fn(),
  },
}));

// Mock ciblé pour useColorScheme (le SEUL mock react-native)
jest.mock("react-native/Libraries/Utilities/useColorScheme", () => ({
  __esModule: true,
  default: jest.fn(() => "light"),
}));

// 🚀 NOUVEAU : Mock react-native-safe-area-context pour useUniversalLayout
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: jest.fn(() => ({
    top: 44,
    bottom: 34,
    left: 0,
    right: 0,
  })),
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
}));

// 🎯 MOCK ciblé NativeModules.AdhanModule pour SettingsContext
try {
  const { NativeModules } = require("react-native");
  NativeModules.AdhanModule = {
    setCalculationMethod: jest.fn(),
    setLanguage: jest.fn(),
    setLocation: jest.fn(),
    setNotificationsEnabled: jest.fn(),
    setAdhanSound: jest.fn(),
    setAdhanVolume: jest.fn(),
  };
} catch (e) {
  // Ignore si react-native n'est pas dispo
}

// Supprimer les logs pendant les tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
