import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type TextLayoutEventData,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useTranslation } from "react-i18next";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import FavoriteButton from "@/components/FavoriteButton";
import { PremiumContent } from "@/utils/premiumContent";
import { QuranVerseFavorite } from "@/contexts/FavoritesContext";
import {
  computeRequiredTextHeight,
  type MeasuredLine,
} from "@/utils/quranTextLayout";

export type QuranGifConfig = {
  id: string;
  name: string;
  fixImage: number;
  premium: boolean;
};

type QuranListStyles = Record<string, any>;

type QuranGifListItemProps = {
  gif: QuranGifConfig;
  isLocked: boolean;
  isSelected: boolean;
  onSelect: (gifId: string) => void;
  styles: QuranListStyles;
};

export const QuranGifListItem = React.memo(function QuranGifListItem({
  gif,
  isLocked,
  isSelected,
  onSelect,
  styles,
}: QuranGifListItemProps) {
  return (
    <Pressable
      style={[
        styles.gifOption,
        isSelected && styles.selectedGifOption,
        isLocked && styles.lockedGifOption,
      ]}
      onPress={() => !isLocked && onSelect(gif.id)}
      disabled={isLocked}
    >
      <ExpoImage
        source={gif.fixImage}
        style={styles.gifPreview}
        contentFit="cover"
      />
      <View style={styles.gifInfo}>
        <Text style={[styles.gifName, isSelected && styles.selectedGifName]}>
          {gif.name}
        </Text>
        {gif.premium && (
          <View style={styles.premiumBadge}>
            <MCIcon name="crown" size={14} color="#FFD700" />
            <Text style={styles.premiumText}>Premium</Text>
          </View>
        )}
      </View>
      {isSelected && (
        <MCIcon name="check-circle" size={24} color="#4CAF50" />
      )}
    </Pressable>
  );
});

type QuranModalOptionItemProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  styles: QuranListStyles;
};

export const QuranModalOptionItem = React.memo(function QuranModalOptionItem({
  label,
  selected,
  onPress,
  styles,
}: QuranModalOptionItemProps) {
  return (
    <Pressable
      style={[styles.optionStyle, selected && styles.selectedOptionStyle]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.optionTextStyle,
          selected && styles.selectedOptionTextStyle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
});

type QuranIosSourateMenuItemProps = {
  sourateId: number;
  nameSimple: string;
  nameArabic: string;
  selected: boolean;
  onSelect: (id: number) => void;
  styles: QuranListStyles;
};

export const QuranIosSourateMenuItem = React.memo(function QuranIosSourateMenuItem({
  sourateId,
  nameSimple,
  nameArabic,
  selected,
  onSelect,
  styles,
}: QuranIosSourateMenuItemProps) {
  return (
    <Pressable
      style={[styles.menuOption, selected && styles.selectedOptionStyle]}
      onPress={() => onSelect(sourateId)}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.menuOptionText}>
          {sourateId}. {nameSimple}
        </Text>
        <Text style={styles.menuOptionSubtitle}>{nameArabic}</Text>
      </View>
      {selected && <Text style={styles.checkMark}>✓</Text>}
    </Pressable>
  );
});

type QuranOfflineRecitationRowProps = {
  recitation: PremiumContent;
  isHighlighted: boolean;
  isPlaying: boolean;
  onPress: (recitation: PremiumContent) => void;
  onDelete?: (recitation: PremiumContent) => void;
  styles: QuranListStyles;
};

const QuranOfflineRecitationRow = React.memo(function QuranOfflineRecitationRow({
  recitation,
  isHighlighted,
  isPlaying,
  onPress,
  onDelete,
  styles,
}: QuranOfflineRecitationRowProps) {
  const content = (
    <>
      <Pressable
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
        }}
        onPress={() => onPress(recitation)}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.offlineRecitationTitle}>
            {recitation.surahName || recitation.title}
          </Text>
          <Text style={styles.offlineRecitationSubtitle}>
            {recitation.reciter} • {recitation.fileSize} MB
          </Text>
        </View>
        {isPlaying ? (
          <MCIcon name="pause-circle" size={32} color="#FFD700" />
        ) : (
          <MCIcon name="play-circle" size={32} color="#4ECDC4" />
        )}
      </Pressable>
      {onDelete && (
        <Pressable
          style={{ padding: 8, marginLeft: 8 }}
          onPress={() => onDelete(recitation)}
        >
          <MCIcon name="delete-outline" size={24} color="#ff6b6b" />
        </Pressable>
      )}
    </>
  );

  if (onDelete) {
    return (
      <View
        style={[
          styles.offlineRecitationItem,
          isHighlighted && {
            backgroundColor: "#fff5e6",
            borderColor: "#FFD700",
            borderWidth: 2,
          },
        ]}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      style={[
        styles.offlineRecitationItem,
        isHighlighted && {
          backgroundColor: "#fff5e6",
          borderColor: "#FFD700",
          borderWidth: 2,
        },
      ]}
      onPress={() => onPress(recitation)}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.offlineRecitationTitle}>
          {recitation.surahName || recitation.title}
        </Text>
        <Text style={styles.offlineRecitationSubtitle}>
          {recitation.reciter} • {recitation.fileSize} MB
        </Text>
      </View>
      {isPlaying ? (
        <MCIcon name="pause-circle" size={32} color="#FFD700" />
      ) : (
        <MCIcon name="play-circle" size={32} color="#4ECDC4" />
      )}
    </Pressable>
  );
});

