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

// Helper pour formater la date en YYYY-MM-DD locale
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

  // Format Hijri
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
        contentContainerStyle={styles.container}
      >
        <Text style={[styles.header, { color: Colors.text }]}>
          {t("hijri_calendar")}
        </Text>

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
          <Text style={[styles.label, { color: Colors.text }]}>
            {t("gregorian_date")}
          </Text>
          <Text style={[styles.value, { color: Colors.text }]}>
            {selectedDate.toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: Colors.text }]}>
            {t("hijri_date")}
          </Text>
          <Text style={[styles.value, { color: Colors.text }]}>
            {hijriDate}
          </Text>
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
            calendarBackground: "transparent",
            textSectionTitleColor: Colors.text,
            selectedDayBackgroundColor: Colors.primary,
            selectedDayTextColor: Colors.background,
            todayTextColor: Colors.accent,
            dayTextColor: Colors.text,
            textDisabledColor: Colors.textSub,
            arrowColor: Colors.primary,
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
              <Text key={idx} style={{ fontSize: 16, color: "#ffffff" }}>
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
    marginTop: 70,
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  label: { fontSize: 18 },
  value: { fontSize: 18, fontWeight: "bold" },
  calendar: {
    borderRadius: 8,
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
});
