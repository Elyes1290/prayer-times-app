// utils/PrayerTimesPreloader.ts
import { PrayerTimes } from "adhan";
import { computePrayerTimesForDate } from "./prayerTimes";
import PrayerTimesCacheService from "./PrayerTimesCacheService";
import { debugLog, errorLog } from "./logger";

interface PreloadConfig {
  latitude: number;
  longitude: number;
  calcMethod: string;
  preloadDays: number; // Nombre de jours à précharger
  maxConcurrent: number; // Nombre max de calculs simultanés
}

class PrayerTimesPreloader {
  private static instance: PrayerTimesPreloader;
  private cacheService: PrayerTimesCacheService;
  private isPreloading = false;
  private preloadQueue: Date[] = [];
  private currentPreloadConfig: PreloadConfig | null = null;

  private constructor() {
    this.cacheService = PrayerTimesCacheService.getInstance();
  }

  public static getInstance(): PrayerTimesPreloader {
    if (!PrayerTimesPreloader.instance) {
      PrayerTimesPreloader.instance = new PrayerTimesPreloader();
    }
    return PrayerTimesPreloader.instance;
  }

  /**
   * Démarre le préchargement intelligent des horaires
   */
  public async startPreloading(config: PreloadConfig): Promise<void> {
    if (this.isPreloading) {
      debugLog("🔄 Préchargement déjà en cours");
      return;
    }

    this.currentPreloadConfig = config;
    this.isPreloading = true;

    try {
      debugLog(`🚀 Démarrage préchargement - ${config.preloadDays} jours`);

      // 1. Nettoyer les caches expirés
      await this.cacheService.cleanupExpiredCache();

      // 2. Déterminer les dates à précharger
      const datesToPreload = await this.getDatesToPreload(config);

      if (datesToPreload.length === 0) {
        debugLog("✅ Tous les horaires sont déjà en cache");
        return;
      }

      // 3. Précharger par batches
      await this.preloadInBatches(datesToPreload, config);

      debugLog(`✅ Préchargement terminé - ${datesToPreload.length} jours`);
    } catch (error) {
      errorLog("❌ Erreur préchargement:", error);
    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * Détermine quelles dates doivent être préchargées
   */
  private async getDatesToPreload(config: PreloadConfig): Promise<Date[]> {
    const datesToPreload: Date[] = [];
    const today = new Date();

    // Précharger les 7 prochains jours par défaut, ou selon la config
    const daysToCheck = Math.min(config.preloadDays, 30); // Max 30 jours

    const dayIndices = Array.from({ length: daysToCheck }, (_, i) => i);
    const cacheHits = await Promise.all(
      dayIndices.map(async (i) => {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const cached = await this.cacheService.getCachedPrayerTimes(
          date,
          config.latitude,
          config.longitude,
          config.calcMethod
        );
        return { date, cached: !!cached };
      })
    );
    for (const { date, cached } of cacheHits) {
      if (!cached) datesToPreload.push(date);
    }

    return datesToPreload;
  }

  /**
   * Précharge les horaires par batches pour optimiser les performances
   */
  private async preloadInBatches(
    dates: Date[],
    config: PreloadConfig
  ): Promise<void> {
    const batchSize = Math.min(config.maxConcurrent, 5); // Max 5 calculs simultanés

    const runBatch = async (startIndex: number): Promise<void> => {
      if (startIndex >= dates.length) return;
      const batch = dates.slice(startIndex, startIndex + batchSize);

      await Promise.all(
        batch.map(async (date) => {
          try {
            await this.preloadSingleDate(date, config);
          } catch (error) {
            errorLog(
              `❌ Erreur préchargement date ${date.toISOString()}:`,
              error
            );
          }
        })
      );

      if (startIndex + batchSize < dates.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      await runBatch(startIndex + batchSize);
    };

    await runBatch(0);
  }

  /**
   * Précharge les horaires pour une date spécifique
   */
  private async preloadSingleDate(
    date: Date,
    config: PreloadConfig
  ): Promise<void> {
    try {
      // Calculer les horaires
      const prayerTimes = computePrayerTimesForDate(
        date,
        { latitude: config.latitude, longitude: config.longitude },
        config.calcMethod
      );

      // Convertir en PrayerTimes pour le cache
      const adhanPrayerTimes = new PrayerTimes(
        { latitude: config.latitude, longitude: config.longitude },
        date,
        this.getCalculationParams(config.calcMethod)
      );

      // Sauvegarder en cache
      await this.cacheService.setCachedPrayerTimes(
        date,
        config.latitude,
        config.longitude,
        config.calcMethod,
        adhanPrayerTimes
      );

      debugLog(`📅 Préchargé: ${date.toISOString().split("T")[0]}`);
    } catch (error) {
      errorLog(`❌ Erreur préchargement date ${date.toISOString()}:`, error);
    }
  }

  /**
   * Obtient les paramètres de calcul selon la méthode
   */
  private getCalculationParams(calcMethod: string): any {
    const { CalculationMethod } = require("adhan");
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
    return params;
  }

  /**
   * Précharge les horaires de la semaine en cours
   */
  public async preloadCurrentWeek(
    latitude: number,
    longitude: number,
    calcMethod: string
  ): Promise<void> {
    const config: PreloadConfig = {
      latitude,
      longitude,
      calcMethod,
      preloadDays: 7,
      maxConcurrent: 3,
    };

    await this.startPreloading(config);
  }

  /**
   * Précharge les horaires du mois en cours
   */
  public async preloadCurrentMonth(
    latitude: number,
    longitude: number,
    calcMethod: string
  ): Promise<void> {
    const config: PreloadConfig = {
      latitude,
      longitude,
      calcMethod,
      preloadDays: 30,
      maxConcurrent: 5,
    };

    await this.startPreloading(config);
  }

  /**
   * Précharge les horaires en arrière-plan (quand l'app est inactive)
   */
  public async preloadInBackground(
    latitude: number,
    longitude: number,
    calcMethod: string
  ): Promise<void> {
    // Précharger seulement 3 jours en arrière-plan pour économiser les ressources
    const config: PreloadConfig = {
      latitude,
      longitude,
      calcMethod,
      preloadDays: 3,
      maxConcurrent: 2,
    };

    await this.startPreloading(config);
  }

  /**
   * Vérifie si le préchargement est en cours
   */
  public isPreloadingActive(): boolean {
    return this.isPreloading;
  }

  /**
   * Arrête le préchargement en cours
   */
  public stopPreloading(): void {
    this.isPreloading = false;
    this.preloadQueue = [];
    debugLog("⏹️ Préchargement arrêté");
  }

  /**
   * Obtient les statistiques de préchargement
   */
  public async getPreloadStats(): Promise<{
    isActive: boolean;
    queueLength: number;
    cacheStats: any;
  }> {
    const cacheStats = await this.cacheService.getCacheStats();

    return {
      isActive: this.isPreloading,
      queueLength: this.preloadQueue.length,
      cacheStats,
    };
  }
}

export default PrayerTimesPreloader;
