import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { IonIcon } from "@/components/icons/AppVectorIcons";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "@/components/ui/LinearGradientView";
import { StreakHeroCard } from "./StreakHeroCard";
import { ConsistencyHeatmap } from "./ConsistencyHeatmap";
import { OtherSpiritualActions } from "./OtherSpiritualActions";
import { useUpdateUserStats } from "../../hooks/useUpdateUserStats";

type JourneyTabContentProps = {
  stats: any;
  colors: any;
  onRefresh: () => Promise<void>;
};

export function JourneyTabContent({
  stats,
  colors,
  onRefresh,
}: JourneyTabContentProps) {
  const { t } = useTranslation();
  const { resetAllStats } = useUpdateUserStats();
  const [resetting, setResetting] = React.useState(false);

  const handleReset = () => {
    Alert.alert(
      t("confirmation_required"),
      t("reset_confirmation_message"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("confirm_reset"),
          style: "destructive",
          onPress: async () => {
            setResetting(true);
            try {
              const res = await resetAllStats();
              if (res?.success) {
                await onRefresh();
              }
            } finally {
              setResetting(false);
            }
          },
        },
      ],
    );
  };

  const relevantBadges = (stats.badges || []).filter(
    (badge: any) => badge.unlocked,
  );

  return (
    <View style={styles.container}>
      <StreakHeroCard
        currentStreak={stats.streaks?.current_streak ?? 0}
        maxStreak={stats.streaks?.max_streak ?? 0}
        successRate={stats.stats?.success_rate ?? 0}
        colors={colors}
      />

      <ConsistencyHeatmap history={stats.history || []} colors={colors} />

      <View style={[styles.card, { backgroundColor: colors.cardBG }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t("level_and_progression")}
        </Text>
        <LinearGradient
          colors={[colors.primary + "40", colors.accent + "20"]}
          style={styles.levelBox}
        >
          <Text style={[styles.levelTitle, { color: colors.text }]}>
            {t("level_number", { level: stats.level?.level ?? 1 })}
          </Text>
          <Text style={[styles.levelSubtitle, { color: colors.textSecondary }]}>
            {stats.level?.title}
          </Text>
          <Text style={[styles.points, { color: colors.text }]}>
            {stats.points ?? 0} {t("spiritual_points")}
          </Text>
        </LinearGradient>
      </View>

      {(stats.advice?.advice || []).length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.cardBG }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("personalized_tips")}
          </Text>
          {(stats.advice.advice as any[]).slice(0, 3).map((item, index) => (
            <Text
              key={index}
              style={[styles.advice, { color: colors.textSecondary }]}
            >
              • {t(item.key, item.params)}
            </Text>
          ))}
        </View>
      )}

      <View style={[styles.card, { backgroundColor: colors.cardBG }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t("badges_collection")}
        </Text>
        {relevantBadges.length === 0 ? (
          <Text style={{ color: colors.textSecondary }}>
            {t("new_badges_coming_soon")}
          </Text>
        ) : (
          <View style={styles.badgesGrid}>
            {relevantBadges.slice(0, 6).map((badge: any) => (
              <View
                key={badge.id || badge.name}
                style={[
                  styles.badge,
                  {
                    borderColor: badge.unlocked
                      ? colors.success
                      : colors.border,
                  },
                ]}
              >
                <IonIcon
                  name={(badge.icon as any) || "ribbon"}
                  size={20}
                  color={badge.unlocked ? colors.success : colors.textSecondary}
                />
                <Text
                  style={[styles.badgeName, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {t(badge.name)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <OtherSpiritualActions onUpdated={onRefresh} colors={colors} />

      <Pressable
        style={[styles.resetButton, { borderColor: colors.error }]}
        onPress={handleReset}
        disabled={resetting}
      >
        {resetting ? (
          <ActivityIndicator color={colors.error} />
        ) : (
          <>
            <IonIcon name="trash-outline" size={18} color={colors.error} />
            <Text style={[styles.resetText, { color: colors.error }]}>
              {t("reset_all_stats")}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  card: {
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  levelBox: {
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  levelTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  levelSubtitle: {
    fontSize: 14,
  },
  points: {
    marginTop: 6,
    fontWeight: "600",
  },
  advice: {
    fontSize: 14,
    lineHeight: 20,
  },
  badgesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  badge: {
    width: "47%",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  badgeName: {
    fontSize: 12,
    fontWeight: "600",
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  resetText: {
    fontWeight: "600",
  },
});
