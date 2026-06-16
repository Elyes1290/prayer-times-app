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
    metric?: string;
  };
  is_hidden: boolean;
  unlocked?: boolean;
  unlocked_at?: string;
}

interface BadgeCategory {
  name: string;
  icon: string;
  color: string;
}

interface BadgesSystemConfig {
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
class BadgesSystem {
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
            if (requirement.metric === "fajr_prayers") {
              return userStats.total_fajr_prayers >= requirement.value;
            }
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
   * Valeur actuelle de progression vers un badge
   */
  getBadgeCurrentValue(badge: Badge, userStats: BadgeUserStats): number {
    const { requirement } = badge;

    switch (requirement.type) {
      case "count":
        switch (badge.category) {
          case "prayer":
            if (requirement.metric === "fajr_prayers") {
              return userStats.total_fajr_prayers;
            }
            return userStats.total_prayers;
          case "dhikr":
            return userStats.total_dhikr_sessions;
          case "quran":
            return userStats.total_quran_sessions;
          case "hadith":
            return userStats.total_hadith_read;
          case "social":
            return userStats.content_shared;
          default:
            return 0;
        }
      case "streak":
        return userStats.current_streak;
      default:
        return 0;
    }
  }

  /**
   * Progression vers un badge (0–100 %)
   */
  getBadgeProgress(
    badge: Badge,
    userStats: BadgeUserStats,
  ): { current: number; target: number; percent: number } {
    const target = badge.requirement.value;
    const current = Math.min(this.getBadgeCurrentValue(badge, userStats), target);
    const percent =
      target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;

    return { current, target, percent };
  }

  /**
   * Badges verrouillés les plus proches du déblocage
   */
  getNextBadgeTargets(
    userStats: BadgeUserStats,
    unlockedCodes: Set<string>,
    limit = 4,
  ): { badge: Badge; current: number; target: number; percent: number }[] {
    const entries: {
      badge: Badge;
      current: number;
      target: number;
      percent: number;
    }[] = [];

    for (const badge of this.config.badges) {
      if (badge.is_hidden || unlockedCodes.has(badge.code)) continue;
      const progress = this.getBadgeProgress(badge, userStats);
      if (progress.percent >= 100) continue;
      entries.push({ badge, ...progress });
    }

    entries.sort((a, b) => b.percent - a.percent || a.target - b.target);
    return entries.slice(0, limit);
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

export type BadgeUserStats = {
  total_prayers: number;
  total_fajr_prayers: number;
  current_streak: number;
  total_dhikr_sessions: number;
  total_quran_sessions: number;
  total_hadith_read: number;
  content_shared: number;
};

function sumHistoryField(
  history: { prayers?: number; dhikr?: number; quran?: number; hadiths?: number }[],
  field: "prayers" | "dhikr" | "quran" | "hadiths",
): number {
  return history.reduce((sum, day) => sum + (day[field] ?? 0), 0);
}

/** Convertit les stats API (structure imbriquée) au format attendu par checkBadgeCondition. */
export function mapStatsToBadgeUserStats(
  stats: any,
  extraFajrCount = 0,
): BadgeUserStats {
  const s = stats?.stats ?? {};
  const streaks = stats?.streaks ?? {};
  const history = Array.isArray(stats?.history) ? stats.history : [];

  const totalPrayers = Math.max(
    s.total_prayers_all_time ?? 0,
    s.total_prayers ?? 0,
    sumHistoryField(history, "prayers"),
  );

  const remoteFajr =
    (stats?.today_prayers?.fajr ? 1 : 0) +
    (stats?.yesterday_prayers?.fajr ? 1 : 0);

  return {
    total_prayers: totalPrayers,
    total_fajr_prayers: Math.max(
      s.total_fajr_prayers ?? 0,
      remoteFajr,
      extraFajrCount,
    ),
    current_streak: streaks.current_streak ?? s.current_streak ?? 0,
    total_dhikr_sessions: Math.max(
      s.total_dhikr_all_time ?? 0,
      s.total_dhikr ?? 0,
      sumHistoryField(history, "dhikr"),
    ),
    total_quran_sessions: Math.max(
      s.total_quran_verses_all_time ?? 0,
      s.total_quran_verses ?? 0,
      sumHistoryField(history, "quran"),
    ),
    total_hadith_read: Math.max(
      s.total_hadiths_all_time ?? 0,
      s.total_hadiths ?? 0,
      sumHistoryField(history, "hadiths"),
    ),
    content_shared: s.total_shares ?? 0,
  };
}

// Export de l'instance singleton
const badgesSystem = BadgesSystem.getInstance();

// Hook personnalisé pour utiliser le système de badges
export const useBadgesSystem = () => {
  return {
    system: badgesSystem,
    mapStatsToBadgeUserStats,
    getUnlockedBadges: (userStats: BadgeUserStats) =>
      badgesSystem.getUnlockedBadges(userStats),
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
    getBadgeProgress: (badge: Badge, userStats: BadgeUserStats) =>
      badgesSystem.getBadgeProgress(badge, userStats),
    getNextBadgeTargets: (
      userStats: BadgeUserStats,
      unlockedCodes: Set<string>,
      limit?: number,
    ) => badgesSystem.getNextBadgeTargets(userStats, unlockedCodes, limit),
  };
};
