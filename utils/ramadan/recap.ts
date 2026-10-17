// utils/ramadan/recap.ts
//
// Bilan de fin de Ramadan, destiné à être partagé. Fonction pure.
//
// Confidentialité : le bilan ne contient QUE des éléments positifs (jours jeûnés, nuits
// de prière, sadaqa, lecture, badges). Les jours manqués ou dispensés (dont le motif est
// privé) n'y figurent jamais.

import type { RamadanBadge } from "./badges";
import { getCompletedJuz, getTotalJuz } from "./khatm";
import type { RamadanSeason } from "./season";
import type { FastingStats, RamadanData } from "./storage";
import { computeBestFastingStreak, computeWorshipStats } from "./worship";

export interface RamadanRecap {
  hijriYear: number;
  totalDays: number;
  fastedDays: number;
  bestStreak: number;
  tarawihNights: number;
  sadaqaDays: number;
  /** Juz lus selon le plan de khatm (0 s'il n'y a pas de plan). */
  khatmJuzDone: number;
  /** Total de juz du plan (0 s'il n'y a pas de plan). */
  khatmJuzTotal: number;
  unlockedBadges: RamadanBadge[];
}

/**
 * Le bilan est proposé le dernier jour de Ramadan, puis pendant la phase de l'Aïd.
 * Avant, il serait incomplet et donc décevant.
 */
export function isRecapAvailable(season: RamadanSeason): boolean {
  if (season.phase === "eid") return true;
  return season.phase === "ramadan" && season.daysRemaining === 1;
}

/** Vrai si le bilan contient au moins un élément à montrer. */
export function hasRecapContent(recap: RamadanRecap): boolean {
  return (
    recap.fastedDays > 0 ||
    recap.tarawihNights > 0 ||
    recap.sadaqaDays > 0 ||
    recap.khatmJuzDone > 0
  );
}

export function computeRamadanRecap(
  data: RamadanData,
  season: RamadanSeason,
  fastingStats: FastingStats,
  badges: RamadanBadge[],
): RamadanRecap {
  const worship = computeWorshipStats(data, season);
  const plan = data.khatmPlan;
  return {
    hijriYear: season.hijriYear,
    totalDays: season.lengthDays,
    fastedDays: fastingStats.fasted,
    bestStreak: computeBestFastingStreak(data, season),
    tarawihNights: worship.tarawihNights,
    sadaqaDays: worship.sadaqaDays,
    khatmJuzDone: plan ? getCompletedJuz(data.khatmLog) : 0,
    khatmJuzTotal: plan ? getTotalJuz(plan) : 0,
    unlockedBadges: badges.filter((badge) => badge.unlocked),
  };
}
