import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  useThemeColors,
  useOverlayTextColor,
  useCurrentTheme,
} from "../hooks/useThemeColor";

interface WeeklyPrayerViewProps {
  currentDate: Date;
  weekPrayerTimes: {
    date: Date;
    times: {
      fajr: Date;
      sunrise: Date;
      dhuhr: Date;
      asr: Date;
      maghrib: Date;
      isha: Date;
    };
  }[];
  onDayPress: (date: Date) => void;
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
    scrollContent: {
      paddingBottom: 8,
    },
    tableContainer: {
      minWidth: "100%",
    },
    headerRow: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor:
        currentTheme === "light" ? colors.border : "rgba(78, 205, 196, 0.2)",
      paddingBottom: 8,
      marginBottom: 8,
    },
    dateCell: {
      width: 60,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 4,
      marginHorizontal: 2,
      borderRadius: 8,
    },
    todayCell: {
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(78, 205, 196, 0.2)",
    },
    dateText: {
      fontSize: 12,
      color: overlayTextColor,
      fontWeight: "500",
      textTransform: "uppercase",
    },
    dateNumber: {
      fontSize: 14,
      color: overlayTextColor,
      fontWeight: "700",
      marginTop: 2,
    },
    todayText: {
      color: currentTheme === "light" ? colors.primary : "#4ECDC4",
    },
    prayerRow: {
      flexDirection: "row",
      marginBottom: 8,
    },
    prayerNameCell: {
      width: 60,
      justifyContent: "center",
      paddingLeft: 4,
    },
    prayerName: {
      fontSize: 12,
      color: overlayTextColor,
      fontWeight: "600",
    },
    timeCell: {
      width: 60,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 8,
      marginHorizontal: 2,
      borderRadius: 8,
    },
    todayTimeCell: {
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(78, 205, 196, 0.1)",
    },
    timeText: {
      fontSize: 12,
      color:
        currentTheme === "light"
          ? colors.textSecondary
          : "rgba(255, 255, 255, 0.9)",
      fontWeight: "500",
    },
    todayTimeText: {
      color: currentTheme === "light" ? colors.primary : "#4ECDC4",
      fontWeight: "600",
    },
  });

export default function WeeklyPrayerView({
  currentDate,
  weekPrayerTimes,
  onDayPress,
}: WeeklyPrayerViewProps) {
  const { t, i18n } = useTranslation();

  // Utiliser les couleurs thématiques
  const colors = useThemeColors();
  const overlayTextColor = useOverlayTextColor();
  const currentTheme = useCurrentTheme();

  const styles = getStyles(colors, overlayTextColor, currentTheme);

  const formatDay = (date: Date) => {
    const days = {
      fr: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
      ar: ["أحد", "إثن", "ثلا", "أرب", "خمس", "جمع", "سبت"],
      en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    };
    const lang = i18n.language in days ? i18n.language : "en";
    return days[lang as keyof typeof days][date.getDay()];
  };

  const formatDate = (date: Date) => {
    return date.getDate().toString().padStart(2, "0");
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="calendar-week"
          size={24}
          color={currentTheme === "light" ? colors.primary : "#4ECDC4"}
        />
        <Text style={styles.headerText}>{t("weekly_view")}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.tableContainer}>
          {/* En-tête des colonnes */}
          <View style={styles.headerRow}>
            <View style={styles.dateCell}>
              <Text style={styles.headerText}>{t("prayer")}</Text>
            </View>
            {weekPrayerTimes.map((day) =>
              day.date instanceof Date && !isNaN(day.date.getTime()) ? (
                <TouchableOpacity
                  key={day.date.toISOString()}
                  style={[
                    styles.dateCell,
                    isToday(day.date) && styles.todayCell,
                  ]}
                  onPress={() => onDayPress(new Date(day.date))}
                >
                  <Text
                    style={[
                      styles.dateText,
                      isToday(day.date) && styles.todayText,
                    ]}
                  >
                    {formatDay(day.date)}
                  </Text>
                  <Text
                    style={[
                      styles.dateNumber,
                      isToday(day.date) && styles.todayText,
                    ]}
                  >
                    {formatDate(day.date)}
                  </Text>
                </TouchableOpacity>
              ) : null
            )}
          </View>

          {/* Lignes des prières */}
          {["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"].map(
            (prayer) => (
              <View key={prayer} style={styles.prayerRow}>
                <View style={styles.prayerNameCell}>
                  <Text style={styles.prayerName}>
                    {t(prayer.toLowerCase())}
                  </Text>
                </View>
                {weekPrayerTimes.map((day) =>
                  day.date instanceof Date && !isNaN(day.date.getTime()) ? (
                    <View
                      key={`${day.date.toISOString()}-${prayer}`}
                      style={[
                        styles.timeCell,
                        isToday(day.date) && styles.todayTimeCell,
                      ]}
                    >
                      <Text
                        style={[
                          styles.timeText,
                          isToday(day.date) && styles.todayTimeText,
                        ]}
                      >
                        {formatTime(
                          day.times[prayer as keyof typeof day.times]
                        )}
                      </Text>
                    </View>
                  ) : null
                )}
              </View>
            )
          )}
        </View>
      </ScrollView>
    </View>
  );
}
