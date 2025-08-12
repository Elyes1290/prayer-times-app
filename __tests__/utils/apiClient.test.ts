// Mock d'AsyncStorage
const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: mockAsyncStorage,
}));

// 🎯 NOUVEAU : Mock getCurrentUserId pour éviter "Aucun utilisateur connecté"
jest.mock("../../utils/userAuth", () => ({
  __esModule: true,
  getCurrentUserId: jest.fn(() => Promise.resolve(2)), // Retourne user_id: 2 pour les tests
}));

// Mock de react-native-device-info
jest.mock("react-native-device-info", () => ({
  getUniqueId: jest.fn(),
  getBrand: jest.fn(),
  getModel: jest.fn(),
  getSystemVersion: jest.fn(),
}));
const mockDeviceInfo = require("react-native-device-info");

// Mock du require pour que l'import conditionnel fonctionne
jest.doMock("react-native-device-info", () => mockDeviceInfo);

// Mock de fetch et AbortController
global.fetch = jest.fn();
global.AbortController = jest.fn().mockImplementation(() => ({
  abort: jest.fn(),
  signal: { aborted: false },
}));

// Mock pour URLSearchParams
global.URLSearchParams = jest.fn().mockImplementation((params) => ({
  toString: () => {
    return Object.entries(params)
      .map(([key, value]) => `${key}=${value}`)
      .join("&");
  },
}));

import ApiClient, { ApiResponse, ApiError } from "../../utils/apiClient";

