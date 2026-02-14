import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Vibration,
  ImageBackground,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ThemedImageBackground from "../components/ThemedImageBackground";
import { useTranslation } from "react-i18next";
import {
  useThemeColors,
  useOverlayTextColor,
  useCurrentTheme,
} from "../hooks/useThemeColor";

const { width, height } = Dimensions.get("window");
// Ajustement responsif du cercle selon la taille d'écran
const CIRCLE_SIZE = Math.min(width * 0.65, height * 0.3, 250);

const dhikrList = [
  "سُبْحَانَ اللَّهِ",
  "الْحَمْدُ لِلَّهِ",
  "اللَّهُ أَكْبَرُ",
  "لَا إِلَٰهَ إِلَّا اللَّهُ",
];

const getStyles = (
  colors: any,
  overlayTextColor: string,
  currentTheme: "light" | "dark" | "morning" | "sunset"
) => {
  const isLightTheme = currentTheme === "light" || currentTheme === "morning";
  return StyleSheet.create({
    background: {
      flex: 1,
      width: "100%",
      height: "100%",
    },
    container: {
      flex: 1,
    },
    content: {
      flex: 1,
      alignItems: "center",
      justifyContent: "space-around",
      padding: 20,
      paddingTop: 40,
    },
    title: {
      fontSize: Math.min(width * 0.08, 32),
      fontWeight: "bold",
      marginBottom: 15,
      textAlign: "center",
      color: overlayTextColor,
      textShadowColor: isLightTheme ? colors.textShadow : "rgba(0,0,0,0.5)",
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
    },
    dhikrContainer: {
      alignItems: "center",
      marginBottom: 20,
      padding: 15,
      borderRadius: 15,
      width: "100%",
      backgroundColor: isLightTheme ? colors.cardBG : "rgba(0,0,0,0.3)",
      borderWidth: 1,
      borderColor: isLightTheme ? colors.border : "rgba(255,215,0,0.3)",
    },
    arabicText: {
      fontSize: Math.min(width * 0.07, 28),
      color: colors.primary, // 🌅 Utilise la couleur du thème actif
      fontWeight: "bold",
      marginBottom: 8,
      textAlign: "center",
      textShadowColor: isLightTheme ? colors.textShadow : "rgba(0,0,0,0.3)",
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
    },
    translationText: {
      fontSize: 18,
      color: overlayTextColor,
      textAlign: "center",
    },
    circleContainer: {
      width: CIRCLE_SIZE,
      height: CIRCLE_SIZE,
      justifyContent: "center",
      alignItems: "center",
    },
    circle: {
      width: CIRCLE_SIZE,
      height: CIRCLE_SIZE,
      borderRadius: CIRCLE_SIZE / 2,
      backgroundColor: isLightTheme ? colors.primary : colors.primary,
      justifyContent: "center",
      alignItems: "center",
      elevation: 8,
      shadowColor: isLightTheme ? colors.shadow : "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      borderWidth: 3,
      borderColor: colors.primary, // 🌅 Utilise la couleur du thème actif
    },
    countText: {
      fontWeight: "bold",
      color: isLightTheme ? "#FFFFFF" : "#FFFFFF",
      textShadowColor: "rgba(0,0,0,0.3)",
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
    },
    resetButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 30,
      paddingVertical: 15,
      borderRadius: 25,
      backgroundColor: isLightTheme ? colors.accent : colors.notification,
      elevation: 4,
      shadowColor: isLightTheme ? colors.shadow : "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    resetText: {
      marginLeft: 8,
      fontSize: 16,
      fontWeight: "600",
      color: "#FFFFFF",
    },
  });
};

const TasbihScreen = () => {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();

  // Utiliser les couleurs thématiques
  const themeColors = useThemeColors();
  const overlayTextColor = useOverlayTextColor();
  const currentTheme = useCurrentTheme();

  const styles = getStyles(themeColors, overlayTextColor, currentTheme);
  const [count, setCount] = useState(0);
  const [scale] = useState(new Animated.Value(1));
  const rotation = useRef(new Animated.Value(0)).current;
  const rotationCount = useRef(0);
  const [currentDhikr, setCurrentDhikr] = useState(0);

  const dhikrTranslations = [
    t("tasbih.dhikr.subhanallah"),
    t("tasbih.dhikr.alhamdulillah"),
    t("tasbih.dhikr.allahouakbar"),
    t("tasbih.dhikr.la_ilaha_illallah"),
  ];

  const handleCount = () => {
    // Vibration feedback
    Vibration.vibrate(50);

    // Animation de scale
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Animation de rotation
    rotationCount.current += 1;
    Animated.timing(rotation, {
      toValue: rotationCount.current,
      duration: 200,
      useNativeDriver: true,
    }).start();

    setCount((prev) => {
      const newCount = prev + 1;
      if (newCount > 100) {
        setCurrentDhikr((currentDhikr + 1) % dhikrList.length);
        return 0;
      }
      if (newCount % 33 === 0) {
        setCurrentDhikr((currentDhikr + 1) % dhikrList.length);
      }
      return newCount;
    });
  };

  const resetCount = () => {
    setCount(0);
    setCurrentDhikr(0);
    rotationCount.current = 0;
    rotation.setValue(0);
  };

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <ThemedImageBackground style={styles.background}>
      <View style={[styles.container, { paddingBottom: insets.bottom + 100 }]}>
        <View style={styles.content}>
          <Text style={styles.title}>{t("tasbih.title")}</Text>

          <View style={styles.dhikrContainer}>
            <Text style={styles.arabicText}>{dhikrList[currentDhikr]}</Text>
            {!i18n.language.startsWith("ar") && (
              <Text style={styles.translationText}>
                {dhikrTranslations[currentDhikr]}
              </Text>
            )}
          </View>

          <Animated.View
            style={[
              styles.circleContainer,
              {
                transform: [{ scale }, { rotate: spin }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.circle}
              onPress={handleCount}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.countText,
                  { fontSize: Math.min(CIRCLE_SIZE * 0.25, 72) },
                ]}
              >
                {count}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity style={styles.resetButton} onPress={resetCount}>
            <MaterialCommunityIcons name="refresh" size={24} color="#FFFFFF" />
            <Text style={styles.resetText}>{t("tasbih.reset")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ThemedImageBackground>
  );
};

export default TasbihScreen;
