import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Vibration,
  ImageBackground,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { LinearGradient } from "@/components/ui/LinearGradientView";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ThemedImageBackground from "../components/ThemedImageBackground";
import { useTranslation } from "react-i18next";
import {
  useThemeColors,
  useOverlayTextColor,
  useCurrentTheme,
} from "../hooks/useThemeColor";
import { makeBoxShadow } from "../utils/shadowUtils";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const dhikrList = [
  "سُبْحَانَ اللَّهِ",
  "الْحَمْدُ لِلَّهِ",
  "اللَّهُ أَكْبَرُ",
  "لَا إِلَٰهَ إِلَّا اللَّهُ",
];

const getStyles = (
  colors: any,
  overlayTextColor: string,
  currentTheme: "light" | "dark" | "morning" | "sunset",
  circleSize: number,
  screenWidth: number
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
      fontSize: Math.min(screenWidth * 0.08, 32),
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
      fontSize: Math.min(screenWidth * 0.07, 28),
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
      width: circleSize,
      height: circleSize,
      justifyContent: "center",
      alignItems: "center",
    },
    circle: {
      width: circleSize,
      height: circleSize,
      borderRadius: circleSize / 2,
      backgroundColor: isLightTheme ? colors.primary : colors.primary,
      justifyContent: "center",
      alignItems: "center",
      boxShadow: makeBoxShadow(isLightTheme ? colors.shadow : "#000", 0, 4, 8, 0.3),
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
      boxShadow: makeBoxShadow(isLightTheme ? colors.shadow : "#000", 0, 2, 4, 0.2),
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
  const { width, height } = useWindowDimensions();
  const circleSize = Math.min(width * 0.65, height * 0.3, 250);

  const styles = getStyles(themeColors, overlayTextColor, currentTheme, circleSize, width);
  const [count, setCount] = useState(0);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const rotationCount = useRef(0);

  const circleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value * 360}deg` },
    ],
  }));
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

    scale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );

    rotationCount.current += 1;
    rotation.value = withTiming(rotationCount.current, { duration: 200 });

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
    rotation.value = 0;
  };

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

          <Animated.View style={[styles.circleContainer, circleAnimatedStyle]}>
            <Pressable
              style={styles.circle}
              onPress={handleCount}
            >
              <Text
                style={[
                  styles.countText,
                  { fontSize: Math.min(circleSize * 0.25, 72) },
                ]}
              >
                {count}
              </Text>
            </Pressable>
          </Animated.View>

          <Pressable style={styles.resetButton} onPress={resetCount}>
            <MCIcon name="refresh" size={24} color="#FFFFFF" />
            <Text style={styles.resetText}>{t("tasbih.reset")}</Text>
          </Pressable>
        </View>
      </View>
    </ThemedImageBackground>
  );
};

export default TasbihScreen;
