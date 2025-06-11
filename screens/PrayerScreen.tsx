import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, {
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  NativeModules,
  Animated,
  StatusBar,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import bgImage from "../assets/images/prayer-bg.png";
import { DateNavigator } from "../components/DateNavigator";
import { SunInfo } from "../components/SunInfo";
import WeeklyPrayerView from "../components/WeeklyPrayerView";
import PrayerStats from "../components/PrayerStats";
import { Colors } from "../constants/Colors";
import { SettingsContext } from "../contexts/SettingsContext";
import { useTranslation } from "react-i18next";
import { reverseGeocodeAsync } from "expo-location";
import { useLocation } from "../hooks/useLocation";
import { usePrayerTimes } from "../hooks/usePrayerTimes";
import { useWeeklyPrayerTimes } from "../hooks/useWeeklyPrayerTimes";
import { scheduleNotificationsFor2Days } from "../utils/sheduleAllNotificationsFor30Days";
import { useFocusEffect } from "@react-navigation/native";

const { AdhanModule } = NativeModules;
const { width: screenWidth } = Dimensions.get("window");

const iconByPrayer: Record<
  string,
  { name: string; color: string; bgColor: string }
> = {
  Fajr: {
    name: "weather-sunset-up",
    color: "#FF6B6B",
    bgColor: "rgba(255, 107, 107, 0.15)",
  },
  Sunrise: {
    name: "weather-sunny",
    color: "#FFD93D",
    bgColor: "rgba(255, 217, 61, 0.15)",
  },
  Dhuhr: {
    name: "white-balance-sunny",
    color: "#4ECDC4",
    bgColor: "rgba(78, 205, 196, 0.15)",
  },
  Asr: {
    name: "weather-sunny",
    color: "#45B7D1",
    bgColor: "rgba(69, 183, 209, 0.15)",
  },
  Maghrib: {
    name: "weather-sunset-down",
    color: "#F093FB",
    bgColor: "rgba(240, 147, 251, 0.15)",
  },
  Isha: {
    name: "weather-night",
    color: "#4C63D2",
    bgColor: "rgba(76, 99, 210, 0.15)",
  },
};

export default function PrayerScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [today, setToday] = useState(new Date());
  const [city, setCity] = useState<string | null>(null);

  // Animations
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const [pulseAnim] = useState(new Animated.Value(1));

  const settings = useContext(SettingsContext);
  const { location } = useLocation();

  // Créer l'objet de localisation manuelle de manière stable
  const manualLocationObj = useMemo(
    () =>
      settings.manualLocation &&
      settings.manualLocation.lat &&
      settings.manualLocation.lon
        ? {
            coords: {
              latitude: settings.manualLocation.lat,
              longitude: settings.manualLocation.lon,
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
    [settings.manualLocation?.lat, settings.manualLocation?.lon]
  );

  // Obtenir les horaires selon le mode choisi
  const locationToUse =
    settings.locationMode === "manual" && manualLocationObj
      ? manualLocationObj
      : settings.locationMode === "auto"
      ? location
      : null;

  const currentPrayerTimes = usePrayerTimes(locationToUse, today);
  const weekPrayerTimes = useWeeklyPrayerTimes(locationToUse, today);

  // Animation d'entrée
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Animation de pulsation pour la prochaine prière
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, []);

  // Calculer le temps jusqu'à la prochaine prière en minutes
  const getTimeUntilNextInMinutes = () => {
    if (!currentPrayerTimes) return 0;

    const currentTime = new Date();
    const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

    for (const prayer of prayers) {
      const prayerTime =
        (currentPrayerTimes as any)[prayer.toLowerCase()] ||
        (currentPrayerTimes as any)[prayer];
      if (prayerTime && currentTime < prayerTime) {
        return Math.floor(
          (prayerTime.getTime() - currentTime.getTime()) / (1000 * 60)
        );
      }
    }
    return 0;
  };

  // Calculer les statistiques des prières
  const prayerStats = useMemo(() => {
    if (!currentPrayerTimes) return null;

    const dayLength = Math.round(
      (currentPrayerTimes.maghrib.getTime() -
        currentPrayerTimes.sunrise.getTime()) /
        (1000 * 60)
    );

    const fajrToSunrise = Math.round(
      (currentPrayerTimes.sunrise.getTime() -
        currentPrayerTimes.fajr.getTime()) /
        (1000 * 60)
    );

    const sunsetToIsha = Math.round(
      (currentPrayerTimes.isha.getTime() -
        currentPrayerTimes.maghrib.getTime()) /
        (1000 * 60)
    );

    const prayerSpacing = {
      fajrToSunrise,
      sunriseToZuhr: Math.round(
        (currentPrayerTimes.dhuhr.getTime() -
          currentPrayerTimes.sunrise.getTime()) /
          (1000 * 60)
      ),
      zuhrToAsr: Math.round(
        (currentPrayerTimes.asr.getTime() -
          currentPrayerTimes.dhuhr.getTime()) /
          (1000 * 60)
      ),
      asrToMaghrib: Math.round(
        (currentPrayerTimes.maghrib.getTime() -
          currentPrayerTimes.asr.getTime()) /
          (1000 * 60)
      ),
      maghribToIsha: Math.round(
        (currentPrayerTimes.isha.getTime() -
          currentPrayerTimes.maghrib.getTime()) /
          (1000 * 60)
      ),
    };

    return {
      dayLength,
      fajrToSunrise,
      sunsetToIsha,
      prayerSpacing,
    };
  }, [currentPrayerTimes]);

  // Si c'est en cours de chargement
  if (settings.isLoading) {
    return (
      <ImageBackground source={bgImage} style={styles.background}>
        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />
        <View style={styles.centeredContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>
              {t("loading_settings") || "Chargement..."}
            </Text>
          </View>
        </View>
      </ImageBackground>
    );
  }

  // Si c'est la première utilisation (locationMode === null)
  if (settings.locationMode === null) {
    return (
      <ImageBackground source={bgImage} style={styles.background}>
        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />
        <View style={styles.centeredContainer}>
          <Animated.View style={[styles.setupCard, { opacity: fadeAnim }]}>
            <MaterialCommunityIcons
              name="map-marker-radius"
              size={70}
              color={Colors.primary}
              style={styles.setupIcon}
            />
            <Text style={styles.setupTitle}>{t("prayer_times")}</Text>
            <Text style={styles.setupSubtitle}>
              {t("first_time_welcome") ||
                "Bienvenue ! Choisissez votre mode de localisation :"}
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push("/settings")}
            >
              <MaterialCommunityIcons name="city" size={24} color="#fff" />
              <Text style={styles.primaryButtonText}>
                {t("enter_city") || "Entrer ville manuellement"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={async () => {
                settings.setLocationMode("auto");
                try {
                  await settings.refreshAutoLocation();
                } catch (error) {
                  console.error("Erreur refresh auto location:", error);
                }
              }}
            >
              <MaterialCommunityIcons
                name="crosshairs-gps"
                size={24}
                color={Colors.primary}
              />
              <Text style={styles.secondaryButtonText}>
                {t("automatic") || "Utiliser GPS automatique"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ImageBackground>
    );
  }

  // Si on a une erreur de localisation
  if (settings.errorMsg) {
    return (
      <ImageBackground source={bgImage} style={styles.background}>
        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />
        <View style={styles.centeredContainer}>
          <View style={styles.errorCard}>
            <MaterialCommunityIcons
              name="alert-circle"
              size={60}
              color="#ff6b6b"
              style={styles.errorIcon}
            />
            <Text style={styles.errorTitle}>{t("prayer_times")}</Text>
            <Text style={styles.errorText}>{settings.errorMsg}</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push("/settings")}
            >
              <MaterialCommunityIcons name="cog" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>
                {t("settings") || "Aller aux paramètres"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    );
  }

  // Si on n'a pas encore d'horaires de prières
  if (!currentPrayerTimes) {
    return (
      <ImageBackground source={bgImage} style={styles.background}>
        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />
        <View style={styles.centeredContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>
              {t("calculating_prayer_times") || "Calcul des horaires..."}
            </Text>
          </View>
        </View>
      </ImageBackground>
    );
  }

  const currentTime = new Date();
  const { nextPrayer, timeUntilNext } = getNextPrayer(
    currentPrayerTimes as unknown as Record<string, Date>,
    currentTime
  );

  const minutesUntilNext = getTimeUntilNextInMinutes();

  return (
    <ImageBackground source={bgImage} style={styles.background}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <Animated.ScrollView
        contentContainerStyle={styles.container}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        showsVerticalScrollIndicator={false}
      >
        {/* En-tête avec navigation de date */}
        <View style={styles.header}>
          <Text style={styles.mainTitle}>{t("prayer_times")}</Text>
          <DateNavigator
            date={today}
            onPrev={() =>
              setToday(new Date(today.getTime() - 24 * 60 * 60 * 1000))
            }
            onNext={() =>
              setToday(new Date(today.getTime() + 24 * 60 * 60 * 1000))
            }
            onReset={() => setToday(new Date())}
          />
        </View>

        {/* Carte de la prochaine prière */}
        {nextPrayer && (
          <Animated.View
            style={[
              styles.nextPrayerCard,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <View style={styles.nextPrayerHeader}>
              <MaterialCommunityIcons
                name="bell-ring-outline"
                size={24}
                color="#4ECDC4"
              />
              <Text style={styles.nextPrayerTitle}>{t("next_prayer")}</Text>
            </View>
            <View style={styles.nextPrayerContent}>
              <Text style={styles.prayerName}>
                {t(nextPrayer.toLowerCase())}
              </Text>
              <Text style={styles.timeUntil}>
                {minutesUntilNext > 60
                  ? `${Math.floor(minutesUntilNext / 60)}h ${
                      minutesUntilNext % 60
                    }m`
                  : `${minutesUntilNext}m`}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Grille des horaires du jour */}
        {currentPrayerTimes && (
          <View style={styles.todayPrayersCard}>
            <View style={styles.todayPrayersHeader}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={24}
                color="#4ECDC4"
              />
              <Text style={styles.todayPrayersTitle}>{t("today_prayers")}</Text>
            </View>
            <View style={styles.prayerGrid}>
              {["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"].map(
                (prayer) => {
                  const time =
                    currentPrayerTimes[
                      prayer as keyof typeof currentPrayerTimes
                    ];
                  const isPassed = time instanceof Date && new Date() > time;
                  const isNext = nextPrayer?.toLowerCase() === prayer;

                  return (
                    <View
                      key={prayer}
                      style={[
                        styles.prayerItem,
                        isPassed && !isNext && styles.prayerItemPassed,
                        isNext && styles.nextPrayerItem,
                      ]}
                    >
                      <View style={styles.prayerItemContent}>
                        <Text
                          style={[
                            styles.prayerItemName,
                            isPassed && !isNext && styles.prayerItemTextPassed,
                            isNext && styles.nextPrayerItemText,
                          ]}
                        >
                          {t(prayer)}
                        </Text>
                        <Text
                          style={[
                            styles.prayerItemTime,
                            isPassed && !isNext && styles.prayerItemTextPassed,
                            isNext && styles.nextPrayerItemText,
                          ]}
                        >
                          {time instanceof Date
                            ? time.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "--:--"}
                        </Text>
                      </View>
                      {isPassed && !isNext && (
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={16}
                          color="#4ECDC4"
                          style={styles.prayerItemCheck}
                        />
                      )}
                    </View>
                  );
                }
              )}
            </View>
          </View>
        )}

        {/* Informations solaires */}
        <SunInfo
          sunrise={currentPrayerTimes?.sunrise || null}
          sunset={currentPrayerTimes?.maghrib || null}
          currentTime={new Date()}
        />

        {/* Vue hebdomadaire */}
        {weekPrayerTimes && weekPrayerTimes.length > 0 && (
          <WeeklyPrayerView
            currentDate={today}
            weekPrayerTimes={weekPrayerTimes}
            onDayPress={(date: Date) => setToday(date)}
          />
        )}

        {/* Statistiques des prières */}
        {prayerStats && <PrayerStats {...prayerStats} />}
      </Animated.ScrollView>
    </ImageBackground>
  );
}

// Fonction utilitaire pour trouver la prochaine prière
function getNextPrayer(
  prayerTimes: Record<string, Date>,
  currentTime: Date
): { nextPrayer: string | null; timeUntilNext: string } {
  const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

  for (const prayer of prayers) {
    const prayerTime = prayerTimes[prayer];
    if (prayerTime && currentTime < prayerTime) {
      const diff = prayerTime.getTime() - currentTime.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      let timeText = "";
      if (hours > 0) {
        timeText += `${hours}h `;
      }
      timeText += `${minutes}min`;

      return { nextPrayer: prayer, timeUntilNext: timeText };
    }
  }

  return { nextPrayer: null, timeUntilNext: "" };
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingTop: StatusBar.currentHeight || 0,
  },
  header: {
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  nextPrayerCard: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(78, 205, 196, 0.3)",
    shadowColor: "#4ECDC4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  nextPrayerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  nextPrayerTitle: {
    fontSize: 18,
    color: "#4ECDC4",
    marginLeft: 8,
    fontWeight: "600",
  },
  nextPrayerContent: {
    alignItems: "center",
  },
  prayerName: {
    fontSize: 24,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 8,
  },
  timeUntil: {
    fontSize: 36,
    color: "#4ECDC4",
    fontWeight: "bold",
  },
  todayPrayersCard: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(78, 205, 196, 0.3)",
    shadowColor: "#4ECDC4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  todayPrayersHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  todayPrayersTitle: {
    fontSize: 18,
    color: "#4ECDC4",
    marginLeft: 8,
    fontWeight: "600",
  },
  prayerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  prayerItem: {
    backgroundColor: "rgba(78, 205, 196, 0.1)",
    borderRadius: 12,
    padding: 12,
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  prayerItemContent: {
    flex: 1,
  },
  prayerItemPassed: {
    backgroundColor: "rgba(78, 205, 196, 0.15)",
    borderColor: "rgba(78, 205, 196, 0.3)",
    borderWidth: 1,
  },
  nextPrayerItem: {
    backgroundColor: "rgba(78, 205, 196, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(78, 205, 196, 0.3)",
  },
  prayerItemName: {
    fontSize: 14,
    color: "#fffbe8",
    marginBottom: 4,
    fontWeight: "500",
  },
  prayerItemTime: {
    fontSize: 16,
    color: "#4ECDC4",
    fontWeight: "600",
  },
  prayerItemTextPassed: {
    color: "#4ECDC4",
    opacity: 0.8,
  },
  nextPrayerItemText: {
    color: "#4ECDC4",
    fontWeight: "bold",
  },
  prayerItemCheck: {
    marginLeft: 8,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingCard: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  loadingText: {
    color: "#fffbe8",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 15,
  },
  setupCard: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    width: "100%",
    maxWidth: 320,
  },
  setupIcon: {
    marginBottom: 20,
  },
  setupTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fffbe8",
    marginBottom: 12,
    textAlign: "center",
  },
  setupSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 12,
    marginBottom: 12,
    width: "100%",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    width: "100%",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  errorCard: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.3)",
    width: "100%",
    maxWidth: 320,
  },
  errorIcon: {
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fffbe8",
    marginBottom: 12,
    textAlign: "center",
  },
  errorText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 22,
  },
});
