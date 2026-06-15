import React, { useEffect, useMemo, useState } from "react";
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
import {
  Badge,
  mapStatsToBadgeUserStats,
  useBadgesSystem,
} from "../../utils/badgesSystem";
import { getCurrentUserId } from "../../utils/userAuth";
import { countLocalFajrPrayers } from "../../utils/prayerTrackingStorage";

const SPIRITUAL_LEVEL_TITLE_KEYS = [
  "level_novice",
  "level_apprentice",
  "level_practitioner",
  "level_master",
  "level_sage",
] as const;

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
  const { t, i18n } = useTranslation();
  const { system, getLocalizedBadgeText } = useBadgesSystem();
  const { resetAllStats } = useUpdateUserStats();
  const [resetting, setResetting] = React.useState(false);
  const [localFajrCount, setLocalFajrCount] = useState(0);
  const lang = i18n.language?.split("-")[0] || "fr";

  useEffect(() => {
    let cancelled = false;
    const loadFajrCount = async () => {
      const userId = await getCurrentUserId();
      if (!userId || cancelled) return;
      const count = await countLocalFajrPrayers(userId);
      if (!cancelled) setLocalFajrCount(count);
    };
    void loadFajrCount();
    return () => {
      cancelled = true;
    };
  }, [stats]);

  const badgeUserStats = useMemo(
    () => mapStatsToBadgeUserStats(stats, localFajrCount),
    [stats, localFajrCount],
  );

  const unlockedBadges = useMemo(() => {
    const localUnlocked = system.getUnlockedBadges(badgeUserStats);
    const localCodes = new Set(localUnlocked.map((b) => b.code));

    const serverUnlocked = (stats.badges || []).filter(
      (badge: { unlocked?: boolean; id?: string }) => badge.unlocked,
    );

    for (const serverBadge of serverUnlocked) {
      const code = serverBadge.id || serverBadge.name;
      if (!code || localCodes.has(code)) continue;
      const definition = system.getBadgeByCode(code);
      if (definition) {
        localUnlocked.push(definition);
        localCodes.add(code);
      }
    }

    return localUnlocked;
  }, [badgeUserStats, stats, system]);

  const nextBadgeTargets = useMemo(() => {
    const unlockedCodes = new Set(unlockedBadges.map((b) => b.code));
    return system.getNextBadgeTargets(badgeUserStats, unlockedCodes, 4);
  }, [badgeUserStats, unlockedBadges, system]);

  const totalVisibleBadges = useMemo(
    () => system.getAllBadges().filter((b) => !b.is_hidden).length,
    [system],
  );

  const getBadgeLabel = (badge: Badge) =>
    t(`badge_${badge.code}`, {
      defaultValue: getLocalizedBadgeText(badge, "name", lang),
    });

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
            {t(
              SPIRITUAL_LEVEL_TITLE_KEYS[
                Math.min(Math.max(stats.level?.level ?? 1, 1), 5) - 1
              ],
            )}
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
              key={item.key ? `advice-${item.key}` : `advice-fallback-${index}`}
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
        <Text style={[styles.badgeSummary, { color: colors.textSecondary }]}>
          {t("badges_unlocked_count", {
            unlocked: unlockedBadges.length,
            total: totalVisibleBadges,
            defaultValue: `${unlockedBadges.length} / ${totalVisibleBadges} débloqués`,
          })}
        </Text>
        {unlockedBadges.length === 0 ? (
          <Text style={{ color: colors.textSecondary }}>
            {t("new_badges_coming_soon")}
          </Text>
        ) : (
          <View style={styles.badgesGrid}>
            {unlockedBadges.map((badge) => (
              <View
                key={badge.code}
                style={[
                  styles.badge,
                  { borderColor: colors.success },
                ]}
              >
                <IonIcon
                  name={(badge.icon as any) || "ribbon"}
                  size={20}
                  color={colors.success}
                />
                <Text
                  style={[styles.badgeName, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {getBadgeLabel(badge)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {nextBadgeTargets.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.cardBG }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("badges_next_goals", { defaultValue: "Prochains objectifs" })}
          </Text>
          <View style={styles.progressList}>
            {nextBadgeTargets.map(({ badge, current, target, percent }) => (
            <View key={badge.code} style={styles.progressItem}>
              <View style={styles.progressHeader}>
                <IonIcon
                  name={(badge.icon as any) || "ribbon"}
                  size={18}
                  color={system.getBadgeColor(badge)}
                />
                <Text
                  style={[styles.progressTitle, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {getBadgeLabel(badge)}
                </Text>
                <Text style={[styles.progressRatio, { color: colors.textSecondary }]}>
                  {t("badge_progress_ratio", {
                    current,
                    target,
                    defaultValue: `${current} / ${target}`,
                  })}
                </Text>
              </View>
              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: colors.border + "60" },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${percent}%`,
                      backgroundColor: system.getBadgeColor(badge),
                    },
                  ]}
                />
              </View>
            </View>
          ))}
          </View>
        </View>
      )}

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
  badgeSummary: {
    fontSize: 13,
    fontWeight: "500",
  },
  progressList: {
    gap: 14,
  },
  progressItem: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  progressRatio: {
    fontSize: 13,
    fontWeight: "600",
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
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
