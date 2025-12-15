// utils/PrayerTimesCacheService.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PrayerTimes } from "adhan";
import { debugLog, errorLog } from "./logger";

// Types pour le cache
export interface CachedPrayerTimes {
  prayerTimes: {
    fajr: string;
    sunrise: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
  };
  metadata: {
    date: string;
    latitude: number;
    longitude: number;
    calcMethod: string;
    cachedAt: string;
    expiresAt: string;
  };
}

export interface CacheStats {
  totalEntries: number;
  memoryUsage: number;
  oldestEntry: string | null;
  newestEntry: string | null;
}

class PrayerTimesCacheService {
  private static instance: PrayerTimesCacheService;
  private memoryCache = new Map<string, CachedPrayerTimes>();
  private readonly CACHE_PREFIX = "prayer_times_cache_";
  private readonly MAX_MEMORY_ENTRIES = 30; // 30 jours max en mémoire
  private readonly CACHE_EXPIRY_DAYS = 30; // 30 jours de persistance

  private constructor() {
    this.initializeCache();
  }

  public static getInstance(): PrayerTimesCacheService {
    if (!PrayerTimesCacheService.instance) {
      PrayerTimesCacheService.instance = new PrayerTimesCacheService();
    }
    return PrayerTimesCacheService.instance;
  }

