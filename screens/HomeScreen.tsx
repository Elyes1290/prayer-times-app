import { MCIcon } from "@/components/icons/AppVectorIcons";
import React, {
  use,
  useState,
  useEffect,
  useMemo,
  useCallback,
  memo,
} from "react";
import {
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  NativeModules,
  StatusBar,
  Dimensions,
  Share,
} from "react-native";
import { LinearGradient } from "@/components/ui/LinearGradientView";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ThemedImageBackground from "../components/ThemedImageBackground";
import PrayerTimes from "adhan/lib/types/PrayerTimes";

import { useThemeColors } from "../hooks/useThemeAssets";
import {
  useOverlayTextColor,
  useOverlayIconColor,
  useCurrentTheme,
} from "../hooks/useThemeColor";
import { makeBoxShadow } from "../utils/shadowUtils";
import {
  useMakkaReadability,
  getHomeDashboardCardGradient,
  type MakkaReadabilityStyle,
} from "../utils/backgroundReadability";
import { SettingsContext } from "../contexts/SettingsContext";
import { useTranslation } from "react-i18next";
import { reverseGeocodeAsync } from "expo-location";
import { useLocation } from "../hooks/useLocation";
import {
  formatGeocodeLabel,
  getCachedAutoLocationCity,
} from "../utils/locationDisplay";
import { usePrayerTimes } from "../hooks/usePrayerTimes";
import { usePrayerTimesWidget } from "../hooks/usePrayerTimesWidget";
import { scheduleNotificationsFor2Days } from "../utils/sheduleAllNotificationsFor30Days";
import { debugLog, errorLog } from "../utils/logger";
import WelcomePersonalizationModal from "../components/WelcomePersonalizationModal";
import { usePremium } from "../contexts/PremiumContext";
import { useUpdateUserStats } from "../hooks/useUpdateUserStats";
import { useUniversalStyles } from "../hooks/useUniversalLayout";
import { useNetworkStatus, useOfflineAccess } from "../hooks/useNetworkStatus";
import QuranOfflineService from "../utils/QuranOfflineService";
import { HadithOfflineService } from "../utils/hadithOfflineService";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

