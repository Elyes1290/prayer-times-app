// utils/ramadan/notifications.ts
//
// Rappels Ramadan (suhoor, iftar, lecture du jour, nuits de Laylat al-Qadr).
//
// Intégration : `scheduleNotificationsFor2Days` appelle `getRamadanRemindersForScheduling`
// APRÈS avoir annulé toutes les notifications existantes, puis envoie le résultat avec
// le même mécanisme que les rappels de prière (AdhanModule.schedulePrayerReminders) :
//   - annulation : couverte par `cancelAllPrayerReminders` (registre Android, préfixe
//     "reminder" sur iOS) → aucune notification fantôme à la fin de la saison ;
//   - Android : une alarme exacte par rappel ; iOS : agrégé avec les autres rappels.
//
// ⚠️ Contraintes du code natif existant :
//   - Android : `PrayerReminderService` remplace « 10 minutes » par le réglage de rappel
//     de prière dans le corps du message → nos textes utilisent « min », jamais « minutes ».
//   - Android : `PrayerReminderService` ignore un même libellé déclenché dans l'heure ;
//     chaque type de rappel a donc son propre libellé (RamadanSuhoor, RamadanIftar…).

import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "../../locales/i18n";
import { computePrayerTimesForDate } from "../prayerTimes";
import { isVipUserRecord } from "../isVipUser";
import { safeJsonParse } from "../safeJson";
import {
  addLocalDays,
  diffLocalDays,
  getNightEveDate,
  getRamadanSeason,
  ODD_LAST_NIGHTS,
  parseLocalDateKey,
  startOfLocalDay,
  toLocalDateKey,
  type RamadanSeason,
} from "./season";
import {
  computeKhatmDay,
  type KhatmPlan,
  type KhatmLog,
} from "./khatm";
import {
  getKhatmDayIndex,
  loadRamadanData,
  loadRamadanSettings,
  type RamadanSettings,
} from "./storage";
import { ramadanTranslate } from "./i18n";

export const RAMADAN_REMINDER_LABELS = {
  suhoor: "RamadanSuhoor",
  iftar: "RamadanIftar",
  khatm: "RamadanKhatm",
  laylat: "RamadanLaylat",
} as const;

/** Forme attendue par AdhanModule.schedulePrayerReminders (Android et iOS). */
export interface RamadanReminder {
  key: string;
  prayer: string;
  triggerMillis: number;
  triggerAtMillis: number;
  title: string;
  body: string;
  isToday: boolean;
}

type Location = { latitude: number; longitude: number };

/** Décalage minimal pour ne jamais programmer « dans le passé immédiat ». */
const MIN_LEAD_MS = 30_000;
/** Isha + 10 min : on prévient après la prière du soir, au début de la nuit. */
const LAYLAT_AFTER_ISHA_MIN = 10;

export interface BuildRemindersParams {
  now: Date;
  userLocation: Location;
  calcMethod: string;
  season: RamadanSeason;
  settings: RamadanSettings;
  language: string | undefined;
  /** Nombre de jours à programmer à partir d'aujourd'hui. */
  windowDays: number;
  /** Plafond du nombre de rappels (limite iOS). */
  maxCount: number;
  khatm?: { plan: KhatmPlan; log: KhatmLog } | null;
}

/**
 * Construit la liste des rappels Ramadan à programmer. Fonction PURE (hors calcul des
 * horaires de prière) : aucun accès au stockage ni aux modules natifs.
 */
