/**
 * Hook pour gérer les assets selon le thème (jour/nuit/matin/maghrib)
 * Images, couleurs et styles adaptatifs
 */

import { use } from "react";
import { useColorScheme } from "react-native";
import { Colors } from "../constants/Colors";
import { SettingsContext, BackgroundImageType } from "../contexts/SettingsContext";

// 🖼️ NOUVEAU : Images de fond selon le thème ET le type d'image (premium)
// 3 types d'images : prophet (Mosquée du Prophète), makka (Makka), alquds (Al-Quds)
// 📁 Images organisées dans assets/images/background/
const backgroundImages: Record<
  BackgroundImageType,
  Record<"light" | "dark" | "morning" | "sunset", any>
> = {
  prophet: {
    light: require("../assets/images/background/prayer-bg-jour.png"),
    dark: require("../assets/images/background/prayer-bg.png"),
    morning: require("../assets/images/background/prayer-bg-matin.png"),
    sunset: require("../assets/images/background/prayer-bg-maghrib.png"),
  },
  makka: {
    light: require("../assets/images/background/makka-bg-jour.png"),
    dark: require("../assets/images/background/makka-bg.png"),
    morning: require("../assets/images/background/makka-bg-matin.png"),
    sunset: require("../assets/images/background/makka-bg-maghrib.png"),
  },
  alquds: {
    light: require("../assets/images/background/alquds-bg-jour.png"),
    dark: require("../assets/images/background/alquds-bg.png"),
    morning: require("../assets/images/background/alquds-bg-matin.png"),
    sunset: require("../assets/images/background/alquds-bg-maghrib.png"),
  },
};

export function useThemeAssets() {
  const systemTheme = useColorScheme() ?? "light";
  const settingsContext = use(SettingsContext);

  // Détermine le thème actuel (4 thèmes possibles)
  let currentTheme: "light" | "dark" | "morning" | "sunset";
  if (settingsContext && settingsContext.currentTheme) {
    currentTheme = settingsContext.currentTheme;
  } else {
    currentTheme = systemTheme;
  }

  // 🖼️ NOUVEAU : Obtenir le type d'image de fond (premium)
  const backgroundImageType: BackgroundImageType = 
    settingsContext?.backgroundImageType || "prophet";

  return {
    // Image de fond selon le thème ET le type d'image (premium)
    backgroundImage: backgroundImages[backgroundImageType][currentTheme],

    // Couleurs du thème actuel
    colors: Colors[currentTheme],

    // Thème actuel
    theme: currentTheme,

    // Helper pour vérifier le thème
    isLight: currentTheme === "light" || currentTheme === "morning", // 🆕 morning est aussi un thème clair
    isDark: currentTheme === "dark" || currentTheme === "sunset", // 🆕 sunset est aussi un thème sombre
    isMorning: currentTheme === "morning", // 🆕 Helper pour thème matin
    isSunset: currentTheme === "sunset", // 🆕 Helper pour thème maghrib
  };
}

// Hook pour obtenir uniquement l'image de fond
function useBackgroundImage() {
  const { backgroundImage } = useThemeAssets();
  return backgroundImage;
}

// Hook pour obtenir les couleurs thématiques avec sécurité
export function useThemeColors() {
  const { colors } = useThemeAssets();
  return colors;
}

// 🔧 DÉPRÉCIÉ : Utiliser useCurrentTheme depuis @/hooks/useThemeColor à la place
// Ce hook est conservé pour la compatibilité mais redirige vers le hook principal
function useCurrentTheme(): "light" | "dark" | "morning" | "sunset" {
  const { theme } = useThemeAssets();
  return theme;
}

// 🆕 NOTE : Il est recommandé d'utiliser useCurrentTheme depuis @/hooks/useThemeColor
// import { useCurrentTheme } from "@/hooks/useThemeColor";
