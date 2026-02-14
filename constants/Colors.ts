/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

/**
 * Couleurs pour l'application MyAdhan - Support mode jour/nuit
 * Palette jour inspirée de l'image de mosquée : verts éclatants, bleu turquoise, or doré
 */

// 🎨 NOUVEAU : Constantes partagées pour les couleurs communes
export const SHARED_COLORS = {
  // Couleurs islamiques principales
  islamicGreen: "#2E8B57",           // Sea Green - vert des dômes
  islamicGreenMedium: "#3CB371",     // Medium Sea Green
  islamicTurquoise: "#20B2AA",       // Light Sea Green - bleu turquoise
  islamicSkyBlue: "#48CAE4",         // Bleu ciel clair
  
  // Couleurs dorées
  islamicGold: "#DAA520",            // Golden Rod - or véritable
  islamicGoldLight: "#F4D03F",       // Or plus clair
  
  // Couleurs de statut communes
  errorSoft: "#CD5C5C",              // Rouge indien doux
  
  // Couleurs de texte sombres (pour thèmes clairs)
  textDark: "#1A1A1A",
  textDarkSecondary: "#2C2C2C",
  textDarkTertiary: "#424242",
  
  // Couleurs de texte claires (pour thèmes sombres)
  textLight: "#FFFFFF",
  textLightSecondary: "#CCCCCC",
  textLightTertiary: "#999999",
  
  // Arrière-plans neutres
  backgroundLight: "#F8F9FA",
  backgroundDark: "#0B1520",        // 🌙 Bleu-noir profond (au lieu de #121212 noir pur)
  surfaceDark: "#152238",           // 🌙 Bleu-nuit moyen (au lieu de #1E1E1E gris)
  surfaceDarkVariant: "#1F2E47",    // 🌙 Bleu-ardoise (au lieu de #2A2A2A gris)
  
  // Blanc pur (pour morning)
  pureWhite: "#FFFFFF",
  lightGray: "#F5F5F5",
  
  // Couleurs sunset/maghrib - 🌆 Palette améliorée
  sunsetOrange: "#FF7F50",           // Coral - orange intense
  sunsetOrangeLight: "#FFB347",      // Peach - orange doux
  sunsetPink: "#FF69B4",             // Hot Pink - rose magenta
  sunsetSalmon: "#FA8072",           // Salmon - rose saumon
  sunsetGold: "#FFA500",             // Pure Orange Gold - or très chaud
  sunsetGoldLight: "#FFD700",        // Gold - or lumineux
  sunsetPurple: "#4B0082",           // Indigo - violet profond du crépuscule
  sunsetPurpleDark: "#1A0A2E",       // Violet très sombre (presque nuit)
  sunsetCream: "#FFF8DC",            // Cornsilk - blanc crème chaleureux
  sunsetBeige: "#F4E4C1",            // Wheat - beige doré
  sunsetBeigeDeep: "#DEB887",        // Burlywood - beige profond
  
  // 🌅 NOUVEAU : Couleurs morning/matin - Palette aurore
  morningGold: "#FFD89B",            // Or doux du lever
  morningPeach: "#FFDAB9",           // Pêche matinal (backgrounds seulement)
  morningCopper: "#E8A87C",          // Or cuivré - couleur principale visible ✨
  morningCopperDark: "#DAA06D",      // Or cuivré plus foncé
  morningPink: "#FFB6C1",            // Rose aurore
  morningSkyBlue: "#87CEEB",         // Bleu ciel matin
  morningLavender: "#E6E6FA",        // Lavande douce
  morningCream: "#FFF9E6",           // Crème très clair
  morningApricot: "#FBCEB1",         // Abricot doux
  morningMint: "#F0FFF0",            // Menthe très pâle
  morningIvory: "#FFF5EE",           // Ivoire rosé (Seashell) - doux et chaleureux
} as const;

