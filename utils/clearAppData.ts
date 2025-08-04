import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Vide le cache des statistiques utilisateur pour forcer un rafraîchissement
 */
export const clearUserStatsCache = async () => {
  try {
    await AsyncStorage.removeItem("user_stats_cache");
    console.log("✅ Cache des statistiques utilisateur supprimé");
  } catch (error) {
    console.error("❌ Erreur lors de la suppression du cache:", error);
  }
};

/**
 * Vide tout le cache de l'application (pour debug)
 */
export const clearAllCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(
      (key) =>
        key.includes("cache") || key.includes("_data") || key.includes("stats")
    );

    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
      console.log(
        `✅ ${cacheKeys.length} clés de cache supprimées:`,
        cacheKeys
      );
    } else {
      console.log("ℹ️ Aucune clé de cache trouvée");
    }
  } catch (error) {
    console.error("❌ Erreur lors de la suppression du cache:", error);
  }
};

/**
 * Affiche le contenu du cache pour debug
 */
export const debugCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    console.log("🔍 Toutes les clés AsyncStorage:", keys);

    for (const key of keys) {
      const value = await AsyncStorage.getItem(key);
      console.log(`📦 ${key}:`, value?.substring(0, 100) + "...");
    }
  } catch (error) {
    console.error("❌ Erreur debug cache:", error);
  }
};
