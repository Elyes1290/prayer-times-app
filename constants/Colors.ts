/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

/**
 * Couleurs pour l'application MyAdhan - Support mode jour/nuit
 * Palette jour inspirée de l'image de mosquée : verts éclatants, bleu turquoise, or doré
 */

export const Colors = {
  light: {
    // Arrière-plans - tons beiges/crèmes inspirés de l'architecture
    background: "#F8F9FA",
    cardBG: "rgba(255, 255, 255, 0.9)", // Légèrement transparent pour s'adapter au fond
    surface: "rgba(248, 245, 240, 0.9)", // Beige très clair
    surfaceVariant: "rgba(245, 242, 237, 0.9)", // Ton crème

    // Couleurs principales islamiques - inspirées des dômes verts
    primary: "#2E8B57", // Sea Green - vert éclatant des dômes
    primaryContainer: "#3CB371", // Medium Sea Green
    secondary: "#20B2AA", // Light Sea Green - bleu turquoise du ciel
    secondaryContainer: "#48CAE4", // Bleu ciel plus clair

    // Accent doré - inspiré des croissants et décorations
    accent: "#DAA520", // Golden Rod - or véritable
    accentContainer: "#F4D03F", // Or plus clair

    // Textes - ADAPTES POUR LE MODE JOUR
    text: "#1A1A1A", // Texte principal sombre
    textSecondary: "#2C2C2C", // Plus sombre que l'original
    textTertiary: "#424242", // Plus sombre pour être visible
    textOnPrimary: "#FFFFFF",
    textOnAccent: "#FFFFFF",

    // Textes spéciaux pour l'overlay sur image
    textOverlay: "#1A1A1A", // Texte sombre pour fond clair
    textOverlaySecondary: "#333333",
    textOverlayLight: "#FFFFFF", // Pour les cas où on a besoin de blanc

    // États - harmonisés avec la nouvelle palette
    success: "#2E8B57", // Même vert que primary
    warning: "#DAA520", // Or doré
    error: "#CD5C5C", // Rouge indien plus doux
    info: "#20B2AA", // Bleu turquoise

    // Bordures et dividers - tons plus doux
    border: "rgba(46, 139, 87, 0.2)", // Vert transparent
    divider: "rgba(32, 178, 170, 0.15)", // Bleu turquoise transparent

    // Navigation - harmonisée
    tabBar: "rgba(255, 255, 255, 0.95)",
    tabBarActive: "#2E8B57", // Vert des dômes
    tabBarInactive: "#424242",

    // Spécifique à l'app religieuse
    prayerTime: "#2E8B57", // Vert des dômes
    qiblaDirection: "#DAA520", // Or doré
    islamicGold: "#DAA520", // Or cohérent

    // Ombres - plus douces
    shadow: "rgba(46, 139, 87, 0.2)", // Ombres vertes
    elevation: "rgba(32, 178, 170, 0.15)", // Élévation turquoise
  },

  dark: {
    // Arrière-plans
    background: "#121212",
    cardBG: "#1E1E1E",
    surface: "#1E1E1E",
    surfaceVariant: "#2A2A2A",

    // Couleurs principales islamiques (versions sombres)
    primary: "#66BB6A", // Vert plus clair pour le mode sombre
    primaryContainer: "#2E7D32",
    secondary: "#9CCC65",
    secondaryContainer: "#689F38",

    // Accent doré (ajusté pour le sombre)
    accent: "#FFB74D",
    accentContainer: "#F57C00",

    // Textes
    text: "#FFFFFF",
    textSecondary: "#CCCCCC",
    textTertiary: "#999999",
    textOnPrimary: "#000000",
    textOnAccent: "#000000",

    // Textes spéciaux pour l'overlay sur image
    textOverlay: "#FFFFFF", // Texte blanc pour fond sombre
    textOverlaySecondary: "#CCCCCC",
    textOverlayLight: "#FFFFFF",

    // États
    success: "#66BB6A",
    warning: "#FFB74D",
    error: "#EF5350",
    info: "#42A5F5",

    // Bordures et dividers
    border: "#333333",
    divider: "#2A2A2A",

    // Navigation
    tabBar: "#1E1E1E",
    tabBarActive: "#66BB6A",
    tabBarInactive: "#CCCCCC",

    // Spécifique à l'app religieuse
    prayerTime: "#A5D6A7",
    qiblaDirection: "#FFB74D",
    islamicGold: "#FFD54F",

    // Ombres
    shadow: "rgba(0, 0, 0, 0.3)",
    elevation: "rgba(0, 0, 0, 0.4)",
  },
};

// Types pour TypeScript
export type ColorScheme = keyof typeof Colors;
export type ColorName = keyof typeof Colors.light;
