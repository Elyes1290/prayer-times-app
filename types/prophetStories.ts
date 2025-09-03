/**
 * 📚 TYPES POUR LES HISTOIRES DU PROPHÈTE (PBUH)
 * Architecture pour le contenu textuel premium
 */

export interface ProphetStory {
  id: string;
  title: string;
  titleArabic?: string;

  // 📖 Contenu principal
  content: StoryContent;

  // 🏷️ Classification
  category: StoryCategory;
  difficulty: "beginner" | "intermediate" | "advanced";
  ageRecommendation: number;

  // ⏱️ Métadonnées de lecture
  readingTime: number; // en minutes
  wordCount: number;

  // 🔗 Références islamiques
  references: IslamicReference[];
  relatedVerses?: QuranVerse[];
  relatedHadiths?: HadithReference[];

  // 📅 Informations temporelles
  historicalPeriod?: HistoricalPeriod;
  chronologicalOrder?: number;

  // 🎯 Fonctionnalités premium
  isPremium: boolean;
  hasInteractiveElements?: boolean;
  hasPersonalNotes?: boolean;

  // 📊 Statistiques
  viewCount?: number;
  rating?: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoryContent {
  // 📝 Texte principal
  introduction: string;
  chapters: StoryChapter[];
  conclusion: string;

  // 🔍 Éléments enrichis
  keyTerms: GlossaryTerm[];
  moralLesson: string;
  reflectionQuestions?: string[];
}

export interface StoryChapter {
  id: string;
  title: string;
  content: string;
  order: number;

  // 🎯 Éléments interactifs (premium)
  highlightedPhrases?: HighlightedText[];
  contextualNotes?: ContextualNote[];
}

export type StoryCategory =
  | "childhood" // Enfance du Prophète
  | "revelation" // Révélation et début de mission
  | "meccan_period" // Période mecquoise
  | "hijra" // Hijra et émigration
  | "medinian_period" // Période médinoise
  | "battles" // Batailles et conflits
  | "companions" // Relations avec les compagnons
  | "family_life" // Vie familiale
  | "final_years" // Dernières années
  | "character_traits" // Traits de caractère
  | "miracles" // Miracles
  | "daily_life"; // Vie quotidienne

export interface HistoricalPeriod {
  startYear: number; // Année hijrienne
  endYear?: number;
  location: string;
  context: string;
}

export interface IslamicReference {
  type: "quran" | "hadith" | "sira" | "historical";
  source: string;
  reference: string;
  authenticity?: "sahih" | "hasan" | "daif";
}

export interface QuranVerse {
  surah: number;
  ayah: number;
  text: string;
  translation: string;
  relevance: string;
}

export interface HadithReference {
  narrator: string;
  source: string; // Bukhari, Muslim, etc.
  number: string;
  text: string;
  translation: string;
  relevance: string;
}

export interface GlossaryTerm {
  term: string;
  arabicTerm?: string;
  definition: string;
  pronunciation?: string;
}

export interface HighlightedText {
  text: string;
  reason: "important" | "beautiful" | "lesson" | "context";
  explanation?: string;
}

export interface ContextualNote {
  position: number; // Position dans le texte
  content: string;
  type: "historical" | "linguistic" | "cultural" | "religious";
}

// 👤 Interface pour les préférences utilisateur
export interface UserStoryPreferences {
  fontSize: "small" | "medium" | "large" | "extra-large";
  fontFamily: "system" | "arabic" | "serif";
  theme: "light" | "dark" | "sepia";
  showArabicText: boolean;
  showGlossary: boolean;
  autoBookmark: boolean;
}

export interface StoryProgress {
  storyId: string;
  userId: string;
  currentChapter: number;
  currentPosition: number; // Position dans le chapitre
  completionPercentage: number;
  timeSpent: number; // en secondes
  personalNotes: PersonalNote[];
  bookmarks: Bookmark[];
  lastReadAt: string;
}

export interface PersonalNote {
  id: string;
  chapterId: string;
  position: number;
  text: string;
  createdAt: string;
}

export interface Bookmark {
  id: string;
  chapterId: string;
  position: number;
  title: string;
  createdAt: string;
}

// 📊 Interface pour les statistiques
export interface StoryStats {
  totalStories: number;
  storiesRead: number;
  totalReadingTime: number;
  favoriteCategory: StoryCategory;
  readingStreak: number;
  averageRating: number;
}
