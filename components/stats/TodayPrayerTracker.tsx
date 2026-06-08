import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { useTranslation } from "react-i18next";
import { PRAYER_TRACKING_ICONS } from "../../constants/prayerTracking";
import type { TrackedPrayer } from "../../constants/prayerTracking";
import { ProgressRing } from "./ProgressRing";

export type PrayerRow = {
  prayer: TrackedPrayer;
  completed: boolean;
  time: string;
  isNext: boolean;
  isLoading: boolean;
};

type TodayPrayerTrackerProps = {
  dateLabel: string;
  prayerRows: PrayerRow[];
  completedCount: number;
  progressPercent: number;
  nextPrayer: TrackedPrayer | null;
  onToggle: (prayer: TrackedPrayer) => void;
  colors: {
    cardBG: string;
    text: string;
    textSecondary: string;
    primary: string;
    success: string;
    warning: string;
    border: string;
  };
};

export function TodayPrayerTracker({
  dateLabel,
  prayerRows,
  completedCount,
  progressPercent,
  nextPrayer,
  onToggle,
  colors,
}: TodayPrayerTrackerProps) {
  const { t } = useTranslation();

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBG }]}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("stats.today_title")}
          </Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {dateLabel}
          </Text>
        </View>
        <ProgressRing
          completed={completedCount}
          trackColor={colors.border}
          fillColor={colors.success}
          textColor={colors.text}
          subtextColor={colors.textSecondary}
        />
      </View>

      {nextPrayer && completedCount < 5 && (
        <View
          style={[
            styles.hint,
            { backgroundColor: colors.primary + "15", borderColor: colors.primary },
          ]}
        >
          <MCIcon name="lightbulb-on-outline" size={18} color={colors.primary} />
          <Text style={[styles.hintText, { color: colors.text }]}>
            {t("stats.next_prayer_hint", { prayer: t(nextPrayer) })}
          </Text>
        </View>
      )}

      <View style={styles.list}>
        {prayerRows.map((row) => {
          const icon = PRAYER_TRACKING_ICONS[row.prayer];
          return (
            <Pressable
              key={row.prayer}
              onPress={() => onToggle(row.prayer)}
              disabled={row.isLoading}
              style={[
                styles.row,
                {
                  backgroundColor: row.completed
                    ? colors.success + "12"
                    : row.isNext
                      ? colors.warning + "10"
                      : "transparent",
                  borderColor: row.completed
                    ? colors.success
                    : row.isNext
                      ? colors.warning
                      : colors.border,
                },
              ]}
            >
              <View style={styles.rowLeft}>
                <View
                  style={[
                    styles.checkCircle,
                    {
                      backgroundColor: row.completed
                        ? colors.success
                        : "transparent",
                      borderColor: row.completed
                        ? colors.success
                        : colors.textSecondary,
                    },
                  ]}
                >
                  {row.isLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : row.completed ? (
                    <MCIcon name="check" size={16} color="#fff" />
                  ) : null}
                </View>
                <MCIcon
                  name={icon.name as any}
                  size={22}
                  color={icon.color}
                />
                <View>
                  <Text style={[styles.prayerName, { color: colors.text }]}>
                    {t(row.prayer)}
                  </Text>
                  <Text
                    style={[styles.prayerTime, { color: colors.textSecondary }]}
                  >
                    {row.time}
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.actionLabel,
                  { color: row.completed ? colors.success : colors.primary },
                ]}
              >
                {row.completed
                  ? t("stats.unmark_prayed")
                  : t("stats.mark_prayed")}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.footerNote, { color: colors.textSecondary }]}>
        {t("stats.progress_footer", { percent: progressPercent })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 4,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  date: {
    fontSize: 14,
    textTransform: "capitalize",
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  prayerName: {
    fontSize: 16,
    fontWeight: "600",
  },
  prayerTime: {
    fontSize: 13,
    marginTop: 2,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "600",
    maxWidth: 90,
    textAlign: "right",
  },
  footerNote: {
    fontSize: 12,
    textAlign: "center",
  },
});
