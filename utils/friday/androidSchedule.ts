// utils/friday/androidSchedule.ts
//
// Android : programmation du rappel du vendredi.
//  1. Les rappels des prochains jours sont armés tout de suite (comme les rappels de prière).
//  2. La CONFIG (activé, heure, textes) est enregistrée côté natif : la maintenance de 00:05 et
//     le redémarrage détectent eux-mêmes le vendredi et arment le rappel, sans liste précalculée
//     et sans ouvrir l'app (voir RamadanScheduleStore.java).
//
// La config est envoyée même quand le rappel est désactivé (enabled = false) afin que le natif
// n'arme plus rien.

import type { RamadanReminder } from "../ramadan/notifications";
import type { FridayNativeConfig } from "./reminders";

/** Fenêtre armée immédiatement ; le reste est détecté chaque nuit par le natif. */
export const FRIDAY_IMMEDIATE_WINDOW_DAYS = 10;

interface AdhanNativeModule {
  schedulePrayerReminders?: (reminders: RamadanReminder[]) => void;
  saveFridayConfig?: (json: string) => void;
}

/** Forme compacte envoyée au natif. */
export function serializeFridayConfig(config: FridayNativeConfig): string {
  return JSON.stringify({
    enabled: config.enabled,
    hour: config.hour,
    minute: config.minute,
    title: config.title,
    body: config.body,
  });
}

/**
 * Ne lève jamais. `module` absent (ancienne version native) → on ne fait que ce qui est possible.
 * `config` null (erreur de lecture) → la config native existante n'est pas modifiée.
 * Retourne le nombre de rappels armés immédiatement.
 */
export function scheduleFridayRemindersAndroid(
  reminders: readonly RamadanReminder[],
  config: FridayNativeConfig | null,
  module: AdhanNativeModule | null | undefined,
  now: number = Date.now(),
): number {
  if (!module) return 0;

  let scheduledNow = 0;
  try {
    const horizon = now + FRIDAY_IMMEDIATE_WINDOW_DAYS * 86_400_000;
    const immediate = reminders.filter((r) => r.triggerMillis <= horizon);
    if (immediate.length > 0 && typeof module.schedulePrayerReminders === "function") {
      module.schedulePrayerReminders([...immediate]);
      scheduledNow = immediate.length;
    }
  } catch (error) {
    console.warn("⚠️ [Vendredi] Rappels immédiats non programmés:", error);
  }

  try {
    if (config && typeof module.saveFridayConfig === "function") {
      module.saveFridayConfig(serializeFridayConfig(config));
    }
  } catch (error) {
    console.warn("⚠️ [Vendredi] Config native non enregistrée:", error);
  }

  return scheduledNow;
}