type QuranOfflineReciterGroupProps = {
  reciterName: string;
  recitations: PremiumContent[];
  surahLabel: string;
  highlightId: string | null;
  playingId: string | null;
  isPlaying: boolean;
  onRecitationPress: (recitation: PremiumContent) => void;
  onDelete?: (recitation: PremiumContent) => void;
  styles: QuranListStyles;
};

export const QuranOfflineReciterGroup = React.memo(function QuranOfflineReciterGroup({
  reciterName,
  recitations,
  surahLabel,
  highlightId,
  playingId,
  isPlaying,
  onRecitationPress,
  onDelete,
  styles,
}: QuranOfflineReciterGroupProps) {
  const sorted = [...recitations].sort(
    (a, b) => (a.surahNumber || 0) - (b.surahNumber || 0)
  );

  return (
    <View style={{ marginBottom: 24 }}>
      <View style={styles.offlineReciterHeader}>
        <Text style={styles.offlineReciterName}>{reciterName}</Text>
        <Text style={styles.offlineReciterCount}>
          {recitations.length} {surahLabel}
          {recitations.length > 1 ? "s" : ""}
        </Text>
      </View>
      {sorted.map((recitation) => (
        <QuranOfflineRecitationRow
          key={recitation.id}
          recitation={recitation}
          isHighlighted={highlightId === recitation.id}
          isPlaying={playingId === recitation.id && isPlaying}
          onPress={onRecitationPress}
          onDelete={onDelete}
          styles={styles}
        />
      ))}
    </View>
  );
});

type QuranVerseListItemProps = {
  arabicText: string;
  verseNumber: string;
  phoneticText: string;
  translationText: string;
  favoriteData: Omit<QuranVerseFavorite, "id" | "dateAdded">;
  showTranslation: boolean;
  showSeparator: boolean;
  styles: QuranListStyles;
  /** Clé "sourate:verset" ; nécessaire pour le marque-page. */
  verseKey?: string;
  isBookmarked?: boolean;
  /** Callback stable (le composant est mémoïsé) : reçoit la clé du verset. */
  onToggleBookmark?: (verseKey: string) => void;
};

/**
 * Texte arabe d'un verset, protégé contre la coupure de la dernière ligne (Android).
 *
 * Symptôme : sur certains versets longs, le dernier mot disparaît (ex. 67:28 « أَلِيمٍ »).
 * Les données sont complètes ; React Native calcule parfois une hauteur de texte pour N
 * lignes, puis affiche le texte sur N+1 lignes (largeur réelle légèrement plus étroite
 * que la largeur mesurée, polices Arabe à diacritiques) : la ligne en trop est rognée.
 *
 * Correctif : on compare la hauteur nécessaire (lignes rapportées par `onTextLayout`) à
 * la hauteur affichée (`onLayout`) et on agrandit si besoin. Quand la dernière ligne est
 * presque pleine (cas où l'écart d'un pixel fait basculer un mot sur une ligne de plus),
 * on réserve d'avance une ligne supplémentaire (voir utils/quranTextLayout.ts).
 * `textBreakStrategy="simple"` évite en plus l'algorithme de césure équilibrée.
 */
