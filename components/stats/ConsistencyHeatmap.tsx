import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { toDateISO } from "../../constants/prayerTracking";

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
    primary: string;
    success: string;
    warning: string;
    border: string;
  };
};

function prayerCount(day: HistoryDay | undefined): number {
  if (!day) return 0;
  return Number(day.prayers ?? 0);
}

function isCompleteDay(day: HistoryDay | undefined): boolean {
  if (!day) return false;
  const complete = day.complete;
  return complete === true || complete === 1 || complete === "1";
}

function levelFromDay(day: HistoryDay | undefined): 0 | 1 | 2 | 3 {
  const count = prayerCount(day);
  if (isCompleteDay(day) || count >= 5) return 3;
  if (count >= 3) return 2;
  if (count > 0) return 1;
  return 0;
}

type HeatmapPalette = {
  emptyFill: string;
  emptyBorder: string;
  partialFill: string;
  partialBorder: string;
  goodFill: string;
  goodBorder: string;
  completeFill: string;
};

function buildPalette(colors: ConsistencyHeatmapProps["colors"]): HeatmapPalette {
  // Partiel = contour coloré + fond léger ; bien avancé = plein ambre (distinct même si primary === warning)
  const partialBorder = colors.primary;
  const goodFill = colors.warning === colors.primary ? "#F59E0B" : colors.warning;

  return {
    emptyFill: colors.textSecondary + "14",
    emptyBorder: colors.textSecondary + "55",
    partialFill: partialBorder + "28",
    partialBorder,
    goodFill,
    goodBorder: goodFill,
    completeFill: colors.success,
  };
}

export function ConsistencyHeatmap({
  history,
  days = 28,
  colors,
}: ConsistencyHeatmapProps) {
  const { t } = useTranslation();
  const palette = useMemo(() => buildPalette(colors), [colors]);

  const cells = useMemo(() => {
    const map = new Map(history.map((d) => [d.date, d]));
    const result: { date: string; level: 0 | 1 | 2 | 3 }[] = [];
    const cursor = new Date();

    for (let i = 0; i < days; i++) {
      const date = toDateISO(cursor);
      result.unshift({
        date,
        level: levelFromDay(map.get(date)),
      });
      cursor.setDate(cursor.getDate() - 1);
    }

    return result;
  }, [history, days]);

  const levelStyle = (level: 0 | 1 | 2 | 3) => {
    if (level === 3) {
      return { backgroundColor: palette.completeFill, borderColor: palette.completeFill };
    }
    if (level === 2) {
      return {
        backgroundColor: palette.goodFill,
        borderColor: palette.goodBorder,
        borderWidth: 1,
      };
    }
    if (level === 1) {
      return {
        backgroundColor: palette.partialFill,
        borderColor: palette.partialBorder,
        borderWidth: 2,
      };
    }
    return {
      backgroundColor: palette.emptyFill,
      borderColor: palette.emptyBorder,
    };
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
            style={[styles.cell, levelStyle(cell.level)]}
          />
        ))}
      </View>
      <View style={styles.legend}>
        <LegendDot
          fill={palette.emptyFill}
          border={palette.emptyBorder}
          label={t("no_activity")}
          textColor={colors.textSecondary}
        />
        <LegendDot
          fill={palette.partialFill}
          border={palette.partialBorder}
          borderWidth={2}
          label={t("partially_completed")}
          textColor={colors.textSecondary}
        />
        <LegendDot
          fill={palette.goodFill}
          border={palette.goodBorder}
          label={t("stats.heatmap_almost")}
          textColor={colors.textSecondary}
        />
        <LegendDot
          fill={palette.completeFill}
          border={palette.completeFill}
          label={t("complete_day")}
          textColor={colors.textSecondary}
        />
      </View>
    </View>
  );
}

function LegendDot({
  fill,
  border,
  borderWidth = 1,
  label,
  textColor,
}: {
  fill: string;
  border: string;
  borderWidth?: number;
  label: string;
  textColor: string;
}) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendDot,
          { backgroundColor: fill, borderColor: border, borderWidth },
        ]}
      />
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
    borderWidth: 1,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
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
