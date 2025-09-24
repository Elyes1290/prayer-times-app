import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors, useOverlayTextColor } from "../hooks/useThemeColor";

interface OfflineMessageProps {
  onRetry?: () => void;
  showRetryButton?: boolean;
  customMessage?: string;
}

/**
 * 📱 Composant pour afficher un message offline
 * Utilisé quand une connexion est requise mais non disponible
 */
export const OfflineMessage: React.FC<OfflineMessageProps> = ({
  onRetry,
  showRetryButton = true,
  customMessage,
}) => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const overlayTextColor = useOverlayTextColor();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.surface]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <MaterialCommunityIcons
            name="wifi-off"
            size={64}
            color={colors.primary}
            style={styles.icon}
          />

          <Text style={[styles.title, { color: overlayTextColor }]}>
            {t("offline_title", "Mode Hors Ligne")}
          </Text>

          <Text style={[styles.message, { color: overlayTextColor }]}>
            {customMessage ||
              t(
                "offline_message_quran",
                "Une connexion internet est requise pour accéder au Coran. Veuillez vous connecter ou passer Premium pour un accès offline complet."
              )}
          </Text>

          {showRetryButton && onRetry && (
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={onRetry}
            >
              <MaterialCommunityIcons
                name="refresh"
                size={20}
                color="#FFFFFF"
                style={styles.retryIcon}
              />
              <Text style={styles.retryButtonText}>
                {t("retry", "Réessayer")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  gradient: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
    padding: 24,
  },
  content: {
    alignItems: "center",
    maxWidth: 300,
  },
  icon: {
    marginBottom: 16,
    opacity: 0.8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
    fontFamily: "ScheherazadeNew-Bold",
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
    fontFamily: "ScheherazadeNew-Regular",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  retryIcon: {
    marginRight: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "ScheherazadeNew-SemiBold",
  },
});
