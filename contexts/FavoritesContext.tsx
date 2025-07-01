import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useToast } from "./ToastContext";
import { useTranslation } from "react-i18next";

// Types de favoris possibles
export type FavoriteType = "quran_verse" | "hadith" | "dhikr" | "asmaul_husna";

// Interface de base pour tous les favoris
export interface BaseFavorite {
  id: string;
  type: FavoriteType;
  dateAdded: Date;
  note?: string; // Note personnelle de l'utilisateur
}

// Verset du Coran favori
export interface QuranVerseFavorite extends BaseFavorite {
  type: "quran_verse";
  chapterNumber: number;
  chapterName: string;
  verseNumber: number;
  arabicText: string;
  translation: string;
  transliteration?: string;
}

// Hadith favori
export interface HadithFavorite extends BaseFavorite {
  type: "hadith";
  bookSlug: string;
  bookName: string;
  chapterNumber: number;
  hadithNumber: string | number;
  arabicText?: string;
  englishText: string;
  narrator?: string;
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

// Union type pour tous les favoris
export type Favorite =
  | QuranVerseFavorite
  | HadithFavorite
  | DhikrFavorite
  | AsmaulHusnaFavorite;

// Interface du contexte
export interface FavoritesContextType {
  favorites: Favorite[];
  loading: boolean;

  // Actions
  addFavorite: (favorite: Omit<Favorite, "id" | "dateAdded">) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;
  isFavorite: (contentData: any) => boolean;
  getFavoritesByType: (type: FavoriteType) => Favorite[];
  updateFavoriteNote: (id: string, note: string) => Promise<void>;
  clearAllFavorites: () => Promise<void>;

  // Statistiques
  getFavoritesCount: () => number;
  getFavoritesCountByType: (type: FavoriteType) => number;
}

// Valeurs par défaut
const defaultContext: FavoritesContextType = {
  favorites: [],
  loading: false,
  addFavorite: async () => {},
  removeFavorite: async () => {},
  isFavorite: () => false,
  getFavoritesByType: () => [],
  updateFavoriteNote: async () => {},
  clearAllFavorites: async () => {},
  getFavoritesCount: () => 0,
  getFavoritesCountByType: () => 0,
};

// Contexte
const FavoritesContext = createContext<FavoritesContextType>(defaultContext);

// Clé de stockage
const STORAGE_KEY = "@prayer_app_favorites";

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
      return `hadith_${hadithFav.bookSlug}_${hadithFav.hadithNumber}`;
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
  const { showToast } = useToast();
  const { t } = useTranslation();

  // Charger les favoris au démarrage
  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const storedFavorites = await AsyncStorage.getItem(STORAGE_KEY);

      if (storedFavorites) {
        const parsedFavorites = JSON.parse(storedFavorites);
        // Convertir les dates en objets Date
        const favoritesWithDates = parsedFavorites.map((fav: any) => ({
          ...fav,
          dateAdded: new Date(fav.dateAdded),
        }));
        setFavorites(favoritesWithDates);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des favoris:", error);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  const saveFavorites = async (newFavorites: Favorite[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites));
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des favoris:", error);
    }
  };

  const addFavorite = async (
    favoriteData: Omit<Favorite, "id" | "dateAdded">
  ) => {
    try {
      const contentId = generateContentId(favoriteData);

      // Vérifier si le favori existe déjà
      if (favorites.some((fav) => generateContentId(fav) === contentId)) {
        console.log("Ce contenu est déjà dans les favoris");
        return;
      }

      const newFavorite: Favorite = {
        ...favoriteData,
        id: contentId,
        dateAdded: new Date(),
      } as Favorite;

      const updatedFavorites = [newFavorite, ...favorites];
      setFavorites(updatedFavorites);
      await saveFavorites(updatedFavorites);

      console.log("✅ Favori ajouté:", newFavorite.type, newFavorite.id);

      // Afficher un toast de succès
      showToast({
        type: "success",
        title: "✅ " + (t("favorite_added") || "Ajouté aux favoris"),
        duration: 2000,
      });
    } catch (error) {
      console.error("❌ Erreur lors de l'ajout du favori:", error);
    }
  };

  const removeFavorite = async (id: string) => {
    try {
      const updatedFavorites = favorites.filter((fav) => fav.id !== id);
      setFavorites(updatedFavorites);
      await saveFavorites(updatedFavorites);

      console.log("🗑️ Favori supprimé:", id);

      // Afficher un toast de suppression
      showToast({
        type: "info",
        title: "🗑️ " + (t("favorite_removed") || "Retiré des favoris"),
        duration: 2000,
      });
    } catch (error) {
      console.error("❌ Erreur lors de la suppression du favori:", error);
    }
  };

  const isFavorite = (contentData: any): boolean => {
    const contentId = generateContentId(contentData);
    return favorites.some((fav) => fav.id === contentId);
  };

  const getFavoritesByType = (type: FavoriteType): Favorite[] => {
    return favorites.filter((fav) => fav.type === type);
  };

  const updateFavoriteNote = async (id: string, note: string) => {
    try {
      const updatedFavorites = favorites.map((fav) =>
        fav.id === id ? { ...fav, note } : fav
      );
      setFavorites(updatedFavorites);
      await saveFavorites(updatedFavorites);

      console.log("📝 Note mise à jour pour le favori:", id);
    } catch (error) {
      console.error("❌ Erreur lors de la mise à jour de la note:", error);
    }
  };

  const clearAllFavorites = async () => {
    try {
      setFavorites([]);
      await AsyncStorage.removeItem(STORAGE_KEY);
      console.log("🗑️ Tous les favoris ont été supprimés");
    } catch (error) {
      console.error(
        "❌ Erreur lors de la suppression de tous les favoris:",
        error
      );
    }
  };

  const getFavoritesCount = (): number => {
    return favorites.length;
  };

  const getFavoritesCountByType = (type: FavoriteType): number => {
    return favorites.filter((fav) => fav.type === type).length;
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
  };

  return (
    <FavoritesContext.Provider value={contextValue}>
      {children}
    </FavoritesContext.Provider>
  );
};

// Hooks utilitaires
export const useFavorites = (): FavoritesContextType => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites doit être utilisé dans un FavoritesProvider");
  }
  return context;
};

// Hook spécialisé pour vérifier si un contenu est favori
export const useIsFavorite = (contentData: any): boolean => {
  const { isFavorite } = useFavorites();
  return isFavorite(contentData);
};

// Hook pour obtenir les favoris d'un type spécifique
export const useFavoritesByType = (type: FavoriteType): Favorite[] => {
  const { getFavoritesByType } = useFavorites();
  return getFavoritesByType(type);
};
