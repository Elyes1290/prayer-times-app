// components/CachePremiumPromotion.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useThemeColors } from "../hooks/useThemeAssets";
import { useCurrentTheme } from "../hooks/useThemeColor";

interface CachePremiumPromotionProps {
  onUpgrade: () => void;
  visible?: boolean;
}

export default function CachePremiumPromotion({
  onUpgrade,
  visible = true,
}: CachePremiumPromotionProps) {
  const colors = useThemeColors();
  const currentTheme = useCurrentTheme();
  const isLightTheme = currentTheme === "light" || currentTheme === "morning";

  if (!visible) return null;

  const styles = StyleSheet.create({
    container: {
      backgroundColor:
        isLightTheme ? colors.cardBG : "rgba(0, 0, 0, 0.8)",
      borderRadius: 12,
      padding: 16,
      marginVertical: 8,
      borderWidth: 1,
      borderColor:
        isLightTheme ? colors.border : "rgba(255, 255, 255, 0.1)",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    icon: {
      marginRight: 8,
    },
    title: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      flex: 1,
    },
    premiumBadge: {
      backgroundColor: "#FFD700",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    premiumText: {
      fontSize: 12,
      fontWeight: "700",
      color: "#000",
    },
    description: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 12,
    },
    features: {
      marginBottom: 16,
    },
    feature: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    featureIcon: {
      marginRight: 8,
    },
    featureText: {
      fontSize: 13,
      color: colors.textSecondary,
      flex: 1,
    },
    upgradeButton: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    upgradeButtonText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "600",
      marginLeft: 8,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="lightning-bolt"
          size={20}
          color="#FFD700"
          style={styles.icon}
        />
        <Text style={styles.title}>Cache Premium</Text>
        <View style={styles.premiumBadge}>
          <Text style={styles.premiumText}>PREMIUM</Text>
        </View>
      </View>

      <Text style={styles.description}>
        Débloquez le cache avancé pour une expérience optimale hors ligne
      </Text>

      <View style={styles.features}>
        <View style={styles.feature}>
          <MaterialCommunityIcons
            name="calendar-month"
            size={16}
            color="#4CAF50"
            style={styles.featureIcon}
          />
          <Text style={styles.featureText}>
            Préchargement 30 jours (vs 7 jours gratuit)
          </Text>
        </View>

        <View style={styles.feature}>
          <MaterialCommunityIcons
            name="download"
            size={16}
            color="#4CAF50"
            style={styles.featureIcon}
          />
          <Text style={styles.featureText}>
            Préchargement automatique en arrière-plan
          </Text>
        </View>

        <View style={styles.feature}>
          <MaterialCommunityIcons
            name="speedometer"
            size={16}
            color="#4CAF50"
            style={styles.featureIcon}
          />
          <Text style={styles.featureText}>
            Calculs simultanés optimisés (5x plus rapide)
          </Text>
        </View>

        <View style={styles.feature}>
          <MaterialCommunityIcons
            name="cloud-sync"
            size={16}
            color="#4CAF50"
            style={styles.featureIcon}
          />
          <Text style={styles.featureText}>
            Synchronisation cloud des préférences
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.upgradeButton} onPress={onUpgrade}>
        <MaterialCommunityIcons name="crown" size={20} color="#FFFFFF" />
        <Text style={styles.upgradeButtonText}>Passer au Premium</Text>
      </TouchableOpacity>
    </View>
  );
}
