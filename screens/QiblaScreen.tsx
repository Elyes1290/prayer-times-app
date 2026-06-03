import * as Location from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Animated,
  AppState,
  Image,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  Modal,
  Pressable,
  ScrollView,
  FlatList,
  StatusBar,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import { IonIcon } from "@/components/icons/AppVectorIcons";
import compassImg from "../assets/images/compass.png";
import kaabaImg from "../assets/images/kaaba.png";
import ThemedImageBackground from "../components/ThemedImageBackground";
import { errorLog } from "../utils/logger";
import {
  useThemeColors,
  useOverlayTextColor,
  useCurrentTheme,
} from "../hooks/useThemeColor";
import { makeBoxShadow } from "../utils/shadowUtils";
import { usePremium } from "../contexts/PremiumContext";

// 🧭 Import des boussoles disponibles
import compass1 from "../assets/boussole/compass1.png";
import compass2 from "../assets/boussole/compass2.png";
import compass3 from "../assets/boussole/compass3.png";
import compass4 from "../assets/boussole/compass4.jpg";
import compass5 from "../assets/boussole/compass5.png";
import compass6 from "../assets/boussole/compass6.png";
import compass7 from "../assets/boussole/compass7.png";
import compass8 from "../assets/boussole/compass8.png";

// 🧭 Types et configuration des boussoles
type CompassType =
  | "compass1"
  | "compass2"
  | "compass3"
  | "compass4"
  | "compass5"
  | "compass6"
  | "compass7"
  | "compass8";

const AVAILABLE_COMPASSES = {
  compass1: {
    id: "compass1" as CompassType,
    name: "Classique",
    image: compass1,
    premium: false,
  },
  compass2: {
    id: "compass2" as CompassType,
    name: "Boussole 2",
    image: compass2,
    premium: true,
  },
  compass3: {
    id: "compass3" as CompassType,
    name: "Boussole 3",
    image: compass3,
    premium: true,
  },
  compass4: {
    id: "compass4" as CompassType,
    name: "Boussole 4",
    image: compass4,
    premium: true,
  },
  compass5: {
    id: "compass5" as CompassType,
    name: "Boussole 5",
    image: compass5,
    premium: true,
  },
  compass6: {
    id: "compass6" as CompassType,
    name: "Boussole 6",
    image: compass6,
    premium: true,
  },
  compass7: {
    id: "compass7" as CompassType,
    name: "Boussole 7",
    image: compass7,
    premium: true,
  },
  compass8: {
    id: "compass8" as CompassType,
    name: "Boussole 8",
    image: compass8,
    premium: true,
  },
};

