import React from "react";
import { FlatList, type FlatListProps, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { quranScreenStyles as styles } from "../../styles/QuranScreen.styles";
import { MAINTAIN_VISIBLE_POSITION } from "../../utils/quranListScroll";

type VerseItem = {
  id: number;
  verse_key?: string;
  text_uthmani?: string;
};

type QuranOnlineVersesListProps = {
  selectedSourate: number;
  filteredVerses: VerseItem[];
  versesFlatListRef: React.RefObject<FlatList | null>;
  renderVerseItem: (info: { item: VerseItem }) => React.ReactElement | null;
  /** Défilement et suivi de position (marque-page, plein écran). */
  scrollProps?: Pick<
    FlatListProps<VerseItem>,
    "onScrollToIndexFailed" | "onViewableItemsChanged" | "viewabilityConfig"
  >;
};

export function QuranOnlineVersesList({
  selectedSourate,
  filteredVerses,
  versesFlatListRef,
  renderVerseItem,
  scrollProps,
}: QuranOnlineVersesListProps) {
  const { t } = useTranslation();

  return (
    <>
      {selectedSourate !== 9 && (
        <Text style={styles.bismillah}>{t("bismillah")}</Text>
      )}

      <FlatList
        ref={versesFlatListRef}
        key={`quran-verses-${selectedSourate}`}
        data={filteredVerses}
        keyExtractor={(item) =>
          `${selectedSourate}-${item.verse_key || item.id}`
        }
        renderItem={renderVerseItem}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={10}
        removeClippedSubviews={false}
        maintainVisibleContentPosition={MAINTAIN_VISIBLE_POSITION}
        updateCellsBatchingPeriod={100}
        {...scrollProps}
      />
    </>
  );
}
