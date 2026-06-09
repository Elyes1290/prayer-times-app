import React from "react";
import { View, Text, Pressable, Image } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import FavoriteButton from "@/components/FavoriteButton";
import { PremiumContent } from "@/utils/premiumContent";
import { QuranVerseFavorite } from "@/contexts/FavoritesContext";

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
};

export const QuranVerseListItem = React.memo(function QuranVerseListItem({
  arabicText,
  verseNumber,
  phoneticText,
  translationText,
  favoriteData,
  showTranslation,
  showSeparator,
  styles,
}: QuranVerseListItemProps) {
  return (
    <View style={styles.ayahContainer}>
      <View style={styles.arabicRow}>
        <Text style={styles.arabic}>{arabicText}</Text>
        <View style={styles.verseActions}>
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
        </View>
      </View>

      {phoneticText ? (
        <Text style={styles.phonetic}>{phoneticText}</Text>
      ) : null}

      {showTranslation && translationText ? (
        <Text style={styles.traduction}>{translationText}</Text>
      ) : null}

      {showSeparator && (
        <Image
          source={require("../../assets/images/ayah_separator.png")}
          style={styles.ayahSeparator}
          resizeMode="contain"
        />
      )}
    </View>
  );
});
