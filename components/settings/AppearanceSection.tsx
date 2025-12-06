import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ThemedPicker from "../ThemedPicker";
import { TFunction } from "i18next";

interface AppearanceSectionProps {
  selectedLang: string;
  languages: { code: string; label: string }[];
  onChangeLanguage: (langCode: string) => void;
  currentTheme: "light" | "dark" | "auto";
  setThemeMode: (theme: "light" | "dark" | "auto") => void;
  styles: any;
  t: TFunction;
}

export default function AppearanceSection({
  selectedLang,
  languages,
  onChangeLanguage,
  currentTheme,
  setThemeMode,
  styles,
  t,
}: AppearanceSectionProps) {
  const [languagePickerVisible, setLanguagePickerVisible] = useState(false);
  const [themePickerVisible, setThemePickerVisible] = useState(false);

  // Trouver le label de la langue sélectionnée
  const selectedLanguageLabel =
    languages.find((lang) => lang.code === selectedLang)?.label || selectedLang;

  // Labels pour les thèmes
  const themeLabels = {
    light: t("theme.light", "Clair"),
    dark: t("theme.dark", "Sombre"),
    auto: t("theme.auto", "Automatique"),
  };

  // Styles identiques à AdhanSoundSection
  const buttonStyles = StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(78, 205, 196, 0.1)",
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "rgba(78, 205, 196, 0.3)",
      minWidth: 200,
      justifyContent: "space-between",
    },
    text: {
      fontSize: 16,
      fontWeight: "600",
      color: "#4ECDC4",
      flex: 1,
    },
    icon: {
      marginLeft: 8,
    },
  });

  return (
    <View style={{ padding: 16 }}>
      <Text style={styles.sectionTitle}>{t("appearance", "Apparence")}</Text>
      <View style={{ marginTop: 16, gap: 20 }}>
        {/* Langue */}
        <View>
          <Text style={styles.label}>{t("language", "Langue")}</Text>
          <View
            style={[styles.row, { justifyContent: "center", marginTop: 8 }]}
          >
            <TouchableOpacity
              style={buttonStyles.container}
              onPress={() => setLanguagePickerVisible(true)}
            >
              <Text style={buttonStyles.text}>{selectedLanguageLabel}</Text>
              <MaterialCommunityIcons
                name="chevron-down"
                size={20}
                color="#4ECDC4"
                style={buttonStyles.icon}
              />
            </TouchableOpacity>

            <ThemedPicker
              visible={languagePickerVisible}
              title={t("language", "Langue")}
              items={languages.map((lang) => ({
                label: lang.label,
                value: lang.code,
              }))}
              selectedValue={selectedLang}
              onValueChange={(value) => {
                onChangeLanguage(value);
              }}
              onClose={() => setLanguagePickerVisible(false)}
            />
          </View>
        </View>

        {/* Thème */}
        <View>
          <Text style={styles.label}>{t("theme", "Thème")}</Text>
          <View
            style={[styles.row, { justifyContent: "center", marginTop: 8 }]}
          >
            <TouchableOpacity
              style={buttonStyles.container}
              onPress={() => setThemePickerVisible(true)}
            >
              <Text style={buttonStyles.text}>{themeLabels[currentTheme]}</Text>
              <MaterialCommunityIcons
                name="chevron-down"
                size={20}
                color="#4ECDC4"
                style={buttonStyles.icon}
              />
            </TouchableOpacity>

            <ThemedPicker
              visible={themePickerVisible}
              title={t("theme", "Thème")}
              items={[
                { label: t("theme.light", "Clair"), value: "light" },
                { label: t("theme.dark", "Sombre"), value: "dark" },
                { label: t("theme.auto", "Automatique"), value: "auto" },
              ]}
              selectedValue={currentTheme}
              onValueChange={(value) => {
                if (value === "light" || value === "dark" || value === "auto") {
                  setThemeMode(value);
                }
              }}
              onClose={() => setThemePickerVisible(false)}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
