export const TRACKED_PRAYERS = [
  "fajr",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
] as const;

export type TrackedPrayer = (typeof TRACKED_PRAYERS)[number];

export type TodayPrayersState = Record<TrackedPrayer, boolean>;

export const EMPTY_TODAY_PRAYERS: TodayPrayersState = {
  fajr: false,
  dhuhr: false,
  asr: false,
  maghrib: false,
  isha: false,
};

export const MAX_PRAYER_TRACKING_DAYS_BACK = 1;

/** Date calendaire locale au format YYYY-MM-DD (alignée avec l'API CURDATE). */
export function toDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysToDate(base: Date, delta: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + delta);
  return next;
}

export const PRAYER_TRACKING_ICONS: Record<
  TrackedPrayer,
  { name: string; color: string }
> = {
  fajr: { name: "weather-sunset-up", color: "#FF6B6B" },
  dhuhr: { name: "white-balance-sunny", color: "#4ECDC4" },
  asr: { name: "weather-partly-cloudy", color: "#45B7D1" },
  maghrib: { name: "weather-sunset-down", color: "#FFA07A" },
  isha: { name: "moon-waning-crescent", color: "#9B59B6" },
};
