// components/quran/QuranReaderActions.tsx
// Boutons de lecture du Coran : sourate précédente/suivante, mode d'affichage,
// plein écran, reprendre le marque-page.

import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import type { QuranDisplayMode } from "../../utils/quranReaderPrefs";

type QuranReaderActionsProps = {
  displayMode: QuranDisplayMode;
  hasBookmark: boolean;
  onToggleDisplayMode: () => void;
  /** Absent en plein écran (la sortie est gérée par le plein écran lui-même). */
  onOpenFullscreen?: () => void;
  /** Absent : le bouton « reprendre ma lecture » n'est pas affiché. */
  onResumeBookmark?: () => void;
  /** Flèches de changement de sourate : affichées si les deux callbacks sont fournis. */
  onPreviousSurah?: () => void;
  onNextSurah?: () => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
};

const BUTTON_BACKGROUND = "#ba9c34";
const BUTTON_BACKGROUND_ACTIVE = "#7c6720";
const ICON_COLOR = "#ffffff";

export function QuranReaderActions({
  displayMode,
  hasBookmark,
  onToggleDisplayMode,
  onOpenFullscreen,
  onResumeBookmark,
  onPreviousSurah,
  onNextSurah,
  canGoPrevious = true,
  canGoNext = true,
}: QuranReaderActionsProps) {
  const { t } = useTranslation();
  const arabicOnly = displayMode === "arabic";
  const showArrows = !!onPreviousSurah && !!onNextSurah;

  return (
    <View style={[styles.row, showArrows && styles.rowSpread]}>
      {showArrows ? (
        <View style={styles.group}>
          <QuranActionButton
            icon="chevron-left"
            label={t("quran_previous_surah", "Sourate précédente")}
            onPress={onPreviousSurah}
            disabled={!canGoPrevious}
          />
          <QuranActionButton
            icon="chevron-right"
            label={t("quran_next_surah", "Sourate suivante")}
            onPress={onNextSurah}
            disabled={!canGoNext}
          />
        </View>
      ) : null}

      <View style={styles.group}>
        {hasBookmark && onResumeBookmark ? (
          <QuranActionButton
            icon="bookmark"
            label={t("quran_resume_bookmark", "Reprendre ma lecture")}
            onPress={onResumeBookmark}
          />
        ) : null}
        <QuranActionButton
          icon={arabicOnly ? "translate" : "translate-off"}
          label={
            arabicOnly
              ? t("quran_show_translation", "Afficher phonétique et traduction")
              : t("quran_show_arabic_only", "Afficher l'arabe seul")
          }
          onPress={onToggleDisplayMode}
          active={arabicOnly}
        />
        {onOpenFullscreen ? (
          <QuranActionButton
            icon="fullscreen"
            label={t("quran_fullscreen", "Plein écran")}
            onPress={onOpenFullscreen}
          />
        ) : null}
      </View>
    </View>
  );
}

export function QuranActionButton({
  icon,
  label,
  onPress,
  active = false,
  disabled = false,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled }}
      style={({ pressed }) => [
        styles.button,
        active && styles.buttonActive,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <MCIcon name={icon as never} size={22} color={ICON_COLOR} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowSpread: {
    flex: 1,
    justifyContent: "space-between",
  },
  group: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BUTTON_BACKGROUND,
    boxShadow: "0px 1px 3px rgba(0,0,0,0.25)",
  },
  buttonActive: {
    backgroundColor: BUTTON_BACKGROUND_ACTIVE,
  },
  disabled: {
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.7,
  },
});
