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
import { Colors } from "../constants/Colors";
import { SettingsContext } from "../contexts/SettingsContext";
import { useTranslation } from "react-i18next";
import { reverseGeocodeAsync } from "expo-location";
import { useLocation } from "../hooks/useLocation";
import { usePrayerTimes } from "../hooks/usePrayerTimes";
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

export default function HomeScreen() {
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

  // Permission Android 13+
  useEffect(() => {
    async function askNotifPermission() {
      console.log(
        "[DEBUG] 🔐 Vérification permissions notifications Android 13+"
      );

      if (Platform.OS === "android" && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          "android.permission.POST_NOTIFICATIONS"
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            t("notifications_disabled_title") || "Notifications désactivées",
            t("notifications_disabled_message") ||
              "Vous devez autoriser les notifications pour recevoir les rappels de prière et de dhikr."
          );
        }
      }
    }
    askNotifPermission();
  }, [t]);

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

  // Obtenir les horaires selon le mode choisi (mais un seul hook à la fois)
  const locationToUse =
    settings.locationMode === "manual" && manualLocationObj
      ? manualLocationObj
      : settings.locationMode === "auto"
      ? location
      : null;

  const currentPrayerTimes = usePrayerTimes(locationToUse, today);

  // Stabiliser les dhikr settings
  const stableDhikrSettings = useMemo(
    () => ({
      enabledAfterSalah: settings.dhikrSettings?.enabledAfterSalah || false,
      delayAfterSalah: settings.dhikrSettings?.delayAfterSalah || 5,
      enabledMorningDhikr: settings.dhikrSettings?.enabledMorningDhikr || false,
      delayMorningDhikr: settings.dhikrSettings?.delayMorningDhikr || 10,
      enabledEveningDhikr: settings.dhikrSettings?.enabledEveningDhikr || false,
      delayEveningDhikr: settings.dhikrSettings?.delayEveningDhikr || 10,
      enabledSelectedDua: settings.dhikrSettings?.enabledSelectedDua || false,
      delaySelectedDua: settings.dhikrSettings?.delaySelectedDua || 15,
    }),
    [
      settings.dhikrSettings?.enabledAfterSalah,
      settings.dhikrSettings?.delayAfterSalah,
      settings.dhikrSettings?.enabledMorningDhikr,
      settings.dhikrSettings?.delayMorningDhikr,
      settings.dhikrSettings?.enabledEveningDhikr,
      settings.dhikrSettings?.delayEveningDhikr,
      settings.dhikrSettings?.enabledSelectedDua,
      settings.dhikrSettings?.delaySelectedDua,
    ]
  );

  // Stabiliser les coordonnées
  const stableCoords = useMemo(() => {
    if (settings.locationMode === "manual" && manualLocationObj) {
      return {
        latitude: manualLocationObj.coords.latitude,
        longitude: manualLocationObj.coords.longitude,
      };
    } else if (
      settings.locationMode === "auto" &&
      location &&
      location.coords
    ) {
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    }
    return null;
  }, [settings.locationMode, manualLocationObj, location]);

  // Planification des notifications (stabilisé)
  const updateNotifications = useCallback(async () => {
    if (!currentPrayerTimes || !stableCoords) {
      console.log(
        "[DEBUG] ⏸️ Notifications non mises à jour - données manquantes"
      );
      return;
    }

    try {
      console.log(
        "[DEBUG] 🔄 Mise à jour notifications pour le",
        today.toISOString(),
        {
          notificationsEnabled: settings.notificationsEnabled,
          remindersEnabled: settings.remindersEnabled,
          finalRemindersEnabled:
            settings.notificationsEnabled && settings.remindersEnabled,
          ...stableDhikrSettings,
          finalDhikrAfterSalah:
            settings.notificationsEnabled &&
            stableDhikrSettings.enabledAfterSalah,
          finalDhikrMorning:
            settings.notificationsEnabled &&
            stableDhikrSettings.enabledMorningDhikr,
          finalDhikrEvening:
            settings.notificationsEnabled &&
            stableDhikrSettings.enabledEveningDhikr,
          finalDhikrDua:
            settings.notificationsEnabled &&
            stableDhikrSettings.enabledSelectedDua,
        }
      );

      if (Platform.OS === "android" && AdhanModule) {
        // Si les notifications sont désactivées globalement, on annule tout et ON S'ARRÊTE
        if (!settings.notificationsEnabled) {
          console.log(
            "[DEBUG] 🚫 Notifications désactivées globalement - annulation de tout"
          );
          await AdhanModule.cancelAllAdhanAlarms();
          await AdhanModule.cancelAllPrayerReminders();
          await AdhanModule.cancelAllDhikrNotifications();
          return; // ON S'ARRÊTE ICI - Ne pas continuer
        }

        // On arrive ici UNIQUEMENT si les notifications sont activées

        // On annule d'abord toutes les notifications existantes
        await AdhanModule.cancelAllAdhanAlarms();
        await AdhanModule.cancelAllPrayerReminders();
        await AdhanModule.cancelAllDhikrNotifications();

        // Calculer les settings dhikr finaux
        const dhikrSettingsToSend = {
          ...stableDhikrSettings,
          enabledAfterSalah:
            settings.notificationsEnabled &&
            stableDhikrSettings.enabledAfterSalah,
          enabledMorningDhikr:
            settings.notificationsEnabled &&
            stableDhikrSettings.enabledMorningDhikr,
          enabledEveningDhikr:
            settings.notificationsEnabled &&
            stableDhikrSettings.enabledEveningDhikr,
          enabledSelectedDua:
            settings.notificationsEnabled &&
            stableDhikrSettings.enabledSelectedDua,
        };

        // Programmer les nouvelles notifications
        await scheduleNotificationsFor2Days({
          userLocation: stableCoords,
          calcMethod: settings.calcMethod,
          settings: {
            notificationsEnabled: true, // ICI c'est forcément true car on a vérifié avant
            adhanEnabled: true, // Si on arrive ici, l'adhan doit être activé
          },
          adhanSound: settings.adhanSound,
          remindersEnabled:
            settings.notificationsEnabled && settings.remindersEnabled,
          reminderOffset: settings.reminderOffset,
          dhikrSettings: dhikrSettingsToSend,
        });
      }
    } catch (error) {
      console.error(
        "[DEBUG] ❌ Erreur lors de la mise à jour des notifications:",
        error
      );
    }
  }, [
    currentPrayerTimes,
    stableCoords,
    settings.notificationsEnabled,
    settings.adhanSound,
    settings.remindersEnabled,
    settings.reminderOffset,
    settings.calcMethod,
    stableDhikrSettings,
  ]);

  useFocusEffect(
    useCallback(() => {
      updateNotifications();
    }, [updateNotifications])
  );

  // Timer pour vérifier périodiquement si on doit reprogrammer (après Isha) et mettre à jour le widget
  useEffect(() => {
    const checkAndReschedule = async () => {
      if (!currentPrayerTimes) return;

      const now = new Date();
      const ishaTime =
        currentPrayerTimes.isha || (currentPrayerTimes as any).Isha;

      if (ishaTime && now > ishaTime) {
        console.log(
          "[DEBUG] 🌙 Isha passé, vérification si reprogrammation nécessaire"
        );
        // Mettre à jour automatiquement la date pour demain
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        // Si on n'est pas déjà sur demain, passer à demain
        if (today.toDateString() !== tomorrow.toDateString()) {
          console.log("[DEBUG] 📅 Passage automatique au lendemain");
          setToday(tomorrow);

          // 📱 Forcer la mise à jour du widget pour le nouveau jour
          if (Platform.OS === "android" && AdhanModule) {
            try {
              console.log(
                "[DEBUG] 📱 Mise à jour du widget pour le nouveau jour"
              );
              await AdhanModule.updateWidget?.();
            } catch (error) {
              console.error("[DEBUG] ❌ Erreur mise à jour widget:", error);
            }
          }
        }
      }
    };

    // Vérifier toutes les 30 secondes
    const interval = setInterval(checkAndReschedule, 30000);

    // Vérification immédiate
    checkAndReschedule();

    return () => clearInterval(interval);
  }, [currentPrayerTimes, today]);

  // Gestion simple de l'affichage de la ville
  useEffect(() => {
    async function updateCity() {
      if (settings.locationMode === "manual" && settings.manualLocation?.city) {
        setCity(settings.manualLocation.city);
      } else if (settings.locationMode === "auto" && location?.coords) {
        try {
          const geocodeResult = await reverseGeocodeAsync(location.coords);
          if (geocodeResult && geocodeResult.length > 0) {
            const firstResult = geocodeResult[0];
            const cityName =
              firstResult.city || firstResult.district || firstResult.region;
            const country = firstResult.country;
            if (cityName && country) {
              setCity(`${cityName}, ${country}`);
            } else if (cityName) {
              setCity(cityName);
            } else {
              setCity("Localisation inconnue");
            }
          }
        } catch (error) {
          console.error("Erreur reverse geocoding:", error);
          setCity("Erreur de localisation");
        }
      } else {
        setCity(null);
      }
    }

    updateCity();
  }, [
    settings.locationMode,
    settings.manualLocation?.city,
    location?.coords?.latitude,
    location?.coords?.longitude,
  ]);

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
        {/* Header moderne avec titre et localisation */}
        <View style={styles.modernHeader}>
          <Text style={styles.mainTitle}>{t("prayer_times")}</Text>
          {city && (
            <View style={styles.locationBadge}>
              <MaterialCommunityIcons
                name="map-marker"
                size={16}
                color={Colors.primary}
              />
              <Text style={styles.locationText}>
                {city}
                {settings.locationMode === "manual" && " (Manuel)"}
              </Text>
            </View>
          )}
        </View>

        {/* Navigation de date stylisée */}
        <View style={styles.dateNavigationContainer}>
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

        {/* Carte premium de la prochaine prière */}
        {nextPrayer && (
          <Animated.View
            style={[
              styles.nextPrayerCard,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <View style={styles.nextPrayerHeader}>
              <Text style={styles.nextPrayerLabel}>{t("next_prayer")}</Text>
              <View style={styles.urgencyIndicator}>
                <MaterialCommunityIcons
                  name={minutesUntilNext < 30 ? "clock-alert" : "clock"}
                  size={16}
                  color={minutesUntilNext < 30 ? "#ff6b6b" : "#4ECDC4"}
                />
                <Text
                  style={[
                    styles.urgencyText,
                    { color: minutesUntilNext < 30 ? "#ff6b6b" : "#4ECDC4" },
                  ]}
                >
                  {minutesUntilNext < 30 ? "Urgent" : "À venir"}
                </Text>
              </View>
            </View>

            <View style={styles.nextPrayerContent}>
              <View style={styles.nextPrayerMainInfo}>
                <View
                  style={[
                    styles.nextPrayerIconCircle,
                    { backgroundColor: iconByPrayer[nextPrayer]?.bgColor },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={(iconByPrayer[nextPrayer]?.name as any) || "clock"}
                    size={32}
                    color={iconByPrayer[nextPrayer]?.color}
                  />
                </View>
                <View style={styles.nextPrayerTextInfo}>
                  <Text style={styles.nextPrayerName}>
                    {t(nextPrayer.toLowerCase()) || nextPrayer}
                  </Text>
                  <Text style={styles.nextPrayerCountdown}>
                    {timeUntilNext}
                  </Text>
                </View>
              </View>

              {/* Barre de progression moderne */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(
                          100,
                          ((360 - minutesUntilNext) / 360) * 100
                        )}%`,
                        backgroundColor:
                          minutesUntilNext < 30 ? "#ff6b6b" : "#4ECDC4",
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {Math.round(
                    Math.min(100, ((360 - minutesUntilNext) / 360) * 100)
                  )}
                  % du temps écoulé
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Grille compacte des horaires de prière (2x3) */}
        <View style={styles.prayerGrid}>
          {["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"].map(
            (prayer, index) => {
              const time =
                (currentPrayerTimes as any)[prayer.toLowerCase()] ||
                (currentPrayerTimes as any)[prayer];
              const icon = iconByPrayer[prayer];
              const isNext = prayer === nextPrayer;
              const isPassed = time && currentTime > time;

              return (
                <Animated.View
                  key={prayer}
                  style={[
                    styles.prayerCard,
                    isNext && styles.prayerCardActive,
                    isPassed && !isNext && styles.prayerCardPassed,
                    {
                      opacity: fadeAnim,
                      transform: [
                        {
                          translateY: slideAnim.interpolate({
                            inputRange: [0, 30],
                            outputRange: [index * 2, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.prayerCardContent}>
                    <View
                      style={[
                        styles.prayerIconContainer,
                        { backgroundColor: icon?.bgColor },
                        isNext && styles.prayerIconContainerActive,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={icon?.name as any}
                        size={18}
                        color={icon?.color}
                      />
                    </View>

                    <View style={styles.prayerInfo}>
                      <Text
                        style={[
                          styles.prayerLabel,
                          isNext && styles.prayerLabelActive,
                          isPassed && !isNext && styles.prayerLabelPassed,
                        ]}
                      >
                        {t(prayer.toLowerCase()) || prayer}
                      </Text>

                      <Text
                        style={[
                          styles.prayerTime,
                          isNext && styles.prayerTimeActive,
                          isPassed && !isNext && styles.prayerTimePassed,
                        ]}
                      >
                        {time && time.toLocaleTimeString
                          ? time.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "--:--"}
                      </Text>
                    </View>

                    {isNext && (
                      <View style={styles.currentBadge}>
                        <MaterialCommunityIcons
                          name="play"
                          size={8}
                          color="#fff"
                        />
                      </View>
                    )}

                    {isPassed && !isNext && (
                      <MaterialCommunityIcons
                        name="check"
                        size={14}
                        color="#4ECDC4"
                      />
                    )}
                  </View>
                </Animated.View>
              );
            }
          )}
        </View>

        {/* Espace de sécurité en bas */}
        <View style={styles.bottomSpacer} />
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
    width: "100%",
    height: "100%",
  },
  container: {
    flexGrow: 1,
    padding: 16,
    paddingTop: 50,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modernHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fffbe8",
    textAlign: "center",
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    letterSpacing: 0.5,
  },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  locationText: {
    fontSize: 14,
    color: "#fffbe8",
    marginLeft: 6,
    fontWeight: "500",
  },
  dateNavigationContainer: {
    marginBottom: 16,
  },
  nextPrayerCard: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  nextPrayerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  nextPrayerLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fffbe8",
  },
  urgencyIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
    textTransform: "uppercase",
  },
  nextPrayerContent: {
    gap: 10,
  },
  nextPrayerMainInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  nextPrayerIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  nextPrayerTextInfo: {
    flex: 1,
  },
  nextPrayerName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fffbe8",
    marginBottom: 2,
  },
  nextPrayerCountdown: {
    fontSize: 14,
    color: "#4ECDC4",
    fontWeight: "600",
  },
  progressContainer: {
    gap: 6,
  },
  progressBar: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
  },
  prayerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  prayerCard: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
    width: "48%",
    marginBottom: 8,
  },
  prayerCardActive: {
    backgroundColor: "rgba(78, 205, 196, 0.15)",
    borderColor: "#4ECDC4",
    borderWidth: 2,
    shadowColor: "#4ECDC4",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  prayerCardPassed: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    opacity: 0.7,
  },
  prayerCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  prayerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  prayerIconContainerActive: {
    borderWidth: 2,
    borderColor: "#4ECDC4",
  },
  prayerInfo: {
    flex: 1,
  },
  prayerLabel: {
    fontSize: 14,
    color: "#fffbe8",
    fontWeight: "600",
    marginBottom: 1,
  },
  prayerLabelActive: {
    color: "#4ECDC4",
    fontWeight: "700",
  },
  prayerLabelPassed: {
    color: "rgba(255, 255, 255, 0.6)",
  },
  prayerTime: {
    fontSize: 16,
    color: "#FFD700",
    fontWeight: "700",
    textShadowColor: "rgba(255, 215, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 0.5,
  },
  prayerTimeActive: {
    color: "#4ECDC4",
    fontSize: 18,
  },
  prayerTimePassed: {
    color: "rgba(255, 215, 0, 0.5)",
  },
  currentBadge: {
    backgroundColor: "#4ECDC4",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  currentBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
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
  bottomSpacer: {
    height: 20,
  },
});
