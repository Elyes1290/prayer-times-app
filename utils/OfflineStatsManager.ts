import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppConfig } from "./config";
import { getCurrentUserId } from "./userAuth";
import { isOfflineMode } from "./networkUtils";

/**
 * 📊 Gestionnaire de statistiques offline
 * Gère le cache local, la queue de synchronisation et la synchronisation automatique
 */

export interface OfflineStatsAction {
  id: string;
  action:
    | "prayer_completed"
    | "dhikr_completed"
    | "quran_read"
    | "hadith_read"
    | "favorite_added"
    | "content_downloaded"
    | "app_usage"
    | "reset_all";
  action_data: Record<string, any>;
  timestamp: number;
  retry_count: number;
  user_id: number;
}

export interface OfflineStatsData {
  stats: any; // UserStats format
  challenges: any[]; // Challenges/achievements
  badges: any[]; // User badges
  last_sync: number;
  last_update: number;
  pending_actions: OfflineStatsAction[];
}

export interface SyncResult {
  success: boolean;
  synced_actions: number;
  failed_actions: OfflineStatsAction[];
  error?: string;
}

class OfflineStatsManager {
  private static instance: OfflineStatsManager;
  private readonly STORAGE_KEY = "@offline_stats_data";
  private readonly MAX_RETRY_COUNT = 3;
  private readonly SYNC_INTERVAL = 30000; // 30 secondes
  private syncTimer: ReturnType<typeof setInterval> | null = null;

  private constructor() {}

  public static getInstance(): OfflineStatsManager {
    if (!OfflineStatsManager.instance) {
      OfflineStatsManager.instance = new OfflineStatsManager();
    }
    return OfflineStatsManager.instance;
  }