const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;


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
  currentTheme: "light" | "dark" | "morning" | "sunset",
  compassSize: number,
  needleHeight: number
) => {
  // 🆕 Les couleurs sont maintenant gérées directement via colors du thème actif
  return StyleSheet.create({
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
      textShadowColor: colors.shadow, // 🌅 Utilise la couleur du thème actif
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
      textAlign: "center",
    },
    compassWrap: {
      width: compassSize,
      height: compassSize,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      backgroundColor: "rgba(34,40,58,0.30)", // Toujours sombre pour la boussole blanche
      borderRadius: compassSize / 2,
      borderWidth: 2,
      borderColor: colors.primary, // 🌅 Utilise la couleur du thème actif
      overflow: "hidden",
      boxShadow: makeBoxShadow(colors.shadow, 0, 4, 10, 0.3),
    },
    compassContainer: {
      position: "absolute",
      left: 0,
      top: 0,
      width: compassSize,
      height: compassSize,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1,
    },
    compass: {
      width: compassSize,
      height: compassSize,
      borderRadius: compassSize / 2,
      opacity: 1,
    },
    needle: {
      position: "absolute",
      width: 4,
      height: needleHeight,
      borderRadius: 2,
    },
    qiblaNeedle: {
      backgroundColor: colors.primary, // 🌅 Utilise la couleur du thème actif
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
    instructionsWrapper: {
      width: "100%",
      paddingHorizontal: 20,
      paddingVertical: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    instructionsBox: {
      backgroundColor: colors.surface, // 🌅 Utilise la couleur du thème actif
      borderRadius: 16,
      paddingHorizontal: 20,
      paddingVertical: 14,
      boxShadow: makeBoxShadow(colors.shadow, 0, 4, 8, 0.3),
      borderWidth: 1.5,
      borderColor: colors.border, // 🌅 Utilise la couleur du thème actif
      width: "100%",
    },
    instructions: {
      color: colors.primary, // 🌅 Utilise la couleur du thème actif
      fontSize: 15,
      fontWeight: "600",
      textAlign: "justify",
      lineHeight: 22,
      textShadowColor: colors.shadow, // 🌅 Utilise la couleur du thème actif
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    statusContainer: {
      backgroundColor: colors.surface, // 🌅 Utilise la couleur du thème actif
      borderRadius: 12,
      padding: 16,
      marginHorizontal: 20,
      marginBottom: 20,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border, // 🌅 Utilise la couleur du thème actif
    },
    statusText: {
      color: colors.primary, // 🌅 Utilise la couleur du thème actif
      fontSize: 16,
      fontWeight: "600",
      textAlign: "center",
    },
    statusTextError: {
      color: colors.error, // 🌅 Utilise la couleur du thème actif
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
    // 🧭 Styles pour la sélection de boussole
    compassSelectorButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface, // 🌅 Utilise la couleur du thème actif
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 20,
      marginBottom: 15,
      borderWidth: 1.5,
      borderColor: colors.primary, // 🌅 Utilise la couleur du thème actif
      boxShadow: "0px 2px 4px rgba(0,0,0,0.1)",
    },
    compassSelectorText: {
      fontSize: 14,
      fontWeight: "600",
      marginLeft: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: "#fffbe6",
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 40,
      maxHeight: "70%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: "#e7c86a",
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#242428",
      flex: 1,
    },
    closeButton: {
      padding: 5,
    },
    closeButtonText: {
      fontSize: 24,
      color: "#242428",
      fontWeight: "bold",
    },
    compassList: {
      paddingHorizontal: 15,
      paddingTop: 10,
    },
    compassOption: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#fff",
      borderRadius: 12,
      padding: 15,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: "transparent",
      boxShadow: "0px 1px 2px rgba(0,0,0,0.1)",
    },
    selectedCompassOption: {
      borderColor: colors.primary, // 🌅 Utilise la couleur du thème actif
      backgroundColor: colors.surface, // 🌅 Utilise la couleur du thème actif
    },
    lockedCompassOption: {
      opacity: 0.6,
    },
    compassPreview: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: "#f0f0f0",
      overflow: "hidden",
      marginRight: 15,
      position: "relative",
    },
    compassThumbnail: {
      width: "100%",
      height: "100%",
    },
    lockOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    compassInfo: {
      flex: 1,
    },
    compassName: {
      fontSize: 16,
      fontWeight: "600",
      color: "#242428",
      marginBottom: 4,
    },
    selectedCompassName: {
      color: colors.primary, // 🌅 Utilise la couleur du thème actif
    },
    premiumBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255, 215, 0, 0.2)",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      alignSelf: "flex-start",
    },
    premiumText: {
      fontSize: 11,
      fontWeight: "600",
      color: "#DAA520",
      marginLeft: 4,
    },
  });
};

