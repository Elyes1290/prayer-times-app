import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

type HistoryDay = {
  date: string;
  complete?: boolean;
  prayers?: number;
};

type ConsistencyHeatmapProps = {
  history: HistoryDay[];
  days?: number;
  colors: {
    cardBG: string;
    text: string;
    textSecondary: string;
    success: string;
    warning: string;
    border: string;
  };
};

function levelFromDay(day: HistoryDay | undefined): 0 | 1 | 2 | 3 {
  if (!day) return 0;
  if (day.complete || (day.prayers ?? 0) >= 5) return 3;
  if ((day.prayers ?? 0) >= 3) return 2;
  if ((day.prayers ?? 0) > 0) return 1;
  return 0;
}

export function ConsistencyHeatmap({
  history,
  days = 28,
  colors,
}: ConsistencyHeatmapProps) {
  const { t } = useTranslation();

  const cells = useMemo(() => {
    const map = new Map(history.map((d) => [d.date, d]));
    const result: { date: string; level: 0 | 1 | 2 | 3 }[] = [];
    const cursor = new Date();

    for (let i = 0; i < days; i++) {
      const date = cursor.toISOString().slice(0, 10);
      result.unshift({
        date,
        level: levelFromDay(map.get(date)),
      });
      cursor.setDate(cursor.getDate() - 1);
    }

    return result;
  }, [history, days]);

  const levelColor = (level: 0 | 1 | 2 | 3) => {
    if (level === 3) return colors.success;
    if (level === 2) return colors.warning;
    if (level === 1) return colors.warning + "55";
    return colors.border;
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBG }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        {t("stats.heatmap_title")}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t("stats.heatmap_subtitle", { days })}
      </Text>
      <View style={styles.grid}>
        {cells.map((cell) => (
          <View
            key={cell.date}
            style={[
              styles.cell,
              { backgroundColor: levelColor(cell.level) },
            ]}
          />
        ))}
      </View>
      <View style={styles.legend}>
        <LegendDot color={colors.border} label={t("no_activity")} textColor={colors.textSecondary} />
        <LegendDot color={colors.warning + "55"} label={t("partially_completed")} textColor={colors.textSecondary} />
        <LegendDot color={colors.success} label={t("complete_day")} textColor={colors.textSecondary} />
      </View>
    </View>
  );
}

function LegendDot({
  color,
  label,
  textColor,
}: {
  color: string;
  label: string;
  textColor: string;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  cell: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
  },
});
