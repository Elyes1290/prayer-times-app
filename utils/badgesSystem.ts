import { useSettingsOptimized } from "@/hooks/useSettingsOptimized";

// Types pour le système de badges
export interface Badge {
  id: string;
  code: string;
  category:
    | "prayer"
    | "streak"
    | "dhikr"
    | "quran"
    | "hadith"
    | "social"
    | "premium";
  name: {
    fr: string;
    ar: string;
    en: string;
  };
  description: {
    fr: string;
    ar: string;
    en: string;
  };
  icon: string;
  points: number;
  requirement: {
    type: "count" | "streak" | "date" | "custom";
    value: number;
  };
  is_hidden: boolean;
  unlocked?: boolean;
  unlocked_at?: string;
}

export interface BadgeCategory {
  name: string;
  icon: string;
  color: string;
}

export interface BadgesSystemConfig {
  categories: Record<string, BadgeCategory>;
  badges: Badge[];
  metadata: {
    version: string;
    last_updated: string;
    total_badges: number;
    supported_languages: string[];
  };
}

// Import du système de badges
const badgesSystemData =
  require("@/assets/data/badges/badges-system.json") as BadgesSystemConfig;

/**
 * Classe pour gérer le système de badges
 */
export class BadgesSystem {
  private static instance: BadgesSystem;
  private config: BadgesSystemConfig;

  private constructor() {
    this.config = badgesSystemData;
  }

  static getInstance(): BadgesSystem {
    if (!BadgesSystem.instance) {
      BadgesSystem.instance = new BadgesSystem();
    }
    return BadgesSystem.instance;
  }

  /**
   * Obtenir tous les badges
   */
  getAllBadges(): Badge[] {
    return this.config.badges;
  }

  /**
   * Obtenir les badges par catégorie
   */
  getBadgesByCategory(category: string): Badge[] {
    return this.config.badges.filter((badge) => badge.category === category);
  }

  /**
   * Obtenir un badge par son code
   */
  getBadgeByCode(code: string): Badge | undefined {
    return this.config.badges.find((badge) => badge.code === code);
  }

  /**
   * Obtenir les catégories
   */
  getCategories(): Record<string, BadgeCategory> {
    return this.config.categories;
  }

  /**
   * Obtenir le texte localisé d'un badge
   */
  getLocalizedBadgeText(
    badge: Badge,
    field: "name" | "description",
    language: string = "fr"
  ): string {
    const supportedLang = this.config.metadata.supported_languages.includes(
      language
    )
      ? language
      : "fr";
    return (
      badge[field][supportedLang as keyof typeof badge.name] || badge[field].fr
    );
  }

  /**
   * Vérifier si un badge doit être débloqué selon les stats utilisateur
   */
  checkBadgeCondition(badge: Badge, userStats: any): boolean {
    const { requirement } = badge;

    switch (requirement.type) {
      case "count":
        // Logique selon la catégorie du badge
        switch (badge.category) {
          case "prayer":
            return userStats.total_prayers >= requirement.value;
          case "dhikr":
            return userStats.total_dhikr_sessions >= requirement.value;
          case "quran":
            return userStats.total_quran_sessions >= requirement.value;
          case "hadith":
            return userStats.total_hadith_read >= requirement.value;
          case "social":
            return userStats.content_shared >= requirement.value;
          default:
            return false;
        }

      case "streak":
        return userStats.current_streak >= requirement.value;

      case "date":
        // Pour les badges liés à des dates spéciales
        return false; // À implémenter selon vos besoins

      case "custom":
        // Pour des logiques personnalisées
        return false; // À implémenter selon vos besoins

      default:
        return false;
    }
  }

  /**
   * Obtenir tous les badges que l'utilisateur devrait avoir débloqués
   */
  getUnlockedBadges(userStats: any): Badge[] {
    return this.config.badges.filter(
      (badge) => !badge.is_hidden && this.checkBadgeCondition(badge, userStats)
    );
  }

  /**
   * Obtenir les badges cachés que l'utilisateur a débloqués
   */
  getUnlockedHiddenBadges(userStats: any): Badge[] {
    return this.config.badges.filter(
      (badge) => badge.is_hidden && this.checkBadgeCondition(badge, userStats)
    );
  }

  /**
   * Calculer les points totaux des badges débloqués
   */
  getTotalPointsFromBadges(unlockedBadges: Badge[]): number {
    return unlockedBadges.reduce((total, badge) => total + badge.points, 0);
  }

  /**
   * Obtenir les statistiques du système de badges
   */
  getSystemStats() {
    const badges = this.config.badges;
    const categories = Object.keys(this.config.categories);

    return {
      total: badges.length,
      by_category: categories.reduce((acc, cat) => {
        acc[cat] = badges.filter((b) => b.category === cat).length;
        return acc;
      }, {} as Record<string, number>),
      by_requirement_type: ["count", "streak", "date", "custom"].reduce(
        (acc, type) => {
          acc[type] = badges.filter((b) => b.requirement.type === type).length;
          return acc;
        },
        {} as Record<string, number>
      ),
      hidden_count: badges.filter((b) => b.is_hidden).length,
      total_points: badges.reduce((sum, b) => sum + b.points, 0),
    };
  }

  /**
   * Obtenir la couleur d'une catégorie
   */
  getCategoryColor(category: string): string {
    return this.config.categories[category]?.color || "#95A5A6";
  }

  /**
   * Obtenir la couleur d'un badge selon sa catégorie
   */
  getBadgeColor(badge: Badge): string {
    return this.getCategoryColor(badge.category);
  }
}

// Export de l'instance singleton
export const badgesSystem = BadgesSystem.getInstance();

// Hook personnalisé pour utiliser le système de badges
export const useBadgesSystem = () => {
  return {
    system: badgesSystem,
    getAllBadges: () => badgesSystem.getAllBadges(),
    getBadgesByCategory: (category: string) =>
      badgesSystem.getBadgesByCategory(category),
    getBadgeByCode: (code: string) => badgesSystem.getBadgeByCode(code),
    getCategories: () => badgesSystem.getCategories(),
    checkBadgeCondition: (badge: Badge, userStats: any) =>
      badgesSystem.checkBadgeCondition(badge, userStats),
    getSystemStats: () => badgesSystem.getSystemStats(),
    getLocalizedBadgeText: (
      badge: Badge,
      field: "name" | "description",
      language?: string
    ) => badgesSystem.getLocalizedBadgeText(badge, field, language),
    getBadgeColor: (badge: Badge) => badgesSystem.getBadgeColor(badge),
    getCategoryColor: (category: string) =>
      badgesSystem.getCategoryColor(category),
  };
};
