import React from "react";
import { FlatList, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { quranScreenStyles as styles } from "../../styles/QuranScreen.styles";

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
};

export function QuranOnlineVersesList({
  selectedSourate,
  filteredVerses,
  versesFlatListRef,
  renderVerseItem,
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
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={100}
      />
    </>
  );
}
