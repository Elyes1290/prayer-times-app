// utils/ramadan/format.ts
// Formatage d'affichage (dates, heures, durées) — fonctions pures.

import type { RamadanTranslate } from "./i18n";

function safeLocale(language: string | undefined): string {
  return language && language.length > 0 ? language : "en";
}

/** "lun. 8 févr." — jamais d'exception même si la locale n'est pas supportée. */
export function formatShortDate(date: Date, language: string | undefined): string {
  try {
    return date.toLocaleDateString(safeLocale(language), {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return date.toDateString();
  }
}

/** "21:30" (ou "9:30 PM" selon la locale). */
export function formatClock(date: Date, language: string | undefined): string {
  try {
    return date.toLocaleTimeString(safeLocale(language), {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }
}

/** "HH:MM" 24 h à partir d'une heure et d'une minute (réglages). */
export function formatHourMinute(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Durée restante arrondie à la minute supérieure : "3 h 12 min" ou "42 min". */
export function formatCountdown(ms: number, t: RamadanTranslate): string {
  const totalMinutes = Math.max(1, Math.ceil(ms / 60_000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return t("times.durationShort", { m });
  return t("times.duration", { h, m });
}
