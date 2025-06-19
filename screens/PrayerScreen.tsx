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
  Image,
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
import AsyncStorage from "@react-native-async-storage/async-storage";
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

// Composant pour les sections d'apprentissage collapsibles
const LearningSection = () => {
  const { t } = useTranslation();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const CollapsibleCard = ({
    id,
    title,
    icon,
    color,
    children,
  }: {
    id: string;
    title: string;
    icon: string;
    color: string;
    children: React.ReactNode;
  }) => {
    const isExpanded = expandedSection === id;

    return (
      <View style={learningStyles.card}>
        <TouchableOpacity
          style={learningStyles.cardHeader}
          onPress={() => toggleSection(id)}
          activeOpacity={0.7}
        >
          <View style={learningStyles.cardHeaderLeft}>
            <View
              style={[learningStyles.iconContainer, { backgroundColor: color }]}
            >
              <MaterialCommunityIcons
                name={icon as any}
                size={24}
                color="#fff"
              />
            </View>
            <Text style={learningStyles.cardTitle}>{title}</Text>
          </View>
          <MaterialCommunityIcons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={24}
            color="#4ECDC4"
          />
        </TouchableOpacity>

        {isExpanded && (
          <Animated.View style={learningStyles.cardContent}>
            {children}
          </Animated.View>
        )}
      </View>
    );
  };

  return (
    <View style={learningStyles.container}>
      <View style={learningStyles.sectionHeader}>
        <MaterialCommunityIcons name="school" size={28} color="#FFD700" />
        <Text style={learningStyles.sectionTitle}>{t("learn_to_pray")}</Text>
      </View>

      {/* Section Ablutions */}
      <CollapsibleCard
        id="wudu"
        title={t("ablutions_wudu")}
        icon="water"
        color="rgba(78, 205, 196, 0.8)"
      >
        <View style={learningStyles.stepContainer}>
          <Text style={learningStyles.stepTitle}>{t("wudu_steps")}:</Text>

          <View style={learningStyles.step}>
            <View style={learningStyles.stepContent}>
              <Text style={learningStyles.stepNumber}>1.</Text>
              <View style={learningStyles.stepTextContainer}>
                <Text style={learningStyles.stepText}>{t("wudu_step_1")}</Text>
                <View style={learningStyles.invocationContainer}>
                  <Text style={learningStyles.invocationArabic}>
                    {t("wudu_invocation_arabic")}
                  </Text>
                  <Text style={learningStyles.invocationPhonetic}>
                    {t("wudu_invocation_phonetic")}
                  </Text>
                  <Text style={learningStyles.invocationTranslation}>
                    {t("wudu_invocation_translation")}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={learningStyles.step}>
            <View style={learningStyles.stepContent}>
              <Text style={learningStyles.stepNumber}>2.</Text>
              <Text style={learningStyles.stepText}>{t("wudu_step_2")}</Text>
            </View>
            <Image
              source={require("../assets/images/mains.jpg")}
              style={learningStyles.stepImage}
              resizeMode="cover"
            />
          </View>

          <View style={learningStyles.step}>
            <View style={learningStyles.stepContent}>
              <Text style={learningStyles.stepNumber}>3.</Text>
              <Text style={learningStyles.stepText}>{t("wudu_step_3")}</Text>
            </View>
            <Image
              source={require("../assets/images/bouche.jpg")}
              style={learningStyles.stepImage}
              resizeMode="cover"
            />
          </View>

          <View style={learningStyles.step}>
            <View style={learningStyles.stepContent}>
              <Text style={learningStyles.stepNumber}>4.</Text>
              <Text style={learningStyles.stepText}>{t("wudu_step_4")}</Text>
            </View>
            <Image
              source={require("../assets/images/nez.jpg")}
              style={learningStyles.stepImage}
              resizeMode="cover"
            />
          </View>

          <View style={learningStyles.step}>
            <View style={learningStyles.stepContent}>
              <Text style={learningStyles.stepNumber}>5.</Text>
              <Text style={learningStyles.stepText}>{t("wudu_step_5")}</Text>
            </View>
            <Image
              source={require("../assets/images/visage.jpg")}
              style={learningStyles.stepImage}
              resizeMode="cover"
            />
          </View>

          <View style={learningStyles.step}>
            <View style={learningStyles.stepContent}>
              <Text style={learningStyles.stepNumber}>6.</Text>
              <Text style={learningStyles.stepText}>{t("wudu_step_6")}</Text>
            </View>
            <Image
              source={require("../assets/images/bras.jpg")}
              style={learningStyles.stepImage}
              resizeMode="cover"
            />
          </View>

          <View style={learningStyles.step}>
            <View style={learningStyles.stepContent}>
              <Text style={learningStyles.stepNumber}>7.</Text>
              <Text style={learningStyles.stepText}>{t("wudu_step_7")}</Text>
            </View>
            <Image
              source={require("../assets/images/tete.jpg")}
              style={learningStyles.stepImage}
              resizeMode="cover"
            />
          </View>

          <View style={learningStyles.step}>
            <View style={learningStyles.stepContent}>
              <Text style={learningStyles.stepNumber}>8.</Text>
              <Text style={learningStyles.stepText}>{t("wudu_step_8")}</Text>
            </View>
            <Image
              source={require("../assets/images/oreilles.jpg")}
              style={learningStyles.stepImage}
              resizeMode="cover"
            />
          </View>

          <View style={learningStyles.step}>
            <View style={learningStyles.stepContent}>
              <Text style={learningStyles.stepNumber}>9.</Text>
              <Text style={learningStyles.stepText}>{t("wudu_step_9")}</Text>
            </View>
            <Image
              source={require("../assets/images/pied.jpg")}
              style={learningStyles.stepImage}
              resizeMode="cover"
            />
          </View>
        </View>
      </CollapsibleCard>

      {/* Section Prière */}
      <CollapsibleCard
        id="prayer"
        title={t("prayer_positions")}
        icon="human-handsup"
        color="rgba(255, 215, 0, 0.8)"
      >
        <View style={learningStyles.stepContainer}>
          <Text style={learningStyles.stepTitle}>{t("prayer_steps")}:</Text>

          <View style={learningStyles.step}>
            <View style={learningStyles.stepContent}>
              <Text style={learningStyles.stepNumber}>1.</Text>
              <View style={learningStyles.stepTextContainer}>
                <Text style={learningStyles.stepText}>
                  {t("prayer_step_1")}
                </Text>
                <Text style={learningStyles.stepDetailText}>
                  {t("prayer_step_1_detail")}
                </Text>
              </View>
            </View>
            <Image
              source={require("../assets/images/quyiam2.png")}
              style={learningStyles.stepImage}
              resizeMode="contain"
            />
          </View>

          <View style={learningStyles.stepContainer}>
            <View style={learningStyles.stepHeader}>
              <View style={learningStyles.stepContent}>
                <Text style={learningStyles.stepNumber}>2.</Text>
                <View style={learningStyles.stepTextContainer}>
                  <Text style={learningStyles.stepText}>
                    {t("prayer_step_2")}
                  </Text>
                  <Text style={learningStyles.stepDetailText}>
                    {t("prayer_step_2_detail")}
                  </Text>
                </View>
              </View>
              <Image
                source={require("../assets/images/takbeer.png")}
                style={learningStyles.stepImage}
                resizeMode="contain"
              />
            </View>
            <View style={learningStyles.invocationContainerFull}>
              <Text style={learningStyles.invocationArabic}>
                {t("takbir_dua")}
              </Text>
              <Text style={learningStyles.invocationPhonetic}>
                {t("takbir_phonetic")}
              </Text>
              <Text style={learningStyles.invocationTranslation}>
                {t("takbir_translation")}
              </Text>
            </View>
          </View>

          <View style={learningStyles.step}>
            <View style={learningStyles.stepContent}>
              <Text style={learningStyles.stepNumber}>3.</Text>
              <View style={learningStyles.stepTextContainer}>
                <Text style={learningStyles.stepText}>
                  {t("prayer_step_recitation")}
                </Text>
                <Text style={learningStyles.stepDetailText}>
                  Rester debout, mains croisées, réciter Al-Fatiha puis une
                  autre sourate du Coran
                </Text>
              </View>
            </View>
            <Image
              source={require("../assets/images/quiyam.png")}
              style={learningStyles.stepImage}
              resizeMode="contain"
            />
          </View>

          <View style={learningStyles.stepContainer}>
            <View style={learningStyles.stepHeader}>
              <View style={learningStyles.stepContent}>
                <Text style={learningStyles.stepNumber}>4.</Text>
                <View style={learningStyles.stepTextContainer}>
                  <Text style={learningStyles.stepText}>
                    {t("prayer_step_3")}
                  </Text>
                  <Text style={learningStyles.stepDetailText}>
                    Se pencher en avant (Ruku), mains sur les genoux, dire le
                    tasbih du ruku au moins 3 fois
                  </Text>
                </View>
              </View>
              <Image
                source={require("../assets/images/ruku.png")}
                style={learningStyles.stepImage}
                resizeMode="contain"
              />
            </View>
            <View style={learningStyles.invocationContainerFull}>
              <Text style={learningStyles.invocationArabic}>
                سُبْحَانَ رَبِّيَ الْعَظِيمِ
              </Text>
              <Text style={learningStyles.invocationPhonetic}>
                Subhana rabbiya al-azeem
              </Text>
              <Text style={learningStyles.invocationTranslation}>
                {t("ruku_dua_translation")}
              </Text>
            </View>
          </View>

          <View style={learningStyles.stepContainer}>
            <View style={learningStyles.stepHeader}>
              <View style={learningStyles.stepContent}>
                <Text style={learningStyles.stepNumber}>5.</Text>
                <View style={learningStyles.stepTextContainer}>
                  <Text style={learningStyles.stepText}>
                    {t("prayer_step_5")}
                  </Text>
                  <Text style={learningStyles.stepDetailText}>
                    {t("prayer_step_5_detail")}
                  </Text>
                </View>
              </View>
              <Image
                source={require("../assets/images/soujoud.png")}
                style={learningStyles.stepImage}
                resizeMode="contain"
              />
            </View>
            <View style={learningStyles.invocationContainerFull}>
              <Text style={learningStyles.invocationArabic}>
                سُبْحَانَ رَبِّيَ الأَعْلَى
              </Text>
              <Text style={learningStyles.invocationPhonetic}>
                Subhana rabbiya al-a&apos;la
              </Text>
              <Text style={learningStyles.invocationTranslation}>
                {t("sujud_dua_translation")}
              </Text>
            </View>
          </View>

          <View style={learningStyles.stepContainer}>
            <View style={learningStyles.stepHeader}>
              <View style={learningStyles.stepContent}>
                <Text style={learningStyles.stepNumber}>6.</Text>
                <View style={learningStyles.stepTextContainer}>
                  <Text style={learningStyles.stepText}>
                    {t("prayer_step_6_detail")}
                  </Text>
                </View>
              </View>
              <Image
                source={require("../assets/images/tashahhud.png")}
                style={learningStyles.stepImage}
                resizeMode="contain"
              />
            </View>
            <View style={learningStyles.invocationContainerFull}>
              <Text style={learningStyles.invocationArabic}>
                {t("tashahhud_dua")}
              </Text>
              <Text style={learningStyles.invocationPhonetic}>
                {t("tashahhud_phonetic")}
              </Text>
              <Text style={learningStyles.invocationTranslation}>
                {t("tashahhud_translation")}
              </Text>
            </View>
          </View>

          <View style={learningStyles.stepContainer}>
            <View style={learningStyles.stepHeader}>
              <View style={learningStyles.stepContent}>
                <Text style={learningStyles.stepNumber}>7.</Text>
                <View style={learningStyles.stepTextContainer}>
                  <Text style={learningStyles.stepText}>
                    {t("prayer_step_8")}
                  </Text>
                  <Text style={learningStyles.stepDetailText}>
                    {t("prayer_step_8_detail")}
                  </Text>
                </View>
              </View>
              <Image
                source={require("../assets/images/tashahhud.png")}
                style={learningStyles.stepImage}
                resizeMode="contain"
              />
            </View>
            <View style={learningStyles.invocationContainerFull}>
              <Text style={learningStyles.invocationArabic}>
                {t("full_tashahhud_dua")}
              </Text>
              <Text style={learningStyles.invocationPhonetic}>
                {t("full_tashahhud_phonetic")}
              </Text>
              <Text style={learningStyles.invocationTranslation}>
                {t("full_tashahhud_translation")}
              </Text>
            </View>
          </View>

          <View style={learningStyles.stepContainer}>
            <View style={learningStyles.stepHeader}>
              <View style={learningStyles.stepContent}>
                <Text style={learningStyles.stepNumber}>8.</Text>
                <View style={learningStyles.stepTextContainer}>
                  <Text style={learningStyles.stepText}>
                    {t("prayer_step_7_detail")}
                  </Text>
                </View>
              </View>
              <Image
                source={require("../assets/images/salam.png")}
                style={learningStyles.stepImage}
                resizeMode="contain"
              />
            </View>
            <View style={learningStyles.invocationContainerFull}>
              <Text style={learningStyles.invocationArabic}>
                {t("salam_dua")}
              </Text>
              <Text style={learningStyles.invocationPhonetic}>
                {t("salam_phonetic")}
              </Text>
              <Text style={learningStyles.invocationTranslation}>
                {t("salam_translation")}
              </Text>
            </View>
          </View>
        </View>
      </CollapsibleCard>

      <View style={learningStyles.footer}>
        <Text style={learningStyles.footerText}>{t("learning_footer")}</Text>
      </View>
    </View>
  );
};

