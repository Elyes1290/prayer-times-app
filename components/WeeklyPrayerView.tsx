import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { useTranslation } from "react-i18next";
import {
  useThemeColors,
  useOverlayTextColor,
  useCurrentTheme,
} from "../hooks/useThemeColor";
import { makeBoxShadow } from "../utils/shadowUtils";

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
      fontSize: 18,
      color: colors.primary, // 🌅 Utilise la couleur du thème actif
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
      borderBottomColor: colors.border, // 🌅 Utilise la couleur du thème actif
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
      backgroundColor: colors.surface, // 🌅 Utilise la couleur du thème actif
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
      color: colors.primary, // 🌅 Utilise la couleur du thème actif
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
      backgroundColor: colors.surface, // 🌅 Utilise la couleur du thème actif
    },
    timeText: {
      fontSize: 12,
      color: colors.textSecondary, // 🌅 Utilise la couleur du thème actif
      fontWeight: "500",
    },
    todayTimeText: {
      color: colors.primary, // 🌅 Utilise la couleur du thème actif
      fontWeight: "600",
    },
  });
};

const DAY_NAMES = {
  fr: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
  ar: ["أحد", "إثن", "ثلا", "أرب", "خمس", "جمع", "سبت"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
} as const;

function formatDay(date: Date, language: string) {
  const lang = language in DAY_NAMES ? language : "en";
  return DAY_NAMES[lang as keyof typeof DAY_NAMES][date.getDay()];
}

function formatDate(date: Date) {
  return date.getDate().toString().padStart(2, "0");
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  const todayRef = useMemo(() => new Date(), []);

  const isToday = (date: Date) => {
    return (
      date.getDate() === todayRef.getDate() &&
      date.getMonth() === todayRef.getMonth() &&
      date.getFullYear() === todayRef.getFullYear()
    );
  };

  return (
    <View style={styles.container} testID="weekly-prayer-container">
      <View style={styles.header} testID="weekly-prayer-header">
        <MCIcon
          name="calendar-week"
          size={24}
          color={colors.primary} // 🌅 Utilise la couleur du thème actif
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
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.headerText}>{t("prayer")}</Text>
            </View>
            {weekPrayerTimes.map((day) =>
              day.date instanceof Date && !isNaN(day.date.getTime()) ? (
                <Pressable
                  key={day.date.toISOString()}
                  style={[
                    styles.dateCell,
                    isToday(day.date) && styles.todayCell,
                  ]}
                  onPress={() => onDayPress(new Date(day.date))}
                  testID={isToday(day.date) ? "today-cell" : "day-cell"}
                >
                  <Text
                    style={[
                      styles.dateText,
                      isToday(day.date) && styles.todayText,
                    ]}
                  >
                    {formatDay(day.date, i18n.language)}
                  </Text>
                  <Text
                    style={[
                      styles.dateNumber,
                      isToday(day.date) && styles.todayText,
                    ]}
                  >
                    {formatDate(day.date)}
                  </Text>
                </Pressable>
              ) : null
            )}
          </View>

          {/* Lignes des prières */}
          {["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"].map(
            (prayer) => (
              <View key={prayer} style={styles.prayerRow}>
                <View style={styles.prayerNameCell}>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.prayerName}>
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
