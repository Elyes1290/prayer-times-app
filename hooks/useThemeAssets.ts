/**
 * Hook pour gérer les assets selon le thème (jour/nuit)
 * Images, couleurs et styles adaptatifs
 */

import { useContext } from "react";
import { useColorScheme } from "react-native";
import { Colors } from "../constants/Colors";
import { SettingsContext } from "../contexts/SettingsContext";

// Images de fond selon le thème
const backgroundImages = {
  light: require("../assets/images/prayer-bg-jour.png"),
  dark: require("../assets/images/prayer-bg.png"),
};

export function useThemeAssets() {
  const systemTheme = useColorScheme() ?? "light";
  const settingsContext = useContext(SettingsContext);

  // Détermine le thème actuel
  let currentTheme: "light" | "dark";
  if (settingsContext && settingsContext.currentTheme) {
    currentTheme = settingsContext.currentTheme;
  } else {
    currentTheme = systemTheme;
  }

  return {
    // Image de fond selon le thème
    backgroundImage: backgroundImages[currentTheme],

    // Couleurs du thème actuel
    colors: Colors[currentTheme],

    // Thème actuel
    theme: currentTheme,

    // Helper pour vérifier le thème
    isLight: currentTheme === "light",
    isDark: currentTheme === "dark",
  };
}

// Hook pour obtenir uniquement l'image de fond
export function useBackgroundImage() {
  const { backgroundImage } = useThemeAssets();
  return backgroundImage;
}

// Hook pour obtenir les couleurs thématiques avec sécurité
export function useThemeColors() {
  const { colors } = useThemeAssets();
  return colors;
}

// Hook pour obtenir le thème actuel
export function useCurrentTheme(): "light" | "dark" {
  const { theme } = useThemeAssets();
  return theme;
}