const { AdhanModule } = NativeModules;

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
      boxShadow: "0px 0px 10px rgba(78,205,196,0.5)",
    },
    card: {
      boxShadow: "0px 8px 20px rgba(0,0,0,0.3)",
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

function getNextPrayerInfo(
  prayerTimes: PrayerTimes | null
): PrayerInfo | null {
  if (!prayerTimes) return null;

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
}

function getPrayerHeroColors(prayerName: string): {
  primary: string;
  /** Fond de secours iOS si experimental_backgroundImage ne se peint pas */
  iosFallback: string;
} {
  switch (prayerName) {
    case "Fajr":
      return { primary: "#FF6B6B", iosFallback: "rgba(140, 45, 45, 0.42)" };
    case "Dhuhr":
      return { primary: "#FFD700", iosFallback: "rgba(140, 110, 0, 0.38)" };
    case "Asr":
      return { primary: "#FF8C42", iosFallback: "rgba(150, 75, 25, 0.42)" };
    case "Maghrib":
      return { primary: "#9B59B6", iosFallback: "rgba(85, 45, 110, 0.42)" };
    default:
      return { primary: "#2C3E50", iosFallback: "rgba(25, 38, 52, 0.45)" };
  }
}

const QuickActionAnimatedItem = ({
  index,
  fadeAnim,
  slideAnim,
  children,
}: {
  index: number;
  fadeAnim: SharedValue<number>;
  slideAnim: SharedValue<number>;
  children: React.ReactNode;
}) => {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [
      {
        translateY: interpolate(slideAnim.value, [0, 30], [20 + index * 5, 0]),
      },
    ],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
};

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const { push } = useRouter();
  const [today, setToday] = useState(new Date());
  const [city, setCity] = useState<string | null>(null);
  const [showPersonalizationModal, setShowPersonalizationModal] =
    useState(false);

  // Utiliser les couleurs thématiques
  const colors = useThemeColors();
  const overlayTextColor = useOverlayTextColor();
  const overlayIconColor = useOverlayIconColor();
  const currentTheme = useCurrentTheme();
  const makkaReadability = useMakkaReadability();
  const isLightDashboardCards =
    makkaReadability.lightCards || currentTheme === "morning";
  const dashboardIconColor = isLightDashboardCards
    ? colors.primary
    : "#fffbe8";
  const dashboardActionIconColor = isLightDashboardCards
    ? colors.text
    : "#fffbe8";

  // 🚀 SOLUTION UNIVERSELLE : Compatible avec tous les appareils Samsung (S22, S24, S25 Ultra, etc.)
  const universalLayout = useUniversalStyles({
    includeNavigationPadding: false, // Pas de navigation bottom sur cette page
    safeMarginMultiplier: 1.0,
  });

  // Styles dynamiques basés sur le thème ET responsive
  const styles = getStyles(
    colors,
    overlayTextColor,
    overlayIconColor,
    currentTheme,
    universalLayout,
    makkaReadability,
  );

  // 🌐 NOUVEAU : Détection réseau pour masquer les raccourcis offline
  const networkStatus = useNetworkStatus();
  const { user: premiumUser } = usePremium();
  const { recordContentShared } = useUpdateUserStats();
  const offlineAccess = useOfflineAccess(!!premiumUser?.isPremium);

  const shareSpiritualContent = useCallback(
    (message: string, contentType: string) => {
      void recordContentShared(contentType);
      void Share.share({ message });
    },
    [recordContentShared],
  );

  // Détecter la langue de l'utilisateur pour les traductions locales
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

  // État pour le contenu aléatoire
  const [randomDua, setRandomDua] = useState<any>(null);
  const [randomVerse, setRandomVerse] = useState<any>(null);
  const [randomName, setRandomName] = useState<any>(null);
  const [randomHadith, setRandomHadith] = useState<any>(null);

  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(30);
  const scaleAnim = useSharedValue(0.95);
  const rotateAnim = useSharedValue(0);

  const setupFadeStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const dashboardHeaderStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: slideAnim.value }, { scale: scaleAnim.value }],
  }));

  const locationRowStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: slideAnim.value }],
  }));

  const settingsRotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateAnim.value * 360}deg` }],
  }));

  const heroPrayerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideAnim.value }, { scale: scaleAnim.value }],
  }));

  const duaCardStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [
      { translateY: interpolate(slideAnim.value, [0, 30], [20, 0]) },
    ],
  }));

  const versetCardStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [
      { translateY: interpolate(slideAnim.value, [0, 30], [40, 0]) },
    ],
  }));

  const nameCardStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [
      { translateY: interpolate(slideAnim.value, [0, 30], [60, 0]) },
    ],
  }));

  const hadithCardStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [
      { translateY: interpolate(slideAnim.value, [0, 30], [30, 0]) },
    ],
  }));

  const settings = use(SettingsContext);
  const { location } = useLocation();
  const { user } = usePremium();

  const handleRefreshAutoLocation = useCallback(async () => {
    if (
      settings.locationMode !== "auto" ||
      settings.isRefreshingLocation
    ) {
      return;
    }

    try {
      await settings.refreshAutoLocation();
    } catch (error) {
      errorLog("Erreur actualisation localisation:", error);
    }
  }, [
    settings.locationMode,
    settings.isRefreshingLocation,
    settings.refreshAutoLocation,
  ]);

  useEffect(() => {
    fadeAnim.value = withTiming(
      1,
      { duration: ANIMATIONS.fadeIn.duration },
      (finished) => {
        if (finished) {
          fadeAnim.value = 1;
        }
      },
    );
    slideAnim.value = withTiming(0, { duration: ANIMATIONS.slideUp.duration });
    scaleAnim.value = withSpring(1, {
      damping: ANIMATIONS.spring.friction,
      stiffness: ANIMATIONS.spring.tension,
    });
    rotateAnim.value = withTiming(1, { duration: 1000 });
  }, [fadeAnim, slideAnim, scaleAnim, rotateAnim]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (fadeAnim.value < 0.98) {
        fadeAnim.value = 1;
        slideAnim.value = 0;
        scaleAnim.value = 1;
      }
    }, ANIMATIONS.fadeIn.duration + 150);

    return () => clearTimeout(timer);
  }, [fadeAnim, slideAnim, scaleAnim]);

  // 🆕 Charger un verset aléatoire depuis QuranOfflineService
  const loadRandomVerseFromLocal = useCallback(async () => {
    try {
      // Choisir une sourate aléatoire (1-114)
      const randomSurahNumber = Math.floor(Math.random() * 114) + 1;

      // Charger la sourate via le service
      const surahData = await QuranOfflineService.getSurah(randomSurahNumber);

      if (surahData && surahData.verses && surahData.verses.length > 0) {
        // Sélectionner un verset aléatoire
        const randomVerseIndex = Math.floor(
          Math.random() * surahData.verses.length
        );
        const randomVerse = surahData.verses[randomVerseIndex];

        // Récupérer la traduction dans la langue de l'utilisateur
        const translation =
          randomVerse.translations[lang] || randomVerse.translations["en"];

        setRandomVerse({
          arabic: randomVerse.arabic_text,
          translation: translation.replace(/<[^>]*>/g, ""), // Supprimer les balises HTML
          reference: `Sourate ${randomSurahNumber} – ${randomVerse.verse_key}`,
        });
      }
    } catch (error) {
      errorLog("Erreur lors du chargement du verset local:", error);
    }
  }, [lang]);

  const loadRandomHadithFromLocal = useCallback(async () => {
    try {
      // Liste des livres de hadiths disponibles
      const hadithBooks = [
        "bukhari",
        "muslim",
        "abudawud",
        "tirmidhi",
        "nasai",
        "ibnmajah",
      ];

      // Choisir un livre aléatoire
      const randomBook =
        hadithBooks[Math.floor(Math.random() * hadithBooks.length)];

      // Charger le livre via le service
      const hadithData = await HadithOfflineService.loadBook(randomBook);

      if (hadithData && hadithData.hadiths && hadithData.hadiths.length > 0) {
        // Sélectionner un hadith aléatoire
        const randomHadithIndex = Math.floor(
          Math.random() * hadithData.hadiths.length
        );
        const randomHadith = hadithData.hadiths[randomHadithIndex];

        // Récupérer le nom du chapitre
        const chapter = hadithData.chapters?.find(
          (ch: any) => ch.id === randomHadith.chapterId
        );

        setRandomHadith({
          hadithArabic: randomHadith.arabic,
          hadithEnglish: randomHadith.english?.text || "",
          bookSlug: hadithData.metadata?.english?.title || randomBook,
          chapterNumber: chapter?.id || randomHadith.chapterId,
          hadithNumber: randomHadith.idInBook,
        });
      }
    } catch (error) {
      errorLog("Erreur lors du chargement du hadith local:", error);
    }
  }, []);

  const loadRandomContent = useCallback(async () => {
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

      // 🆕 NOUVEAU : Verset aléatoire - TOUJOURS depuis les fichiers JSON locaux (plus rapide et fiable)
      try {
        await loadRandomVerseFromLocal();
      } catch (error) {
        errorLog("Erreur lors de la récupération du verset:", error);
      }

      // 🆕 NOUVEAU : Hadith aléatoire - TOUJOURS depuis les fichiers JSON locaux (plus rapide et fiable)
      try {
        await loadRandomHadithFromLocal();
      } catch (error) {
        errorLog("Erreur lors de la récupération du hadith:", error);
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
  }, [loadRandomVerseFromLocal, loadRandomHadithFromLocal, i18n.language]);

  useEffect(() => {
    void loadRandomContent();
  }, [loadRandomContent]);

  // Permission notifications (Android 13+ et iOS)
  useEffect(() => {
    async function askNotifPermission() {
      debugLog("🔐 Vérification permissions notifications");

      if (Platform.OS === "android" && Platform.Version >= 33) {
        // Android 13+
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
      } else if (Platform.OS === "ios") {
        // iOS - Demander les permissions de notification via expo-notifications
        try {
          debugLog("🔐 [iOS] Vérification permissions notifications...");
          const { status: existingStatus } =
            await Notifications.getPermissionsAsync();
          debugLog(`🔐 [iOS] Status actuel: ${existingStatus}`);
          let finalStatus = existingStatus;

          if (existingStatus !== "granted") {
            debugLog("🔐 [iOS] Demande de permissions...");
            const { status } = await Notifications.requestPermissionsAsync({
              ios: {
                allowAlert: true,
                allowSound: true,
                allowBadge: true,
              },
            });
            finalStatus = status;
            debugLog(`🔐 [iOS] Nouveau status: ${finalStatus}`);
          }

          if (finalStatus !== "granted") {
            errorLog("❌ [iOS] Permissions notifications refusées");
            Alert.alert(
              t("notifications_disabled_title") || "Notifications désactivées",
              t("notifications_disabled_message") ||
                "Vous devez autoriser les notifications dans les Réglages iOS pour recevoir les rappels de prière et de dhikr."
            );
          } else {
            debugLog("✅ [iOS] Permissions notifications accordées");
          }
        } catch (error) {
          errorLog("❌ [iOS] Erreur demande permissions notifications:", error);
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

  const { prayerTimes: currentPrayerTimes } = usePrayerTimes(
    locationToUse,
    today,
    user?.isPremium || false
  );

  // 🕌 Hook pour le widget iOS
  const { updatePrayerTimes: updateWidget, isWidgetAvailable } = usePrayerTimesWidget();

  // ⏰ Mettre à jour 'today' automatiquement au FAJR (pas à minuit)
  useEffect(() => {
    const checkAndUpdateAtFajr = () => {
      const now = new Date();
      const currentDate = now.toDateString();
      const stateDate = today.toDateString();
      
      // Si le jour a changé ET qu'on a passé le Fajr
      if (currentDate !== stateDate && currentPrayerTimes) {
        const fajrTime = currentPrayerTimes.fajr;
        
        // Si l'heure actuelle est après le Fajr, mettre à jour
        if (now > fajrTime) {
          console.log("📅 Fajr passé, mise à jour de 'today' pour le nouveau jour");
          setToday(now);
        } else {
          console.log("⏰ Après minuit mais avant Fajr, on garde l'ancien 'today'");
        }
      }
    };
    
    // Vérifier toutes les minutes
    const interval = setInterval(checkAndUpdateAtFajr, 60000);
    
    return () => clearInterval(interval);
  }, [today, currentPrayerTimes]);

  // Mettre à jour le widget iOS quand les horaires changent
  useEffect(() => {
    if (isWidgetAvailable && currentPrayerTimes && locationToUse) {
      // Convertir les objets Date en strings au format HH:mm
      const formatTime = (date: Date): string => {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      };
      
      // Calculer aussi les horaires de demain pour le widget
      const updateWidgetWithTomorrowTimes = async () => {
        try {
          const todayFormatted = {
            Fajr: formatTime(currentPrayerTimes.fajr),
            Sunrise: formatTime(currentPrayerTimes.sunrise),
            Dhuhr: formatTime(currentPrayerTimes.dhuhr),
            Asr: formatTime(currentPrayerTimes.asr),
            Maghrib: formatTime(currentPrayerTimes.maghrib),
            Isha: formatTime(currentPrayerTimes.isha),
          };
          
          // Calculer les horaires de demain
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          const { computePrayerTimesForDate } = await import("../utils/prayerTimes");
          const tomorrowPrayerTimes = computePrayerTimesForDate(
            tomorrow,
            {
              latitude: locationToUse.coords.latitude,
              longitude: locationToUse.coords.longitude
            },
            settings.calcMethod || "MuslimWorldLeague"
          );
          
          if (tomorrowPrayerTimes) {
            const tomorrowFormatted = {
              Fajr: formatTime(tomorrowPrayerTimes.Fajr),
              Sunrise: formatTime(tomorrowPrayerTimes.Sunrise),
              Dhuhr: formatTime(tomorrowPrayerTimes.Dhuhr),
              Asr: formatTime(tomorrowPrayerTimes.Asr),
              Maghrib: formatTime(tomorrowPrayerTimes.Maghrib),
              Isha: formatTime(tomorrowPrayerTimes.Isha),
            };

            console.log("🕌 Mise à jour du widget iOS - Aujourd'hui:", todayFormatted);
            console.log("🔮 Mise à jour du widget iOS - Demain:", tomorrowFormatted);
            
            updateWidget({
              today: todayFormatted,
              tomorrow: tomorrowFormatted
            });
          }
        } catch (error) {
          console.error("❌ Erreur calcul horaires demain pour widget:", error);
          // Fallback: envoyer seulement les horaires d'aujourd'hui
          const todayFormatted = {
            Fajr: formatTime(currentPrayerTimes.fajr),
            Sunrise: formatTime(currentPrayerTimes.sunrise),
            Dhuhr: formatTime(currentPrayerTimes.dhuhr),
            Asr: formatTime(currentPrayerTimes.asr),
            Maghrib: formatTime(currentPrayerTimes.maghrib),
            Isha: formatTime(currentPrayerTimes.isha),
          };
          updateWidget(todayFormatted);
        }
      };
      
      updateWidgetWithTomorrowTimes();
    }
  }, [currentPrayerTimes, isWidgetAvailable, updateWidget, locationToUse, settings.calcMethod, today]);

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

  const quickActions = useMemo(
    () =>
      [
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
        {
          icon: "account-heart",
          title: t("prophets_stories") || "Histoires des Prophètes",
          route: "/prophet-stories",
          color: "#2E7D32",
          gradient: ["rgba(46,125,50,0.13)", "rgba(27,94,32,0.10)"] as const,
        },
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
      ].filter((action) => {
        if (action.route === "/prophet-stories") {
          return offlineAccess.canAccessOffline || networkStatus.isConnected;
        }
        return true;
      }),
    [t, offlineAccess.canAccessOffline, networkStatus.isConnected]
  );

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
          await Promise.all([
            AdhanModule.cancelAllAdhanAlarms(),
            AdhanModule.cancelAllPrayerReminders(),
            AdhanModule.cancelAllDhikrNotifications(),
          ]);
          return; // ON S'ARRÊTE ICI - Ne pas continuer
        }

        // On arrive ici UNIQUEMENT si les notifications sont activées

        await Promise.all([
          AdhanModule.cancelAllAdhanAlarms(),
          AdhanModule.cancelAllPrayerReminders(),
          AdhanModule.cancelAllDhikrNotifications(),
        ]);

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

      // 🍎 CORRECTION : Ajouter la reprogrammation pour iOS aussi !
      if (Platform.OS === "ios") {
        debugLog(
          "🍎 [iOS] Reprogrammation des notifications via scheduleNotificationsFor2Days"
        );

        // Si les notifications sont désactivées, ne rien faire
        if (!settings.notificationsEnabled) {
          debugLog(
            "🚫 [iOS] Notifications désactivées - pas de reprogrammation"
          );
          return;
        }

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

        // Programmer les notifications pour iOS (identique au bouton orange)
        await scheduleNotificationsFor2Days({
          userLocation: stableCoords,
          calcMethod: settings.calcMethod,
          settings: {
            notificationsEnabled: true,
            adhanEnabled: true,
          },
          adhanSound: settings.adhanSound,
          remindersEnabled:
            settings.notificationsEnabled && settings.remindersEnabled,
          reminderOffset: settings.reminderOffset,
          dhikrSettings: dhikrSettingsToSend,
        });

        debugLog("✅ [iOS] Reprogrammation terminée avec succès");
      }
    } catch (error) {
      errorLog("❌ Erreur lors de la mise à jour des notifications:", error);
    }
  };

  // 🍎 NOUVEAU : Reprogrammation silencieuse à l'ouverture de l'app (iOS uniquement)
  // Car le background fetch iOS est capricieux, on force une reprog discrète toutes les 6h max.
  useEffect(() => {
    if (Platform.OS !== "ios") return;

    const reprogramIfNeeded = async () => {
      try {
        const lastUpdate = await AsyncStorage.getItem(
          "last_notif_reprogram_ios"
        );
        const now = Date.now();
        const sixHours = 6 * 60 * 60 * 1000;

        if (!lastUpdate || now - parseInt(lastUpdate) > sixHours) {
          console.log(
            "🚀🚀🚀 [iOS] AUTO-REPROG: Lancement de la reprogrammation automatique (ouverture app)"
          );
          debugLog("🍎 [iOS] Reprogrammation silencieuse (throttle 6h)...");
          await updateNotifications();
          await AsyncStorage.setItem(
            "last_notif_reprogram_ios",
            now.toString()
          );
        }
      } catch (err) {
        errorLog("❌ [iOS] Erreur reprog silencieuse:", err);
      }
    };

    if (currentPrayerTimes && stableCoords) {
      reprogramIfNeeded();
    }
  }, [currentPrayerTimes, stableCoords]);

  // Timer pour vérifier périodiquement si on doit reprogrammer (après Isha) et mettre à jour le widget
  useEffect(() => {
    const checkAndReschedule = async () => {
      if (!currentPrayerTimes) return;

      const now = new Date();

      // 🚀 NOUVEAU : S'assurer que 'today' est au moins le jour actuel (now)
      // Si on est en retard (ex: on ouvre l'app le matin et today est resté à hier),
      // on doit d'abord se caler sur aujourd'hui avant de décider si on passe à demain (post-Isha).
      // Cela évite de sauter directement au lendemain soir (24h plus tard) le matin.
      if (now.toDateString() !== today.toDateString()) {
        // On ne recale sur 'now' que si 'now' est dans le futur par rapport à 'today'
        if (now.getTime() > today.getTime()) {
          const startOfNow = new Date(now);
          startOfNow.setHours(0, 0, 0, 0);
          debugLog(
            "📅 Rattrapage de la date vers aujourd'hui: " +
              startOfNow.toDateString()
          );
          setToday(startOfNow);
          return; // Sortir et attendre la mise à jour des horaires
        }
      }

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
      if (settings.locationMode === "manual" && settings.manualLocation?.city) {
        setCity(settings.manualLocation.city);
        return;
      }

      if (settings.locationMode === "auto") {
        const cachedCity = getCachedAutoLocationCity(settings.autoLocation);
        if (cachedCity) {
          setCity(cachedCity);
          return;
        }

        if (!location?.coords) {
          setCity(null);
          return;
        }

        try {
          const { getForegroundPermissionsAsync } = await import(
            "expo-location"
          );
          const { status } = await getForegroundPermissionsAsync();

          if (status !== "granted") {
            // Coords sauvegardées mais pas de permission (ex. iOS « Autoriser une fois »)
            setCity(null);
            return;
          }

          const geocodeResult = await reverseGeocodeAsync(location.coords);
          const cityLabel = formatGeocodeLabel(geocodeResult[0]);
          if (cityLabel) {
            setCity(cityLabel);
            void settings.cacheAutoLocationLabel(cityLabel);
            return;
          }

          setCity("Localisation inconnue");
        } catch (error) {
          errorLog("Erreur reverse geocoding:", error);
          setCity(null);
        }
        return;
      }

      setCity(null);
    }

    if (settings.locationMode !== null) {
      updateCity();
    }
  }, [
    settings.locationMode,
    settings.manualLocation?.city,
    settings.autoLocation?.city,
    settings.autoLocation?.lat,
    settings.autoLocation?.lon,
    settings.cacheAutoLocationLabel,
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

  // 🚀 Si localisation pas configurée - afficher l'interface de setup (comme PrayerScreen)
  if (settings.locationMode === null) {
    return (
      <ThemedImageBackground style={styles.background}>
        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />
        <View style={styles.centeredContainer}>
          <View style={styles.setupCard}>
            <MCIcon
              name="map-marker-radius"
              size={70}
              color={"#2E7D32"}
              style={styles.setupIcon}
            />
            <Text style={styles.setupTitle}>{t("prayer_times")}</Text>
            <Text style={styles.setupSubtitle}>
              {t("first_time_welcome") ||
                "Bienvenue ! Choisissez votre mode de localisation :"}
            </Text>

            <Pressable
              style={styles.primaryButton}
              onPress={() =>
                push("/settings?openLocation=true&mode=manual")
              }
            >
              <MCIcon name="city" size={24} color="#fff" />
              <Text style={styles.primaryButtonText}>
                {t("enter_city") || "Entrer ville manuellement"}
              </Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={async () => {
                settings.setLocationMode("auto");
                try {
                  await settings.refreshAutoLocation();
                } catch (error) {
                  console.log("Erreur refresh auto location:", error);
                }
              }}
            >
              <MCIcon
                name="crosshairs-gps"
                size={24}
                color={"#2E7D32"}
              />
              <Text style={styles.secondaryButtonText}>
                {t("automatic") || "Utiliser GPS automatique"}
              </Text>
            </Pressable>
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
          <Animated.View style={[styles.setupCard, setupFadeStyle]}>
            <MCIcon
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

            <Pressable
              style={styles.primaryButton}
              onPress={() =>
                push("/settings?openLocation=true&mode=manual")
              }
            >
              <MCIcon
                name="city"
                size={24}
                color={overlayIconColor}
              />
              <Text style={styles.primaryButtonText}>
                {t("enter_city") || "Entrer ville manuellement"}
              </Text>
            </Pressable>

            <Pressable
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
              <MCIcon
                name="crosshairs-gps"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.secondaryButtonText}>
                {t("automatic") || "Utiliser GPS automatique"}
              </Text>
            </Pressable>
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
            <MCIcon
              name="alert-circle"
              size={60}
              color="#ff6b6b"
              style={styles.errorIcon}
            />
            <Text style={styles.errorTitle}>{t("prayer_times")}</Text>
            <Text style={styles.errorText}>{settings.errorMsg}</Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() =>
                push("/settings?openLocation=true&mode=manual")
              }
            >
              <MCIcon
                name="cog"
                size={20}
                color={overlayIconColor}
              />
              <Text style={styles.primaryButtonText}>
                {t("settings") || "Aller aux paramètres"}
              </Text>
            </Pressable>
          </View>
        </View>
      </ThemedImageBackground>
    );
  }

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
          <Animated.View style={[styles.dashboardHeader, dashboardHeaderStyle]}>
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
                  <Pressable
                    style={styles.editNameButton}
                    onPress={() => setShowPersonalizationModal(true)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <MCIcon
                      name="pencil-outline"
                      size={16}
                      color={colors.textSecondary} // 🌅 Utilise la couleur du thème actif
                    />
                  </Pressable>
                )}
              </View>
              <Text
                style={styles.dateText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {today.toLocaleDateString(
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
              {(city ||
                (settings.locationMode === "auto" && settings.autoLocation)) && (
                <Animated.View style={[styles.locationRow, locationRowStyle]}>
                  <MCIcon
                    name="map-marker-outline"
                    size={16}
                    color="#4ECDC4"
                  />
                  <Text
                    style={styles.locationText}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {city ||
                      (settings.isRefreshingLocation
                        ? t("location.updating", "Mise à jour...")
                        : t("refresh_location", "Actualiser la position"))}
                    {settings.locationMode === "manual" && " (Manuel)"}
                  </Text>
                  {settings.locationMode === "auto" && (
                    <Pressable
                      style={styles.locationRefreshButton}
                      onPress={handleRefreshAutoLocation}
                      disabled={settings.isRefreshingLocation}
                      accessibilityRole="button"
                      accessibilityLabel={t(
                        "refresh_location",
                        "Actualiser la position",
                      )}
                      hitSlop={8}
                    >
                      {settings.isRefreshingLocation ? (
                        <ActivityIndicator size="small" color="#4ECDC4" />
                      ) : (
                        <MCIcon name="sync" size={16} color="#4ECDC4" />
                      )}
                    </Pressable>
                  )}
                </Animated.View>
              )}
            </View>

            <Animated.View style={settingsRotateStyle}>
              <Pressable
                style={styles.settingsButton}
                onPress={() =>
                  push("/settings?openLocation=true&mode=manual")
                }
              >
                <MCIcon
                  name="cog-outline"
                  size={24}
                  color={colors.textSecondary} // 🌅 Utilise la couleur du thème actif
                />
              </Pressable>
            </Animated.View>
          </Animated.View>

          {/* 🕌 Prochaine Prière - Hero Section */}
          {(() => {
            const nextPrayer = getNextPrayerInfo(currentPrayerTimes);
            if (!nextPrayer) return null;

            const heroColors = getPrayerHeroColors(nextPrayer.name);

            return (
              <Animated.View style={[styles.heroPrayerCard, heroPrayerStyle]}>
                <LinearGradient
                  colors={[
                    heroColors.primary,
                    makkaReadability.mode === "maghrib"
                      ? "rgba(0,0,0,0.72)"
                      : makkaReadability.mode === "morning"
                        ? "rgba(60, 45, 35, 0.55)"
                        : "rgba(0,0,0,0.3)",
                  ]}
                  style={[
                    styles.heroGradient,
                    Platform.OS === "ios" && {
                      backgroundColor:
                        makkaReadability.mode === "maghrib"
                          ? "rgba(26, 20, 16, 0.82)"
                          : makkaReadability.mode === "morning"
                            ? "rgba(255, 250, 240, 0.78)"
                            : heroColors.iosFallback,
                    },
                  ]}
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
                                backgroundColor: heroColors.primary,
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
            <Animated.View style={[styles.dashboardCard, duaCardStyle]}>
              <LinearGradient
                colors={getHomeDashboardCardGradient(
                  makkaReadability,
                  currentTheme,
                )}
                style={styles.cardContent}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconContainer}>
                    <MCIcon
                      name="hand-heart"
                      size={28}
                      color={dashboardIconColor}
                    />
                  </View>
                  <Text style={styles.cardTitle}>{t("dua_du_jour")}</Text>
                  <Pressable
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
                        shareSpiritualContent(message, "dua");
                      }
                    }}
                  >
                    <MCIcon
                      name="share-variant"
                      size={24}
                      color={dashboardActionIconColor}
                    />
                  </Pressable>
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

                <Pressable
                  style={styles.cardAction}
                  onPress={() => push("/dhikr")}
                >
                  <Text style={styles.cardActionText}>{t("voir_plus")}</Text>
                  <MCIcon
                    name="arrow-right"
                    size={20}
                    color={dashboardActionIconColor}
                  />
                </Pressable>
              </LinearGradient>
            </Animated.View>

            {/* Carte Verset */}
            <Animated.View style={[styles.dashboardCard, versetCardStyle]}>
              <LinearGradient
                colors={getHomeDashboardCardGradient(
                  makkaReadability,
                  currentTheme,
                )}
                style={styles.cardContent}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconContainer}>
                    <MCIcon
                      name="book-open-variant"
                      size={28}
                      color={dashboardIconColor}
                    />
                  </View>
                  <Text style={styles.cardTitle}>{t("verset_du_jour")}</Text>
                  <Pressable
                    style={styles.shareButton}
                    onPress={() => {
                      if (randomVerse) {
                        const message = i18n.language.startsWith("ar")
                          ? `${randomVerse.arabic}\n\n${randomVerse.reference}\n\nPartagé depuis Prayer Times App`
                          : `${randomVerse.arabic}\n\n${randomVerse.translation}\n\n${randomVerse.reference}\n\nPartagé depuis Prayer Times App`;
                        shareSpiritualContent(message, "verse");
                      }
                    }}
                  >
                    <MCIcon
                      name="share-variant"
                      size={24}
                      color={dashboardActionIconColor}
                    />
                  </Pressable>
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

                <Pressable
                  style={styles.cardAction}
                  onPress={() => push("/quran")}
                >
                  <Text style={styles.cardActionText}>{t("voir_plus")}</Text>
                  <MCIcon
                    name="arrow-right"
                    size={20}
                    color={dashboardActionIconColor}
                  />
                </Pressable>
              </LinearGradient>
            </Animated.View>

            {/* Carte Nom d'Allah */}
            <Animated.View style={[styles.dashboardCard, nameCardStyle]}>
              <LinearGradient
                colors={getHomeDashboardCardGradient(
                  makkaReadability,
                  currentTheme,
                )}
                style={styles.cardContent}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconContainer}>
                    <MCIcon
                      name="star-circle"
                      size={28}
                      color={dashboardIconColor}
                    />
                  </View>
                  <Text style={styles.cardTitle}>{t("nom_allah_du_jour")}</Text>
                  <Pressable
                    style={styles.shareButton}
                    onPress={() => {
                      if (randomName) {
                        const message = i18n.language.startsWith("ar")
                          ? `${randomName.arabic}\n\nPartagé depuis Prayer Times App`
                          : `${randomName.arabic}\n\n${randomName.translit}\n\n${randomName.meaning}\n\nPartagé depuis Prayer Times App`;
                        shareSpiritualContent(message, "asma");
                      }
                    }}
                  >
                    <MCIcon
                      name="share-variant"
                      size={24}
                      color={dashboardActionIconColor}
                    />
                  </Pressable>
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

                <Pressable
                  style={styles.cardAction}
                  onPress={() => push("/asmaulhusna")}
                >
                  <Text style={styles.cardActionText}>{t("voir_plus")}</Text>
                  <MCIcon
                    name="arrow-right"
                    size={20}
                    color={dashboardActionIconColor}
                  />
                </Pressable>
              </LinearGradient>
            </Animated.View>

            {/* Carte Hadith */}
            <Animated.View
              style={[styles.dashboardCard, styles.hadithCard, hadithCardStyle]}
            >
              <LinearGradient
                colors={getHomeDashboardCardGradient(
                  makkaReadability,
                  currentTheme,
                )}
                style={styles.cardContent}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconContainer}>
                    <MCIcon
                      name="book"
                      size={28}
                      color={dashboardIconColor}
                    />
                  </View>
                  <Text style={styles.cardTitle}>{t("hadith_du_jour")}</Text>
                  <Pressable
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
                        shareSpiritualContent(message, "hadith");
                      }
                    }}
                  >
                    <MCIcon
                      name="share-variant"
                      size={24}
                      color={dashboardActionIconColor}
                    />
                  </Pressable>
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
                <Pressable
                  style={styles.cardAction}
                  onPress={() => push("/hadith")}
                >
                  <Text style={styles.cardActionText}>{t("voir_plus")}</Text>
                  <MCIcon
                    name="arrow-right"
                    size={20}
                    color={dashboardActionIconColor}
                  />
                </Pressable>
              </LinearGradient>
            </Animated.View>
          </View>

          {/* 🎯 Section Actions Rapides - Style iOS moderne */}
          <View style={styles.quickActionsSection}>
            <Text style={styles.sectionHeaderText}>{t("actions_rapides")}</Text>

            <View style={styles.actionsContainer}>
              {quickActions.map((action, index) => (
                <QuickActionAnimatedItem
                  key={action.route}
                  index={index}
                  fadeAnim={fadeAnim}
                  slideAnim={slideAnim}
                >
                  <Pressable
                    style={styles.actionButton}
                    onPress={() => push(action.route as any)}
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
                            boxShadow: makeBoxShadow(action.color, 0, 0, 8, 0.5),
                          },
                        ]}
                      >
                        <MCIcon
                          name={action.icon as any}
                          size={24}
                          color={colors.text} // 🌅 Utilise la couleur du thème actif
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
                      <MCIcon
                        name="chevron-right"
                        size={20}
                        color={colors.textSecondary} // 🌅 Utilise la couleur du thème actif
                      />
                    </LinearGradient>
                  </Pressable>
                </QuickActionAnimatedItem>
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
  currentTheme: "light" | "dark" | "morning" | "sunset",
  universalLayout: any,
  makkaReadability: MakkaReadabilityStyle,
) => {
  const isMakkaBoost = makkaReadability.active;
  const isPhotoTheme =
    currentTheme === "morning" ||
    currentTheme === "sunset" ||
    currentTheme === "dark";
  const useOpaqueCards = isMakkaBoost || isPhotoTheme;
  const isLightCardSurface =
    makkaReadability.lightCards || currentTheme === "morning";
  const cardAccent = useOpaqueCards ? colors.primary : "#4ECDC4";
  const cardTextShadow = useOpaqueCards
    ? isLightCardSurface
      ? {
          textShadowColor: "rgba(255, 255, 255, 0.85)",
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 3,
        }
      : {
          textShadowColor: "rgba(0, 0, 0, 0.55)",
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 4,
        }
    : {};
  const boostedBodyText = (fallback: string) =>
    isLightCardSurface
      ? colors.text
      : useOpaqueCards
        ? overlayTextColor
        : fallback;
  const boostedMutedText = (fallback: string) =>
    isLightCardSurface
      ? colors.textSecondary
      : useOpaqueCards
        ? overlayTextColor
        : fallback;

  return StyleSheet.create({
    background: {
      flex: 1,
      width: "100%",
      height: "100%",
    },
    container: {
      flexGrow: 1,
      // 🚀 RESPONSIVE : Padding adaptatif selon la taille d'écran
      paddingHorizontal: universalLayout.contentPaddingHorizontal,
      paddingTop: Math.max(universalLayout.safeAreaTop + 16, 50),
      paddingBottom: universalLayout.contentPaddingVertical,
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
      flex: 1,
      flexShrink: 1,
      fontSize: 14,
      color: colors.textSecondary, // 🌅 Utilise la couleur du thème actif
      marginLeft: 6,
      fontWeight: "500",
    },
    locationRefreshButton: {
      marginLeft: 6,
      padding: 4,
      justifyContent: "center",
      alignItems: "center",
      minWidth: 28,
      minHeight: 28,
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
      backgroundColor: colors.surface, // 🌅 Utilise la couleur du thème actif
      borderWidth: 1,
      borderColor: colors.border, // 🌅 Utilise la couleur du thème actif
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
      backgroundColor: colors.cardBG, // 🌅 Utilise la couleur du thème actif
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border, // 🌅 Utilise la couleur du thème actif
      boxShadow: makeBoxShadow(colors.shadow, 0, 4, 12, 0.3),
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
      color: colors.textTertiary, // 🌅 Utilise la couleur du thème actif
      textAlign: "center",
    },
    prayerGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: 8,
    },
    prayerCard: {
      backgroundColor: colors.surface, // 🌅 Utilise la couleur du thème actif
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border, // 🌅 Utilise la couleur du thème actif
      overflow: "hidden",
      width: "48%",
      marginBottom: 8,
    },
    prayerCardActive: {
      backgroundColor: "rgba(78, 205, 196, 0.15)",
      borderColor: "#4ECDC4",
      borderWidth: 2,
      boxShadow: "0px 0px 8px rgba(78,205,196,0.3)",
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
      backgroundColor: colors.cardBG, // 🌅 Utilise la couleur du thème actif
      padding: 30,
      borderRadius: 20,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border, // 🌅 Utilise la couleur du thème actif
    },

    setupCard: {
      backgroundColor: colors.cardBG, // 🌅 Utilise la couleur du thème actif
      padding: 30,
      borderRadius: 20,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border, // 🌅 Utilise la couleur du thème actif
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
      color: colors.textSecondary, // 🌅 Utilise la couleur du thème actif
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
      boxShadow: "0px 4px 8px rgba(46,125,50,0.3)",
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
      color: colors.textSecondary, // 🌅 Utilise la couleur du thème actif
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
      color: isLightCardSurface ? colors.text : overlayTextColor,
      textAlign: "center",
      marginBottom: 12,
      fontFamily: "ScheherazadeNew",
      lineHeight: 36,
      flexShrink: 1,
      ...cardTextShadow,
    },
    duaTranslation: {
      fontSize: 16,
      color: boostedBodyText(colors.textSecondary),
      textAlign: "center",
      marginBottom: 8,
      lineHeight: 22,
      flexShrink: 1,
      opacity: useOpaqueCards ? 0.98 : 1,
      ...cardTextShadow,
    },
    duaBenefits: {
      fontSize: 14,
      color: boostedMutedText(colors.textTertiary),
      textAlign: "center",
      fontStyle: "italic",
      lineHeight: 20,
      opacity: useOpaqueCards ? 0.92 : 1,
      ...cardTextShadow,
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
      color: isLightCardSurface ? colors.text : overlayTextColor,
      textAlign: "center",
      marginBottom: 12,
      fontFamily: "ScheherazadeNew",
      lineHeight: 36,
      ...cardTextShadow,
    },
    versetTranslation: {
      fontSize: 16,
      color: boostedBodyText(colors.textSecondary),
      textAlign: "center",
      marginBottom: 8,
      lineHeight: 22,
      opacity: useOpaqueCards ? 0.98 : 1,
      ...cardTextShadow,
    },
    versetReference: {
      fontSize: 14,
      color: boostedMutedText(colors.textTertiary),
      textAlign: "center",
      fontStyle: "italic",
      opacity: useOpaqueCards ? 0.92 : 1,
      ...cardTextShadow,
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
      boxShadow: "0px 6px 15px rgba(0,0,0,0.3)",
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
      boxShadow: "0px 4px 8px rgba(0,0,0,0.2)",
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
      boxShadow: "0px 8px 24px rgba(0,0,0,0.4)",
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
      color: isLightCardSurface
        ? colors.primary
        : useOpaqueCards
          ? "#FFF8E7"
          : "#4ECDC4",
      fontWeight: "700",
      textShadowColor: useOpaqueCards
        ? isLightCardSurface
          ? "rgba(255, 255, 255, 0.75)"
          : "rgba(0, 0, 0, 0.5)"
        : "rgba(78, 205, 196, 0.3)",
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
      boxShadow: "0px 2px 4px rgba(0,0,0,0.3)",
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
      // 🚀 RESPONSIVE : Largeur adaptative selon la taille d'écran - corrige le problème sur S24/S25 Ultra
      width: universalLayout.isSmallScreen
        ? "46%"
        : universalLayout.isLargeScreen
        ? "47%"
        : "48%",
      marginBottom: universalLayout.spacing.md,
      borderRadius: universalLayout.borderRadius.lg,
      overflow: "hidden",
      boxShadow: "0px 8px 20px rgba(0,0,0,0.3)",
    },

    gridCardContent: {
      // 🚀 RESPONSIVE : Padding et hauteur adaptatifs selon la densité d'écran
      padding: universalLayout.isSmallScreen ? 16 : 20,
      height: universalLayout.isSmallScreen
        ? 180
        : universalLayout.isLargeScreen
        ? 220
        : 200,
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
      textShadowColor: colors.shadow, // 🌅 Utilise la couleur du thème actif
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
      // La couleur de bordure et l'ombre seront dynamiques selon l'action (injectées en ligne)
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
      backgroundColor: colors.cardBG,
      borderRadius: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
      boxShadow: makeBoxShadow(colors.shadow, 0, 4, 12, 0.3),
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
      backgroundColor: colors.surface, // 🌅 Utilise la couleur du thème actif
      opacity: 0.8,
    },

    welcomeText: {
      fontSize: 20,
      fontWeight: "800",
      color: overlayTextColor,
      marginBottom: 4,
      textShadowColor: colors.shadow, // 🌅 Utilise la couleur du thème actif
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
      flexWrap: "wrap",
      lineHeight: 24,
    },

    dateText: {
      fontSize: 14,
      color: colors.textSecondary, // 🌅 Utilise la couleur du thème actif
      fontWeight: "600",
      textShadowColor: colors.shadow, // 🌅 Utilise la couleur du thème actif
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
      boxShadow: useOpaqueCards
        ? isLightCardSurface
          ? "0px 8px 22px rgba(60,45,35,0.3)"
          : "0px 8px 22px rgba(0,0,0,0.5)"
        : "0px 0px 18px rgba(78,205,196,0.5)",
      borderWidth: 1.5,
      borderColor: cardAccent,
    },

    cardContent: {
      padding: 20,
      borderRadius: 20,
      backgroundColor: useOpaqueCards
        ? "transparent"
        : "rgba(44,205,196,0.10)",
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
      boxShadow: "0px 0px 8px rgba(240,147,251,0.7)",
    },

    cardTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: cardAccent,
      textShadowColor: useOpaqueCards
        ? isLightCardSurface
          ? "rgba(255, 255, 255, 0.8)"
          : "rgba(0, 0, 0, 0.55)"
        : cardAccent,
      textShadowOffset: { width: 0, height: useOpaqueCards ? 1 : 0 },
      textShadowRadius: useOpaqueCards ? 4 : 10,
    },

    cardBody: {
      marginBottom: 16,
    },

    cardSubtitle: {
      fontSize: 16,
      color: isLightCardSurface
        ? colors.textSecondary
        : "rgba(255, 255, 255, 0.8)",
      textAlign: "center",
      lineHeight: 22,
    },

    cardAction: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
      borderRadius: 12,
      backgroundColor: useOpaqueCards
        ? isLightCardSurface
          ? "rgba(232, 168, 124, 0.28)"
          : "rgba(255, 140, 66, 0.24)"
        : "rgba(44,205,196,0.18)",
      borderWidth: 1.5,
      borderColor: cardAccent,
      boxShadow: useOpaqueCards
        ? isLightCardSurface
          ? "0px 4px 12px rgba(60,45,35,0.25)"
          : "0px 4px 12px rgba(0,0,0,0.4)"
        : "0px 0px 8px rgba(78,205,196,0.5)",
    },

    cardActionText: {
      fontSize: 16,
      fontWeight: "600",
      color: isLightCardSurface ? colors.text : overlayTextColor,
      marginRight: 8,
      textShadowColor: useOpaqueCards
        ? isLightCardSurface
          ? "rgba(255, 255, 255, 0.7)"
          : "rgba(0, 0, 0, 0.45)"
        : cardAccent,
      textShadowOffset: { width: 0, height: useOpaqueCards ? 1 : 0 },
      textShadowRadius: useOpaqueCards ? 3 : 8,
    },

    // Styles spécifiques pour le contenu
    nameArabic: {
      fontSize: 32,
      color: isLightCardSurface ? colors.text : overlayTextColor,
      textAlign: "center",
      marginBottom: 8,
      fontWeight: "700",
    },

    nameTranslit: {
      fontSize: 20,
      color: boostedBodyText(colors.textSecondary),
      textAlign: "center",
      marginBottom: 8,
      fontStyle: "italic",
      opacity: useOpaqueCards ? 0.98 : 1,
      ...cardTextShadow,
    },

    nameMeaning: {
      fontSize: 16,
      color: boostedMutedText(colors.textTertiary),
      textAlign: "center",
      lineHeight: 22,
      opacity: useOpaqueCards ? 0.92 : 1,
      ...cardTextShadow,
    },

    // Ajout de styles spécifiques pour la carte hadith
    hadithCard: {
      marginTop: 50, // Augmenté de 24 à 32
      marginBottom: 32, // Augmenté de 24 à 32
    },

    hadithArabic: {
      fontSize: 24,
      color: isLightCardSurface ? colors.text : overlayTextColor,
      textAlign: "center",
      marginBottom: 12,
      fontFamily: "ScheherazadeNew",
      lineHeight: 36,
      ...cardTextShadow,
    },

    hadithTranslation: {
      fontSize: 16,
      color: boostedBodyText(colors.textSecondary),
      textAlign: "center",
      marginBottom: 8,
      lineHeight: 22,
      opacity: useOpaqueCards ? 0.98 : 1,
      ...cardTextShadow,
    },

    shareButton: {
      marginLeft: "auto",
      padding: 8,
      borderRadius: 12,
      backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
  });
};