export default function PrayerScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [today, setToday] = useState(new Date());
  const [city, setCity] = useState<string | null>(null);

  // État pour gérer les prières muettes/non-muettes
  const [mutedPrayers, setMutedPrayers] = useState<Set<string>>(new Set());

  // Animations
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const [pulseAnim] = useState(new Animated.Value(1));

  const settings = useContext(SettingsContext);
  const { location } = useLocation();

  // Fonction pour charger les préférences de son
  const loadMutedPrayers = useCallback(async () => {
    try {
      const mutedPrayersJson = await AsyncStorage.getItem("muted_prayers");
      if (mutedPrayersJson) {
        const mutedArray = JSON.parse(mutedPrayersJson);
        setMutedPrayers(new Set(mutedArray));
      }
    } catch (error) {
      console.error("Erreur lors du chargement des prières muettes:", error);
    }
  }, []);

  // Fonction pour sauvegarder les préférences de son
  const saveMutedPrayers = useCallback(async (mutedSet: Set<string>) => {
    try {
      const mutedArray = Array.from(mutedSet);
      await AsyncStorage.setItem("muted_prayers", JSON.stringify(mutedArray));
      // Notifier le module natif du changement
      if (AdhanModule && AdhanModule.updateMutedPrayers) {
        AdhanModule.updateMutedPrayers(mutedArray);
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des prières muettes:", error);
    }
  }, []);

  // Fonction pour basculer le statut muet d'une prière
  const togglePrayerMute = useCallback(
    (prayer: string) => {
      setMutedPrayers((prevMuted) => {
        const newMuted = new Set(prevMuted);
        if (newMuted.has(prayer)) {
          newMuted.delete(prayer);
        } else {
          newMuted.add(prayer);
        }
        saveMutedPrayers(newMuted);
        return newMuted;
      });
    },
    [saveMutedPrayers]
  );

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

  // Charger les préférences de son au démarrage
  useEffect(() => {
    loadMutedPrayers();
  }, [loadMutedPrayers]);

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
        contentContainerStyle={[styles.container, { paddingBottom: 180 }]}
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

                  // Exclure "sunrise" car ce n'est pas une prière avec adhan
                  const hasAdhan = prayer !== "sunrise";
                  const prayerKey =
                    prayer.charAt(0).toUpperCase() + prayer.slice(1);
                  const isMuted = mutedPrayers.has(prayerKey);

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

                      <View style={styles.prayerItemActions}>
                        {hasAdhan && (
                          <TouchableOpacity
                            onPress={() => togglePrayerMute(prayerKey)}
                            style={styles.soundToggle}
                          >
                            <MaterialCommunityIcons
                              name={isMuted ? "volume-off" : "volume-high"}
                              size={20}
                              color={isMuted ? "#ff6b6b" : "#4ECDC4"}
                            />
                          </TouchableOpacity>
                        )}

                        {isPassed && !isNext && (
                          <MaterialCommunityIcons
                            name="check-circle"
                            size={16}
                            color="#4ECDC4"
                            style={styles.prayerItemCheck}
                          />
                        )}
                      </View>
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

        {/* Section Apprentissage */}
        <LearningSection />
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
    marginTop: 40,
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
  prayerItemActions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  soundToggle: {
    padding: 8,
    borderRadius: 6,
    marginRight: 4,
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

// Styles pour la section d'apprentissage
const learningStyles = StyleSheet.create({
  container: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFD700",
    marginLeft: 12,
    textAlign: "center",
  },
  card: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(78, 205, 196, 0.3)",
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fffbe8",
    flex: 1,
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  stepContainer: {
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(78, 205, 196, 0.2)",
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4ECDC4",
    marginBottom: 12,
  },
  step: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-start",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(78, 205, 196, 0.2)",
  },
  stepContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFD700",
    marginRight: 8,
    minWidth: 20,
  },
  stepText: {
    fontSize: 14,
    color: "#fffbe8",
    lineHeight: 20,
    flex: 1,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(78, 205, 196, 0.4)",
  },
  imagePlaceholder: {
    backgroundColor: "rgba(78, 205, 196, 0.1)",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(78, 205, 196, 0.3)",
    borderStyle: "dashed",
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: "#4ECDC4",
    marginTop: 8,
    fontStyle: "italic",
  },

  footer: {
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  footerText: {
    fontSize: 14,
    color: "#FFD700",
    textAlign: "center",
    fontStyle: "italic",
  },
  invocationContainer: {
    marginTop: 8,
    backgroundColor: "rgba(76, 99, 210, 0.1)",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(76, 99, 210, 0.3)",
  },
  invocationArabic: {
    fontSize: 20,
    color: "#fffbe8",
    textAlign: "center",
    marginBottom: 4,
    fontFamily: "ScheherazadeNew",
    lineHeight: 28,
  },
  invocationPhonetic: {
    fontSize: 16,
    color: "#4ECDC4",
    textAlign: "center",
    marginBottom: 4,
    fontStyle: "italic",
    fontWeight: "600",
  },
  invocationTranslation: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    fontStyle: "italic",
  },
  stepDetailText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: 18,
    marginTop: 4,
    fontStyle: "italic",
  },
  invocationContainerFull: {
    backgroundColor: "rgba(76, 99, 210, 0.1)",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(76, 99, 210, 0.3)",
    width: "100%",
  },
});
