import { useCallback, useEffect, useMemo, useState } from "react";
import { PrayerTimes } from "adhan";
import * as Haptics from "expo-haptics";
import {
  TRACKED_PRAYERS,
  type TrackedPrayer,
  type TodayPrayersState,
} from "../constants/prayerTracking";
import { useLocation } from "./useLocation";
import { usePrayerTimes } from "./usePrayerTimes";
import { usePremium } from "../contexts/PremiumContext";
import { useUpdateUserStats } from "./useUpdateUserStats";
import { getCurrentUserId } from "../utils/userAuth";
import {
  countCompletedPrayers,
  isDayComplete,
  loadLocalTodayPrayers,
  mergeTodayPrayers,
  toggleLocalTodayPrayer,
} from "../utils/prayerTrackingStorage";

type UseTodayPrayersOptions = {
  remoteTodayPrayers?: Partial<TodayPrayersState> | null;
  onUpdated?: () => Promise<void>;
};

function formatPrayerTime(prayerTimes: PrayerTimes | null, prayer: TrackedPrayer) {
  const time = prayerTimes?.[prayer];
  if (!(time instanceof Date)) {
    return "--:--";
  }
  return time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getNextPrayer(
  prayerTimes: PrayerTimes | null,
  state: TodayPrayersState,
): TrackedPrayer | null {
  if (!prayerTimes) return null;
  const now = Date.now();
  for (const prayer of TRACKED_PRAYERS) {
    const time = prayerTimes[prayer];
    if (
      !state[prayer] &&
      time instanceof Date &&
      time.getTime() <= now
    ) {
      return prayer;
    }
  }
  for (const prayer of TRACKED_PRAYERS) {
    if (!state[prayer]) {
      return prayer;
    }
  }
  return null;
}

export function useTodayPrayers({
  remoteTodayPrayers,
  onUpdated,
}: UseTodayPrayersOptions) {
  const { location } = useLocation();
  const { user } = usePremium();
  const { prayerTimes } = usePrayerTimes(location, new Date(), !!user?.isPremium);
  const { togglePrayer } = useUpdateUserStats();

  const [todayPrayers, setTodayPrayers] = useState<TodayPrayersState>(() =>
    mergeTodayPrayers(remoteTodayPrayers, null),
  );
  const [togglingPrayer, setTogglingPrayer] = useState<TrackedPrayer | null>(
    null,
  );
  const [showDayComplete, setShowDayComplete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const userId = await getCurrentUserId();
      if (!userId || cancelled) return;
      const local = await loadLocalTodayPrayers(userId);
      setTodayPrayers(mergeTodayPrayers(remoteTodayPrayers, local));
    })();
    return () => {
      cancelled = true;
    };
  }, [remoteTodayPrayers]);

  const completedCount = useMemo(
    () => countCompletedPrayers(todayPrayers),
    [todayPrayers],
  );

  const progressPercent = useMemo(
    () => Math.round((completedCount / TRACKED_PRAYERS.length) * 100),
    [completedCount],
  );

  const nextPrayer = useMemo(
    () => getNextPrayer(prayerTimes, todayPrayers),
    [prayerTimes, todayPrayers],
  );

  const handleToggle = useCallback(
    async (prayer: TrackedPrayer) => {
      const nextCompleted = !todayPrayers[prayer];
      const previousCount = completedCount;

      setTogglingPrayer(prayer);
      try {
        const userId = await getCurrentUserId();
        if (!userId) return;

        const optimistic = await toggleLocalTodayPrayer(
          userId,
          prayer,
          nextCompleted,
          todayPrayers,
        );
        setTodayPrayers(optimistic);

        const result = await togglePrayer(prayer, nextCompleted);
        if (!result?.success) {
          const rollback = await toggleLocalTodayPrayer(
            userId,
            prayer,
            !nextCompleted,
            optimistic,
          );
          setTodayPrayers(rollback);
          return;
        }

        await Haptics.impactAsync(
          nextCompleted
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light,
        );

        if (
          nextCompleted &&
          previousCount === TRACKED_PRAYERS.length - 1 &&
          isDayComplete(optimistic)
        ) {
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
          setShowDayComplete(true);
        }

        await onUpdated?.();
      } finally {
        setTogglingPrayer(null);
      }
    },
    [todayPrayers, completedCount, togglePrayer, onUpdated],
  );

  const dismissDayComplete = useCallback(() => {
    setShowDayComplete(false);
  }, []);

  const prayerRows = useMemo(
    () =>
      TRACKED_PRAYERS.map((prayer) => ({
        prayer,
        completed: todayPrayers[prayer],
        time: formatPrayerTime(prayerTimes, prayer),
        isNext: nextPrayer === prayer,
        isLoading: togglingPrayer === prayer,
      })),
    [todayPrayers, prayerTimes, nextPrayer, togglingPrayer],
  );

  return {
    prayerRows,
    completedCount,
    progressPercent,
    nextPrayer,
    showDayComplete,
    dismissDayComplete,
    handleToggle,
    isDayComplete: isDayComplete(todayPrayers),
  };
}
