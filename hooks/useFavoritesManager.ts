import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useToast } from "../contexts/ToastContext";
import { usePremium } from "../contexts/PremiumContext";
import { useTranslation } from "react-i18next";
import { FREE_LIMITS } from "../utils/monetization";
import SyncManager from "../utils/syncManager";
import { LocalStorageManager } from "../utils/localStorageManager";
import type {
  Favorite,
  FavoriteType,
  FavoritesContextType,
  QuranVerseFavorite,
  HadithFavorite,
  DhikrFavorite,
  AsmaulHusnaFavorite,
} from "../contexts/FavoritesContext";
import { useSettings } from "../contexts/SettingsContext";

const STORAGE_KEYS = {
  LOCAL_FAVORITES: "@prayer_app_favorites_local",
  CLOUD_SYNC_TIME: "@prayer_app_cloud_sync_time",
  CLOUD_SYNC_ENABLED: "@prayer_app_cloud_sync_enabled",
} as const;

const generateId = (): string => {
  return `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const generateContentId = (
  favorite: Omit<Favorite, "id" | "dateAdded">
): string => {
  switch (favorite.type) {
    case "quran_verse": {
      const quranFav = favorite as Omit<QuranVerseFavorite, "id" | "dateAdded">;
      return `quran_${quranFav.chapterNumber}_${quranFav.verseNumber}`;
    }
    case "hadith": {
      const hadithFav = favorite as Omit<HadithFavorite, "id" | "dateAdded">;
      return `hadith_${hadithFav.bookSlug}_${hadithFav.chapterNumber}_${hadithFav.hadithNumber}`;
    }
    case "dhikr": {
      const dhikrFav = favorite as Omit<DhikrFavorite, "id" | "dateAdded">;
      return `dhikr_${dhikrFav.category}_${dhikrFav.arabicText
        .slice(0, 20)
        .replace(/\s/g, "")}`;
    }
    case "asmaul_husna": {
      const asmaFav = favorite as Omit<AsmaulHusnaFavorite, "id" | "dateAdded">;
      return `asmaul_husna_${asmaFav.number}`;
    }
    default:
      return generateId();
  }
};

async function saveFavoritesLocally(newFavorites: Favorite[]) {
  try {
    await LocalStorageManager.saveEssential("LOCAL_FAVORITES", newFavorites);
  } catch (error) {
    console.error("Erreur lors de la sauvegarde locale des favoris:", error);
  }
}

export function useFavoritesManager(): FavoritesContextType {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCloudSyncEnabled, setIsCloudSyncEnabled] = useState(false);

  const { showToast } = useToast();
  const { user } = usePremium();
  const { t } = useTranslation();
  const { isApiSyncEnabled } = useSettings();
  const isPremium = user.isPremium;

  useEffect(() => {
    let cancelled = false;

    const loadFavorites = async () => {
      try {
        setLoading(true);

        const localFavorites = await LocalStorageManager.getEssential(
          "LOCAL_FAVORITES"
        );
        let parsedFavorites: Favorite[] = [];

        if (localFavorites) {
          parsedFavorites = JSON.parse(localFavorites).map((fav: Favorite) => ({
            ...fav,
            dateAdded: new Date(fav.dateAdded),
          }));
        }

        if (!cancelled) {
          setFavorites(parsedFavorites);
        }

        if (isPremium && isApiSyncEnabled) {
          try {
            const syncManager = SyncManager.getInstance();
            await syncManager.syncFavorites();
          } catch {
            // Sync API échouée, utilisation des favoris locaux
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des favoris:", error);
        if (!cancelled) {
          setFavorites([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          try {
            if (isPremium) {
              const syncEnabled = await AsyncStorage.getItem(
                STORAGE_KEYS.CLOUD_SYNC_ENABLED
              );
              setIsCloudSyncEnabled(syncEnabled === "true");
            } else {
              setIsCloudSyncEnabled(false);
            }
          } catch (error) {
            console.error("Erreur vérification sync cloud:", error);
            setIsCloudSyncEnabled(false);
          }
        }
      }
    };

    loadFavorites();

    return () => {
      cancelled = true;
    };
  }, [isPremium, isApiSyncEnabled]);

  const syncWithCloud = async (): Promise<boolean> => {
    if (!isPremium) {
      showToast({
        type: "error",
        title: "Premium requis",
        message:
          "La synchronisation cloud est réservée aux utilisateurs premium",
      });
      return false;
    }

    console.log(
      "🔍 [DEBUG] Mode professionnel - synchronisation nécessite connexion explicite"
    );
    showToast({
      type: "error",
      title: "Connexion requise",
      message: "Veuillez vous connecter explicitement pour synchroniser",
    });
    return false;
  };

  const getFavoritesCountByType = useCallback(
    (type: FavoriteType): number => {
      return favorites.filter((fav) => fav.type === type).length;
    },
    [favorites]
  );

  const canAddFavorite = (
    type: FavoriteType
  ): { canAdd: boolean; reason?: string } => {
    if (isPremium) {
      return { canAdd: true };
    }

    const currentCount = getFavoritesCountByType(type);
    const limit = FREE_LIMITS.favorites[type];

    if (currentCount >= limit) {
      const typeNames: Record<string, string> = {
        quran_verse: "versets du Coran",
        hadith: "hadiths",
        dhikr: "dhikr et duas",
        asmaul_husna: "noms d'Allah",
        prophet_story: "histoires du Prophète",
      };

      const reason = `Limite de ${limit} ${typeNames[type]} atteinte. Passez au Premium pour des favoris illimités !`;

      return {
        canAdd: false,
        reason,
      };
    }

    return { canAdd: true };
  };

  const addFavorite = async (
    favoriteData: Omit<Favorite, "id" | "dateAdded">
  ): Promise<boolean> => {
    try {
      const { canAdd, reason } = canAddFavorite(favoriteData.type);
      if (!canAdd) {
        showToast({
          type: "error",
          title: "Limite atteinte",
          message: reason || "Limite de favoris atteinte",
        });
        return false;
      }

      const contentId = generateContentId(favoriteData);

      if (favorites.some((fav) => generateContentId(fav) === contentId)) {
        return false;
      }

      const newFavorite: Favorite = {
        ...favoriteData,
        id: contentId,
        dateAdded: new Date(),
      } as Favorite;

      const updatedFavorites = [newFavorite, ...favorites];
      setFavorites(updatedFavorites);
      await saveFavoritesLocally(updatedFavorites);

      if (isPremium && isCloudSyncEnabled) {
        setTimeout(() => syncWithCloud(), 500);
      }

      try {
        const syncManager = SyncManager.getInstance();
        await syncManager.syncFavorites();
      } catch {
        // Sync API échouée
      }

      showToast({
        type: "success",
        title: "✅ " + (t("favorite_added") || "Ajouté aux favoris"),
        duration: 2000,
      });

      return true;
    } catch (error) {
      console.error("❌ Erreur lors de l'ajout du favori:", error);
      showToast({
        type: "error",
        title: "Erreur",
        message: "Impossible d'ajouter aux favoris",
      });
      return false;
    }
  };

  const removeFavorite = async (id: string): Promise<boolean> => {
    try {
      const updatedFavorites = favorites.filter((fav) => fav.id !== id);
      setFavorites(updatedFavorites);
      await saveFavoritesLocally(updatedFavorites);

      if (isPremium && isCloudSyncEnabled) {
        setTimeout(() => syncWithCloud(), 500);
      }

      showToast({
        type: "info",
        title: "🗑️ " + (t("favorite_removed") || "Retiré des favoris"),
        duration: 2000,
      });

      return true;
    } catch (error) {
      console.error("❌ Erreur lors de la suppression du favori:", error);
      return false;
    }
  };

  const isFavorite = (contentData: Omit<Favorite, "id" | "dateAdded">): boolean => {
    const contentId = generateContentId(contentData);
    return favorites.some((fav) => fav.id === contentId);
  };

  const getFavoritesByType = (type: FavoriteType): Favorite[] => {
    return favorites.filter((fav) => fav.type === type);
  };

  const updateFavoriteNote = async (
    id: string,
    note: string
  ): Promise<boolean> => {
    try {
      const updatedFavorites = favorites.map((fav) =>
        fav.id === id ? { ...fav, note } : fav
      );
      setFavorites(updatedFavorites);
      await saveFavoritesLocally(updatedFavorites);

      if (isPremium && isCloudSyncEnabled) {
        setTimeout(() => syncWithCloud(), 500);
      }

      return true;
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la note:", error);
      return false;
    }
  };

  const clearAllFavorites = async (): Promise<boolean> => {
    try {
      setFavorites([]);
      await AsyncStorage.removeItem(STORAGE_KEYS.LOCAL_FAVORITES);

      if (isPremium && isCloudSyncEnabled) {
        await syncWithCloud();
      }

      showToast({
        type: "info",
        title: t("favorites.deleted", "Favoris supprimés"),
        message: t(
          "favorites.all_deleted",
          "Tous les favoris ont été supprimés"
        ),
      });

      return true;
    } catch (error) {
      console.error(
        "❌ Erreur lors de la suppression de tous les favoris:",
        error
      );
      return false;
    }
  };

  const getFavoritesCount = (): number => {
    return favorites.length;
  };

  const forceReset = async (): Promise<void> => {
    try {
      console.log("🔄 Réinitialisation forcée des favoris...");
      setFavorites([]);
      setLoading(false);
      await AsyncStorage.removeItem(STORAGE_KEYS.LOCAL_FAVORITES);
      console.log("✅ Favoris réinitialisés");
    } catch (error) {
      console.error(
        "❌ Erreur lors de la réinitialisation des favoris:",
        error
      );
    }
  };

  const reloadFromStorage = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const localFavorites = await LocalStorageManager.getEssential(
        "LOCAL_FAVORITES",
      );
      if (!localFavorites) {
        setFavorites([]);
        return;
      }

      const parsedFavorites: Favorite[] = JSON.parse(localFavorites).map(
        (fav: Favorite) => ({
          ...fav,
          dateAdded: new Date(fav.dateAdded),
        }),
      );
      setFavorites(parsedFavorites);
    } catch (error) {
      console.error("Erreur lors du rechargement des favoris:", error);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    favorites,
    loading,
    addFavorite,
    removeFavorite,
    isFavorite,
    getFavoritesByType,
    updateFavoriteNote,
    clearAllFavorites,
    getFavoritesCount,
    getFavoritesCountByType,
    canAddFavorite,
    syncWithCloud,
    isCloudSyncEnabled,
    forceReset,
    reloadFromStorage,
  };
}
