import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface SettingsGridProps {
  t: any;
  activeSection: string | null;
  handleSectionToggle: (sectionId: string) => void;
  isPremium: boolean;
  styles: any;
}

export default function SettingsGrid({
  t,
  activeSection,
  handleSectionToggle,
  isPremium,
  styles,
}: SettingsGridProps) {
  const settingsButtons = [
    {
      id: "location",
      title: t("location", "Localisation"),
      icon: "map-marker" as const,
      iconColor: "#4ECDC4",
    },
    {
      id: "adhan_sound",
      title: t("adhan_sound", "Son et Adhan"),
      icon: "volume-high" as const,
      iconColor: "#FF6B6B",
    },
    {
      id: "notifications",
      title: t("notifications", "Notifications"),
      icon: "bell" as const,
      iconColor: "#FFD93D",
    },
    {
      id: "dhikr_dua",
      title: t("dhikr_dua", "Dhikr & Doua"),
      icon: "heart" as const,
      iconColor: "#6C5CE7",
    },
    {
      id: "appearance",
      title: t("appearance", "Apparence"),
      icon: "palette" as const,
      iconColor: "#A8E6CF",
    },
    {
      id: "backup",
      title: t("backup", "Sauvegarde"),
      icon: "cloud-upload" as const,
      iconColor: isPremium ? "#4ECDC4" : "#6B7280",
      disabled: !isPremium,
    },
    {
      id: "about",
      title: t("about", "À propos"),
      icon: "information-outline" as const,
      iconColor: "#74B9FF",
    },
    {
      id: "help",
      title: t("help", "Aide"),
      icon: "help" as const,
      iconColor: "#FD79A8",
    },
  ];

  return (
    <View style={{ padding: 16 }}>
      <View style={styles.gridContainer}>
        {settingsButtons.map((button) => (
          <TouchableOpacity
            key={button.id}
            style={[
              styles.gridButton,
              activeSection === button.id && styles.gridButtonActive,
              button.disabled && styles.gridButtonDisabled,
            ]}
            onPress={() => !button.disabled && handleSectionToggle(button.id)}
            disabled={button.disabled}
          >
            <MaterialCommunityIcons
              name={button.icon}
              size={32}
              color={button.iconColor}
            />
            <Text
              style={[
                styles.gridButtonText,
                button.disabled && styles.gridButtonTextDisabled,
              ]}
            >
              {button.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
