import React, {
  createContext,
  use,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useToast } from "./ToastContext";
import { usePremium } from "./PremiumContext";
import { useTranslation } from "react-i18next";
import { FREE_LIMITS } from "../utils/monetization";
import { debugLog, errorLog } from "../utils/logger";
import { useSettings } from "./SettingsContext";

// 🚀 NOUVEAU : Import du gestionnaire de synchronisation
import SyncManager from "../utils/syncManager";
// 🚀 NOUVEAU : Import du gestionnaire de stockage stratifié
import { LocalStorageManager } from "../utils/localStorageManager";

// Types de favoris possibles
export type FavoriteType =
  | "quran_verse"
  | "hadith"
  | "dhikr"
  | "asmaul_husna"
  | "prophet_story";

// Interface de base pour tous les favoris
interface BaseFavorite {
  id: string;
  type: FavoriteType;
  dateAdded: Date;
  note?: string;
}

// Verset du Coran favori
export interface QuranVerseFavorite extends BaseFavorite {
  type: "quran_verse";
  chapterNumber: number;
  verseNumber: number;
  arabicText: string;
  translation: string;
  chapterName: string;
  juz?: number;
  page?: number;
}

// Hadith favori
export interface HadithFavorite extends BaseFavorite {
  type: "hadith";
  hadithNumber: string | number;
  bookSlug: string;
  bookName: string;
  chapterNumber: string | number; // ✅ Ajout du champ manquant
  arabicText: string;
  translation: string;
  narrator?: string;
  grade?: string;
}

// Dhikr/Dua favori
export interface DhikrFavorite extends BaseFavorite {
  type: "dhikr";
  category:
    | "dailyDua"
    | "morningDhikr"
    | "eveningDhikr"
    | "afterSalah"
    | "selectedDua";
  arabicText: string;
  translation: string;
  transliteration?: string;
  source?: string;
  benefits?: string;
}

// Nom d'Allah favori
export interface AsmaulHusnaFavorite extends BaseFavorite {
  type: "asmaul_husna";
  number: number;
  arabicName: string;
  transliteration: string;
  meaning: string;
  benefits?: string;
  usage?: string;
}

// Histoire du Prophète (SAWS) favorite
export interface ProphetStoryFavorite extends BaseFavorite {
  type: "prophet_story";
  storyId: string;
  title: string;
  titleArabic?: string;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  readingTime: number;
  isPremium: boolean;
}

// Union type pour tous les favoris
export type Favorite =
  | QuranVerseFavorite
  | HadithFavorite
  | DhikrFavorite
  | AsmaulHusnaFavorite
  | ProphetStoryFavorite;

// Interface du contexte
interface FavoritesContextType {
  favorites: Favorite[];
  loading: boolean;

  // Actions principales
  addFavorite: (
    favoriteData: Omit<Favorite, "id" | "dateAdded">
  ) => Promise<boolean>;
  removeFavorite: (id: string) => Promise<boolean>;
  isFavorite: (contentData: any) => boolean;

  // Utilitaires
  getFavoritesByType: (type: FavoriteType) => Favorite[];
  updateFavoriteNote: (id: string, note: string) => Promise<boolean>;
  clearAllFavorites: () => Promise<boolean>;
  getFavoritesCount: () => number;
  getFavoritesCountByType: (type: FavoriteType) => number;

  // Nouvelles méthodes pour la gestion premium/gratuit
  canAddFavorite: (type: FavoriteType) => { canAdd: boolean; reason?: string };
  syncWithCloud: () => Promise<boolean>;
  isCloudSyncEnabled: boolean;

  // 🚀 NOUVEAU : Fonction pour forcer la réinitialisation des favoris
  forceReset: () => Promise<void>;
}

// Valeurs par défaut
const defaultContext: FavoritesContextType = {
  favorites: [],
  loading: false,
  addFavorite: async () => false,
  removeFavorite: async () => false,
  isFavorite: () => false,
  getFavoritesByType: () => [],
  updateFavoriteNote: async () => false,
  clearAllFavorites: async () => false,
  getFavoritesCount: () => 0,
  getFavoritesCountByType: () => 0,
  canAddFavorite: () => ({ canAdd: false }),
  syncWithCloud: async () => false,
  isCloudSyncEnabled: false,
  forceReset: async () => {},
};

// Contexte
const FavoritesContext = createContext<FavoritesContextType>(defaultContext);

// Clés de stockage
const STORAGE_KEYS = {
  LOCAL_FAVORITES: "@prayer_app_favorites_local",
  CLOUD_SYNC_TIME: "@prayer_app_cloud_sync_time",
  CLOUD_SYNC_ENABLED: "@prayer_app_cloud_sync_enabled",
} as const;

