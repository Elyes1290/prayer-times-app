// components/DateNavigator.tsx
import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  useThemeColors,
  useOverlayTextColor,
  useCurrentTheme,
} from "../hooks/useThemeColor";

type Props = {
  date: Date;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
};

export function DateNavigator({ date, onPrev, onNext, onReset }: Props) {
  const { t, i18n } = useTranslation();

  // Utiliser les couleurs thématiques
  const colors = useThemeColors();
  const overlayTextColor = useOverlayTextColor();
  const currentTheme = useCurrentTheme();
  const isLightTheme = currentTheme === "light" || currentTheme === "morning";

  const getLocale = () => {
    if (i18n.language.startsWith("ar")) return "ar";
    if (i18n.language.startsWith("fr")) return "fr-FR";
    if (i18n.language.startsWith("en")) return "en-US";
    if (i18n.language.startsWith("es")) return "es-ES";
    if (i18n.language.startsWith("de")) return "de-DE";
    if (i18n.language.startsWith("it")) return "it-IT";
    if (i18n.language.startsWith("pt")) return "pt-BR";
    if (i18n.language.startsWith("ru")) return "ru-RU";
    if (i18n.language.startsWith("tr")) return "tr-TR";
    if (i18n.language.startsWith("nl")) return "nl-NL";
    if (i18n.language.startsWith("bn")) return "bn-BD";
    if (i18n.language.startsWith("ur")) return "ur-PK";
    if (i18n.language.startsWith("fa")) return "fa-IR";
    return "en-US";
  };

  // Styles dynamiques basés sur le thème
  const styles = StyleSheet.create({
    nav: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginVertical: 12,
      gap: 6,
    },
    arrowBtn: {
      padding: 6,
      borderRadius: 18,
      backgroundColor:
        isLightTheme
          ? "rgba(34, 139, 34, 0.15)"
          : "rgba(30,30,30,0.3)",
      marginHorizontal: 2,
      borderWidth: isLightTheme ? 1 : 0,
      borderColor: isLightTheme ? colors.border : "transparent",
    },
    text: {
      fontSize: 17,
      fontWeight: "600",
      marginHorizontal: 10,
      color: overlayTextColor,
      minWidth: 120,
      textAlign: "center",
      textShadowColor:
        isLightTheme
          ? "rgba(255, 255, 255, 0.5)"
          : "rgba(0,0,0,0.8)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    todayBtn: {
      backgroundColor: isLightTheme ? colors.primary : "#3faea6",
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 7,
      marginLeft: 8,
      shadowColor: isLightTheme ? colors.shadow : "#3faea6",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    todayText: {
      color: "#fff",
      fontWeight: "bold",
      fontSize: 15,
      letterSpacing: 0.5,
      textShadowColor: "rgba(0,0,0,0.3)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
  });

  const arrowColor = isLightTheme ? colors.primary : "#FFF";

  return (
    <View style={styles.nav} testID="date-navigator">
      <TouchableOpacity
        onPress={onPrev}
        style={styles.arrowBtn}
        testID="prev-button"
      >
        <MaterialIcons name="chevron-left" size={28} color={arrowColor} />
      </TouchableOpacity>
      <Text style={styles.text} testID="date-text">
        {date.toLocaleDateString(getLocale())}
      </Text>
      <TouchableOpacity
        onPress={onNext}
        style={styles.arrowBtn}
        testID="next-button"
      >
        <MaterialIcons name="chevron-right" size={28} color={arrowColor} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onReset}
        style={styles.todayBtn}
        testID="reset-button"
      >
        <Text style={styles.todayText}>{t("today")}</Text>
      </TouchableOpacity>
    </View>
  );
}
