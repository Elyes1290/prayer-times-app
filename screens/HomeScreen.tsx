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

const iconByPrayer: Record<string, { name: string; color: string }> = {
  Fajr: { name: "weather-sunset-up", color: Colors.accent },
  Sunrise: { name: "weather-sunny", color: "#FFD700" },
  Dhuhr: { name: "white-balance-sunny", color: Colors.primary },
  Asr: { name: "weather-sunny", color: Colors.primary },
  Maghrib: { name: "weather-sunset-down", color: Colors.accent },
  Isha: { name: "weather-night", color: Colors.textSub },
};

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [today, setToday] = useState(new Date());
  const [city, setCity] = useState<string | null>(null);

  const settings = useContext(SettingsContext);
  const { location } = useLocation();

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

  // Si c'est en cours de chargement
  if (settings.isLoading) {
    return (
      <ImageBackground source={bgImage} style={styles.background}>
        <View style={[styles.container, { justifyContent: "center", flex: 1 }]}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text
            style={{ textAlign: "center", marginTop: 20, color: "#fffbe8" }}
          >
            Chargement...
          </Text>
        </View>
      </ImageBackground>
    );
  }

  // Si c'est la première utilisation (locationMode === null)
  if (settings.locationMode === null) {
    return (
      <ImageBackground source={bgImage} style={styles.background}>
        <View style={[styles.container, { justifyContent: "center", flex: 1 }]}>
          <Text style={styles.header}>{t("prayer_times")}</Text>
          <Text style={styles.error}>
            Bienvenue ! Choisissez votre mode de localisation :
          </Text>
          <TouchableOpacity
            style={styles.choiceBtn}
            onPress={() => router.push("/settings")}
          >
            <Text style={styles.choiceBtnText}>Entrer ville manuellement</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.choiceBtn}
            onPress={async () => {
              settings.setLocationMode("auto");
              try {
                await settings.refreshAutoLocation();
              } catch (error) {
                console.error("Erreur refresh auto location:", error);
              }
            }}
          >
            <Text style={styles.choiceBtnText}>Utiliser GPS automatique</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    );
  }

  // Si on a une erreur de localisation
  if (settings.errorMsg) {
    return (
      <ImageBackground source={bgImage} style={styles.background}>
        <View style={[styles.container, { justifyContent: "center", flex: 1 }]}>
          <Text style={styles.header}>{t("prayer_times")}</Text>
          <Text style={styles.error}>{settings.errorMsg}</Text>
          <TouchableOpacity
            style={styles.choiceBtn}
            onPress={() => router.push("/settings")}
          >
            <Text style={styles.choiceBtnText}>Aller aux paramètres</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    );
  }

  // Si on n'a pas encore d'horaires de prières
  if (!currentPrayerTimes) {
    return (
      <ImageBackground source={bgImage} style={styles.background}>
        <View style={[styles.container, { justifyContent: "center", flex: 1 }]}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text
            style={{ textAlign: "center", marginTop: 20, color: "#fffbe8" }}
          >
            Calcul des horaires...
          </Text>
        </View>
      </ImageBackground>
    );
  }

  const currentTime = new Date();
  const { nextPrayer, timeUntilNext } = getNextPrayer(
    currentPrayerTimes as unknown as Record<string, Date>,
    currentTime
  );

  return (
    <ImageBackground source={bgImage} style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>{t("prayer_times")}</Text>

        {city && (
          <Text style={styles.cityText}>
            📍 {city}
            {settings.locationMode === "manual" && " (Manuel)"}
          </Text>
        )}

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

        {nextPrayer && (
          <View style={styles.nextPrayerContainer}>
            <Text style={styles.nextPrayerTitle}>{t("next_prayer")}</Text>
            <Text style={styles.nextPrayerName}>{nextPrayer}</Text>
            <Text style={styles.nextPrayerTime}>{timeUntilNext}</Text>
          </View>
        )}

        {["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"].map(
          (prayer) => {
            const time =
              (currentPrayerTimes as any)[prayer.toLowerCase()] ||
              (currentPrayerTimes as any)[prayer];
            const icon = iconByPrayer[prayer] || {
              name: "clock",
              color: Colors.text,
            };

            return (
              <View key={prayer} style={styles.cardBG}>
                <View style={styles.cardContent}>
                  <MaterialCommunityIcons
                    name={icon.name as any}
                    size={26}
                    color={icon.color}
                  />
                  <Text style={styles.cardLabel}>
                    {t(prayer.toLowerCase()) || prayer}
                  </Text>
                  <Text style={styles.cardTime}>
                    {time && time.toLocaleTimeString
                      ? time.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "00:00"}
                  </Text>
                </View>
              </View>
            );
          }
        )}
      </ScrollView>
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
    padding: 20,
    paddingTop: 60,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fffbe8",
    textAlign: "center",
    marginBottom: 20,
    textShadowColor: "rgba(0, 0, 0, 0.7)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 10,
  },
  cityText: {
    fontSize: 16,
    color: "#fffbe8",
    textAlign: "center",
    marginBottom: 20,
    textShadowColor: "rgba(0, 0, 0, 0.7)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  nextPrayerContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
  },
  nextPrayerTitle: {
    fontSize: 16,
    color: "#fffbe8",
    marginBottom: 5,
  },
  nextPrayerName: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.primary,
    marginBottom: 5,
  },
  nextPrayerTime: {
    fontSize: 18,
    color: "#fffbe8",
  },
  prayerTimesContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 15,
    padding: 20,
  },
  prayerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  prayerNameContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  prayerName: {
    fontSize: 18,
    color: "#fffbe8",
    marginLeft: 12,
    fontWeight: "500",
  },
  prayerTime: {
    fontSize: 18,
    color: Colors.primary,
    fontWeight: "bold",
  },
  error: {
    fontSize: 16,
    color: "#ff6b6b",
    textAlign: "center",
    marginBottom: 20,
    textShadowColor: "rgba(0, 0, 0, 0.7)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  choiceBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: "center",
  },
  choiceBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  cardBG: {
    borderRadius: 18,
    marginVertical: 10,
    minHeight: 70,
    justifyContent: "center",
    backgroundColor: "rgba(10,22,50,0.87)",
    borderWidth: 1.5,
    borderColor: "#FFD70055",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 22,
  },
  cardLabel: {
    flex: 1,
    marginLeft: 18,
    fontSize: 18,
    color: "#fffbe8",
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  cardTime: {
    fontSize: 21,
    color: "#FFD700",
    fontWeight: "700",
    marginLeft: 12,
    textShadowColor: "#fff9b5",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
    letterSpacing: 1.1,
  },
});
