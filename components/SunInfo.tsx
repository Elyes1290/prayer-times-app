import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { useTranslation } from "react-i18next";
import {
  useThemeColors,
  useOverlayTextColor,
  useCurrentTheme,
} from "../hooks/useThemeColor";
import { makeBoxShadow } from "../utils/shadowUtils";

interface SunInfoProps {
  sunrise: Date | null;
  sunset: Date | null;
  currentTime: Date;
}

const getStyles = (
  colors: any,
  overlayTextColor: string,
  currentTheme: "light" | "dark" | "morning" | "sunset"
) => {
  // 🆕 Les couleurs sont maintenant gérées directement via colors du thème actif
  return StyleSheet.create({
    container: {
      backgroundColor: colors.cardBG, // 🌅 Utilise la couleur du thème actif
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border, // 🌅 Utilise la couleur du thème actif
      boxShadow: makeBoxShadow(colors.shadow, 0, 4, 10, 0.3),
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
      backgroundColor: colors.border, // 🌅 Utilise la couleur du thème actif
      borderRadius: 1.5,
      marginBottom: 8,
      position: "relative",
    },
    sunIndicator: {
      position: "absolute",
      width: 12,
      height: 12,
      backgroundColor: colors.primary, // 🌅 Utilise la couleur du thème actif
      borderRadius: 6,
      top: -4.5,
      marginLeft: -6,
      boxShadow: makeBoxShadow(colors.shadow, 0, 0, 4, 0.8),
    },
    timeMarkers: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 4,
    },
    timeText: {
      fontSize: 14,
      color: colors.textSecondary, // 🌅 Utilise la couleur du thème actif
    },
    nextEvent: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface, // 🌅 Utilise la couleur du thème actif
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
};

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
        <MCIcon
          name="weather-sunny"
          size={24}
          color={colors.primary} // 🌅 Utilise la couleur du thème actif
        />
        <Text style={styles.headerText}>
          {t("sun_info.day_duration", "Durée du jour")}: {getDayDuration()}
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
        <MCIcon
          name={
            nextSunEvent.event === "sunrise"
              ? "weather-sunset-up"
              : "weather-sunset-down"
          }
          size={20}
          color={colors.primary} // 🌅 Utilise la couleur du thème actif
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
