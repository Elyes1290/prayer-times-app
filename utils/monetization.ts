// Configuration des produits premium
export const PREMIUM_PRODUCTS = {
  monthly: {
    id: "premium_monthly_4_99",
    price: 4.99,
    currency: "EUR",
    duration: "P1M", // 1 mois
    displayName: "Premium Mensuel",
    savings: 0,
  },
  yearly: {
    id: "premium_yearly_39_99",
    price: 39.99,
    currency: "EUR",
    duration: "P1Y", // 1 an
    displayName: "Premium Annuel",
    savings: 33, // 33% d'économie vs mensuel
  },
  family: {
    id: "premium_family_59_99",
    price: 59.99,
    currency: "EUR",
    duration: "P1Y", // 1 an
    displayName: "Premium Familial",
    savings: 50, // 50% d'économie vs 6 comptes mensuels
    maxUsers: 6,
  },
} as const;

// Liste des fonctionnalités premium organisées par catégorie
export const PREMIUM_FEATURES = {
  customization: {
    custom_adhan_sounds: {
      name: "Sons d'adhan personnalisés",
      description:
        "Importez vos propres sons d'adhan ou choisissez parmi une collection exclusive",
      icon: "music-note",
      category: "Personnalisation",
    },
    premium_themes: {
      name: "Thèmes premium",
      description: "Accédez à des thèmes exclusifs et élégants",
      icon: "palette",
      category: "Personnalisation",
    },
    unlimited_bookmarks: {
      name: "Favoris illimités",
      description:
        "Sauvegardez autant de versets, duas et hadiths que vous voulez",
      icon: "bookmark-multiple",
      category: "Personnalisation",
    },
  },
  analytics: {
    prayer_analytics: {
      name: "Analyse des prières",
      description:
        "Suivez vos statistiques de prières avec des graphiques détaillés",
      icon: "chart-line",
      category: "Analyse",
    },
    monthly_stats: {
      name: "Statistiques mensuelles",
      description: "Rapports mensuels détaillés de votre pratique religieuse",
      icon: "calendar-month",
      category: "Analyse",
    },
    prayer_goals: {
      name: "Objectifs de prière",
      description: "Définissez et suivez vos objectifs spirituels",
      icon: "target",
      category: "Analyse",
    },
  },
  content: {
    premium_duas: {
      name: "Collection duas premium",
      description: "Accès à une bibliothèque exclusive de duas avec audio",
      icon: "hand-heart",
      category: "Contenu",
    },
    audio_lessons: {
      name: "Leçons audio",
      description: "Cours audio sur l'Islam par des érudits reconnus",
      icon: "school",
      category: "Contenu",
    },
    exclusive_hadiths: {
      name: "Hadiths exclusifs",
      description: "Collection de hadiths rares avec explications détaillées",
      icon: "book-open-variant",
      category: "Contenu",
    },
  },
  experience: {
    ad_free: {
      name: "Sans publicité",
      description: "Expérience pure sans aucune interruption publicitaire",
      icon: "ad-off",
      category: "Expérience",
    },
    priority_support: {
      name: "Support prioritaire",
      description: "Assistance technique rapide et dédiée",
      icon: "account-star",
      category: "Expérience",
    },
  },
} as const;

// Type pour les clés de fonctionnalités
export type PremiumFeatureKey =
  | keyof typeof PREMIUM_FEATURES.customization
  | keyof typeof PREMIUM_FEATURES.analytics
  | keyof typeof PREMIUM_FEATURES.content
  | keyof typeof PREMIUM_FEATURES.experience;

// Configuration des limites pour la version gratuite
export const FREE_LIMITS = {
  favorites: {
    quran_verse: 3,
    hadith: 3,
    dhikr: 3,
    asmaul_husna: 3,
  },
  daily_prayers_tracking: 7, // 7 jours d'historique
  dhikr_categories: 2, // Accès à seulement 2 catégories de dhikr
} as const;

// Fonction pour obtenir toutes les fonctionnalités premium sous forme de liste
export const getAllPremiumFeatures = () => {
  const allFeatures: Array<{ key: string; feature: any }> = [];

  Object.values(PREMIUM_FEATURES).forEach((category) => {
    Object.entries(category).forEach(([key, feature]) => {
      allFeatures.push({ key, feature });
    });
  });

  return allFeatures;
};

// Fonction pour obtenir les fonctionnalités par catégorie
export const getFeaturesByCategory = (
  category: keyof typeof PREMIUM_FEATURES
) => {
  return Object.entries(PREMIUM_FEATURES[category]).map(([key, feature]) => ({
    key,
    feature,
  }));
};