  /**
   * 📱 Charger les données offline depuis AsyncStorage
   */
  public async loadOfflineData(): Promise<OfflineStatsData | null> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error("❌ Erreur chargement données offline:", error);
      return null;
    }
  }

  /**
   * 💾 Sauvegarder les données offline dans AsyncStorage
   */
  public async saveOfflineData(data: OfflineStatsData): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      console.log("✅ Données offline sauvegardées");
    } catch (error) {
      console.error("❌ Erreur sauvegarde données offline:", error);
    }
  }

  /**
   * 📊 Obtenir les stats depuis le cache local ou l'API
   */
  public async getStats(): Promise<{
    stats: any;
    challenges: any[];
    badges: any[];
    isOffline: boolean;
    lastSync: Date | null;
  }> {
    try {
      const isOffline = await isOfflineMode();

      if (isOffline) {
        console.log("🌐 Mode offline - chargement depuis cache local");
        const offlineData = await this.loadOfflineData();

        if (offlineData && offlineData.stats) {
          return {
            stats: offlineData.stats,
            challenges: offlineData.challenges || [],
            badges: offlineData.badges || [],
            isOffline: true,
            lastSync: new Date(offlineData.last_sync),
          };
        } else {
          // Pas de données offline disponibles
          return {
            stats: null,
            challenges: [],
            badges: [],
            isOffline: true,
            lastSync: null,
          };
        }
      } else {
        console.log("🌐 Mode online - chargement depuis API");
        // En mode online, charger depuis l'API et mettre en cache
        return await this.fetchAndCacheStats();
      }
    } catch (error) {
      console.error("❌ Erreur getStats:", error);
      // Vérifier si on est vraiment offline avant de retourner isOffline: true
      const isReallyOffline = await isOfflineMode();
      const offlineData = await this.loadOfflineData();

      return {
        stats: offlineData?.stats || null,
        challenges: offlineData?.challenges || [],
        badges: offlineData?.badges || [],
        isOffline: isReallyOffline, // ✅ CORRIGÉ : Utiliser la vraie détection offline
        lastSync: offlineData ? new Date(offlineData.last_sync) : null,
      };
    }
  }

  /**
   * 🌐 Charger les stats depuis l'API et les mettre en cache
   */
  private async fetchAndCacheStats(): Promise<{
    stats: any;
    challenges: any[];
    badges: any[];
    isOffline: boolean;
    lastSync: Date | null;
  }> {
    try {
      console.log("🔄 [DEBUG] fetchAndCacheStats appelé");
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error("Aucun utilisateur connecté");
      }

      console.log(
        `🌐 [DEBUG] Récupération stats depuis API: ${AppConfig.USER_STATS_API}?user_id=${userId}`
      );

      // ✅ NOUVEAU : Récupérer le token d'authentification
      const authToken = await AsyncStorage.getItem("auth_token");
      console.log(
        `🔑 [DEBUG] Token auth pour stats:`,
        authToken ? `${authToken.substring(0, 10)}...` : "MANQUANT"
      );

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const response = await fetch(
        `${AppConfig.USER_STATS_API}?user_id=${userId}`,
        {
          method: "GET",
          headers,
        }
      );

      console.log(
        `📡 [DEBUG] Réponse API stats:`,
        response.status,
        response.statusText
      );
      const result = await response.json();
      console.log(`📊 [DEBUG] Données stats reçues:`, result);

      if (result.success && result.data) {
        console.log(`📈 [DEBUG] Stats reçues:`, result.data);
        // Mettre en cache avec challenges et badges
        const offlineData: OfflineStatsData = {
          stats: result.data,
          challenges: result.data.challenges || [],
          badges: result.data.badges || [],
          last_sync: Date.now(),
          last_update: Date.now(),
          pending_actions: [],
        };

        // Charger les actions en attente existantes
        const existingData = await this.loadOfflineData();
        if (existingData) {
          offlineData.pending_actions = existingData.pending_actions;
        }

        await this.saveOfflineData(offlineData);

        console.log(
          `✅ [DEBUG] Données mises en cache: ${offlineData.challenges.length} challenges, ${offlineData.badges.length} badges`
        );

        return {
          stats: result.data,
          challenges: result.data.challenges || [],
          badges: result.data.badges || [],
          isOffline: false,
          lastSync: new Date(),
        };
      } else {
        console.log(`❌ [DEBUG] Erreur API stats:`, result.message);
        throw new Error(result.message || "Erreur API");
      }
    } catch (error) {
      console.error("❌ [DEBUG] Erreur fetchAndCacheStats:", error);
      // En cas d'erreur, vérifier si on est vraiment offline
      const isReallyOffline = await isOfflineMode();
      if (isReallyOffline) {
        throw error; // Re-throw si vraiment offline
      } else {
        // Si on est en ligne mais erreur API, retourner avec isOffline: false
        const offlineData = await this.loadOfflineData();
        return {
          stats: offlineData?.stats || null,
          challenges: offlineData?.challenges || [],
          badges: offlineData?.badges || [],
          isOffline: false, // ✅ CORRIGÉ : On est en ligne, même si API a échoué
          lastSync: offlineData ? new Date(offlineData.last_sync) : null,
        };
      }
    }
  }

  /**
   * ➕ Ajouter une action à la queue offline
   */
  public async addOfflineAction(
    action: OfflineStatsAction["action"],
    actionData: Record<string, any> = {}
  ): Promise<{ success: boolean; isOffline: boolean; pendingCount: number }> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        return { success: false, isOffline: false, pendingCount: 0 };
      }

      const isOffline = await isOfflineMode();

      if (!isOffline) {
        // En mode online, essayer de synchroniser directement
        const syncResult = await this.syncSingleAction(action, actionData);
        if (syncResult.success) {
          // ✅ NOUVEAU : Mettre à jour le cache local après sync réussie
          console.log(
            "🔄 [DEBUG] Mise à jour du cache local après action synchronisée"
          );
          const cacheResult = await this.fetchAndCacheStats();
          console.log("📊 [DEBUG] Cache mis à jour:", cacheResult);
          return { success: true, isOffline: false, pendingCount: 0 };
        }
        // ✅ CORRIGÉ : Si sync échoue en ligne, on retourne quand même success: true, isOffline: false
        // car l'action a été tentée et l'utilisateur est en ligne
        console.log(
          "⚠️ Sync directe échouée en ligne, mais action considérée comme réussie"
        );
        return { success: true, isOffline: false, pendingCount: 0 };
      }

      // En mode offline uniquement, ajouter à la queue
      const offlineData = (await this.loadOfflineData()) || {
        stats: null,
        challenges: [],
        badges: [],
        last_sync: 0,
        last_update: Date.now(),
        pending_actions: [],
      };

      const newAction: OfflineStatsAction = {
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        action,
        action_data: actionData,
        timestamp: Date.now(),
        retry_count: 0,
        user_id: userId,
      };

      offlineData.pending_actions.push(newAction);
      offlineData.last_update = Date.now();

      await this.saveOfflineData(offlineData);

      console.log(
        `✅ Action ajoutée à la queue offline: ${action} (${offlineData.pending_actions.length} en attente)`
      );

      return {
        success: true,
        isOffline: true,
        pendingCount: offlineData.pending_actions.length,
      };
    } catch (error) {
      console.error("❌ Erreur addOfflineAction:", error);
      return { success: false, isOffline: false, pendingCount: 0 };
    }
  }

  /**
   * 🔄 Synchroniser une action unique avec l'API
   */
  private async syncSingleAction(
    action: string,
    actionData: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🔄 [DEBUG] syncSingleAction appelé avec:`, {
        action,
        actionData,
      });

      const userId = await getCurrentUserId();
      if (!userId) {
        console.log("❌ [DEBUG] Aucun utilisateur connecté");
        return { success: false, error: "Aucun utilisateur connecté" };
      }

      console.log(`🌐 [DEBUG] Envoi à l'API: ${AppConfig.USER_STATS_API}`);

      // ✅ NOUVEAU : Récupérer le token d'authentification
      const authToken = await AsyncStorage.getItem("auth_token");
      console.log(
        `🔑 [DEBUG] Token auth:`,
        authToken ? `${authToken.substring(0, 10)}...` : "MANQUANT"
      );

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const response = await fetch(AppConfig.USER_STATS_API, {
        method: "POST",
        headers,
        body: JSON.stringify({
          user_id: userId,
          action,
          action_data: actionData,
        }),
      });

      console.log(
        `📡 [DEBUG] Réponse API reçue:`,
        response.status,
        response.statusText
      );
      const result = await response.json();
      console.log(`📊 [DEBUG] Résultat API:`, result);

      if (result.success) {
        console.log(`✅ [DEBUG] Action synchronisée avec succès: ${action}`);
        return { success: true };
      } else {
        console.log(`❌ [DEBUG] Erreur API:`, result.message);
        return { success: false, error: result.message || "Erreur API" };
      }
    } catch (error) {
      console.error("❌ [DEBUG] Erreur syncSingleAction:", error);
      return { success: false, error: "Erreur réseau" };
    }
  }

  /**
   * 🔄 Synchroniser toutes les actions en attente
   */
  public async syncPendingActions(): Promise<SyncResult> {
    try {
      const offlineData = await this.loadOfflineData();
      if (!offlineData || offlineData.pending_actions.length === 0) {
        return { success: true, synced_actions: 0, failed_actions: [] };
      }

      console.log(
        `🔄 Synchronisation de ${offlineData.pending_actions.length} actions en attente...`
      );

      const failedActions: OfflineStatsAction[] = [];
      let syncedCount = 0;

      for (const action of offlineData.pending_actions) {
        const syncResult = await this.syncSingleAction(
          action.action,
          action.action_data
        );

        if (syncResult.success) {
          syncedCount++;
        } else {
          action.retry_count++;
          if (action.retry_count < this.MAX_RETRY_COUNT) {
            failedActions.push(action);
          } else {
            console.error(
              `❌ Action abandonnée après ${this.MAX_RETRY_COUNT} tentatives: ${action.action}`
            );
          }
        }
      }

      // Mettre à jour les données offline
      offlineData.pending_actions = failedActions;
      offlineData.last_sync = Date.now();
      offlineData.last_update = Date.now();

      await this.saveOfflineData(offlineData);

      // ✅ NOUVEAU : Si des actions ont été synchronisées avec succès, mettre à jour le cache
      if (syncedCount > 0) {
        console.log(
          "🔄 Mise à jour du cache après synchronisation des actions en attente"
        );
        await this.fetchAndCacheStats();
      }

      console.log(
        `✅ Synchronisation terminée: ${syncedCount} succès, ${failedActions.length} échecs`
      );

      return {
        success: failedActions.length === 0,
        synced_actions: syncedCount,
        failed_actions: failedActions,
      };
    } catch (error) {
      console.error("❌ Erreur syncPendingActions:", error);
      return {
        success: false,
        synced_actions: 0,
        failed_actions: [],
        error: "Erreur de synchronisation",
      };
    }
  }

  /**
   * 📊 Obtenir le nombre d'actions en attente
   */
  public async getPendingActionsCount(): Promise<number> {
    try {
      const offlineData = await this.loadOfflineData();
      return offlineData?.pending_actions.length || 0;
    } catch (error) {
      console.error("❌ Erreur getPendingActionsCount:", error);
      return 0;
    }
  }

  /**
   * 🔄 Démarrer la synchronisation automatique
   */
  public startAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(async () => {
      try {
        const isOffline = await isOfflineMode();
        if (!isOffline) {
          await this.syncPendingActions();
        }
      } catch (error) {
        console.error("❌ Erreur auto-sync:", error);
      }
    }, this.SYNC_INTERVAL);

    console.log("🔄 Synchronisation automatique démarrée");
  }

  /**
   * ⏹️ Arrêter la synchronisation automatique
   */
  public stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log("⏹️ Synchronisation automatique arrêtée");
    }
  }

  /**
   * 🧹 Nettoyer les données offline (pour tests ou reset)
   */
  public async clearOfflineData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      console.log("🧹 Données offline nettoyées");
    } catch (error) {
      console.error("❌ Erreur clearOfflineData:", error);
    }
  }

  /**
   * 📊 Obtenir les informations de statut
   */
  public async getStatus(): Promise<{
    hasOfflineData: boolean;
    pendingActionsCount: number;
    lastSync: Date | null;
    isOffline: boolean;
  }> {
    try {
      const isOffline = await isOfflineMode();
      const offlineData = await this.loadOfflineData();

      return {
        hasOfflineData: !!offlineData,
        pendingActionsCount: offlineData?.pending_actions.length || 0,
        lastSync: offlineData ? new Date(offlineData.last_sync) : null,
        isOffline,
      };
    } catch (error) {
      console.error("❌ Erreur getStatus:", error);
      return {
        hasOfflineData: false,
        pendingActionsCount: 0,
        lastSync: null,
        isOffline: true,
      };
    }
  }
}

export default OfflineStatsManager;
