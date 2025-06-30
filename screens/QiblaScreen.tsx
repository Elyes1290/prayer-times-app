import * as Location from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  AppState,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import compassImg from "../assets/images/compass.png";
import kaabaImg from "../assets/images/kaaba.png";
import ThemedImageBackground from "../components/ThemedImageBackground";
import { errorLog } from "../utils/logger";
import {
  useThemeColors,
  useOverlayTextColor,
  useCurrentTheme,
} from "../hooks/useThemeColor";

const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

const { width, height } = Dimensions.get("window");
// Ajustement responsif selon la taille d'écran
const COMPASS_SIZE = Math.min(width * 0.75, height * 0.35, 300);
const NEEDLE_HEIGHT = COMPASS_SIZE * 0.33;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
function calculateQiblaDirection(lat: number, lng: number): number {
  const userLat = toRadians(lat);
  const userLng = toRadians(lng);
  const kaabaLat = toRadians(KAABA_LAT);
  const kaabaLng = toRadians(KAABA_LNG);
  const deltaLng = kaabaLng - userLng;
  const x = Math.sin(deltaLng);
  const y =
    Math.cos(userLat) * Math.tan(kaabaLat) -
    Math.sin(userLat) * Math.cos(deltaLng);

  let angle = Math.atan2(x, y);
  angle = (angle * 180) / Math.PI;
  return (angle + 360) % 360;
}

function getPointOnCircle(
  centerX: number,
  centerY: number,
  radius: number,
  angleDeg: number
): { x: number; y: number } {
  const angleRad = (angleDeg - 90) * (Math.PI / 180); // 0° = haut
  return {
    x: centerX + radius * Math.cos(angleRad),
    y: centerY + radius * Math.sin(angleRad),
  };
}

const getStyles = (
  colors: any,
  overlayTextColor: string,
  currentTheme: "light" | "dark"
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      marginTop: 20,
      marginBottom: 20,
      color: overlayTextColor,
      textShadowColor:
        currentTheme === "light" ? colors.textShadow : "rgba(0,0,0,0.25)",
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
      textAlign: "center",
    },
    compassWrap: {
      width: COMPASS_SIZE,
      height: COMPASS_SIZE,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      backgroundColor: "rgba(34,40,58,0.30)", // Toujours sombre pour la boussole blanche
      borderRadius: COMPASS_SIZE / 2,
      borderWidth: 2,
      borderColor: currentTheme === "light" ? colors.primary : "#e7c86a",
      overflow: "hidden",
      shadowColor: currentTheme === "light" ? colors.shadow : "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 8,
    },
    compassContainer: {
      position: "absolute",
      left: 0,
      top: 0,
      width: COMPASS_SIZE,
      height: COMPASS_SIZE,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1,
    },
    compass: {
      width: COMPASS_SIZE,
      height: COMPASS_SIZE,
      borderRadius: COMPASS_SIZE / 2,
      opacity: currentTheme === "light" ? 0.9 : 1,
    },
    needle: {
      position: "absolute",
      width: 4,
      height: NEEDLE_HEIGHT,
      borderRadius: 2,
    },
    qiblaNeedle: {
      backgroundColor: currentTheme === "light" ? colors.primary : "#204296",
      zIndex: 2,
    },
    background: { flex: 1, resizeMode: "cover" },
    kaabaIcon: {
      width: 24,
      height: 24,
      position: "absolute",
      top: -12,
      left: -10,
    },
    instructionsContainer: {
      alignItems: "center",
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    instructions: {
      color: currentTheme === "light" ? colors.primary : "#FFD700",
      fontSize: 15,
      fontWeight: "600",
      textAlign: "center",
      paddingHorizontal: 18,
      paddingVertical: 14,
      lineHeight: 22,
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(34,40,58,0.85)",
      borderRadius: 16,
      elevation: 3,
      textShadowColor:
        currentTheme === "light" ? colors.textShadow : "rgba(0,0,0,0.28)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
      overflow: "hidden",
      borderWidth: 1.5,
      borderColor: currentTheme === "light" ? colors.border : "#e7c86a",
    },
    statusContainer: {
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(34,40,58,0.9)",
      borderRadius: 12,
      padding: 16,
      marginHorizontal: 20,
      marginBottom: 20,
      alignItems: "center",
      borderWidth: 1,
      borderColor: currentTheme === "light" ? colors.border : "#e7c86a",
    },
    statusText: {
      color: currentTheme === "light" ? colors.primary : "#FFD700",
      fontSize: 16,
      fontWeight: "600",
      textAlign: "center",
    },
    statusTextError: {
      color: currentTheme === "light" ? colors.accent : "#FF6B6B",
      fontSize: 16,
      fontWeight: "600",
      textAlign: "center",
      marginBottom: 8,
    },
    statusSubText: {
      color: overlayTextColor,
      fontSize: 14,
      textAlign: "center",
      opacity: 0.8,
    },
  });

