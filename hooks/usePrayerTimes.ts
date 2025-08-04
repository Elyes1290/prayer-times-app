// hooks/usePrayerTimes.ts
import { CalculationMethod, Coordinates, PrayerTimes } from "adhan";
import type { LocationObject } from "expo-location";
import { useContext, useEffect, useState, useMemo } from "react";
import { SettingsContext } from "../contexts/SettingsContext";

export function usePrayerTimes(
  location: LocationObject | null,
  date: Date
): PrayerTimes | null {
  const { calcMethod } = useContext(SettingsContext);
  const [times, setTimes] = useState<PrayerTimes | null>(null);

  // Stabiliser les valeurs primitives pour éviter les boucles infinies
  const latitude = location?.coords?.latitude;
  const longitude = location?.coords?.longitude;
  const dateKey = useMemo(() => {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }, [date.getFullYear(), date.getMonth(), date.getDate()]);

  useEffect(() => {
    if (!latitude || !longitude) {
      setTimes(null);
      return;
    }

    const coords = new Coordinates(latitude, longitude);

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
        // Au cas où la valeur ne correspond à aucune méthode connue
        params = CalculationMethod.MuslimWorldLeague();
        break;
    }

    const prayerTimes = new PrayerTimes(coords, date, params);
    setTimes(prayerTimes);
  }, [latitude, longitude, dateKey, calcMethod]);

  return times;
}
