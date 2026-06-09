import { useCallback, useEffect, useMemo, useState } from "react";
import { PrayerTimes } from "adhan";
import * as Haptics from "expo-haptics";
import {
  TRACKED_PRAYERS,
  MAX_PRAYER_TRACKING_DAYS_BACK,
  addDaysToDate,
  toDateISO,
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
  loadLocalPrayersForDate,
  mergeTodayPrayers,
  toggleLocalPrayerForDate,
} from "../utils/prayerTrackingStorage";

type UseTodayPrayersOptions = {
  remoteTodayPrayers?: Partial<TodayPrayersState> | null;
  remoteYesterdayPrayers?: Partial<TodayPrayersState> | null;
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
  isToday: boolean,
): TrackedPrayer | null {
  if (!isToday || !prayerTimes) return null;
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
  remoteYesterdayPrayers,
  onUpdated,
}: UseTodayPrayersOptions) {
  const { location } = useLocation();
  const { user } = usePremium();
  const [dayOffset, setDayOffset] = useState(0);

  const todayISO = useMemo(() => toDateISO(new Date()), []);
  const yesterdayISO = useMemo(
    () => toDateISO(addDaysToDate(new Date(), -1)),
    [],
  );

  const trackingDate = useMemo(
    () => addDaysToDate(new Date(), -dayOffset),
    [dayOffset],
  );
  const trackingDateISO = useMemo(
    () => toDateISO(trackingDate),
    [trackingDate],
  );
  const isTrackingToday = dayOffset === 0;

  const remoteForDate = useMemo(() => {
    if (isTrackingToday) return remoteTodayPrayers;
    if (dayOffset === 1) return remoteYesterdayPrayers;
    return null;
  }, [
    isTrackingToday,
    dayOffset,
    remoteTodayPrayers,
    remoteYesterdayPrayers,
  ]);

  const { prayerTimes } = usePrayerTimes(
    location,
    trackingDate,
    !!user?.isPremium,
  );
  const { togglePrayer } = useUpdateUserStats();

  const [prayersByDate, setPrayersByDate] = useState<
    Record<string, TodayPrayersState>
  >({});
  const [togglingPrayer, setTogglingPrayer] = useState<TrackedPrayer | null>(
    null,
  );
  const [showDayComplete, setShowDayComplete] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const userId = await getCurrentUserId();
      if (!userId || cancelled) return;

      const [localToday, localYesterday] = await Promise.all([
        loadLocalPrayersForDate(userId, todayISO),
        loadLocalPrayersForDate(userId, yesterdayISO),
      ]);

      if (cancelled) return;

      setPrayersByDate({
        [todayISO]: mergeTodayPrayers(remoteTodayPrayers, localToday),
        [yesterdayISO]: mergeTodayPrayers(remoteYesterdayPrayers, localYesterday),
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [remoteTodayPrayers, remoteYesterdayPrayers, todayISO, yesterdayISO]);

  const todayPrayers = useMemo(
    () =>
      prayersByDate[trackingDateISO] ??
      mergeTodayPrayers(remoteForDate, null),
    [prayersByDate, trackingDateISO, remoteForDate],
  );

  const liveTodayPrayers = prayersByDate[todayISO];
  const liveYesterdayPrayers = prayersByDate[yesterdayISO];

  const completedCount = useMemo(
    () => countCompletedPrayers(todayPrayers),
    [todayPrayers],
  );

  const progressPercent = useMemo(
    () => Math.round((completedCount / TRACKED_PRAYERS.length) * 100),
    [completedCount],
  );

  const nextPrayer = useMemo(
    () => getNextPrayer(prayerTimes, todayPrayers, isTrackingToday),
    [prayerTimes, todayPrayers, isTrackingToday],
  );

  const goToPreviousDay = useCallback(() => {
    setDayOffset((current) =>
      Math.min(MAX_PRAYER_TRACKING_DAYS_BACK, current + 1),
    );
  }, []);

  const goToNextDay = useCallback(() => {
    setDayOffset((current) => Math.max(0, current - 1));
  }, []);

  const handleToggle = useCallback(
    async (prayer: TrackedPrayer) => {
      const nextCompleted = !todayPrayers[prayer];
      const previousCount = completedCount;

      setTogglingPrayer(prayer);
      try {
        const userId = await getCurrentUserId();
        if (!userId) return;

        const optimistic = await toggleLocalPrayerForDate(
          userId,
          trackingDateISO,
          prayer,
          nextCompleted,
          todayPrayers,
        );

        setPrayersByDate((prev) => ({
          ...prev,
          [trackingDateISO]: optimistic,
        }));

        const result = await togglePrayer(
          prayer,
          nextCompleted,
          trackingDateISO,
        );
        if (!result?.success) {
          const rollback = await toggleLocalPrayerForDate(
            userId,
            trackingDateISO,
            prayer,
            !nextCompleted,
            optimistic,
          );
          setPrayersByDate((prev) => ({
            ...prev,
            [trackingDateISO]: rollback,
          }));
          return;
        }

        await Haptics.impactAsync(
          nextCompleted
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light,
        );

        if (
          isTrackingToday &&
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
    [
      todayPrayers,
      completedCount,
      togglePrayer,
      onUpdated,
      trackingDateISO,
      isTrackingToday,
    ],
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
    trackingDate,
    trackingDateISO,
    todayPrayers,
    liveTodayPrayers,
    liveYesterdayPrayers,
    isTrackingToday,
    canGoToPreviousDay: dayOffset < MAX_PRAYER_TRACKING_DAYS_BACK,
    canGoToNextDay: dayOffset > 0,
    goToPreviousDay,
    goToNextDay,
  };
}
