import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCurrentUserId } from "../utils/userAuth";
import { AppConfig } from "../utils/config";
import apiClient from "../utils/apiClient";

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
}

const CACHE_KEY = "user_stats_cache";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useUserStats = (): UseUserStatsReturn => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [premiumRequired, setPremiumRequired] = useState(false);
  const [premiumMessage, setPremiumMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
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
  }, [connectionState]);

  const fetchStats = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      setPremiumRequired(false);
      setPremiumMessage(null);

      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error("Aucun utilisateur connecté");
      }

      // Vérifier le cache si pas de force refresh
      if (!forceRefresh) {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          let parsedCache: any = null;
          try {
            parsedCache = JSON.parse(cached);
          } catch {
            // Cache corrompu, ignorer et refetch
            await AsyncStorage.removeItem(CACHE_KEY);
            return;
          }
          const { data, timestamp } = parsedCache;
          const age = Date.now() - timestamp;

          if (age < CACHE_DURATION) {
            setStats(data);
            setLastUpdated(new Date(timestamp));
            setLoading(false);
            return;
          }
        }
      }

      // Appel API centralisé (Authorization + refresh + retry)
      const apiResponse = await apiClient.getUserStats();
      console.log(
        "🔍 [DEBUG] Réponse API JSON:",
        JSON.stringify(apiResponse, null, 2)
      );

      // Vérifier si c'est une réponse premium
      if (!apiResponse.success && (apiResponse as any).premium_required) {
        setPremiumRequired(true);
        setPremiumMessage(
          (apiResponse as any).premium_message ||
            "Devenez Premium pour accéder à vos statistiques"
        );
        setLoading(false);
        return;
      }

      if (apiResponse.success && apiResponse.data) {
        setStats(apiResponse.data as any);
        setLastUpdated(new Date());

        // Mettre en cache
        await AsyncStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            data: apiResponse.data,
            timestamp: Date.now(),
          })
        );
      } else {
        throw new Error(
          apiResponse.message ||
            "Erreur lors de la récupération des statistiques"
        );
      }
    } catch (err) {
      console.error("Erreur useUserStats:", err);

      // En cas d'erreur, essayer de charger depuis le cache même expiré
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          setStats(data);
          setLastUpdated(new Date(timestamp));
          setLoading(false);
          return;
        }
      } catch (cacheErr) {
        console.error("Erreur cache:", cacheErr);
      }

      // Si pas de cache, afficher un message premium par défaut
      setPremiumRequired(true);
      setPremiumMessage(
        "Connectez-vous pour accéder à vos statistiques détaillées"
      );
      setError(null); // Pas d'erreur, juste premium requis
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchStats(true);
  }, [fetchStats]);

  // Charger les stats au montage
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Rafraîchir automatiquement toutes les 10 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    premiumRequired,
    premiumMessage,
    refresh,
    lastUpdated,
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
