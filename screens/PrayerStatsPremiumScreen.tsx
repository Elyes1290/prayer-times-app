import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IonIcon } from "@/components/icons/AppVectorIcons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import ThemedImageBackground from "../components/ThemedImageBackground";
import { useThemeColors } from "../hooks/useThemeAssets";
import {
  useCurrentTheme,
  useOverlayTextColor,
} from "../hooks/useThemeColor";
import { useUserStats } from "../hooks/useUserStats";
import { useTodayPrayers } from "../hooks/useTodayPrayers";
import {
  enrichHistoryWithPrayerStates,
  computeStreakMetricsFromHistory,
} from "../utils/prayerTrackingStorage";
import { TodayPrayerTracker } from "../components/stats/TodayPrayerTracker";
import { StreakHeroCard } from "../components/stats/StreakHeroCard";
import { DayCompleteModal } from "../components/stats/DayCompleteModal";
import { JourneyTabContent } from "../components/stats/JourneyTabContent";
import { OtherSpiritualActions } from "../components/stats/OtherSpiritualActions";

type TabType = "today" | "journey";

const DEFAULT_STATS = {
  user_id: 0,
  is_premium: true,
  profile: { level: 1, experience: 0, title: "beginner" },
  level: { level: 1, progress: 0, title: "beginner" },
  stats: {
    total_days: 0,
    complete_days: 0,
    success_rate: 0,
    success_rate_all_time: 0,
    total_prayers: 0,
    total_prayers_all_time: 0,
    avg_prayers_per_day: 0,
    total_dhikr: 0,
    total_quran_verses: 0,
    total_hadiths: 0,
    total_favorites: 0,
    total_downloads: 0,
    total_usage_minutes: 0,
    current_streak: 0,
    best_streak: 0,
  },
  streaks: {
    current_streak: 0,
    max_streak: 0,
    total_streaks: 0,
    short_streaks: 0,
  },
  points: 0,
  history: [],
  advice: { advice: [], action_plan: [] },
  challenges: [],
  badges: [],
  today_prayers: {
    fajr: false,
    dhuhr: false,
    asr: false,
    maghrib: false,
    isha: false,
  },
  yesterday_prayers: {
    fajr: false,
    dhuhr: false,
    asr: false,
    maghrib: false,
    isha: false,
  },
  smart_notification: { key: "start_spiritual_journey", params: {} },
};

