import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { IonIcon } from "@/components/icons/AppVectorIcons";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "@/components/ui/LinearGradientView";

type StreakHeroCardProps = {
  currentStreak: number;
  maxStreak: number;
  successRate: number;
  colors: {
    cardBG: string;
    text: string;
    textSecondary: string;
    primary: string;
    error: string;
    accent: string;
  };
};

export function StreakHeroCard({
  currentStreak,
  maxStreak,
  successRate,
  colors,
}: StreakHeroCardProps) {
  const { t } = useTranslation();

  return (
    <LinearGradient
      colors={[colors.primary + "30", colors.accent + "18"]}
      style={styles.card}
    >
      <View style={styles.main}>
        <IonIcon name="flame" size={36} color={colors.error} />
        <View>
          <Text style={[styles.streakValue, { color: colors.text }]}>
            {currentStreak}
          </Text>
          <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>
            {t("current_streak")}
          </Text>
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {maxStreak}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {t("record")}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {successRate}%
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {t("success_rate")}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    gap: 16,
  },
  main: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  streakValue: {
    fontSize: 40,
    fontWeight: "800",
    lineHeight: 44,
  },
  streakLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    gap: 24,
  },
  stat: {
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
  },
});
