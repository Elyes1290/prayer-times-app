/**
 * 🔧 Configuration centralisée de l'application
 * Toutes les URLs et clés API sont définies ici
 */

import Constants from "expo-constants";

// Configuration par défaut (fallbacks)
const DEFAULT_CONFIG = {
  apiBaseUrl: "https://myadhanapp.com/api",
  premiumContentBaseUrl: "https://myadhanapp.com/private/premium",
  recitationsBaseUrl: "https://myadhanapp.com/api/recitations",
  adhansBaseUrl: "https://myadhanapp.com/api/adhans",
  hadithApiKey: "",
};

/**
 * 🔧 Configuration de l'application
 * Utilise expo-constants pour lire les variables d'environnement
 */
export const AppConfig = {
  // URLs API
  API_BASE_URL:
    Constants.expoConfig?.extra?.apiBaseUrl || DEFAULT_CONFIG.apiBaseUrl,
  PREMIUM_CONTENT_BASE_URL:
    Constants.expoConfig?.extra?.premiumContentBaseUrl ||
    DEFAULT_CONFIG.premiumContentBaseUrl,
  RECITATIONS_BASE_URL:
    Constants.expoConfig?.extra?.recitationsBaseUrl ||
    DEFAULT_CONFIG.recitationsBaseUrl,
  ADHANS_BASE_URL:
    Constants.expoConfig?.extra?.adhansBaseUrl || DEFAULT_CONFIG.adhansBaseUrl,

  // Clés API
  HADITH_API_KEY:
    Constants.expoConfig?.extra?.hadithApiKey || DEFAULT_CONFIG.hadithApiKey,

  // URLs API construites
  USERS_API: `${
    Constants.expoConfig?.extra?.apiBaseUrl || DEFAULT_CONFIG.apiBaseUrl
  }/users.php`,
  AUTH_API: `${
    Constants.expoConfig?.extra?.apiBaseUrl || DEFAULT_CONFIG.apiBaseUrl
  }/auth.php`,
  FAVORITES_API: `${
    Constants.expoConfig?.extra?.apiBaseUrl || DEFAULT_CONFIG.apiBaseUrl
  }/favorites.php`,
  USER_STATS_API: `${
    Constants.expoConfig?.extra?.apiBaseUrl || DEFAULT_CONFIG.apiBaseUrl
  }/user-stats.php`,
  RECITATIONS_API: `${
    Constants.expoConfig?.extra?.recitationsBaseUrl ||
    DEFAULT_CONFIG.recitationsBaseUrl
  }.php`,
  ADHANS_API: `${
    Constants.expoConfig?.extra?.adhansBaseUrl || DEFAULT_CONFIG.adhansBaseUrl
  }.php`,

  // Services externes
  NOMINATIM_API_URL: "https://nominatim.openstreetmap.org",
  ALADHAN_API_URL: "http://api.aladhan.com/v1",
};

/**
 * 🔧 Vérifier la configuration
 */
export const validateConfig = () => {
  const required = ["API_BASE_URL", "HADITH_API_KEY"];
  const missing = required.filter(
    (key) => !AppConfig[key as keyof typeof AppConfig]
  );

  if (missing.length > 0) {
    console.warn("⚠️ Configuration manquante:", missing);
  }

  return missing.length === 0;
};

/**
 * 🔧 Configuration pour le développement
 */
export const isDevelopment = __DEV__;
export const isProduction = !__DEV__;

console.log("🔧 Configuration chargée:", {
  apiBase: AppConfig.API_BASE_URL,
  premium: AppConfig.PREMIUM_CONTENT_BASE_URL,
  isDev: isDevelopment,
});