// Fonction pour générer un ID unique
const generateId = (): string => {
  return `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Fonction pour générer un ID basé sur le contenu (pour éviter les doublons)
const generateContentId = (
  favorite: Omit<Favorite, "id" | "dateAdded">
): string => {
  switch (favorite.type) {
    case "quran_verse":
      const quranFav = favorite as Omit<QuranVerseFavorite, "id" | "dateAdded">;
      return `quran_${quranFav.chapterNumber}_${quranFav.verseNumber}`;
    case "hadith":
      const hadithFav = favorite as Omit<HadithFavorite, "id" | "dateAdded">;
      return `hadith_${hadithFav.bookSlug}_${hadithFav.chapterNumber}_${hadithFav.hadithNumber}`;
    case "dhikr":
      const dhikrFav = favorite as Omit<DhikrFavorite, "id" | "dateAdded">;
      return `dhikr_${dhikrFav.category}_${dhikrFav.arabicText
        .slice(0, 20)
        .replace(/\s/g, "")}`;
    case "asmaul_husna":
      const asmaFav = favorite as Omit<AsmaulHusnaFavorite, "id" | "dateAdded">;
      return `asmaul_husna_${asmaFav.number}`;
    default:
      return generateId();
  }
};

// Provider
interface FavoritesProviderProps {
  children: ReactNode;
}

export const FavoritesProvider: React.FC<FavoritesProviderProps> = ({
  children,
}) => {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCloudSyncEnabled, setIsCloudSyncEnabled] = useState(false);

  const { showToast } = useToast();
  const { user } = usePremium();
  const { t } = useTranslation();
  const { isApiSyncEnabled } = useSettings();

  // Charger les favoris au démarrage
  useEffect(() => {
    loadFavorites();
  }, []);

  // 🚀 NOUVEAU : Recharger quand l'état premium change
  useEffect(() => {
    // console.log(
    //   `🔍 [DEBUG] FavoritesContext - user.isPremium changé: ${user.isPremium}`
    // );
    // Forcer un re-render quand l'état premium change
    if (user.isPremium) {
      // console.log(
      //   `✅ [DEBUG] FavoritesContext - Utilisateur premium détecté, rechargement des favoris`
      // );
      loadFavorites();
    }
  }, [user.isPremium]);

  // Vérifier si la sync cloud est activée pour les premium
  useEffect(() => {
    checkCloudSyncSettings();
  }, [user.isPremium]);

  // 🚀 DÉSACTIVÉ TEMPORAIREMENT : Auto-sync Firebase
  // L'auto-sync sera remplacée par l'API Infomaniak
  useEffect(() => {
    // DÉSACTIVÉ pour stopper les connexions Firebase automatiques
    // if (user.isPremium && isApiSyncEnabled) {
    //   const interval = setInterval(() => {
    //     syncWithCloud();
    //   }, 2 * 60 * 1000);
    //   return () => clearInterval(interval);
    // }
  }, [user.isPremium, isApiSyncEnabled]);

  const checkCloudSyncSettings = async () => {
    try {
      if (user.isPremium) {
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
  };

  const loadFavorites = async () => {
    try {
      setLoading(true);

      // 🚀 NOUVEAU : Charger depuis le gestionnaire de stockage stratifié
      const localFavorites = await LocalStorageManager.getEssential(
        "LOCAL_FAVORITES"
      );
      let parsedFavorites: Favorite[] = [];

      if (localFavorites) {
        parsedFavorites = JSON.parse(localFavorites).map((fav: any) => ({
          ...fav,
          dateAdded: new Date(fav.dateAdded),
        }));
      }

      setFavorites(parsedFavorites);

      // Si premium et sync API activée, essayer de synchroniser avec l'API
      if (user.isPremium && isApiSyncEnabled) {
        try {
          const syncManager = SyncManager.getInstance();
          await syncManager.syncFavorites();
        } catch (error) {
          // console.log("Sync API échouée, utilisation des favoris locaux");
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des favoris:", error);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  const saveFavoritesLocally = async (newFavorites: Favorite[]) => {
    try {
      // 🚀 NOUVEAU : Utiliser le gestionnaire de stockage stratifié
      // Les favoris sont essentiels pour l'expérience utilisateur
      await LocalStorageManager.saveEssential("LOCAL_FAVORITES", newFavorites);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde locale des favoris:", error);
    }
  };

  const syncWithCloud = async (): Promise<boolean> => {
    if (!user.isPremium) {
      showToast({
        type: "error",
        title: "Premium requis",
        message:
          "La synchronisation cloud est réservée aux utilisateurs premium",
      });
      return false;
    }

    // 🚀 NOUVEAU : Mode professionnel - pas de synchronisation automatique
    // L'utilisateur doit être explicitement connecté pour synchroniser
    console.log(
      "🔍 [DEBUG] Mode professionnel - synchronisation nécessite connexion explicite"
    );
    showToast({
      type: "error",
      title: "Connexion requise",
      message: "Veuillez vous connecter explicitement pour synchroniser",
    });
    return false;

    // TODO: Réactiver la synchronisation quand le mode professionnel sera désactivé
    // Le code ci-dessous sera exécuté quand on supprimera le return false ci-dessus
    /*
    try {
      const syncTime = new Date().toISOString();

      // Synchronisation avec la base de données MySQL
      const syncManager = SyncManager.getInstance();
      await syncManager.syncFavorites();

      await AsyncStorage.setItem(STORAGE_KEYS.CLOUD_SYNC_TIME, syncTime);
      await AsyncStorage.setItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED, "true");
      setIsCloudSyncEnabled(true);

      debugLog("✅ Favoris synchronisés avec l'API");

      showToast({
        type: "success",
        title: t("favorites.sync_success", "Synchronisation réussie"),
        message: t(
          "favorites.sync_message",
          "Vos favoris ont été synchronisés"
        ),
      });

      return true;
    } catch (error) {
      errorLog("❌ Erreur sync vers API:", error);
      showToast({
        type: "error",
        title: "Erreur de synchronisation",
        message: "Impossible de synchroniser avec le serveur",
      });
      return false;
    }
    */
  };

  const canAddFavorite = (
    type: FavoriteType
  ): { canAdd: boolean; reason?: string } => {
    // 🚀 DEBUG : Ajouter des logs pour identifier le problème
    // console.log(`🔍 [DEBUG] canAddFavorite appelé pour type: ${type}`);
    // console.log(`🔍 [DEBUG] user.isPremium: ${user.isPremium}`);
    // console.log(`🔍 [DEBUG] user object:`, JSON.stringify(user, null, 2));

    if (user.isPremium) {
      // console.log(
      //   `✅ [DEBUG] Utilisateur premium - autorisé à ajouter des favoris`
      // );
      return { canAdd: true };
    }

    // Vérifier les limites pour les utilisateurs gratuits
    const currentCount = getFavoritesCountByType(type);
    const limit = FREE_LIMITS.favorites[type];

    // console.log(`🔍 [DEBUG] currentCount: ${currentCount}, limit: ${limit}`);

    if (currentCount >= limit) {
      const typeNames: Record<string, string> = {
        quran_verse: "versets du Coran",
        hadith: "hadiths",
        dhikr: "dhikr et duas",
        asmaul_husna: "noms d'Allah",
        prophet_story: "histoires du Prophète", // 🚀 NOUVEAU : Support des histoires du Prophète
      };

      const reason = `Limite de ${limit} ${typeNames[type]} atteinte. Passez au Premium pour des favoris illimités !`;
      // console.log(`❌ [DEBUG] Limite atteinte: ${reason}`);

      return {
        canAdd: false,
        reason,
      };
    }

    // console.log(
    //   `✅ [DEBUG] Utilisateur gratuit - autorisé à ajouter des favoris`
    // );
    return { canAdd: true };
  };

  const addFavorite = async (
    favoriteData: Omit<Favorite, "id" | "dateAdded">
  ): Promise<boolean> => {
    try {
      // Vérifier les permissions
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

      // Vérifier si le favori existe déjà
      if (favorites.some((fav) => generateContentId(fav) === contentId)) {
        //  console.log("Ce contenu est déjà dans les favoris");
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

      // Sync automatique pour les premium
      if (user.isPremium && isCloudSyncEnabled) {
        setTimeout(() => syncWithCloud(), 500); // Délai pour éviter le spam
      }

      // 🚀 NOUVEAU : Synchronisation avec la base de données
      try {
        const syncManager = SyncManager.getInstance();
        await syncManager.syncFavorites();
      } catch (error) {
        // console.log("Erreur synchronisation favoris:", error);
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

      // Sync automatique pour les premium
      if (user.isPremium && isCloudSyncEnabled) {
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

  const isFavorite = (contentData: any): boolean => {
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

      // Sync automatique pour les premium
      if (user.isPremium && isCloudSyncEnabled) {
        setTimeout(() => syncWithCloud(), 500);
      }

      return true;
    } catch (error) {
      console.error("❌ Erreur lors de la mise à jour de la note:", error);
      return false;
    }
  };

  const clearAllFavorites = async (): Promise<boolean> => {
    try {
      setFavorites([]);
      await AsyncStorage.removeItem(STORAGE_KEYS.LOCAL_FAVORITES);

      // Sync pour les premium
      if (user.isPremium && isCloudSyncEnabled) {
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

  const getFavoritesCountByType = (type: FavoriteType): number => {
    return favorites.filter((fav) => fav.type === type).length;
  };

  // 🚀 NOUVEAU : Fonction pour forcer la réinitialisation des favoris
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

  const contextValue: FavoritesContextType = {
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
  };

  return (
    <FavoritesContext.Provider value={contextValue}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = (): FavoritesContextType => {
  const context = use(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
};
