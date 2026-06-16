import React, { createContext, use, ReactNode } from "react";
import { useFavoritesManager } from "../hooks/useFavoritesManager";

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
  chapterNumber: string | number;
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
export interface FavoritesContextType {
  favorites: Favorite[];
  loading: boolean;

  addFavorite: (
    favoriteData: Omit<Favorite, "id" | "dateAdded">
  ) => Promise<boolean>;
  removeFavorite: (id: string) => Promise<boolean>;
  isFavorite: (contentData: Omit<Favorite, "id" | "dateAdded">) => boolean;

  getFavoritesByType: (type: FavoriteType) => Favorite[];
  updateFavoriteNote: (id: string, note: string) => Promise<boolean>;
  clearAllFavorites: () => Promise<boolean>;
  getFavoritesCount: () => number;
  getFavoritesCountByType: (type: FavoriteType) => number;

  canAddFavorite: (type: FavoriteType) => { canAdd: boolean; reason?: string };
  syncWithCloud: () => Promise<boolean>;
  isCloudSyncEnabled: boolean;

  forceReset: () => Promise<void>;
  reloadFromStorage: () => Promise<void>;
}

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
  reloadFromStorage: async () => {},
};

const FavoritesContext = createContext<FavoritesContextType>(defaultContext);

interface FavoritesProviderProps {
  children: ReactNode;
}

export const FavoritesProvider: React.FC<FavoritesProviderProps> = ({
  children,
}) => {
  const value = useFavoritesManager();
  return (
    <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
  );
};

export const useFavorites = (): FavoritesContextType => {
  const context = use(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
};
