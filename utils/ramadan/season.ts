// utils/ramadan/season.ts
//
// Source de vérité unique pour « où en est-on par rapport au Ramadan ? ».
// Fonctions pures (aucun effet de bord) : tout est testable avec des dates injectées.
//
// ⚠️ Conventions :
// - Toutes les dates manipulées ici sont des JOURS CALENDAIRES LOCAUX (minuit local).
//   Les clés de date (`toLocalDateKey`) sont en heure locale, contrairement à
//   `toISOString()` (UTC) qui décalerait le jour pour un utilisateur à UTC+2 le soir.
// - Le début du Ramadan varie selon les pays (observation de la lune) : l'utilisateur
//   peut décaler le début de -2 à +2 jours (`startOffsetDays`).

import {
  getRamadanTestStartDate,
  RAMADAN_TEST_HIJRI_YEAR,
  RAMADAN_TEST_LENGTH_DAYS,
} from "./debug";

export type RamadanPhase = "off" | "countdown" | "ramadan" | "eid";

export interface RamadanSeason {
  phase: RamadanPhase;
  hijriYear: number;
  /** Premier jour de jeûne (minuit local), décalage utilisateur inclus. */
  startDate: Date;
  /** Dernier jour de jeûne (minuit local). */
  endDate: Date;
  /** 29 ou 30. */
  lengthDays: number;
  /** Jours restants avant le début (> 0 uniquement avant le Ramadan, sinon 0). */
  daysUntilStart: number;
  /** Numéro du jour de Ramadan (1..lengthDays) pendant le mois, sinon 0. */
  dayNumber: number;
  /** Jours restants, aujourd'hui inclus, pendant le mois, sinon 0. */
  daysRemaining: number;
}

/** Le compte à rebours s'affiche à partir de J-30. */
export const COUNTDOWN_WINDOW_DAYS = 30;
/** L'écran reste accessible quelques jours après la fin (Aïd). */
export const EID_GRACE_DAYS = 3;
export const MIN_START_OFFSET_DAYS = -2;
export const MAX_START_OFFSET_DAYS = 2;

const MS_PER_DAY = 86_400_000;

// ---------------------------------------------------------------------------
// Utilitaires de dates (jours calendaires locaux)
// ---------------------------------------------------------------------------

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addLocalDays(date: Date, days: number): Date {
  // new Date(y, m, d + n) gère correctement les changements d'heure (DST).
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Nombre de jours calendaires entre deux dates (b - a), insensible au DST. */
export function diffLocalDays(a: Date, b: Date): number {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / MS_PER_DAY);
}

/** "YYYY-MM-DD" en heure LOCALE. */
export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Inverse de `toLocalDateKey` (minuit local). Retourne null si invalide. */
export function parseLocalDateKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (Number.isNaN(date.getTime())) return null;
  // `new Date(2027, 12, 40)` « déborde » silencieusement : on refuse les dates inexistantes.
  if (
    date.getFullYear() !== Number(y) ||
    date.getMonth() !== Number(m) - 1 ||
    date.getDate() !== Number(d)
  ) {
    return null;
  }
  return date;
}

export function clampStartOffset(offset: number): number {
  if (!Number.isFinite(offset)) return 0;
  return Math.max(
    MIN_START_OFFSET_DAYS,
    Math.min(MAX_START_OFFSET_DAYS, Math.round(offset)),
  );
}

// ---------------------------------------------------------------------------
// Calendrier hijri
// ---------------------------------------------------------------------------

interface HijriParts {
  day: number;
  month: number;
  year: number;
}

type HijriFormatter = Intl.DateTimeFormat | null;

let cachedFormatter: HijriFormatter | undefined;

/**
 * Choisit le calendrier hijri : Umm al-Qura (référence la plus proche des annonces
 * officielles) si la plateforme le supporte, sinon le calendrier « islamic » déjà
 * utilisé ailleurs dans l'app. Si aucun n'est fiable, retourne null (la saison reste
 * alors « off » : la fonctionnalité se désactive proprement au lieu d'afficher n'importe quoi).
 *
 * La vérification sur une date connue évite le piège d'un calendrier non supporté
 * qui retomberait silencieusement sur le grégorien (« 9/1 » = 1er septembre !).
 */
function getHijriFormatter(): HijriFormatter {
  if (cachedFormatter !== undefined) return cachedFormatter;

  const candidates = ["en-u-ca-islamic-umalqura", "en-u-ca-islamic"];
  for (const locale of candidates) {
    try {
      const formatter = new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "numeric",
        year: "numeric",
      });
      // 8 février 2027 ≈ 1er/2 Ramadan 1448 : l'année hijri doit être ~1448.
      const probe = formatter.formatToParts(new Date(2027, 1, 8));
      const year = Number(probe.find((p) => p.type === "year")?.value);
      if (Number.isFinite(year) && year > 1400 && year < 1500) {
        cachedFormatter = formatter;
        return formatter;
      }
    } catch {
      // calendrier non supporté : on essaie le suivant
    }
  }

  cachedFormatter = null;
  return null;
}

/** Exposé pour les tests (réinitialise le cache du formateur). */
export function __resetHijriFormatterCacheForTests(): void {
  cachedFormatter = undefined;
  baseCache.clear();
}

export function getHijriParts(date: Date): HijriParts | null {
  const formatter = getHijriFormatter();
  if (!formatter) return null;

  const parts = formatter.formatToParts(date);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  if (![day, month, year].every(Number.isFinite)) return null;
  return { day, month, year };
}

interface BaseRamadan {
  hijriYear: number;
  start: Date;
  lengthDays: number;
}

const baseCache = new Map<number, BaseRamadan | null>();

