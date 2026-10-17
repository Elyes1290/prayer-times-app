// components/quran/QuranFullscreenModal.tsx
//
// Lecture du Coran en plein écran : un Modal natif recouvre toute la fenêtre (barre
// d'onglets et barre d'état comprises) sans toucher à la navigation de l'application.
// Le bouton retour d'Android ferme le plein écran (onRequestClose).

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  FlatList,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import CachedImageBackground from "../CachedImageBackground";
import { QuranActionButton, QuranReaderActions } from "./QuranReaderActions";
import {
  createScrollToIndexFailedHandler,
  MAINTAIN_VISIBLE_POSITION,
} from "../../utils/quranListScroll";
import { useKeepVersePosition } from "../../hooks/useKeepVersePosition";
import type { QuranDisplayMode } from "../../utils/quranReaderPrefs";

type FullscreenVerse = { id: number; verse_key?: string };

type QuranFullscreenModalProps = {
  visible: boolean;
  /** Reçoit l'index du premier verset visible, pour y replacer la liste normale. */
  onClose: (lastVisibleIndex: number) => void;
  data: FullscreenVerse[];
  renderItem: (info: { item: any }) => React.ReactElement | null;
  selectedSourate: number;
  /** Texte de la basmala à afficher en tête (null : rien). */
  headerText?: string | null;
  /** Verset affiché en premier à l'ouverture. */
  initialIndex: number;
  displayMode: QuranDisplayMode;
  onToggleDisplayMode: () => void;
  headerTextStyle?: any;
};

const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 30 };

export function QuranFullscreenModal({
  visible,
  onClose,
  data,
  renderItem,
  selectedSourate,
  headerText,
  initialIndex,
  displayMode,
  onToggleDisplayMode,
  headerTextStyle,
}: QuranFullscreenModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const firstVisibleIndexRef = useRef(initialIndex);

  const handleScrollFailed = useMemo(
    () => createScrollToIndexFailedHandler(listRef),
    [],
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems.find(
        (token) => token.isViewable && typeof token.index === "number",
      );
      if (first && typeof first.index === "number") {
        firstVisibleIndexRef.current = first.index;
      }
    },
  ).current;

  // Changement d'affichage (traduction masquée / affichée) : on reste sur le même verset.
  useKeepVersePosition(listRef, firstVisibleIndexRef, displayMode);

  // À l'ouverture : on se replace sur le verset qui était lu.
  useEffect(() => {
    if (!visible) return;
    firstVisibleIndexRef.current = initialIndex;
    if (initialIndex <= 0) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
    }, 250);
    return () => clearTimeout(timer);
    // On ne se replace qu'à l'ouverture, pas à chaque mise à jour des données.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleClose = useCallback(() => {
    onClose(firstVisibleIndexRef.current);
  }, [onClose]);

  const keyExtractor = useCallback(
    (item: FullscreenVerse) => `fs-${selectedSourate}-${item.verse_key || item.id}`,
    [selectedSourate],
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <StatusBar hidden />
      <CachedImageBackground
        source={require("../../assets/images/parchment_bg.jpg")}
        style={{ flex: 1 }}
      >
        <View style={[styles.topBar, { top: Math.max(insets.top, 8) }]} pointerEvents="box-none">
          <QuranReaderActions
            displayMode={displayMode}
            hasBookmark={false}
            onToggleDisplayMode={onToggleDisplayMode}
          />
          <QuranActionButton
            icon="fullscreen-exit"
            label={t("quran_exit_fullscreen", "Quitter le plein écran")}
            onPress={handleClose}
          />
        </View>

        <FlatList
          ref={listRef}
          data={data}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={
            headerText ? <Text style={headerTextStyle}>{headerText}</Text> : null
          }
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={10}
          removeClippedSubviews={false}
          maintainVisibleContentPosition={MAINTAIN_VISIBLE_POSITION}
          onScrollToIndexFailed={handleScrollFailed}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={VIEWABILITY_CONFIG}
          contentContainerStyle={{
            paddingTop: Math.max(insets.top, 8) + 56,
            paddingBottom: Math.max(insets.bottom, 12) + 40,
            paddingHorizontal: 8,
          }}
        />
      </CachedImageBackground>
    </Modal>
  );
}

const styles = StyleSheet.create({
  topBar: {
    position: "absolute",
    right: 12,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