export function buildRamadanReminders(params: BuildRemindersParams): RamadanReminder[] {
  const { now, userLocation, calcMethod, season, settings, language, windowDays, maxCount } = params;

  if (season.phase !== "ramadan" && season.phase !== "countdown") {
    return [];
  }

  const t = (key: string, vars?: Record<string, string | number>) =>
    ramadanTranslate(language, key, vars);

  const today = startOfLocalDay(now);
  const reminders: RamadanReminder[] = [];
  const minTrigger = now.getTime() + MIN_LEAD_MS;

  const push = (
    kind: keyof typeof RAMADAN_REMINDER_LABELS,
    key: string,
    at: Date,
    title: string,
    body: string,
  ) => {
    const trigger = at.getTime();
    if (trigger < minTrigger) return;
    reminders.push({
      key,
      prayer: RAMADAN_REMINDER_LABELS[kind],
      triggerMillis: trigger,
      triggerAtMillis: trigger,
      title,
      body,
      isToday: false,
    });
  };

  for (let offset = 0; offset < windowDays; offset += 1) {
    const day = addLocalDays(today, offset);
    const dayKey = toLocalDateKey(day);
    const dayIndex = diffLocalDays(season.startDate, day);
    const isFastingDay = dayIndex >= 0 && dayIndex < season.lengthDays;

    let times: ReturnType<typeof computePrayerTimesForDate> | null = null;
    const getTimes = () => {
      if (!times) times = computePrayerTimesForDate(day, userLocation, calcMethod);
      return times;
    };

    if (isFastingDay && settings.suhoorEnabled) {
      const at = new Date(getTimes().Fajr.getTime() - settings.suhoorReminderMin * 60_000);
      push(
        "suhoor",
        `ramadan_suhoor_${dayKey}`,
        at,
        t("notif.suhoorTitle"),
        t("notif.suhoorBody", { min: settings.suhoorReminderMin }),
      );
    }

    if (isFastingDay && settings.iftarEnabled) {
      const at = new Date(getTimes().Maghrib.getTime() - settings.iftarReminderMin * 60_000);
      push(
        "iftar",
        `ramadan_iftar_${dayKey}`,
        at,
        t("notif.iftarTitle"),
        t("notif.iftarBody", { min: settings.iftarReminderMin }),
      );
    }

    if (isFastingDay && settings.khatmReminderEnabled && params.khatm) {
      const { plan, log } = params.khatm;
      const planIndex = getKhatmDayIndex(plan, day);
      const info = computeKhatmDay(plan, log, dayKey, planIndex);
      const planStart = parseLocalDateKey(plan.startKey);
      const planStarted = planStart !== null && diffLocalDays(planStart, day) >= 0;
      // Pas de rappel si le plan est terminé, ou si la portion d'AUJOURD'HUI est déjà lue.
      if (planStarted && !info.planDone && !(offset === 0 && info.isDoneToday)) {
        const at = new Date(
          day.getFullYear(),
          day.getMonth(),
          day.getDate(),
          settings.khatmReminderHour,
          settings.khatmReminderMinute,
          0,
        );
        push(
          "khatm",
          `ramadan_khatm_${dayKey}`,
          at,
          t("notif.khatmTitle"),
          t("notif.khatmBody"),
        );
      }
    }

    // Nuits impaires : la « nuit n » commence au Maghrib du jour n-1.
    if (settings.laylatEnabled) {
      for (const night of ODD_LAST_NIGHTS) {
        if (night > season.lengthDays) continue;
        const eve = getNightEveDate(season, night);
        if (toLocalDateKey(eve) !== dayKey) continue;
        const ishaTime = getTimes().Isha;
        const at = new Date(ishaTime.getTime() + LAYLAT_AFTER_ISHA_MIN * 60_000);
        push(
          "laylat",
          `ramadan_laylat_${night}`,
          at,
          t("notif.laylatTitle", { n: night }),
          t("notif.laylatBody"),
        );
      }
    }
  }

  reminders.sort((a, b) => a.triggerMillis - b.triggerMillis);
  return reminders.slice(0, Math.max(0, maxCount));
}

// ---------------------------------------------------------------------------
// Accès au stockage (premium + réglages) — utilisé par scheduleNotificationsFor2Days
// ---------------------------------------------------------------------------

const PREMIUM_USER_KEY = "@prayer_app_premium_user";

/** Premium (abonné ou VIP) d'après le stockage local, sans dépendre de React. */
export async function isPremiumFromStorage(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(PREMIUM_USER_KEY);
    const user = safeJsonParse<Record<string, unknown> | null>(raw, null);
    if (!user) return false;
    return user.isPremium === true || isVipUserRecord(user);
  } catch {
    return false;
  }
}

export interface SchedulingContext {
  userLocation: Location;
  calcMethod: string;
  /** Plateforme : iOS = fenêtre courte et plafond bas (limite de 64 notifications). */
  platform: "ios" | "android" | string;
  now?: Date;
}

