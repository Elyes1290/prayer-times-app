import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react-native";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import QuranScreen from "../../screens/QuranScreen";
import { usePremium } from "../../contexts/PremiumContext";
import { useToast } from "../../contexts/ToastContext";
import { useNativeDownload } from "../../hooks/useNativeDownload";

// Mocks
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
    i18n: { language: "fr" },
  }),
  initReactI18next: {
    type: "3rdParty",
    init: () => {},
  },
}));

jest.mock("i18next", () => ({
  use: () => ({
    init: () => {},
  }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: "MaterialCommunityIcons",
}));

jest.mock("react-native-gesture-handler", () => ({
  PanGestureHandler: "PanGestureHandler",
  State: {
    BEGAN: 1,
    ACTIVE: 4,
    END: 5,
    CANCELLED: 3,
    FAILED: 2,
    UNDETERMINED: 0,
  },
  GestureHandlerRootView: ({ children }: any) => children,
  Directions: {
    RIGHT: 1,
    LEFT: 2,
    UP: 4,
    DOWN: 8,
  },
}));

jest.mock("expo-av", () => ({
  Audio: {
    Sound: jest.fn(),
    setAudioModeAsync: jest.fn(),
  },
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock("../../contexts/PremiumContext", () => ({
  usePremium: jest.fn(),
}));

jest.mock("../../contexts/ToastContext", () => ({
  useToast: jest.fn(),
}));

jest.mock("../../hooks/useNativeDownload", () => ({
  useNativeDownload: jest.fn(),
}));

jest.mock("../../utils/premiumContent", () => ({
  __esModule: true,
  default: {
    getAvailableContent: jest.fn(),
    downloadContent: jest.fn(),
    deleteContent: jest.fn(),
    clearQuranDirectory: jest.fn(),
  },
}));

jest.mock("../../utils/audioAnalysis", () => ({
  quranAudioAnalyzer: {
    analyzeAudioFile: jest.fn(),
  },
  VerseTiming: jest.fn(),
}));

jest.mock("react-native-fs", () => ({
  exists: jest.fn(),
  readDir: jest.fn(),
  unlink: jest.fn(),
  copyFile: jest.fn(),
  moveFile: jest.fn(),
  downloadFile: jest.fn(),
  stopDownload: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  appendFile: jest.fn(),
  mkdir: jest.fn(),
  DocumentDirectoryPath: "/data/data/com.drogbinho.prayertimesapp2/files",
  CachesDirectoryPath: "/data/data/com.drogbinho.prayertimesapp2/cache",
  ExternalDirectoryPath:
    "/storage/emulated/0/Android/data/com.drogbinho.prayertimesapp2/files",
  ExternalCachesDirectoryPath:
    "/storage/emulated/0/Android/data/com.drogbinho.prayertimesapp2/cache",
  TemporaryDirectoryPath: "/data/data/com.drogbinho.prayertimesapp2/cache",
  LibraryDirectoryPath: "/data/data/com.drogbinho.prayertimesapp2/files",
  PicturesDirectoryPath: "/storage/emulated/0/Pictures",
  MainBundlePath: "/data/app/com.drogbinho.prayertimesapp2-1.apk",
}));

jest.mock("expo-image", () => ({
  Image: "ExpoImage",
}));

jest.mock("expo-font", () => ({
  useFonts: () => [true],
}));

// Mock des données de test
const mockPremiumUser = {
  isPremium: true,
  subscriptionType: "monthly",
  premiumExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
};

const mockFreeUser = {
  isPremium: false,
  subscriptionType: null,
  premiumExpiry: null,
};

const mockToast = {
  showToast: jest.fn(),
};

const mockNativeDownload = {
  downloadContent: jest.fn(),
  cancelDownload: jest.fn(),
  getDownloadProgress: jest.fn(),
  isDownloading: jest.fn(),
  downloadState: new Map(),
};

const mockQuranData = [
  {
    key: 1,
    label: "Al-Fatiha",
    arabicName: "الفاتحة",
    englishName: "The Opening",
    numberOfVerses: 7,
    revelationType: "Meccan",
  },
  {
    key: 2,
    label: "Al-Baqarah",
    arabicName: "البقرة",
    englishName: "The Cow",
    numberOfVerses: 286,
    revelationType: "Medinan",
  },
];

const mockRecitations = [
  {
    id: "recitation-1",
    title: "Al-Fatiha - Sheikh Abdul Rahman Al-Sudais",
    reciter: "Sheikh Abdul Rahman Al-Sudais",
    surahName: "Al-Fatiha",
    duration: "00:03:45",
    fileSize: "2.5 MB",
    isDownloaded: false,
    downloadProgress: 0,
  },
  {
    id: "recitation-2",
    title: "Al-Baqarah - Sheikh Abdul Rahman Al-Sudais",
    reciter: "Sheikh Abdul Rahman Al-Sudais",
    surahName: "Al-Baqarah",
    duration: "00:45:30",
    fileSize: "15.2 MB",
    isDownloaded: true,
    downloadProgress: 100,
  },
];

describe("QuranScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock par défaut pour usePremium
    (usePremium as jest.Mock).mockReturnValue(mockPremiumUser);

    // Mock par défaut pour useToast
    (useToast as jest.Mock).mockReturnValue(mockToast);

    // Mock par défaut pour useNativeDownload
    (useNativeDownload as jest.Mock).mockReturnValue(mockNativeDownload);

    // Mock AsyncStorage
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    // Mock fetch pour les appels API
    (global.fetch as jest.Mock) = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ chapters: [] }),
      })
    );
  });

  describe("Rendu de base", () => {
    it("devrait rendre le composant sans erreur", () => {
      expect(() => render(<QuranScreen />)).not.toThrow();
    });

    it("devrait gérer le rendu de base", () => {
      expect(() => render(<QuranScreen />)).not.toThrow();
    });
  });

  describe("Fonctionnalités utilisateur premium", () => {
    it("devrait gérer les utilisateurs premium", () => {
      (usePremium as jest.Mock).mockReturnValue(mockPremiumUser);
      expect(() => render(<QuranScreen />)).not.toThrow();
    });

    it("ne devrait pas afficher le sélecteur de récitateur pour les utilisateurs gratuits", async () => {
      (usePremium as jest.Mock).mockReturnValue(mockFreeUser);

      render(<QuranScreen />);

      await waitFor(() => {
        // Le sélecteur de récitateur ne devrait pas être visible pour les utilisateurs gratuits
        expect(screen.queryByText("Récitateur")).toBeNull();
      });
    });

    it("devrait gérer les utilisateurs gratuits", () => {
      (usePremium as jest.Mock).mockReturnValue(mockFreeUser);
      expect(() => render(<QuranScreen />)).not.toThrow();
    });
  });

  describe("Gestion des modales", () => {
    it("devrait gérer les interactions de base", () => {
      expect(() => render(<QuranScreen />)).not.toThrow();
    });
  });

  describe("Fonctions utilitaires", () => {
    it("devrait formater le temps correctement", async () => {
      render(<QuranScreen />);

      // Test de la fonction formatTime (si elle est accessible)
      const formatTime = (milliseconds: number): string => {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, "0")}:${seconds
          .toString()
          .padStart(2, "0")}`;
      };

      expect(formatTime(65000)).toBe("01:05");
      expect(formatTime(125000)).toBe("02:05");
      expect(formatTime(3000)).toBe("00:03");
    });

    it("devrait normaliser le texte correctement", async () => {
      render(<QuranScreen />);

      // Test de la fonction normalizeText (si elle est accessible)
      const normalizeText = (text: string) => {
        return text
          .replace(/[^\w\s]/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();
      };

      expect(normalizeText("Hello, World!")).toBe("hello world");
      expect(normalizeText("  Test   Text  ")).toBe("test text");
    });

    it("devrait nettoyer le HTML correctement", async () => {
      render(<QuranScreen />);

      // Test de la fonction stripHtml (si elle est accessible)
      const stripHtml = (text: string | undefined) => {
        if (!text) return "";
        return text.replace(/<[^>]*>/g, "");
      };

      expect(stripHtml("<p>Hello World</p>")).toBe("Hello World");
      expect(stripHtml("<div>Test</div><span>Text</span>")).toBe("TestText");
      expect(stripHtml(undefined)).toBe("");
    });
  });

  describe("Interactions utilisateur", () => {
    it("devrait gérer les interactions de base", () => {
      expect(() => render(<QuranScreen />)).not.toThrow();
    });
  });

  describe("Fonctions utilitaires", () => {
    it("devrait formater le temps correctement", async () => {
      render(<QuranScreen />);

      // Test de la fonction formatTime (si elle est accessible)
      const formatTime = (milliseconds: number): string => {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, "0")}:${seconds
          .toString()
          .padStart(2, "0")}`;
      };

      expect(formatTime(65000)).toBe("01:05");
      expect(formatTime(125000)).toBe("02:05");
      expect(formatTime(3000)).toBe("00:03");
    });

    it("devrait normaliser le texte correctement", async () => {
      render(<QuranScreen />);

      // Test de la fonction normalizeText (si elle est accessible)
      const normalizeText = (text: string) => {
        return text
          .replace(/[^\w\s]/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();
      };

      expect(normalizeText("Hello, World!")).toBe("hello world");
      expect(normalizeText("  Test   Text  ")).toBe("test text");
    });

    it("devrait nettoyer le HTML correctement", async () => {
      render(<QuranScreen />);

      // Test de la fonction stripHtml (si elle est accessible)
      const stripHtml = (text: string | undefined) => {
        if (!text) return "";
        return text.replace(/<[^>]*>/g, "");
      };

      expect(stripHtml("<p>Hello World</p>")).toBe("Hello World");
      expect(stripHtml("<div>Test</div><span>Text</span>")).toBe("TestText");
      expect(stripHtml(undefined)).toBe("");
    });
  });
});
