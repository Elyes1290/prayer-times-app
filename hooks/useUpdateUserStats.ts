import { useCallback } from "react";
import { getCurrentUserId } from "../utils/userAuth";
import { AppConfig } from "../utils/config";
import OfflineStatsManager from "../utils/OfflineStatsManager";

export interface UpdateStatsAction {
  action:
    | "prayer_completed"
    | "dhikr_completed"
    | "quran_read"
    | "hadith_read"
    | "favorite_added"
    | "content_downloaded"
    | "app_usage"
    | "reset_all";
  action_data?: Record<string, any>;
}

export const useUpdateUserStats = () => {
  const updateStats = useCallback(async (updateAction: UpdateStatsAction) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error("Aucun utilisateur connecté");
      }

      // 🌐 NOUVEAU : Utiliser le gestionnaire offline
      const offlineManager = OfflineStatsManager.getInstance();
      const result = await offlineManager.addOfflineAction(
        updateAction.action,
        updateAction.action_data || {}
      );

      if (result.success) {
        console.log(
          `✅ Action ${updateAction.action} ${
            result.isOffline ? "enregistrée offline" : "synchronisée"
          }`
        );
        return {
          success: true,
          isOffline: result.isOffline,
          pendingCount: result.pendingCount,
        };
      } else {
        console.error("❌ Erreur enregistrement action:", updateAction.action);
        return { success: false, error: "Erreur enregistrement" };
      }
    } catch (error) {
      console.error("❌ Erreur mise à jour stats:", error);
      return { success: false, error: "Erreur réseau" };
    }
  }, []);

  // Fonctions spécialisées pour chaque type d'action
  const recordPrayer = useCallback(
    async (prayerType?: string, prayerTime?: string) => {
      return updateStats({
        action: "prayer_completed",
        action_data: {
          prayer_type: prayerType || "general",
          prayer_time: prayerTime || new Date().toISOString(),
        },
      });
    },
    [updateStats]
  );

  const recordDhikr = useCallback(
    async (count: number = 1, type: string = "general") => {
      return updateStats({
        action: "dhikr_completed",
        action_data: {
          count,
          type,
        },
      });
    },
    [updateStats]
  );

  const recordQuranRead = useCallback(
    async (versesCount: number = 1, surah?: number, ayah?: number) => {
      return updateStats({
        action: "quran_read",
        action_data: {
          verses_count: versesCount,
          surah,
          ayah,
        },
      });
    },
    [updateStats]
  );

  const recordHadithRead = useCallback(
    async (hadithId?: string, title?: string) => {
      return updateStats({
        action: "hadith_read",
        action_data: {
          hadith_id: hadithId,
          title,
        },
      });
    },
    [updateStats]
  );

  const recordFavoriteAdded = useCallback(
    async (type: string = "general", title?: string) => {
      return updateStats({
        action: "favorite_added",
        action_data: {
          type,
          title,
        },
      });
    },
    [updateStats]
  );

  const recordContentDownloaded = useCallback(
    async (type: string = "recitation", sizeMb: number = 0, title?: string) => {
      return updateStats({
        action: "content_downloaded",
        action_data: {
          type,
          size_mb: sizeMb,
          title,
        },
      });
    },
    [updateStats]
  );

  const recordAppUsage = useCallback(
    async (minutes: number = 1, sessionType: string = "general") => {
      return updateStats({
        action: "app_usage",
        action_data: {
          minutes,
          session_type: sessionType,
        },
      });
    },
    [updateStats]
  );

  const resetAllStats = useCallback(async () => {
    return updateStats({
      action: "reset_all",
      action_data: {},
    });
  }, [updateStats]);

  // 🌐 NOUVEAU : Fonction pour synchroniser manuellement les actions en attente
  const syncPendingActions = useCallback(async () => {
    try {
      const offlineManager = OfflineStatsManager.getInstance();
      const result = await offlineManager.syncPendingActions();

      console.log(
        `🔄 Synchronisation: ${result.synced_actions} actions synchronisées`
      );
      return result;
    } catch (error) {
      console.error("❌ Erreur synchronisation:", error);
      return {
        success: false,
        synced_actions: 0,
        failed_actions: [],
        error: "Erreur synchronisation",
      };
    }
  }, []);

  return {
    updateStats,
    recordPrayer,
    recordDhikr,
    recordQuranRead,
    recordHadithRead,
    recordFavoriteAdded,
    recordContentDownloaded,
    recordAppUsage,
    resetAllStats,
    syncPendingActions,
  };
};
