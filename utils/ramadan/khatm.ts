// utils/ramadan/khatm.ts
//
// Plan de khatm (lecture complète du Coran) pendant le Ramadan.
// Fonctions pures, basées sur les 30 juz (découpage standard du mushaf de Médine).
//
// Principe : la cible du jour est recalculée à partir de ce qui RESTE à lire et du
// nombre de jours RESTANTS (`ceil(reste / joursRestants)`). Un utilisateur en retard
// voit donc sa portion augmenter progressivement au lieu de se retrouver « en échec »,
// et un utilisateur en avance voit sa portion diminuer.

export interface VersePosition {
  surah: number;
  ayah: number;
}

/** Nombre de versets de chaque sourate (index 0 = sourate 1). Total : 6236. */
export const SURAH_VERSE_COUNTS: readonly number[] = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111,
  110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45,
  83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55,
  78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20,
  56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21,
  11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
];

/** Début de chaque juz (index 0 = juz 1), mushaf de Médine / Hafs. */
export const JUZ_STARTS: readonly VersePosition[] = [
  { surah: 1, ayah: 1 },
  { surah: 2, ayah: 142 },
  { surah: 2, ayah: 253 },
  { surah: 3, ayah: 93 },
  { surah: 4, ayah: 24 },
  { surah: 4, ayah: 148 },
  { surah: 5, ayah: 82 },
  { surah: 6, ayah: 111 },
  { surah: 7, ayah: 88 },
  { surah: 8, ayah: 41 },
  { surah: 9, ayah: 93 },
  { surah: 11, ayah: 6 },
  { surah: 12, ayah: 53 },
  { surah: 15, ayah: 1 },
  { surah: 17, ayah: 1 },
  { surah: 18, ayah: 75 },
  { surah: 21, ayah: 1 },
  { surah: 23, ayah: 1 },
  { surah: 25, ayah: 21 },
  { surah: 27, ayah: 56 },
  { surah: 29, ayah: 46 },
  { surah: 33, ayah: 31 },
  { surah: 36, ayah: 28 },
  { surah: 39, ayah: 32 },
  { surah: 41, ayah: 47 },
  { surah: 46, ayah: 1 },
  { surah: 51, ayah: 31 },
  { surah: 58, ayah: 1 },
  { surah: 67, ayah: 1 },
  { surah: 78, ayah: 1 },
];

export const JUZ_COUNT = 30;
export const MIN_KHATM_DAYS = 5;
export const MAX_KHATM_DAYS = 30;
export const MIN_KHATM_GOAL = 1;
export const MAX_KHATM_GOAL = 3;

/** Début du juz n (1..30). */
export function getJuzStart(juz: number): VersePosition {
  const index = Math.min(JUZ_COUNT, Math.max(1, Math.trunc(juz))) - 1;
  return { ...JUZ_STARTS[index] };
}

