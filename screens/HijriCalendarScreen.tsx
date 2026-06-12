import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Calendar } from "react-native-calendars";
import ThemedImageBackground from "../components/ThemedImageBackground";
import { DateNavigator } from "../components/DateNavigator";
import { getIslamicEventsForYear } from "../utils/islamicEvents";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useThemeColors,
  useOverlayTextColor,
  useCurrentTheme,
} from "../hooks/useThemeColor";

const hijriDisplayFormatter = new Intl.DateTimeFormat("fr-u-ca-islamic", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${year}-${pad(month)}-${pad(day)}`;
}

type AppTheme = "light" | "dark" | "morning" | "sunset";

function getCalendarTheme(
  currentTheme: AppTheme,
  colors: ReturnType<typeof useThemeColors>,
  overlayTextColor: string,
  calendarTextSizes: {
    textDayFontSize: number;
    textMonthFontSize: number;
    textDayHeaderFontSize: number;
  },
) {
  const isBrightTheme =
    currentTheme === "light" || currentTheme === "morning";

  if (isBrightTheme) {
    return {
      backgroundColor: "transparent",
      calendarBackground: colors.cardBG,
      textSectionTitleColor: colors.textSecondary,
      dayTextColor: colors.text,
      monthTextColor: colors.primary,
      todayTextColor: colors.primary,
      selectedDayTextColor: "#FFFFFF",
      selectedDayBackgroundColor: colors.primary,
      textDisabledColor: colors.textSecondary,
      dotColor: colors.primary,
      selectedDotColor: colors.primary,
      arrowColor: colors.primary,
      indicatorColor: colors.primary,
      textDayFontWeight: "700" as const,
      textMonthFontWeight: "bold" as const,
      textDayHeaderFontWeight: "700" as const,
      ...calendarTextSizes,
    };
  }

  const dayHeaderColor = overlayTextColor;

  return {
    backgroundColor: "transparent",
    calendarBackground: "rgba(255, 255, 255, 0.96)",
    textSectionTitleColor: dayHeaderColor,
    textSectionTitleDisabledColor: colors.textTertiary,
    dayTextColor: "#1A1A1A",
    monthTextColor: colors.primary,
    todayTextColor: colors.primary,
    selectedDayTextColor: "#FFFFFF",
    selectedDayBackgroundColor: "#2E7D32",
    textDisabledColor: "#9E9E9E",
    dotColor: colors.primary,
    selectedDotColor: colors.primary,
    arrowColor: colors.primary,
    indicatorColor: colors.primary,
    textDayFontWeight: "700" as const,
    textMonthFontWeight: "bold" as const,
    textDayHeaderFontWeight: "700" as const,
    stylesheet: {
      calendar: {
        header: {
          dayHeader: {
            color: dayHeaderColor,
          },
        },
      },
    },
    ...calendarTextSizes,
  };
}

const getStyles = (
  colors: any,
  overlayTextColor: string,
  currentTheme: "light" | "dark" | "morning" | "sunset"
) => {
  // 🆕 Les couleurs sont maintenant gérées directement via colors du thème actif
  return StyleSheet.create({
    background: { flex: 1 },
    scroll: { flex: 1, backgroundColor: "transparent" },
    container: { flexGrow: 1, paddingHorizontal: 16, paddingVertical: 20 },
    header: {
      fontSize: 28,
      fontWeight: "bold",
      textAlign: "center",
      marginBottom: 20,
      marginTop: 40,
      color: overlayTextColor,
      textShadowColor: colors.shadow, // 🌅 Utilise la couleur du thème actif
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border, // 🌅 Utilise la couleur du thème actif
      backgroundColor: colors.surface, // 🌅 Utilise la couleur du thème actif
      paddingHorizontal: 12,
      borderRadius: 8,
      marginBottom: 8,
    },
    label: {
      fontSize: 18,
      color: overlayTextColor,
      fontWeight: "600",
    },
    value: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.primary, // 🌅 Utilise la couleur du thème actif
    },
    calendar: {
      borderRadius: 8,
      marginTop: 16,
      backgroundColor: colors.cardBG, // 🌅 Utilise la couleur du thème actif
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border, // 🌅 Utilise la couleur du thème actif
    },
    eventsContainer: {
      marginTop: 20,
      backgroundColor: colors.surface, // 🌅 Utilise la couleur du thème actif
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border, // 🌅 Utilise la couleur du thème actif
    },
    eventsTitle: {
      fontWeight: "bold",
      fontSize: 18,
      color: colors.primary, // 🌅 Utilise la couleur du thème actif
      marginBottom: 12,
    },
    eventItem: {
      fontSize: 16,
      color: overlayTextColor,
      marginBottom: 4,
      paddingLeft: 8,
    },
  });
};

export default function HijriCalendarScreen() {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [displayDate, setDisplayDate] = useState(new Date());
  const events = getIslamicEventsForYear(selectedDate.getFullYear());
  const insets = useSafeAreaInsets();

  // Utiliser les couleurs thématiques
  const colors = useThemeColors();
  const overlayTextColor = useOverlayTextColor();
  const currentTheme = useCurrentTheme();

  const styles = getStyles(colors, overlayTextColor, currentTheme);

  const { width, height } = useWindowDimensions();
  // Ajustement responsif des tailles de police selon l'écran
  const isSmallScreen = height < 700;
  const calendarTextSizes = {
    textDayFontSize: isSmallScreen ? 14 : 18,
    textMonthFontSize: isSmallScreen ? 16 : 20,
    textDayHeaderFontSize: isSmallScreen ? 12 : 16,
  };

  const hijriDate = hijriDisplayFormatter.format(selectedDate);

  const handlePrevDay = useCallback(() => {
    setSelectedDate((current) => {
      const newDate = new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate() - 1,
      );
      setDisplayDate(newDate);
      return newDate;
    });
  }, []);

  const handleNextDay = useCallback(() => {
    setSelectedDate((current) => {
      const newDate = new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate() + 1,
      );
      setDisplayDate(newDate);
      return newDate;
    });
  }, []);

  const handleResetToday = useCallback(() => {
    const now = new Date();
    setSelectedDate(now);
    setDisplayDate(now);
  }, []);

  const selectedDateString = formatLocalDateString(selectedDate);
  const displayDateString = formatLocalDateString(displayDate);
  const eventsToday = events.filter(
    (event) => formatLocalDateString(event.date) === selectedDateString
  );

  const markedDates = events.reduce((acc, event) => {
    const dateStr = formatLocalDateString(event.date);
    acc[dateStr] = {
      marked: true,
      dots: [
        {
          key: "event",
          color:
            currentTheme === "light" || currentTheme === "morning"
              ? colors.primary
              : "#2E7D32",
        },
      ],
    };
    return acc;
  }, {} as Record<string, any>);

  return (
    <ThemedImageBackground style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: insets.bottom + 120 }, // Plus d'espace pour le menu et les événements
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.header}>{t("hijri_calendar")}</Text>

        <DateNavigator
          date={selectedDate}
          onPrev={handlePrevDay}
          onNext={handleNextDay}
          onReset={handleResetToday}
        />

        <View style={styles.row}>
          <Text style={styles.label}>{t("gregorian_date")}</Text>
          <Text style={styles.value}>{selectedDate.toLocaleDateString()}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{t("hijri_date")}</Text>
          <Text style={styles.value}>{hijriDate}</Text>
        </View>

        <Calendar
          key={currentTheme}
          initialDate={displayDateString}
          onDayPress={(day) => {
            const [year, month, dayNum] = day.dateString.split("-").map(Number);
            const newDate = new Date(year, month - 1, dayNum);
            setSelectedDate(newDate);
            setDisplayDate(newDate);
          }}
          markedDates={{
            ...markedDates,
            [selectedDateString]: {
              selected: true,
              selectedColor:
                currentTheme === "light" || currentTheme === "morning"
                  ? colors.primary
                  : "#2E7D32",
            },
          }}
          theme={getCalendarTheme(
            currentTheme,
            colors,
            overlayTextColor,
            calendarTextSizes,
          )}
          style={styles.calendar}
        />

        {eventsToday.length > 0 && (
          <View style={styles.eventsContainer}>
            <Text style={styles.eventsTitle}>
              {t("religious_events_today")}
            </Text>
            {eventsToday.map((event) => (
              <Text key={event.name} style={styles.eventItem}>
                • {t(event.name)}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>
    </ThemedImageBackground>
  );
}
