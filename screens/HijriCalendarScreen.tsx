import { useState } from "react";
import {
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import bgImage from "../assets/images/prayer-bg.png";
import { DateNavigator } from "../components/DateNavigator";
import { Colors } from "../constants/Colors";
import { getIslamicEventsForYear } from "../utils/islamicEvents";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function formatLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${year}-${pad(month)}-${pad(day)}`;
}

export default function HijriCalendarScreen() {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const events = getIslamicEventsForYear(selectedDate.getFullYear());
  const insets = useSafeAreaInsets();

  const hijriFormatter = new Intl.DateTimeFormat("fr-u-ca-islamic", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const hijriDate = hijriFormatter.format(selectedDate);

  const selectedDateString = formatLocalDateString(selectedDate);
  const eventsToday = events.filter(
    (event) => formatLocalDateString(event.date) === selectedDateString
  );

  const markedDates = events.reduce((acc, event) => {
    const dateStr = formatLocalDateString(event.date);
    acc[dateStr] = {
      marked: true,
      dots: [{ key: "event", color: Colors.primary }],
    };
    return acc;
  }, {} as Record<string, any>);

  return (
    <ImageBackground
      source={bgImage}
      style={styles.background}
      resizeMode="cover"
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: insets.bottom + 10 },
        ]}
      >
        <Text style={styles.header}>{t("hijri_calendar")}</Text>

        <DateNavigator
          date={selectedDate}
          onPrev={() =>
            setSelectedDate(
              (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)
            )
          }
          onNext={() =>
            setSelectedDate(
              (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
            )
          }
          onReset={() => setSelectedDate(new Date())}
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
          current={selectedDateString}
          onDayPress={(day) => {
            const [year, month, dayNum] = day.dateString.split("-").map(Number);
            setSelectedDate(new Date(year, month - 1, dayNum));
          }}
          markedDates={{
            ...markedDates,
            [selectedDateString]: {
              selected: true,
              selectedColor: Colors.primary,
            },
          }}
          theme={{
            backgroundColor: "transparent",
            calendarBackground: "rgba(34,40,58,0.32)",
            textSectionTitleColor: "#fffbe8", // Noms des jours ("Lun", "Mar", etc.)
            dayTextColor: "#fff", // Jours du mois
            monthTextColor: "#FFD700", // Nom du mois (doré)
            todayTextColor: "#00CFFF", // Couleur du "Aujourd'hui"
            selectedDayTextColor: "#fffbe8",
            selectedDayBackgroundColor: Colors.primary,
            textDisabledColor: "#bbb", // Jours grisés
            dotColor: "#FFD700", // Points d’évènements
            selectedDotColor: "#FFD700",
            arrowColor: "#FFD700", // Flèches navigation
            indicatorColor: "#FFD700",
            textDayFontWeight: "700",
            textMonthFontWeight: "bold",
            textDayHeaderFontWeight: "700",
            textDayFontSize: 18,
            textMonthFontSize: 20,
            textDayHeaderFontSize: 16,
          }}
          style={styles.calendar}
        />

        {eventsToday.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text
              style={{
                fontWeight: "bold",
                fontSize: 18,
                color: Colors.primary,
              }}
            >
              {t("religious_events_today")}
            </Text>
            {eventsToday.map((event, idx) => (
              <Text key={idx} style={{ fontSize: 16, color: "#fffbe8" }}>
                • {t(event.name)}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  scroll: { flex: 1, backgroundColor: "transparent" },
  container: { flexGrow: 1, padding: 20 },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#fffbe8",
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e7c86a", // Jaune doux
  },
  label: { fontSize: 18, color: "#fffbe8", fontWeight: "600" },
  value: { fontSize: 18, fontWeight: "bold", color: "#FFD700" },
  calendar: {
    borderRadius: 8,
    marginTop: 16,
    backgroundColor: "rgba(34,40,58,0.32)", // Un fond très légèrement opaque
    overflow: "hidden",
  },
});
