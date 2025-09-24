import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useThemeColors, useOverlayTextColor } from "../hooks/useThemeColor";

export type OfflineTabType = "quran" | "audio";

interface OfflineNavigationTabsProps {
  activeTab: OfflineTabType;
  onTabChange: (tab: OfflineTabType) => void;
  isPremium: boolean;
}

/**
 * 📱 Composant de navigation avec onglets pour le mode offline
 * Permet de basculer entre le texte du Coran et les audio téléchargés
 */
export const OfflineNavigationTabs: React.FC<OfflineNavigationTabsProps> = ({
  activeTab,
  onTabChange,
  isPremium,
}) => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const overlayTextColor = useOverlayTextColor();

  const tabs = [
    {
      id: "quran" as OfflineTabType,
      label: t("quran_text") || "Texte du Coran",
      icon: "book-open-page-variant",
      available: true, // Toujours disponible en offline
    },
    {
      id: "audio" as OfflineTabType,
      label: t("downloaded_audio") || "Audio Téléchargés",
      icon: "music-circle",
      available: isPremium, // Seulement si Premium
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.activeTab,
              activeTab === tab.id && { backgroundColor: colors.primary },
              !tab.available && styles.disabledTab,
            ]}
            onPress={() => tab.available && onTabChange(tab.id)}
            disabled={!tab.available}
          >
            <MaterialCommunityIcons
              name={tab.icon as any}
              size={20}
              color={
                !tab.available
                  ? colors.textTertiary
                  : activeTab === tab.id
                  ? "#FFFFFF"
                  : overlayTextColor
              }
              style={styles.tabIcon}
            />
            <Text
              style={[
                styles.tabLabel,
                {
                  color: !tab.available
                    ? colors.textTertiary
                    : overlayTextColor,
                },
                activeTab === tab.id && styles.activeTabLabel,
              ]}
            >
              {tab.label}
            </Text>
            {!tab.available && (
              <MaterialCommunityIcons
                name="lock"
                size={14}
                color={colors.textTertiary}
                style={styles.lockIcon}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Indicateur de mode offline */}
      <View
        style={[
          styles.offlineIndicator,
          { backgroundColor: colors.background },
        ]}
      >
        <MaterialCommunityIcons
          name="wifi-off"
          size={16}
          color={colors.primary}
        />
        <Text style={[styles.offlineText, { color: overlayTextColor }]}>
          {t("offline_mode") || "Mode Offline"}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6, // ✅ RÉDUIT de 12 à 6
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  tabsContainer: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 6, // ✅ RÉDUIT de 10 à 6
    borderRadius: 16, // ✅ RÉDUIT de 20 à 16
    gap: 4, // ✅ RÉDUIT de 6 à 4
  },
  activeTab: {
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  disabledTab: {
    opacity: 0.6,
  },
  tabIcon: {
    marginRight: 4,
  },
  tabLabel: {
    fontSize: 13, // ✅ RÉDUIT de 14 à 13
    fontWeight: "500",
    fontFamily: "ScheherazadeNew-SemiBold",
    flex: 1,
  },
  activeTabLabel: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  lockIcon: {
    marginLeft: 4,
  },
  offlineIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8, // ✅ RÉDUIT de 12 à 8
    paddingVertical: 4, // ✅ RÉDUIT de 6 à 4
    borderRadius: 10, // ✅ RÉDUIT de 12 à 10
    gap: 3, // ✅ RÉDUIT de 4 à 3
    marginLeft: 6, // ✅ RÉDUIT de 8 à 6
  },
  offlineText: {
    fontSize: 11, // ✅ RÉDUIT de 12 à 11
    fontWeight: "500",
    fontFamily: "ScheherazadeNew-Medium",
  },
});
