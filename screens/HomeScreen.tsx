import { schedulePrayerNotifications } from "@/utils/notifications";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { reverseGeocodeAsync } from "expo-location";
import * as Notifications from "expo-notifications";
import React, { useContext, useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Linking,
  NativeModules,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import bgImage from "../assets/images/prayer-bg.png";
import { DateNavigator } from "../components/DateNavigator";
import { Colors } from "../constants/Colors";
import { SettingsContext } from "../contexts/SettingsContext";
import { useLocation } from "../hooks/useLocation";
import { usePrayerTimes } from "../hooks/usePrayerTimes";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";

// --- Types ---
type PrayerTimes = { [key: string]: Date };

const iconByPrayer: Record<string, { name: string; color: string }> = {
  Fajr: { name: "weather-sunset-up", color: Colors.accent },
  Dhuhr: { name: "white-balance-sunny", color: Colors.primary },
  Asr: { name: "weather-sunny", color: Colors.primary },
  Maghrib: { name: "weather-sunset-down", color: Colors.accent },
  Isha: { name: "weather-night", color: Colors.textSub },
};

// --- Native alarms (Android) ---
function scheduleNativeAdhan(
  prayerTimes: PrayerTimes,
  adhanSound: string,
  notificationsEnabled: boolean
) {
  if (Platform.OS === "android") {
    if (!notificationsEnabled) {
      NativeModules.AdhanModule.cancelAllAlarms();
      return;
    }
    const timesMillis: Record<string, number> = {};
    for (const [label, date] of Object.entries(prayerTimes)) {
      timesMillis[label] = date.getTime();
    }
    NativeModules.AdhanModule.scheduleAdhanAlarms(timesMillis, adhanSound);
  }
}

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const location = useLocation().location; // Only location object
  const { error: locationError } = useLocation();

  const [today, setToday] = useState(new Date());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [city, setCity] = useState<string | null>(null);

  const {
    notificationsEnabled,
    adhanSound,
    remindersEnabled,
    reminderOffset,
    locationMode,
    manualLocation,
    setLocationMode,
  } = useContext(SettingsContext);

  // ==== Ajout du useEffect ici (une seule fois au démarrage !) ====
  useEffect(() => {
    NativeModules.AdhanModule.cancelAllAdhanAlarms?.();
  }, []);

  // ==== HOOKS usePrayerTimes ====
  const manualLocationObj = useMemo(
    () =>
      manualLocation && manualLocation.lat && manualLocation.lon
        ? {
            coords: {
              latitude: manualLocation.lat,
              longitude: manualLocation.lon,
              altitude: 0,
              accuracy: 10,
              altitudeAccuracy: 10,
              heading: 0,
              speed: 0,
            },
            timestamp: Date.now(),
            mocked: true,
          }
        : null,
    [manualLocation]
  );

  const manualPrayerTimesToday = usePrayerTimes(manualLocationObj, today);
  const autoPrayerTimesToday = usePrayerTimes(location, today);

  const manualPrayerTimesCurrentDate = usePrayerTimes(
    manualLocationObj,
    currentDate
  );
  const autoPrayerTimesCurrentDate = usePrayerTimes(location, currentDate);

  // On choisit l'un ou l'autre selon le mode
  const timesForToday =
    locationMode === "manual" && manualLocationObj
      ? manualPrayerTimesToday
      : locationMode === "auto"
      ? autoPrayerTimesToday
      : null;

  const timesForCurrentDate =
    locationMode === "manual" && manualLocationObj
      ? manualPrayerTimesCurrentDate
      : locationMode === "auto"
      ? autoPrayerTimesCurrentDate
      : null;

  function formatCity(
    city: string | null | undefined,
    country: string | null | undefined
  ): string {
    if (!city) return country || "";
    if (!country) return city;
    const cityNorm = city.trim().toLowerCase();
    const countryNorm = country.trim().toLowerCase();
    if (
      cityNorm.endsWith(countryNorm) ||
      cityNorm.endsWith(", " + countryNorm)
    ) {
      return city;
    }
    return city + ", " + country;
  }
  const [selectedLang, setSelectedLang] = useState(i18n.language);
  useEffect(() => {
    AsyncStorage.getItem("appLanguage").then((savedLang) => {
      if (savedLang && savedLang !== i18n.language) {
        i18n.changeLanguage(savedLang);
        setSelectedLang(savedLang);
      }
    });
  }, []);

  // ==== Ville (affichage) ====
  useEffect(() => {
    async function fetchCity() {
      if (locationMode === "manual" && manualLocation?.city) {
        setCity(formatCity(manualLocation.city, manualLocation.country));
      } else if (location && location.coords) {
        try {
          const [reverseGeocode] = await reverseGeocodeAsync(location.coords);

          if (reverseGeocode && reverseGeocode.city) {
            setCity(formatCity(reverseGeocode.city, reverseGeocode.country));
          } else {
            setCity(null);
          }
        } catch {
          setCity(null);
        }
      } else {
        setCity(null);
      }
    }
    fetchCity();
  }, [locationMode, manualLocation, location, i18n.language]);

  // ==== Demande permission notifications (au lancement) ====
  useEffect(() => {
    async function askNotifPermission() {
      if (Platform.OS === "android" && Platform.Version >= 33) {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            t("notifications_disabled_title"),
            t("notifications_disabled_message"),
            [
              {
                text: t("open_settings"),
                onPress: () => Linking.openSettings(),
              },
              { text: t("cancel"), style: "cancel" },
            ]
          );
        }
      }
    }
    askNotifPermission();
  }, [t]);

  // ==== Planification notifications et alarmes ====
  useEffect(() => {
    if (!timesForCurrentDate) return;
    if (!notificationsEnabled) {
      NativeModules.AdhanModule.cancelAllAdhanAlarms?.();
      Notifications.cancelAllScheduledNotificationsAsync();
      return;
    }
    const nowMillis = Date.now();
    const futurePrayerTimes = Object.fromEntries(
      Object.entries({
        Fajr: timesForCurrentDate.fajr,
        Dhuhr: timesForCurrentDate.dhuhr,
        Asr: timesForCurrentDate.asr,
        Maghrib: timesForCurrentDate.maghrib,
        Isha: timesForCurrentDate.isha,
      }).filter(([_, date]) => date.getTime() > nowMillis)
    );
    NativeModules.AdhanModule.cancelAllAdhanAlarms?.();
    Notifications.cancelAllScheduledNotificationsAsync();
    scheduleNativeAdhan(futurePrayerTimes, adhanSound, notificationsEnabled);
    if (remindersEnabled) {
      const reminderTimes: Record<string, Date> = {};
      for (const [label, date] of Object.entries(futurePrayerTimes)) {
        const reminderDate = new Date(date.getTime() - reminderOffset * 60000);
        if (reminderDate > new Date()) {
          reminderTimes[label] = reminderDate;
        }
      }
      schedulePrayerNotifications(
        reminderTimes,
        adhanSound,
        true,
        reminderOffset
      );
    } else {
      Notifications.cancelAllScheduledNotificationsAsync();
    }
  }, [
    timesForCurrentDate,
    notificationsEnabled,
    adhanSound,
    remindersEnabled,
    reminderOffset,
  ]);

  // ==== Mise à jour minuit ====
  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0
    );
    const msUntilMidnight = nextMidnight.getTime() - now.getTime();
    const timer = setTimeout(() => {
      const newDate = new Date();
      setCurrentDate(newDate);
      setToday(newDate);
    }, msUntilMidnight + 1000);
    return () => clearTimeout(timer);
  }, [currentDate]);

  const isLocationLoading =
    locationMode === "auto" && (!location || !location.coords);

  // ==== Blocage UX si pas de localisation ====
  const missingLocation =
    (locationMode === "manual" &&
      (!manualLocation || !manualLocation.lat || !manualLocation.lon)) ||
    (locationMode === "auto" && (!location || !location.coords));

  if (missingLocation) {
    // Cas où le mode auto est sélectionné mais que la localisation n'est pas prête
    if (isLocationLoading) {
      return (
        <ImageBackground source={bgImage} style={styles.background}>
          <View
            style={[styles.container, { justifyContent: "center", flex: 1 }]}
          >
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={{ textAlign: "center", marginTop: 20 }}>
              {t("waiting_for_location")}
            </Text>
          </View>
        </ImageBackground>
      );
    }

    // Cas normal : pas de config, affiche les boutons
    return (
      <ImageBackground source={bgImage} style={styles.background}>
        <View style={[styles.container, { justifyContent: "center", flex: 1 }]}>
          <Text style={styles.header}>{t("prayer_times")}</Text>
          <Text style={styles.error}>
            {locationMode === "manual"
              ? t("no_city_selected")
              : locationError || t("location_not_available")}
          </Text>
          <Text style={{ textAlign: "center", marginBottom: 16 }}>
            {t("to_display_prayers")}
          </Text>
          <TouchableOpacity
            style={styles.choiceBtn}
            onPress={() => router.push("/settings")}
          >
            <Text style={styles.choiceBtnText}>{t("enter_city_name")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.choiceBtn}
            onPress={() => setLocationMode("auto")}
          >
            <Text style={styles.choiceBtnText}>
              {t("enable_auto_location")}
            </Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    );
  }

  if (!timesForToday) return <ActivityIndicator style={styles.loader} />;

  const prayerArray: { label: string; time: Date }[] = [
    { label: "Fajr", time: timesForToday.fajr },
    { label: "Dhuhr", time: timesForToday.dhuhr },
    { label: "Asr", time: timesForToday.asr },
    { label: "Maghrib", time: timesForToday.maghrib },
    { label: "Isha", time: timesForToday.isha },
  ];

  return (
    <ImageBackground source={bgImage} style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>{t("prayer_times")}</Text>
        <Text style={styles.coords}>
          {city ? `📍 ${city}` : t("unknown_city")}
        </Text>
        <DateNavigator
          date={today}
          onPrev={() =>
            setToday(
              (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)
            )
          }
          onNext={() =>
            setToday(
              (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
            )
          }
          onReset={() => setToday(new Date())}
        />
        {prayerArray.map(({ label, time }) => {
          const icon = iconByPrayer[label] || {
            name: "clock",
            color: Colors.text,
          };
          return (
            <ImageBackground
              key={label}
              source={require("../assets/images/parchment_bg.jpg")}
              style={styles.cardBG}
              imageStyle={{ borderRadius: 18, resizeMode: "cover" }}
            >
              <View style={styles.cardContent}>
                <MaterialCommunityIcons
                  name={icon.name as any}
                  size={24}
                  color={icon.color}
                />
                <Text style={styles.cardLabel}>{label}</Text>
                <Text style={styles.cardTime}>
                  {time.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </ImageBackground>
          );
        })}
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20 },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 70,
  },
  coords: {
    fontSize: 14,
    color: "#00100",
    textAlign: "center",
    marginVertical: 8,
  },
  error: { color: "red", textAlign: "center", marginBottom: 12 },
  loader: { flex: 1, justifyContent: "center" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.cardBG,
    padding: 16,
    marginVertical: 6,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 18,
    color: Colors.text,
    fontWeight: "600",
  },
  cardTime: {
    fontSize: 18,
    color: Colors.primary,
    fontWeight: "700",
    marginLeft: 12,
  },
  background: {
    flex: 1,
    resizeMode: "cover",
  },
  choiceBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 6,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginVertical: 10,
    alignItems: "center",
  },
  choiceBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  cardBG: {
    borderRadius: 18,
    overflow: "hidden",
    marginVertical: 8,
    // largeur pour un beau rendu (tu peux adapter)
    minHeight: 64,
    justifyContent: "center",
    // Si tu veux une ombre :
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
});
