// hooks/usePrayerTimesCache.ts
import { useState, useEffect, useCallback, useMemo } from "react";
import { PrayerTimes } from "adhan";
import type { LocationObject } from "expo-location";
import PrayerTimesCacheService, {
  CachedPrayerTimes,
} from "../utils/PrayerTimesCacheService";
import PrayerTimesPreloader from "../utils/PrayerTimesPreloader";
import { debugLog, errorLog } from "../utils/logger";

interface UsePrayerTimesCacheOptions {
  enablePreloading?: boolean;
  preloadDays?: number;
  enableBackgroundPreload?: boolean;
  isPremium?: boolean; // Nouveau : statut premium
}

interface CacheStats {
  isLoaded: boolean;
  isPreloading: boolean;
  cacheHits: number;
  cacheMisses: number;
  totalEntries: number;
  memoryUsage: number;
}

export function usePrayerTimesCache(
  location: LocationObject | null,
  date: Date,
  calcMethod: string,
  options: UsePrayerTimesCacheOptions = {}
) {
  const {
    enablePreloading = true,
    preloadDays = 7,
    enableBackgroundPreload = true,
    isPremium = false,
  } = options;

  // 🎯 LOGIQUE PREMIUM vs GRATUIT
  const effectivePreloadDays = isPremium
    ? Math.min(preloadDays, 30)
    : Math.min(preloadDays, 7);
  const effectiveBackgroundPreload = isPremium
    ? enableBackgroundPreload
    : false;

  // États
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const [cacheStats, setCacheStats] = useState<CacheStats>({
    isLoaded: false,
    isPreloading: false,
    cacheHits: 0,
    cacheMisses: 0,
    totalEntries: 0,
    memoryUsage: 0,
  });

  // Services
  const cacheService = useMemo(() => PrayerTimesCacheService.getInstance(), []);
  const preloader = useMemo(() => PrayerTimesPreloader.getInstance(), []);

  // Stabiliser les valeurs primitives
  const latitude = location?.coords?.latitude;
  const longitude = location?.coords?.longitude;
  const dateKey = useMemo(() => {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }, [date.getFullYear(), date.getMonth(), date.getDate()]);

  // Clé de cache unique
  const cacheKey = useMemo(() => {
    if (!latitude || !longitude) return null;
    return `${dateKey}_${latitude.toFixed(4)}_${longitude.toFixed(
      4
    )}_${calcMethod}`;
  }, [dateKey, latitude, longitude, calcMethod]);

  /**
   * Convertit les données de cache en objet PrayerTimes
   */
  const convertCachedToPrayerTimes = useCallback(
    (cached: CachedPrayerTimes): PrayerTimes => {
      const { prayerTimes: times, metadata } = cached;

      // Créer un objet PrayerTimes avec les dates converties
      const result = {
        fajr: new Date(times.fajr),
        sunrise: new Date(times.sunrise),
        dhuhr: new Date(times.dhuhr),
        asr: new Date(times.asr),
        maghrib: new Date(times.maghrib),
        isha: new Date(times.isha),
      } as PrayerTimes;

      return result;
    },
    []
  );

  /**
   * Calcule les horaires de prière localement
   */
  const computePrayerTimes =
    useCallback(async (): Promise<PrayerTimes | null> => {
      if (!latitude || !longitude) return null;

      try {
        // Importer la fonction de calcul
        const { computePrayerTimesForDate } = await import(
          "../utils/prayerTimes"
        );

        // Calculer les horaires
        const times = computePrayerTimesForDate(
          date,
          { latitude, longitude },
          calcMethod
        );

        // Convertir en PrayerTimes avec les bons paramètres
        const coords = { latitude, longitude };

        // Obtenir les paramètres de calcul selon la méthode
        const { CalculationMethod } = await import("adhan");
        let params;
        switch (calcMethod) {
          case "MuslimWorldLeague":
            params = CalculationMethod.MuslimWorldLeague();
            break;
          case "Egyptian":
            params = CalculationMethod.Egyptian();
            break;
          case "Karachi":
            params = CalculationMethod.Karachi();
            break;
          case "UmmAlQura":
            params = CalculationMethod.UmmAlQura();
            params.fajrAngle = 15.0;
            break;
          case "NorthAmerica":
            params = CalculationMethod.NorthAmerica();
            break;
          case "Kuwait":
            params = CalculationMethod.Kuwait();
            break;
          case "Qatar":
            params = CalculationMethod.Qatar();
            break;
          case "Singapore":
            params = CalculationMethod.Singapore();
            break;
          case "Tehran":
            params = CalculationMethod.Tehran();
            break;
          default:
            params = CalculationMethod.MuslimWorldLeague();
            break;
        }

        // Créer l'objet PrayerTimes
        const prayerTimes = new PrayerTimes(coords, date, params);

        return prayerTimes;
      } catch (error) {
        errorLog("❌ Erreur calcul horaires:", error);
        return null;
      }
    }, [latitude, longitude, date, calcMethod]);

  /**
   * Charge les horaires depuis le cache ou les calcule
   */
  const loadPrayerTimes = useCallback(async () => {
    if (!latitude || !longitude || !cacheKey) {
      setPrayerTimes(null);
      setIsFromCache(false);
      return;
    }

    setIsLoading(true);

    try {
      // 1. Essayer de récupérer depuis le cache
      const cached = await cacheService.getCachedPrayerTimes(
        date,
        latitude,
        longitude,
        calcMethod
      );

      if (cached) {
        // Cache hit - convertir et utiliser
        const prayerTimes = convertCachedToPrayerTimes(cached);
        setPrayerTimes(prayerTimes);
        setIsFromCache(true);

        // Mettre à jour les stats
        setCacheStats((prev) => ({
          ...prev,
          cacheHits: prev.cacheHits + 1,
          isLoaded: true,
        }));

        debugLog(`⚡ Cache hit pour ${cacheKey}`);
      } else {
        // Cache miss - calculer et sauvegarder
        const prayerTimes = await computePrayerTimes();

        if (prayerTimes) {
          setPrayerTimes(prayerTimes);
          setIsFromCache(false);

          // Sauvegarder en cache
          await cacheService.setCachedPrayerTimes(
            date,
            latitude,
            longitude,
            calcMethod,
            prayerTimes
          );

          // Mettre à jour les stats
          setCacheStats((prev) => ({
            ...prev,
            cacheMisses: prev.cacheMisses + 1,
            isLoaded: true,
          }));

          debugLog(`💾 Cache miss - calculé et sauvegardé pour ${cacheKey}`);
        } else {
          setPrayerTimes(null);
          setIsFromCache(false);
        }
      }
    } catch (error) {
      errorLog("❌ Erreur chargement horaires:", error);
      setPrayerTimes(null);
      setIsFromCache(false);
    } finally {
      setIsLoading(false);
    }
  }, [
    latitude,
    longitude,
    cacheKey,
    date,
    calcMethod,
    cacheService,
    convertCachedToPrayerTimes,
    computePrayerTimes,
  ]);

  /**
   * Démarre le préchargement intelligent
   */
  const startPreloading = useCallback(async () => {
    if (!latitude || !longitude || !enablePreloading) return;

    try {
      setCacheStats((prev) => ({ ...prev, isPreloading: true }));

      await preloader.startPreloading({
        latitude,
        longitude,
        calcMethod,
        preloadDays: effectivePreloadDays,
        maxConcurrent: isPremium ? 5 : 3,
      });

      setCacheStats((prev) => ({ ...prev, isPreloading: false }));
    } catch (error) {
      errorLog("❌ Erreur préchargement:", error);
      setCacheStats((prev) => ({ ...prev, isPreloading: false }));
    }
  }, [
    latitude,
    longitude,
    calcMethod,
    enablePreloading,
    preloadDays,
    preloader,
  ]);

  /**
   * Charge les horaires et démarre le préchargement
   */
  useEffect(() => {
    loadPrayerTimes();
  }, [loadPrayerTimes]);

  /**
   * Démarre le préchargement en arrière-plan
   */
  useEffect(() => {
    if (effectiveBackgroundPreload && latitude && longitude) {
      // Délai pour éviter la surcharge au démarrage
      const timer = setTimeout(() => {
        startPreloading();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [latitude, longitude, effectiveBackgroundPreload, startPreloading]);

  /**
   * Met à jour les statistiques du cache
   */
  const updateCacheStats = useCallback(async () => {
    try {
      const stats = await cacheService.getCacheStats();
      const preloadStats = await preloader.getPreloadStats();

      setCacheStats((prev) => ({
        ...prev,
        totalEntries: stats.totalEntries,
        memoryUsage: stats.memoryUsage,
        isPreloading: preloadStats.isActive,
      }));
    } catch (error) {
      errorLog("❌ Erreur mise à jour stats:", error);
    }
  }, [cacheService, preloader]);

  /**
   * Nettoie le cache expiré
   */
  const cleanupCache = useCallback(async () => {
    try {
      await cacheService.cleanupExpiredCache();
      await updateCacheStats();
      debugLog("🧹 Cache nettoyé");
    } catch (error) {
      errorLog("❌ Erreur nettoyage cache:", error);
    }
  }, [cacheService, updateCacheStats]);

  /**
   * Vide complètement le cache
   */
  const clearCache = useCallback(async () => {
    try {
      await cacheService.clearAllCache();
      setPrayerTimes(null);
      setIsFromCache(false);
      setCacheStats((prev) => ({
        ...prev,
        cacheHits: 0,
        cacheMisses: 0,
        totalEntries: 0,
        memoryUsage: 0,
      }));
      debugLog("🗑️ Cache vidé");
    } catch (error) {
      errorLog("❌ Erreur vidage cache:", error);
    }
  }, [cacheService]);

  /**
   * Force le rechargement des horaires
   */
  const refreshPrayerTimes = useCallback(async () => {
    if (!latitude || !longitude || !cacheKey) return;

    // Supprimer du cache et recharger
    await cacheService.clearAllCache();
    await loadPrayerTimes();
  }, [latitude, longitude, cacheKey, cacheService, loadPrayerTimes]);

  // Mettre à jour les stats périodiquement
  useEffect(() => {
    updateCacheStats();

    const interval = setInterval(updateCacheStats, 30000); // Toutes les 30 secondes
    return () => clearInterval(interval);
  }, [updateCacheStats]);

  return {
    // Données principales
    prayerTimes,
    isLoading,
    isFromCache,

    // Statistiques
    cacheStats,

    // Actions
    refreshPrayerTimes,
    cleanupCache,
    clearCache,
    startPreloading,

    // Utilitaires
    updateCacheStats,
  };
}