/** Dernier verset du juz n (1..30) = verset précédant le début du juz suivant. */
export function getJuzEnd(juz: number): VersePosition {
  const n = Math.min(JUZ_COUNT, Math.max(1, Math.trunc(juz)));
  if (n === JUZ_COUNT) {
    return { surah: 114, ayah: SURAH_VERSE_COUNTS[113] };
  }
  const next = JUZ_STARTS[n]; // début du juz n+1 (index n)
  if (next.ayah > 1) {
    return { surah: next.surah, ayah: next.ayah - 1 };
  }
  const prevSurah = next.surah - 1;
  return { surah: prevSurah, ayah: SURAH_VERSE_COUNTS[prevSurah - 1] };
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export interface KhatmPlan {
  /** Nombre de khatms visés (1 à 3). */
  goalKhatms: number;
  /** Durée du plan en jours (5 à 30). */
  days: number;
  /** Premier jour du plan, "YYYY-MM-DD" local. */
  startKey: string;
  updatedAt: number;
}

/** Juz lus par jour : { "2027-02-08": { juz: 1, updatedAt } }. */
export type KhatmLog = Record<string, { juz: number; updatedAt: number }>;

export function clampKhatmGoal(goal: number): number {
  if (!Number.isFinite(goal)) return MIN_KHATM_GOAL;
  return Math.max(MIN_KHATM_GOAL, Math.min(MAX_KHATM_GOAL, Math.trunc(goal)));
}

export function clampKhatmDays(days: number): number {
  if (!Number.isFinite(days)) return MAX_KHATM_DAYS;
  return Math.max(MIN_KHATM_DAYS, Math.min(MAX_KHATM_DAYS, Math.trunc(days)));
}

export function createKhatmPlan(
  goalKhatms: number,
  days: number,
  startKey: string,
  now: number = Date.now(),
): KhatmPlan {
  return {
    goalKhatms: clampKhatmGoal(goalKhatms),
    days: clampKhatmDays(days),
    startKey,
    updatedAt: now,
  };
}

export function getTotalJuz(plan: KhatmPlan): number {
  return plan.goalKhatms * JUZ_COUNT;
}

/** Total de juz déjà lus (toutes dates confondues), jamais négatif. */
export function getCompletedJuz(log: KhatmLog): number {
  return Object.values(log).reduce(
    (sum, entry) => sum + Math.max(0, Math.trunc(entry?.juz ?? 0)),
    0,
  );
}

export interface KhatmDayInfo {
  /** Juz à lire aujourd'hui (0 si le plan est terminé). */
  target: number;
  /** Juz (1..30) à lire aujourd'hui, dans l'ordre. */
  juzList: number[];
  from: VersePosition | null;
  to: VersePosition | null;
  totalJuz: number;
  completedJuz: number;
  /** Juz déjà validés aujourd'hui. */
  doneToday: number;
  isDoneToday: boolean;
  planDone: boolean;
  /** Retard par rapport au rythme initial, en juz. */
  behindBy: number;
  /** Jours restants, aujourd'hui inclus (minimum 1). */
  daysLeft: number;
  /** Numéro du khatm en cours (1..goalKhatms). */
  currentKhatm: number;
}

/**
 * Calcule la portion du jour.
 *
 * @param dayIndex index du jour dans le plan (0 = premier jour). Négatif ou
 *        trop grand : borné (avant le début on affiche le jour 1 ; après la fin
 *        tout ce qui reste est « à rattraper aujourd'hui »).
 */
export function computeKhatmDay(
  plan: KhatmPlan,
  log: KhatmLog,
  todayKey: string,
  dayIndex: number,
): KhatmDayInfo {
  const totalJuz = getTotalJuz(plan);
  const completedJuz = Math.min(totalJuz, getCompletedJuz(log));
  const doneToday = Math.min(
    completedJuz,
    Math.max(0, Math.trunc(log[todayKey]?.juz ?? 0)),
  );
  const completedBeforeToday = completedJuz - doneToday;
  const remainingAtStart = Math.max(0, totalJuz - completedBeforeToday);

  const safeIndex = Math.max(0, Math.trunc(dayIndex));
  const daysLeft = Math.max(1, plan.days - safeIndex);
  const target = remainingAtStart === 0 ? 0 : Math.ceil(remainingAtStart / daysLeft);

  const expectedBeforeToday = Math.floor((totalJuz * safeIndex) / plan.days);
  const behindBy = Math.max(0, expectedBeforeToday - completedBeforeToday);

  const juzList = Array.from(
    { length: target },
    (_, i) => ((completedBeforeToday + i) % JUZ_COUNT) + 1,
  );

  return {
    target,
    juzList,
    from: juzList.length > 0 ? getJuzStart(juzList[0]) : null,
    to: juzList.length > 0 ? getJuzEnd(juzList[juzList.length - 1]) : null,
    totalJuz,
    completedJuz,
    doneToday,
    isDoneToday: target > 0 ? doneToday >= target : completedJuz >= totalJuz,
    planDone: completedJuz >= totalJuz,
    behindBy,
    daysLeft,
    currentKhatm: Math.min(
      plan.goalKhatms,
      Math.floor(Math.min(completedBeforeToday, totalJuz - 1) / JUZ_COUNT) + 1,
    ),
  };
}

/**
 * Enregistre `juz` juz lus pour la date `dateKey` (remplace la valeur du jour).
 * La valeur est bornée pour ne jamais dépasser le total du plan.
 * Retourne un NOUVEAU journal (immuable).
 */
export function setKhatmDayProgress(
  plan: KhatmPlan,
  log: KhatmLog,
  dateKey: string,
  juz: number,
  now: number = Date.now(),
): KhatmLog {
  const current = Math.max(0, Math.trunc(log[dateKey]?.juz ?? 0));
  const completedElsewhere = Math.max(0, getCompletedJuz(log) - current);
  const maxForDay = Math.max(0, getTotalJuz(plan) - completedElsewhere);
  const value = Math.max(0, Math.min(maxForDay, Math.trunc(juz) || 0));
  return { ...log, [dateKey]: { juz: value, updatedAt: now } };
}
