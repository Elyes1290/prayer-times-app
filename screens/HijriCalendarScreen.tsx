import { useState } from "react";
import {
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from "react-native";
import { Calendar } from "react-native-calendars";
import ThemedImageBackground from "../components/ThemedImageBackground";
import { DateNavigator } from "../components/DateNavigator";
import { Colors } from "../constants/Colors";
import { getIslamicEventsForYear } from "../utils/islamicEvents";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useThemeColors,
  useOverlayTextColor,
  useCurrentTheme,
} from "../hooks/useThemeColor";

function formatLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${year}-${pad(month)}-${pad(day)}`;
}

const getStyles = (
  colors: any,
  overlayTextColor: string,
  currentTheme: "light" | "dark"
) =>
  StyleSheet.create({
    background: { flex: 1 },
    scroll: { flex: 1, backgroundColor: "transparent" },
    container: { flexGrow: 1, padding: 20 },
    header: {
      fontSize: 28,
      fontWeight: "bold",
      textAlign: "center",
      marginBottom: 20,
      marginTop: 40,
      color: overlayTextColor,
      textShadowColor:
        currentTheme === "light" ? colors.textShadow : "rgba(0,0,0,0.25)",
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: currentTheme === "light" ? colors.border : "#e7c86a",
      backgroundColor:
        currentTheme === "light" ? colors.surface : "transparent",
      paddingHorizontal: currentTheme === "light" ? 12 : 0,
      borderRadius: currentTheme === "light" ? 8 : 0,
      marginBottom: currentTheme === "light" ? 8 : 0,
    },
    label: {
      fontSize: 18,
      color: overlayTextColor,
      fontWeight: "600",
    },
    value: {
      fontSize: 18,
      fontWeight: "bold",
      color: currentTheme === "light" ? colors.primary : "#FFD700",
    },
    calendar: {
      borderRadius: 8,
      marginTop: 16,
      backgroundColor:
        currentTheme === "light" ? colors.cardBG : "rgba(34,40,58,0.32)",
      overflow: "hidden",
      borderWidth: currentTheme === "light" ? 1 : 0,
      borderColor: currentTheme === "light" ? colors.border : "transparent",
    },
    eventsContainer: {
      marginTop: 20,
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(0,0,0,0.3)",
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(46,125,50,0.3)",
    },
    eventsTitle: {
      fontWeight: "bold",
      fontSize: 18,
      color: currentTheme === "light" ? colors.primary : "#2E7D32",
      marginBottom: 12,
    },
    eventItem: {
      fontSize: 16,
      color: overlayTextColor,
      marginBottom: 4,
      paddingLeft: 8,
    },
  });

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

  const { width, height } = Dimensions.get("window");
  // Ajustement responsif des tailles de police selon l'écran
  const isSmallScreen = height < 700;
  const calendarTextSizes = {
    textDayFontSize: isSmallScreen ? 14 : 18,
    textMonthFontSize: isSmallScreen ? 16 : 20,
    textDayHeaderFontSize: isSmallScreen ? 12 : 16,
  };

  const hijriFormatter = new Intl.DateTimeFormat("fr-u-ca-islamic", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const hijriDate = hijriFormatter.format(selectedDate);

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
          color: currentTheme === "light" ? colors.primary : "#2E7D32",
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
          onPrev={() => {
            const newDate = new Date(
              selectedDate.getFullYear(),
              selectedDate.getMonth(),
              selectedDate.getDate() - 1
            );
            setSelectedDate(newDate);
            setDisplayDate(newDate);
          }}
          onNext={() => {
            const newDate = new Date(
              selectedDate.getFullYear(),
              selectedDate.getMonth(),
              selectedDate.getDate() + 1
            );
            setSelectedDate(newDate);
            setDisplayDate(newDate);
          }}
          onReset={() => {
            const today = new Date();
            setSelectedDate(today);
            setDisplayDate(today);
          }}
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
                currentTheme === "light" ? colors.primary : "#2E7D32",
            },
          }}
          theme={{
            backgroundColor: "transparent",
            calendarBackground:
              currentTheme === "light" ? colors.cardBG : "rgba(34,40,58,0.32)",
            textSectionTitleColor:
              currentTheme === "light" ? colors.textSecondary : "#fffbe8",
            dayTextColor: currentTheme === "light" ? colors.text : "#fff",
            monthTextColor:
              currentTheme === "light" ? colors.primary : "#FFD700",
            todayTextColor:
              currentTheme === "light" ? colors.primary : "#00CFFF",
            selectedDayTextColor:
              currentTheme === "light" ? "#FFFFFF" : "#fffbe8",
            selectedDayBackgroundColor:
              currentTheme === "light" ? colors.primary : "#2E7D32",
            textDisabledColor:
              currentTheme === "light" ? colors.textSecondary : "#bbb",
            dotColor: currentTheme === "light" ? colors.primary : "#FFD700",
            selectedDotColor:
              currentTheme === "light" ? colors.primary : "#FFD700",
            arrowColor: currentTheme === "light" ? colors.primary : "#FFD700",
            indicatorColor:
              currentTheme === "light" ? colors.primary : "#FFD700",
            textDayFontWeight: "700",
            textMonthFontWeight: "bold",
            textDayHeaderFontWeight: "700",
            ...calendarTextSizes,
          }}
          style={styles.calendar}
        />

        {eventsToday.length > 0 && (
          <View style={styles.eventsContainer}>
            <Text style={styles.eventsTitle}>
              {t("religious_events_today")}
            </Text>
            {eventsToday.map((event, idx) => (
              <Text key={idx} style={styles.eventItem}>
                • {t(event.name)}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>
    </ThemedImageBackground>
  );
}
