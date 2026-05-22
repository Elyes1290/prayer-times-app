import { useMemo, use } from "react";
import { PrayerTimes, CalculationMethod, Coordinates } from "adhan";
import type { LocationObject } from "expo-location";

import { SettingsContext } from "../contexts/SettingsContext";

// Type pour chaque jour de la semaine
export type WeeklyPrayerTimes = {
  date: Date;
  times: PrayerTimes;
}[];

export function useWeeklyPrayerTimes(
  location: LocationObject | null,
  startDate: Date
): WeeklyPrayerTimes {
  const { calcMethod } = use(SettingsContext);

  return useMemo(() => {
    if (!location?.coords?.latitude || !location?.coords?.longitude) {
      return [];
    }

    const week: WeeklyPrayerTimes = [];
    const coords = new Coordinates(
      location.coords.latitude,
      location.coords.longitude
    );

    // Déterminer params directement ici
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
        // 🕌 Umm Al-Qura modifié pour utiliser 15° pour Fajr
        params = CalculationMethod.UmmAlQura();
        params.fajrAngle = 15.0; // Modifié selon recommandation mosquée
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

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const times = new PrayerTimes(coords, date, params);
      week.push({ date, times });
    }
    return week;
  }, [
    location?.coords?.latitude,
    location?.coords?.longitude,
    calcMethod,
    startDate,
  ]);
}

