import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  useThemeColors,
  useOverlayTextColor,
  useCurrentTheme,
} from "../hooks/useThemeColor";

interface SunInfoProps {
  sunrise: Date | null;
  sunset: Date | null;
  currentTime: Date;
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
        currentTheme === "light" ? colors.border : "rgba(255, 217, 61, 0.3)",
      shadowColor: currentTheme === "light" ? colors.shadow : "#FFD93D",
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
      fontSize: 16,
      color: overlayTextColor,
      marginLeft: 8,
      fontWeight: "600",
    },
    sunTracker: {
      marginBottom: 16,
    },
    sunPath: {
      height: 3,
      backgroundColor:
        currentTheme === "light" ? colors.border : "rgba(255, 217, 61, 0.2)",
      borderRadius: 1.5,
      marginBottom: 8,
      position: "relative",
    },
    sunIndicator: {
      position: "absolute",
      width: 12,
      height: 12,
      backgroundColor: currentTheme === "light" ? colors.primary : "#FFD93D",
      borderRadius: 6,
      top: -4.5,
      marginLeft: -6,
      shadowColor: currentTheme === "light" ? colors.shadow : "#FFD93D",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 4,
      elevation: 4,
    },
    timeMarkers: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 4,
    },
    timeText: {
      fontSize: 14,
      color:
        currentTheme === "light"
          ? colors.textSecondary
          : "rgba(255, 255, 255, 0.8)",
    },
    nextEvent: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(255, 217, 61, 0.1)",
      padding: 12,
      borderRadius: 12,
    },
    nextEventText: {
      fontSize: 14,
      color: overlayTextColor,
      marginLeft: 8,
      fontWeight: "500",
    },
  });

export function SunInfo({ sunrise, sunset, currentTime }: SunInfoProps) {
  const { t } = useTranslation();

  // Utiliser les couleurs thématiques
  const colors = useThemeColors();
  const overlayTextColor = useOverlayTextColor();
  const currentTheme = useCurrentTheme();

  const styles = getStyles(colors, overlayTextColor, currentTheme);

  // Calculer la durée du jour
  const getDayDuration = () => {
    if (!sunrise || !sunset) return "--:--";
    const diff = sunset.getTime() - sunrise.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Calculer le temps jusqu'au prochain lever/coucher
  const getTimeUntilNextSunEvent = () => {
    if (!sunrise || !sunset) return { event: null, time: "--:--" };

    const now = currentTime.getTime();
    const sunriseTime = sunrise.getTime();
    const sunsetTime = sunset.getTime();

    // Si on est avant le lever du soleil
    if (now < sunriseTime) {
      const diff = sunriseTime - now;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return {
        event: "sunrise",
        time: `${hours}h ${minutes}m`,
      };
    }
    // Si on est avant le coucher du soleil
    else if (now < sunsetTime) {
      const diff = sunsetTime - now;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return {
        event: "sunset",
        time: `${hours}h ${minutes}m`,
      };
    }
    // Après le coucher, on attend le lever de demain
    else {
      const tomorrowSunrise = new Date(sunrise.getTime() + 24 * 60 * 60 * 1000);
      const diff = tomorrowSunrise.getTime() - now;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return {
        event: "sunrise",
        time: `${hours}h ${minutes}m`,
      };
    }
  };

  // Calculer la position approximative du soleil (0-100)
  const getSunPosition = () => {
    if (!sunrise || !sunset) return 50;

    const now = currentTime.getTime();
    const sunriseTime = sunrise.getTime();
    const sunsetTime = sunset.getTime();
    const dayDuration = sunsetTime - sunriseTime;

    // Avant le lever du soleil
    if (now < sunriseTime) return 0;
    // Après le coucher du soleil
    if (now > sunsetTime) return 100;

    // Pendant la journée
    const elapsed = now - sunriseTime;
    return Math.min(100, Math.max(0, (elapsed / dayDuration) * 100));
  };

  const nextSunEvent = getTimeUntilNextSunEvent();
  const sunPosition = getSunPosition();

  return (
    <View style={styles.container}>
      {/* En-tête avec durée du jour */}
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="weather-sunny"
          size={24}
          color={currentTheme === "light" ? colors.primary : "#FFD93D"}
        />
        <Text style={styles.headerText}>
          {t("day_duration") || "Durée du jour"}: {getDayDuration()}
        </Text>
      </View>

      {/* Visualisation de la position du soleil */}
      <View style={styles.sunTracker}>
        <View style={styles.sunPath}>
          <View style={[styles.sunIndicator, { left: `${sunPosition}%` }]} />
        </View>
        <View style={styles.timeMarkers}>
          <Text style={styles.timeText}>
            {sunrise?.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }) || "--:--"}
          </Text>
          <Text style={styles.timeText}>
            {sunset?.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }) || "--:--"}
          </Text>
        </View>
      </View>

      {/* Prochain événement solaire */}
      <View style={styles.nextEvent}>
        <MaterialCommunityIcons
          name={
            nextSunEvent.event === "sunrise"
              ? "weather-sunset-up"
              : "weather-sunset-down"
          }
          size={20}
          color={currentTheme === "light" ? colors.primary : "#FFD93D"}
        />
        <Text style={styles.nextEventText}>
          {nextSunEvent.event === "sunrise"
            ? t("time_until_sunrise") || "Temps jusqu'au lever"
            : t("time_until_sunset") || "Temps jusqu'au coucher"}
          : {nextSunEvent.time}
        </Text>
      </View>
    </View>
  );
}