export default function QiblaScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Utiliser les couleurs thématiques
  const colors = useThemeColors();
  const overlayTextColor = useOverlayTextColor();
  const currentTheme = useCurrentTheme();

  const styles = getStyles(colors, overlayTextColor, currentTheme);

  const [direction, setDirection] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [isPointingToQibla, setIsPointingToQibla] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState<
    boolean | null
  >(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Animation: valeur de rotation de la boussole
  const animatedHeading = useRef(new Animated.Value(0)).current;
  const lastHeading = useRef(0);

  // Animation pour la couleur de l'aiguille
  const needleColorAnimation = useRef(new Animated.Value(0)).current;

  // Référence pour le subscription du heading
  const headingSubscription = useRef<Location.LocationSubscription | null>(
    null
  );

  // Pour l'icône Kaaba
  const KAABA_RADIUS = COMPASS_SIZE / 2 - 30;
  let kaabaPos = { x: COMPASS_SIZE / 2, y: 30 };
  if (direction !== null) {
    const angleQibla = direction;
    kaabaPos = getPointOnCircle(
      COMPASS_SIZE / 2,
      COMPASS_SIZE / 2,
      KAABA_RADIUS,
      angleQibla
    );
  }

  // Fonction pour calculer si l'utilisateur pointe vers la Qibla
  const calculateQiblaAlignment = (
    userHeading: number,
    qiblaDirection: number
  ) => {
    // Calculer la différence angulaire
    let diff = Math.abs(userHeading - qiblaDirection);
    if (diff > 180) {
      diff = 360 - diff;
    }

    // Tolérance de ±15 degrés
    return diff <= 15;
  };

  // Fonction pour initialiser la localisation et la boussole
  const initializeQibla = useCallback(async () => {
    try {
      setIsInitializing(true);

      // Vérifier les permissions
      let { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setLocationPermissionGranted(false);
        setIsInitializing(false);
        return;
      }

      setLocationPermissionGranted(true);

      // Récupérer la position actuelle
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Calculer la direction de la Qibla
      const angle = calculateQiblaDirection(
        loc.coords.latitude,
        loc.coords.longitude
      );
      setDirection(angle);

      // Nettoyer l'ancien subscription s'il existe
      if (headingSubscription.current) {
        headingSubscription.current.remove();
      }

      // Démarrer l'écoute du heading
      headingSubscription.current = await Location.watchHeadingAsync((data) => {
        setHeading(data.trueHeading);
      });

      setIsInitializing(false);
    } catch (error) {
      errorLog("Erreur lors de l'initialisation de la Qibla:", error);
      setLocationPermissionGranted(false);
      setIsInitializing(false);
    }
  }, []);

  // useEffect pour l'initialisation au montage
  useEffect(() => {
    initializeQibla();

    // Cleanup au démontage
    return () => {
      if (headingSubscription.current) {
        headingSubscription.current.remove();
      }
    };
  }, [initializeQibla]);

  // useFocusEffect pour réessayer quand l'écran devient actif
  useFocusEffect(
    useCallback(() => {
      // Si on n'a pas les permissions ou qu'on initialise encore, réessayer
      if (locationPermissionGranted === false || isInitializing) {
        initializeQibla();
      }
    }, [locationPermissionGranted, isInitializing, initializeQibla])
  );

  // Écouter les changements d'état de l'app (retour depuis les paramètres)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === "active" && locationPermissionGranted === false) {
        // L'app devient active et on n'avait pas les permissions avant
        // Réessayer d'initialiser la Qibla
        initializeQibla();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      subscription?.remove();
    };
  }, [locationPermissionGranted, initializeQibla]);

  useEffect(() => {
    if (heading !== null) {
      let from = lastHeading.current % 360;
      let to = heading % 360;

      // Delta dans [-180, +180]
      let delta = ((to - from + 540) % 360) - 180;
      let target = from + delta; // la vraie cible pour éviter le tour

      // Si saut > 90° (rotation rapide), MAJ immédiate (optionnel)
      if (Math.abs(delta) > 90) {
        animatedHeading.setValue(-target);
      } else {
        Animated.timing(animatedHeading, {
          toValue: -target,
          duration: 150,
          useNativeDriver: true,
        }).start();
      }
      lastHeading.current = target; // 👈 important ! On mémorise la vraie position
    }
  }, [heading]);

  // Nouveau useEffect pour vérifier l'alignement avec la Qibla
  useEffect(() => {
    if (heading !== null && direction !== null) {
      const pointingToQibla = calculateQiblaAlignment(heading, direction);

      if (pointingToQibla !== isPointingToQibla) {
        setIsPointingToQibla(pointingToQibla);

        // Animation de couleur
        Animated.timing(needleColorAnimation, {
          toValue: pointingToQibla ? 1 : 0,
          duration: 300,
          useNativeDriver: false,
        }).start();
      }
    }
  }, [heading, direction, isPointingToQibla]);

  const compassRotation = animatedHeading.interpolate({
    inputRange: [-360, 0],
    outputRange: ["-360deg", "0deg"],
  });

  // Interpolation de couleur pour l'aiguille
  const needleColor = needleColorAnimation.interpolate({
    inputRange: [0, 1],
    outputRange:
      currentTheme === "light"
        ? [colors.primary, "#22C55E"]
        : ["#204296", "#22C55E"],
  });

  return (
    <ThemedImageBackground style={styles.background}>
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100 },
        ]}
      >
        <Text style={[styles.title, { fontSize: Math.min(width * 0.07, 28) }]}>
          {t("qibla_direction")}
        </Text>

        {/* Indicateur d'état */}
        {isInitializing && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              Initialisation de la boussole...
            </Text>
          </View>
        )}

        {locationPermissionGranted === false && !isInitializing && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusTextError}>
              Permission de localisation requise
            </Text>
            <Text style={styles.statusSubText}>
              Appuyez sur &quot;Autoriser&quot; et revenez à l&apos;application
            </Text>
          </View>
        )}

        <View style={styles.compassWrap}>
          {/* Boussole qui tourne */}
          <Animated.View
            style={[
              styles.compassContainer,
              { transform: [{ rotate: compassRotation }] },
            ]}
          >
            <Image source={compassImg} style={styles.compass} />
            {/* Kaaba sur le pourtour du cercle */}
            <Image
              source={kaabaImg}
              style={[
                styles.kaabaIcon,
                {
                  position: "absolute",
                  width: COMPASS_SIZE / 8,
                  height: COMPASS_SIZE / 8,
                  left: kaabaPos.x - COMPASS_SIZE / 16,
                  top: kaabaPos.y - COMPASS_SIZE / 16,
                  zIndex: 5,
                },
              ]}
            />
          </Animated.View>
          {/* Aiguille bleue (toujours verticale) */}
          <Animated.View
            style={[
              styles.needle,
              styles.qiblaNeedle,
              {
                left: COMPASS_SIZE / 2 - 2,
                top: COMPASS_SIZE / 2 - NEEDLE_HEIGHT,
                alignItems: "center",
                justifyContent: "flex-start",
              },
            ]}
          >
            <Animated.View
              style={{
                width: 4,
                height: NEEDLE_HEIGHT,
                backgroundColor: needleColor,
                borderRadius: 2,
              }}
            />
          </Animated.View>
        </View>

        <View style={styles.instructionsContainer}>
          <Text
            style={[
              styles.instructions,
              { fontSize: Math.min(width * 0.035, 15) },
            ]}
          >
            {t("qibla_instructions")}
          </Text>
        </View>
      </View>
    </ThemedImageBackground>
  );
}
