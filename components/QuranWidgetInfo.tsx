import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useQuranWidget } from "../hooks/useQuranWidget";
import { usePremium } from "../contexts/PremiumContext";

interface QuranWidgetInfoProps {
  onPress?: () => void;
}

export const QuranWidgetInfo: React.FC<QuranWidgetInfoProps> = ({
  onPress,
}) => {
  const { t } = useTranslation();
  const { user } = usePremium();
  const { isWidgetAvailable } = useQuranWidget();

  // Ne pas afficher si l'utilisateur n'est pas premium
  if (!user?.isPremium) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons
          name="widget-outline"
          size={24}
          color="#4ECDC4"
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>📖 Widget Coran Premium</Text>
        <Text style={styles.description}>
          {isWidgetAvailable
            ? t("quran_widget_available") ||
              "Widget disponible sur votre écran d'accueil"
            : t("quran_widget_add") ||
              "Ajoutez le widget à votre écran d'accueil"}
        </Text>
      </View>

      <View style={styles.statusContainer}>
        <View
          style={[
            styles.statusIndicator,
            { backgroundColor: isWidgetAvailable ? "#4CAF50" : "#FF9800" },
          ]}
        />
        <Text style={styles.statusText}>
          {isWidgetAvailable
            ? t("quran_widget_active") || "Actif"
            : t("quran_widget_inactive") || "Inactif"}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(78, 205, 196, 0.1)",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(78, 205, 196, 0.3)",
  },
  iconContainer: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4ECDC4",
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  statusContainer: {
    alignItems: "center",
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
});
