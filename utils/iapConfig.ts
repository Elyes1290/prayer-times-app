// Configuration RevenueCat pour les In-App Purchases (iOS uniquement)
export const IAP_CONFIG = {
  // 🔑 À configurer dans le dashboard RevenueCat
  appleApiKey: "appl_ShuCsFiQdqkghJXOnylAQahxwrg",

  // Entitlements (les droits d'accès définis dans RevenueCat)
  entitlementId: "MyAdhan Pro",

  // Configuration des produits (doivent correspondre aux IDs dans App Store Connect)
  products: {
    monthly: {
      id: "com.drogbinho.myadhan.sub.monthly",
      displayName: "Premium Mensuel",
      description: "Accès premium complet pendant 1 mois",
    },
    yearly: {
      id: "com.drogbinho.myadhan.sub.yearly",
      displayName: "Premium Annuel",
      description: "Accès premium complet pendant 1 an",
    },
  },
} as const;

export type IapSubscriptionType = keyof typeof IAP_CONFIG.products;
