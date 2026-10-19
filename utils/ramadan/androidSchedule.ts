// utils/ramadan/androidSchedule.ts
//
// Android : programmation des rappels Ramadan en deux temps.
//  1. Les 10 prochains jours sont armés tout de suite (comme les rappels de prière).
//  2. TOUTE la saison est enregistrée côté natif (`saveRamadanSchedule`) : la maintenance
//     quotidienne de 00:05 et le redémarrage du téléphone ré-arment alors les jours suivants
//     SANS ouvrir l'app (même mécanisme que les adhans, voir RamadanScheduleStore.java).
//
// Un planning vide est TOUJOURS envoyé (hors saison, non premium, rappels désactivés) afin
// d'effacer un planning périmé.

import {
  RAMADAN_REMINDER_LABELS,
  type RamadanNativeConfig,
  type RamadanReminder,
} from "./notifications";

/** Fenêtre armée immédiatement ; le reste est ré-armé chaque nuit par le natif. */
export const ANDROID_IMMEDIATE_WINDOW_DAYS = 10;

interface AdhanNativeModule {
  schedulePrayerReminders?: (reminders: RamadanReminder[]) => void;
  saveRamadanSchedule?: (json: string) => void;
  saveRamadanConfig?: (json: string) => void;
}

/** Forme compacte stockée côté natif : [{ p, t, title, body }]. */
export function serializeRamadanSchedule(reminders: readonly RamadanReminder[]): string {
  return JSON.stringify(
    reminders.map((r) => ({
      p: r.prayer,
      t: r.triggerMillis,
      title: r.title,
      body: r.body,
    })),
  );
}

/**
 * Ne lève jamais. `module` absent (ancienne version native) → on ne fait que ce qui est possible.
 * Retourne le nombre de rappels armés immédiatement.
 */
export function scheduleRamadanRemindersAndroid(
  reminders: readonly RamadanReminder[],
  module: AdhanNativeModule | null | undefined,
  now: number = Date.now(),
): number {
  if (!module) return 0;

  let scheduledNow = 0;
  try {
    const horizon = now + ANDROID_IMMEDIATE_WINDOW_DAYS * 86_400_000;
    const immediate = reminders.filter((r) => r.triggerMillis <= horizon);
    if (immediate.length > 0 && typeof module.schedulePrayerReminders === "function") {
      module.schedulePrayerReminders([...immediate]);
      scheduledNow = immediate.length;
    }
  } catch (error) {
    console.warn("⚠️ [Ramadan] Rappels immédiats non programmés:", error);
  }

  try {
    if (typeof module.saveRamadanSchedule === "function") {
      module.saveRamadanSchedule(serializeRamadanSchedule(reminders));
    }
  } catch (error) {
    console.warn("⚠️ [Ramadan] Planning natif non enregistré:", error);
  }

  return scheduledNow;
}

/**
 * Android : suhoor, iftar et Laylat al-Qadr sont calculés PAR LE NATIF (config envoyée ici),
 * comme les adhans, donc sans ouvrir l'app. Le JS ne programme que le rappel de lecture, qui
 * dépend du plan de l'utilisateur. Ne lève jamais.
 *
 * ⚠️ Ne PAS armer aussi suhoor/iftar/Laylat côté JS : ce serait des doublons.
 */
export function scheduleRamadanAndroid(
  reminders: readonly RamadanReminder[],
  config: RamadanNativeConfig | null,
  module: AdhanNativeModule | null | undefined,
  now: number = Date.now(),
): number {
  if (!module) return 0;

  const khatmOnly = reminders.filter((r) => r.prayer === RAMADAN_REMINDER_LABELS.khatm);
  const scheduledNow = scheduleRamadanRemindersAndroid(khatmOnly, module, now);

  try {
    // config null (réglages illisibles) : le natif garde la précédente.
    if (config && typeof module.saveRamadanConfig === "function") {
      module.saveRamadanConfig(JSON.stringify(config));
    }
  } catch (error) {
    console.warn("⚠️ [Ramadan] Config native non enregistrée:", error);
  }
  return scheduledNow;
}