// Configuration des prix psychologiques
export const PRICING_CONFIG = {
  currency: "EUR",
  locale: "fr-FR",

  // Prix affichés avec psychologie
  displayPrices: {
    monthly: "4,99€",
    yearly: "39,99€",
    family: "59,99€",
  },

  // Calculs d'économies
  monthlyEquivalent: {
    yearly: 3.33, // 39.99/12
    family: 4.99, // 59.99/12 pour 6 utilisateurs
  },

  // Messages de promotion
  promotions: {
    yearly: "Économisez 33% !",
    family: "6 comptes pour le prix d'un !",
    limited: "Offre limitée",
  },
};

// Gestionnaire d'upselling intelligent
export class UpsellManager {
  private static instance: UpsellManager;
  private usageCount: Map<string, number> = new Map();
  private lastUpsellDate: Map<string, Date> = new Map();

  static getInstance(): UpsellManager {
    if (!UpsellManager.instance) {
      UpsellManager.instance = new UpsellManager();
    }
    return UpsellManager.instance;
  }

  // Enregistrer l'utilisation d'une fonctionnalité
  recordFeatureUsage(feature: string) {
    const count = this.usageCount.get(feature) || 0;
    this.usageCount.set(feature, count + 1);
  }

  // Vérifier si il faut proposer l'upsell
  shouldShowUpsell(feature: string): boolean {
    const usageCount = this.usageCount.get(feature) || 0;
    const lastUpsell = this.lastUpsellDate.get(feature);
    const now = new Date();

    // Proposer après 3 utilisations
    if (usageCount >= 3) {
      // Pas plus d'une fois par jour
      if (
        !lastUpsell ||
        now.getTime() - lastUpsell.getTime() > 24 * 60 * 60 * 1000
      ) {
        return true;
      }
    }

    return false;
  }

  // Marquer qu'on a proposé l'upsell
  markUpsellShown(feature: string) {
    this.lastUpsellDate.set(feature, new Date());
  }

  // Réinitialiser les compteurs (pour les tests)
  resetCounters() {
    this.usageCount.clear();
    this.lastUpsellDate.clear();
  }
}

// Configuration des publicités (pour plus tard)
export const AD_CONFIG = {
  enabled: false, // Désactivé pour l'instant

  // Types de publicités
  types: {
    banner: {
      placement: "bottom",
      height: 50,
      refreshRate: 30000, // 30 secondes
    },
    interstitial: {
      minInterval: 300000, // 5 minutes minimum entre deux pubs
      maxPerHour: 4,
    },
    reward: {
      rewards: {
        premium_trial: "3 jours Premium gratuit",
        unlock_feature: "Débloquer temporairement une fonctionnalité",
      },
    },
  },

  // Emplacements stratégiques
  placements: {
    after_prayer_completed: "interstitial",
    dhikr_section_bottom: "banner",
    settings_screen: "banner",
    unlock_premium_content: "reward",
  },
};

// Fonctions utilitaires
export const formatPrice = (
  price: number,
  currency: string = "EUR"
): string => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
  }).format(price);
};

export const calculateSavings = (
  monthlyPrice: number,
  yearlyPrice: number
): number => {
  const yearlyEquivalent = monthlyPrice * 12;
  return Math.round(
    ((yearlyEquivalent - yearlyPrice) / yearlyEquivalent) * 100
  );
};

// Messages d'upsell contextuels
export const UPSELL_MESSAGES = {
  custom_adhan_sounds: {
    title: "Sons d'adhan personnalisés",
    subtitle: "Ajoutez vos sons préférés avec Premium",
    cta: "Débloquer maintenant",
  },
  unlimited_bookmarks: {
    title: "Favoris illimités",
    subtitle: "Sauvegardez autant de contenus que vous voulez",
    cta: "Passer à Premium",
  },
  prayer_analytics: {
    title: "Suivez vos progrès spirituels",
    subtitle: "Statistiques détaillées avec Premium",
    cta: "Voir mes stats",
  },
  ad_free: {
    title: "Expérience sans publicité",
    subtitle: "Concentrez-vous sur l'essentiel avec Premium",
    cta: "Supprimer les pubs",
  },
} as const;

// Fonction pour obtenir le message d'upselling spécifique aux favoris
export const getFavoritesLimitMessage = (
  type: string
): { title: string; message: string; cta: string } => {
  const typeNames: Record<string, string> = {
    quran_verse: "versets du Coran",
    hadith: "hadiths",
    dhikr: "dhikr et duas",
    asmaul_husna: "noms d'Allah",
  };

  const typeName = typeNames[type] || "favoris";
  const limit =
    FREE_LIMITS.favorites[type as keyof typeof FREE_LIMITS.favorites] || 3;

  return {
    title: "🔒 Limite de favoris atteinte",
    message: `Vous avez atteint la limite de ${limit} ${typeName} gratuits.\n\n✨ Passez au Premium pour des favoris illimités dans toutes les catégories !`,
    cta: "Débloquer Premium",
  };
};

// Export par défaut
export default {
  PREMIUM_PRODUCTS,
  PREMIUM_FEATURES,
  PRICING_CONFIG,
  AD_CONFIG,
  UPSELL_MESSAGES,
  FREE_LIMITS,
};
