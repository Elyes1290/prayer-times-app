import PremiumContentManager from "../../utils/premiumContent";

// Mock des modules
jest.mock("react-native-fs", () => ({
  exists: jest.fn(),
  readDir: jest.fn(),
  unlink: jest.fn(),
  stat: jest.fn(),
  DocumentDirectoryPath: "/data/user/0/com.app/files/",
  mkdir: jest.fn(),
  downloadFile: jest.fn(() => ({
    promise: Promise.resolve({ statusCode: 200 }),
  })),
  moveFile: jest.fn(),
  copyFile: jest.fn(),
}));

jest.mock("expo-file-system", () => ({
  documentDirectory: "/data/user/0/com.app/files/",
  cacheDirectory: "/data/user/0/com.app/cache/",
  downloadAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
}));

jest.mock("../../utils/localStorageManager", () => ({
  LocalStorageManager: {
    getPremium: jest.fn(),
    setPremium: jest.fn(),
    removePremium: jest.fn(),
    savePremium: jest.fn(),
  },
}));

jest.mock("../../utils/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  debugLog: jest.fn(),
  errorLog: jest.fn(),
}));

// Mock des modules dépendants
jest.mock("../../utils/audioStreaming", () => ({
  getInstance: jest.fn(() => ({
    createStreamingSession: jest.fn(),
    startStreaming: jest.fn(),
    stopStreaming: jest.fn(),
    getStreamingStats: jest.fn(() => ({
      totalDataSaved: 0,
      activeSessions: 0,
    })),
  })),
}));

jest.mock("../../utils/cdnOptimization", () => ({
  getInstance: jest.fn(() => ({
    getOptimizedFile: jest.fn(),
  })),
}));

jest.mock("../../utils/customServerManager", () => ({
  getInstance: jest.fn(() => ({
    getAudioUrl: jest.fn(),
    recordUsage: jest.fn(),
  })),
}));

jest.mock("../../utils/nativeDownloadManager", () => ({
  default: {
    startDownload: jest.fn(),
    getDownloadStatus: jest.fn(),
    cancelDownload: jest.fn(),
  },
}));

jest.mock("../../utils/syncManager", () => ({
  getInstance: jest.fn(() => ({
    syncDownloads: jest.fn(),
  })),
}));

