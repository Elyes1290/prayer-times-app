// components/ramadan/RamadanTimesCard.tsx
// Horaires du jour (fin du suhoor = Fajr, iftar = Maghrib) + compte à rebours en direct.

import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "../../hooks/useThemeColor";
import { computePrayerTimesForDate } from "../../utils/prayerTimes";
import { formatClock, formatCountdown } from "../../utils/ramadan/format";
import type { RamadanTranslate } from "../../utils/ramadan/i18n";
import { addLocalDays, startOfLocalDay } from "../../utils/ramadan/season";
import { RamadanCard } from "./RamadanUI";

export interface RamadanLocation {
  latitude: number;
  longitude: number;
}

interface RamadanTimesCardProps {
  now: Date;
  location: RamadanLocation | null;
  calcMethod: string;
  t: RamadanTranslate;
  language: string | undefined;
}

export default function RamadanTimesCard({
  now,
  location,
  calcMethod,
  t,
  language,
}: RamadanTimesCardProps) {
  const colors = useThemeColors();
  const latitude = location?.latitude;
  const longitude = location?.longitude;
  const dayStartMs = startOfLocalDay(now).getTime();

  const times = useMemo(() => {
    if (latitude === undefined || longitude === undefined) return null;
    try {
      const day = new Date(dayStartMs);
      const coords = { latitude, longitude };
      const today = computePrayerTimesForDate(day, coords, calcMethod);
      const tomorrow = computePrayerTimesForDate(addLocalDays(day, 1), coords, calcMethod);
      return {
        fajr: today.Fajr,
        maghrib: today.Maghrib,
        tomorrowFajr: tomorrow.Fajr,
      };
    } catch {
      return null;
    }
  }, [latitude, longitude, dayStartMs, calcMethod]);

  if (!times) {
    return (
      <RamadanCard title={t("times.title")} icon="clock-outline">
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          {t("times.noLocation")}
        </Text>
      </RamadanCard>
    );
  }

  const nowMs = now.getTime();
  let countdown: string;
  if (nowMs < times.fajr.getTime()) {
    countdown = t("times.nextSuhoorEnd", {
      time: formatCountdown(times.fajr.getTime() - nowMs, t),
    });
  } else if (nowMs < times.maghrib.getTime()) {
    countdown = t("times.nextIftar", {
      time: formatCountdown(times.maghrib.getTime() - nowMs, t),
    });
  } else {
    countdown = t("times.nextSuhoorTomorrow", {
      time: formatCountdown(times.tomorrowFajr.getTime() - nowMs, t),
    });
  }

  return (
    <RamadanCard title={t("times.title")} icon="clock-outline">
      <View style={styles.row}>
        <TimeColumn
          label={t("times.suhoorEnd")}
          value={formatClock(times.fajr, language)}
          color={colors.text}
          secondary={colors.textSecondary}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <TimeColumn
          label={t("times.iftar")}
          value={formatClock(times.maghrib, language)}
          color={colors.text}
          secondary={colors.textSecondary}
        />
      </View>
      <Text style={[styles.countdown, { color: colors.primary }]} accessibilityLiveRegion="polite">
        {countdown}
      </Text>
    </RamadanCard>
  );
}

function TimeColumn({
  label,
  value,
  color,
  secondary,
}: {
  label: string;
  value: string;
  color: string;
  secondary: string;
}) {
  return (
    <View style={styles.column}>
      <Text style={[styles.time, { color }]}>{value}</Text>
      <Text style={[styles.label, { color: secondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  column: {
    flex: 1,
    alignItems: "center",
  },
  divider: {
    width: 1,
    alignSelf: "stretch",
    marginHorizontal: 8,
  },
  time: {
    fontSize: 30,
    fontWeight: "800",
  },
  label: {
    marginTop: 4,
    fontSize: 12,
    textAlign: "center",
  },
  countdown: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
  },
});
