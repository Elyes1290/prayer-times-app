/**
 * 🚀 Hook universel pour gestion responsive Android
 * Compatible avec tous les appareils Samsung et versions Android
 *
 * @description
 * Centralise la gestion des :
 * - Safe areas (insets) dynamiques
 * - Dimensions d'écran adaptatives
 * - Densité et scaling
 * - Navigation bottom padding
 * - Responsive breakpoints
 */

import { useCallback, useMemo } from "react";
import { useWindowDimensions, PixelRatio, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// 📱 Détection des types d'appareils Samsung
const SAMSUNG_DEVICE_PATTERNS = {
  S_SERIES: /SM-S\d{3}/i,
  NOTE_SERIES: /SM-N\d{3}/i,
  A_SERIES: /SM-A\d{3}/i,
  GALAXY_TAB: /SM-T\d{3}/i,
};

// 🎯 Constantes de layout universelles
const LAYOUT_CONSTANTS = {
  // Navigation
  NAVIGATION_HEIGHT: 70,
  TAB_BAR_HEIGHT: 60,

  // Marges sécurisées minimales
  MIN_SAFE_MARGIN: 16,
  DEFAULT_SAFE_MARGIN: 20,
  LARGE_SAFE_MARGIN: 24,

  // Breakpoints responsive
  BREAKPOINTS: {
    SMALL: 360, // Galaxy A series, anciens appareils
    MEDIUM: 414, // Galaxy S22, S23
    LARGE: 430, // Galaxy S24, S25 Ultra
    XLARGE: 480, // Tablettes
  },

  // Densités d'écran typiques Samsung
  DENSITY_CATEGORIES: {
    MDPI: 1.0,
    HDPI: 1.5,
    XHDPI: 2.0,
    XXHDPI: 3.0,
    XXXHDPI: 4.0,
  },
};

interface UniversalLayoutProps {
  // Options de personnalisation
  includeNavigationPadding?: boolean;
  includeTabBarPadding?: boolean;
  customBottomPadding?: number;
  safeMarginMultiplier?: number;
}

interface LayoutMetrics {
  // Dimensions de l'écran
  screenWidth: number;
  screenHeight: number;

  // Safe areas calculées
  safeAreaTop: number;
  safeAreaBottom: number;
  safeAreaLeft: number;
  safeAreaRight: number;

  // Padding calculés pour le contenu
  contentPaddingTop: number;
  contentPaddingBottom: number;
  contentPaddingHorizontal: number;

  // Métadonnées de l'appareil
  pixelRatio: number;
  deviceCategory: "small" | "medium" | "large" | "xlarge";
  densityCategory: string;
  isSamsungDevice: boolean;

  // Helpers responsive
  isSmallScreen: boolean;
  isMediumScreen: boolean;
  isLargeScreen: boolean;
  isTablet: boolean;

  // Fonctions utilitaires
  scale: (size: number) => number;
  moderateScale: (size: number, factor?: number) => number;
  verticalScale: (size: number) => number;
}

function useUniversalLayout(
  options: UniversalLayoutProps = {}
): LayoutMetrics {
  const {
    includeNavigationPadding = true,
    includeTabBarPadding = false,
    customBottomPadding,
    safeMarginMultiplier = 1,
  } = options;

  // 🛠️ Safe area insets - mockés dans les tests via setupTests.js
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const pixelRatio = PixelRatio.get();

  // 📱 Détection du type d'appareil
  const deviceMetrics = useMemo(() => {
    const isSamsungDevice =
      Platform.OS === "android" &&
      Object.values(SAMSUNG_DEVICE_PATTERNS).some(
        (pattern) =>
          // En production, utiliser react-native-device-info pour détecter le modèle
          // Pour l'instant, on se base sur les dimensions
          false
      );

    // Catégorisation basée sur la largeur d'écran
    let deviceCategory: "small" | "medium" | "large" | "xlarge";
    if (screenWidth < LAYOUT_CONSTANTS.BREAKPOINTS.SMALL) {
      deviceCategory = "small";
    } else if (screenWidth < LAYOUT_CONSTANTS.BREAKPOINTS.MEDIUM) {
      deviceCategory = "medium";
    } else if (screenWidth < LAYOUT_CONSTANTS.BREAKPOINTS.LARGE) {
      deviceCategory = "large";
    } else {
      deviceCategory = "xlarge";
    }

    // Catégorisation de densité
    let densityCategory: string;
    if (pixelRatio <= 1.5) densityCategory = "MDPI/HDPI";
    else if (pixelRatio <= 2.5) densityCategory = "XHDPI";
    else if (pixelRatio <= 3.5) densityCategory = "XXHDPI";
    else densityCategory = "XXXHDPI";

    return {
      isSamsungDevice,
      deviceCategory,
      densityCategory,
      isSmallScreen: deviceCategory === "small",
      isMediumScreen: deviceCategory === "medium",
      isLargeScreen: deviceCategory === "large",
      isTablet: deviceCategory === "xlarge",
    };
  }, [screenWidth, pixelRatio]);

  // 🎯 Calcul des safe areas intelligentes
  const safeAreas = useMemo(() => {
    // Protection contre les valeurs négatives ou aberrantes
    const safeTop = Math.max(insets.top, 0);
    const safeBottom = Math.max(insets.bottom, 0);
    const safeLeft = Math.max(insets.left, 0);
    const safeRight = Math.max(insets.right, 0);

    // Ajustements spécifiques selon l'appareil
    let adjustedBottom = safeBottom;

    // Pour les nouveaux Samsung (S24, S25), la navigation gesture peut être plus grande
    if (deviceMetrics.deviceCategory === "large" && safeBottom < 20) {
      adjustedBottom = Math.max(safeBottom, 20);
    }

    return {
      safeAreaTop: safeTop,
      safeAreaBottom: adjustedBottom,
      safeAreaLeft: safeLeft,
      safeAreaRight: safeRight,
    };
  }, [insets, deviceMetrics.deviceCategory]);

  // 📐 Calcul des paddings pour le contenu
  const contentPadding = useMemo(() => {
    const baseMargin =
      LAYOUT_CONSTANTS.DEFAULT_SAFE_MARGIN * safeMarginMultiplier;

    // Padding top : safe area + marge
    const paddingTop = safeAreas.safeAreaTop + baseMargin;

    // Padding bottom : safe area + navigation + marges
    let paddingBottom = safeAreas.safeAreaBottom + baseMargin;

    if (includeNavigationPadding) {
      paddingBottom += LAYOUT_CONSTANTS.NAVIGATION_HEIGHT;
    }

    if (includeTabBarPadding) {
      paddingBottom += LAYOUT_CONSTANTS.TAB_BAR_HEIGHT;
    }

    if (customBottomPadding !== undefined) {
      paddingBottom = customBottomPadding + safeAreas.safeAreaBottom;
    }

    // Padding horizontal adaptatif selon la taille d'écran
    let paddingHorizontal = baseMargin;
    if (deviceMetrics.isSmallScreen) {
      paddingHorizontal = LAYOUT_CONSTANTS.MIN_SAFE_MARGIN;
    } else if (deviceMetrics.isTablet) {
      paddingHorizontal = LAYOUT_CONSTANTS.LARGE_SAFE_MARGIN;
    }

    return {
      contentPaddingTop: paddingTop,
      contentPaddingBottom: paddingBottom,
      contentPaddingHorizontal: paddingHorizontal,
    };
  }, [
    safeAreas,
    safeMarginMultiplier,
    includeNavigationPadding,
    includeTabBarPadding,
    customBottomPadding,
    deviceMetrics.isSmallScreen,
    deviceMetrics.isTablet,
  ]);

  // 🔧 Fonctions de scaling responsive
  const scalingFunctions = useMemo(() => {
    const baseWidth = 375; // iPhone X comme référence
    const scale = (size: number) => (screenWidth / baseWidth) * size;

    const verticalScale = (size: number) => (screenHeight / 812) * size;

    const moderateScale = (size: number, factor: number = 0.5) =>
      size + (scale(size) - size) * factor;

    return { scale, verticalScale, moderateScale };
  }, [screenWidth, screenHeight]);

  return {
    // Dimensions
    screenWidth,
    screenHeight,

    // Safe areas
    ...safeAreas,

    // Paddings calculés
    ...contentPadding,

    // Métadonnées
    pixelRatio,
    ...deviceMetrics,

    // Fonctions utilitaires
    ...scalingFunctions,
  };
}

/**
 * 🎨 Hook pour styles universels avec layout intelligent
 */
export function useUniversalStyles(options: UniversalLayoutProps = {}) {
  const layout = useUniversalLayout(options);

  // 🎨 Constantes de design responsive
  const designTokens = {
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 },
    fontSize: { xs: 12, sm: 14, md: 16, lg: 18, xl: 20 },
    borderRadius: { sm: 4, md: 8, lg: 12, xl: 16 },
  };

  return {
    ...layout,
    ...designTokens,

    // Styles prêts à l'emploi
    containerStyle: {
      flex: 1,
      paddingTop: layout.contentPaddingTop,
      paddingBottom: layout.contentPaddingBottom,
      paddingHorizontal: layout.contentPaddingHorizontal,
    },

    safeContainerStyle: {
      flex: 1,
      paddingTop: layout.safeAreaTop,
      paddingBottom: layout.safeAreaBottom,
      paddingLeft: layout.safeAreaLeft,
      paddingRight: layout.safeAreaRight,
    },

    scrollViewContentStyle: {
      paddingBottom: layout.contentPaddingBottom,
      paddingHorizontal: layout.contentPaddingHorizontal,
    },

    flatListContentStyle: {
      paddingBottom: layout.contentPaddingBottom,
    },
  };
}

/**
 * 🔧 Helper pour debug des métriques de layout
 */
function useLayoutDebug() {
  const layout = useUniversalLayout();

  const logLayoutInfo = useCallback(() => {
    console.log("📱 Layout Debug Info:", {
      Écran: `${layout.screenWidth}x${layout.screenHeight}`,
      Catégorie: layout.deviceCategory,
      Densité: layout.densityCategory,
      PixelRatio: layout.pixelRatio,
      SafeArea: {
        top: layout.safeAreaTop,
        bottom: layout.safeAreaBottom,
        left: layout.safeAreaLeft,
        right: layout.safeAreaRight,
      },
      ContentPadding: {
        top: layout.contentPaddingTop,
        bottom: layout.contentPaddingBottom,
        horizontal: layout.contentPaddingHorizontal,
      },
      Samsung: layout.isSamsungDevice,
    });
  }, [layout]);

  return { layout, logLayoutInfo };
}