export const Colors = {
  light: {
    // Arrière-plans - tons beiges/crèmes inspirés de l'architecture
    background: SHARED_COLORS.backgroundLight,
    cardBG: "rgba(255, 255, 255, 0.9)", // Légèrement transparent pour s'adapter au fond
    surface: "rgba(248, 245, 240, 0.9)", // Beige très clair
    surfaceVariant: "rgba(245, 242, 237, 0.9)", // Ton crème

    // Couleurs principales islamiques - inspirées des dômes verts
    primary: SHARED_COLORS.islamicGreen,
    primaryContainer: SHARED_COLORS.islamicGreenMedium,
    secondary: SHARED_COLORS.islamicTurquoise,
    secondaryContainer: SHARED_COLORS.islamicSkyBlue,

    // Accent doré - inspiré des croissants et décorations
    accent: SHARED_COLORS.islamicGold,
    accentContainer: SHARED_COLORS.islamicGoldLight,

    // Textes - ADAPTES POUR LE MODE JOUR
    text: SHARED_COLORS.textDark,
    textSecondary: SHARED_COLORS.textDarkSecondary,
    textTertiary: SHARED_COLORS.textDarkTertiary,
    textOnPrimary: SHARED_COLORS.textLight,
    textOnAccent: SHARED_COLORS.textLight,

    // Textes spéciaux pour l'overlay sur image
    textOverlay: SHARED_COLORS.textDark,
    textOverlaySecondary: "#333333",
    textOverlayLight: SHARED_COLORS.textLight,

    // États - harmonisés avec la nouvelle palette
    success: SHARED_COLORS.islamicGreen,
    warning: SHARED_COLORS.islamicGold,
    error: SHARED_COLORS.errorSoft,
    info: SHARED_COLORS.islamicTurquoise,

    // Bordures et dividers - tons plus doux
    border: "rgba(46, 139, 87, 0.2)", // Vert transparent
    divider: "rgba(32, 178, 170, 0.15)", // Bleu turquoise transparent

    // Navigation - harmonisée
    tabBar: "rgba(255, 255, 255, 0.95)",
    tabBarActive: SHARED_COLORS.islamicGreen,
    tabBarInactive: SHARED_COLORS.textDarkTertiary,

    // Spécifique à l'app religieuse
    prayerTime: SHARED_COLORS.islamicGreen,
    qiblaDirection: SHARED_COLORS.islamicGold,
    islamicGold: SHARED_COLORS.islamicGold,

    // Ombres - plus douces
    shadow: "rgba(46, 139, 87, 0.2)", // Ombres vertes
    elevation: "rgba(32, 178, 170, 0.15)", // Élévation turquoise
  },

  dark: {
    // Arrière-plans - 🌙 Transparents pour laisser l'image de fond visible
    background: SHARED_COLORS.backgroundDark,
    cardBG: "rgba(21, 34, 56, 0.85)",           // 🌙 Bleu-nuit semi-transparent (au lieu de #152238 opaque)
    surface: "rgba(21, 34, 56, 0.85)",          // 🌙 Bleu-nuit semi-transparent
    surfaceVariant: "rgba(31, 46, 71, 0.85)",   // 🌙 Bleu-ardoise semi-transparent (au lieu de #1F2E47 opaque)

    // Couleurs principales islamiques (versions sombres)
    primary: "#66BB6A", // Vert plus clair pour le mode sombre
    primaryContainer: "#2E7D32",
    secondary: "#9CCC65",
    secondaryContainer: "#689F38",

    // Accent doré (ajusté pour le sombre)
    accent: "#FFB74D",
    accentContainer: "#F57C00",

    // Textes
    text: SHARED_COLORS.textLight,
    textSecondary: SHARED_COLORS.textLightSecondary,
    textTertiary: SHARED_COLORS.textLightTertiary,
    textOnPrimary: "#000000",
    textOnAccent: "#000000",

    // Textes spéciaux pour l'overlay sur image
    textOverlay: SHARED_COLORS.textLight,
    textOverlaySecondary: SHARED_COLORS.textLightSecondary,
    textOverlayLight: SHARED_COLORS.textLight,

    // États
    success: "#66BB6A",
    warning: "#FFB74D",
    error: "#EF5350",
    info: "#42A5F5",

    // Bordures et dividers
    border: "#2A3F5F",                         // 🌙 Bordure bleu-nuit (au lieu de #333333 gris)
    divider: SHARED_COLORS.surfaceDarkVariant, // 🌙 Utilise le bleu-ardoise

    // Navigation - 🌙 TabBar semi-transparent
    tabBar: "rgba(21, 34, 56, 0.9)",           // 🌙 Bleu-nuit semi-transparent pour navigation
    tabBarActive: "#66BB6A",
    tabBarInactive: SHARED_COLORS.textLightSecondary,

    // Spécifique à l'app religieuse
    prayerTime: "#A5D6A7",
    qiblaDirection: "#FFB74D",
    islamicGold: "#FFD54F",

    // Ombres - ton bleu-noir
    shadow: "rgba(10, 21, 32, 0.4)",      // 🌙 Ombre bleu-noir (au lieu de noir pur)
    elevation: "rgba(15, 30, 50, 0.5)",   // 🌙 Élévation bleu-nuit (au lieu de noir pur)
  },

  // 🌅 Thème Matin (Premium) - Palette Aurore inspirée du lever de soleil
  // Tons doux, chaleureux et lumineux du matin
  morning: {
    // Arrière-plans - 🌅 Transparents pour laisser l'image de fond visible
    background: SHARED_COLORS.morningCream,       // Crème très clair
    cardBG: "rgba(255, 250, 240, 0.85)",          // 🌅 Ivoire rosé semi-transparent (au lieu de #FFFAF0 opaque)
    surface: "rgba(255, 250, 240, 0.85)",         // 🌅 Ivoire rosé semi-transparent
    surfaceVariant: "rgba(230, 230, 250, 0.85)",  // 🌅 Lavande semi-transparente (au lieu de #E6E6FA opaque)

    // Couleurs principales - Inspirées de l'aurore avec or cuivré visible
    primary: SHARED_COLORS.morningCopper,         // Or cuivré - bien visible ✨
    primaryContainer: SHARED_COLORS.morningCopperDark, // Or cuivré plus foncé
    secondary: SHARED_COLORS.morningSkyBlue,      // Bleu ciel matin
    secondaryContainer: SHARED_COLORS.morningLavender, // Lavande

    // Accent - Or cuivré harmonieux
    accent: SHARED_COLORS.morningCopper,          // Or cuivré visible
    accentContainer: SHARED_COLORS.morningGold,   // Or doux pour conteneurs

    // Textes - Doux mais lisibles
    text: SHARED_COLORS.textDark,
    textSecondary: SHARED_COLORS.textDarkSecondary,
    textTertiary: "#8B7355",                      // Brun doux
    textOnPrimary: SHARED_COLORS.textDark,        // Texte sombre sur pêche
    textOnAccent: SHARED_COLORS.textDark,         // Texte sombre sur or doux

    // Textes spéciaux pour l'overlay sur image
    textOverlay: SHARED_COLORS.textDark,
    textOverlaySecondary: "#5D4E37",              // Brun café
    textOverlayLight: SHARED_COLORS.textLight,

    // États - Harmonisés avec l'aurore, couleurs visibles
    success: "#6BBF59",                           // Vert matinal visible
    warning: SHARED_COLORS.morningCopper,         // Or cuivré visible
    error: "#E57373",                             // Rose corail visible
    info: SHARED_COLORS.morningSkyBlue,           // Bleu ciel

    // Bordures et dividers - Or cuivré harmonieux
    border: "rgba(232, 168, 124, 0.3)",           // Or cuivré transparent
    divider: "rgba(232, 168, 124, 0.15)",         // Or cuivré très transparent

    // Navigation - 🌅 TabBar semi-transparent
    tabBar: "rgba(255, 250, 240, 0.9)",           // 🌅 Ivoire rosé semi-transparent pour navigation
    tabBarActive: SHARED_COLORS.morningCopper,    // Or cuivré bien visible pour l'actif
    tabBarInactive: "#8B7355",                    // Brun doux

    // Spécifique à l'app religieuse - Or cuivré pour visibilité
    prayerTime: SHARED_COLORS.morningCopper,      // Or cuivré pour les heures de prière
    qiblaDirection: SHARED_COLORS.morningCopperDark, // Or cuivré foncé
    islamicGold: SHARED_COLORS.morningCopper,     // Or cuivré

    // Ombres - Or cuivré doux et chaud
    shadow: "rgba(232, 168, 124, 0.25)",          // Or cuivré transparent
    elevation: "rgba(218, 160, 109, 0.2)",        // Or cuivré foncé transparent
  },

  // 🌆 Thème Sunset/Maghrib (Premium) - Coucher de soleil doré-orangé 🌅
  // Tons chauds dorés, cuivrés et orangés - comme un vrai coucher de soleil
  // DISTINCT du thème dark avec des couleurs chaudes et profondes
  sunset: {
    // Arrière-plans - 🌆 Transparents pour laisser l'image de fond visible
    background: "#1A1410",                        // Brun très foncé, presque noir
    cardBG: "rgba(42, 31, 26, 0.85)",             // 🌆 Brun foncé semi-transparent (au lieu de #2A1F1A opaque)
    surface: "rgba(61, 43, 34, 0.85)",            // 🌆 Brun moyen semi-transparent (au lieu de #3D2B22 opaque)
    surfaceVariant: "rgba(74, 53, 40, 0.85)",     // 🌆 Brun clair semi-transparent (au lieu de #4A3528 opaque)

    // Couleurs principales - Orange mandarine et or doré du soleil couchant
    primary: "#FF8C42",                           // Orange mandarine VIF (vs #66BB6A vert du dark)
    primaryContainer: "#FFA726",                  // Orange doré
    secondary: "#FFB74D",                         // Or clair lumineux
    secondaryContainer: "#FFCC80",                // Or pâle

    // Accent - Or clair éclatant du soleil
    accent: "#FFB74D",                            // Or clair RAYONNANT
    accentContainer: "#FFCC80",                   // Or pâle doux

    // Textes - Crème chaud et doré
    text: "#FFF8E7",                              // Crème chaud lumineux
    textSecondary: "#FFE0B2",                     // Crème orangé
    textTertiary: "#FFCC80",                      // Or pâle
    textOnPrimary: "#1A1410",                     // Brun foncé sur orange
    textOnAccent: "#1A1410",                      // Brun foncé sur or

    // Textes spéciaux pour l'overlay sur image de mosquée
    textOverlay: "#FFF8E7",                       // Crème chaud
    textOverlaySecondary: "#FFE0B2",              // Crème orangé
    textOverlayLight: "#FFFFFF",

    // États - Palette CHAUDE dorée
    success: "#FFB74D",                           // Or clair (vs #66BB6A vert)
    warning: "#FF8C42",                           // Orange mandarine (vs #FFB74D)
    error: "#FF6B6B",                             // Rouge coral (vs #EF5350)
    info: "#FFA726",                              // Orange doré (vs #42A5F5 bleu)

    // Bordures et dividers - Lueurs DORÉES visibles
    border: "rgba(255, 140, 66, 0.4)",            // Orange mandarine transparent
    divider: "rgba(255, 183, 77, 0.3)",           // Or clair transparent

    // Navigation - 🌆 TabBar semi-transparent
    tabBar: "rgba(26, 20, 16, 0.9)",              // 🌆 Brun foncé semi-transparent pour navigation
    tabBarActive: "#FF8C42",                      // Orange mandarine VIF actif
    tabBarInactive: "#A0826D",                    // Brun grisé

    // Spécifique à l'app religieuse - ORANGE/OR dominant
    prayerTime: "#FFA726",                        // Orange doré (vs #A5D6A7 vert du dark)
    qiblaDirection: "#FF8C42",                    // Orange mandarine (vs #FFB74D or pâle)
    islamicGold: "#FFB74D",                       // Or clair éclatant (vs #FFD54F jaune)

    // Ombres - Lueurs DORÉES chaudes (vs noires du dark)
    shadow: "rgba(255, 140, 66, 0.4)",            // Orange lumineux
    elevation: "rgba(255, 167, 38, 0.35)",        // Orange doré lumineux
  },
};

// Types pour TypeScript
export type ColorScheme = keyof typeof Colors;
export type ColorName = keyof typeof Colors.light;
export type SharedColorName = keyof typeof SHARED_COLORS;
