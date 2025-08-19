import axios, { AxiosInstance, AxiosResponse, AxiosError } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// 🚨 NOUVEAU : Système de rate limiting intelligent
class RateLimiter {
  private requestCounts: Map<string, { count: number; resetTime: number }> =
    new Map();
  private readonly WINDOW_SIZE = 60000; // 1 minute
  private readonly MAX_REQUESTS = 10; // Max 10 requêtes par minute par endpoint

  canMakeRequest(endpoint: string): boolean {
    const now = Date.now();
    const key = this.getRateLimitKey(endpoint);
    const requestData = this.requestCounts.get(key);

    if (!requestData || now > requestData.resetTime) {
      // Nouvelle fenêtre de temps
      this.requestCounts.set(key, {
        count: 1,
        resetTime: now + this.WINDOW_SIZE,
      });
      return true;
    }

    if (requestData.count >= this.MAX_REQUESTS) {
      console.log(
        `🚫 Rate limit atteint pour ${endpoint} - attente de ${Math.ceil(
          (requestData.resetTime - now) / 1000
        )}s`
      );
      return false;
    }

    requestData.count++;
    return true;
  }

  private getRateLimitKey(endpoint: string): string {
    // Grouper les endpoints d'authentification ensemble
    if (endpoint.includes("auth.php")) {
      return "auth_endpoints";
    }
    return endpoint;
  }

  getWaitTime(endpoint: string): number {
    const key = this.getRateLimitKey(endpoint);
    const requestData = this.requestCounts.get(key);
    if (!requestData) return 0;

    const now = Date.now();
    return Math.max(0, requestData.resetTime - now);
  }
}

const rateLimiter = new RateLimiter();

