// utils/friday/reminders.ts
//
// Rappel du vendredi (gratuit) : une notification le vendredi matin.
//
// Intégration (même mécanisme que « Mon Ramadan ») : `scheduleNotificationsFor2Days` appelle
// `getFridayRemindersForScheduling` APRÈS avoir annulé toutes les notifications, puis :
//   - Android : les rappels rejoignent le planning natif (RamadanScheduleStore) → les
//     prochains vendredis sont ré-armés chaque nuit et au redémarrage, sans ouvrir l'app ;
//   - iOS : agrégés avec les autres rappels (fenêtre courte, 1 seul rappel).
// L'annulation est couverte par `cancelAllPrayerReminders`.
//
// ⚠️ Contraintes du code natif existant :
//   - Android : `PrayerReminderService` remplace « 10 minutes » dans le corps du message →
//     nos textes n'emploient jamais le mot « minutes ».
//   - Le libellé commence par "Friday" : le natif ne ré-arme que les libellés connus
//     ("Ramadan…" et "Friday…") et ne les soumet pas au réglage « rappel avant la prière ».

import i18n from "../../locales/i18n";
import type { RamadanReminder } from "../ramadan/notifications";
import { addLocalDays, startOfLocalDay, toLocalDateKey } from "../ramadan/season";
import { isFridayTestMode } from "./debug";
import { fridayTranslate } from "./i18n";
import { loadFridaySettings, type FridaySettings } from "./storage";

export const FRIDAY_REMINDER_LABEL = "FridayReminder";

/** Décalage minimal pour ne jamais programmer « dans le passé immédiat ». */
const MIN_LEAD_MS = 30_000;

/** Vendredi (jour local). En mode test, tous les jours comptent comme un vendredi. */
export function isFriday(date: Date): boolean {
  return isFridayTestMode() || date.getDay() === 5;
}

export interface BuildFridayRemindersParams {
  now: Date;
  settings: FridaySettings;
  language: string | undefined;
  /** Nombre de jours à examiner à partir d'aujourd'hui. */
  windowDays: number;
  /** Plafond du nombre de rappels. */
  maxCount: number;
}

/** Construit les rappels à programmer. Fonction PURE (aucun accès au stockage ni au natif). */
export function buildFridayReminders(params: BuildFridayRemindersParams): RamadanReminder[] {
  const { now, settings, language, windowDays, maxCount } = params;
  if (!settings.enabled) return [];

  const today = startOfLocalDay(now);
  const minTrigger = now.getTime() + MIN_LEAD_MS;
  const reminders: RamadanReminder[] = [];

  for (let offset = 0; offset < windowDays; offset += 1) {
    const day = addLocalDays(today, offset);
    if (!isFriday(day)) continue;

    const trigger = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      settings.hour,
      settings.minute,
      0,
    ).getTime();
    if (trigger < minTrigger) continue;

    reminders.push({
      key: `friday_${toLocalDateKey(day)}`,
      prayer: FRIDAY_REMINDER_LABEL,
      triggerMillis: trigger,
      triggerAtMillis: trigger,
      title: fridayTranslate(language, "notif.title"),
      body: fridayTranslate(language, "notif.body"),
      isToday: false,
    });
  }

  reminders.sort((a, b) => a.triggerMillis - b.triggerMillis);
  return reminders.slice(0, Math.max(0, maxCount));
}

export interface FridaySchedulingContext {
  /** iOS = fenêtre courte et un seul rappel (limite de 64 notifications). */
  platform: "ios" | "android" | string;
  now?: Date;
}

// Android : ~12 prochains vendredis ; seuls les 10 prochains jours sont armés tout de suite,
// le reste est ré-armé chaque nuit par le natif.
const ANDROID_WINDOW_DAYS = 84;
const ANDROID_TEST_WINDOW_DAYS = 14;
const ANDROID_MAX_COUNT = 14;
// iOS : mêmes 3 jours que les prières ; un seul rappel pour rester sous la limite.
const IOS_WINDOW_DAYS = 3;
const IOS_MAX_COUNT = 1;

/**
 * Rappels du vendredi à programmer maintenant (liste vide si désactivés, ou en cas d'erreur).
 * Ne lève JAMAIS : une panne ici ne doit jamais empêcher la programmation des adhans.
 */
export async function getFridayRemindersForScheduling(
  ctx: FridaySchedulingContext,
): Promise<RamadanReminder[]> {
  try {
    const settings = await loadFridaySettings();
    if (!settings.enabled) return [];
    const isIos = ctx.platform === "ios";
    return buildFridayReminders({
      now: ctx.now ?? new Date(),
      settings,
      language: i18n.language,
      windowDays: isIos
        ? IOS_WINDOW_DAYS
        : isFridayTestMode()
          ? ANDROID_TEST_WINDOW_DAYS
          : ANDROID_WINDOW_DAYS,
      maxCount: isIos ? IOS_MAX_COUNT : ANDROID_MAX_COUNT,
    });
  } catch (error) {
    console.warn("⚠️ [Vendredi] Rappels non programmés:", error);
    return [];
  }
}
