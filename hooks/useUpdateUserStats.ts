import { useCallback } from "react";
import { getCurrentUserId } from "../utils/userAuth";
import { AppConfig } from "../utils/config";

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

      const response = await fetch(AppConfig.USER_STATS_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          action: updateAction.action,
          action_data: updateAction.action_data || {},
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log("✅ Statistiques mises à jour:", result.message);
        return { success: true, data: result.data };
      } else {
        console.error("❌ Erreur mise à jour stats:", result.message);
        return { success: false, error: result.message };
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
  };
};
