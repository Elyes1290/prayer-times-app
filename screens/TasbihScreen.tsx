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
import bgImage from "../assets/images/prayer-bg.png";
import { useTranslation } from "react-i18next";

const { width } = Dimensions.get("window");
const CIRCLE_SIZE = width * 0.7;

const dhikrList = [
  "سُبْحَانَ اللَّهِ",
  "الْحَمْدُ لِلَّهِ",
  "اللَّهُ أَكْبَرُ",
  "لَا إِلَٰهَ إِلَّا اللَّهُ",
];

const TasbihScreen = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
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
    <ImageBackground source={bgImage} style={styles.background}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>{t("tasbih.title")}</Text>

          <View style={styles.dhikrContainer}>
            <Text style={styles.arabicText}>{dhikrList[currentDhikr]}</Text>
            <Text style={styles.translationText}>
              {dhikrTranslations[currentDhikr]}
            </Text>
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
              style={[styles.circle, { backgroundColor: colors.primary }]}
              onPress={handleCount}
              activeOpacity={0.8}
            >
              <Text style={styles.countText}>{count}</Text>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            style={[
              styles.resetButton,
              { backgroundColor: colors.notification },
            ]}
            onPress={resetCount}
          >
            <MaterialCommunityIcons name="refresh" size={24} color="white" />
            <Text style={styles.resetText}>{t("tasbih.reset")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
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
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#fff",
  },
  dhikrContainer: {
    alignItems: "center",
    marginBottom: 30,
    padding: 15,
    borderRadius: 15,
    width: "100%",
  },
  arabicText: {
    fontSize: 32,
    color: "#FFD700",
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  translationText: {
    fontSize: 18,
    color: "#FFFFFF",
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
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  countText: {
    fontSize: 72,
    fontWeight: "bold",
    color: "white",
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 25,
    marginTop: 40,
  },
  resetText: {
    color: "white",
    fontSize: 18,
    marginLeft: 8,
  },
});

export default TasbihScreen;