const QuranArabicText = React.memo(function QuranArabicText({
  text,
  style,
}: {
  text: string;
  style: any;
}) {
  const [minHeight, setMinHeight] = useState<number | undefined>(undefined);
  const renderedHeight = useRef(0);
  const renderedWidth = useRef(0);
  const measuredLines = useRef<MeasuredLine[]>([]);
  const lineHeight = StyleSheet.flatten(style)?.lineHeight ?? 0;

  const reconcile = useCallback(() => {
    if (renderedHeight.current <= 0) return;
    const needed = computeRequiredTextHeight(
      measuredLines.current,
      renderedWidth.current,
      lineHeight,
    );
    if (needed > renderedHeight.current + 1) {
      setMinHeight((previous) => (previous === undefined || needed > previous ? needed : previous));
    }
  }, [lineHeight]);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      renderedHeight.current = event.nativeEvent.layout.height;
      renderedWidth.current = event.nativeEvent.layout.width;
      reconcile();
    },
    [reconcile],
  );

  const handleTextLayout = useCallback(
    (event: NativeSyntheticEvent<TextLayoutEventData>) => {
      measuredLines.current = event.nativeEvent.lines;
      reconcile();
    },
    [reconcile],
  );

  return (
    <Text
      style={minHeight ? [style, { minHeight }] : style}
      textBreakStrategy="simple"
      android_hyphenationFrequency="none"
      onLayout={handleLayout}
      onTextLayout={handleTextLayout}
    >
      {text}
    </Text>
  );
});

/** Cercle du numéro (30) + sa marge gauche (8). */
const VERSE_ACTIONS_WIDTH = 38;

export const QuranVerseListItem = React.memo(function QuranVerseListItem({
  arabicText,
  verseNumber,
  phoneticText,
  translationText,
  favoriteData,
  showTranslation,
  showSeparator,
  styles,
  verseKey,
  isBookmarked = false,
  onToggleBookmark,
}: QuranVerseListItemProps) {
  const { t } = useTranslation();
  const handleToggleBookmark = useCallback(() => {
    if (verseKey && onToggleBookmark) onToggleBookmark(verseKey);
  }, [verseKey, onToggleBookmark]);

  return (
    <View style={styles.ayahContainer}>
      <View style={styles.arabicRow}>
        <QuranArabicText text={arabicText} style={styles.arabic} />
        {/* Largeur fixe : la zone du texte arabe ne dépend plus du contenu des icônes. */}
        <View style={[styles.verseActions, { width: VERSE_ACTIONS_WIDTH }]}>
          <View style={styles.verseCircle}>
            <Text style={styles.verseNumber}>{verseNumber}</Text>
          </View>
          <FavoriteButton
            favoriteData={favoriteData}
            size={20}
            iconColor="#ba9c34"
            iconColorActive="#FFD700"
            style={styles.favoriteButtonCompact}
          />
          {verseKey && onToggleBookmark ? (
            <Pressable
              onPress={handleToggleBookmark}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t("quran_bookmark", "Marque-page")}
              accessibilityState={{ selected: isBookmarked }}
              style={{ marginTop: 6, alignItems: "center" }}
            >
              <MCIcon
                name={isBookmarked ? "bookmark" : "bookmark-outline"}
                size={22}
                color={isBookmarked ? "#FFD700" : "#ba9c34"}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      {phoneticText ? (
        <Text style={styles.phonetic}>{phoneticText}</Text>
      ) : null}

      {showTranslation && translationText ? (
        <Text style={styles.traduction}>{translationText}</Text>
      ) : null}

      {showSeparator && (
        <ExpoImage
          source={require("../../assets/images/ayah_separator.png")}
          style={styles.ayahSeparator}
          contentFit="contain"
        />
      )}
    </View>
  );
});