const IOS_WINDOW_DAYS = 2;
const IOS_MAX_COUNT = 6;
// Android : toute la saison (≈ 30 j × 3 rappels + 5 nuits) est calculée ; seuls les 10
// prochains jours sont armés tout de suite, le reste est ré-armé chaque nuit par le natif
// (voir androidSchedule.ts / RamadanScheduleStore.java).
const ANDROID_WINDOW_DAYS = 32;
const ANDROID_MAX_COUNT = 130;

/**
 * Config envoyée au natif Android : il calcule LUI-MÊME la saison (Umm al-Qura) et les
 * horaires de prière pour le suhoor, l'iftar et Laylat al-Qadr, exactement comme les
 * adhans : les rappels arrivent donc sans ouvrir l'app. Seuls les textes (traduits) et
 * les réglages de l'utilisateur viennent d'ici. Le rappel de lecture, lui, dépend du plan
 * stocké côté app et reste calculé en JS.
 */
export interface RamadanNativeConfig {
  premium: boolean;
  startOffsetDays: number;
  suhoorEnabled: boolean;
  suhoorMin: number;
  iftarEnabled: boolean;
  iftarMin: number;
  laylatEnabled: boolean;
  suhoorTitle: string;
  suhoorBody: string;
  iftarTitle: string;
  iftarBody: string;
  laylatBody: string;
  laylatTitles: Record<string, string>;
}

/** Ne lève jamais ; `null` si les réglages sont illisibles (le natif garde sa config). */
export async function getRamadanNativeConfig(): Promise<RamadanNativeConfig | null> {
  try {
    const settings = await loadRamadanSettings();
    const premium = await isPremiumFromStorage();
    const language = i18n.language;
    const t = (key: string, vars?: Record<string, string | number>) =>
      ramadanTranslate(language, key, vars);

    const laylatTitles: Record<string, string> = {};
    for (const night of ODD_LAST_NIGHTS) {
      laylatTitles[String(night)] = t("notif.laylatTitle", { n: night });
    }

    return {
      premium,
      startOffsetDays: settings.startOffsetDays,
      suhoorEnabled: settings.suhoorEnabled,
      suhoorMin: settings.suhoorReminderMin,
      iftarEnabled: settings.iftarEnabled,
      iftarMin: settings.iftarReminderMin,
      laylatEnabled: settings.laylatEnabled,
      suhoorTitle: t("notif.suhoorTitle"),
      suhoorBody: t("notif.suhoorBody", { min: settings.suhoorReminderMin }),
      iftarTitle: t("notif.iftarTitle"),
      iftarBody: t("notif.iftarBody", { min: settings.iftarReminderMin }),
      laylatBody: t("notif.laylatBody"),
      laylatTitles,
    };
  } catch (error) {
    console.warn("⚠️ [Ramadan] Config native non construite:", error);
    return null;
  }
}

/**
 * Rappels Ramadan à programmer maintenant (liste vide si : hors saison, non premium,
 * ou toute erreur). Ne lève JAMAIS : une panne ici ne doit jamais empêcher la
 * programmation des adhans.
 */
export async function getRamadanRemindersForScheduling(
  ctx: SchedulingContext,
): Promise<RamadanReminder[]> {
  try {
    const now = ctx.now ?? new Date();
    const settings = await loadRamadanSettings();
    const season = getRamadanSeason(now, settings.startOffsetDays);
    if (season.phase !== "ramadan" && season.phase !== "countdown") {
      return [];
    }

    if (!(await isPremiumFromStorage())) {
      return [];
    }

    const data = await loadRamadanData(season.hijriYear);
    const isIos = ctx.platform === "ios";

    return buildRamadanReminders({
      now,
      userLocation: ctx.userLocation,
      calcMethod: ctx.calcMethod,
      season,
      settings,
      language: i18n.language,
      windowDays: isIos ? IOS_WINDOW_DAYS : ANDROID_WINDOW_DAYS,
      maxCount: isIos ? IOS_MAX_COUNT : ANDROID_MAX_COUNT,
      khatm: data.khatmPlan ? { plan: data.khatmPlan, log: data.khatmLog } : null,
    });
  } catch (error) {
    console.warn("⚠️ [Ramadan] Rappels non programmés:", error);
    return [];
  }
}
