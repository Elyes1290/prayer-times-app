// Configuration Stripe pour les abonnements premium - MODE PRODUCTION 🚀
export const STRIPE_CONFIG = {
  // Clés Stripe PRODUCTION (sécurisées via variables d'environnement uniquement)
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "", // ⚠️ PRODUCTION: Pas de fallback test
  secretKey: process.env.STRIPE_SECRET_KEY || "", // ⚠️ PRODUCTION: Pas de fallback test

  // URL de votre API backend pour les paiements
  apiUrl: "https://myadhanapp.com/api/stripe.php",

  // Configuration des produits premium
  products: {
    monthly: {
      id: "monthly", // Correspond à la clé dans stripe.php
      price: 199, // 1.99 EUR en centimes
      currency: "eur",
      interval: "month",
      displayName: "Premium Mensuel",
      description: "Accès premium complet pendant 1 mois",
    },
    yearly: {
      id: "yearly", // Correspond à la clé dans stripe.php
      price: 1999, // 19.99 EUR en centimes
      currency: "eur",
      interval: "year",
      displayName: "Premium Annuel",
      description: "Accès premium complet pendant 1 an (économisez 17%)",
    },
    family: {
      id: "family", // Correspond à la clé dans stripe.php
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

