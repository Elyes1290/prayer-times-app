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
  Share,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import ThemedImageBackground from "../components/ThemedImageBackground";
import PrayerTimes from "adhan/lib/types/PrayerTimes";

import { useThemeColors } from "../hooks/useThemeAssets";
import {
  useOverlayTextColor,
  useOverlayIconColor,
  useCurrentTheme,
} from "../hooks/useThemeColor";
import { SettingsContext } from "../contexts/SettingsContext";
import { useTranslation } from "react-i18next";
import { reverseGeocodeAsync } from "expo-location";
import { useLocation } from "../hooks/useLocation";
import { usePrayerTimes } from "../hooks/usePrayerTimes";
import { scheduleNotificationsFor2Days } from "../utils/sheduleAllNotificationsFor30Days";
import { getQuranVersesWithTranslations } from "../utils/quranApi";
import { getRandomHadith } from "../utils/hadithApi";
import { debugLog, errorLog } from "../utils/logger";
import WelcomePersonalizationModal from "../components/WelcomePersonalizationModal";
import { usePremium } from "../contexts/PremiumContext";

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
      primary: ["#4ECDC4", "#2C7A7A"] as const,
      secondary: ["#FFD700", "#B8860B"] as const,
      accent: ["#F093FB", "#9B4B9B"] as const,
      danger: ["#FF6B6B", "#8B0000"] as const,
      dark: ["rgba(0,0,0,0.7)", "rgba(0,0,0,0.3)"] as const,
      glass: ["rgba(44,205,196,0.12)", "rgba(240,147,251,0.10)"] as const,
    },

    // Glass morphism
    glass: {
      light: "rgba(255, 255, 255, 0.10)",
      medium: "rgba(44,205,196,0.18)",
      dark: "rgba(0, 0, 0, 0.25)",
    },

    text: {
      primary: "#FFFFFF",
      secondary: "rgba(255, 255, 255, 0.95)",
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
  fadeIn: {
    duration: 600,
    useNativeDriver: true,
  },
  slideUp: {
    duration: 500,
    useNativeDriver: true,
  },
  scale: {
    duration: 400,
    useNativeDriver: true,
  },
};

// Mise à jour de l'interface PrayerTimes pour correspondre à celle d'adhan
interface CustomPrayerTimes {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
  [key: string]: Date;
}

