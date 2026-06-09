import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  EMPTY_TODAY_PRAYERS,
  TRACKED_PRAYERS,
  addDaysToDate,
  toDateISO,
  type TodayPrayersState,
  type TrackedPrayer,
} from "../constants/prayerTracking";

export type PrayerHistoryDay = {
  date: string;
  complete?: boolean;
  prayers?: number;
  dhikr?: number;
  quran?: number;
  hadiths?: number;
};

function prayersKey(userId: number, dateISO: string): string {
  return `@today_prayers_v1_${userId}_${dateISO}`;
}

export function countCompletedPrayers(state: TodayPrayersState): number {
  return TRACKED_PRAYERS.filter((p) => state[p]).length;
}

export function isDayComplete(state: TodayPrayersState): boolean {
  return countCompletedPrayers(state) === TRACKED_PRAYERS.length;
}

export function mergeTodayPrayers(
  remote: Partial<TodayPrayersState> | null | undefined,
  local: TodayPrayersState | null,
): TodayPrayersState {
  const merged = { ...EMPTY_TODAY_PRAYERS };
  for (const prayer of TRACKED_PRAYERS) {
    merged[prayer] = Boolean(remote?.[prayer] || local?.[prayer]);
  }
  return merged;
}

export async function loadLocalPrayersForDate(
  userId: number,
  dateISO: string = toDateISO(new Date()),
): Promise<TodayPrayersState | null> {
  try {
    const raw = await AsyncStorage.getItem(prayersKey(userId, dateISO));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TodayPrayersState>;
    return mergeTodayPrayers(parsed, null);
  } catch {
    return null;
  }
}

/** @deprecated Utiliser loadLocalPrayersForDate */
export async function loadLocalTodayPrayers(
  userId: number,
): Promise<TodayPrayersState | null> {
  return loadLocalPrayersForDate(userId);
}

export async function saveLocalPrayersForDate(
  userId: number,
  dateISO: string,
  state: TodayPrayersState,
): Promise<void> {
  await AsyncStorage.setItem(prayersKey(userId, dateISO), JSON.stringify(state));
}

export async function toggleLocalPrayerForDate(
  userId: number,
  dateISO: string,
  prayer: TrackedPrayer,
  completed: boolean,
  base: TodayPrayersState,
): Promise<TodayPrayersState> {
  const next = { ...base, [prayer]: completed };
  await saveLocalPrayersForDate(userId, dateISO, next);
  return next;
}

/** @deprecated Utiliser toggleLocalPrayerForDate */
export async function toggleLocalTodayPrayer(
  userId: number,
  prayer: TrackedPrayer,
  completed: boolean,
  base: TodayPrayersState,
): Promise<TodayPrayersState> {
  return toggleLocalPrayerForDate(
    userId,
    toDateISO(new Date()),
    prayer,
    completed,
    base,
  );
}

function upsertHistoryDay(
  map: Map<string, PrayerHistoryDay>,
  dateISO: string,
  state: Partial<TodayPrayersState> | null | undefined,
): void {
  if (!state) return;

  const merged = mergeTodayPrayers(state, null);
  const count = countCompletedPrayers(merged);
  const prev = map.get(dateISO) ?? {
    date: dateISO,
    dhikr: 0,
    quran: 0,
    hadiths: 0,
  };

  map.set(dateISO, {
    ...prev,
    prayers: count,
    complete: count >= TRACKED_PRAYERS.length,
  });
}

/** Fusionne today/yesterday_prayers dans l'historique affiché par la heatmap. */
export function enrichHistoryWithPrayerStates(
  history: PrayerHistoryDay[],
  remoteTodayPrayers?: Partial<TodayPrayersState> | null,
  remoteYesterdayPrayers?: Partial<TodayPrayersState> | null,
  liveTodayPrayers?: Partial<TodayPrayersState> | null,
  liveYesterdayPrayers?: Partial<TodayPrayersState> | null,
): PrayerHistoryDay[] {
  const map = new Map(history.map((day) => [day.date, { ...day }]));
  const todayISO = toDateISO(new Date());
  const yesterdayISO = toDateISO(addDaysToDate(new Date(), -1));

  upsertHistoryDay(
    map,
    todayISO,
    liveTodayPrayers !== undefined
      ? mergeTodayPrayers(remoteTodayPrayers, liveTodayPrayers)
      : remoteTodayPrayers,
  );
  upsertHistoryDay(
    map,
    yesterdayISO,
    liveYesterdayPrayers !== undefined
      ? mergeTodayPrayers(remoteYesterdayPrayers, liveYesterdayPrayers)
      : remoteYesterdayPrayers,
  );

  return Array.from(map.values()).sort((a, b) =>
    String(b.date).localeCompare(String(a.date)),
  );
}

function historyDayPrayerCount(day: PrayerHistoryDay | undefined): number {
  if (!day) return 0;
  if (day.complete === true || day.complete === 1 || day.complete === "1") {
    return TRACKED_PRAYERS.length;
  }
  return Number(day.prayers ?? 0);
}

function isHistoryDayComplete(day: PrayerHistoryDay | undefined): boolean {
  return historyDayPrayerCount(day) >= TRACKED_PRAYERS.length;
}

export type StreakMetrics = {
  currentStreak: number;
  maxStreak: number;
  successRate: number;
};

/** Calcule série, record et taux de réussite depuis l'historique enrichi. */
export function computeStreakMetricsFromHistory(
  history: PrayerHistoryDay[],
  windowDays = 30,
): StreakMetrics {
  const map = new Map(history.map((day) => [day.date, day]));
  const recentDays: { count: number; day?: PrayerHistoryDay }[] = [];
  const cursor = new Date();

  for (let i = 0; i < 90; i++) {
    const dateISO = toDateISO(cursor);
    const day = map.get(dateISO);
    recentDays.push({ count: historyDayPrayerCount(day), day });
    cursor.setDate(cursor.getDate() - 1);
  }

  let currentStreak = 0;
  for (let i = 0; i < recentDays.length; i++) {
    const { count, day } = recentDays[i];
    if (isHistoryDayComplete(day) || count >= TRACKED_PRAYERS.length) {
      currentStreak++;
    } else if (i === 0) {
      continue;
    } else {
      break;
    }
  }

  let maxStreak = 0;
  let run = 0;
  for (let i = recentDays.length - 1; i >= 0; i--) {
    const { count, day } = recentDays[i];
    if (isHistoryDayComplete(day) || count >= TRACKED_PRAYERS.length) {
      run++;
      maxStreak = Math.max(maxStreak, run);
    } else {
      run = 0;
    }
  }

  let trackedDays = 0;
  let completeDays = 0;
  for (let i = 0; i < Math.min(windowDays, recentDays.length); i++) {
    const { count, day } = recentDays[i];
    if (count > 0) {
      trackedDays++;
      if (isHistoryDayComplete(day) || count >= TRACKED_PRAYERS.length) {
        completeDays++;
      }
    }
  }

  const successRate =
    trackedDays > 0 ? Math.round((completeDays / trackedDays) * 100) : 0;

  return { currentStreak, maxStreak, successRate };
}
