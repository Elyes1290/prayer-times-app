import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, {
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  memo,
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
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import bgImage from "../assets/images/prayer-bg.png";

import { Colors } from "../constants/Colors";
import { SettingsContext } from "../contexts/SettingsContext";
import { useTranslation } from "react-i18next";
import { reverseGeocodeAsync } from "expo-location";
import { useLocation } from "../hooks/useLocation";
import { usePrayerTimes } from "../hooks/usePrayerTimes";
import { scheduleNotificationsFor2Days } from "../utils/sheduleAllNotificationsFor30Days";
import { useFocusEffect } from "@react-navigation/native";

const { AdhanModule } = NativeModules;
const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// 🎨 Modern Design System
const THEME = {
  colors: {
    primary: "#4ECDC4",
    secondary: "#FFD700",
    accent: "#F093FB",
    danger: "#FF6B6B",
    success: "#6BCF7F",
    warning: "#FFB366",

    // Gradients
    gradients: {
      primary: ["#4ECDC4", "#44A08D"],
      secondary: ["#FFD700", "#FF8008"],
      accent: ["#F093FB", "#F441A5"],
      danger: ["#FF6B6B", "#FF3838"],
      dark: ["rgba(0,0,0,0.7)", "rgba(0,0,0,0.3)"],
      glass: ["rgba(255,255,255,0.25)", "rgba(255,255,255,0.1)"],
    },

    // Glass morphism
    glass: {
      light: "rgba(255, 255, 255, 0.15)",
      medium: "rgba(255, 255, 255, 0.25)",
      dark: "rgba(0, 0, 0, 0.25)",
    },

    text: {
      primary: "#FFFFFF",
      secondary: "rgba(255, 255, 255, 0.9)",
      muted: "rgba(255, 255, 255, 0.7)",
      accent: "#4ECDC4",
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 25,
    round: 50,
  },
  shadows: {
    glow: {
      shadowColor: "#4ECDC4",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 10,
      elevation: 15,
    },
    card: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 12,
    },
  },
};

// 🎯 Animation System
const ANIMATIONS = {
  stagger: (index: number) => index * 150,
  entrance: {
    duration: 800,
    useNativeDriver: true,
  },
  spring: {
    tension: 100,
    friction: 8,
    useNativeDriver: true,
  },
};

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [today, setToday] = useState(new Date());
  const [city, setCity] = useState<string | null>(null);

  // État pour le contenu aléatoire
  const [randomDua, setRandomDua] = useState<any>(null);
  const [randomVerse, setRandomVerse] = useState<any>(null);
  const [randomName, setRandomName] = useState<any>(null);

  // Animations
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));

  const settings = useContext(SettingsContext);
  const { location } = useLocation();

  // Animation d'entrée et chargement du contenu aléatoire
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

    // Charger du contenu aléatoire
    loadRandomContent();
  }, []);

  // Recharger le contenu quand la langue change
  useEffect(() => {
    loadRandomContent();
  }, [i18n.language]);

  const loadRandomContent = () => {
    try {
      // Utiliser le système i18n pour récupérer les dhikr selon la langue courante
      const dhikrData = i18n.getResourceBundle(i18n.language, "dhikr");
      if (dhikrData && Array.isArray(dhikrData) && dhikrData.length > 0) {
        const randomDuaIndex = Math.floor(Math.random() * dhikrData.length);
        setRandomDua(dhikrData[randomDuaIndex]);
      }

      // Utiliser le système i18n pour récupérer les noms d'Allah selon la langue courante
      const asmaulhusnaData = i18n.getResourceBundle(
        i18n.language,
        "asmaulhusna"
      );
      if (asmaulhusnaData) {
        const nameKeys = Object.keys(asmaulhusnaData).filter((key) =>
          key.startsWith("name_")
        );
        if (nameKeys.length > 0) {
          const randomNameKey =
            nameKeys[Math.floor(Math.random() * nameKeys.length)];
          setRandomName(asmaulhusnaData[randomNameKey]);
        }
      }

      // Verset aléatoire (données statiques pour l'exemple)
      const verses = [
        {
          arabic: "إِنَّا فَتَحْنَا لَكَ فَتْحًا مُّبِينًا",
          translation:
            "Truly We have opened up a path to clear triumph for you [Prophet],",
          reference: "Al-Fath 48:17",
        },
        {
          arabic: "وَاللَّهُ خَيْرٌ حَافِظًا وَهُوَ أَرْحَمُ الرَّاحِمِينَ",
          translation:
            "But Allah is the best guardian, and He is the most merciful of the merciful.",
          reference: "Yusuf 12:64",
        },
        {
          arabic:
            "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
          translation:
            "Our Lord, give us good in this world and good in the hereafter, and save us from the punishment of the Fire.",
          reference: "Al-Baqarah 2:201",
        },
      ];
      const randomVerseIndex = Math.floor(Math.random() * verses.length);
      setRandomVerse(verses[randomVerseIndex]);
    } catch (error) {
      console.error("Erreur lors du chargement du contenu aléatoire:", error);
      // Fallback en cas d'erreur
      setRandomDua({
        title: "Invocation du matin",
        arabic: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ",
        translation: "Nous voici au matin et la royauté appartient à Allah",
      });
      setRandomName({
        arabic: "الله",
        translit: "Allah",
        meaning: "Le nom suprême d'Allah, englobant tous Ses attributs.",
      });
    }
  };

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
        {/* Header avec localisation seulement */}
        <View style={styles.modernHeader}>
          {city && (
            <Animated.View
              style={[
                styles.locationBadge,
                { transform: [{ scale: fadeAnim }] },
              ]}
            >
              <LinearGradient
                colors={["#4ECDC4", "#44A08D"]}
                style={styles.badgeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialCommunityIcons
                  name="map-marker"
                  size={16}
                  color="white"
                />
                <Text style={styles.locationText}>
                  {city}
                  {settings.locationMode === "manual" && " (Manuel)"}
                </Text>
              </LinearGradient>
            </Animated.View>
          )}
        </View>

        {/* Container prochaine prière */}
        {currentPrayerTimes &&
          (() => {
            const currentTime = new Date();
            const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
            let nextPrayer = null;
            let previousPrayer = null;
            let timeUntilNext = "";
            let progressPercentage = 0;

            // Trouver la prière précédente et la prochaine prière
            for (let i = 0; i < prayers.length; i++) {
              const prayer = prayers[i];
              const prayerTime =
                (currentPrayerTimes as any)[prayer.toLowerCase()] ||
                (currentPrayerTimes as any)[prayer];

              if (prayerTime && currentTime < prayerTime) {
                nextPrayer = prayer;
                previousPrayer = i > 0 ? prayers[i - 1] : "Isha"; // Si c'est Fajr, la précédente est Isha de la veille

                const diff = prayerTime.getTime() - currentTime.getTime();
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor(
                  (diff % (1000 * 60 * 60)) / (1000 * 60)
                );
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                timeUntilNext =
                  hours > 0
                    ? `${hours}h ${minutes}min ${seconds}s`
                    : minutes > 0
                    ? `${minutes}min ${seconds}s`
                    : `${seconds}s`;

                // Calculer le pourcentage de progression
                let prevTime;
                if (previousPrayer === "Isha" && nextPrayer === "Fajr") {
                  // Cas spécial: entre Isha d'hier et Fajr d'aujourd'hui
                  const yesterday = new Date(currentTime);
                  yesterday.setDate(yesterday.getDate() - 1);
                  // Simuler Isha d'hier (approximatif)
                  prevTime = new Date(yesterday);
                  prevTime.setHours(19, 30, 0, 0); // Heure approximative
                } else {
                  prevTime =
                    (currentPrayerTimes as any)[previousPrayer.toLowerCase()] ||
                    (currentPrayerTimes as any)[previousPrayer];
                }

                if (prevTime) {
                  const totalInterval =
                    prayerTime.getTime() - prevTime.getTime();
                  const elapsed = currentTime.getTime() - prevTime.getTime();
                  progressPercentage = Math.max(
                    0,
                    Math.min(100, (elapsed / totalInterval) * 100)
                  );
                }

                break;
              }
            }

            const iconByPrayer: Record<
              string,
              { name: string; color: string }
            > = {
              Fajr: { name: "weather-sunset-up", color: "#FF6B6B" },
              Dhuhr: { name: "white-balance-sunny", color: "#FFD700" },
              Asr: { name: "weather-sunny", color: "#FFA500" },
              Maghrib: { name: "weather-sunset-down", color: "#F093FB" },
              Isha: { name: "weather-night", color: "#4C63D2" },
            };

            return nextPrayer ? (
              <Animated.View
                style={[
                  styles.nextPrayerCardLarge,
                  { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
                ]}
              >
                <View style={styles.nextPrayerHeader}>
                  <Text style={styles.nextPrayerLabel}>{t("next_prayer")}</Text>
                  <View style={styles.urgencyIndicator}>
                    <MaterialCommunityIcons
                      name="clock"
                      size={16}
                      color="#4ECDC4"
                    />
                    <Text style={styles.urgencyText}>À venir</Text>
                  </View>
                </View>

                <View style={styles.nextPrayerContentLarge}>
                  <View style={styles.nextPrayerMainInfo}>
                    <View
                      style={[
                        styles.nextPrayerIconCircleLarge,
                        {
                          backgroundColor: `${iconByPrayer[nextPrayer]?.color}20`,
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={iconByPrayer[nextPrayer]?.name as any}
                        size={48}
                        color={iconByPrayer[nextPrayer]?.color}
                      />
                    </View>
                    <View style={styles.nextPrayerTextInfo}>
                      <Text style={styles.nextPrayerNameLarge}>
                        {t(nextPrayer.toLowerCase()) || nextPrayer}
                      </Text>
                      <Text style={styles.nextPrayerCountdownLarge}>
                        {timeUntilNext}
                      </Text>
                    </View>
                  </View>

                  {/* Barre de progression */}
                  <View style={styles.progressSection}>
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                        <Animated.View
                          style={[
                            styles.progressFill,
                            {
                              width: `${progressPercentage}%`,
                              backgroundColor: iconByPrayer[nextPrayer]?.color,
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.progressLabels}>
                        <Text style={styles.progressLabelStart}>
                          {previousPrayer}
                        </Text>
                        <Text style={styles.progressPercentage}>
                          {Math.round(progressPercentage)}%
                        </Text>
                        <Text style={styles.progressLabelEnd}>
                          {nextPrayer}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </Animated.View>
            ) : null;
          })()}

        {/* Container DUA du jour - Version moderne */}
        <Animated.View
          style={[
            styles.modernCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={["rgba(255, 215, 0, 0.25)", "rgba(255, 140, 0, 0.15)"]}
            style={styles.cardGradient}
          >
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons
                  name="hand-heart"
                  size={24}
                  color="#FFD700"
                />
              </View>
              <Text style={[styles.cardTitle, { color: "#FFD700" }]}>
                {t("dua_du_jour") || "Dua du jour"}
              </Text>
            </View>

            {randomDua ? (
              <>
                <Text style={styles.duaTitleText}>{randomDua.title}</Text>
                <Text style={styles.duaArabic}>{randomDua.arabic}</Text>
                <Text style={styles.duaTranslation}>
                  {randomDua.translation}
                </Text>
                {randomDua.benefits && (
                  <Text style={styles.duaBenefits}>{randomDua.benefits}</Text>
                )}
              </>
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#FFD700" />
                <Text style={styles.loadingText}>Chargement de la dua...</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.modernButton,
                { backgroundColor: "rgba(255, 215, 0, 0.3)" },
              ]}
              onPress={() => router.push("/dhikr")}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="hand-heart"
                size={16}
                color="#FFD700"
              />
              <Text style={[styles.buttonText, { color: "#FFD700" }]}>
                {t("voir_plus_dua") || "voir_plus_dua"}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* Container Verset du jour - Version moderne */}
        <Animated.View
          style={[
            styles.modernCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={["rgba(78, 205, 196, 0.25)", "rgba(68, 160, 141, 0.15)"]}
            style={styles.cardGradient}
          >
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="book" size={24} color="#4ECDC4" />
              </View>
              <Text style={[styles.cardTitle, { color: "#4ECDC4" }]}>
                {t("verset_du_jour") || "Verset du jour"}
              </Text>
            </View>

            {randomVerse ? (
              <>
                <Text style={styles.versetArabic}>{randomVerse.arabic}</Text>
                <Text style={styles.versetTranslation}>
                  {randomVerse.translation}
                </Text>
                <Text style={[styles.versetReference, { color: "#4ECDC4" }]}>
                  — {randomVerse.reference}
                </Text>
              </>
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#4ECDC4" />
                <Text style={styles.loadingText}>Chargement...</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.modernButton,
                { backgroundColor: "rgba(78, 205, 196, 0.3)" },
              ]}
              onPress={() => router.push("/quran")}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="book-open-page-variant"
                size={16}
                color="#4ECDC4"
              />
              <Text style={[styles.buttonText, { color: "#4ECDC4" }]}>
                {t("lire_coran") || "lire_coran"}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* Container Nom d'Allah du jour - Version moderne */}
        <Animated.View
          style={[
            styles.modernCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={["rgba(240, 147, 251, 0.25)", "rgba(244, 65, 165, 0.15)"]}
            style={styles.cardGradient}
          >
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="star" size={24} color="#F093FB" />
              </View>
              <Text style={[styles.cardTitle, { color: "#F093FB" }]}>
                {t("nom_allah_du_jour") || "nom_allah_du_jour"}
              </Text>
            </View>

            {randomName ? (
              <>
                <Text style={styles.allahnameArabic}>{randomName.arabic}</Text>
                <Text style={[styles.allahnameTranslit, { color: "#F093FB" }]}>
                  {randomName.translit}
                </Text>
                <Text style={styles.allahnameDescription}>
                  {randomName.meaning}
                </Text>
              </>
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#F093FB" />
                <Text style={styles.loadingText}>
                  Chargement du nom d&apos;Allah...
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.modernButton,
                { backgroundColor: "rgba(240, 147, 251, 0.3)" },
              ]}
              onPress={() => router.push("/asmaulhusna")}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="star-circle"
                size={16}
                color="#F093FB"
              />
              <Text style={[styles.buttonText, { color: "#F093FB" }]}>
                {t("decouvrir_99_noms") || "decouvrir_99_noms"}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* Actions rapides modernes */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>
            <MaterialCommunityIcons name="flash" size={24} color="#FFD700" />{" "}
            {t("actions_rapides") || "Actions Rapides"}
          </Text>

          <LinearGradient
            colors={["rgba(0, 0, 0, 0.4)", "rgba(0, 0, 0, 0.2)"]}
            style={styles.actionsWrapper}
          >
            <View style={styles.actionsGrid}>
              {[
                {
                  icon: "hand-heart",
                  title: "Dhikr & Dua",
                  route: "/dhikr",
                  color: "#4ECDC4",
                },
                {
                  icon: "compass",
                  title: "Qibla",
                  route: "/qibla",
                  color: "#4ECDC4",
                },
                {
                  icon: "calendar",
                  title: "Calendrier Hijri",
                  route: "/hijri",
                  color: "#4ECDC4",
                },
                {
                  icon: "book-open-page-variant",
                  title: "Saint Coran",
                  route: "/quran",
                  color: "#FFD700",
                },
                {
                  icon: "book-multiple",
                  title: "Hadiths",
                  route: "/hadith",
                  color: "#F093FB",
                },
                {
                  icon: "star-circle",
                  title: "99 Noms d'Allah",
                  route: "/asmaulhusna",
                  color: "#FF6B6B",
                },
              ].map((action, index) => (
                <Animated.View
                  key={action.route}
                  style={{
                    opacity: fadeAnim,
                    transform: [
                      {
                        translateY: slideAnim.interpolate({
                          inputRange: [0, 30],
                          outputRange: [index * 10, 0],
                        }),
                      },
                    ],
                  }}
                >
                  <TouchableOpacity
                    style={[
                      styles.actionCard,
                      { borderColor: action.color + "40" },
                    ]}
                    onPress={() => router.push(action.route as any)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.actionIconBg,
                        { backgroundColor: action.color + "20" },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={action.icon as any}
                        size={28}
                        color={action.color}
                      />
                    </View>
                    <Text style={styles.actionTitle} numberOfLines={2}>
                      {action.title}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </LinearGradient>
        </View>

        {/* Espace de sécurité en bas */}
        <View style={styles.bottomSpacer} />
      </Animated.ScrollView>
    </ImageBackground>
  );
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
  // Styles DUA
  duaContainer: {
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  duaHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  duaTitle: {
    color: "#FFD700",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  duaTitleText: {
    fontSize: 16,
    color: "#fffbe8",
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  duaArabic: {
    fontSize: 22,
    color: "#fffbe8",
    textAlign: "center",
    marginBottom: 10,
    fontFamily: "ScheherazadeNew",
    lineHeight: 32,
  },
  duaTranslation: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 20,
  },
  duaBenefits: {
    fontSize: 12,
    color: "rgba(255, 215, 0, 0.8)",
    textAlign: "center",
    marginBottom: 10,
    fontStyle: "italic",
    lineHeight: 18,
  },
  duaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 215, 0, 0.3)",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.4)",
  },
  duaButtonText: {
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },

  // Styles Verset
  versetContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(78, 205, 196, 0.3)",
  },
  versetHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  versetTitle: {
    color: "#4ECDC4",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  versetArabic: {
    fontSize: 24,
    color: "#fffbe8",
    textAlign: "center",
    marginBottom: 12,
    fontFamily: "ScheherazadeNew",
    lineHeight: 36,
  },
  versetTranslation: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 22,
  },
  versetReference: {
    fontSize: 14,
    color: "#4ECDC4",
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 12,
  },
  versetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(78, 205, 196, 0.2)",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(78, 205, 196, 0.3)",
  },
  versetButtonText: {
    color: "#4ECDC4",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },

  // Styles Nom d'Allah
  allahnameContainer: {
    backgroundColor: "rgba(240, 147, 251, 0.2)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(240, 147, 251, 0.3)",
  },
  allahnameHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  allahnameTitle: {
    color: "#F093FB",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  allahnameArabic: {
    fontSize: 28,
    color: "#fffbe8",
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "700",
  },
  allahnameTranslit: {
    fontSize: 20,
    color: "#F093FB",
    textAlign: "center",
    marginBottom: 8,
    fontStyle: "italic",
  },
  allahnameDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 20,
  },
  allahnameButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(240, 147, 251, 0.3)",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(240, 147, 251, 0.4)",
  },
  allahnameButtonText: {
    color: "#F093FB",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },

  // Styles Actions rapides
  actionsContainer: {
    marginBottom: 20,
  },
  actionsTitle: {
    fontSize: 18,
    color: "#fffbe8",
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  actionsWrapper: {
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  actionCard: {
    width: "30%",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    minHeight: 100,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionTitle: {
    color: "#fffbe8",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 13,
  },

  // Styles pour le container large de la prochaine prière
  nextPrayerCardLarge: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
    minHeight: 180,
  },
  nextPrayerContentLarge: {
    gap: 16,
  },
  nextPrayerIconCircleLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  nextPrayerNameLarge: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fffbe8",
    marginBottom: 4,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  nextPrayerCountdownLarge: {
    fontSize: 18,
    color: "#4ECDC4",
    fontWeight: "700",
    letterSpacing: 1,
    textShadowColor: "rgba(78, 205, 196, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  progressSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  progressContainer: {
    gap: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabelStart: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "600",
  },
  progressPercentage: {
    fontSize: 14,
    color: "#4ECDC4",
    fontWeight: "700",
    backgroundColor: "rgba(78, 205, 196, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: "hidden",
  },
  progressLabelEnd: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "600",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: THEME.spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginLeft: THEME.spacing.sm,
  },
  loadingContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: THEME.spacing.lg,
    gap: THEME.spacing.sm,
  },
  loadingText: {
    color: THEME.colors.text.secondary,
    fontSize: 14,
    fontStyle: "italic",
  },
  cardButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    marginTop: THEME.spacing.sm,
  },
  cardButtonText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: THEME.spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    color: THEME.colors.text.primary,
    fontWeight: "700",
    marginBottom: THEME.spacing.lg,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modernCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  cardGradient: {
    padding: 20,
    borderRadius: 20,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 10,
  },
  modernButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 15,
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  actionIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  badgeGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
});