function TabButton({
  title,
  icon,
  active,
  onPress,
  colors,
}: {
  title: string;
  icon: "calendar" | "analytics";
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tabButton,
        {
          backgroundColor: active ? colors.primary + "18" : "transparent",
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
    >
      <IonIcon
        name={icon}
        size={18}
        color={active ? colors.primary : colors.textSecondary}
      />
      <Text
        style={[
          styles.tabLabel,
          { color: active ? colors.primary : colors.textSecondary },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const PrayerStatsPremiumScreen: React.FC = () => {
  const { push } = useRouter();
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();
  const overlayTextColor = useOverlayTextColor();
  const currentTheme = useCurrentTheme();
  const isDark = currentTheme === "dark";
  const insets = useSafeAreaInsets();
  const bottomContentPadding = Math.max(100, insets.bottom + 88);

  const [activeTab, setActiveTab] = useState<TabType>("today");
  const [refreshing, setRefreshing] = useState(false);

  const {
    stats,
    loading,
    error,
    premiumRequired,
    refresh,
    lastUpdated,
    isOffline,
    pendingActionsCount,
  } = useUserStats();

  const statsToUse = stats || DEFAULT_STATS;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const {
    prayerRows,
    completedCount,
    progressPercent,
    nextPrayer,
    showDayComplete,
    dismissDayComplete,
    handleToggle,
    trackingDate,
    isTrackingToday,
    canGoToPreviousDay,
    canGoToNextDay,
    goToPreviousDay,
    goToNextDay,
    liveTodayPrayers,
    liveYesterdayPrayers,
  } = useTodayPrayers({
    remoteTodayPrayers: statsToUse.today_prayers,
    remoteYesterdayPrayers: statsToUse.yesterday_prayers,
    onUpdated: refresh,
  });

  const journeyStats = useMemo(() => {
    const base = stats || DEFAULT_STATS;
    const history = enrichHistoryWithPrayerStates(
      base.history || [],
      base.today_prayers,
      base.yesterday_prayers,
      liveTodayPrayers,
      liveYesterdayPrayers,
    );
    const streakMetrics = computeStreakMetricsFromHistory(history);
    const apiMaxStreak = Math.max(
      base.streaks?.max_streak ?? 0,
      base.stats?.best_streak ?? 0,
    );

    return {
      ...base,
      history,
      streaks: {
        ...base.streaks,
        current_streak: streakMetrics.currentStreak,
        max_streak: Math.max(streakMetrics.maxStreak, apiMaxStreak),
      },
      stats: {
        ...base.stats,
        success_rate: streakMetrics.successRate,
        current_streak: streakMetrics.currentStreak,
        best_streak: Math.max(streakMetrics.maxStreak, apiMaxStreak),
      },
    };
  }, [stats, liveTodayPrayers, liveYesterdayPrayers]);

  const dateLabel = trackingDate.toLocaleDateString(i18n.language, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  if (loading && !stats) {
    return (
      <ThemedImageBackground style={styles.container}>
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          translucent
          backgroundColor="transparent"
        />
        <View
          style={[
            styles.centered,
            {
              backgroundColor: colors.background,
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            },
          ]}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {t("analyzing_spiritual_performance")}
          </Text>
        </View>
      </ThemedImageBackground>
    );
  }

  if (premiumRequired) {
    return (
      <ThemedImageBackground style={styles.container}>
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          translucent
          backgroundColor="transparent"
        />
        <View
          style={[
            styles.centered,
            {
              backgroundColor: colors.background,
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            },
          ]}
        >
          <IonIcon name="star" size={64} color={colors.accent} />
          <Text style={[styles.premiumTitle, { color: colors.text }]}>
            {t("premium_stats")}
          </Text>
          <Text style={[styles.premiumSubtitle, { color: colors.textSecondary }]}>
            {isOffline ? t("offline_mode_stats") : t("unlock_full_progress_analysis")}
          </Text>
          <Pressable
            style={[styles.premiumButton, { backgroundColor: colors.accent }]}
            onPress={() => push("/settings?openPremium=true&premiumTab=signup")}
          >
            <Text style={styles.premiumButtonText}>{t("become_premium")}</Text>
          </Pressable>
        </View>
      </ThemedImageBackground>
    );
  }

  if (error && !stats) {
    return (
      <ThemedImageBackground style={styles.container}>
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          translucent
          backgroundColor="transparent"
        />
        <View
          style={[
            styles.centered,
            {
              backgroundColor: colors.background,
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            },
          ]}
        >
          <IonIcon name="alert-circle" size={48} color={colors.error} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            {t("connection_interrupted")}
          </Text>
          <Text style={{ color: colors.textSecondary }}>{error}</Text>
          <Pressable
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={refresh}
          >
            <Text style={styles.retryText}>{t("retry")}</Text>
          </Pressable>
        </View>
      </ThemedImageBackground>
    );
  }

  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        translucent
        backgroundColor="transparent"
      />
      <ThemedImageBackground style={styles.container}>
        <View
          style={[
            styles.overlay,
            {
              backgroundColor: isDark
                ? "rgba(18, 18, 18, 0.55)"
                : "rgba(248, 249, 250, 0.55)",
              paddingTop: insets.top,
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: overlayTextColor }]}>
              {t("stats.screen_title")}
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                { color: overlayTextColor, opacity: 0.75 },
              ]}
            >
              {t("stats.spiritual_progress_detail")}
            </Text>
          </View>

          {isOffline && (
            <View
              style={[
                styles.offlineBanner,
                {
                  backgroundColor: colors.warning + "20",
                  borderColor: colors.warning,
                },
              ]}
            >
              <IonIcon name="cloud-offline" size={18} color={colors.warning} />
              <Text style={[styles.offlineText, { color: colors.warning }]}>
                {pendingActionsCount > 0
                  ? t("pending_sync_actions", { count: pendingActionsCount })
                  : t("offline_stats_cached")}
              </Text>
            </View>
          )}

          <View style={styles.tabBar}>
            <TabButton
              title={t("stats.tab_today")}
              icon="calendar"
              active={activeTab === "today"}
              onPress={() => setActiveTab("today")}
              colors={colors}
            />
            <TabButton
              title={t("stats.tab_journey")}
              icon="analytics"
              active={activeTab === "journey"}
              onPress={() => setActiveTab("journey")}
              colors={colors}
            />
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: bottomContentPadding },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}
          >
            {activeTab === "today" ? (
              <View style={styles.section}>
                <StreakHeroCard
                  currentStreak={journeyStats.streaks?.current_streak ?? 0}
                  maxStreak={journeyStats.streaks?.max_streak ?? 0}
                  successRate={journeyStats.stats?.success_rate ?? 0}
                  colors={colors}
                />
                <TodayPrayerTracker
                  dateLabel={dateLabel}
                  prayerRows={prayerRows}
                  completedCount={completedCount}
                  progressPercent={progressPercent}
                  nextPrayer={nextPrayer}
                  onToggle={handleToggle}
                  isTrackingToday={isTrackingToday}
                  canGoToPreviousDay={canGoToPreviousDay}
                  canGoToNextDay={canGoToNextDay}
                  onPreviousDay={goToPreviousDay}
                  onNextDay={goToNextDay}
                  colors={colors}
                />
                {statsToUse.smart_notification?.key && (
                  <View
                    style={[
                      styles.tipCard,
                      { backgroundColor: colors.cardBG },
                    ]}
                  >
                    <IonIcon name="bulb" size={20} color={colors.primary} />
                    <Text style={[styles.tipText, { color: colors.text }]}>
                      {t(
                        statsToUse.smart_notification.key,
                        statsToUse.smart_notification.params,
                      )}
                    </Text>
                  </View>
                )}
                <OtherSpiritualActions onUpdated={onRefresh} colors={colors} />
              </View>
            ) : (
              <JourneyTabContent
                stats={journeyStats}
                colors={colors}
                onRefresh={onRefresh}
              />
            )}

            {lastUpdated && (
              <Text style={[styles.footer, { color: colors.textSecondary }]}>
                {t("last_updated")}: {lastUpdated.toLocaleTimeString()}
              </Text>
            )}
          </ScrollView>
        </View>
      </ThemedImageBackground>

      <DayCompleteModal
        visible={showDayComplete}
        onClose={dismissDayComplete}
        colors={colors}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  loadingText: { fontSize: 16, textAlign: "center" },
  premiumTitle: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  premiumSubtitle: { fontSize: 15, textAlign: "center" },
  premiumButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  premiumButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  errorTitle: { fontSize: 20, fontWeight: "700" },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: { color: "#fff", fontWeight: "600" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    gap: 6,
    marginBottom: 4,
  },
  headerTitle: { fontSize: 24, fontWeight: "800" },
  headerSubtitle: { fontSize: 14 },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  offlineText: { flex: 1, fontSize: 12, fontWeight: "500" },
  tabBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  tabLabel: { fontWeight: "600", fontSize: 14 },
  content: {
    paddingHorizontal: 16,
    gap: 16,
  },
  section: { gap: 16 },
  tipCard: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    borderRadius: 16,
    alignItems: "flex-start",
  },
  tipText: { flex: 1, fontSize: 14, lineHeight: 20 },
  footer: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 8,
  },
});

export default PrayerStatsPremiumScreen;
