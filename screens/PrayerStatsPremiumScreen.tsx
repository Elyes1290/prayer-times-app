import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ToastAndroid,
  Platform,
  StatusBar,
  Share,
  Modal,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useUserStats } from "../hooks/useUserStats";
import { useUpdateUserStats } from "../hooks/useUpdateUserStats";
import ThemedImageBackground from "../components/ThemedImageBackground";
import { useThemeColors, useCurrentTheme } from "../hooks/useThemeAssets";
import { useTranslation } from "react-i18next";

const { width } = Dimensions.get("window");

type TabType = "overview" | "progress" | "achievements" | "actions";

interface TabButtonProps {
  tab: TabType;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  isActive: boolean;
  onPress: () => void;
}

const PrayerStatsPremiumScreen: React.FC = () => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const currentTheme = useCurrentTheme();
  const isDark = currentTheme === "dark";

  // États
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [refreshing, setRefreshing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [weeklyGoal] = useState(35); // 5 prières * 7 jours

  const { stats, loading, error, premiumRequired, refresh, lastUpdated } =
    useUserStats();

  const {
    recordPrayer,
    recordDhikr,
    recordQuranRead,
    recordHadithRead,
    resetAllStats,
  } = useUpdateUserStats();

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const showToast = (msg: string) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      console.log(msg); // Pour iOS
    }
  };

  // 🎯 Nouvelles fonctionnalités utilitaires
  const generateInsights = () => {
    if (!stats) return [];

    const insights = [];

    // Analyse de consistance
    if (stats.stats.success_rate >= 80) {
      insights.push({
        type: "success",
        icon: "trending-up",
        title: t("excellent_consistency") || "Excellente consistance !",
        description:
          t("success_rate_remarkable", { rate: stats.stats.success_rate }) ||
          `Votre taux de réussite de ${stats.stats.success_rate}% est remarquable.`,
        color: colors.success,
      });
    } else if (stats.stats.success_rate < 30) {
      insights.push({
        type: "improvement",
        icon: "bulb",
        title: t("improvement_opportunity") || "Opportunité d'amélioration",
        description:
          t("start_with_one_prayer") ||
          "Commencez par 1 prière par jour pour créer l'habitude.",
        color: colors.warning,
      });
    }

    // Analyse des séries
    if (stats.streaks.current_streak >= 3) {
      insights.push({
        type: "streak",
        icon: "flame",
        title:
          t("streak_days", { days: stats.streaks.current_streak }) ||
          `Série de ${stats.streaks.current_streak} jours !`,
        description:
          t("spiritual_shape_continue") ||
          "Vous êtes en pleine forme spirituelle. Continuez !",
        color: colors.error,
      });
    }

    // Analyse du niveau
    if (stats.level.progress > 0.8) {
      insights.push({
        type: "level",
        icon: "trophy",
        title: t("almost_next_level") || "Presque au niveau suivant !",
        description:
          t("percentage_to_next_level", {
            percentage: Math.round((1 - stats.level.progress) * 100),
            nextLevel: stats.level.level + 1,
          }) ||
          `Plus que ${Math.round(
            (1 - stats.level.progress) * 100
          )}% pour atteindre le niveau ${stats.level.level + 1}.`,
        color: colors.accent,
      });
    }

    // Analyse des activités
    if (stats.stats.total_dhikr > stats.stats.total_prayers) {
      insights.push({
        type: "balance",
        icon: "heart",
        title: t("spiritual_balance") || "Équilibre spirituel",
        description:
          t("dhikr_complements_prayers") ||
          "Votre pratique du dhikr complète parfaitement vos prières.",
        color: colors.primary,
      });
    }

    return insights;
  };

  const getWeekProgress = () => {
    if (!stats) return 0;
    // Calcul basé sur les prières de la semaine courante
    const weeklyPrayers = stats.stats.total_prayers;
    return Math.min((weeklyPrayers / weeklyGoal) * 100, 100);
  };

  const shareAchievement = async () => {
    if (!stats) return;

    try {
      const message =
        `🌟 ${t("my_spiritual_progress") || "Mes progrès spirituels"} 🌟\n\n` +
        `📊 ${stats.stats.total_prayers} ${
          t("prayers_completed") || "prières accomplies"
        }\n` +
        `🔥 ${
          t("streak_of_days", { days: stats.streaks.current_streak }) ||
          `Série de ${stats.streaks.current_streak} jours`
        }\n` +
        `🏆 ${
          t("level_title", {
            level: stats.level.level,
            title: stats.level.title,
          }) || `Niveau ${stats.level.level} - ${stats.level.title}`
        }\n` +
        `💰 ${stats.points} ${
          t("spiritual_points") || "points spirituels"
        }\n\n` +
        `#PrayerTimes #SpiritualJourney`;

      await Share.share({
        message,
        title: t("my_spiritual_stats") || "Mes statistiques spirituelles",
      });
    } catch {
      showToast(t("share_error") || "Erreur lors du partage");
    }
  };

  const exportData = () => {
    if (!stats) return;

    Alert.alert(
      t("export_data") || "Exporter les données",
      t("share_complete_stats_question") ||
        "Voulez-vous partager vos statistiques complètes ?",
      [
        { text: t("cancel") || "Annuler", style: "cancel" },
        { text: t("share") || "Partager", onPress: shareAchievement },
      ]
    );
  };

  const getCommunityComparison = () => {
    if (!stats) return null;

    // Simulation de comparaison communautaire (normalement venant de l'API)
    const avgSuccessRate = 45;
    const avgStreakLength = 2;
    const avgLevel = 2;

    return {
      successRate: {
        user: stats.stats.success_rate,
        average: avgSuccessRate,
        position: stats.stats.success_rate > avgSuccessRate ? "above" : "below",
      },
      streak: {
        user: stats.streaks.current_streak,
        average: avgStreakLength,
        position:
          stats.streaks.current_streak > avgStreakLength ? "above" : "below",
      },
      level: {
        user: stats.level.level,
        average: avgLevel,
        position: stats.level.level > avgLevel ? "above" : "below",
      },
    };
  };

  // Fonctions utilitaires
  const getProfileInfo = (profile: string) => {
    const profiles: Record<
      string,
      { icon: string; color: string; title: string; desc: string }
    > = {
      regular: {
        icon: "🔥",
        color: "#4ECDC4",
        title: t("profile_regular") || "Prieur Régulier",
        desc: t("profile_regular_desc") || "Constance exemplaire",
      },
      yoyo: {
        icon: "🔄",
        color: "#FFD700",
        title: t("profile_variable") || "Prieur Variable",
        desc: t("profile_variable_desc") || "En progression",
      },
      beginner: {
        icon: "🌱",
        color: "#66BB6A",
        title: t("profile_beginner") || "Débutant",
        desc: t("profile_beginner_desc") || "Premiers pas spirituels",
      },
      stopped: {
        icon: "⏸️",
        color: "#95A5A6",
        title: t("profile_paused") || "En Pause",
        desc: t("profile_paused_desc") || "Moment de réflexion",
      },
    };
    return (
      profiles[profile] || {
        icon: "👤",
        color: "#9B59B6",
        title: t("profile_user") || "Utilisateur",
        desc: t("profile_user_desc") || "Profil en développement",
      }
    );
  };

  const getLevelColors = (level: number) => {
    const levelColors = [
      {
        primary: "#FF6B6B",
        secondary: "#FFE5E5",
        name: t("level_novice") || "Novice",
      },
      {
        primary: "#4ECDC4",
        secondary: "#E8F8F5",
        name: t("level_apprentice") || "Apprenti",
      },
      {
        primary: "#45B7D1",
        secondary: "#E8F4FD",
        name: t("level_practitioner") || "Pratiquant",
      },
      {
        primary: "#96CEB4",
        secondary: "#F0F9F4",
        name: t("level_master") || "Maître",
      },
      {
        primary: "#FFEAA7",
        secondary: "#FFFBF0",
        name: t("level_sage") || "Sage",
      },
    ];
    return levelColors[Math.min(level - 1, levelColors.length - 1)];
  };

  // Composants de navigation
  const TabButton: React.FC<TabButtonProps> = ({
    tab,
    title,
    icon,
    isActive,
    onPress,
  }) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        {
          backgroundColor: isActive
            ? isDark
              ? "rgba(102, 187, 106, 0.2)"
              : "rgba(46, 139, 87, 0.1)"
            : "transparent",
          borderBottomWidth: isActive ? 2 : 0,
          borderBottomColor: colors.primary,
        },
      ]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={20}
        color={isActive ? colors.primary : colors.textSecondary}
      />
      <Text
        style={[
          styles.tabButtonText,
          {
            color: isActive ? colors.primary : colors.textSecondary,
            fontWeight: isActive ? "600" : "400",
          },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  // États de chargement et d'erreur
  if (loading && !stats) {
    return (
      <ThemedImageBackground style={styles.container}>
        <View style={[styles.overlay, { backgroundColor: colors.background }]}>
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              {t("analyzing_spiritual_performance") ||
                "📊 Analyse de vos performances spirituelles..."}
            </Text>
            <Text
              style={[styles.loadingSubtext, { color: colors.textSecondary }]}
            >
              {t("calculating_detailed_stats") ||
                "Calcul des statistiques détaillées"}
            </Text>
          </View>
        </View>
      </ThemedImageBackground>
    );
  }

  if (premiumRequired) {
    return (
      <ThemedImageBackground style={styles.container}>
        <View style={[styles.overlay, { backgroundColor: colors.background }]}>
          <View style={styles.centerContainer}>
            <View style={styles.premiumIconContainer}>
              <Ionicons name="star" size={64} color={colors.accent} />
            </View>
            <Text style={[styles.premiumTitle, { color: colors.text }]}>
              {t("premium_stats") || "🌟 Statistiques Premium"}
            </Text>
            <Text
              style={[styles.premiumSubtitle, { color: colors.textSecondary }]}
            >
              {t("unlock_full_progress_analysis") ||
                "Débloquez l'analyse complète de votre progression spirituelle"}
            </Text>

            <View style={styles.featuresList}>
              {[
                t("detailed_stats") || "📈 Statistiques détaillées",
                t("progress_tracking") || "🎯 Suivi de progression",
                t("personalized_tips") || "💡 Conseils personnalisés",
                t("badges_and_achievements") || "🏆 Badges et achievements",
                t("complete_history") || "📋 Historique complet",
              ].map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={colors.success}
                  />
                  <Text style={[styles.featureText, { color: colors.text }]}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.premiumButton, { backgroundColor: colors.accent }]}
              onPress={() => console.log("Navigation vers premium")}
            >
              <Text style={styles.premiumButtonText}>
                {t("become_premium") || "✨ Devenir Premium"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ThemedImageBackground>
    );
  }

  if (error && !stats) {
    return (
      <ThemedImageBackground style={styles.container}>
        <View style={[styles.overlay, { backgroundColor: colors.background }]}>
          <View style={styles.centerContainer}>
            <Ionicons name="alert-circle" size={48} color={colors.error} />
            <Text style={[styles.errorTitle, { color: colors.text }]}>
              {t("connection_interrupted") || "Connexion interrompue"}
            </Text>
            <Text
              style={[styles.errorMessage, { color: colors.textSecondary }]}
            >
              {error}
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={refresh}
            >
              <Ionicons name="refresh" size={20} color="white" />
              <Text style={styles.retryButtonText}>
                {t("retry") || "Réessayer"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ThemedImageBackground>
    );
  }

  if (!stats) {
    return (
      <ThemedImageBackground style={styles.container}>
        <View style={[styles.overlay, { backgroundColor: colors.background }]}>
          <View style={styles.centerContainer}>
            <Ionicons
              name="analytics-outline"
              size={64}
              color={colors.primary}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {t("start_spiritual_journey") ||
                "🚀 Commencez votre voyage spirituel"}
            </Text>
            <Text
              style={[styles.emptyMessage, { color: colors.textSecondary }]}
            >
              {t("stats_appear_after_first_prayers") ||
                "Vos statistiques apparaîtront après vos premières prières"}
            </Text>
          </View>
        </View>
      </ThemedImageBackground>
    );
  }

  const profileInfo = getProfileInfo(stats.profile);
  const levelInfo = getLevelColors(stats.level.level);

  // Rendu du contenu par onglet
  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <View style={styles.tabContent}>
            {/* Carte de profil */}
            <View style={[styles.card, { backgroundColor: colors.cardBG }]}>
              <View style={styles.profileHeader}>
                <View
                  style={[
                    styles.profileAvatar,
                    { backgroundColor: profileInfo.color },
                  ]}
                >
                  <Text style={styles.profileAvatarText}>
                    {profileInfo.icon}
                  </Text>
                </View>
                <View style={styles.profileDetails}>
                  <Text style={[styles.profileTitle, { color: colors.text }]}>
                    {profileInfo.title}
                  </Text>
                  <Text
                    style={[
                      styles.profileSubtitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {profileInfo.desc}
                  </Text>
                  <Text
                    style={[
                      styles.smartNotification,
                      { color: colors.primary },
                    ]}
                  >
                    💡{" "}
                    {
                      t(
                        stats.smart_notification.key,
                        stats.smart_notification.params
                      ) as string
                    }
                  </Text>
                </View>
              </View>
            </View>

            {/* Niveau et progression */}
            <View style={[styles.card, { backgroundColor: colors.cardBG }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {t("level_and_progression") || "🎖️ Niveau et Progression"}
              </Text>
              <LinearGradient
                colors={[levelInfo.primary, levelInfo.secondary]}
                style={styles.levelContainer}
              >
                <View style={styles.levelHeader}>
                  <Text style={styles.levelNumber}>
                    {t("level_number", { level: stats.level.level }) ||
                      `Niveau ${stats.level.level}`}
                  </Text>
                  <Text style={styles.levelTitle}>{stats.level.title}</Text>
                </View>
                <View style={styles.progressSection}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${stats.level.progress * 100}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {t("progress_to_next_level", {
                      percentage: Math.round(stats.level.progress * 100),
                    }) ||
                      `${Math.round(
                        stats.level.progress * 100
                      )}% vers le niveau suivant`}
                  </Text>
                </View>
                <Text style={styles.pointsText}>
                  💰 {stats.points}{" "}
                  {t("spiritual_points") || "points spirituels"}
                </Text>
              </LinearGradient>
            </View>

            {/* Statistiques principales */}
            <View style={[styles.card, { backgroundColor: colors.cardBG }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {t("stats_overview") || "📊 Vue d'ensemble"}
              </Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Ionicons name="calendar" size={24} color={colors.primary} />
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {stats.stats.total_days}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.textSecondary }]}
                  >
                    {t("active_days") || "Jours actifs"}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={colors.success}
                  />
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {stats.stats.success_rate}%
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.textSecondary }]}
                  >
                    {t("success_rate") || "Réussite"}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="flame" size={24} color={colors.error} />
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {stats.streaks.current_streak}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.textSecondary }]}
                  >
                    {t("current_streak") || "Série actuelle"}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="trophy" size={24} color={colors.accent} />
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {stats.streaks.max_streak}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.textSecondary }]}
                  >
                    {t("record") || "Record"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Calendrier de consistance - derniers 7 jours */}
            <View style={[styles.card, { backgroundColor: colors.cardBG }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {t("recent_consistency") || "📅 Consistance récente"}
              </Text>
              <Text
                style={[styles.cardSubtitle, { color: colors.textSecondary }]}
              >
                {t("last_7_days_activity") ||
                  "Vos 7 derniers jours d'activité spirituelle"}
              </Text>
              <View style={styles.consistencyCalendar}>
                {stats.history
                  .slice(0, 7)
                  .reverse()
                  .map((day, index) => (
                    <View key={index} style={styles.consistencyDay}>
                      <Text
                        style={[
                          styles.consistencyDayLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {new Date(day.date).toLocaleDateString("fr-FR", {
                          weekday: "short",
                        })}
                      </Text>
                      <View
                        style={[
                          styles.consistencyDayIndicator,
                          {
                            backgroundColor: day.complete
                              ? colors.success
                              : day.prayers > 0
                              ? colors.warning
                              : colors.textSecondary + "30",
                          },
                        ]}
                      >
                        {day.complete ? (
                          <Ionicons name="checkmark" size={16} color="white" />
                        ) : day.prayers > 0 ? (
                          <Text style={styles.consistencyDayCount}>
                            {day.prayers}
                          </Text>
                        ) : (
                          <Ionicons
                            name="close"
                            size={16}
                            color={colors.textSecondary}
                          />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.consistencyDate,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {new Date(day.date).getDate()}
                      </Text>
                    </View>
                  ))}
              </View>
              <View style={styles.consistencyLegend}>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: colors.success },
                    ]}
                  />
                  <Text
                    style={[styles.legendText, { color: colors.textSecondary }]}
                  >
                    {t("complete_day") || "Journée complète"}
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: colors.warning },
                    ]}
                  />
                  <Text
                    style={[styles.legendText, { color: colors.textSecondary }]}
                  >
                    {t("partially_completed") || "Partiellement accomplie"}
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: colors.textSecondary + "30" },
                    ]}
                  />
                  <Text
                    style={[styles.legendText, { color: colors.textSecondary }]}
                  >
                    {t("no_activity") || "Aucune activité"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Actions rapides */}
            <View style={[styles.card, { backgroundColor: colors.cardBG }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {t("quick_actions") || "⚡ Actions rapides"}
              </Text>
              <View style={styles.quickActionsGrid}>
                <TouchableOpacity
                  style={[
                    styles.quickActionButton,
                    { backgroundColor: "rgba(102, 187, 106, 0.1)" },
                  ]}
                  onPress={() => setShowInsightsModal(true)}
                >
                  <Ionicons name="analytics" size={24} color={colors.primary} />
                  <Text
                    style={[styles.quickActionText, { color: colors.text }]}
                  >
                    {t("insights") || "Insights"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.quickActionButton,
                    { backgroundColor: "rgba(255, 215, 0, 0.1)" },
                  ]}
                  onPress={shareAchievement}
                >
                  <Ionicons
                    name="share-social"
                    size={24}
                    color={colors.accent}
                  />
                  <Text
                    style={[styles.quickActionText, { color: colors.text }]}
                  >
                    {t("share") || "Partager"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.quickActionButton,
                    { backgroundColor: "rgba(78, 205, 196, 0.1)" },
                  ]}
                  onPress={() => {
                    Alert.alert(
                      t("smart_reminders") || "Rappels intelligents",
                      t("smart_reminders_coming_soon") ||
                        "Les rappels personnalisés basés sur vos habitudes seront bientôt disponibles !",
                      [{ text: t("ok") || "OK" }]
                    );
                  }}
                >
                  <Ionicons
                    name="notifications"
                    size={24}
                    color={colors.success}
                  />
                  <Text
                    style={[styles.quickActionText, { color: colors.text }]}
                  >
                    {t("reminders") || "Rappels"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.quickActionButton,
                    { backgroundColor: "rgba(255, 107, 107, 0.1)" },
                  ]}
                  onPress={() => setActiveTab("actions")}
                >
                  <Ionicons name="add-circle" size={24} color={colors.error} />
                  <Text
                    style={[styles.quickActionText, { color: colors.text }]}
                  >
                    {t("add") || "Ajouter"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );

      case "progress":
        return (
          <View style={styles.tabContent}>
            {/* Conseils personnalisés */}
            {stats.advice.advice.length > 0 && (
              <View style={[styles.card, { backgroundColor: colors.cardBG }]}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  {t("personalized_advice") || "💡 Conseils personnalisés"}
                </Text>
                {stats.advice.advice.map((advice, index) => (
                  <View key={index} style={styles.adviceItem}>
                    <Ionicons name="bulb" size={18} color={colors.accent} />
                    <Text style={[styles.adviceText, { color: colors.text }]}>
                      {t(advice.key, advice.params) as string}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Plan d'action */}
            {stats.advice.action_plan.length > 0 && (
              <View style={[styles.card, { backgroundColor: colors.cardBG }]}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  {t("recommended_action_plan") ||
                    "🎯 Plan d'action recommandé"}
                </Text>
                {stats.advice.action_plan.map((action, index) => (
                  <View key={index} style={styles.actionPlanItem}>
                    <View style={styles.actionHeader}>
                      <Text style={[styles.actionStep, { color: colors.text }]}>
                        {t(action.step_key)}
                      </Text>
                      <Text
                        style={[
                          styles.actionDuration,
                          { color: colors.secondary },
                        ]}
                      >
                        {t(action.duration_key)}
                      </Text>
                    </View>
                    <Text
                      style={[styles.actionReward, { color: colors.primary }]}
                    >
                      🎁 {t(action.reward_key)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Challenges actifs */}
            <View style={[styles.card, { backgroundColor: colors.cardBG }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {t("ongoing_challenges") || "🏆 Défis en cours"}
              </Text>
              {stats.challenges.map((challenge, index) => (
                <View key={index} style={styles.challengeItem}>
                  <View style={styles.challengeHeader}>
                    <Ionicons
                      name={challenge.icon as any}
                      size={20}
                      color={challenge.color}
                    />
                    <Text
                      style={[styles.challengeTitle, { color: colors.text }]}
                    >
                      {t(challenge.title)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.challengeDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t(challenge.description)}
                  </Text>
                  <View style={styles.challengeProgress}>
                    <View
                      style={[
                        styles.progressBar,
                        { backgroundColor: "rgba(0,0,0,0.1)" },
                      ]}
                    >
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${challenge.progress * 100}%`,
                            backgroundColor: challenge.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.progressText, { color: colors.text }]}>
                      {Math.round(challenge.progress * 100)}%
                    </Text>
                  </View>
                  <Text
                    style={[styles.challengeReward, { color: challenge.color }]}
                  >
                    🎁 {challenge.reward}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );

      case "achievements":
        return (
          <View style={styles.tabContent}>
            {/* Badges */}
            <View style={[styles.card, { backgroundColor: colors.cardBG }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {t("badges_collection") || "🏅 Collection de badges"}
              </Text>
              <View style={styles.badgesGrid}>
                {(() => {
                  // Filtrer les badges : afficher seulement ceux débloqués ou proches d'être débloqués
                  const relevantBadges = stats.badges.filter((badge) => {
                    if (!!badge.unlocked) return true; // Déjà débloqué

                    // Logique pour les badges "proches" selon le type
                    // Ne montrer que si l'utilisateur a vraiment progressé
                    const hasAnyActivity =
                      stats.stats.total_prayers > 0 ||
                      stats.stats.total_dhikr > 0 ||
                      stats.stats.total_quran_verses > 0 ||
                      stats.stats.total_hadiths > 0 ||
                      stats.stats.total_favorites > 0;

                    if (!hasAnyActivity) return false; // Aucun badge si aucune activité

                    switch (badge.id) {
                      case "first_prayer":
                        // "Accompli votre première prière" - dès 1 prière ✅
                        return stats.stats.total_prayers >= 1;

                      case "early_bird":
                        // "Prière de Fajr accomplie 5 fois" - montrer quand proche (3+ prières)
                        return stats.stats.total_prayers >= 3;

                      case "dhikr_beginner":
                        // "10 sessions de dhikr accomplies" - montrer quand proche (5+ dhikr)
                        return stats.stats.total_dhikr >= 5;

                      case "prayer_streak_7":
                        // "7 jours consécutifs de prières" - montrer si streak >= 3 ou activité élevée
                        return (
                          stats.streaks.current_streak >= 3 ||
                          stats.stats.total_prayers >= 10
                        );

                      case "faithful_worshipper":
                        // "Accompli 50 prières au total" - montrer à partir de 25
                        return stats.stats.total_prayers >= 25;

                      case "quran_reader":
                        // "10 sessions de lecture du Coran" - montrer à partir de 5 versets
                        return stats.stats.total_quran_verses >= 5;

                      case "hadith_student":
                        // "Lu 25 hadiths" - montrer à partir de 10 hadiths
                        return stats.stats.total_hadiths >= 10;

                      case "community_helper":
                        // "Partagé 10 contenus spirituels" - montrer à partir de 5 favoris
                        return stats.stats.total_favorites >= 5;

                      // === BADGES AVANCÉS ===
                      case "prayer_master":
                        // "Accompli 500 prières au total" - montrer à partir de 250
                        return stats.stats.total_prayers >= 250;

                      case "prayer_streak_30":
                        // "30 jours consécutifs de prières" - montrer si streak >= 15 ou très actif
                        return (
                          stats.streaks.current_streak >= 15 ||
                          stats.stats.total_prayers >= 50
                        );

                      case "prayer_streak_100":
                        // "100 jours consécutifs de prières" - montrer si streak >= 50 ou expert
                        return (
                          stats.streaks.current_streak >= 50 ||
                          stats.stats.total_prayers >= 200
                        );

                      case "dhikr_master":
                        // "100 sessions de dhikr accomplies" - montrer à partir de 50
                        return stats.stats.total_dhikr >= 50;

                      case "quran_scholar":
                        // "100 sessions de lecture du Coran" - montrer à partir de 50 versets
                        return stats.stats.total_quran_verses >= 50;

                      case "social_butterfly":
                        // "Partagé 50 contenus spirituels" - montrer à partir de 25 favoris
                        return stats.stats.total_favorites >= 25;

                      case "hadith_scholar":
                        // "Lu 100 hadiths" - montrer à partir de 50 hadiths
                        return stats.stats.total_hadiths >= 50;

                      default:
                        return false; // Badges non définis
                    }
                  });

                  return relevantBadges.length === 0 ? (
                    <View style={styles.emptyBadgesContainer}>
                      <Text
                        style={[
                          styles.emptyBadgesText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {t("continue_spiritual_actions") ||
                          "🏆 Continuez vos actions spirituelles"}
                      </Text>
                      <Text
                        style={[
                          styles.emptyBadgesSubtext,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {t("new_badges_coming_soon") ||
                          "De nouveaux badges apparaîtront bientôt !"}
                      </Text>
                    </View>
                  ) : (
                    relevantBadges.map((badge, index) => (
                      <View
                        key={index}
                        style={[
                          styles.badgeCard,
                          {
                            backgroundColor: !!badge.unlocked
                              ? "rgba(78, 205, 196, 0.1)"
                              : "rgba(149, 165, 166, 0.1)",
                            borderColor: !!badge.unlocked
                              ? colors.success
                              : colors.textSecondary,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.badgeIcon,
                            {
                              backgroundColor: !!badge.unlocked
                                ? colors.success
                                : colors.textSecondary,
                            },
                          ]}
                        >
                          <Ionicons
                            name={badge.icon as any}
                            size={20}
                            color="white"
                          />
                        </View>
                        <Text
                          style={[styles.badgeName, { color: colors.text }]}
                        >
                          {t(badge.name) || t("badge_fallback") || "Badge"}
                        </Text>
                        <Text
                          style={[
                            styles.badgeDescription,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {t(badge.description) ||
                            t("badge_description_fallback") ||
                            "Description du badge"}
                        </Text>
                        {!!badge.unlocked && badge.unlocked_at && (
                          <Text
                            style={[
                              styles.badgeDate,
                              { color: colors.success },
                            ]}
                          >
                            ✅{" "}
                            {new Date(badge.unlocked_at).toLocaleDateString()}
                          </Text>
                        )}
                      </View>
                    ))
                  );
                })()}
              </View>
            </View>
          </View>
        );

      case "actions":
        return (
          <View style={styles.tabContent}>
            {/* Actions rapides */}
            <View style={[styles.card, { backgroundColor: colors.cardBG }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {t("record_spiritual_actions") ||
                  "📿 Enregistrer vos actions spirituelles"}
              </Text>
              <Text
                style={[styles.cardSubtitle, { color: colors.textSecondary }]}
              >
                {t("track_daily_progress") ||
                  "Gardez une trace de votre progression quotidienne"}
              </Text>

              <View style={styles.actionGrid}>
                <TouchableOpacity
                  style={[
                    styles.actionCard,
                    {
                      backgroundColor: "rgba(78, 205, 196, 0.1)",
                      borderColor: colors.success,
                    },
                  ]}
                  onPress={async () => {
                    setIsRecording(true);
                    const res = await recordPrayer();
                    setIsRecording(false);
                    if (res?.success) {
                      showToast(
                        t("prayer_recorded_success") ||
                          "✅ Prière enregistrée !"
                      );
                      await refresh();
                    } else {
                      showToast(
                        t("recording_error") ||
                          "❌ Erreur lors de l'enregistrement"
                      );
                    }
                  }}
                  disabled={isRecording}
                >
                  <Ionicons name="moon" size={32} color={colors.success} />
                  <Text style={[styles.actionTitle, { color: colors.text }]}>
                    {t("prayer_completed") || "Prière accomplie"}
                  </Text>
                  <Text
                    style={[
                      styles.actionDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("i_completed_prayer") || "J'ai accompli une prière"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionCard,
                    {
                      backgroundColor: "rgba(255, 215, 0, 0.1)",
                      borderColor: colors.accent,
                    },
                  ]}
                  onPress={async () => {
                    setIsRecording(true);
                    const res = await recordDhikr(1, "general");
                    setIsRecording(false);
                    if (res?.success) {
                      showToast(
                        t("dhikr_recorded_success") || "✅ Dhikr enregistré !"
                      );
                      await refresh();
                    } else {
                      showToast(
                        t("dhikr_recording_error") ||
                          "❌ Erreur lors de l'enregistrement"
                      );
                    }
                  }}
                  disabled={isRecording}
                >
                  <Ionicons name="heart" size={32} color={colors.accent} />
                  <Text style={[styles.actionTitle, { color: colors.text }]}>
                    {t("dhikr_completed") || "Dhikr récité"}
                  </Text>
                  <Text
                    style={[
                      styles.actionDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("i_completed_dhikr") || "J'ai fait du dhikr"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionCard,
                    {
                      backgroundColor: "rgba(102, 187, 106, 0.1)",
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={async () => {
                    setIsRecording(true);
                    const res = await recordQuranRead(1);
                    setIsRecording(false);
                    if (res?.success) {
                      showToast(
                        t("quran_read_recorded_success") ||
                          "✅ Lecture du Coran enregistrée !"
                      );
                      await refresh();
                    } else {
                      showToast(
                        t("quran_read_recording_error") ||
                          "❌ Erreur lors de l'enregistrement"
                      );
                    }
                  }}
                  disabled={isRecording}
                >
                  <Ionicons name="book" size={32} color={colors.primary} />
                  <Text style={[styles.actionTitle, { color: colors.text }]}>
                    {t("quran_read_completed") || "Coran lu"}
                  </Text>
                  <Text
                    style={[
                      styles.actionDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("i_completed_quran_read") || "J'ai lu du Coran"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionCard,
                    {
                      backgroundColor: "rgba(255, 107, 107, 0.1)",
                      borderColor: colors.error,
                    },
                  ]}
                  onPress={async () => {
                    setIsRecording(true);
                    const res = await recordHadithRead();
                    setIsRecording(false);
                    if (res?.success) {
                      showToast(
                        t("hadith_recorded_success") || "✅ Hadith enregistré !"
                      );
                      await refresh();
                    } else {
                      showToast(
                        t("hadith_recording_error") ||
                          "❌ Erreur lors de l'enregistrement"
                      );
                    }
                  }}
                  disabled={isRecording}
                >
                  <Ionicons
                    name="document-text"
                    size={32}
                    color={colors.error}
                  />
                  <Text style={[styles.actionTitle, { color: colors.text }]}>
                    {t("hadith_studied") || "Hadith étudié"}
                  </Text>
                  <Text
                    style={[
                      styles.actionDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("i_studied_hadith") || "J'ai lu un hadith"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Statistiques détaillées */}
            <View style={[styles.card, { backgroundColor: colors.cardBG }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {t("detailed_stats") || "📈 Statistiques détaillées"}
              </Text>
              <View style={styles.detailedStats}>
                <View style={styles.statRow}>
                  <Text
                    style={[
                      styles.statRowLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("total_prayers") || "Total prières:"}
                  </Text>
                  <Text style={[styles.statRowValue, { color: colors.text }]}>
                    {stats.stats.total_prayers}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text
                    style={[
                      styles.statRowLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("total_dhikr") || "Dhikr accomplis:"}
                  </Text>
                  <Text style={[styles.statRowValue, { color: colors.text }]}>
                    {stats.stats.total_dhikr}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text
                    style={[
                      styles.statRowLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("total_quran_verses") || "Versets lus:"}
                  </Text>
                  <Text style={[styles.statRowValue, { color: colors.text }]}>
                    {stats.stats.total_quran_verses}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text
                    style={[
                      styles.statRowLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("total_hadiths") || "Hadiths étudiés:"}
                  </Text>
                  <Text style={[styles.statRowValue, { color: colors.text }]}>
                    {stats.stats.total_hadiths}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text
                    style={[
                      styles.statRowLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("total_favorites") || "Favoris:"}
                  </Text>
                  <Text style={[styles.statRowValue, { color: colors.text }]}>
                    {stats.stats.total_favorites}
                  </Text>
                </View>
              </View>
            </View>

            {/* Zone dangereuse - Réinitialisation */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.cardBG,
                  borderWidth: 1,
                  borderColor: colors.error + "40",
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.error }]}>
                {t("danger_zone") || "⚠️ Zone dangereuse"}
              </Text>
              <Text
                style={[styles.cardSubtitle, { color: colors.textSecondary }]}
              >
                {t("reset_warning_irreversible") ||
                  "Cette action est irréversible et supprimera toutes vos statistiques"}
              </Text>

              <View style={styles.dangerZone}>
                <View style={styles.resetInfo}>
                  <Text
                    style={[
                      styles.resetInfoText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("reset_prayers_deleted") ||
                      "• Toutes vos prières enregistrées seront supprimées"}
                  </Text>
                  <Text
                    style={[
                      styles.resetInfoText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("reset_dhikr_quran_zero") ||
                      "• Vos dhikrs et lectures du Coran seront remis à zéro"}
                  </Text>
                  <Text
                    style={[
                      styles.resetInfoText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("reset_badges_deleted") ||
                      "• Tous vos badges et achievements seront supprimés"}
                  </Text>
                  <Text
                    style={[
                      styles.resetInfoText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("reset_history_cleared") ||
                      "• Votre historique et séries seront effacés"}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.resetButton,
                    { backgroundColor: colors.error },
                  ]}
                  onPress={() => {
                    Alert.alert(
                      t("confirmation_required") || "⚠️ Confirmation requise",
                      t("reset_confirmation_message") ||
                        "Êtes-vous absolument certain(e) de vouloir réinitialiser toutes vos statistiques ?\n\nCette action est DÉFINITIVE et ne peut pas être annulée.",
                      [
                        {
                          text: t("cancel") || "Annuler",
                          style: "cancel",
                        },
                        {
                          text:
                            t("confirm_reset") ||
                            "Confirmer la réinitialisation",
                          style: "destructive",
                          onPress: () => {
                            // Double confirmation pour éviter les erreurs
                            Alert.alert(
                              t("last_confirmation") ||
                                "🚨 Dernière confirmation",
                              t("final_reset_warning") ||
                                "ATTENTION : Vous allez perdre TOUTES vos données spirituelles.\n\nTapez 'RESET' ci-dessous pour confirmer :",
                              [
                                {
                                  text: t("cancel") || "Annuler",
                                  style: "cancel",
                                },
                                {
                                  text: "RESET",
                                  style: "destructive",
                                  onPress: async () => {
                                    setIsRecording(true);
                                    try {
                                      // Appel API pour réinitialiser les stats
                                      const response = await resetAllStats();

                                      if (response?.success) {
                                        showToast(
                                          t("reset_success") ||
                                            "✅ Statistiques réinitialisées avec succès"
                                        );
                                        await refresh(); // Recharger les données
                                      } else {
                                        showToast(
                                          t("reset_error") ||
                                            "❌ Erreur lors de la réinitialisation"
                                        );
                                      }
                                    } catch (error) {
                                      console.error("Erreur reset:", error);
                                      showToast(
                                        t("reset_error") ||
                                          "❌ Erreur lors de la réinitialisation"
                                      );
                                    } finally {
                                      setIsRecording(false);
                                    }
                                  },
                                },
                              ],
                              { cancelable: true }
                            );
                          },
                        },
                      ],
                      { cancelable: true }
                    );
                  }}
                  disabled={isRecording}
                >
                  {isRecording ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Ionicons name="refresh" size={20} color="white" />
                      <Text style={styles.resetButtonText}>
                        {t("reset_all_stats") ||
                          "Réinitialiser toutes les statistiques"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" />
      <ThemedImageBackground style={styles.container}>
        <View
          style={[
            styles.overlay,
            {
              backgroundColor: isDark
                ? "rgba(18, 18, 18, 0.55)"
                : "rgba(248, 249, 250, 0.55)",
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { backgroundColor: colors.cardBG }]}>
            <View style={styles.headerTop}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                📊 Statistiques Premium
              </Text>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={[
                    styles.headerButton,
                    { backgroundColor: "rgba(102, 187, 106, 0.1)" },
                  ]}
                  onPress={() => setShowInsightsModal(true)}
                >
                  <Ionicons name="analytics" size={20} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.headerButton,
                    { backgroundColor: "rgba(255, 215, 0, 0.1)" },
                  ]}
                  onPress={exportData}
                >
                  <Ionicons name="share" size={20} color={colors.accent} />
                </TouchableOpacity>
              </View>
            </View>
            <Text
              style={[styles.headerSubtitle, { color: colors.textSecondary }]}
            >
              {t("spiritual_progress_detail") ||
                "Votre progression spirituelle en détail"}
            </Text>
          </View>

          {/* Navigation par onglets */}
          <View style={[styles.tabBar, { backgroundColor: colors.cardBG }]}>
            <TabButton
              tab="overview"
              title={t("tab_overview") || "Vue d'ensemble"}
              icon="analytics"
              isActive={activeTab === "overview"}
              onPress={() => setActiveTab("overview")}
            />
            <TabButton
              tab="progress"
              title={t("tab_progress") || "Progression"}
              icon="trending-up"
              isActive={activeTab === "progress"}
              onPress={() => setActiveTab("progress")}
            />
            <TabButton
              tab="achievements"
              title={t("tab_achievements") || "Réalisations"}
              icon="trophy"
              isActive={activeTab === "achievements"}
              onPress={() => setActiveTab("achievements")}
            />
            <TabButton
              tab="actions"
              title={t("tab_actions") || "Actions"}
              icon="add-circle"
              isActive={activeTab === "actions"}
              onPress={() => setActiveTab("actions")}
            />
          </View>

          {/* Contenu */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}
          >
            {renderTabContent()}

            {/* Footer */}
            {lastUpdated && (
              <View style={styles.footer}>
                <Text
                  style={[styles.footerText, { color: colors.textSecondary }]}
                >
                  {t("last_updated")}: {lastUpdated.toLocaleTimeString()}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </ThemedImageBackground>

      {/* 🔍 Modal Insights Avancés */}
      <Modal
        visible={showInsightsModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <View
            style={[styles.modalHeader, { backgroundColor: colors.cardBG }]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              🧠 Insights Spirituels
            </Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowInsightsModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ paddingBottom: 40 }}
            bounces={true}
          >
            {/* Analyse intelligente */}
            <View style={[styles.card, { backgroundColor: colors.cardBG }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                📊 Analyse de vos habitudes
              </Text>
              {generateInsights().map((insight, index) => (
                <View key={index} style={styles.insightItem}>
                  <View
                    style={[
                      styles.insightIcon,
                      { backgroundColor: insight.color + "20" },
                    ]}
                  >
                    <Ionicons
                      name={insight.icon as any}
                      size={20}
                      color={insight.color}
                    />
                  </View>
                  <View style={styles.insightContent}>
                    <Text style={[styles.insightTitle, { color: colors.text }]}>
                      {insight.title}
                    </Text>
                    <Text
                      style={[
                        styles.insightDescription,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {insight.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Comparaison communautaire */}
            {(() => {
              const comparison = getCommunityComparison();
              if (!comparison) return null;

              return (
                <View style={[styles.card, { backgroundColor: colors.cardBG }]}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    🌍 Comparaison communautaire
                  </Text>
                  <Text
                    style={[
                      styles.cardSubtitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Votre position par rapport à la communauté (anonyme)
                  </Text>

                  <View style={styles.comparisonGrid}>
                    <View style={styles.comparisonItem}>
                      <Text
                        style={[
                          styles.comparisonLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Taux de réussite
                      </Text>
                      <View style={styles.comparisonRow}>
                        <Text
                          style={[
                            styles.comparisonUserValue,
                            { color: colors.text },
                          ]}
                        >
                          {comparison.successRate.user}%
                        </Text>
                        <Text
                          style={[
                            styles.comparisonVs,
                            { color: colors.textSecondary },
                          ]}
                        >
                          vs {comparison.successRate.average}%
                        </Text>
                        <Ionicons
                          name={
                            comparison.successRate.position === "above"
                              ? "trending-up"
                              : "trending-down"
                          }
                          size={16}
                          color={
                            comparison.successRate.position === "above"
                              ? colors.success
                              : colors.warning
                          }
                        />
                      </View>
                    </View>

                    <View style={styles.comparisonItem}>
                      <Text
                        style={[
                          styles.comparisonLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Série actuelle
                      </Text>
                      <View style={styles.comparisonRow}>
                        <Text
                          style={[
                            styles.comparisonUserValue,
                            { color: colors.text },
                          ]}
                        >
                          {comparison.streak.user} jours
                        </Text>
                        <Text
                          style={[
                            styles.comparisonVs,
                            { color: colors.textSecondary },
                          ]}
                        >
                          vs {comparison.streak.average} jours
                        </Text>
                        <Ionicons
                          name={
                            comparison.streak.position === "above"
                              ? "trending-up"
                              : "trending-down"
                          }
                          size={16}
                          color={
                            comparison.streak.position === "above"
                              ? colors.success
                              : colors.warning
                          }
                        />
                      </View>
                    </View>
                  </View>
                </View>
              );
            })()}

            {/* Objectif de la semaine */}
            <View style={[styles.card, { backgroundColor: colors.cardBG }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                🎯 Objectif de la semaine
              </Text>
              <View style={styles.goalContainer}>
                <View style={styles.goalProgress}>
                  <Text
                    style={[styles.goalLabel, { color: colors.textSecondary }]}
                  >
                    Prières cette semaine
                  </Text>
                  <Text style={[styles.goalValue, { color: colors.text }]}>
                    {stats?.stats.total_prayers || 0} / {weeklyGoal}
                  </Text>
                  <View style={styles.goalBar}>
                    <View
                      style={[
                        styles.goalBarFill,
                        {
                          width: `${getWeekProgress()}%`,
                          backgroundColor: colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[styles.goalPercentage, { color: colors.primary }]}
                  >
                    {Math.round(getWeekProgress())}% complété
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.goalButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={() => {
                    Alert.alert(
                      "Modifier l'objectif",
                      "Votre objectif sera bientôt personnalisable !",
                      [{ text: "OK" }]
                    );
                  }}
                >
                  <Text style={styles.goalButtonText}>Modifier</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    paddingTop: 60,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
  },

  // Navigation
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tabButtonText: {
    fontSize: 12,
    marginLeft: 4,
  },

  // Contenu
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 140,
  },
  tabContent: {
    flex: 1,
  },

  // Cartes
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  cardSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },

  // Profil
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  profileAvatarText: {
    fontSize: 28,
  },
  profileDetails: {
    flex: 1,
  },
  profileTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  profileSubtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  smartNotification: {
    fontSize: 14,
    fontStyle: "italic",
  },

  // Niveau
  levelContainer: {
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  levelHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  levelNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  levelTitle: {
    fontSize: 16,
    color: "white",
    opacity: 0.9,
  },
  progressSection: {
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  progressBar: {
    width: "100%",
    height: 8,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "white",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: "white",
    fontWeight: "600",
  },
  pointsText: {
    fontSize: 14,
    color: "white",
    opacity: 0.9,
  },

  // Statistiques
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statItem: {
    width: (width - 72) / 2,
    alignItems: "center",
    padding: 16,
    marginBottom: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: "center",
  },

  // Conseils
  adviceItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  adviceText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
    lineHeight: 20,
  },

  // Plan d'action
  actionPlanItem: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  actionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  actionStep: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  actionDuration: {
    fontSize: 12,
    fontStyle: "italic",
  },
  actionReward: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Challenges
  challengeItem: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  challengeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  challengeDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  challengeProgress: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  challengeReward: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Badges
  badgesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  badgeCard: {
    width: (width - 72) / 2,
    alignItems: "center",
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 4,
  },
  badgeDate: {
    fontSize: 10,
    textAlign: "center",
  },
  emptyBadgesContainer: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyBadgesText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  emptyBadgesSubtext: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    opacity: 0.8,
  },

  // Actions
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionCard: {
    width: (width - 72) / 2,
    alignItems: "center",
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 12,
    textAlign: "center",
  },

  // Stats détaillées
  detailedStats: {
    marginTop: 8,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  statRowLabel: {
    fontSize: 14,
  },
  statRowValue: {
    fontSize: 14,
    fontWeight: "600",
  },

  // États
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600",
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center",
  },

  // Premium
  premiumIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,215,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  premiumTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  premiumSubtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  featuresList: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    marginLeft: 8,
  },
  premiumButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  premiumButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },

  // Erreurs
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },

  // Vide
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    textAlign: "center",
  },
  emptyMessage: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },

  // Footer
  footer: {
    alignItems: "center",
    marginTop: 32,
    marginBottom: 32,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    opacity: 0.8,
  },

  // 🎯 Nouveaux styles pour les fonctionnalités avancées
  // Modal
  modalContainer: {
    flex: 1,
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20, // Ajoute de l'espace en bas pour éviter que le contenu soit coupé
  },

  // Insights
  insightItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Comparaison communautaire
  comparisonGrid: {
    marginTop: 16,
  },
  comparisonItem: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  comparisonLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  comparisonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  comparisonUserValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  comparisonVs: {
    fontSize: 14,
    flex: 1,
    textAlign: "center",
  },

  // Objectifs
  goalContainer: {
    marginTop: 16,
  },
  goalProgress: {
    marginBottom: 16,
  },
  goalLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  goalValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  goalBar: {
    height: 8,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 4,
    marginBottom: 8,
  },
  goalBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  goalPercentage: {
    fontSize: 14,
    fontWeight: "600",
  },
  goalButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  goalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },

  // Calendrier de consistance
  consistencyCalendar: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 16,
  },
  consistencyDay: {
    alignItems: "center",
    flex: 1,
  },
  consistencyDayLabel: {
    fontSize: 12,
    marginBottom: 8,
    textTransform: "capitalize",
  },
  consistencyDayIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  consistencyDayCount: {
    fontSize: 12,
    fontWeight: "bold",
    color: "white",
  },
  consistencyDate: {
    fontSize: 12,
  },
  consistencyLegend: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    fontSize: 10,
  },

  // Actions rapides
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 16,
  },
  quickActionButton: {
    width: (width - 72) / 2,
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
  },

  // Zone dangereuse - Réinitialisation
  dangerZone: {
    marginTop: 16,
  },
  resetInfo: {
    marginBottom: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255, 107, 107, 0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.2)",
  },
  resetInfoText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    fontWeight: "500",
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    minHeight: 56,
  },
  resetButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
    textAlign: "center",
  },
});

export default PrayerStatsPremiumScreen;