interface PrayerInfo {
  name: string;
  time: string;
  countdown: string;
  diff: number;
}

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [today, setToday] = useState(new Date());
  const [city, setCity] = useState<string | null>(null);
  const [showPersonalizationModal, setShowPersonalizationModal] =
    useState(false);

  // Utiliser les couleurs thématiques
  const colors = useThemeColors();
  const overlayTextColor = useOverlayTextColor();
  const overlayIconColor = useOverlayIconColor();
  const currentTheme = useCurrentTheme();

  // Styles dynamiques basés sur le thème
  const styles = getStyles(
    colors,
    overlayTextColor,
    overlayIconColor,
    currentTheme
  );

  // Map langue => id traduction Quran.com
  const translationMap: Record<string, number | null> = {
    fr: 136,
    en: 85,
    ru: 45,
    tr: 52,
    de: 27,
    ar: null,
    es: 83,
    it: 153,
    pt: 43,
    nl: 144,
    ur: 97,
    bn: 120,
    fa: 135,
  };

  // Détecter la langue à utiliser pour l'API Quran.com
  const lang = i18n.language.startsWith("fr")
    ? "fr"
    : i18n.language.startsWith("en")
    ? "en"
    : i18n.language.startsWith("ru")
    ? "ru"
    : i18n.language.startsWith("tr")
    ? "tr"
    : i18n.language.startsWith("de")
    ? "de"
    : i18n.language.startsWith("it")
    ? "it"
    : i18n.language.startsWith("es")
    ? "es"
    : i18n.language.startsWith("pt")
    ? "pt"
    : i18n.language.startsWith("ur")
    ? "ur"
    : i18n.language.startsWith("fa")
    ? "fa"
    : i18n.language.startsWith("ar")
    ? "ar"
    : i18n.language.startsWith("nl")
    ? "nl"
    : i18n.language.startsWith("bn")
    ? "bn"
    : "en";

  // Fonction fetch avec fallback sur anglais (id 85)
  async function fetchTranslation(chapterNumber: number, lang: string) {
    const translationId = translationMap[lang] || 85; // fallback anglais

    try {
      const res = await fetch(
        `https://api.quran.com/api/v4/quran/translations/${translationId}?chapter_number=${chapterNumber}`
      );
      const json = await res.json();

      if (json.translations && json.translations.length > 0) {
        return json.translations;
      } else if (translationId !== 85) {
        // fallback anglais si vide
        const fallbackRes = await fetch(
          `https://api.quran.com/api/v4/quran/translations/85?chapter_number=${chapterNumber}`
        );
        const fallbackJson = await fallbackRes.json();
        return fallbackJson.translations || [];
      }
      return [];
    } catch {
      // fallback en cas d'erreur réseau
      if (translationId !== 85) {
        const fallbackRes = await fetch(
          `https://api.quran.com/api/v4/quran/translations/85?chapter_number=${chapterNumber}`
        );
        const fallbackJson = await fallbackRes.json();
        return fallbackJson.translations || [];
      }
      return [];
    }
  }

  // État pour le contenu aléatoire
  const [randomDua, setRandomDua] = useState<any>(null);
  const [randomVerse, setRandomVerse] = useState<any>(null);
  const [randomName, setRandomName] = useState<any>(null);
  const [randomHadith, setRandomHadith] = useState<any>(null);

  // Animations
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const [scaleAnim] = useState(new Animated.Value(0.95));
  const [rotateAnim] = useState(new Animated.Value(0));

  const settings = useContext(SettingsContext);
  const { location } = useLocation();
  const { user } = usePremium();

  // Animation d'entrée et chargement du contenu aléatoire
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: ANIMATIONS.fadeIn.duration,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: ANIMATIONS.slideUp.duration,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        ...ANIMATIONS.spring,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1000,
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

  const loadRandomContent = async () => {
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

      // Utiliser l'API utilitaire pour récupérer un verset aléatoire et sa traduction
      try {
        // Récupérer la liste des sourates
        const apiLang = i18n.language;
        const souratesRes = await fetch(
          `https://api.quran.com/api/v4/chapters?language=${apiLang}`
        );
        const souratesJson = await souratesRes.json();
        const sourates = souratesJson.chapters || [];

        if (sourates.length > 0) {
          // Sélectionner une sourate aléatoire
          const randomSourate =
            sourates[Math.floor(Math.random() * sourates.length)];
          // Récupérer tous les versets + traductions de cette sourate
          // UTILISER la variable lang normalisée plutôt que i18n.language directement
          const versesWithTranslations = await getQuranVersesWithTranslations(
            randomSourate.id,
            lang
          );
          if (versesWithTranslations.length > 0) {
            // Sélectionner un verset aléatoire
            const randomVerse =
              versesWithTranslations[
                Math.floor(Math.random() * versesWithTranslations.length)
              ];
            setRandomVerse({
              arabic: randomVerse.text_uthmani,
              translation: randomVerse.translation,
              reference: `${randomSourate.name_simple} – ${randomSourate.id}:${
                randomVerse.verse_key.split(":")[1]
              }`,
            });
          }
        }
      } catch (error) {
        errorLog("Erreur lors de la récupération du verset:", error);
      }

      // Hadith du jour
      try {
        const hadith = await getRandomHadith();
        setRandomHadith(hadith);
      } catch (error) {
        setRandomHadith(null);
      }
    } catch (error) {
      errorLog("Erreur lors du chargement du contenu aléatoire:", error);
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
      debugLog("🔐 Vérification permissions notifications Android 13+");

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

  // 🔧 CORRECTION BUG : Fonction normale (non automatique) pour reprogrammation manuelle uniquement
  const updateNotifications = async () => {
    if (!currentPrayerTimes || !stableCoords) {
      debugLog("⏸️ Notifications non mises à jour - données manquantes");
      return;
    }

    try {
      debugLog("🔄 Mise à jour notifications pour le", today.toISOString(), {
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
      });

      if (Platform.OS === "android" && AdhanModule) {
        // Si les notifications sont désactivées globalement, on annule tout et ON S'ARRÊTE
        if (!settings.notificationsEnabled) {
          debugLog(
            "🚫 Notifications désactivées globalement - annulation de tout"
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
      errorLog("❌ Erreur lors de la mise à jour des notifications:", error);
    }
  };

  // Timer pour vérifier périodiquement si on doit reprogrammer (après Isha) et mettre à jour le widget
  useEffect(() => {
    const checkAndReschedule = async () => {
      if (!currentPrayerTimes) return;

      const now = new Date();
      const ishaTime =
        currentPrayerTimes.isha || (currentPrayerTimes as any).Isha;

      if (ishaTime && now > ishaTime) {
        debugLog("🌙 Isha passé, vérification si reprogrammation nécessaire");
        // Mettre à jour automatiquement la date pour demain
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        // Si on n'est pas déjà sur demain, passer à demain
        if (today.toDateString() !== tomorrow.toDateString()) {
          debugLog("📅 Passage automatique au lendemain");
          setToday(tomorrow);

          // 📱 Forcer la mise à jour du widget pour le nouveau jour
          if (Platform.OS === "android" && AdhanModule) {
            try {
              debugLog("📱 Mise à jour du widget pour le nouveau jour");
              await AdhanModule.updateWidget?.();
            } catch (error) {
              errorLog("❌ Erreur mise à jour widget:", error);
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
      // 🚀 NOUVEAU : Seulement si l'utilisateur a explicitement configuré sa localisation
      if (settings.locationMode === "manual" && settings.manualLocation?.city) {
        setCity(settings.manualLocation.city);
      } else if (settings.locationMode === "auto" && location?.coords) {
        try {
          // 🚀 NOUVEAU : Vérifier les permissions avant le géocodage
          const { getForegroundPermissionsAsync } = await import(
            "expo-location"
          );
          const { status } = await getForegroundPermissionsAsync();

          if (status !== "granted") {
            console.log(
              "🔍 Permissions de localisation non accordées - pas de géocodage"
            );
            setCity("Localisation requise");
            return;
          }

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
          errorLog("Erreur reverse geocoding:", error);
          setCity("Erreur de localisation");
        }
      } else {
        // 🚀 NOUVEAU : Pas d'affichage de ville si localisation pas configurée
        setCity(null);
      }
    }

    // 🚀 NOUVEAU : Seulement si l'utilisateur a configuré un mode de localisation
    if (settings.locationMode !== null) {
      updateCity();
    }
  }, [
    settings.locationMode,
    settings.manualLocation?.city,
    location?.coords?.latitude,
    location?.coords?.longitude,
  ]);

  // 🎯 Afficher la modal de personnalisation après configuration de la localisation
  useEffect(() => {
    // 🚀 NOUVEAU : Mode professionnel - demander le prénom mais ne pas le sauvegarder automatiquement
    if (
      settings.isFirstTime &&
      settings.locationMode !== null &&
      !settings.userFirstName &&
      currentPrayerTimes // S'assurer que tout est bien configuré
    ) {
      const timer = setTimeout(() => {
        setShowPersonalizationModal(true);
      }, 1500); // Petit délai pour laisser l'interface se stabiliser

      return () => clearTimeout(timer);
    }
  }, [
    settings.isFirstTime,
    settings.locationMode,
    settings.userFirstName,
    currentPrayerTimes,
  ]);

  // Si c'est en cours de chargement
  if (settings.isLoading) {
    return (
      <ThemedImageBackground style={styles.background}>
        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />
        <View style={styles.centeredContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>
              {t("loading_settings") || "Chargement..."}
            </Text>
          </View>
        </View>
      </ThemedImageBackground>
    );
  }

  // Si c'est la première utilisation (locationMode === null)
  if (settings.locationMode === null) {
    return (
      <ThemedImageBackground style={styles.background}>
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
              color={colors.primary}
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
              <MaterialCommunityIcons
                name="city"
                size={24}
                color={overlayIconColor}
              />
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
                  errorLog("Erreur refresh auto location:", error);
                }
              }}
            >
              <MaterialCommunityIcons
                name="crosshairs-gps"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.secondaryButtonText}>
                {t("automatic") || "Utiliser GPS automatique"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ThemedImageBackground>
    );
  }

  // Si on a une erreur de localisation
  if (settings.errorMsg) {
    return (
      <ThemedImageBackground style={styles.background}>
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
              <MaterialCommunityIcons
                name="cog"
                size={20}
                color={overlayIconColor}
              />
              <Text style={styles.primaryButtonText}>
                {t("settings") || "Aller aux paramètres"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ThemedImageBackground>
    );
  }

  // Fonctions helper pour le dashboard
  const getNextPrayerInfo = (
    prayerTimes: PrayerTimes | null
  ): PrayerInfo | null => {
    if (!prayerTimes) return null;

    // Conversion de PrayerTimes en CustomPrayerTimes
    const customPrayerTimes: CustomPrayerTimes = {
      fajr: prayerTimes.fajr,
      sunrise: prayerTimes.sunrise,
      dhuhr: prayerTimes.dhuhr,
      asr: prayerTimes.asr,
      maghrib: prayerTimes.maghrib,
      isha: prayerTimes.isha,
    };

    const currentTime = new Date();
    const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

    for (const prayer of prayers) {
      const prayerTime = customPrayerTimes[prayer.toLowerCase()];
      if (prayerTime && currentTime < prayerTime) {
        const diff = prayerTime.getTime() - currentTime.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        const countdownText =
          hours > 0
            ? `${hours}h ${minutes}min`
            : minutes > 0
            ? `${minutes}min`
            : `<1min`;

        return {
          name: prayer,
          time: prayerTime.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          countdown: countdownText,
          diff: diff,
        };
      }
    }
    return null;
  };

  const getProgressPercentage = () => {
    if (!currentPrayerTimes) return 0;

    const currentTime = new Date();
    const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
    let nextPrayer = null;
    let previousPrayer = null;

    // Conversion de PrayerTimes en CustomPrayerTimes
    const customPrayerTimes: CustomPrayerTimes = {
      fajr: currentPrayerTimes.fajr,
      sunrise: currentPrayerTimes.sunrise,
      dhuhr: currentPrayerTimes.dhuhr,
      asr: currentPrayerTimes.asr,
      maghrib: currentPrayerTimes.maghrib,
      isha: currentPrayerTimes.isha,
    };

    for (let i = 0; i < prayers.length; i++) {
      const prayer = prayers[i];
      const prayerTime = customPrayerTimes[prayer.toLowerCase()];

      if (prayerTime && currentTime < prayerTime) {
        nextPrayer = prayerTime;
        previousPrayer =
          i > 0 ? customPrayerTimes[prayers[i - 1].toLowerCase()] : null;
        break;
      }
    }

    if (nextPrayer && previousPrayer) {
      const totalInterval = nextPrayer.getTime() - previousPrayer.getTime();
      const elapsed = currentTime.getTime() - previousPrayer.getTime();
      return Math.max(0, Math.min(100, (elapsed / totalInterval) * 100));
    }

    return 0;
  };

  // Mise à jour des actions rapides avec les types corrects pour les gradients
  const quickActions = [
    {
      icon: "compass",
      title: t("qibla"),
      route: "/qibla",
      color: "#4ECDC4",
      gradient: ["rgba(78,205,196,0.13)", "rgba(44,122,122,0.10)"] as const,
    },
    {
      icon: "heart-multiple",
      title: t("favorites") || "Favoris",
      route: "/favorites",
      color: "#FF6B6B",
      gradient: ["rgba(255,107,107,0.13)", "rgba(139,0,0,0.10)"] as const,
    },
    // 📚 NOUVELLE FONCTIONNALITÉ : Histoires du Prophète (PBUH)
    {
      icon: "account-heart",
      title: t("prophet_stories") || "Histoires du Prophète",
      route: "/prophet-stories",
      color: "#2E7D32",
      gradient: ["rgba(46,125,50,0.13)", "rgba(27,94,32,0.10)"] as const,
    },
    // Note: Récitations premium intégrées dans la page Quran
    {
      icon: "calendar-heart",
      title: t("hijri_calendar"),
      route: "/hijri",
      color: "#FFD700",
      gradient: ["rgba(255,215,0,0.12)", "rgba(255,179,102,0.10)"] as const,
    },
    {
      icon: "book-multiple",
      title: t("hadiths"),
      route: "/hadith",
      color: "#F093FB",
      gradient: ["rgba(240,147,251,0.13)", "rgba(155,75,155,0.10)"] as const,
    },
    {
      icon: "mosque",
      title: t("mosques"),
      route: "/mosques",
      color: "#B8860B",
      gradient: ["rgba(184,134,11,0.13)", "rgba(255,215,0,0.10)"] as const,
    },
  ];

  return (
    <>
      <StatusBar barStyle="light-content" />
      <ThemedImageBackground style={styles.background}>
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 180 }}
        >
          {/* 🏛️ Header Dashboard Moderne */}
          <Animated.View
            style={[
              styles.dashboardHeader,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.welcomeSection}>
              <View style={styles.welcomeTextContainer}>
                <Text
                  style={styles.welcomeText}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {settings.userFirstName
                    ? `${t("dashboard_welcome")} ${settings.userFirstName}`
                    : t("dashboard_welcome")}
                </Text>
                {settings.userFirstName && (
                  <TouchableOpacity
                    style={styles.editNameButton}
                    onPress={() => setShowPersonalizationModal(true)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <MaterialCommunityIcons
                      name="pencil-outline"
                      size={16}
                      color={
                        currentTheme === "light"
                          ? colors.textSecondary
                          : "rgba(255, 255, 255, 0.7)"
                      }
                    />
                  </TouchableOpacity>
                )}
              </View>
              <Text
                style={styles.dateText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {new Date().toLocaleDateString(
                  i18n.language.startsWith("ar")
                    ? "ar"
                    : i18n.language.startsWith("fr")
                    ? "fr-FR"
                    : i18n.language.startsWith("en")
                    ? "en-US"
                    : i18n.language.startsWith("es")
                    ? "es-ES"
                    : i18n.language.startsWith("de")
                    ? "de-DE"
                    : i18n.language.startsWith("it")
                    ? "it-IT"
                    : i18n.language.startsWith("pt")
                    ? "pt-BR"
                    : i18n.language.startsWith("ru")
                    ? "ru-RU"
                    : i18n.language.startsWith("tr")
                    ? "tr-TR"
                    : i18n.language.startsWith("nl")
                    ? "nl-NL"
                    : i18n.language.startsWith("bn")
                    ? "bn-BD"
                    : i18n.language.startsWith("ur")
                    ? "ur-PK"
                    : i18n.language.startsWith("fa")
                    ? "fa-IR"
                    : "en-US",
                  {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  }
                )}
              </Text>
              {city && (
                <Animated.View
                  style={[
                    styles.locationRow,
                    {
                      opacity: fadeAnim,
                      transform: [{ translateY: slideAnim }],
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="map-marker-outline"
                    size={16}
                    color="#4ECDC4"
                  />
                  <Text
                    style={styles.locationText}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {city}
                    {settings.locationMode === "manual" && " (Manuel)"}
                  </Text>
                </Animated.View>
              )}
            </View>

            <Animated.View
              style={{
                transform: [
                  {
                    rotate: rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "360deg"],
                    }),
                  },
                ],
              }}
            >
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => router.push("/settings")}
              >
                <MaterialCommunityIcons
                  name="cog-outline"
                  size={24}
                  color={
                    currentTheme === "light"
                      ? colors.textSecondary
                      : "rgba(255, 255, 255, 0.7)"
                  }
                />
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

          {/* 🕌 Prochaine Prière - Hero Section */}
          {(() => {
            const nextPrayer = getNextPrayerInfo(currentPrayerTimes);
            if (!nextPrayer) return null;

            return (
              <Animated.View
                style={[
                  styles.heroPrayerCard,
                  {
                    opacity: fadeAnim,
                    transform: [
                      { translateY: slideAnim },
                      { scale: scaleAnim },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={[
                    nextPrayer.name === "Fajr"
                      ? "#FF6B6B"
                      : nextPrayer.name === "Dhuhr"
                      ? "#FFD700"
                      : nextPrayer.name === "Asr"
                      ? "#FF8C42"
                      : nextPrayer.name === "Maghrib"
                      ? "#9B59B6"
                      : "#2C3E50",
                    "rgba(0,0,0,0.3)",
                  ]}
                  style={styles.heroGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.heroContent}>
                    <View style={styles.prayerInfoContainer}>
                      <Text style={styles.nextPrayerLabelText}>
                        {t("next_prayer_label")}
                      </Text>
                      <Text style={styles.prayerNameText}>
                        {nextPrayer.name}
                      </Text>
                      <Text style={styles.prayerTimeText}>
                        {nextPrayer.time}
                      </Text>
                    </View>

                    <View style={styles.countdownSection}>
                      <Text style={styles.countdownLabel}>
                        {t("countdown_in")}
                      </Text>
                      <Text style={styles.countdownTime}>
                        {nextPrayer.countdown}
                      </Text>

                      {/* Barre de progression circulaire améliorée */}
                      <View style={styles.progressContainerMain}>
                        <View style={styles.progressBarMain}>
                          <Animated.View
                            style={[
                              styles.progressFillMain,
                              {
                                width: `${getProgressPercentage()}%`,
                                backgroundColor:
                                  nextPrayer.name === "Fajr"
                                    ? "#FF6B6B"
                                    : nextPrayer.name === "Dhuhr"
                                    ? "#FFD700"
                                    : nextPrayer.name === "Asr"
                                    ? "#FF8C42"
                                    : nextPrayer.name === "Maghrib"
                                    ? "#9B59B6"
                                    : "#2C3E50",
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.progressTextMain}>
                          {Math.round(getProgressPercentage())}%
                        </Text>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </Animated.View>
            );
          })()}

          {/* 📱 Dashboard Cards - Layout Vertical Moderne */}
          <View style={styles.dashboardCards}>
            {/* Carte Dua */}
            <Animated.View
              style={[
                styles.dashboardCard,
                {
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 30],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={["rgba(255,215,0,0.12)", "rgba(255,179,102,0.10)"]}
                style={styles.cardContent}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconContainer}>
                    <MaterialCommunityIcons
                      name="hand-heart"
                      size={28}
                      color="#fffbe8"
                    />
                  </View>
                  <Text style={styles.cardTitle}>{t("dua_du_jour")}</Text>
                  <TouchableOpacity
                    style={styles.shareButton}
                    onPress={() => {
                      if (randomDua) {
                        const message = i18n.language.startsWith("ar")
                          ? `${randomDua.arabic}\n\nPartagé depuis Prayer Times App`
                          : `${randomDua.arabic}\n\n${
                              randomDua.translation
                            }\n\n${
                              randomDua.benefits || ""
                            }\n\nPartagé depuis Prayer Times App`;
                        Share.share({
                          message: message,
                        });
                      }
                    }}
                  >
                    <MaterialCommunityIcons
                      name="share-variant"
                      size={24}
                      color="#fffbe8"
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.cardBody}>
                  {randomDua ? (
                    <>
                      <Text style={styles.duaArabic}>{randomDua.arabic}</Text>
                      {!i18n.language.startsWith("ar") && (
                        <Text style={styles.duaTranslation}>
                          {randomDua.translation}
                        </Text>
                      )}
                      {randomDua.benefits &&
                        !i18n.language.startsWith("ar") && (
                          <Text style={styles.duaBenefits}>
                            {randomDua.benefits}
                          </Text>
                        )}
                    </>
                  ) : (
                    <Text style={styles.cardSubtitle}>
                      {t("dashboard_dua_fallback")}
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.cardAction}
                  onPress={() => router.push("/dhikr")}
                >
                  <Text style={styles.cardActionText}>{t("voir_plus")}</Text>
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={20}
                    color="#fffbe8"
                  />
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>

            {/* Carte Verset */}
            <Animated.View
              style={[
                styles.dashboardCard,
                {
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 30],
                        outputRange: [40, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={["rgba(78,205,196,0.13)", "rgba(44,122,122,0.10)"]}
                style={styles.cardContent}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconContainer}>
                    <MaterialCommunityIcons
                      name="book-open-variant"
                      size={28}
                      color="#fffbe8"
                    />
                  </View>
                  <Text style={styles.cardTitle}>{t("verset_du_jour")}</Text>
                  <TouchableOpacity
                    style={styles.shareButton}
                    onPress={() => {
                      if (randomVerse) {
                        const message = i18n.language.startsWith("ar")
                          ? `${randomVerse.arabic}\n\n${randomVerse.reference}\n\nPartagé depuis Prayer Times App`
                          : `${randomVerse.arabic}\n\n${randomVerse.translation}\n\n${randomVerse.reference}\n\nPartagé depuis Prayer Times App`;
                        Share.share({
                          message: message,
                        });
                      }
                    }}
                  >
                    <MaterialCommunityIcons
                      name="share-variant"
                      size={24}
                      color="#fffbe8"
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.cardBody}>
                  {randomVerse ? (
                    <>
                      <Text style={styles.versetArabic}>
                        {randomVerse.arabic}
                      </Text>
                      {!i18n.language.startsWith("ar") && (
                        <Text style={styles.versetTranslation}>
                          {randomVerse.translation}
                        </Text>
                      )}
                      <Text style={styles.versetReference}>
                        {randomVerse.reference}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.cardSubtitle}>
                      {t("dashboard_verset_fallback")}
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.cardAction}
                  onPress={() => router.push("/quran")}
                >
                  <Text style={styles.cardActionText}>{t("voir_plus")}</Text>
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={20}
                    color="#fffbe8"
                  />
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>

            {/* Carte Nom d'Allah */}
            <Animated.View
              style={[
                styles.dashboardCard,
                {
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 30],
                        outputRange: [60, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={["rgba(240,147,251,0.13)", "rgba(155,75,155,0.10)"]}
                style={styles.cardContent}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconContainer}>
                    <MaterialCommunityIcons
                      name="star-circle"
                      size={28}
                      color="#fffbe8"
                    />
                  </View>
                  <Text style={styles.cardTitle}>{t("nom_allah_du_jour")}</Text>
                  <TouchableOpacity
                    style={styles.shareButton}
                    onPress={() => {
                      if (randomName) {
                        const message = i18n.language.startsWith("ar")
                          ? `${randomName.arabic}\n\nPartagé depuis Prayer Times App`
                          : `${randomName.arabic}\n\n${randomName.translit}\n\n${randomName.meaning}\n\nPartagé depuis Prayer Times App`;
                        Share.share({
                          message: message,
                        });
                      }
                    }}
                  >
                    <MaterialCommunityIcons
                      name="share-variant"
                      size={24}
                      color="#fffbe8"
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.cardBody}>
                  {randomName ? (
                    <>
                      <Text style={styles.nameArabic}>{randomName.arabic}</Text>
                      {!i18n.language.startsWith("ar") && (
                        <>
                          <Text style={styles.nameTranslit}>
                            {randomName.translit}
                          </Text>
                          <Text style={styles.nameMeaning}>
                            {randomName.meaning}
                          </Text>
                        </>
                      )}
                    </>
                  ) : (
                    <Text style={styles.cardSubtitle}>
                      {t("dashboard_names_fallback")}
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.cardAction}
                  onPress={() => router.push("/asmaulhusna")}
                >
                  <Text style={styles.cardActionText}>{t("voir_plus")}</Text>
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={20}
                    color="#fffbe8"
                  />
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>

            {/* Carte Hadith */}
            <Animated.View
              style={[
                styles.dashboardCard,
                styles.hadithCard,
                {
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 30],
                        outputRange: [30, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={[
                  "rgba(255, 215, 0, 0.12)",
                  "rgba(255, 179, 102, 0.10)",
                ]}
                style={styles.cardContent}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconContainer}>
                    <MaterialCommunityIcons
                      name="book"
                      size={28}
                      color="#FFD700"
                    />
                  </View>
                  <Text style={styles.cardTitle}>{t("hadith_du_jour")}</Text>
                  <TouchableOpacity
                    style={styles.shareButton}
                    onPress={() => {
                      if (randomHadith) {
                        const message = i18n.language.startsWith("ar")
                          ? `${randomHadith.hadithArabic || ""}\n\n${
                              randomHadith.bookSlug
                            } – ${randomHadith.chapterNumber} – ${
                              randomHadith.hadithNumber
                            }\n\nPartagé depuis Prayer Times App`
                          : `${randomHadith.hadithArabic || ""}\n\n${
                              randomHadith.hadithEnglish ||
                              t("translation_not_available")
                            }\n\n${randomHadith.bookSlug} – ${
                              randomHadith.chapterNumber
                            } – ${
                              randomHadith.hadithNumber
                            }\n\nPartagé depuis Prayer Times App`;
                        Share.share({
                          message: message,
                        });
                      }
                    }}
                  >
                    <MaterialCommunityIcons
                      name="share-variant"
                      size={24}
                      color="#fffbe8"
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.cardBody}>
                  {randomHadith ? (
                    <>
                      {randomHadith.hadithArabic && (
                        <Text style={styles.hadithArabic}>
                          {randomHadith.hadithArabic}
                        </Text>
                      )}
                      {!i18n.language.startsWith("ar") &&
                        (randomHadith.hadithEnglish &&
                        randomHadith.hadithEnglish.trim().length > 0 ? (
                          <Text style={styles.hadithTranslation}>
                            {randomHadith.hadithEnglish}
                          </Text>
                        ) : (
                          <Text style={styles.hadithTranslation}>
                            {t("translation_not_available")}
                          </Text>
                        ))}
                      <Text style={styles.versetReference}>
                        {randomHadith.bookSlug} – {randomHadith.chapterNumber} –{" "}
                        {randomHadith.hadithNumber}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.cardSubtitle}>
                      {t("dashboard_hadith_fallback")}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.cardAction}
                  onPress={() => router.push("/hadith")}
                >
                  <Text style={styles.cardActionText}>{t("voir_plus")}</Text>
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={20}
                    color="#fffbe8"
                  />
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>
          </View>

          {/* 🎯 Section Actions Rapides - Style iOS moderne */}
          <View style={styles.quickActionsSection}>
            <Text style={styles.sectionHeaderText}>{t("actions_rapides")}</Text>

            <View style={styles.actionsContainer}>
              {quickActions.map((action, index) => (
                <Animated.View
                  key={action.route}
                  style={{
                    opacity: fadeAnim,
                    transform: [
                      {
                        translateY: slideAnim.interpolate({
                          inputRange: [0, 30],
                          outputRange: [20 + index * 5, 0],
                        }),
                      },
                    ],
                  }}
                >
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => router.push(action.route as any)}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={action.gradient}
                      style={styles.actionGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View
                        style={[
                          styles.actionIconCircle,
                          {
                            borderColor: action.color,
                            shadowColor: action.color,
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={action.icon as any}
                          size={24}
                          color={
                            currentTheme === "light" ? colors.text : "#fffbe8"
                          }
                        />
                      </View>
                      <View
                        style={{
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <Text style={styles.actionButtonText}>
                          {action.title}
                        </Text>
                      </View>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={20}
                        color={
                          currentTheme === "light"
                            ? colors.textSecondary
                            : "rgba(255, 255, 255, 0.7)"
                        }
                      />
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </View>
        </ScrollView>
      </ThemedImageBackground>

      {/* 🎯 Modal de personnalisation */}
      <WelcomePersonalizationModal
        visible={showPersonalizationModal}
        onConfirm={(firstName) => {
          settings.setUserFirstName(firstName);
          settings.setIsFirstTime(false);
          setShowPersonalizationModal(false);
        }}
        onSkip={() => {
          settings.setIsFirstTime(false);
          setShowPersonalizationModal(false);
        }}
      />
    </>
  );
}

// Fonction pour créer les styles dynamiques
const getStyles = (
  colors: any,
  overlayTextColor: string,
  overlayIconColor: string,
  currentTheme: "light" | "dark"
) =>
  StyleSheet.create({
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
      color:
        currentTheme === "light"
          ? colors.textSecondary
          : "rgba(255, 255, 255, 0.8)",
      marginLeft: 6,
      fontWeight: "500",
    },
    locationRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 6,
      backgroundColor: "rgba(78, 205, 196, 0.1)",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "rgba(78, 205, 196, 0.2)",
      maxWidth: "90%",
    },
    settingsButton: {
      padding: 12,
      borderRadius: 16,
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(255, 255, 255, 0.1)",
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(255, 255, 255, 0.2)",
      minWidth: 48,
      minHeight: 48,
      justifyContent: "center",
      alignItems: "center",
      flexShrink: 0,
    },
    dateNavigationContainer: {
      marginBottom: 16,
    },
    nextPrayerCard: {
      backgroundColor:
        currentTheme === "light" ? colors.cardBG : "rgba(0, 0, 0, 0.4)",
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(255, 255, 255, 0.1)",
      shadowColor: currentTheme === "light" ? colors.shadow : "#000",
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
      color: overlayTextColor,
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
      color: overlayTextColor,
      marginBottom: 2,
    },
    nextPrayerCountdown: {
      fontSize: 14,
      color: "#4ECDC4",
      fontWeight: "600",
    },
    progressText: {
      fontSize: 12,
      color:
        currentTheme === "light"
          ? colors.textTertiary
          : "rgba(255, 255, 255, 0.7)",
      textAlign: "center",
    },
    prayerGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: 8,
    },
    prayerCard: {
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(255, 255, 255, 0.08)",
      borderRadius: 12,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(255, 255, 255, 0.1)",
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
      color: overlayTextColor,
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
      color: overlayTextColor,
      fontSize: 10,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    loadingCard: {
      backgroundColor:
        currentTheme === "light" ? colors.cardBG : "rgba(0, 0, 0, 0.6)",
      padding: 30,
      borderRadius: 20,
      alignItems: "center",
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(255, 255, 255, 0.1)",
    },

    setupCard: {
      backgroundColor:
        currentTheme === "light" ? colors.cardBG : "rgba(0, 0, 0, 0.6)",
      padding: 30,
      borderRadius: 20,
      alignItems: "center",
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(255, 255, 255, 0.1)",
      width: "100%",
      maxWidth: 320,
    },
    setupIcon: {
      marginBottom: 20,
    },
    setupTitle: {
      fontSize: 28,
      fontWeight: "700",
      color: overlayTextColor,
      marginBottom: 12,
      textAlign: "center",
    },
    setupSubtitle: {
      fontSize: 16,
      color:
        currentTheme === "light"
          ? colors.textSecondary
          : "rgba(255, 255, 255, 0.8)",
      textAlign: "center",
      marginBottom: 25,
      lineHeight: 22,
    },
    primaryButton: {
      backgroundColor: "#2E7D32", // Vert islamique fixe
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 15,
      paddingHorizontal: 25,
      borderRadius: 12,
      marginBottom: 12,
      width: "100%",
      justifyContent: "center",
      shadowColor: "#2E7D32", // Vert islamique fixe
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    primaryButtonText: {
      color: overlayTextColor,
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
      borderColor: "#2E7D32", // Vert islamique fixe
      width: "100%",
      justifyContent: "center",
    },
    secondaryButtonText: {
      color: "#2E7D32", // Vert islamique fixe
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
      color: overlayTextColor,
      marginBottom: 12,
      textAlign: "center",
    },
    errorText: {
      color:
        currentTheme === "light"
          ? colors.textSecondary
          : "rgba(255, 255, 255, 0.8)",
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
      color: overlayTextColor,
      fontWeight: "600",
      marginBottom: 8,
      textAlign: "center",
    },
    duaArabic: {
      fontSize: 24,
      color: overlayTextColor,
      textAlign: "center",
      marginBottom: 12,
      fontFamily: "ScheherazadeNew",
      lineHeight: 36,
      flexShrink: 1, // Permet au texte de se rétrécir si nécessaire
    },
    duaTranslation: {
      fontSize: 16,
      color:
        currentTheme === "light"
          ? colors.textSecondary
          : "rgba(255, 255, 255, 0.9)",
      textAlign: "center",
      marginBottom: 8,
      lineHeight: 22,
      flexShrink: 1, // Permet au texte de se rétrécir si nécessaire
    },
    duaBenefits: {
      fontSize: 14,
      color:
        currentTheme === "light"
          ? colors.textTertiary
          : "rgba(255, 255, 255, 0.7)",
      textAlign: "center",
      fontStyle: "italic",
      lineHeight: 20,
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
      color: overlayTextColor,
      textAlign: "center",
      marginBottom: 12,
      fontFamily: "ScheherazadeNew",
      lineHeight: 36,
    },
    versetTranslation: {
      fontSize: 16,
      color:
        currentTheme === "light"
          ? colors.textSecondary
          : "rgba(255, 255, 255, 0.9)",
      textAlign: "center",
      marginBottom: 8,
      lineHeight: 22,
    },
    versetReference: {
      fontSize: 14,
      color:
        currentTheme === "light"
          ? colors.textTertiary
          : "rgba(255, 255, 255, 0.7)",
      textAlign: "center",
      fontStyle: "italic",
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

    // Styles pour la section prière
    heroPrayerCard: {
      marginBottom: 20,
      borderRadius: 24,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 24,
      elevation: 16,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.1)",
    },

    heroGradient: {
      padding: 24,
      borderRadius: 24,
    },

    heroContent: {
      gap: 20,
    },

    prayerInfoContainer: {
      flexDirection: "column",
      alignItems: "center",
    },

    nextPrayerLabelText: {
      fontSize: 18,
      fontWeight: "700",
      color: "#fffbe8",
      marginBottom: 8,
      textShadowColor: "rgba(0, 0, 0, 0.3)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },

    prayerNameText: {
      fontSize: 32,
      fontWeight: "800",
      color: "#fffbe8",
      marginBottom: 4,
      textShadowColor: "rgba(0, 0, 0, 0.3)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },

    prayerTimeText: {
      fontSize: 24,
      color: "#FFD700",
      fontWeight: "700",
      textShadowColor: "rgba(255, 215, 0, 0.3)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },

    countdownSection: {
      flexDirection: "column",
      alignItems: "center",
      gap: 12,
    },

    countdownLabel: {
      fontSize: 16,
      color: "rgba(255, 255, 255, 0.9)",
      fontWeight: "600",
      textShadowColor: "rgba(0, 0, 0, 0.2)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },

    countdownTime: {
      fontSize: 24,
      color: "#4ECDC4",
      fontWeight: "700",
      textShadowColor: "rgba(78, 205, 196, 0.3)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },

    progressContainerMain: {
      width: "100%",
      gap: 8,
      marginTop: 8,
    },

    progressBarMain: {
      height: 12,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      borderRadius: 6,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.1)",
    },

    progressFillMain: {
      height: "100%",
      borderRadius: 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },

    progressTextMain: {
      fontSize: 16,
      color: "#fffbe8",
      fontWeight: "700",
      textAlign: "center",
      textShadowColor: "rgba(0, 0, 0, 0.2)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },

    // Styles pour la grille
    dashboardGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginBottom: 20,
    },

    gridCard: {
      width: "48%",
      marginBottom: 16,
      borderRadius: 20,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 12,
    },

    gridCardContent: {
      padding: 20,
      height: 200,
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "space-between",
      borderRadius: 20,
    },

    cardIcon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 12,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.3)",
    },

    gridCardTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: "#fffbe8",
      marginBottom: 4,
      textShadowColor: "rgba(0, 0, 0, 0.3)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },

    gridCardSubtitle: {
      fontSize: 14,
      color: "rgba(255, 255, 255, 0.9)",
      textAlign: "center",
      marginTop: 4,
      lineHeight: 18,
    },

    quickAction: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 8,
      borderRadius: 12,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.3)",
      marginTop: 8,
    },

    // Styles pour les actions rapides
    quickActionsSection: {
      marginTop: 24,
      marginBottom: 20,
    },

    sectionHeaderText: {
      fontSize: 20,
      color: overlayTextColor,
      fontWeight: "700",
      marginBottom: 16,
      textAlign: "center",
      textShadowColor:
        currentTheme === "light"
          ? "rgba(255, 255, 255, 0.5)"
          : "rgba(0, 0, 0, 0.3)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },

    actionButton: {
      marginBottom: 12,
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 1.5,
      // La couleur de bordure sera dynamique selon l'action
    },

    actionGradient: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderRadius: 16,
    },

    actionIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.10)",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
      borderWidth: 1.5,
      // La couleur de bordure sera dynamique selon l'action
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
    },

    actionButtonText: {
      flex: 1,
      fontSize: 16,
      fontWeight: "600",
      color: overlayTextColor,
      textShadowColor: "#000",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },

    // Styles pour le header
    dashboardHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      padding: 16,
      backgroundColor:
        currentTheme === "light" ? colors.cardBG : "rgba(0, 0, 0, 0.3)",
      borderRadius: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(255, 255, 255, 0.1)",
      shadowColor: currentTheme === "light" ? colors.shadow : "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
      minHeight: 80,
    },

    welcomeSection: {
      flex: 1,
      flexDirection: "column",
      alignItems: "flex-start",
      marginRight: 16,
      maxWidth: "70%",
      paddingRight: 8,
    },

    welcomeTextContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 4,
    },

    editNameButton: {
      marginLeft: 8,
      padding: 4,
      borderRadius: 8,
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(255, 255, 255, 0.1)",
      opacity: 0.8,
    },

    welcomeText: {
      fontSize: 20,
      fontWeight: "800",
      color: overlayTextColor,
      marginBottom: 4,
      textShadowColor:
        currentTheme === "light"
          ? "rgba(255, 255, 255, 0.5)"
          : "rgba(0, 0, 0, 0.3)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
      flexWrap: "wrap",
      lineHeight: 24,
    },

    dateText: {
      fontSize: 14,
      color:
        currentTheme === "light"
          ? colors.textSecondary
          : "rgba(255, 255, 255, 0.9)",
      fontWeight: "600",
      textShadowColor:
        currentTheme === "light"
          ? "rgba(255, 255, 255, 0.3)"
          : "rgba(0, 0, 0, 0.2)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },

    loadingText: {
      color: THEME.colors.text.secondary,
      fontSize: 14,
      fontStyle: "italic",
    },

    dashboardCards: {
      marginBottom: 20,
    },

    dashboardCard: {
      marginBottom: 16,
      borderRadius: 20,
      overflow: "hidden",
      shadowColor: "#4ECDC4",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 18,
      elevation: 12,
      borderWidth: 1.5,
      borderColor: "#4ECDC4",
    },

    cardContent: {
      padding: 20,
      borderRadius: 20,
      backgroundColor: "rgba(44,205,196,0.10)",
    },

    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },

    cardIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(240,147,251,0.10)",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
      borderWidth: 1.5,
      borderColor: "#F093FB",
      shadowColor: "#F093FB",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.7,
      shadowRadius: 8,
    },

    cardTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: "#4ECDC4",
      textShadowColor: "#4ECDC4",
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 10,
    },

    cardBody: {
      marginBottom: 16,
    },

    cardSubtitle: {
      fontSize: 16,
      color: "rgba(255, 255, 255, 0.8)",
      textAlign: "center",
      lineHeight: 22,
    },

    cardAction: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
      borderRadius: 12,
      backgroundColor: "rgba(44,205,196,0.18)",
      borderWidth: 1.5,
      borderColor: "#4ECDC4",
      shadowColor: "#4ECDC4",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
    },

    cardActionText: {
      fontSize: 16,
      fontWeight: "600",
      color: overlayTextColor,
      marginRight: 8,
      textShadowColor: "#4ECDC4",
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 8,
    },

    // Styles spécifiques pour le contenu
    nameArabic: {
      fontSize: 32,
      color: overlayTextColor,
      textAlign: "center",
      marginBottom: 8,
      fontWeight: "700",
    },

    nameTranslit: {
      fontSize: 20,
      color:
        currentTheme === "light"
          ? colors.textSecondary
          : "rgba(255, 255, 255, 0.9)",
      textAlign: "center",
      marginBottom: 8,
      fontStyle: "italic",
    },

    nameMeaning: {
      fontSize: 16,
      color:
        currentTheme === "light"
          ? colors.textTertiary
          : "rgba(255, 255, 255, 0.8)",
      textAlign: "center",
      lineHeight: 22,
    },

    // Ajout de styles spécifiques pour la carte hadith
    hadithCard: {
      marginTop: 50, // Augmenté de 24 à 32
      marginBottom: 32, // Augmenté de 24 à 32
    },

    hadithArabic: {
      fontSize: 24,
      color: overlayTextColor,
      textAlign: "center",
      marginBottom: 12,
      fontFamily: "ScheherazadeNew",
      lineHeight: 36,
    },

    hadithTranslation: {
      fontSize: 16,
      color:
        currentTheme === "light"
          ? colors.textSecondary
          : "rgba(255, 255, 255, 0.9)",
      textAlign: "center",
      marginBottom: 8,
      lineHeight: 22,
    },

    shareButton: {
      marginLeft: "auto",
      padding: 8,
      borderRadius: 12,
      backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
  });