describe("PremiumContentManager", () => {
  const mockContent = {
    id: "test_content_1",
    type: "adhan" as const,
    title: "Test Content",
    description: "Test Description",
    fileUrl: "https://example.com/test.mp3",
    fileSize: 1024,
    version: "1.0.0",
    isDownloaded: false,
  };

  let manager: PremiumContentManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = PremiumContentManager.getInstance();
  });

  describe("Téléchargement de contenu", () => {
    it("devrait télécharger le contenu premium avec succès", async () => {
      const mockRNFS = require("react-native-fs");
      const mockLocalStorage = require("../../utils/localStorageManager");

      // Mock pour simuler un téléchargement réussi
      mockRNFS.exists.mockResolvedValue(false);
      mockRNFS.downloadFile.mockReturnValue({
        promise: Promise.resolve({ statusCode: 200 }),
      });
      mockRNFS.moveFile.mockResolvedValue(undefined);
      mockLocalStorage.LocalStorageManager.savePremium.mockResolvedValue(
        undefined
      );

      const result = await manager.downloadPremiumContent(mockContent);

      expect(result).toBe(true);
    });

    it("devrait gérer les erreurs de téléchargement", async () => {
      const mockRNFS = require("react-native-fs");
      mockRNFS.exists.mockRejectedValue(new Error("Erreur de téléchargement"));

      const result = await manager.downloadPremiumContent(mockContent);

      expect(result).toBe(false);
    });

    it("devrait vérifier si le fichier existe déjà", async () => {
      const mockRNFS = require("react-native-fs");
      const mockLocalStorage = require("../../utils/localStorageManager");

      mockRNFS.exists.mockResolvedValue(true);
      mockLocalStorage.LocalStorageManager.savePremium.mockResolvedValue(
        undefined
      );

      const result = await manager.downloadPremiumContent(mockContent);

      expect(result).toBe(true);
    });
  });

  describe("Vérification des téléchargements", () => {
    it("devrait vérifier le contenu téléchargé avec succès", async () => {
      const mockRNFS = require("react-native-fs");
      const mockLocalStorage = require("../../utils/localStorageManager");

      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.stat.mockResolvedValue({ size: 1024000 });
      mockLocalStorage.LocalStorageManager.getPremium.mockResolvedValue(
        JSON.stringify({
          test_content_1: { downloadPath: "/test/path.mp3" },
        })
      );
      mockLocalStorage.LocalStorageManager.savePremium.mockResolvedValue(
        undefined
      );

      const result = await manager.verifyAndFixDownloads();

      expect(result.totalFiles).toBeDefined();
      expect(result.validFiles).toBeDefined();
      expect(result.corruptedFiles).toBeDefined();
    });

    it("devrait détecter les fichiers manquants", async () => {
      const mockRNFS = require("react-native-fs");
      const mockLocalStorage = require("../../utils/localStorageManager");

      mockRNFS.exists.mockResolvedValue(false);
      mockLocalStorage.LocalStorageManager.getPremium.mockResolvedValue(
        JSON.stringify({
          test_content_1: { downloadPath: "/test/path.mp3" },
        })
      );
      mockLocalStorage.LocalStorageManager.savePremium.mockResolvedValue(
        undefined
      );

      const result = await manager.verifyAndFixDownloads();

      expect(result.totalFiles).toBeDefined();
      expect(result.validFiles).toBeDefined();
    });

    it("devrait gérer l'absence de contenu téléchargé", async () => {
      const mockLocalStorage = require("../../utils/localStorageManager");
      mockLocalStorage.LocalStorageManager.getPremium.mockResolvedValue(null);

      const result = await manager.verifyAndFixDownloads();

      expect(result.totalFiles).toBeDefined();
      expect(result.validFiles).toBeDefined();
    });

    it("devrait gérer les erreurs de vérification", async () => {
      const mockRNFS = require("react-native-fs");
      const mockLocalStorage = require("../../utils/localStorageManager");

      mockRNFS.exists.mockRejectedValue(new Error("Erreur de vérification"));
      mockLocalStorage.LocalStorageManager.getPremium.mockResolvedValue(
        JSON.stringify({
          test_content_1: { downloadPath: "/test/path.mp3" },
        })
      );

      const result = await manager.verifyAndFixDownloads();

      expect(result.totalFiles).toBeDefined();
      expect(result.validFiles).toBeDefined();
    });
  });

  describe("Diagnostic de persistance", () => {
    it("devrait analyser la cohérence du stockage", async () => {
      const mockRNFS = require("react-native-fs");
      const mockLocalStorage = require("../../utils/localStorageManager");

      mockRNFS.readDir.mockResolvedValue([
        { name: "test_content_1.mp3", isFile: () => true },
        { name: "other_file.mp3", isFile: () => true },
      ]);
      mockLocalStorage.LocalStorageManager.getPremium.mockResolvedValue(
        JSON.stringify({ test_content_1: { downloadPath: "/test/path.mp3" } })
      );

      const result = await manager.diagnosePersistenceIssue();

      expect(result.filesInMainDir).toBeDefined();
      expect(result.filesInNativeDir).toBeDefined();
      expect(result.asyncStorageData).toBeDefined();
    });

    it("devrait détecter les fichiers manquants", async () => {
      const mockRNFS = require("react-native-fs");
      mockRNFS.readDir.mockResolvedValue([]);

      const result = await manager.diagnosePersistenceIssue();

      expect(result.missingFiles).toBeDefined();
    });

    it("devrait détecter les fichiers orphelins", async () => {
      const mockRNFS = require("react-native-fs");
      mockRNFS.readDir.mockResolvedValue([
        { name: "orphaned_file.mp3", isFile: () => true },
      ]);

      const result = await manager.diagnosePersistenceIssue();

      expect(result.orphanedFiles).toBeDefined();
    });

    it("devrait générer des recommandations", async () => {
      const mockRNFS = require("react-native-fs");
      mockRNFS.readDir.mockResolvedValue([]);

      const result = await manager.diagnosePersistenceIssue();

      expect(result.recommendations).toBeDefined();
    });
  });

  describe("Nettoyage des téléchargements", () => {
    it("devrait nettoyer les téléchargements corrompus", async () => {
      const mockRNFS = require("react-native-fs");
      const mockLocalStorage = require("../../utils/localStorageManager");

      // Mock pour simuler des fichiers corrompus
      mockRNFS.readDir.mockResolvedValue([
        { name: "corrupted_file.mp3", isFile: () => true },
      ]);
      mockRNFS.unlink.mockResolvedValue(undefined);
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.stat.mockResolvedValue({ size: 1000 }); // Fichier trop petit
      mockLocalStorage.LocalStorageManager.getPremium.mockResolvedValue(
        JSON.stringify({
          corrupted_file: { downloadPath: "/test/corrupted_file.mp3" },
        })
      );
      mockLocalStorage.LocalStorageManager.savePremium.mockResolvedValue(
        undefined
      );

      await manager.cleanupCorruptedDownloads();

      expect(mockRNFS.unlink).toHaveBeenCalled();
    });

    it("devrait gérer les erreurs de suppression", async () => {
      const mockRNFS = require("react-native-fs");
      const mockLocalStorage = require("../../utils/localStorageManager");

      mockRNFS.readDir.mockResolvedValue([
        { name: "orphaned_file.mp3", isFile: () => true },
      ]);
      mockRNFS.unlink.mockRejectedValue(new Error("Erreur de suppression"));
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.stat.mockResolvedValue({ size: 1000 });
      mockLocalStorage.LocalStorageManager.getPremium.mockResolvedValue(
        JSON.stringify({
          orphaned_file: { downloadPath: "/test/orphaned_file.mp3" },
        })
      );

      await expect(manager.cleanupCorruptedDownloads()).resolves.not.toThrow();
    });

    it("devrait ne pas supprimer les fichiers valides", async () => {
      const mockRNFS = require("react-native-fs");
      const mockLocalStorage = require("../../utils/localStorageManager");

      mockRNFS.readDir.mockResolvedValue([
        { name: "valid_file.mp3", isFile: () => true },
      ]);
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.stat.mockResolvedValue({ size: 1024000 }); // Fichier valide (> 10KB)
      mockLocalStorage.LocalStorageManager.getPremium.mockResolvedValue(
        JSON.stringify({
          valid_file: { downloadPath: "/test/valid_file.mp3" },
        })
      );

      await manager.cleanupCorruptedDownloads();

      expect(mockRNFS.unlink).not.toHaveBeenCalled();
    });
  });

  describe("Gestion des erreurs", () => {
    it("devrait gérer les erreurs de permissions", async () => {
      const mockRNFS = require("react-native-fs");
      mockRNFS.readDir.mockRejectedValue(new Error("Permission denied"));

      const result = await manager.diagnosePersistenceIssue();

      expect(result.filesInMainDir).toEqual([]);
    });
  });

  describe("Utilitaires", () => {
    it("devrait calculer la taille totale des fichiers", async () => {
      const mockRNFS = require("react-native-fs");
      const mockLocalStorage = require("../../utils/localStorageManager");

      mockRNFS.stat.mockResolvedValue({ size: 1024000 });
      mockRNFS.exists.mockResolvedValue(true);
      mockLocalStorage.LocalStorageManager.getPremium.mockResolvedValue(
        JSON.stringify({
          test_content_1: { downloadPath: "/test/path.mp3" },
        })
      );

      const result = await manager.getPremiumContentSize();

      expect(result).toBeGreaterThan(0);
    });

    it("devrait obtenir le catalogue premium", async () => {
      const result = await manager.getPremiumCatalog();

      expect(result).toBeDefined();
    });
  });
});
