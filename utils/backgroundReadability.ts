import { use } from "react";
import {
  SettingsContext,
  BackgroundImageType,
} from "../contexts/SettingsContext";
import { useCurrentTheme } from "../hooks/useThemeColor";

export type AppTheme = "light" | "dark" | "morning" | "sunset";

export type MakkaReadabilityMode = "maghrib" | "morning";

export type MakkaReadabilityStyle = {
  active: boolean;
  mode: MakkaReadabilityMode | null;
  cardGradient: [string, string] | null;
  /** true = texte sombre sur cartes claires (matin), false = texte clair (maghrib) */
  lightCards: boolean;
};

/** ~88–90 % d’opacité : lisible sans masquer totalement le fond */
const MAKKA_MAGHRIB_CARD_GRADIENT: [string, string] = [
  "rgba(45, 34, 28, 0.90)",
  "rgba(34, 26, 21, 0.86)",
];

const MAKKA_MORNING_CARD_GRADIENT: [string, string] = [
  "rgba(255, 249, 239, 0.90)",
  "rgba(255, 243, 228, 0.86)",
];

const PHOTO_THEME_CARD_GRADIENTS: Record<
  "morning" | "sunset" | "dark",
  [string, string]
> = {
  morning: MAKKA_MORNING_CARD_GRADIENT,
  sunset: MAKKA_MAGHRIB_CARD_GRADIENT,
  dark: ["rgba(26, 42, 66, 0.90)", "rgba(21, 34, 56, 0.86)"],
};

function getMakkaReadabilityMode(
  backgroundImageType: BackgroundImageType,
  currentTheme: AppTheme,
): MakkaReadabilityMode | null {
  if (backgroundImageType !== "makka") return null;
  if (currentTheme === "sunset") return "maghrib";
  if (currentTheme === "morning") return "morning";
  return null;
}

function buildMakkaReadabilityStyle(
  backgroundImageType: BackgroundImageType,
  currentTheme: AppTheme,
): MakkaReadabilityStyle {
  const mode = getMakkaReadabilityMode(backgroundImageType, currentTheme);
  if (!mode) {
    return {
      active: false,
      mode: null,
      cardGradient: null,
      lightCards: false,
    };
  }

  if (mode === "maghrib") {
    return {
      active: true,
      mode,
      cardGradient: MAKKA_MAGHRIB_CARD_GRADIENT,
      lightCards: false,
    };
  }

  return {
    active: true,
    mode,
    cardGradient: MAKKA_MORNING_CARD_GRADIENT,
    lightCards: true,
  };
}

export function useMakkaReadability(): MakkaReadabilityStyle {
  const settings = use(SettingsContext);
  const currentTheme = useCurrentTheme();
  return buildMakkaReadabilityStyle(
    settings?.backgroundImageType ?? "prophet",
    currentTheme,
  );
}

/** Fond opaque des cartes dashboard HomeScreen (lisibilité sur image de fond) */
export function getHomeDashboardCardGradient(
  makkaReadability: MakkaReadabilityStyle,
  currentTheme: AppTheme,
): [string, string] {
  if (makkaReadability.cardGradient) {
    return makkaReadability.cardGradient;
  }

  if (currentTheme in PHOTO_THEME_CARD_GRADIENTS) {
    return PHOTO_THEME_CARD_GRADIENTS[
      currentTheme as keyof typeof PHOTO_THEME_CARD_GRADIENTS
    ];
  }

  return ["rgba(255, 255, 255, 0.90)", "rgba(248, 245, 240, 0.86)"];
}
