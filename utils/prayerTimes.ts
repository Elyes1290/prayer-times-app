// utils/prayerTimes.ts
import {
  CalculationMethod,
  Coordinates,
  PrayerTimes,
  CalculationParameters,
} from "adhan";

type PrayerLabel = "Fajr" | "Sunrise" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";
type Location = { latitude: number; longitude: number };

export function computePrayerTimesForDate(
  date: Date,
  userLocation: Location,
  calcMethod: string
): Record<PrayerLabel, Date> {
  const { latitude, longitude } = userLocation;
  const coords = new Coordinates(latitude, longitude);

  // Utilise l'année de la date passée en paramètre
  const localDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0
  );

  let params: CalculationParameters;
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
  }

  // Utilise la date locale pour calculer les horaires
  const times = new PrayerTimes(coords, localDate, params);

  // Utilise directement les objets Date retournés par adhan
  const result = {
    Fajr: times.fajr,
    Sunrise: times.sunrise,
    Dhuhr: times.dhuhr,
    Asr: times.asr,
    Maghrib: times.maghrib,
    Isha: times.isha,
  };

  return result;
}

// 🔧 NOUVELLE FONCTION : Pour les notifications seulement (sans Sunrise)
export function computePrayerTimesForNotifications(
  date: Date,
  userLocation: Location,
  calcMethod: string
): Record<string, Date> {
  const { latitude, longitude } = userLocation;
  const coords = new Coordinates(latitude, longitude);

  // Utilise l'année de la date passée en paramètre
  const localDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0
  );

  let params: CalculationParameters;
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
  }

  // Utilise la date locale pour calculer les horaires
  const times = new PrayerTimes(coords, localDate, params);

  // 🔧 SEULES LES PRIÈRES avec adhans/rappels (PAS Sunrise !)
  const result = {
    Fajr: times.fajr,
    // Sunrise: times.sunrise, ← EXCLU volontairement pour notifications
    Dhuhr: times.dhuhr,
    Asr: times.asr,
    Maghrib: times.maghrib,
    Isha: times.isha,
  };

  return result;
}