/**
 * Ramadan « théorique » (sans décalage utilisateur) commençant durant l'année
 * grégorienne donnée. Mis en cache : la recherche balaie l'année jour par jour.
 */
function getBaseRamadan(gregorianYear: number): BaseRamadan | null {
  if (baseCache.has(gregorianYear)) {
    return baseCache.get(gregorianYear) ?? null;
  }

  let result: BaseRamadan | null = null;

  if (getHijriFormatter()) {
    const yearStart = new Date(gregorianYear, 0, 1);
    const yearEnd = new Date(gregorianYear + 1, 0, 1);

    for (
      let cursor = new Date(yearStart);
      cursor < yearEnd;
      cursor = addLocalDays(cursor, 1)
    ) {
      const parts = getHijriParts(cursor);
      if (parts && parts.month === 9 && parts.day === 1) {
        // Longueur réelle du mois : on avance tant qu'on est encore en mois 9.
        let length = 0;
        while (length < 31) {
          const p = getHijriParts(addLocalDays(cursor, length));
          if (!p || p.month !== 9) break;
          length += 1;
        }
        result = {
          hijriYear: parts.year,
          start: new Date(cursor),
          lengthDays: length === 29 || length === 30 ? length : 30,
        };
        break;
      }
    }
  }

  baseCache.set(gregorianYear, result);
  return result;
}

/**
 * Saisons candidates autour de l'année grégorienne `year`. En mode test (voir debug.ts),
 * une unique saison simulée remplace le vrai calendrier.
 */
function getCandidateSeasons(year: number): BaseRamadan[] {
  const testStart = getRamadanTestStartDate();
  if (testStart) {
    const start = parseLocalDateKey(testStart);
    if (start) {
      return [
        {
          hijriYear: RAMADAN_TEST_HIJRI_YEAR,
          start,
          lengthDays: RAMADAN_TEST_LENGTH_DAYS,
        },
      ];
    }
  }

  return [year - 1, year, year + 1]
    .map((y) => getBaseRamadan(y))
    .filter((b): b is BaseRamadan => b !== null)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

// ---------------------------------------------------------------------------
// Saison
// ---------------------------------------------------------------------------

/**
 * État de la saison Ramadan à la date `now`.
 * Retourne la prochaine saison pertinente (la plus proche dont la fin + Aïd n'est
 * pas dépassée). `phase` vaut :
 * - "off"       : trop tôt (> J-30) ou calendrier hijri indisponible ;
 * - "countdown" : de J-30 à la veille du début ;
 * - "ramadan"   : pendant le mois ;
 * - "eid"       : EID_GRACE_DAYS jours après la fin (bilan, remerciements).
 */
export function getRamadanSeason(
  now: Date = new Date(),
  startOffsetDays = 0,
): RamadanSeason {
  const today = startOfLocalDay(now);
  const offset = clampStartOffset(startOffsetDays);
  const year = now.getFullYear();

  const candidates = getCandidateSeasons(year);

  for (const base of candidates) {
    const startDate = addLocalDays(base.start, offset);
    const endDate = addLocalDays(startDate, base.lengthDays - 1);

    if (diffLocalDays(endDate, today) > EID_GRACE_DAYS) {
      continue; // cette saison est terminée depuis trop longtemps
    }

    const common = {
      hijriYear: base.hijriYear,
      startDate,
      endDate,
      lengthDays: base.lengthDays,
    };

    const sinceStart = diffLocalDays(startDate, today);

    if (sinceStart < 0) {
      const daysUntilStart = -sinceStart;
      return {
        ...common,
        phase: daysUntilStart <= COUNTDOWN_WINDOW_DAYS ? "countdown" : "off",
        daysUntilStart,
        dayNumber: 0,
        daysRemaining: 0,
      };
    }

    if (diffLocalDays(today, endDate) >= 0) {
      return {
        ...common,
        phase: "ramadan",
        daysUntilStart: 0,
        dayNumber: sinceStart + 1,
        daysRemaining: diffLocalDays(today, endDate) + 1,
      };
    }

    return {
      ...common,
      phase: "eid",
      daysUntilStart: 0,
      dayNumber: 0,
      daysRemaining: 0,
    };
  }

  // Calendrier indisponible ou aucune saison trouvée.
  const fallbackStart = startOfLocalDay(now);
  return {
    phase: "off",
    hijriYear: 0,
    startDate: fallbackStart,
    endDate: fallbackStart,
    lengthDays: 30,
    daysUntilStart: 0,
    dayNumber: 0,
    daysRemaining: 0,
  };
}

/** Jour de Ramadan (1..lengthDays) d'une date donnée, ou 0 si hors du mois. */
export function getRamadanDayNumber(
  season: RamadanSeason,
  date: Date,
): number {
  const index = diffLocalDays(season.startDate, date);
  return index >= 0 && index < season.lengthDays ? index + 1 : 0;
}

/** Date (minuit local) du jour de Ramadan n (1-indexé). */
export function getRamadanDate(season: RamadanSeason, dayNumber: number): Date {
  return addLocalDays(season.startDate, dayNumber - 1);
}

/** Les nuits impaires des 10 dernières nuits (21, 23, 25, 27, 29). */
export const ODD_LAST_NIGHTS = [21, 23, 25, 27, 29] as const;

/**
 * Date (minuit local) du jour pendant lequel commence la « nuit n ».
 *
 * Le jour islamique commence au coucher du soleil : la nuit n suit le jour n-1.
 * La « nuit du 27 » commence donc au Maghrib du 26e jour de Ramadan.
 */
export function getNightEveDate(season: RamadanSeason, night: number): Date {
  return getRamadanDate(season, night - 1);
}