// 🚨 NOUVEAU : Gestion intelligente des retry avec backoff exponentiel
class RetryManager {
  private retryCounts: Map<string, number> = new Map();
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY = 1000; // 1 seconde

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    endpoint: string,
    context: string = "unknown"
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        // Vérifier le rate limiting avant chaque tentative
        if (!rateLimiter.canMakeRequest(endpoint)) {
          const waitTime = rateLimiter.getWaitTime(endpoint);
          console.log(
            `⏳ Attente rate limit: ${Math.ceil(
              waitTime / 1000
            )}s pour ${endpoint}`
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }

        const result = await operation();

        // Réinitialiser le compteur de retry en cas de succès
        this.retryCounts.delete(endpoint);
        return result;
      } catch (error: any) {
        lastError = error;

        // Ne pas retry sur les erreurs 429 (rate limit)
        if (error?.response?.status === 429) {
          console.log(`🚫 Rate limit détecté pour ${endpoint} - pas de retry`);
          const waitTime = rateLimiter.getWaitTime(endpoint);
          if (waitTime > 0) {
            console.log(`⏳ Attente forcée: ${Math.ceil(waitTime / 1000)}s`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
          }
          break;
        }

        // Ne pas retry sur les erreurs 401/403 (authentification)
        if (
          error?.response?.status === 401 ||
          error?.response?.status === 403
        ) {
          console.log(
            `🔐 Erreur d'authentification pour ${endpoint} - pas de retry`
          );
          break;
        }

        if (attempt < this.MAX_RETRIES) {
          const delay = this.BASE_DELAY * Math.pow(2, attempt);
          console.log(
            `🔄 Tentative ${attempt + 1}/${
              this.MAX_RETRIES
            } échouée pour ${endpoint} - retry dans ${delay}ms`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}

const retryManager = new RetryManager();

// Helpers sûrs pour l'environnement de test (où le mock peut être partiel)
const safeGetItem = async (key: string): Promise<string | null> => {
  try {
    if (AsyncStorage && typeof AsyncStorage.getItem === "function") {
      return await AsyncStorage.getItem(key);
    }
  } catch {}
  return null;
};
const safeSetItem = async (key: string, value: string): Promise<void> => {
  try {
    if (AsyncStorage && typeof AsyncStorage.setItem === "function") {
      await AsyncStorage.setItem(key, value);
    }
  } catch {}
};

// Import des dépendances nécessaires
import { getCurrentUserId } from "./userAuth";
import { AppConfig } from "./config";
import i18n from "../locales/i18n";
import { showGlobalToast } from "../contexts/ToastContext";
// Import conditionnel pour DeviceInfo (désactivé car non utilisé)
// let DeviceInfo: any = null;
// try {
//   DeviceInfo = require("react-native-device-info");
// } catch {
//   // noop
// }

// Configuration API
const API_BASE = AppConfig.API_BASE_URL;
const API_TIMEOUT = 30000; // 30 secondes

// Types pour les réponses API
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  timestamp: string;
  data?: T;
}

// Interface pour les erreurs API
export interface ApiError {
  message: string;
  code?: number;
  details?: any;
}

class ApiClient {
  private static instance: ApiClient;
  private cachedDeviceId: string | null = null;

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  // Génère/récupère un device_id applicatif (UUID-like), stocké de façon persistante
  private async getOrCreateDeviceId(): Promise<string> {
    if (this.cachedDeviceId) return this.cachedDeviceId;
    let existing = await safeGetItem("device_id");
    if (!existing) {
      // Générer un identifiant aléatoire (hex 32)
      const randomBytes = Array.from({ length: 16 }, () =>
        Math.floor(Math.random() * 256)
      );
      existing = randomBytes
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      await safeSetItem("device_id", existing);
    }
    this.cachedDeviceId = existing;
    return existing;
  }

  // Faire une requête HTTP générique
  private async makeRequest<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    data?: any,
    queryParams?: Record<string, string>
  ): Promise<T> {
    try {
      // 🔧 CORRECTION : Éviter le double préfixe /api
      const cleanEndpoint = endpoint.startsWith("/")
        ? endpoint
        : `/${endpoint}`;
      let url = `${API_BASE}${cleanEndpoint}`;

      // Ajouter les paramètres de requête pour GET
      if (queryParams && Object.keys(queryParams).length > 0) {
        const params = new URLSearchParams(queryParams);
        url += `?${params.toString()}`;
      }

      // Créer un AbortController pour gérer le timeout manuellement
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, API_TIMEOUT);

      const token = await safeGetItem("auth_token");
      const config: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
      };

      // Ajouter le body pour POST/PUT
      if (data && ["POST", "PUT"].includes(method)) {
        config.body = JSON.stringify(data);
      }

      // console.log(`🌐 API Request: ${method} ${url}`);

      // Simple mécanisme de retry avec backoff
      let attempt = 0;
      const maxRetries = 2;

      while (attempt <= maxRetries) {
        try {
          const response = await fetch(url, config);

          // Gestion robuste des réponses non-JSON
          let result: any = {};
          try {
            result = await response.json();
          } catch {
            // Réponse non-JSON (ex: 204 No Content, plain text)
            if (response.status === 204) {
              result = { success: true, message: "No Content" };
            } else {
              result = { success: false, message: "Invalid JSON response" };
            }
          }

          // Nettoyer le timeout
          clearTimeout(timeoutId);

          if (!response.ok) {
            // Si 401, tenter un refresh token puis retry une fois
            if (response.status === 401) {
              const refreshed = await this.tryRefreshToken();
              if (refreshed) {
                // Rejouer la requête avec le nouveau token
                const newToken = await safeGetItem("auth_token");
                const retriedConfig = {
                  ...config,
                  headers: {
                    ...(config.headers as any),
                    ...(newToken
                      ? { Authorization: `Bearer ${newToken}` }
                      : {}),
                  },
                } as RequestInit;
                const retryResponse = await fetch(url, retriedConfig);
                let retryResult: any = {};
                try {
                  retryResult = await retryResponse.json();
                } catch {
                  retryResult = {
                    success: false,
                    message: "Invalid JSON response on retry",
                  };
                }
                if (!retryResponse.ok) {
                  // Afficher un toast global pour avertir l’utilisateur
                  showGlobalToast({
                    type: "error",
                    title:
                      i18n.t("toasts.connection_interrupted") ||
                      "Connexion interrompue",
                    message:
                      i18n.t("toasts.single_device_only") ||
                      "Non autorisé. Veuillez vous connecter sur un seul appareil.",
                  });
                  throw new Error(
                    `HTTP ${retryResponse.status}: ${
                      retryResult.message || "Erreur API"
                    }`
                  );
                }
                return retryResult;
              }
              // Refresh impossible → notifier également
              showGlobalToast({
                type: "error",
                title:
                  i18n.t("toasts.connection_interrupted") ||
                  "Connexion interrompue",
                message:
                  i18n.t("toasts.single_device_only") ||
                  "Non autorisé. Veuillez vous connecter sur un seul appareil.",
              });
            }
            throw new Error(
              `HTTP ${response.status}: ${result.message || "Erreur API"}`
            );
          }

          // console.log(`✅ API Success: ${method} ${endpoint}`);
          return result;
        } catch (fetchError: any) {
          // Nettoyer le timeout en cas d'erreur
          clearTimeout(timeoutId);

          // Retry uniquement pour les erreurs réseau temporaires
          if (
            attempt < maxRetries &&
            (fetchError.name === "AbortError" ||
              fetchError.message?.includes("network"))
          ) {
            attempt++;
            const backoffTime = Math.min(1000 * Math.pow(2, attempt), 5000); // Max 5s
            await new Promise((resolve) => setTimeout(resolve, backoffTime));
            continue; // Retry
          }

          // Pas de retry, on throw l'erreur
          throw fetchError;
        }
      }
      // Si on arrive ici, tous les retries ont échoué
      throw new Error("Tous les retries ont échoué");
    } catch (error: any) {
      console.error(`❌ API Error: ${method} ${endpoint}`, error);
      throw error;
    }
  }

