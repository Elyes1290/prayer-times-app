// utils/ramadan/badges.ts
//
// Badges « Mon Ramadan » : calculés à partir des données du mois (jamais stockés), donc
// toujours cohérents avec ce que l'utilisateur a réellement coché. Volontairement séparés
// du système de badges général de l'application (aucun impact sur celui-ci).

import { getCompletedJuz, getTotalJuz } from "./khatm";
import type { RamadanSeason } from "./season";
import type { FastingStats, RamadanData } from "./storage";
import { computeBestFastingStreak, computeWorshipStats } from "./worship";

export type RamadanBadgeCode =
  | "firstFast"
  | "weekStreak"
  | "fullMonth"
  | "khatm"
  | "qada"
  | "tarawih10"
  | "tarawihAll"
  | "laylat"
  | "sadaqa7"
  | "sadaqaAll";

export interface RamadanBadge {
  code: RamadanBadgeCode;
  /** Nom d'icône MaterialCommunityIcons. */
  icon: string;
  color: string;
  current: number;
  target: number;
  unlocked: boolean;
}

function badge(
  code: RamadanBadgeCode,
  icon: string,
  color: string,
  current: number,
  target: number,
  unlocked?: boolean,
): RamadanBadge {
  const safeTarget = Math.max(1, target);
  return {
    code,
    icon,
    color,
    current: Math.min(Math.max(0, current), safeTarget),
    target: safeTarget,
    unlocked: unlocked ?? current >= safeTarget,
  };
}

export function computeRamadanBadges(
  data: RamadanData,
  season: RamadanSeason,
  fastingStats: FastingStats,
): RamadanBadge[] {
  const worship = computeWorshipStats(data, season);
  const bestStreak = computeBestFastingStreak(data, season);
  const length = season.lengthDays;

  const plan = data.khatmPlan;
  const khatmTotal = plan ? getTotalJuz(plan) : 30;
  const khatmDone = plan ? getCompletedJuz(data.khatmLog) : 0;

  const qadaTotal = fastingStats.missed + fastingStats.exempt;

  return [
    badge("firstFast", "star-circle", "#2E8B57", fastingStats.fasted, 1),
    badge("weekStreak", "fire", "#E67E22", bestStreak, 7),
    badge("fullMonth", "calendar-check", "#27AE60", fastingStats.fasted, length),
    badge("khatm", "book-open-page-variant", "#8E6BBF", khatmDone, khatmTotal, !!plan && khatmDone >= khatmTotal),
    badge(
      "qada",
      "history",
      "#6C8EBF",
      data.qadaDone.count,
      qadaTotal,
      qadaTotal > 0 && fastingStats.qadaOwed === 0,
    ),
    badge("tarawih10", "weather-night", "#3F51B5", worship.tarawihNights, 10),
    badge("tarawihAll", "moon-waning-crescent", "#5C6BC0", worship.tarawihNights, length),
    badge("laylat", "star-four-points", "#D4AF37", worship.oddNightsDone, worship.oddNightsTotal),
    badge("sadaqa7", "hand-heart", "#E91E63", worship.sadaqaDays, 7),
    badge("sadaqaAll", "heart-multiple", "#C2185B", worship.sadaqaDays, length),
  ];
}
