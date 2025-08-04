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
jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);

// Mock de la fenêtre et du document pour React Native Web
global.window = global;
global.window.addEventListener = () => {};
global.window.removeEventListener = () => {};

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

// Supprimer les logs pendant les tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