export default function QiblaScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user } = usePremium();

  // Utiliser les couleurs thématiques
  const colors = useThemeColors();
  const overlayTextColor = useOverlayTextColor();
  const currentTheme = useCurrentTheme();
  const { width, height } = useWindowDimensions();
  const compassSize = Math.min(width * 0.75, height * 0.35, 300);
  const needleHeight = compassSize * 0.33;

  const styles = getStyles(colors, overlayTextColor, currentTheme, compassSize, needleHeight);

  const [direction, setDirection] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);

  // 🧭 États pour la sélection de boussole (premium)
  const [selectedCompass, setSelectedCompass] =
    useState<CompassType>("compass1");
  const [compassModalVisible, setCompassModalVisible] = useState(false);
  const [isPointingToQibla, setIsPointingToQibla] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState<
    boolean | null
  >(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [userDeniedPermission, setUserDeniedPermission] = useState(false); // 🚀 NOUVEAU : Mémoriser le refus

  // 🚀 NOUVEAU : Charger le statut de refus au démarrage
  useEffect(() => {
    const loadDeniedStatus = async () => {
      try {
        const denied = await AsyncStorage.getItem("@qibla_permission_denied");
        console.log("🚧 [QIBLA DEBUG] Permission refusée sauvée:", denied);
        if (denied === "true") {
          console.log(
            "🚧 [QIBLA DEBUG] Utilisateur a déjà refusé - arrêt total"
          );
          setUserDeniedPermission(true);
          setLocationPermissionGranted(false);
          setIsInitializing(false); // 🚀 Arrêter l'initialisation immédiatement
        } else {
          console.log(
            "🚧 [QIBLA DEBUG] Pas de refus sauvé - initialisation possible"
          );
        }
      } catch (error) {
        console.error("Erreur chargement statut permission:", error);
      }
    };
    loadDeniedStatus();
  }, []);

  // 🧭 Charger le choix de boussole sauvegardé
  useEffect(() => {
    const loadCompassChoice = async () => {
      try {
        const saved = await AsyncStorage.getItem("@selected_compass");
        const validCompasses = [
          "compass1",
          "compass2",
          "compass3",
          "compass4",
          "compass5",
          "compass6",
          "compass7",
          "compass8",
        ];
        if (saved && validCompasses.includes(saved)) {
          setSelectedCompass(saved as CompassType);
        }
      } catch (err) {
        console.error("Erreur chargement boussole:", err);
      }
    };
    loadCompassChoice();
  }, []);

  // 🧭 Sauvegarder le choix de boussole
  const selectCompass = async (compassId: CompassType) => {
    try {
      setSelectedCompass(compassId);
      await AsyncStorage.setItem("@selected_compass", compassId);
      setCompassModalVisible(false);
    } catch (err) {
      console.error("Erreur sauvegarde boussole:", err);
    }
  };

  // Animation: valeur de rotation de la boussole
  const animatedHeading = useRef(new Animated.Value(0)).current;
  const lastHeading = useRef(0);
  
  // 🎯 Filtrage pour fluidité (low-pass filter)
  const smoothedHeading = useRef(0);
  const SMOOTHING_FACTOR = 0.15; // Plus c'est petit, plus c'est lisse (0.1-0.3)
  const MIN_MOVEMENT_THRESHOLD = 0.5; // Seuil minimum de mouvement en degrés

  // Animation pour la couleur de l'aiguille
  const needleColorAnimation = useRef(new Animated.Value(0)).current;

  // Référence pour le subscription du heading
  const headingSubscription = useRef<Location.LocationSubscription | null>(
    null
  );

  // Pour l'icône Kaaba
  const KAABA_RADIUS = compassSize / 2 - 30;
  let kaabaPos = { x: compassSize / 2, y: 30 };
  if (direction !== null) {
    const angleQibla = direction;
    kaabaPos = getPointOnCircle(
      compassSize / 2,
      compassSize / 2,
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
      console.log(
        "🚧 [QIBLA DEBUG] DÉBUT initializeQibla() - userDeniedPermission:",
        userDeniedPermission
      );

      // 🚀 NOUVELLE SÉCURITÉ : Double vérification avant tout
      if (userDeniedPermission) {
        console.log("🚧 [QIBLA DEBUG] ARRÊT - utilisateur a refusé");
        return;
      }

      setIsInitializing(true);

      // 🚀 NOUVEAU : Vérifier AVANT si la localisation est disponible au niveau système
      const isLocationEnabled = await Location.hasServicesEnabledAsync();
      console.log(
        "🚧 [QIBLA DEBUG] Localisation système activée:",
        isLocationEnabled
      );

      if (!isLocationEnabled) {
        console.log("🚧 [QIBLA DEBUG] Localisation système DÉSACTIVÉE - arrêt");
        setLocationPermissionGranted(false);
        setUserDeniedPermission(true);
        AsyncStorage.setItem("@qibla_permission_denied", "true").catch(
          console.error
        );
        setIsInitializing(false);
        return;
      }

      // Vérifier les permissions seulement si localisation système OK
      let { status } = await Location.requestForegroundPermissionsAsync();
      console.log("🚧 [QIBLA DEBUG] Status permission:", status);

      if (status !== "granted") {
        console.log(
          "🚧 [QIBLA DEBUG] Permission REFUSÉE - sauvegarde du choix"
        );
        setLocationPermissionGranted(false);
        setUserDeniedPermission(true); // 🚀 NOUVEAU : Marquer que l'utilisateur a refusé
        // 🚀 NOUVEAU : Persister le refus
        AsyncStorage.setItem("@qibla_permission_denied", "true").catch(
          console.error
        );
        setIsInitializing(false);
        return;
      }

      setLocationPermissionGranted(true);
      setUserDeniedPermission(false); // 🚀 NOUVEAU : Réinitialiser le refus si permission accordée
      // 🚀 NOUVEAU : Supprimer le refus persisté
      AsyncStorage.removeItem("@qibla_permission_denied").catch(console.error);

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

      // Démarrer l'écoute du heading avec filtrage
      headingSubscription.current = await Location.watchHeadingAsync((data) => {
        // 🎯 Filtre passe-bas (low-pass filter) pour lisser les valeurs
        const rawHeading = data.trueHeading;
        
        // Initialisation du filtre
        if (smoothedHeading.current === 0) {
          smoothedHeading.current = rawHeading;
        }
        
        // Gérer le passage 0-360 degrés correctement
        let delta = rawHeading - smoothedHeading.current;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        
        // Appliquer le lissage (low-pass filter)
        smoothedHeading.current += delta * SMOOTHING_FACTOR;
        
        // Normaliser à 0-360
        if (smoothedHeading.current < 0) smoothedHeading.current += 360;
        if (smoothedHeading.current >= 360) smoothedHeading.current -= 360;
        
        setHeading(smoothedHeading.current);
      });

      setIsInitializing(false);
    } catch (error: any) {
      console.log("🚧 [QIBLA DEBUG] ERREUR CATCHÉE:", error?.message);

      // 🚀 NOUVEAU : Si erreur = localisation désactivée système, traiter comme un refus permanent
      if (
        error?.message &&
        error.message.includes("unsatisfied device settings")
      ) {
        console.log(
          "🚧 [QIBLA DEBUG] Localisation système désactivée - traitement comme refus"
        );
        setUserDeniedPermission(true);
        AsyncStorage.setItem("@qibla_permission_denied", "true").catch(
          console.error
        );
      }

      errorLog("Erreur lors de l'initialisation de la Qibla:", error);
      setLocationPermissionGranted(false);
      setIsInitializing(false);
    }
  }, [userDeniedPermission]);

  // useEffect pour l'initialisation au montage
  useEffect(() => {
    // 🚀 CORRECTION : Ne pas essayer si l'utilisateur a déjà refusé
    console.log(
      "🚧 [QIBLA DEBUG] useEffect principal - userDeniedPermission:",
      userDeniedPermission
    );
    if (!userDeniedPermission) {
      console.log("🚧 [QIBLA DEBUG] Démarrage initializeQibla()");
      initializeQibla();
    } else {
      console.log(
        "🚧 [QIBLA DEBUG] Utilisateur a refusé - PAS d'initialisation"
      );
    }

    // Cleanup au démontage
    return () => {
      const subscription = headingSubscription.current;
      if (subscription) {
        subscription.remove();
      }
    };
  }, [initializeQibla, userDeniedPermission]);

  // useFocusEffect pour réessayer quand l'écran devient actif
  useFocusEffect(
    useCallback(() => {
      // 🚀 CORRECTION : Ne pas redemander si l'utilisateur a déjà refusé
      if (userDeniedPermission) {
        return; // Respecter le choix de l'utilisateur
      }

      // Si on n'a pas les permissions ou qu'on initialise encore, réessayer
      if (locationPermissionGranted === false || isInitializing) {
        initializeQibla();
      }
    }, [
      locationPermissionGranted,
      isInitializing,
      initializeQibla,
      userDeniedPermission,
    ])
  );

  // Écouter les changements d'état de l'app (retour depuis les paramètres)
  // react-doctor-disable-next-line react-doctor/effect-needs-cleanup
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        nextAppState === "active" &&
        locationPermissionGranted === false &&
        !userDeniedPermission
      ) {
        initializeQibla();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [locationPermissionGranted, initializeQibla, userDeniedPermission]);

  useEffect(() => {
    if (heading !== null) {
      let from = lastHeading.current % 360;
      let to = heading % 360;

      // Delta dans [-180, +180]
      let delta = ((to - from + 540) % 360) - 180;
      
      // 🎯 Seuil minimum : ignorer les micro-mouvements
      if (Math.abs(delta) < MIN_MOVEMENT_THRESHOLD) {
        return;
      }
      
      let target = from + delta; // la vraie cible pour éviter le tour

      // Si saut > 90° (rotation rapide du téléphone), MAJ immédiate
      if (Math.abs(delta) > 90) {
        animatedHeading.setValue(-target);
        lastHeading.current = target;
      } else {
        // 🎯 Animation fluide avec spring pour un mouvement naturel
        Animated.spring(animatedHeading, {
          toValue: -target,
          friction: 8, // Plus c'est élevé, plus c'est amorti (5-10)
          tension: 20, // Plus c'est élevé, plus c'est rapide (10-40)
          useNativeDriver: true,
        }).start();
        lastHeading.current = target;
      }
    }
  }, [heading, animatedHeading]);

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
  }, [heading, direction, isPointingToQibla, needleColorAnimation]);

  const compassRotation = animatedHeading.interpolate({
    inputRange: [-360, 0],
    outputRange: ["-360deg", "0deg"],
  });

  // Interpolation de couleur pour l'aiguille
  const needleColor = needleColorAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.primary, colors.success], // 🌅 Utilise les couleurs du thème actif
  });

  return (
    <ThemedImageBackground style={styles.background}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />
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
              Initialisation de la boussole…
            </Text>
          </View>
        )}

        {locationPermissionGranted === false && !isInitializing && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusTextError}>
              {userDeniedPermission
                ? "Localisation désactivée"
                : "Permission de localisation requise"}
            </Text>
            <Text style={styles.statusSubText}>
              {userDeniedPermission
                ? "Pour utiliser la boussole Qibla, activez la localisation dans les paramètres de votre téléphone."
                : 'Appuyez sur "Autoriser" et revenez à l\'application'}
            </Text>
          </View>
        )}

        {/* 🧭 Bouton de sélection de boussole (premium only) */}
        {user?.isPremium && !userDeniedPermission && (
          <Pressable
            style={styles.compassSelectorButton}
            onPress={() => setCompassModalVisible(true)}
          >
            <IonIcon
              name="color-palette-outline"
              size={20}
              color={overlayTextColor}
            />
            <Text
              style={[styles.compassSelectorText, { color: overlayTextColor }]}
            >
              {t("change_compass") || "Changer de boussole"}
            </Text>
          </Pressable>
        )}

        {/* 🚀 NOUVEAU : Masquer la boussole si localisation désactivée */}
        {!userDeniedPermission && (
          <View style={styles.compassWrap}>
            {/* Boussole qui tourne */}
            <Animated.View
              style={[
                styles.compassContainer,
                { transform: [{ rotate: compassRotation }] },
              ]}
            >
              <Image
                source={AVAILABLE_COMPASSES[selectedCompass].image}
                style={styles.compass}
              />
              {/* Kaaba sur le pourtour du cercle */}
              <Image
                source={kaabaImg}
                style={[
                  styles.kaabaIcon,
                  {
                    position: "absolute",
                    width: compassSize / 8,
                    height: compassSize / 8,
                    left: kaabaPos.x - compassSize / 16,
                    top: kaabaPos.y - compassSize / 16,
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
                  left: compassSize / 2 - 2,
                  top: compassSize / 2 - needleHeight,
                  alignItems: "center",
                  justifyContent: "flex-start",
                },
              ]}
            >
              <Animated.View
                style={{
                  width: 4,
                  height: needleHeight,
                  backgroundColor: needleColor,
                  borderRadius: 2,
                }}
              />
            </Animated.View>
          </View>
        )}

        {/* 🚀 NOUVEAU : Masquer les instructions si localisation désactivée */}
        {!userDeniedPermission && (
          <View style={styles.instructionsWrapper}>
            <View style={styles.instructionsBox}>
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
        )}

        {/* 🧭 Modal de sélection de boussole (premium) */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={compassModalVisible}
          onRequestClose={() => setCompassModalVisible(false)}
        >
          <SafeAreaView style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {t("select_compass") || "Sélectionner une boussole"}
                </Text>
                <Pressable
                  style={styles.closeButton}
                  onPress={() => setCompassModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </Pressable>
              </View>

              <FlatList
                style={styles.compassList}
                data={Object.values(AVAILABLE_COMPASSES)}
                keyExtractor={(compass) => compass.id}
                renderItem={({ item: compass }) => {
                  const isLocked = compass.premium && !user?.isPremium;
                  const isSelected = selectedCompass === compass.id;

                  return (
                    <Pressable
                      style={[
                        styles.compassOption,
                        isSelected && styles.selectedCompassOption,
                        isLocked && styles.lockedCompassOption,
                      ]}
                      onPress={() => !isLocked && selectCompass(compass.id)}
                      disabled={isLocked}
                    >
                      <View style={styles.compassPreview}>
                        <Image
                          source={compass.image}
                          style={styles.compassThumbnail}
                        />
                        {isLocked && (
                          <View style={styles.lockOverlay}>
                            <IonIcon
                              name="lock-closed"
                              size={24}
                              color="#FFD700"
                            />
                          </View>
                        )}
                      </View>
                      <View style={styles.compassInfo}>
                        <Text
                          style={[
                            styles.compassName,
                            isSelected && styles.selectedCompassName,
                          ]}
                        >
                          {compass.name}
                        </Text>
                        {compass.premium && (
                          <View style={styles.premiumBadge}>
                            <IonIcon name="star" size={12} color="#FFD700" />
                            <Text style={styles.premiumText}>Premium</Text>
                          </View>
                        )}
                      </View>
                      {isSelected && (
                        <IonIcon
                          name="checkmark-circle"
                          size={24}
                          color={colors.primary} // 🌅 Utilise la couleur du thème actif
                        />
                      )}
                    </Pressable>
                  );
                }}
              />
            </View>
          </SafeAreaView>
        </Modal>
      </View>
    </ThemedImageBackground>
  );
}
