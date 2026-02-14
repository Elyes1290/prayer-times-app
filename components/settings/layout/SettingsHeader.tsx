import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface SettingsHeaderProps {
  t: any;
  currentTheme: "light" | "dark" | "morning" | "sunset";
  setThemeMode: (
    theme: "auto" | "light" | "dark" | "morning" | "sunset"
  ) => void;
  onPremiumPress: () => void;
  overlayTextColor: string;
  styles: any;
  isPremium: boolean; // 🆕 Pour vérifier le statut premium
}

export default function SettingsHeader({
  t,
  currentTheme,
  setThemeMode,
  onPremiumPress,
  overlayTextColor,
  styles,
  isPremium,
}: SettingsHeaderProps) {
  // 🔧 CORRECTION : Ne plus utiliser isLightTheme car ça confond "light" et "morning"
  // Chaque thème doit être comparé individuellement avec currentTheme
  
  // 🆕 Fonction pour gérer la sélection d'un thème premium
  const handleThemePress = (theme: "light" | "dark" | "morning" | "sunset") => {
    // Les thèmes morning et sunset sont premium uniquement
    if ((theme === "morning" || theme === "sunset") && !isPremium) {
      Alert.alert(
        "🌟 " + t("premium_required", "Premium requis"),
        t(
          "premium_themes_message",
          "Les thèmes Matin et Coucher de soleil sont réservés aux membres Premium."
        ),
        [
          { text: t("cancel", "Annuler"), style: "cancel" },
          { text: t("go_premium", "Devenir Premium"), onPress: onPremiumPress },
        ]
      );
      return;
    }
    setThemeMode(theme);
  };

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
          {/* Thème Clair */}
          <TouchableOpacity
            style={[
              styles.themeOption,
              currentTheme === "light" && styles.themeOptionActive,
            ]}
            onPress={() => handleThemePress("light")}
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

          {/* Thème Sombre */}
          <TouchableOpacity
            style={[
              styles.themeOption,
              currentTheme === "dark" && styles.themeOptionActive,
            ]}
            onPress={() => handleThemePress("dark")}
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

          {/* 🌅 Thème Matin (Premium) - Palette Aurore */}
          <TouchableOpacity
            style={[
              styles.themeOption,
              currentTheme === "morning" && styles.themeOptionActive,
              !isPremium && styles.themeOptionLocked,
            ]}
            onPress={() => handleThemePress("morning")}
          >
            <View style={{ position: "relative" }}>
              <MaterialCommunityIcons
                name="weather-sunset-up"
                size={20}
                color={currentTheme === "morning" ? "#FFFFFF" : "#E8A87C"}
              />
              {!isPremium && (
                <View style={styles.premiumBadge}>
                  <MaterialCommunityIcons
                    name="crown"
                    size={10}
                    color="#FFD700"
                  />
                </View>
              )}
            </View>
            <Text
              style={[
                styles.themeOptionText,
                { color: currentTheme === "morning" ? "#FFFFFF" : "#E8A87C" },
              ]}
            >
              {t("morning_mode", "Matin")}
            </Text>
          </TouchableOpacity>

          {/* 🌆 Thème Maghrib (Premium) - Palette Crépuscule */}
          <TouchableOpacity
            style={[
              styles.themeOption,
              currentTheme === "sunset" && styles.themeOptionActive,
              !isPremium && styles.themeOptionLocked,
            ]}
            onPress={() => handleThemePress("sunset")}
          >
            <View style={{ position: "relative" }}>
              <MaterialCommunityIcons
                name="weather-sunset-down"
                size={20}
                color={currentTheme === "sunset" ? "#FFFFFF" : "#FF7F50"}
              />
              {!isPremium && (
                <View style={styles.premiumBadge}>
                  <MaterialCommunityIcons
                    name="crown"
                    size={10}
                    color="#FFD700"
                  />
                </View>
              )}
            </View>
            <Text
              style={[
                styles.themeOptionText,
                { color: currentTheme === "sunset" ? "#FFFFFF" : "#FF7F50" },
              ]}
            >
              {t("sunset_mode", "Maghrib")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}
