// utils/ramadan/worship.ts
//
// Suivi de la prière de nuit (tarawih / qiyam), de la sadaqa et des 10 dernières nuits.
// Fonctions pures (dates injectées), sans accès au stockage.
//
// ⚠️ Convention des « nuits » : le jour islamique commence au coucher du soleil, donc la
// nuit n de Ramadan commence le SOIR du jour calendaire qui précède le n-ième jour de jeûne
// (la « nuit 27 » commence au Maghrib du 26e jour : voir `getNightEveDate`).
// Une prière de nuit est donc enregistrée à la date du SOIR où on la fait :
//   - nuit 1  → date de début - 1 jour (la veille du premier jeûne) ;
//   - nuit n  → date de début + n - 2 jours.
// Ce soir (jour d de jeûne) correspond à la nuit d + 1.

import {
  diffLocalDays,
  getNightEveDate,
  getRamadanDate,
  ODD_LAST_NIGHTS,
  startOfLocalDay,
  toLocalDateKey,
  type RamadanSeason,
} from "./season";
import type { DayFlag, RamadanData } from "./storage";

/** Première des « 10 dernières nuits » (21, 22, … jusqu'à la dernière nuit du mois). */
export const FIRST_LAST_TEN_NIGHT = 21;

export function isFlagDone(flags: Record<string, DayFlag>, key: string): boolean {
  return flags[key]?.done === true;
}

/** Clé de date du soir de la nuit n (1..lengthDays) : voir la convention ci-dessus. */
export function getNightKey(season: RamadanSeason, night: number): string {
  return toLocalDateKey(getNightEveDate(season, night));
}

/** Clé de date du jour de jeûne d (1..lengthDays). */
export function getDayKey(season: RamadanSeason, day: number): string {
  return toLocalDateKey(getRamadanDate(season, day));
}

/**
 * Numéro de la nuit qui commence CE SOIR (1..lengthDays), ou 0 s'il n'y a pas de nuit de
 * Ramadan ce soir (trop tôt, ou soir de l'Aïd). Vaut 1 la veille du premier jeûne.
 */
export function getTonightNumber(season: RamadanSeason, today: Date): number {
  if (season.hijriYear <= 0) return 0;
  const night = diffLocalDays(season.startDate, startOfLocalDay(today)) + 2;
  return night >= 1 && night <= season.lengthDays ? night : 0;
}

export function isOddLastNight(night: number): boolean {
  return (ODD_LAST_NIGHTS as readonly number[]).includes(night);
}

/** Nuits des 10 dernières nuits pour ce mois (21..29 ou 21..30). */
export function getLastTenNights(season: RamadanSeason): number[] {
  const nights: number[] = [];
  for (let night = FIRST_LAST_TEN_NIGHT; night <= season.lengthDays; night += 1) {
    nights.push(night);
  }
  return nights;
}

/** Nuits impaires à chercher (21, 23, 25, 27, 29) présentes dans ce mois. */
export function getOddNights(season: RamadanSeason): number[] {
  return (ODD_LAST_NIGHTS as readonly number[]).filter((night) => night <= season.lengthDays);
}

export interface WorshipStats {
  /** Nuits de tarawih / qiyam cochées. */
  tarawihNights: number;
  /** Jours de sadaqa cochés. */
  sadaqaDays: number;
  /** Nuits cochées parmi les 10 dernières. */
  lastTenDone: number;
  lastTenTotal: number;
  /** Nuits impaires cochées parmi 21, 23, 25, 27, 29. */
  oddNightsDone: number;
  oddNightsTotal: number;
}

export function computeWorshipStats(data: RamadanData, season: RamadanSeason): WorshipStats {
  let tarawihNights = 0;
  let sadaqaDays = 0;
  for (let n = 1; n <= season.lengthDays; n += 1) {
    if (isFlagDone(data.tarawih, getNightKey(season, n))) tarawihNights += 1;
    if (isFlagDone(data.sadaqa, getDayKey(season, n))) sadaqaDays += 1;
  }

  const lastTen = getLastTenNights(season);
  const odd = getOddNights(season);
  return {
    tarawihNights,
    sadaqaDays,
    lastTenDone: lastTen.filter((n) => isFlagDone(data.tarawih, getNightKey(season, n))).length,
    lastTenTotal: lastTen.length,
    oddNightsDone: odd.filter((n) => isFlagDone(data.tarawih, getNightKey(season, n))).length,
    oddNightsTotal: odd.length,
  };
}

/** Plus longue série de jours de jeûne consécutifs dans le mois. */
export function computeBestFastingStreak(data: RamadanData, season: RamadanSeason): number {
  let best = 0;
  let current = 0;
  for (let day = 1; day <= season.lengthDays; day += 1) {
    if (data.fasting[getDayKey(season, day)]?.status === "fasted") {
      current += 1;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }
  return best;
}
