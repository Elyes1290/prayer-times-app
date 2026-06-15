import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCurrentUserId } from "./userAuth";
import { AppConfig } from "./config";
import i18n from "../locales/i18n";
import { showGlobalToast } from "../contexts/ToastContext";

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

// Configuration API
const API_BASE = AppConfig.API_BASE_URL;
const API_TIMEOUT = 30000; // 30 secondes

// Types pour les réponses API
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  timestamp: string;
  data?: T;
  url?: string; // Pour les réponses comme createPortalSession
  status?: string; // Pour les statuts de réponse (ex: 'deleted')
  request_id?: string; // Pour les IDs de demande
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

      // Simple mécanisme de retry avec backoff (récursif — pas de while + await)
      const maxRetries = 2;

      const executeAttempt = async (attempt: number): Promise<any> => {
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
                  // Afficher un toast global pour avertir l'utilisateur
                  showGlobalToast({
                    type: "error",
                    title:
                      i18n.t("toast_connection_interrupted") ||
                      "Connexion interrompue",
                    message:
                      i18n.t("toast_session_expired") ||
                      "Votre session a expiré ou est invalide. Veuillez vous reconnecter.",
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
                  i18n.t("toast_connection_interrupted") ||
                  "Connexion interrompue",
                message:
                  i18n.t("toast_session_expired") ||
                  "Votre session a expiré ou est invalide. Veuillez vous reconnecter.",
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
            const backoffTime = Math.min(
              1000 * Math.pow(2, attempt + 1),
              5000
            ); // Max 5s
            await new Promise((resolve) => setTimeout(resolve, backoffTime));
            return executeAttempt(attempt + 1);
          }

          // Pas de retry, on throw l'erreur
          throw fetchError;
        }
      };

      return await executeAttempt(0);
    } catch (error: any) {
      console.error(`❌ API Error: ${method} ${endpoint}`, error);
      throw error;
    }
  }

  // Tenter de rafraîchir le token d'accès avec le refresh_token stocké
  async refreshSession(): Promise<boolean> {
    return this.tryRefreshToken();
  }

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

  /**
   * Sauvegarde en base la vraie date d'expiration Apple (Renuevecat) après renouvellement.
   */
  async syncIosPremiumRenewal(payload: {
    expiration_at_ms: number;
    product_id: string;
    original_transaction_id?: string | null;
  }): Promise<ApiResponse> {
    return this.makeRequest<ApiResponse>("/sync-ios-premium.php", "POST", {
      expiration_at_ms: payload.expiration_at_ms,
      product_id: payload.product_id,
      original_transaction_id: payload.original_transaction_id ?? "",
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
    immediate?: boolean;
  }): Promise<ApiResponse> {
    return this.makeRequest("/data-deletion.php", "POST", data);
  }

  async createPortalSession(customerId: string): Promise<ApiResponse> {
    console.log("🔍 [API] createPortalSession appelé avec:", customerId);
    const response = await this.makeRequest<ApiResponse>(
      "/create-portal-session.php",
      "POST",
      {
        customer_id: customerId,
        return_url: "https://myadhanapp.com",
      }
    );
    console.log(
      "🔍 [API] Réponse du serveur:",
      JSON.stringify(response, null, 2)
    );
    return response;
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
  } catch (e: any) {
    // 🚫 DÉSACTIVATION TEMPORAIRE : Ignorer toutes les erreurs 429
    if (e?.message?.includes("HTTP 429")) {
      console.log(
        "⚠️ Rate limit détecté - token considéré comme valide (rate limiting désactivé)"
      );
      return true; // Considérer le token comme valide en cas de rate limit
    }

    // 🚫 DÉSACTIVATION TEMPORAIRE : Ignorer toutes les erreurs de réseau
    if (
      e?.message?.includes("Network Error") ||
      e?.message?.includes("timeout")
    ) {
      console.log(
        "⚠️ Erreur réseau détectée - token considéré comme valide (mode dégradé)"
      );
      return true; // Considérer le token comme valide en cas d'erreur réseau
    }

    console.log("🔐 Erreur vérification auth:", e?.message);
    return false;
  }
}