  // Tenter de rafraîchir le token d'accès avec le refresh_token stocké
  private async tryRefreshToken(): Promise<boolean> {
    try {
      const refreshToken = await safeGetItem("refresh_token");
      if (!refreshToken) return false;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      const response = await fetch(`${API_BASE}/auth.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          action: "refresh",
          refresh_token: refreshToken,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) return false;
      const result = await response.json();
      if (result?.success && result?.data) {
        const newToken = result.data.token || result.data.auth_token;
        const newRefresh = result.data.refresh_token;
        if (newToken) await safeSetItem("auth_token", newToken);
        if (newRefresh) await safeSetItem("refresh_token", newRefresh);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // === API UTILISATEURS ===

  async createUser(userData: {
    language?: string;
    user_first_name?: string;
    email?: string;
    firebase_uid?: string;
  }): Promise<ApiResponse> {
    // 🧪 TEMPORAIRE : Utiliser l'API de test
    return this.makeRequest("/users.php", "POST", userData);
  }

  async getUser(): Promise<ApiResponse> {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error("Aucun utilisateur connecté");
    }

    // 🧪 TEMPORAIRE : Utiliser l'API de test
    return this.makeRequest("/users.php", "GET", null, {
      user_id: userId.toString(),
    });
  }

  // 🚀 NOUVEAU : Récupérer un utilisateur par email
  async getUserByEmail(email: string): Promise<ApiResponse> {
    // 🧪 TEMPORAIRE : Utiliser l'API de test
    return this.makeRequest("/users.php", "GET", null, {
      email: email,
    });
  }

  // 🚀 NOUVEAU : Vérifier l'existence d'un email (sans erreur 404 côté client)
  async checkEmailExists(
    email: string
  ): Promise<ApiResponse<{ exists: boolean; email: string }>> {
    return this.makeRequest("/auth.php", "GET", null, {
      action: "check_email",
      email,
    });
  }

  async updateUser(userData: any): Promise<ApiResponse> {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error("Aucun utilisateur connecté");
    }

    // 🧪 TEMPORAIRE : Utiliser l'API de test
    return this.makeRequest("/users.php", "PUT", {
      user_id: userId,
      ...userData,
    });
  }

  async syncSettings(settings: any): Promise<ApiResponse> {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error("Aucun utilisateur connecté");
    }

    // 🧪 TEMPORAIRE : Utiliser l'API de test
    return this.makeRequest("/users.php?action=sync_settings", "PUT", {
      user_id: userId,
      settings,
    });
  }

  // === API AUTHENTIFICATION ===

  async login(): Promise<ApiResponse> {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error("Aucun utilisateur connecté");
    }

    return this.makeRequest("/auth.php", "POST", {
      action: "login",
      user_id: userId.toString(),
    });
  }

  // 🚀 NOUVEAU : Connexion avec email
  async loginWithEmail(email: string): Promise<ApiResponse> {
    const device_id = await this.getOrCreateDeviceId();
    return this.makeRequest("/auth.php", "POST", {
      action: "login",
      email: email,
      device_id,
    });
  }

  // 🚀 NOUVEAU : Connexion avec email et mot de passe obligatoire
  async loginWithCredentials(credentials: {
    email: string;
    password: string;
  }): Promise<ApiResponse> {
    const device_id = await this.getOrCreateDeviceId();
    return this.makeRequest("/auth.php", "POST", {
      action: "login",
      ...credentials,
      device_id,
    });
  }

  async register(userData: {
    language?: string;
    user_first_name?: string;
    email?: string;
  }): Promise<ApiResponse> {
    return this.makeRequest("/auth.php", "POST", {
      action: "register",
      ...userData,
    });
  }

  // 🚀 CORRECTION : Inscription avec données complètes incluant premium et localisation
  async registerWithData(userData: {
    language?: string;
    user_first_name?: string;
    email?: string;
    password?: string;
    premium_status?: number;
    subscription_type?: string;
    subscription_id?: string;
    premium_expiry?: string;
    location_mode?: string;
    location_city?: string;
    location_country?: string;
    location_lat?: number;
    location_lon?: number;
  }): Promise<ApiResponse> {
    const device_id = await this.getOrCreateDeviceId();
    return this.makeRequest("/auth.php", "POST", {
      action: "register",
      ...userData,
      device_id,
    });
  }

  async migrateFromFirebase(firebaseData: {
    firebase_uid: string;
    firebase_data?: any;
  }): Promise<ApiResponse> {
    return this.makeRequest("/auth.php", "POST", {
      action: "migrate_firebase",
      ...firebaseData,
    });
  }

  // === API FAVORIS ===

  async getFavorites(type?: string): Promise<ApiResponse> {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error("Aucun utilisateur connecté");
    }

    const params: Record<string, string> = { user_id: userId.toString() };
    if (type) {
      params.type = type;
    }

    return this.makeRequest("/favorites.php", "GET", null, params);
  }

  async addFavorite(favoriteData: {
    type: string;
    content: any;
  }): Promise<ApiResponse> {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error("Aucun utilisateur connecté");
    }

    return this.makeRequest("/favorites.php", "POST", {
      user_id: userId.toString(),
      ...favoriteData,
    });
  }

  async deleteFavorite(favoriteId: string): Promise<ApiResponse> {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error("Aucun utilisateur connecté");
    }

    return this.makeRequest("/favorites.php", "DELETE", null, {
      id: favoriteId,
      user_id: userId.toString(),
    });
  }

  // === API RÉCITATIONS ===

  async getRecitationsCatalog(): Promise<ApiResponse> {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error("Aucun utilisateur connecté");
    }

    return this.makeRequest("/recitations.php", "GET", null, {
      action: "catalog",
      user_id: userId.toString(),
    });
  }

  async getSpecificRecitation(
    reciter: string,
    surah: number
  ): Promise<ApiResponse> {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error("Aucun utilisateur connecté");
    }

    return this.makeRequest("/recitations.php", "GET", null, {
      action: "surah",
      user_id: userId.toString(),
      reciter,
      surah: surah.toString(),
    });
  }

  async downloadRecitation(recitationId: string): Promise<ApiResponse> {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error("Aucun utilisateur connecté");
    }

    return this.makeRequest("/recitations.php?action=download", "POST", {
      user_id: userId.toString(),
      recitation_id: recitationId,
    });
  }

  // === API ADHANS (catalogue) ===
  async getAdhanCatalog(): Promise<ApiResponse> {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error("Aucun utilisateur connecté");
    }
    return this.makeRequest("/adhans.php", "GET", null, {
      action: "catalog",
      user_id: userId.toString(),
    });
  }

  async deleteRecitationDownload(recitationId: string): Promise<ApiResponse> {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error("Aucun utilisateur connecté");
    }

    return this.makeRequest("/recitations.php", "DELETE", null, {
      recitation_id: recitationId,
      user_id: userId.toString(),
    });
  }

  // === API SYNCHRONISATION ===

  // 🚀 NOUVEAU : Synchroniser les favoris avec la base de données
  async syncFavorites(favorites: any[]): Promise<ApiResponse> {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error("Aucun utilisateur connecté");
    }

    return this.makeRequest("/favorites.php", "POST", {
      action: "sync",
      user_id: userId.toString(),
      favorites: favorites,
    });
  }

  // 🚀 NOUVEAU : Synchroniser les téléchargements avec la base de données
  async syncDownloads(downloads: any[]): Promise<ApiResponse> {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error("Aucun utilisateur connecté");
    }

    return this.makeRequest("/recitations.php", "POST", {
      action: "sync_downloads",
      user_id: userId.toString(),
      downloads: downloads,
    });
  }

  // 🚀 NOUVEAU : Synchroniser les achats premium avec la base de données
  async syncPremiumPurchase(purchaseData: {
    subscription_type: string;
    subscription_id: string;
    premium_expiry: string;
  }): Promise<ApiResponse> {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error("Aucun utilisateur connecté");
    }

    // 🧪 TEMPORAIRE : Utiliser l'API de test
    return this.makeRequest("/users.php", "POST", {
      action: "sync_premium_purchase",
      user_id: userId.toString(),
      ...purchaseData,
    });
  }

  // 🚀 NOUVEAU : Récupérer les statistiques d'utilisation
  async getUsageStats(): Promise<ApiResponse> {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error("Aucun utilisateur connecté");
    }

    // 🧪 TEMPORAIRE : Utiliser l'API de test
    return this.makeRequest("/users.php", "GET", null, {
      action: "usage_stats",
      user_id: userId.toString(),
    });
  }

  // 🚀 NOUVEAU : Récupérer les statistiques de l'utilisateur (écran Stats)
  async getUserStats(): Promise<ApiResponse> {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error("Aucun utilisateur connecté");
    }
    return this.makeRequest("/user-stats.php", "GET", null, {
      user_id: userId.toString(),
    });
  }

  // 🚀 NOUVEAU : Vérifier l'auth (token valide ?) côté serveur
  async verifyAuth(): Promise<ApiResponse> {
    return this.makeRequest("/auth.php", "GET", null, { action: "verify" });
  }

  // 🚀 NOUVEAU : Vérifier les achats premium pour un user_id
  async getPremiumPurchases(): Promise<ApiResponse> {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error("Aucun utilisateur connecté");
    }

    return this.makeRequest("/premium-purchases.php", "GET", null, {
      user_id: userId.toString(),
    });
  }

  // === API BACKUP ===

  // 🚀 NOUVEAU : Sauvegarder un backup utilisateur
  async saveUserBackup(backupData: {
    backup_data: string;
    backup_type?: string;
    backup_name?: string;
  }): Promise<ApiResponse> {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error("Aucun utilisateur connecté");
    }

    // 🧪 TEMPORAIRE : Utiliser l'API de test
    return this.makeRequest("/users.php", "POST", {
      action: "save_backup",
      user_id: userId.toString(),
      backup_data: backupData.backup_data,
      backup_type: backupData.backup_type || "manual",
      backup_name:
        backupData.backup_name || `Backup ${new Date().toLocaleDateString()}`,
    });
  }

  // 🚀 NOUVEAU : Récupérer les backups utilisateur
  async getUserBackups(): Promise<ApiResponse> {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error("Aucun utilisateur connecté");
    }

    // 🧪 TEMPORAIRE : Utiliser l'API de test
    return this.makeRequest("/users.php", "POST", {
      action: "get_backups",
      user_id: userId.toString(),
    });
  }

  // 🚀 NOUVEAU : Changer le mot de passe
  async changePassword(data: {
    email: string;
    current_password: string;
    new_password: string;
  }): Promise<ApiResponse> {
    return this.makeRequest("/auth.php", "POST", {
      action: "change_password",
      email: data.email,
      current_password: data.current_password,
      new_password: data.new_password,
    });
  }

  // === UTILITAIRES ===

  // Vérifier la connectivité
  async checkConnectivity(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 5000); // 5 secondes

      try {
        const response = await fetch(`${API_BASE}/config.php`, {
          method: "GET",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response.ok;
      } catch {
        clearTimeout(timeoutId);
        return false;
      }
    } catch {
      return false;
    }
  }

  // 🚀 SUPPRIMÉ : Plus de création automatique d'utilisateur
  // Une app professionnelle ne crée pas automatiquement d'utilisateur
  // L'utilisateur doit s'inscrire ou se connecter explicitement

  // Méthode pour les demandes de suppression de données
  async submitDataDeletionRequest(data: {
    email: string;
    reason?: string;
    message?: string;
  }): Promise<ApiResponse> {
    return this.makeRequest("/data-deletion.php", "POST", data);
  }

  async createPortalSession(customerId: string): Promise<ApiResponse> {
    return this.makeRequest("/create-portal-session.php", "POST", {
      customer_id: customerId,
      return_url: "https://myadhanapp.com",
    });
  }
}

export default ApiClient.getInstance();

// Vérifier rapidement la validité du token courant côté serveur
export async function verifyAuth(): Promise<boolean> {
  try {
    const client = ApiClient.getInstance();
    // Réutilise makeRequest via une méthode publique fictive
    // On appelle un endpoint protégé minimal: GET /auth.php
    const res: ApiResponse = await (client as any).makeRequest(
      "/auth.php",
      "GET"
    );
    return !!res?.success;
  } catch (e) {
    return false;
  }
}
