import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCurrentUserId } from "../utils/userAuth";
import OfflineStatsManager from "../utils/OfflineStatsManager";
import { usePremium } from "../contexts/PremiumContext";

export interface UserStats {
  user_id: number;
  is_premium: boolean;
  stats: {
    total_days: number;
    complete_days: number;
    success_rate: number;
    success_rate_all_time: number;
    total_prayers: number;
    total_prayers_all_time: number;
    avg_prayers_per_day: number;
    total_dhikr: number;
    total_quran_verses: number;
    total_hadiths: number;
    total_favorites: number;
    total_downloads: number;
    total_usage_minutes: number;
    best_streak: number;
    current_streak: number;
  };
  streaks: {
    current_streak: number;
    max_streak: number;
    total_streaks: number;
    short_streaks: number;
    long_gaps: number;
    avg_streak_length: number;
  };
  profile: "beginner" | "yoyo" | "regular" | "stopped";
  advice: {
    advice: {
      key: string;
      params: Record<string, any>;
    }[];
    action_plan: {
      step_key: string;
      duration_key: string;
      reward_key: string;
    }[];
  };
  points: number;
  level: {
    level: number;
    title: string;
    progress: number;
  };
  challenges: {
    id: string;
    title: string;
    description: string;
    reward: string;
    progress: number;
    icon: string;
    color: string;
  }[];
  badges: {
    id: string;
    name: string;
    description: string;
    icon: string;
    unlocked: boolean;
    unlocked_at: string | null;
  }[];
  history: {
    date: string;
    complete: boolean;
    prayers: number;
    dhikr: number;
    quran: number;
    hadiths: number;
  }[];
  smart_notification: {
    key: string;
    params: Record<string, any>;
  };
}

interface UseUserStatsReturn {
  stats: UserStats | null;
  loading: boolean;
  error: string | null;
  premiumRequired: boolean;
  premiumMessage: string | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
  isOffline: boolean;
  pendingActionsCount: number;
}

export const useUserStats = (): UseUserStatsReturn => {
  const { user } = usePremium();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [premiumRequired, setPremiumRequired] = useState(false);
  const [premiumMessage, setPremiumMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingActionsCount, setPendingActionsCount] = useState(0);
  const [connectionState, setConnectionState] = useState<string>("unknown");

  // 🚀 NOUVEAU : Listener pour détecter les changements d'état de connexion
  useEffect(() => {
    const checkConnectionState = async () => {
      try {
        const isExplicitConnection = await AsyncStorage.getItem(
          "explicit_connection"
        );
        const userData = await AsyncStorage.getItem("user_data");
        const newState = `${isExplicitConnection}-${
          userData ? "hasData" : "noData"
        }`;

        if (newState !== connectionState) {
          console.log(
            "🔄 [DEBUG] État de connexion changé:",
            connectionState,
            "->",
            newState
          );
          setConnectionState(newState);
          // Forcer un refresh des stats quand l'état de connexion change
          await fetchStats(true);
        }
      } catch (error) {
        console.error("Erreur vérification état connexion:", error);
      }
    };

    // Vérifier l'état de connexion toutes les 2 secondes
    const interval = setInterval(checkConnectionState, 2000);

    // Vérifier immédiatement
    checkConnectionState();

    return () => clearInterval(interval);
  }, [connectionState]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStats = useCallback(
    async (forceRefresh = false) => {
      try {
        setLoading(true);
        setError(null);
        setPremiumRequired(false);
        setPremiumMessage(null);

        const userId = await getCurrentUserId();
        if (!userId) {
          throw new Error("Aucun utilisateur connecté");
        }

        // 🌐 NOUVEAU : Utiliser le gestionnaire offline
        const offlineManager = OfflineStatsManager.getInstance();
        const result = await offlineManager.getStats();

        // Ajouter challenges et badges aux stats
        if (result.stats) {
          result.stats.challenges = result.challenges || [];
          result.stats.badges = result.badges || [];
        }
        setStats(result.stats);
        setIsOffline(result.isOffline);
        setLastUpdated(result.lastSync);

        // Mettre à jour le compteur d'actions en attente
        const pendingCount = await offlineManager.getPendingActionsCount();
        setPendingActionsCount(pendingCount);

        // Si on est en mode offline et qu'il n'y a pas de données
        // MAIS SEULEMENT si l'utilisateur n'est PAS premium
        if (result.isOffline && !result.stats && !user?.isPremium) {
          setPremiumRequired(true);
          setPremiumMessage(
            "Mode hors ligne - Connectez-vous pour accéder à vos statistiques"
          );
        } else {
          // Réinitialiser premiumRequired si l'utilisateur est premium ou a des données
          setPremiumRequired(false);
          setPremiumMessage(null);
        }

        console.log(
          `📊 Stats chargées: ${
            result.isOffline ? "offline" : "online"
          }, ${pendingCount} actions en attente`
        );
      } catch (err) {
        console.error("Erreur useUserStats:", err);
        setError(err instanceof Error ? err.message : "Erreur inconnue");
        // Ne pas afficher le message premium si l'utilisateur est premium
        if (!user?.isPremium) {
          setPremiumRequired(true);
          setPremiumMessage("Erreur de chargement - Vérifiez votre connexion");
        }
      } finally {
        setLoading(false);
      }
    },
    [user?.isPremium]
  );

  const refresh = useCallback(async () => {
    await fetchStats(true);
  }, [fetchStats]);

  // Charger les stats au montage
  useEffect(() => {
    fetchStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Rafraîchir automatiquement toutes les 10 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, [fetchStats]);

  // Démarrer la synchronisation automatique au montage
  useEffect(() => {
    const offlineManager = OfflineStatsManager.getInstance();
    offlineManager.startAutoSync();

    return () => {
      offlineManager.stopAutoSync();
    };
  }, []);

  return {
    stats,
    loading,
    error,
    premiumRequired,
    premiumMessage,
    refresh,
    lastUpdated,
    isOffline,
    pendingActionsCount,
  };
};

// Hook pour mettre à jour les stats après une action (prière, dhikr, etc.)
export const useUpdateUserStats = () => {
  const { refresh } = useUserStats();

  const updateStats = useCallback(
    async (
      action: "prayer" | "dhikr" | "quran" | "hadith" | "favorite" | "download"
    ) => {
      try {
        // Pour l'instant, on rafraîchit juste les stats
        // Plus tard, on pourra optimiser en envoyant juste l'action
        await refresh();
      } catch (err) {
        console.error("Erreur mise à jour stats:", err);
      }
    },
    [refresh]
  );

  return { updateStats };
};
