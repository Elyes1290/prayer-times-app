// hooks/usePrayerTimes.ts
import { CalculationMethod, Coordinates, PrayerTimes } from "adhan";
import type { LocationObject } from "expo-location";
import { useContext, useEffect, useState, useMemo } from "react";
import { SettingsContext } from "../contexts/SettingsContext";
import { usePrayerTimesCache } from "./usePrayerTimesCache";

export function usePrayerTimes(
  location: LocationObject | null,
  date: Date,
  isPremium: boolean = false
): { prayerTimes: PrayerTimes | null; isLoading: boolean } {
  const { calcMethod } = useContext(SettingsContext);

  // 🚀 NOUVEAU : Utiliser le système de cache intelligent
  const {
    prayerTimes,
    isLoading,
    isFromCache,
    cacheStats,
    refreshPrayerTimes,
  } = usePrayerTimesCache(location, date, calcMethod, {
    enablePreloading: true,
    preloadDays: isPremium ? 30 : 7, // Premium: 30 jours, Gratuit: 7 jours
    enableBackgroundPreload: true,
    isPremium: isPremium,
  });

  // Log des performances du cache
  useEffect(() => {
    if (prayerTimes) {
      console.log(
        `🕌 Horaires chargés - Cache: ${isFromCache ? "✅" : "❌"} - Stats: ${
          cacheStats.cacheHits
        } hits, ${cacheStats.cacheMisses} misses`
      );
    }
  }, [prayerTimes, isFromCache, cacheStats]);

  return { prayerTimes, isLoading };
}
