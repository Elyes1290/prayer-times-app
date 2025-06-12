import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import compassImg from "../assets/images/compass.png";
import kaabaImg from "../assets/images/kaaba.png";
import bgImage from "../assets/images/prayer-bg.png";

const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;
const NEEDLE_HEIGHT = 100;
const COMPASS_SIZE = 300;

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

export default function QiblaScreen() {
  const { t } = useTranslation();

  const [direction, setDirection] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [isPointingToQibla, setIsPointingToQibla] = useState(false);

  // Animation: valeur de rotation de la boussole
  const animatedHeading = useRef(new Animated.Value(0)).current;
  const lastHeading = useRef(0);

  // Animation pour la couleur de l'aiguille
  const needleColorAnimation = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      let loc = await Location.getCurrentPositionAsync({});
      const angle = calculateQiblaDirection(
        loc.coords.latitude,
        loc.coords.longitude
      );
      setDirection(angle);
      Location.watchHeadingAsync((data) => {
        setHeading(data.trueHeading);
      });
    })();
  }, []);

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
    outputRange: ["#204296", "#22C55E"], // Bleu vers vert
  });

  return (
    <ImageBackground source={bgImage} style={styles.background}>
      <View style={styles.container}>
        <Text style={styles.title}>{t("qibla_direction")}</Text>
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
      </View>
      <View style={{ marginTop: 40, alignItems: "center" }}>
        <Text style={styles.instructions}>{t("qibla_instructions")}</Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 100,
    color: "#fffbe8", // Blanc cassé
    textShadowColor: "rgba(0,0,0,0.25)",
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
    backgroundColor: "rgba(34,40,58,0.30)", // Léger fond bleu nuit translucide
    borderRadius: COMPASS_SIZE / 2,
    borderWidth: 2,
    borderColor: "#e7c86a", // Jaune doux
    overflow: "hidden",
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
  },
  needle: {
    position: "absolute",
    width: 4,
    height: NEEDLE_HEIGHT,
    borderRadius: 2,
  },
  qiblaNeedle: {
    backgroundColor: "#204296",
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
  instructions: {
    color: "#FFD700", // Doré
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    lineHeight: 22,
    backgroundColor: "rgba(34,40,58,0.85)",
    borderRadius: 16,
    marginHorizontal: 28,
    marginBottom: 150,
    elevation: 3,
    textShadowColor: "rgba(0,0,0,0.28)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#e7c86a", // Jaune doux
  },
});
