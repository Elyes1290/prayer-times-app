import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  EMPTY_TODAY_PRAYERS,
  TRACKED_PRAYERS,
  type TodayPrayersState,
  type TrackedPrayer,
} from "../constants/prayerTracking";

function todayKey(userId: number): string {
  const date = new Date().toISOString().slice(0, 10);
  return `@today_prayers_v1_${userId}_${date}`;
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

export async function loadLocalTodayPrayers(
  userId: number,
): Promise<TodayPrayersState | null> {
  try {
    const raw = await AsyncStorage.getItem(todayKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TodayPrayersState>;
    return mergeTodayPrayers(parsed, null);
  } catch {
    return null;
  }
}

export async function saveLocalTodayPrayers(
  userId: number,
  state: TodayPrayersState,
): Promise<void> {
  await AsyncStorage.setItem(todayKey(userId), JSON.stringify(state));
}

export async function toggleLocalTodayPrayer(
  userId: number,
  prayer: TrackedPrayer,
  completed: boolean,
  base: TodayPrayersState,
): Promise<TodayPrayersState> {
  const next = { ...base, [prayer]: completed };
  await saveLocalTodayPrayers(userId, next);
  return next;
}
