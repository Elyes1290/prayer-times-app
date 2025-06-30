import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  useThemeColors,
  useOverlayTextColor,
  useCurrentTheme,
} from "../hooks/useThemeColor";

interface PrayerStatsProps {
  dayLength: number; // en minutes
  fajrToSunrise: number; // en minutes
  sunsetToIsha: number; // en minutes
  prayerSpacing: {
    fajrToSunrise: number;
    sunriseToZuhr: number;
    zuhrToAsr: number;
    asrToMaghrib: number;
    maghribToIsha: number;
  };
}

const getStyles = (
  colors: any,
  overlayTextColor: string,
  currentTheme: "light" | "dark"
) =>
  StyleSheet.create({
    container: {
      backgroundColor:
        currentTheme === "light" ? colors.cardBG : "rgba(0, 0, 0, 0.5)",
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(78, 205, 196, 0.3)",
      shadowColor: currentTheme === "light" ? colors.shadow : "#4ECDC4",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 6,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },
    headerText: {
      fontSize: 18,
      color: currentTheme === "light" ? colors.primary : "#4ECDC4",
      marginLeft: 8,
      fontWeight: "600",
    },
    statsGrid: {
      gap: 16,
    },
    statItem: {
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(78, 205, 196, 0.1)",
      borderRadius: 12,
      padding: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    statLabel: {
      color: overlayTextColor,
      fontSize: 14,
      fontWeight: "500",
      flex: 1,
    },
    statValue: {
      color: currentTheme === "light" ? colors.primary : "#4ECDC4",
      fontSize: 14,
      fontWeight: "600",
    },
    spacingContainer: {
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(78, 205, 196, 0.1)",
      borderRadius: 12,
      padding: 12,
    },
    spacingTitle: {
      color: currentTheme === "light" ? colors.primary : "#4ECDC4",
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 12,
    },
    spacingGrid: {
      gap: 8,
    },
    spacingItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    spacingLabel: {
      color: overlayTextColor,
      fontSize: 12,
      fontWeight: "500",
    },
    spacingValue: {
      color: currentTheme === "light" ? colors.primary : "#4ECDC4",
      fontSize: 12,
      fontWeight: "600",
    },
  });

export default function PrayerStats({
  dayLength,
  fajrToSunrise,
  sunsetToIsha,
  prayerSpacing,
}: PrayerStatsProps) {
  const { t } = useTranslation();

  // Utiliser les couleurs thématiques
  const colors = useThemeColors();
  const overlayTextColor = useOverlayTextColor();
  const currentTheme = useCurrentTheme();

  const styles = getStyles(colors, overlayTextColor, currentTheme);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="chart-timeline-variant"
          size={24}
          color={currentTheme === "light" ? colors.primary : "#4ECDC4"}
        />
        <Text style={styles.headerText}>{t("prayer_stats")}</Text>
      </View>

      <View style={styles.statsGrid}>
        {/* Durée du jour */}
        <View style={styles.statItem}>
          <MaterialCommunityIcons
            name="weather-sunny"
            size={20}
            color={currentTheme === "light" ? colors.primary : "#4ECDC4"}
          />
          <Text style={styles.statLabel}>{t("day_length")}</Text>
          <Text style={styles.statValue}>{formatDuration(dayLength)}</Text>
        </View>

        {/* Temps entre Fajr et lever du soleil */}
        <View style={styles.statItem}>
          <MaterialCommunityIcons
            name="weather-sunset-up"
            size={20}
            color={currentTheme === "light" ? colors.primary : "#4ECDC4"}
          />
          <Text style={styles.statLabel}>{t("fajr_to_sunrise")}</Text>
          <Text style={styles.statValue}>{formatDuration(fajrToSunrise)}</Text>
        </View>

        {/* Temps entre coucher du soleil et Isha */}
        <View style={styles.statItem}>
          <MaterialCommunityIcons
            name="weather-sunset-down"
            size={20}
            color={currentTheme === "light" ? colors.primary : "#4ECDC4"}
          />
          <Text style={styles.statLabel}>{t("sunset_to_isha")}</Text>
          <Text style={styles.statValue}>{formatDuration(sunsetToIsha)}</Text>
        </View>

        {/* Espacement entre les prières */}
        <View style={styles.spacingContainer}>
          <Text style={styles.spacingTitle}>{t("prayer_spacing")}</Text>
          <View style={styles.spacingGrid}>
            <View style={styles.spacingItem}>
              <Text style={styles.spacingLabel}>
                {t("fajr_to_sunrise_time")}
              </Text>
              <Text style={styles.spacingValue}>
                {formatDuration(prayerSpacing.fajrToSunrise)}
              </Text>
            </View>
            <View style={styles.spacingItem}>
              <Text style={styles.spacingLabel}>
                {t("sunrise_to_zuhr_time")}
              </Text>
              <Text style={styles.spacingValue}>
                {formatDuration(prayerSpacing.sunriseToZuhr)}
              </Text>
            </View>
            <View style={styles.spacingItem}>
              <Text style={styles.spacingLabel}>{t("zuhr_to_asr_time")}</Text>
              <Text style={styles.spacingValue}>
                {formatDuration(prayerSpacing.zuhrToAsr)}
              </Text>
            </View>
            <View style={styles.spacingItem}>
              <Text style={styles.spacingLabel}>
                {t("asr_to_maghrib_time")}
              </Text>
              <Text style={styles.spacingValue}>
                {formatDuration(prayerSpacing.asrToMaghrib)}
              </Text>
            </View>
            <View style={styles.spacingItem}>
              <Text style={styles.spacingLabel}>
                {t("maghrib_to_isha_time")}
              </Text>
              <Text style={styles.spacingValue}>
                {formatDuration(prayerSpacing.maghribToIsha)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
