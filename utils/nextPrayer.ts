import type PrayerTimes from "adhan/lib/types/PrayerTimes";
import { computePrayerTimesForDate } from "./prayerTimes";

export type NextPrayerInfo = {
  name: string;
  time: string;
  countdown: string;
  diff: number;
  prayerTime: Date;
};

const PRAYER_ORDER = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;

export function getPrayerDate(
  prayerTimes: PrayerTimes | Record<string, Date>,
  prayerName: string,
): Date | null {
  const key = prayerName.toLowerCase();
  const times = prayerTimes as Record<string, Date | undefined>;
  const time = times[key] ?? times[prayerName];
  return time instanceof Date ? time : null;
}

export function formatCountdown(diffMs: number): string {
  if (diffMs <= 0) return "<1min";
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}min`;
  if (minutes > 0) return `${minutes}min`;
  return "<1min";
}

export function formatPrayerClock(time: Date, locale?: string): string {
  return time.toLocaleTimeString(locale ?? "fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function computeTomorrowPrayerTimes(
  today: Date,
  coords: { latitude: number; longitude: number } | null,
  calcMethod: string,
): PrayerTimes | null {
  if (!coords) return null;

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const times = computePrayerTimesForDate(tomorrow, coords, calcMethod);
  return {
    fajr: times.Fajr,
    sunrise: times.Sunrise,
    dhuhr: times.Dhuhr,
    asr: times.Asr,
    maghrib: times.Maghrib,
    isha: times.Isha,
  } as PrayerTimes;
}

export function getNextPrayerInfo(
  prayerTimes: PrayerTimes | null,
  now: Date = new Date(),
  options?: {
    tomorrowPrayerTimes?: PrayerTimes | null;
    locale?: string;
  },
): NextPrayerInfo | null {
  if (!prayerTimes) return null;

  const locale = options?.locale;

  for (const prayer of PRAYER_ORDER) {
    const prayerTime = getPrayerDate(prayerTimes, prayer);
    if (prayerTime && now < prayerTime) {
      const diff = prayerTime.getTime() - now.getTime();
      return {
        name: prayer,
        time: formatPrayerClock(prayerTime, locale),
        countdown: formatCountdown(diff),
        diff,
        prayerTime,
      };
    }
  }

  const tomorrowFajr = options?.tomorrowPrayerTimes
    ? getPrayerDate(options.tomorrowPrayerTimes, "Fajr")
    : null;

  if (tomorrowFajr && now < tomorrowFajr) {
    const diff = tomorrowFajr.getTime() - now.getTime();
    return {
      name: "Fajr",
      time: formatPrayerClock(tomorrowFajr, locale),
      countdown: formatCountdown(diff),
      diff,
      prayerTime: tomorrowFajr,
    };
  }

  return null;
}

export function getPrayerProgressPercentage(
  prayerTimes: PrayerTimes | null,
  now: Date = new Date(),
  tomorrowPrayerTimes?: PrayerTimes | null,
): number {
  const next = getNextPrayerInfo(prayerTimes, now, { tomorrowPrayerTimes });
  if (!next || !prayerTimes) return 0;

  let previousPrayer: Date | null = null;

  if (next.name === "Fajr") {
    previousPrayer = getPrayerDate(prayerTimes, "Isha");
  } else {
    const nextIndex = PRAYER_ORDER.indexOf(
      next.name as (typeof PRAYER_ORDER)[number],
    );
    if (nextIndex > 0) {
      previousPrayer = getPrayerDate(prayerTimes, PRAYER_ORDER[nextIndex - 1]);
    }
  }

  if (!previousPrayer) return 0;

  const totalInterval = next.prayerTime.getTime() - previousPrayer.getTime();
  if (totalInterval <= 0) return 0;

  const elapsed = now.getTime() - previousPrayer.getTime();
  return Math.max(0, Math.min(100, (elapsed / totalInterval) * 100));
}
