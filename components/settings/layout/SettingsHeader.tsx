import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface SettingsHeaderProps {
  t: any;
  currentTheme: "light" | "dark";
  setThemeMode: (theme: "light" | "dark") => void;
  onPremiumPress: () => void;
  overlayTextColor: string;
  styles: any;
}

export default function SettingsHeader({
  t,
  currentTheme,
  setThemeMode,
  onPremiumPress,
  overlayTextColor,
  styles,
}: SettingsHeaderProps) {
  return (
    <>
      {/* Header principal */}
      <View style={styles.headerContainer}>
        <Text style={styles.title}>{t("settings_title", "Paramètres")}</Text>
        <TouchableOpacity style={styles.premiumButton} onPress={onPremiumPress}>
          <MaterialCommunityIcons
            name="account-circle"
            size={28}
            color={overlayTextColor}
          />
        </TouchableOpacity>
      </View>

      {/* Switch de thème */}
      <View style={styles.themeSection}>
        <View style={styles.themeSectionHeader}>
          <MaterialCommunityIcons
            name="theme-light-dark"
            size={24}
            color="#4ECDC4"
          />
          <Text style={styles.themeSectionTitle}>{t("theme", "Thème")}</Text>
        </View>
        <View style={styles.themeSwitchContainer}>
          <TouchableOpacity
            style={[
              styles.themeOption,
              currentTheme === "light" && styles.themeOptionActive,
            ]}
            onPress={() => setThemeMode("light")}
          >
            <MaterialCommunityIcons
              name="weather-sunny"
              size={20}
              color={currentTheme === "light" ? "#FFFFFF" : "#333333"}
            />
            <Text
              style={[
                styles.themeOptionText,
                { color: currentTheme === "light" ? "#FFFFFF" : "#333333" },
              ]}
            >
              {t("light_mode", "Clair")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.themeOption,
              currentTheme === "dark" && styles.themeOptionActive,
            ]}
            onPress={() => setThemeMode("dark")}
          >
            <MaterialCommunityIcons
              name="weather-night"
              size={20}
              color={currentTheme === "dark" ? "#FFFFFF" : "#333333"}
            />
            <Text
              style={[
                styles.themeOptionText,
                { color: currentTheme === "dark" ? "#FFFFFF" : "#333333" },
              ]}
            >
              {t("dark_mode", "Sombre")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}
