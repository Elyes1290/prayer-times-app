// Configuration Stripe pour les abonnements premium
export const STRIPE_CONFIG = {
  // Clés Stripe (sécurisées via variables d'environnement)
  publishableKey:
    process.env.STRIPE_PUBLISHABLE_KEY || "pk_test_your_publishable_key_here",
  secretKey: process.env.STRIPE_SECRET_KEY || "sk_test_your_secret_key_here",

  // URL de votre API backend pour les paiements
  apiUrl: "https://elyesnaitliman.ch/api/stripe",

  // Configuration des produits premium
  products: {
    monthly: {
      id: "premium_monthly_1_99",
      price: 199, // 1.99 EUR en centimes
      currency: "eur",
      interval: "month",
      displayName: "Premium Mensuel",
      description: "Accès premium complet pendant 1 mois",
    },
    yearly: {
      id: "premium_yearly_19_99",
      price: 1999, // 19.99 EUR en centimes
      currency: "eur",
      interval: "year",
      displayName: "Premium Annuel",
      description: "Accès premium complet pendant 1 an (économisez 17%)",
    },
    family: {
      id: "premium_family_29_99",
      price: 2999, // 29.99 EUR en centimes
      currency: "eur",
      interval: "year",
      displayName: "Premium Familial",
      description: "Accès premium pour jusqu'à 6 membres de famille",
    },
  },

  // Fonctionnalités incluses dans chaque abonnement
  features: {
    monthly: [
      "prayer_analytics",
      "custom_adhan_sounds",
      "premium_themes",
      "unlimited_bookmarks",
      "ad_free",
    ],
    yearly: [
      "prayer_analytics",
      "custom_adhan_sounds",
      "premium_themes",
      "unlimited_bookmarks",
      "ad_free",
      "priority_support",
      "monthly_stats",
    ],
    family: [
      "prayer_analytics",
      "custom_adhan_sounds",
      "premium_themes",
      "unlimited_bookmarks",
      "ad_free",
      "priority_support",
      "monthly_stats",
      "family_management",
      "child_profiles",
    ],
  },
} as const;

// Types pour les abonnements
export type SubscriptionType = "monthly" | "yearly" | "family";
export type StripeProductId = keyof typeof STRIPE_CONFIG.products;

// Interface pour les détails d'abonnement
export interface SubscriptionDetails {
  id: string;
  type: SubscriptionType;
  status: "active" | "canceled" | "past_due" | "unpaid";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  features: string[];
}

// Interface pour les erreurs de paiement
export interface PaymentError {
  code: string;
  message: string;
  type: "card_error" | "validation_error" | "api_error";
}
