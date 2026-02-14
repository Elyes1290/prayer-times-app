/**
 * Hook pour gérer les couleurs selon le thème (jour/nuit)
 * Utilisation: const backgroundColor = useThemeColor('background');
 */

import { useColorScheme } from "react-native";
import { useContext } from "react";
import { Colors, ColorName } from "@/constants/Colors";
import { SettingsContext } from "@/contexts/SettingsContext";

// Hook internal pour obtenir le thème actuel depuis le contexte des paramètres
function useCurrentThemeInternal(): "light" | "dark" | "morning" | "sunset" {
  const settings = useContext(SettingsContext);
  const systemTheme = useColorScheme() ?? "light";

  // Si on peut accéder au contexte, utiliser le thème des paramètres
  if (settings && !settings.isLoading) {
    switch (settings.themeMode) {
      case "light":
        return "light";
      case "dark":
        return "dark";
      case "morning":
        return "morning";
      case "sunset":
        return "sunset";
      case "auto":
      default:
        return systemTheme;
    }
  }

  // Fallback au thème système si le contexte n'est pas disponible
  return systemTheme;
}

export function useThemeColor(
  props: { 
    light?: string; 
    dark?: string;
    morning?: string;   // 🌅 NOUVEAU : Support thème matin
    sunset?: string;    // 🌆 NOUVEAU : Support thème crépuscule
  },
  colorName: ColorName
): string {
  const theme = useCurrentThemeInternal();

  // Si des couleurs spécifiques sont passées en props, les utiliser
  if (props) {
    const colorFromProps = props[theme];
    if (colorFromProps) {
      return colorFromProps;
    }
  }

  // Sinon utiliser les couleurs du thème
  return Colors[theme][colorName];
}

// Hook pour obtenir toutes les couleurs du thème actuel
export function useThemeColors() {
  const theme = useCurrentThemeInternal();
  return Colors[theme];
}

// Hook pour obtenir le thème actuel
export function useCurrentTheme(): "light" | "dark" | "morning" | "sunset" {
  return useCurrentThemeInternal();
}

// Hook utilitaire pour les couleurs d'overlay sur images
export function useOverlayTextColor(): string {
  const colors = useThemeColors();
  return colors.textOverlay;
}

// Hook utilitaire pour les couleurs d'icônes sur overlay
export function useOverlayIconColor(): string {
  const colors = useThemeColors();
  return colors.textOverlay;
}

// Hook utilitaire pour les couleurs de texte secondaire sur overlay
export function useOverlaySecondaryTextColor(): string {
  const colors = useThemeColors();
  return colors.textOverlaySecondary;
}
