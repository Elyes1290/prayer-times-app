import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useThemeColors, useCurrentTheme } from "../hooks/useThemeAssets";
import { usePremium } from "../contexts/PremiumContext";

interface PremiumPromotionProps {
  feature?: string;
  title?: string;
  message?: string;
  cta?: string;
  variant?: "compact" | "full" | "banner";
}

const PremiumPromotion: React.FC<PremiumPromotionProps> = ({
  feature,
  title,
  message,
  cta,
  variant = "compact",
}) => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const currentTheme = useCurrentTheme();
  const router = useRouter();
  const { user } = usePremium();

  // Ne pas afficher si l'utilisateur est déjà premium
  if (user.isPremium) {
    return null;
  }

  const styles = getStyles(colors, currentTheme, variant);

  const handleUpgrade = () => {
    router.push("/premium-payment");
  };

  const getDefaultContent = () => {
    if (feature) {
      return {
        title:
          t(`premium.promotion.${feature}.title`) || "Fonctionnalité Premium",
        message:
          t(`premium.promotion.${feature}.message`) ||
          "Débloquez cette fonctionnalité avec Premium",
        cta: t(`premium.promotion.${feature}.cta`) || "Mettre à niveau",
      };
    }

    return {
      title: title || "Passez à Premium",
      message: message || "Débloquez toutes les fonctionnalités avancées",
      cta: cta || "Essayer Premium",
    };
  };

  const content = getDefaultContent();

  if (variant === "banner") {
    return (
      <TouchableOpacity style={styles.bannerContainer} onPress={handleUpgrade}>
        <LinearGradient
          colors={[colors.primary, colors.accent]}
          style={styles.bannerGradient}
        >
          <MaterialCommunityIcons
            name="crown"
            size={24}
            color={colors.secondary}
          />
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>{content.title}</Text>
            <Text style={styles.bannerMessage}>{content.message}</Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={colors.secondary}
          />
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === "full") {
    return (
      <View style={styles.fullContainer}>
        <LinearGradient
          colors={[colors.surface, colors.cardBG]}
          style={styles.fullGradient}
        >
          <View style={styles.fullHeader}>
            <MaterialCommunityIcons
              name="crown"
              size={32}
              color={colors.secondary}
            />
            <Text style={styles.fullTitle}>{content.title}</Text>
            <Text style={styles.fullMessage}>{content.message}</Text>
          </View>

          <View style={styles.fullFeatures}>
            <FeatureItem
              icon="chart-line"
              text="Statistiques détaillées"
              styles={styles}
              colors={colors}
            />
            <FeatureItem
              icon="music-note"
              text="Sons d'adhan premium"
              styles={styles}
              colors={colors}
            />
            <FeatureItem
              icon="palette"
              text="Thèmes exclusifs"
              styles={styles}
              colors={colors}
            />
            <FeatureItem
              icon="bookmark-multiple"
              text="Favoris illimités"
              styles={styles}
              colors={colors}
            />
          </View>

          <TouchableOpacity style={styles.fullButton} onPress={handleUpgrade}>
            <Text style={styles.fullButtonText}>{content.cta}</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  // Variant compact (par défaut)
  return (
    <TouchableOpacity style={styles.compactContainer} onPress={handleUpgrade}>
      <LinearGradient
        colors={[colors.primary, colors.accent]}
        style={styles.compactGradient}
      >
        <MaterialCommunityIcons
          name="crown"
          size={20}
          color={colors.secondary}
        />
        <Text style={styles.compactText}>{content.title}</Text>
        <MaterialCommunityIcons
          name="chevron-right"
          size={16}
          color={colors.secondary}
        />
      </LinearGradient>
    </TouchableOpacity>
  );
};

const FeatureItem: React.FC<{
  icon: string;
  text: string;
  styles: any;
  colors: any;
}> = ({ icon, text, styles, colors }) => (
  <View style={styles.featureItem}>
    <MaterialCommunityIcons
      name={icon as any}
      size={16}
      color={colors.success}
    />
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const getStyles = (
  colors: any,
  currentTheme: "light" | "dark",
  variant: string
) =>
  StyleSheet.create({
    // Styles pour le variant banner
    bannerContainer: {
      marginHorizontal: 16,
      marginVertical: 8,
      borderRadius: 12,
      overflow: "hidden",
    },
    bannerGradient: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
    },
    bannerContent: {
      flex: 1,
      marginLeft: 12,
    },
    bannerTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: "#FFFFFF",
      marginBottom: 2,
    },
    bannerMessage: {
      fontSize: 12,
      color: "rgba(255, 255, 255, 0.8)",
    },

    // Styles pour le variant full
    fullContainer: {
      margin: 16,
      borderRadius: 16,
      overflow: "hidden",
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    fullGradient: {
      padding: 24,
    },
    fullHeader: {
      alignItems: "center",
      marginBottom: 20,
    },
    fullTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text.primary,
      marginTop: 8,
      marginBottom: 8,
      textAlign: "center",
    },
    fullMessage: {
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: "center",
      lineHeight: 20,
    },
    fullFeatures: {
      marginBottom: 24,
    },
    featureItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    featureText: {
      fontSize: 14,
      color: colors.text.primary,
      marginLeft: 8,
    },
    fullButton: {
      backgroundColor: colors.secondary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: "center",
    },
    fullButtonText: {
      fontSize: 16,
      fontWeight: "bold",
      color: "#000000",
    },

    // Styles pour le variant compact
    compactContainer: {
      marginHorizontal: 16,
      marginVertical: 4,
      borderRadius: 8,
      overflow: "hidden",
    },
    compactGradient: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
    },
    compactText: {
      flex: 1,
      fontSize: 14,
      fontWeight: "600",
      color: "#FFFFFF",
      marginLeft: 8,
    },
  });

export default PremiumPromotion;
