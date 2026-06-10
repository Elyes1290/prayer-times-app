// components/DateNavigator.tsx
import React from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { MIcon } from "@/components/icons/AppVectorIcons";
import { useTranslation } from "react-i18next";
import {
  useThemeColors,
  useOverlayTextColor,
  useCurrentTheme,
} from "../hooks/useThemeColor";
import { makeBoxShadow } from "../utils/shadowUtils";

type Props = {
  date: Date;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
};

export function DateNavigator({ date, onPrev, onNext, onReset }: Props) {
  const { t, i18n } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const isCompact = screenWidth < 400;

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

  const arrowColor = isLightTheme ? colors.primary : "#FFF";
  const iconSize = isCompact ? 24 : 28;

  const styles = StyleSheet.create({
    nav: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "stretch",
      width: "100%",
      maxWidth: "100%",
      marginVertical: 12,
      gap: isCompact ? 6 : 8,
    },
    dateControls: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 0,
      gap: isCompact ? 2 : 4,
    },
    arrowBtn: {
      padding: isCompact ? 4 : 6,
      borderRadius: 18,
      backgroundColor: isLightTheme
        ? "rgba(34, 139, 34, 0.15)"
        : "rgba(30,30,30,0.3)",
      borderWidth: isLightTheme ? 1 : 0,
      borderColor: isLightTheme ? colors.border : "transparent",
      flexShrink: 0,
    },
    text: {
      flexShrink: 1,
      fontSize: isCompact ? 15 : 17,
      fontWeight: "600",
      marginHorizontal: isCompact ? 4 : 8,
      color: overlayTextColor,
      textAlign: "center",
      minWidth: 0,
      textShadowColor: isLightTheme
        ? "rgba(255, 255, 255, 0.5)"
        : "rgba(0,0,0,0.8)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    todayBtn: {
      flexShrink: 0,
      backgroundColor: isLightTheme ? colors.primary : "#3faea6",
      borderRadius: 14,
      paddingHorizontal: isCompact ? 10 : 12,
      paddingVertical: isCompact ? 6 : 7,
      maxWidth: isCompact ? 108 : 130,
      boxShadow: makeBoxShadow(
        isLightTheme ? colors.shadow : "#3faea6",
        0,
        2,
        4,
        0.3,
      ),
    },
    todayText: {
      color: "#fff",
      fontWeight: "bold",
      fontSize: isCompact ? 13 : 15,
      letterSpacing: 0.3,
      textAlign: "center",
      textShadowColor: "rgba(0,0,0,0.3)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
  });

  return (
    <View style={styles.nav} testID="date-navigator">
      <View style={styles.dateControls}>
        <Pressable
          onPress={onPrev}
          style={styles.arrowBtn}
          testID="prev-button"
          accessibilityRole="button"
          accessibilityLabel={t("previous_day", "Jour précédent")}
        >
          <MIcon name="chevron-left" size={iconSize} color={arrowColor} />
        </Pressable>
        <Text
          style={styles.text}
          testID="date-text"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {date.toLocaleDateString(getLocale())}
        </Text>
        <Pressable
          onPress={onNext}
          style={styles.arrowBtn}
          testID="next-button"
          accessibilityRole="button"
          accessibilityLabel={t("next_day", "Jour suivant")}
        >
          <MIcon name="chevron-right" size={iconSize} color={arrowColor} />
        </Pressable>
      </View>
      <Pressable
        onPress={onReset}
        style={styles.todayBtn}
        testID="reset-button"
        accessibilityRole="button"
        accessibilityLabel={t("today")}
      >
        <Text
          style={styles.todayText}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {t("today")}
        </Text>
      </Pressable>
    </View>
  );
}
