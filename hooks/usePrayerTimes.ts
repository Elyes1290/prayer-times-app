// hooks/usePrayerTimes.ts
import { CalculationMethod, Coordinates, PrayerTimes } from "adhan";
import type { LocationObject } from "expo-location";
import { useContext, useEffect, useState } from "react";
import { SettingsContext } from "../contexts/SettingsContext";

export function usePrayerTimes(
  location: LocationObject | null,
  date: Date
): PrayerTimes | null {
  const { calcMethod } = useContext(SettingsContext);
  const [times, setTimes] = useState<PrayerTimes | null>(null);

  useEffect(() => {
    if (!location) return;
    const { latitude, longitude } = location.coords;
    const coords = new Coordinates(latitude, longitude);
    // on détermine params directement ici
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
    setTimes(new PrayerTimes(coords, date, params));
  }, [location, date, calcMethod]);

  return times;
}
