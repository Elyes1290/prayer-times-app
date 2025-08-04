import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * 🚀 NOUVEAU : Gestionnaire de stockage local stratifié
 * Distingue 3 niveaux de données :
 * 1. ESSENTIELLES : Toujours sauvegardées (fonctionnement de l'app)
 * 2. UTILISATEUR : Mode professionnel (connexion explicite uniquement)
 * 3. PREMIUM : Premium avec connexion explicite uniquement
 */

// 🎯 NIVEAU 1 : Données ESSENTIELLES (toujours autorisées)
export const ESSENTIAL_STORAGE_KEYS = {
  // Paramètres de fonctionnement de base
  LOCATION_MODE: "locationMode",
  MANUAL_LOCATION: "manualLocation",
  AUTO_LOCATION: "autoLocation",

  // Préférences d'interface essentielles
  CURRENT_LANGUAGE: "currentLanguage",
  THEME_MODE: "theme_mode",
  IS_FIRST_TIME: "isFirstTime",

  // Paramètres de prière essentiels
  CALC_METHOD: "calcMethod",
  ADHAN_SOUND: "adhanSound",
  ADHAN_VOLUME: "adhanVolume",
  NOTIFICATIONS_ENABLED: "notificationsEnabled",
  REMINDERS_ENABLED: "remindersEnabled",
  REMINDER_OFFSET: "reminderOffset",

  // Paramètres dhikr
  ENABLED_AFTER_SALAH: "enabledAfterSalah",
  ENABLED_MORNING_DHIKR: "enabledMorningDhikr",
  ENABLED_EVENING_DHIKR: "enabledEveningDhikr",
  ENABLED_SELECTED_DUA: "enabledSelectedDua",
  DELAY_MORNING_DHIKR: "delayMorningDhikr",
  DELAY_EVENING_DHIKR: "delayEveningDhikr",
  DELAY_SELECTED_DUA: "delaySelectedDua",

  // Paramètres audio/performance
  AUDIO_QUALITY: "audioQuality",
  DOWNLOAD_STRATEGY: "downloadStrategy",
  ENABLE_DATA_SAVING: "enableDataSaving",
  MAX_CACHE_SIZE: "maxCacheSize",

  // Favoris locaux (essentiels pour l'expérience utilisateur)
  LOCAL_FAVORITES: "@prayer_app_favorites_local",

  // Personnalisation de base importante pour l'UX
  USER_FIRST_NAME: "userFirstName",
} as const;

// 🔐 NIVEAU 2 : Données UTILISATEUR (mode professionnel)
export const USER_STORAGE_KEYS = {
  USER_DATA: "user_data",
  EXPLICIT_CONNECTION: "explicit_connection",
  CUSTOM_SETTINGS: "customSettings",
  USER_SETTINGS: "user_settings",
} as const;

// 💎 NIVEAU 3 : Données PREMIUM (premium + connexion explicite)
export const PREMIUM_STORAGE_KEYS = {
  PREMIUM_USER: "@prayer_app_premium_user",
  PREMIUM_CATALOG_CACHE: "premium_catalog_cache",
  DOWNLOADED_CONTENT: "downloaded_premium_content",
  AUDIO_SETTINGS: "audio_settings",
  BACKUP_SETTINGS: "autoBackupEnabled",
  LAST_BACKUP_TIME: "lastBackupTime",
  CLOUD_SYNC_TIME: "@prayer_app_cloud_sync_time",
  CLOUD_SYNC_ENABLED: "@prayer_app_cloud_sync_enabled",
} as const;

/**
 * 📱 Gestionnaire de stockage local stratifié
 */
export class LocalStorageManager {
  // ✅ NIVEAU 1 : Stockage ESSENTIEL (toujours autorisé)
  static async saveEssential(
    key: keyof typeof ESSENTIAL_STORAGE_KEYS,
    value: any
  ): Promise<void> {
    try {
      const storageKey = ESSENTIAL_STORAGE_KEYS[key];
      const stringValue =
        typeof value === "string" ? value : JSON.stringify(value);
      await AsyncStorage.setItem(storageKey, stringValue);
      console.log(`✅ [ESSENTIAL] Sauvegardé: ${key}`);
    } catch (error) {
      console.error(`❌ [ESSENTIAL] Erreur sauvegarde ${key}:`, error);
    }
  }

  static async getEssential(
    key: keyof typeof ESSENTIAL_STORAGE_KEYS
  ): Promise<string | null> {
    try {
      const storageKey = ESSENTIAL_STORAGE_KEYS[key];
      return await AsyncStorage.getItem(storageKey);
    } catch (error) {
      console.error(`❌ [ESSENTIAL] Erreur lecture ${key}:`, error);
      return null;
    }
  }

  static async removeEssential(
    key: keyof typeof ESSENTIAL_STORAGE_KEYS
  ): Promise<void> {
    try {
      const storageKey = ESSENTIAL_STORAGE_KEYS[key];
      await AsyncStorage.removeItem(storageKey);
      console.log(`🗑️ [ESSENTIAL] Supprimé: ${key}`);
    } catch (error) {
      console.error(`❌ [ESSENTIAL] Erreur suppression ${key}:`, error);
    }
  }

  // 🔐 NIVEAU 2 : Stockage UTILISATEUR (mode professionnel)
  static async saveUser(
    key: keyof typeof USER_STORAGE_KEYS,
    value: any,
    isExplicitConnection: boolean = false
  ): Promise<void> {
    if (!isExplicitConnection) {
      console.log(
        `🔍 [USER] Mode professionnel - pas de sauvegarde automatique: ${key}`
      );
      return;
    }

    try {
      const storageKey = USER_STORAGE_KEYS[key];
      const stringValue =
        typeof value === "string" ? value : JSON.stringify(value);
      await AsyncStorage.setItem(storageKey, stringValue);
      console.log(`✅ [USER] Sauvegardé (connexion explicite): ${key}`);
    } catch (error) {
      console.error(`❌ [USER] Erreur sauvegarde ${key}:`, error);
    }
  }

  static async getUser(
    key: keyof typeof USER_STORAGE_KEYS
  ): Promise<string | null> {
    try {
      const storageKey = USER_STORAGE_KEYS[key];
      return await AsyncStorage.getItem(storageKey);
    } catch (error) {
      console.error(`❌ [USER] Erreur lecture ${key}:`, error);
      return null;
    }
  }

  static async removeUser(key: keyof typeof USER_STORAGE_KEYS): Promise<void> {
    try {
      const storageKey = USER_STORAGE_KEYS[key];
      await AsyncStorage.removeItem(storageKey);
      console.log(`🗑️ [USER] Supprimé: ${key}`);
    } catch (error) {
      console.error(`❌ [USER] Erreur suppression ${key}:`, error);
    }
  }

  // 💎 NIVEAU 3 : Stockage PREMIUM (premium + connexion explicite)
  static async savePremium(
    key: keyof typeof PREMIUM_STORAGE_KEYS,
    value: any,
    isPremium: boolean = false,
    isExplicitConnection: boolean = false
  ): Promise<void> {
    if (!isPremium) {
      console.log(`🔍 [PREMIUM] Non-premium - pas de sauvegarde: ${key}`);
      return;
    }

    if (!isExplicitConnection) {
      console.log(
        `🔍 [PREMIUM] Mode professionnel - pas de sauvegarde automatique: ${key}`
      );
      return;
    }

    try {
      const storageKey = PREMIUM_STORAGE_KEYS[key];
      const stringValue =
        typeof value === "string" ? value : JSON.stringify(value);
      await AsyncStorage.setItem(storageKey, stringValue);
      console.log(
        `✅ [PREMIUM] Sauvegardé (premium + connexion explicite): ${key}`
      );
    } catch (error) {
      console.error(`❌ [PREMIUM] Erreur sauvegarde ${key}:`, error);
    }
  }

  static async getPremium(
    key: keyof typeof PREMIUM_STORAGE_KEYS
  ): Promise<string | null> {
    try {
      const storageKey = PREMIUM_STORAGE_KEYS[key];
      return await AsyncStorage.getItem(storageKey);
    } catch (error) {
      console.error(`❌ [PREMIUM] Erreur lecture ${key}:`, error);
      return null;
    }
  }

  static async removePremium(
    key: keyof typeof PREMIUM_STORAGE_KEYS
  ): Promise<void> {
    try {
      const storageKey = PREMIUM_STORAGE_KEYS[key];
      await AsyncStorage.removeItem(storageKey);
      console.log(`🗑️ [PREMIUM] Supprimé: ${key}`);
    } catch (error) {
      console.error(`❌ [PREMIUM] Erreur suppression ${key}:`, error);
    }
  }

  // 🧹 Utilitaires de nettoyage
  static async clearUserData(): Promise<void> {
    console.log("🧹 Nettoyage des données utilisateur...");
    const userKeys = Object.values(USER_STORAGE_KEYS);
    await AsyncStorage.multiRemove(userKeys);
    console.log("✅ Données utilisateur nettoyées");
  }

  static async clearPremiumData(): Promise<void> {
    console.log("🧹 Nettoyage des données premium...");
    const premiumKeys = Object.values(PREMIUM_STORAGE_KEYS);
    await AsyncStorage.multiRemove(premiumKeys);
    console.log("✅ Données premium nettoyées");
  }

  static async clearAllData(): Promise<void> {
    console.log("🧹 Nettoyage COMPLET des données...");
    await AsyncStorage.clear();
    console.log("✅ Toutes les données nettoyées");
  }

  // 🔍 Utilitaires de vérification
  static async checkExplicitConnection(): Promise<boolean> {
    const explicitConnection = await this.getUser("EXPLICIT_CONNECTION");
    return explicitConnection === "true";
  }

  static async setExplicitConnection(isExplicit: boolean): Promise<void> {
    await AsyncStorage.setItem(
      USER_STORAGE_KEYS.EXPLICIT_CONNECTION,
      String(isExplicit)
    );
    console.log(
      `🔐 Connexion explicite: ${isExplicit ? "ACTIVÉE" : "DÉSACTIVÉE"}`
    );
  }
}

/**
 * 📋 Hooks utilitaires pour faciliter l'usage
 */
export const useLocalStorage = () => {
  const saveEssential = async (
    key: keyof typeof ESSENTIAL_STORAGE_KEYS,
    value: any
  ) => {
    await LocalStorageManager.saveEssential(key, value);
  };

  const getEssential = async (key: keyof typeof ESSENTIAL_STORAGE_KEYS) => {
    return await LocalStorageManager.getEssential(key);
  };

  const saveUserData = async (
    key: keyof typeof USER_STORAGE_KEYS,
    value: any
  ) => {
    const isExplicit = await LocalStorageManager.checkExplicitConnection();
    await LocalStorageManager.saveUser(key, value, isExplicit);
  };

  const savePremiumData = async (
    key: keyof typeof PREMIUM_STORAGE_KEYS,
    value: any,
    isPremium: boolean
  ) => {
    const isExplicit = await LocalStorageManager.checkExplicitConnection();
    await LocalStorageManager.savePremium(key, value, isPremium, isExplicit);
  };

  return {
    saveEssential,
    getEssential,
    saveUserData,
    savePremiumData,
    checkExplicitConnection: LocalStorageManager.checkExplicitConnection,
    setExplicitConnection: LocalStorageManager.setExplicitConnection,
  };
};
