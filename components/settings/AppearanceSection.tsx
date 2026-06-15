import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import ThemedPicker from "../ThemedPicker";
import { TFunction } from "i18next";
import { BackgroundImageType } from "../../contexts/SettingsContext";

interface AppearanceSectionProps {
  selectedLang: string;
  languages: { code: string; label: string }[];
  onChangeLanguage: (langCode: string) => void;
  currentTheme: "light" | "dark" | "morning" | "sunset" | "auto";
  setThemeMode: (
    theme: "auto" | "light" | "dark" | "morning" | "sunset"
  ) => void;
  backgroundImageType?: BackgroundImageType; // 🖼️ NOUVEAU : Type d'image de fond
  setBackgroundImageType?: (type: BackgroundImageType) => void; // 🖼️ NOUVEAU : Setter pour le type d'image
  styles: any;
  t: TFunction;
  isPremium?: boolean; // 🆕 Pour vérifier le statut premium
  onShowPremiumModal?: () => void; // 🚀 NOUVEAU : Callback pour afficher la modal premium
}

export default function AppearanceSection({
  selectedLang,
  languages,
  onChangeLanguage,
  currentTheme,
  setThemeMode,
  backgroundImageType = "prophet",
  setBackgroundImageType,
  styles,
  t,
  isPremium = false,
  onShowPremiumModal,
}: AppearanceSectionProps) {
  const [languagePickerVisible, setLanguagePickerVisible] = useState(false);
  const [themePickerVisible, setThemePickerVisible] = useState(false);
  const [backgroundPickerVisible, setBackgroundPickerVisible] = useState(false); // 🖼️ NOUVEAU : État pour le picker d'images

  // 🔒 NOUVEAU : Fonction pour vérifier et appliquer le thème avec protection premium
  // Retourne true si le thème a été appliqué, false sinon
  const handleThemeChange = (value: string): boolean => {
    const premiumThemes = ["morning", "sunset"];
    
    // Vérifier si c'est un thème premium et si l'utilisateur n'est pas premium
    if (premiumThemes.includes(value) && !isPremium) {
      // Fermer le picker avant d'afficher la modal premium
      setThemePickerVisible(false);
      
      // Afficher la modal premium si fournie
      if (onShowPremiumModal) {
        onShowPremiumModal();
        return false;
      }
      
      // Sinon afficher une alerte simple
      Alert.alert(
        t("premium_required", "Premium requis") || "Premium requis",
        t("premium_themes_message", "Les thèmes Matin et Crépuscule sont réservés aux membres Premium.") || 
        "Les thèmes Matin et Crépuscule sont réservés aux membres Premium.",
        [
          {
            text: t("cancel", "Annuler") || "Annuler",
            style: "cancel"
          },
          {
            text: t("go_premium", "Passer Premium") || "Passer Premium",
          }
        ]
      );
      return false;
    }

    // Appliquer le thème si validé
    const validThemes = ["light", "dark", "morning", "sunset", "auto"];
    if (validThemes.includes(value)) {
      setThemeMode(value as "auto" | "light" | "dark" | "morning" | "sunset");
      return true;
    }
    
    return false;
  };

  // Trouver le label de la langue sélectionnée
  const selectedLanguageLabel =
    languages.find((lang) => lang.code === selectedLang)?.label || selectedLang;

  // 🆕 Labels pour les thèmes (5 options)
  const themeLabels: Record<string, string> = {
    light: t("light_mode", "Clair"),
    dark: t("dark_mode", "Sombre"),
    morning: t("morning_mode", "Matin"),
    sunset: t("sunset_mode", "Maghrib"),
    auto: t("theme_auto", "Automatique"),
  };

  // 🖼️ NOUVEAU : Labels pour les types d'images de fond (premium)
  const backgroundImageLabels: Record<BackgroundImageType, string> = {
    prophet: t("background_prophet", "Mosquée du Prophète") || "Mosquée du Prophète",
    makka: t("background_makka", "Makka") || "Makka",
    alquds: t("background_alquds", "Al-Quds") || "Al-Quds",
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
            <Pressable
              style={buttonStyles.container}
              onPress={() => setLanguagePickerVisible(true)}
            >
              <Text style={buttonStyles.text}>{selectedLanguageLabel}</Text>
              <MCIcon
                name="chevron-down"
                size={20}
                color="#4ECDC4"
                style={buttonStyles.icon}
              />
            </Pressable>

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
            <Pressable
              style={buttonStyles.container}
              onPress={() => setThemePickerVisible(true)}
            >
              <Text style={buttonStyles.text}>{themeLabels[currentTheme]}</Text>
              <MCIcon
                name="chevron-down"
                size={20}
                color="#4ECDC4"
                style={buttonStyles.icon}
              />
            </Pressable>

            <ThemedPicker
              visible={themePickerVisible}
              title={t("theme", "Thème")}
              items={[
                { label: t("theme_auto", "Automatique"), value: "auto" },
                { label: t("light_mode", "Clair"), value: "light" },
                { label: t("dark_mode", "Sombre"), value: "dark" },
                // 🆕 Thèmes premium avec indicateur
                {
                  label: isPremium
                    ? t("morning_mode", "Matin")
                    : `${t("morning_mode", "Matin")} 👑`,
                  value: "morning",
                },
                {
                  label: isPremium
                    ? t("sunset_mode", "Maghrib")
                    : `${t("sunset_mode", "Maghrib")} 👑`,
                  value: "sunset",
                },
              ]}
              selectedValue={currentTheme}
              onValueChange={handleThemeChange}
              onClose={() => setThemePickerVisible(false)}
            />
          </View>
        </View>

        {/* 🖼️ NOUVEAU : Type d'image de fond (PREMIUM uniquement) */}
        {isPremium && setBackgroundImageType && (
          <View>
            <Text style={styles.label}>
              {t("background_image_type", "Type d'image de fond")} 👑
            </Text>
            <View
              style={[styles.row, { justifyContent: "center", marginTop: 8 }]}
            >
              <Pressable
                style={buttonStyles.container}
                onPress={() => setBackgroundPickerVisible(true)}
              >
                <Text style={buttonStyles.text}>
                  {backgroundImageLabels[backgroundImageType]}
                </Text>
                <MCIcon
                  name="chevron-down"
                  size={20}
                  color="#4ECDC4"
                  style={buttonStyles.icon}
                />
              </Pressable>

              <ThemedPicker
                visible={backgroundPickerVisible}
                title={t("background_image_type", "Type d'image de fond")}
                items={[
                  {
                    label: t("background_prophet", "🕌 Mosquée du Prophète"),
                    value: "prophet",
                  },
                  {
                    label: t("background_makka", "🕋 Makka"),
                    value: "makka",
                  },
                  {
                    label: t("background_alquds", "🏛️ Al-Quds"),
                    value: "alquds",
                  },
                ]}
                selectedValue={backgroundImageType}
                onValueChange={(value) => {
                  if (
                    !isPremium &&
                    (value === "makka" || value === "alquds")
                  ) {
                    setBackgroundPickerVisible(false);
                    onShowPremiumModal?.();
                    return;
                  }
                  setBackgroundImageType(value as BackgroundImageType);
                }}
                onClose={() => setBackgroundPickerVisible(false)}
              />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