  /**
   * Initialise le cache en chargeant les données depuis AsyncStorage
   */
  private async initializeCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith(this.CACHE_PREFIX));

      if (cacheKeys.length === 0) {
        debugLog("📦 Cache vide - initialisation terminée");
        return;
      }

      // Charger les entrées les plus récentes en mémoire
      const recentKeys = cacheKeys.sort().slice(-this.MAX_MEMORY_ENTRIES);

      const entries = await AsyncStorage.multiGet(recentKeys);

      for (const [key, value] of entries) {
        if (value) {
          try {
            const cachedData = JSON.parse(value) as CachedPrayerTimes;
            const cacheKey = key.replace(this.CACHE_PREFIX, "");
            this.memoryCache.set(cacheKey, cachedData);
          } catch (error) {
            errorLog("❌ Erreur parsing cache entry:", error);
          }
        }
      }

      debugLog(
        `📦 Cache initialisé - ${this.memoryCache.size} entrées en mémoire`
      );
    } catch (error) {
      errorLog("❌ Erreur initialisation cache:", error);
    }
  }

  /**
   * Génère une clé de cache unique
   */
  private generateCacheKey(
    date: Date,
    latitude: number | null,
    longitude: number | null,
    calcMethod: string
  ): string {
    if (!latitude || !longitude) {
      throw new Error("Latitude and longitude are required");
    }
    // 🐛 FIX iOS: Utiliser l'heure locale au lieu d'UTC pour éviter les décalages de jour
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const locationKey = `${latitude.toFixed(4)}_${longitude.toFixed(4)}`;
    return `${dateStr}_${locationKey}_${calcMethod}`;
  }

  /**
   * Vérifie si une entrée de cache est valide
   */
  private isCacheValid(cachedData: CachedPrayerTimes): boolean {
    const now = new Date();
    const expiresAt = new Date(cachedData.metadata.expiresAt);
    return now < expiresAt;
  }

  /**
   * Récupère les horaires de prière depuis le cache
   */
  public async getCachedPrayerTimes(
    date: Date,
    latitude: number | null,
    longitude: number | null,
    calcMethod: string
  ): Promise<CachedPrayerTimes | null> {
    if (!latitude || !longitude) {
      return null;
    }
    const cacheKey = this.generateCacheKey(
      date,
      latitude,
      longitude,
      calcMethod
    );

    try {
      // 1. Vérifier le cache mémoire d'abord (ultra-rapide)
      const memoryEntry = this.memoryCache.get(cacheKey);
      if (memoryEntry && this.isCacheValid(memoryEntry)) {
        debugLog(`⚡ Cache mémoire hit pour ${cacheKey}`);
        return memoryEntry;
      }

      // 2. Vérifier le cache persistant
      const persistentKey = this.CACHE_PREFIX + cacheKey;
      const cachedValue = await AsyncStorage.getItem(persistentKey);

      if (cachedValue) {
        const cachedData = JSON.parse(cachedValue) as CachedPrayerTimes;

        if (this.isCacheValid(cachedData)) {
          // Mettre en cache mémoire pour les prochains accès
          this.memoryCache.set(cacheKey, cachedData);
          debugLog(`💾 Cache persistant hit pour ${cacheKey}`);
          return cachedData;
        } else {
          // Cache expiré, le supprimer
          await this.removeCachedEntry(cacheKey);
        }
      }

      debugLog(`❌ Cache miss pour ${cacheKey}`);
      return null;
    } catch (error) {
      errorLog("❌ Erreur récupération cache:", error);
      return null;
    }
  }

  /**
   * Sauvegarde les horaires de prière dans le cache
   */
  public async setCachedPrayerTimes(
    date: Date,
    latitude: number,
    longitude: number,
    calcMethod: string,
    prayerTimes: PrayerTimes
  ): Promise<void> {
    if (!latitude || !longitude) {
      throw new Error("Latitude and longitude are required");
    }
    const cacheKey = this.generateCacheKey(
      date,
      latitude,
      longitude,
      calcMethod
    );
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + this.CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    );

    const cachedData: CachedPrayerTimes = {
      prayerTimes: {
        fajr: prayerTimes.fajr.toISOString(),
        sunrise: prayerTimes.sunrise.toISOString(),
        dhuhr: prayerTimes.dhuhr.toISOString(),
        asr: prayerTimes.asr.toISOString(),
        maghrib: prayerTimes.maghrib.toISOString(),
        isha: prayerTimes.isha.toISOString(),
      },
      metadata: {
        date: date.toISOString().split("T")[0],
        latitude,
        longitude,
        calcMethod,
        cachedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
    };

    try {
      // 1. Sauvegarder en mémoire
      this.memoryCache.set(cacheKey, cachedData);

      // 2. Sauvegarder en persistant
      const persistentKey = this.CACHE_PREFIX + cacheKey;
      await AsyncStorage.setItem(persistentKey, JSON.stringify(cachedData));

      // 3. Nettoyer la mémoire si nécessaire
      this.cleanupMemoryCache();

      debugLog(`💾 Cache sauvegardé pour ${cacheKey}`);
    } catch (error) {
      errorLog("❌ Erreur sauvegarde cache:", error);
    }
  }

  /**
   * Nettoie le cache mémoire pour éviter le débordement
   */
  private cleanupMemoryCache(): void {
    if (this.memoryCache.size <= this.MAX_MEMORY_ENTRIES) {
      return;
    }

    // Supprimer les entrées les plus anciennes
    const entries = Array.from(this.memoryCache.entries());
    entries.sort(
      (a, b) =>
        new Date(a[1].metadata.cachedAt).getTime() -
        new Date(b[1].metadata.cachedAt).getTime()
    );

    const toRemove = entries.slice(0, entries.length - this.MAX_MEMORY_ENTRIES);
    for (const [key] of toRemove) {
      this.memoryCache.delete(key);
    }

    debugLog(
      `🧹 Cache mémoire nettoyé - ${this.memoryCache.size} entrées restantes`
    );
  }

  /**
   * Supprime une entrée de cache
   */
  private async removeCachedEntry(cacheKey: string): Promise<void> {
    try {
      // Supprimer de la mémoire
      this.memoryCache.delete(cacheKey);

      // Supprimer du persistant
      const persistentKey = this.CACHE_PREFIX + cacheKey;
      await AsyncStorage.removeItem(persistentKey);

      debugLog(`🗑️ Entrée cache supprimée: ${cacheKey}`);
    } catch (error) {
      errorLog("❌ Erreur suppression cache:", error);
    }
  }

  /**
   * Nettoie tous les caches expirés
   */
  public async cleanupExpiredCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith(this.CACHE_PREFIX));

      const expiredKeys: string[] = [];
      const entries = await AsyncStorage.multiGet(cacheKeys);

      for (const [key, value] of entries) {
        if (value) {
          try {
            const cachedData = JSON.parse(value) as CachedPrayerTimes;
            if (!this.isCacheValid(cachedData)) {
              expiredKeys.push(key);
            }
          } catch (error) {
            // Données corrompues, les supprimer
            expiredKeys.push(key);
          }
        }
      }

      if (expiredKeys.length > 0) {
        await AsyncStorage.multiRemove(expiredKeys);
        debugLog(`🧹 ${expiredKeys.length} entrées expirées supprimées`);
      }

      // Nettoyer aussi la mémoire
      for (const [key, value] of this.memoryCache.entries()) {
        if (!this.isCacheValid(value)) {
          this.memoryCache.delete(key);
        }
      }
    } catch (error) {
      errorLog("❌ Erreur nettoyage cache:", error);
    }
  }

  /**
   * Obtient les statistiques du cache
   */
  public async getCacheStats(): Promise<CacheStats> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith(this.CACHE_PREFIX));

      let oldestEntry: string | null = null;
      let newestEntry: string | null = null;
      let totalSize = 0;

      if (cacheKeys.length > 0) {
        const entries = await AsyncStorage.multiGet(cacheKeys);

        for (const [key, value] of entries) {
          if (value) {
            totalSize += value.length;
            const cacheKey = key.replace(this.CACHE_PREFIX, "");

            if (!oldestEntry || cacheKey < oldestEntry) {
              oldestEntry = cacheKey;
            }
            if (!newestEntry || cacheKey > newestEntry) {
              newestEntry = cacheKey;
            }
          }
        }
      }

      return {
        totalEntries: cacheKeys.length,
        memoryUsage: totalSize,
        oldestEntry,
        newestEntry,
      };
    } catch (error) {
      errorLog("❌ Erreur stats cache:", error);
      return {
        totalEntries: 0,
        memoryUsage: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }
  }

  /**
   * Vide complètement le cache
   */
  public async clearAllCache(): Promise<void> {
    try {
      // Vider la mémoire
      this.memoryCache.clear();

      // Vider le persistant
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith(this.CACHE_PREFIX));

      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }

      debugLog("🗑️ Cache complètement vidé");
    } catch (error) {
      errorLog("❌ Erreur vidage cache:", error);
    }
  }

  /**
   * Préchage les horaires pour une période donnée
   */
  public async preloadPrayerTimes(
    startDate: Date,
    endDate: Date,
    latitude: number,
    longitude: number,
    calcMethod: string,
    computeFunction: (
      date: Date,
      lat: number,
      lon: number,
      method: string
    ) => Promise<PrayerTimes>
  ): Promise<void> {
    try {
      const dates: Date[] = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      debugLog(`🔄 Préchargement de ${dates.length} jours d'horaires`);

      // Calculer en parallèle (max 5 à la fois pour éviter la surcharge)
      const batchSize = 5;
      for (let i = 0; i < dates.length; i += batchSize) {
        const batch = dates.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (date) => {
            // Vérifier si déjà en cache
            const existing = await this.getCachedPrayerTimes(
              date,
              latitude,
              longitude,
              calcMethod
            );
            if (existing) {
              return; // Déjà en cache
            }

            // Calculer et sauvegarder
            const prayerTimes = await computeFunction(
              date,
              latitude,
              longitude,
              calcMethod
            );
            await this.setCachedPrayerTimes(
              date,
              latitude,
              longitude,
              calcMethod,
              prayerTimes
            );
          })
        );

        // Petit délai entre les batches pour éviter la surcharge
        if (i + batchSize < dates.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      debugLog(`✅ Préchargement terminé - ${dates.length} jours`);
    } catch (error) {
      errorLog("❌ Erreur préchargement:", error);
    }
  }
}

export default PrayerTimesCacheService;