describe("API Client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Réinitialiser complètement le singleton ApiClient
    const ApiClientModule = require("../../utils/apiClient");

    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockDeviceInfo.getUniqueId.mockResolvedValue("test-device-123");
    mockDeviceInfo.getBrand.mockResolvedValue("TestBrand");
    mockDeviceInfo.getModel.mockResolvedValue("TestModel");
    mockDeviceInfo.getSystemVersion.mockResolvedValue("1.0.0");
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          message: "Success",
          timestamp: "2024-01-01T00:00:00Z",
          data: {},
        }),
    });
  });

  describe("Singleton Pattern", () => {
    test("should return the same instance", () => {
      // ApiClient est déjà l'instance singleton exportée
      expect(ApiClient).toBeDefined();
      expect(typeof ApiClient).toBe("object");
    });

    test("should have required methods", () => {
      expect(typeof ApiClient.createUser).toBe("function");
      expect(typeof ApiClient.login).toBe("function");
      expect(typeof ApiClient.checkConnectivity).toBe("function");
    });
  });

  describe("HTTP Request Handling", () => {
    test("should make successful GET request", async () => {
      const response = await ApiClient.getUser();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/users.php?user_id="),
        expect.objectContaining({
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        })
      );
      expect(response.success).toBe(true);
    });

    test("should make successful POST request with data", async () => {
      const userData = { user_first_name: "Test", email: "test@example.com" };

      await ApiClient.createUser(userData);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/users.php"),
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: expect.stringContaining("test@example.com"),
        })
      );
    });

    test("should handle HTTP errors", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            message: "Bad Request",
          }),
      });

      await expect(ApiClient.getUser()).rejects.toThrow(
        "HTTP 400: Bad Request"
      );
    });

    test("should handle network errors", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      await expect(ApiClient.getUser()).rejects.toThrow("Network error");
    });

    test("should handle timeout", async () => {
      const mockAbort = jest.fn();
      const mockController = {
        abort: mockAbort,
        signal: { aborted: false },
      };

      (global.AbortController as jest.Mock).mockImplementation(
        () => mockController
      );

      // Mock fetch qui simule un AbortError immédiat
      (global.fetch as jest.Mock).mockRejectedValue(
        Object.assign(new Error("Request was aborted"), { name: "AbortError" })
      );

      await expect(ApiClient.getUser()).rejects.toThrow(
        "Timeout de la requête API"
      );
    }, 2000);

    test("should handle AbortError", async () => {
      const abortError = new Error("Request was aborted");
      abortError.name = "AbortError";
      (global.fetch as jest.Mock).mockRejectedValue(abortError);

      await expect(ApiClient.getUser()).rejects.toThrow(
        "Timeout de la requête API"
      );
    });
  });

  describe("User API", () => {
    test("should create user successfully", async () => {
      const userData = {
        language: "fr",
        user_first_name: "Test User",
        email: "test@example.com",
      };

      const response = await ApiClient.createUser(userData);

      expect(response.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/users.php"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("test@example.com"),
        })
      );
    });

    test("should get user successfully", async () => {
      const response = await ApiClient.getUser();

      expect(response.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/users.php?user_id="),
        expect.objectContaining({ method: "GET" })
      );
    });

    test("should get user by email", async () => {
      const email = "test@example.com";

      await ApiClient.getUserByEmail(email);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`email=${email}`),
        expect.objectContaining({ method: "GET" })
      );
    });

    test("should update user successfully", async () => {
      const updateData = { user_first_name: "Updated Name" };

      const response = await ApiClient.updateUser(updateData);

      expect(response.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/users.php"),
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining("Updated Name"),
        })
      );
    });

    test("should sync settings successfully", async () => {
      const settings = { theme: "dark", language: "fr" };

      await ApiClient.syncSettings(settings);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("sync_settings"),
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining("dark"),
        })
      );
    });
  });

  describe("Authentication API", () => {
    test("should login successfully", async () => {
      const response = await ApiClient.login();

      expect(response.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth.php"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("login"),
        })
      );
    });

    test("should login with email", async () => {
      const email = "test@example.com";

      await ApiClient.loginWithEmail(email);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth.php"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining(email),
        })
      );
    });

    test("should login with credentials", async () => {
      const credentials = {
        email: "test@example.com",
        password: "testpass123",
      };

      await ApiClient.loginWithCredentials(credentials);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth.php"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("testpass123"),
        })
      );
    });

    test("should register successfully", async () => {
      const userData = {
        language: "en",
        user_first_name: "New User",
        email: "new@example.com",
      };

      await ApiClient.register(userData);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth.php"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("register"),
        })
      );
    });

    test("should register with complete data", async () => {
      const userData = {
        language: "fr",
        user_first_name: "Complete User",
        email: "complete@example.com",
        password: "pass123",
        premium_status: 1,
        subscription_type: "monthly",
        location_city: "Paris",
        location_lat: 48.8566,
        location_lon: 2.3522,
      };

      await ApiClient.registerWithData(userData);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth.php"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("Paris"),
        })
      );
    });

    test("should migrate from Firebase", async () => {
      const firebaseData = {
        firebase_uid: "firebase123",
        firebase_data: { some: "data" },
      };

      await ApiClient.migrateFromFirebase(firebaseData);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth.php"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("migrate_firebase"),
        })
      );
    });
  });

  describe("Favorites API", () => {
    test("should get favorites", async () => {
      await ApiClient.getFavorites();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/favorites.php?user_id="),
        expect.objectContaining({ method: "GET" })
      );
    });

    test("should get favorites by type", async () => {
      await ApiClient.getFavorites("recitation");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("type=recitation"),
        expect.objectContaining({ method: "GET" })
      );
    });

    test("should add favorite", async () => {
      const favoriteData = {
        type: "recitation",
        content: { reciter: "Al-Afasy", surah: 1 },
      };

      await ApiClient.addFavorite(favoriteData);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/favorites.php"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("Al-Afasy"),
        })
      );
    });

    test("should delete favorite", async () => {
      const favoriteId = "fav123";

      await ApiClient.deleteFavorite(favoriteId);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`id=${favoriteId}`),
        expect.objectContaining({ method: "DELETE" })
      );
    });

    test("should sync favorites", async () => {
      const favorites = [
        { type: "recitation", content: { reciter: "Al-Afasy" } },
        { type: "dua", content: { title: "Morning Dua" } },
      ];

      await ApiClient.syncFavorites(favorites);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/favorites.php"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("sync"),
        })
      );
    });
  });

  describe("Recitations API", () => {
    test("should get recitations catalog", async () => {
      await ApiClient.getRecitationsCatalog();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("action=catalog"),
        expect.objectContaining({ method: "GET" })
      );
    });

    test("should get specific recitation", async () => {
      const reciter = "Al-Afasy";
      const surah = 1;

      await ApiClient.getSpecificRecitation(reciter, surah);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`reciter=${reciter}`),
        expect.objectContaining({ method: "GET" })
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`surah=${surah}`),
        expect.objectContaining({ method: "GET" })
      );
    });

    test("should download recitation", async () => {
      const recitationId = "rec123";

      await ApiClient.downloadRecitation(recitationId);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("action=download"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining(recitationId),
        })
      );
    });

    test("should delete recitation download", async () => {
      const recitationId = "rec123";

      await ApiClient.deleteRecitationDownload(recitationId);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`recitation_id=${recitationId}`),
        expect.objectContaining({ method: "DELETE" })
      );
    });

    test("should sync downloads", async () => {
      const downloads = [
        { recitation_id: "rec1", status: "completed" },
        { recitation_id: "rec2", status: "pending" },
      ];

      await ApiClient.syncDownloads(downloads);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/recitations.php"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("sync_downloads"),
        })
      );
    });
  });

  describe("Premium API", () => {
    test("should sync premium purchase", async () => {
      const purchaseData = {
        subscription_type: "monthly",
        subscription_id: "sub123",
        premium_expiry: "2025-01-01",
      };

      await ApiClient.syncPremiumPurchase(purchaseData);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/users.php"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("sync_premium_purchase"),
        })
      );
    });

    test("should get premium purchases", async () => {
      await ApiClient.getPremiumPurchases();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/premium-purchases.php"),
        expect.objectContaining({ method: "GET" })
      );
    });

    test("should get usage stats", async () => {
      await ApiClient.getUsageStats();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("action=usage_stats"),
        expect.objectContaining({ method: "GET" })
      );
    });
  });

  describe("Backup API", () => {
    test("should get user backups", async () => {
      await ApiClient.getUserBackups();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/users.php"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("get_backups"),
        })
      );
    });

    test("should save user backup", async () => {
      const backupData = {
        backup_data: "encrypted_backup_data",
        backup_type: "full",
      };

      await ApiClient.saveUserBackup(backupData);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/users.php"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("save_backup"),
        })
      );
    });
  });

  describe("Utilities", () => {
    test("should check connectivity successfully", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      });

      const result = await ApiClient.checkConnectivity();

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-api.com/config.php",
        expect.anything()
      );
    });

    test("should return false when connectivity check fails", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      const result = await ApiClient.checkConnectivity();

      expect(result).toBe(false);
    });

    test("should return false when connectivity throws error", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await ApiClient.checkConnectivity();

      expect(result).toBe(false);
    });
  });

  describe("Error Handling", () => {
    test("should handle missing response message", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: () =>
          Promise.resolve({
            success: false,
            // Pas de message - test de fallback
          }),
      });

      await expect(ApiClient.getUser()).rejects.toThrow("HTTP 500: Erreur API");
    });

    test("should handle URL encoding properly", async () => {
      const specialData = {
        name: "Test & User",
        email: "test+user@example.com",
      };

      await ApiClient.createUser(specialData);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/users.php"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(specialData),
        })
      );
    });

    test("should handle malformed JSON response", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => {
          throw new Error("Invalid JSON");
        },
      });

      await expect(ApiClient.getUser()).rejects.toThrow("Invalid JSON");
    });
  });

  describe("Performance Tests", () => {
    test("should handle multiple concurrent requests", async () => {
      const promises = [
        ApiClient.getUser(),
        ApiClient.getUser(),
        ApiClient.getUser(),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });

    test("should complete requests within reasonable time", async () => {
      const startTime = Date.now();

      await ApiClient.getUser();

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Moins d'1 seconde
    });
  });

  describe("Edge Cases", () => {
    test("should handle empty query parameters", async () => {
      await ApiClient.getFavorites();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/favorites.php?user_id=2"),
        expect.anything()
      );
    });

    test("should handle null/undefined data gracefully", async () => {
      await ApiClient.updateUser(null as any);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/users.php"),
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining("user_id"),
        })
      );
    });

    test("should handle special characters in data", async () => {
      const specialData = {
        name: "Test & User",
        email: "test+user@example.com",
      };

      await ApiClient.createUser(specialData);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/users.php"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(specialData),
        })
      );
    });

    test("should handle large data payloads", async () => {
      const largeData = {
        backup_data: "x".repeat(10000), // 10KB de données
        backup_type: "full",
        backup_name: "large_backup",
      };

      await ApiClient.saveUserBackup(largeData);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/users.php"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("backup_data"),
        })
      );
    });
  });

  describe("Configuration", () => {
    test("should use correct API base URL", async () => {
      await ApiClient.getUser();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("https://test-api.com"),
        expect.anything()
      );
    });

    test("should set correct headers", async () => {
      await ApiClient.getUser();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        })
      );
    });

    test("should handle timeout configuration", async () => {
      (global.fetch as jest.Mock).mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error("AbortError");
            error.name = "AbortError";
            reject(error);
          }, 100);
        });
      });

      await expect(ApiClient.getUser()).rejects.toThrow(
        "Timeout de la requête API"
      );
    });
  });
});
