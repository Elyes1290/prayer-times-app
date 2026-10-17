import * as Font from "expo-font";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  View,
  useWindowDimensions,
  type ViewToken,
} from "react-native";
import CachedImageBackground from "../components/CachedImageBackground";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  QuranModalOptionItem,
  QuranOfflineReciterGroup,
  QuranVerseListItem,
} from "../components/quran/QuranListItems";
import { QuranDownloadsView } from "../components/quran/QuranDownloadsView";
import { QuranOfflinePremiumView } from "../components/quran/QuranOfflinePremiumView";
import { QuranSouratePickerModal } from "../components/quran/QuranSouratePickerModal";
import { QuranAudioControlsModal } from "../components/quran/QuranAudioControlsModal";
import { QuranNavigationMenuModal } from "../components/quran/QuranNavigationMenuModal";
import { QuranReciterPickerModal } from "../components/quran/QuranReciterPickerModal";
import { QuranNavigationTooltipModal } from "../components/quran/QuranNavigationTooltipModal";
import { QuranOnlineHeader } from "../components/quran/QuranOnlineHeader";
import { QuranFloatingPlayButton } from "../components/quran/QuranFloatingPlayButton";
import { QuranOnlineVersesList } from "../components/quran/QuranOnlineVersesList";
import { AudioGifType } from "../constants/quranGifs";
import { quranScreenStyles as styles } from "../styles/QuranScreen.styles";
import { convertToFavorite, stripHtml } from "../utils/quranTextUtils";
import { usePremium } from "../contexts/PremiumContext";
import { useToast } from "../contexts/ToastContext";
import { PremiumContent } from "../utils/premiumContent";
import { useQuranSurahData } from "../hooks/useQuranSurahData";
import { useQuranReader } from "../hooks/useQuranReader";
import { useKeepVersePosition } from "../hooks/useKeepVersePosition";
import { QuranReaderActions } from "../components/quran/QuranReaderActions";
import { QuranFullscreenModal } from "../components/quran/QuranFullscreenModal";
import {
  createScrollToIndexFailedHandler,
  findVerseIndex,
} from "../utils/quranListScroll";
import { useUpdateUserStats } from "../hooks/useUpdateUserStats";
import { useNetworkStatus, useOfflineAccess } from "../hooks/useNetworkStatus";
import { OfflineMessage } from "../components/OfflineMessage";
import { OfflineTabType } from "../components/OfflineNavigationTabs";
import { useQuranDownloads } from "../hooks/useQuranDownloads";
import {
  QuranPlaybackBridge,
  useQuranPlayback,
} from "../hooks/useQuranPlayback";

export default function QuranScreen() {
  const { t } = useTranslation();
  const { user } = usePremium();
  const { showToast } = useToast();
  const isPremium = !!user?.isPremium;
  const { recordQuranRead } = useUpdateUserStats();
  const lastRecordedSurahRef = useRef<number | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [reciterModalVisible, setReciterModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showDownloadsView, setShowDownloadsView] = useState(false);
  const [activeOfflineTab, setActiveOfflineTab] =
    useState<OfflineTabType>("quran");
  const surahAutoPlayOnChangeRef = useRef(false);
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const networkStatus = useNetworkStatus();
  const offlineAccess = useOfflineAccess(isPremium);

  const {
    lang,
    searchQuery,
    setSearchQuery,
    sourates,
    selectedSourate,
    selectSourate,
    arabicVerses,
    phoneticArr,
    translationArr,
    loading,
    loadOfflineQuranData,
    filteredVerses,
    selectedSourateLabel,
    selectedChapterName,
    modalSourateData,
    versesFlatListRef,
  } = useQuranSurahData({
    isPremium,
    isConnected: networkStatus.isConnected,
  });

  const playbackBridgeRef = useRef<QuranPlaybackBridge>({
    currentlyPlaying: null,
    currentRecitation: null,
    stopRecitation: async () => {},
    setCurrentRecitation: (_value) => undefined,
  });
  const selectGifBridgeRef = useRef<(gifId: AudioGifType) => void>(() => {});
  const pendingGifRef = useRef<AudioGifType | null>(null);
  const isPlaybackReadyRef = useRef(false);

  const handleSelectGifFromDownloads = useCallback((gifId: AudioGifType) => {
    if (isPlaybackReadyRef.current) {
      selectGifBridgeRef.current(gifId);
    } else {
      pendingGifRef.current = gifId;
    }
  }, []);

  const {
    availableRecitations,
    selectedReciter,
    setSelectedReciter,
    availableReciters,
    scannedQuranFiles,
    downloadState,
    handleDeleteRecitation,
    handleNativeDownloadRecitation,
    handleNativeCancelDownload,
    downloadsPlaying,
    downloadsIsPlaying,
    handleDownloadedRecitationPress,
    cleanupDownloadsPlayback,
  } = useQuranDownloads({
    sourates,
    showDownloadsView,
    isOfflineMode: offlineAccess.isOfflineMode,
    isPremium,
    showToast,
    t,
    onSelectGif: handleSelectGifFromDownloads,
    playbackBridgeRef,
  });

  const {
    currentlyPlaying,
    playbackPosition,
    playbackDuration,
    currentRecitation,
    setCurrentRecitation,
    isLoading,
    isRecitationPlaying,
    audioControlsModalVisible,
    setAudioControlsModalVisible,
    selectedGif,
    gifModalVisible,
    setGifModalVisible,
    selectGif,
    showNavigationTooltip,
    setShowNavigationTooltip,
    slideAnimatedStyle,
    resetSlideAnimation,
    runWidgetDiagnostic,
    playRecitation,
    pauseRecitation,
    resumeRecitation,
    stopRecitation,
    seekToPosition,
    selectSourateFromPicker,
    handleSwipeNavigate,
    playNextInPlaylist,
    playPreviousInPlaylist,
  } = useQuranPlayback({
    sourates,
    selectedSourate,
    selectSourate,
    selectedReciter,
    setSelectedReciter,
    scannedQuranFiles,
    surahAutoPlayOnChangeRef,
    offlineAccess,
    networkStatus,
    showToast,
    t,
    windowWidth,
    isPremium,
  });

  // Lien profond (ex. plan de khatm « Mon Ramadan ») : /quran?surah=2&ts=...
  // `ts` change à chaque navigation, ce qui permet de rouvrir la même sourate.
  const { surah: surahParam, ts: surahParamTs } = useLocalSearchParams<{
    surah?: string;
    ts?: string;
  }>();
  useEffect(() => {
    if (!surahParam) return;
    const surahNumber = Number.parseInt(surahParam, 10);
    if (Number.isInteger(surahNumber) && surahNumber >= 1 && surahNumber <= 114) {
      selectSourate(surahNumber);
    }
  }, [surahParam, surahParamTs, selectSourate]);

  useEffect(() => {
    isPlaybackReadyRef.current = true;
    selectGifBridgeRef.current = (gifId: AudioGifType) => {
      void selectGif(gifId);
    };
    if (pendingGifRef.current) {
      void selectGif(pendingGifRef.current);
      pendingGifRef.current = null;
    }
  }, [selectGif]);

  useEffect(() => {
    playbackBridgeRef.current = {
      currentlyPlaying,
      currentRecitation,
      stopRecitation,
      setCurrentRecitation,
    };
  }, [currentlyPlaying, currentRecitation, stopRecitation, setCurrentRecitation]);

  useEffect(() => {
    if (selectedSourate <= 0) return;
    if (lastRecordedSurahRef.current === selectedSourate) return;
    lastRecordedSurahRef.current = selectedSourate;
    void recordQuranRead(1, selectedSourate);
  }, [selectedSourate, recordQuranRead]);

  const [fontsLoaded] = Font.useFonts({
    ScheherazadeNew: require("../assets/fonts/ScheherazadeNew-Regular.ttf"),
  });

  const surahCountLabel = t("surah", "Sourate");

  // --- Lecture : mode d'affichage, marque-page, plein écran ---------------------------
  const {
    displayMode,
    toggleDisplayMode,
    bookmark,
    toggleBookmark,
    fullscreen,
    openFullscreen,
    closeFullscreen,
  } = useQuranReader();
  const isOfflineView = isPremium && offlineAccess.isOfflineMode;
  const [fullscreenStartIndex, setFullscreenStartIndex] = useState(0);
  const firstVisibleIndexRef = useRef(0);
  const pendingScrollVerseKeyRef = useRef<string | null>(null);
  const [scrollRequestTick, setScrollRequestTick] = useState(0);

  // Après un changement d'affichage (traduction masquée / affichée), on reste sur le même verset.
  useKeepVersePosition(versesFlatListRef, firstVisibleIndexRef, displayMode);

  const mainListScrollProps = useMemo(
    () => ({
      onScrollToIndexFailed: createScrollToIndexFailedHandler(versesFlatListRef),
      onViewableItemsChanged: ({
        viewableItems,
      }: {
        viewableItems: ViewToken[];
      }) => {
        const first = viewableItems.find(
          (token) => token.isViewable && typeof token.index === "number",
        );
        if (first && typeof first.index === "number") {
          firstVisibleIndexRef.current = first.index;
        }
      },
      viewabilityConfig: { itemVisiblePercentThreshold: 30 },
    }),
    [versesFlatListRef],
  );

  const fullscreenVerseStyles = useMemo(
    () => ({
      ...styles,
      arabic: { ...styles.arabic, fontSize: 38, lineHeight: 76 },
      phonetic: { ...styles.phonetic, fontSize: 18 },
      traduction: { ...styles.traduction, fontSize: 18 },
    }),
    [],
  );

  const handleToggleBookmark = useCallback(
    (verseKey: string) => {
      const next = toggleBookmark(verseKey, selectedSourateLabel);
      const verseNumber = verseKey.split(":")[1];
      showToast({
        type: "success",
        title: next
          ? t("quran_bookmark_saved", "Marque-page enregistré")
          : t("quran_bookmark_removed", "Marque-page retiré"),
        message: `${selectedSourateLabel} • ${verseNumber}`,
      });
    },
    [toggleBookmark, selectedSourateLabel, showToast, t],
  );

  const handleResumeBookmark = useCallback(() => {
    if (!bookmark) return;
    pendingScrollVerseKeyRef.current = bookmark.verseKey;
    if (bookmark.surah === selectedSourate) {
      setSearchQuery("");
      setScrollRequestTick((tick) => tick + 1);
    } else {
      void selectSourateFromPicker(bookmark.surah);
    }
  }, [bookmark, selectedSourate, setSearchQuery, selectSourateFromPicker]);

  // Défile vers le verset demandé dès que sa sourate est affichée et chargée.
  useEffect(() => {
    const verseKey = pendingScrollVerseKeyRef.current;
    if (!verseKey || loading || !fontsLoaded) return;
    if (!verseKey.startsWith(`${selectedSourate}:`)) return;
    const index = findVerseIndex(filteredVerses, verseKey);
    if (index < 0) return;
    pendingScrollVerseKeyRef.current = null;
    // Pas de nettoyage du timer : la demande est déjà consommée, la liste peut se
    // re-rendre (nouvelle référence de `filteredVerses`) avant l'échéance.
    setTimeout(() => {
      versesFlatListRef.current?.scrollToIndex({ index, animated: false });
    }, 300);
  }, [
    scrollRequestTick,
    loading,
    fontsLoaded,
    selectedSourate,
    filteredVerses,
    versesFlatListRef,
  ]);

  const handleOpenFullscreen = useCallback(() => {
    setFullscreenStartIndex(firstVisibleIndexRef.current);
    openFullscreen();
  }, [openFullscreen]);

  const handleCloseFullscreen = useCallback(
    (lastVisibleIndex: number) => {
      closeFullscreen();
      if (lastVisibleIndex > 0) {
        setTimeout(() => {
          versesFlatListRef.current?.scrollToIndex({
            index: lastVisibleIndex,
            animated: false,
          });
        }, 200);
      }
    },
    [closeFullscreen, versesFlatListRef],
  );

  const handlePreviousSurah = useCallback(() => {
    void selectSourateFromPicker(selectedSourate - 1);
  }, [selectSourateFromPicker, selectedSourate]);

  const handleNextSurah = useCallback(() => {
    void selectSourateFromPicker(selectedSourate + 1);
  }, [selectSourateFromPicker, selectedSourate]);

  const readerActions = (
    <QuranReaderActions
      onPreviousSurah={handlePreviousSurah}
      onNextSurah={handleNextSurah}
      canGoPrevious={selectedSourate > 1}
      canGoNext={selectedSourate < 114}
      displayMode={displayMode}
      hasBookmark={!!bookmark}
      onToggleDisplayMode={toggleDisplayMode}
      onOpenFullscreen={handleOpenFullscreen}
      onResumeBookmark={handleResumeBookmark}
    />
  );

  const resolveVerseTexts = useCallback(
    (item: { id: number; verse_key?: string }) => {
      const originalIndex = arabicVerses.findIndex((v) => v.id === item.id);
      return {
        phoneticText: phoneticArr[originalIndex]?.text || "",
        translationText: stripHtml(translationArr[originalIndex]?.text || ""),
        verseNumber: item.verse_key ? item.verse_key.split(":")[1] : "1",
      };
    },
    [arabicVerses, phoneticArr, translationArr],
  );

  const renderDownloadsReciterGroup = useCallback(
    ({ item: [reciterName, recitations] }: { item: [string, PremiumContent[]] }) => (
      <QuranOfflineReciterGroup
        reciterName={reciterName}
        recitations={recitations}
        surahLabel={surahCountLabel}
        highlightId={currentlyPlaying}
        playingId={downloadsPlaying}
        isPlaying={downloadsIsPlaying}
        onRecitationPress={handleDownloadedRecitationPress}
        onDelete={handleDeleteRecitation}
        styles={styles}
      />
    ),
    [
      surahCountLabel,
      currentlyPlaying,
      downloadsPlaying,
      downloadsIsPlaying,
      handleDownloadedRecitationPress,
      handleDeleteRecitation,
    ],
  );

  const renderOfflineTabReciterGroup = useCallback(
    ({ item: [reciterName, recitations] }: { item: [string, PremiumContent[]] }) => (
      <QuranOfflineReciterGroup
        reciterName={reciterName}
        recitations={recitations}
        surahLabel={surahCountLabel}
        highlightId={currentlyPlaying}
        playingId={downloadsPlaying}
        isPlaying={downloadsIsPlaying}
        onRecitationPress={handleDownloadedRecitationPress}
        styles={styles}
      />
    ),
    [
      surahCountLabel,
      currentlyPlaying,
      downloadsPlaying,
      downloadsIsPlaying,
      handleDownloadedRecitationPress,
    ],
  );

  const arabicOnly = displayMode === "arabic";

  const renderVerse = useCallback(
    (
      item: { id: number; verse_key?: string; text_uthmani?: string },
      offline: boolean,
      verseStyles: Record<string, any>,
    ) => {
      const { phoneticText, translationText, verseNumber } =
        resolveVerseTexts(item);
      return (
        <QuranVerseListItem
          arabicText={item.text_uthmani || ""}
          verseNumber={verseNumber}
          phoneticText={arabicOnly ? "" : phoneticText}
          translationText={translationText}
          favoriteData={convertToFavorite(
            item,
            translationText,
            offline ? selectedSourateLabel : selectedChapterName,
          )}
          showTranslation={
            !arabicOnly && (offline ? !!translationText : lang !== "ar")
          }
          showSeparator={!offline}
          styles={verseStyles}
          verseKey={item.verse_key}
          isBookmarked={!!item.verse_key && bookmark?.verseKey === item.verse_key}
          onToggleBookmark={handleToggleBookmark}
        />
      );
    },
    [
      resolveVerseTexts,
      arabicOnly,
      selectedSourateLabel,
      selectedChapterName,
      lang,
      bookmark,
      handleToggleBookmark,
    ],
  );

  const renderOfflineVerseItem = useCallback(
    ({ item }: { item: { id: number; verse_key?: string; text_uthmani?: string } }) =>
      renderVerse(item, true, styles),
    [renderVerse],
  );

  const renderOnlineVerseItem = useCallback(
    ({ item }: { item: { id: number; verse_key?: string; text_uthmani?: string } }) =>
      renderVerse(item, false, styles),
    [renderVerse],
  );

  const renderFullscreenVerseItem = useCallback(
    ({ item }: { item: { id: number; verse_key?: string; text_uthmani?: string } }) =>
      renderVerse(item, isOfflineView, fullscreenVerseStyles),
    [renderVerse, isOfflineView, fullscreenVerseStyles],
  );

  const fullscreenModal = (
    <QuranFullscreenModal
      visible={fullscreen}
      onClose={handleCloseFullscreen}
      data={filteredVerses}
      renderItem={renderFullscreenVerseItem}
      selectedSourate={selectedSourate}
      headerText={!isOfflineView && selectedSourate !== 9 ? t("bismillah") : null}
      headerTextStyle={{
        ...styles.bismillah,
        fontSize: 34,
        lineHeight: 56,
      }}
      initialIndex={fullscreenStartIndex}
      displayMode={displayMode}
      onToggleDisplayMode={toggleDisplayMode}
    />
  );

  const renderSourateModalItem = useCallback(
    ({ item }: { item: { key: number; label: string } }) => (
      <QuranModalOptionItem
        label={item.label}
        selected={selectedSourate === item.key}
        onPress={() => {
          void selectSourateFromPicker(item.key);
          setModalVisible(false);
        }}
        styles={styles}
      />
    ),
    [selectedSourate, selectSourateFromPicker],
  );

  if (offlineAccess.shouldShowOfflineMessage) {
    return (
      <OfflineMessage
        onRetry={() => {
          if (isPremium) {
            loadOfflineQuranData();
          }
        }}
        customMessage={t("offline_message_quran")}
      />
    );
  }

  if (loading) {
    return <ActivityIndicator size="large" style={{ marginTop: 40 }} />;
  }
  if (!fontsLoaded) return null;

  if (showDownloadsView) {
    return (
      <QuranDownloadsView
        insets={insets}
        scannedQuranFiles={scannedQuranFiles}
        onBack={() => {
          cleanupDownloadsPlayback();
          setShowDownloadsView(false);
        }}
        renderDownloadsReciterGroup={renderDownloadsReciterGroup}
      />
    );
  }

  if (isPremium && offlineAccess.isOfflineMode) {
    return (
      <>
      <QuranOfflinePremiumView
        readerActions={readerActions}
        scrollProps={mainListScrollProps}
        insets={insets}
        activeOfflineTab={activeOfflineTab}
        onTabChange={setActiveOfflineTab}
        selectedSourateLabel={selectedSourateLabel}
        onOpenSouratePicker={() => setModalVisible(true)}
        filteredVerses={filteredVerses}
        selectedSourate={selectedSourate}
        versesFlatListRef={versesFlatListRef}
        renderOfflineVerseItem={renderOfflineVerseItem}
        scannedQuranFiles={scannedQuranFiles}
        renderOfflineTabReciterGroup={renderOfflineTabReciterGroup}
        sourateModalVisible={modalVisible}
        onCloseSourateModal={() => setModalVisible(false)}
        sourateModalData={modalSourateData}
        renderSourateModalItem={renderSourateModalItem}
        windowHeight={windowHeight}
      />
      {fullscreenModal}
      </>
    );
  }

  return (
    <CachedImageBackground
      source={require("../assets/images/parchment_bg.jpg")}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <QuranOnlineHeader
          selectedSourateLabel={selectedSourateLabel}
          selectedReciter={selectedReciter}
          isPremium={isPremium}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenMenu={() => setMenuVisible(true)}
          onRunWidgetDiagnostic={runWidgetDiagnostic}
          readerActions={readerActions}
        />

        <QuranNavigationMenuModal
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          isPremium={isPremium}
          hasReciters={availableReciters.length > 0}
          selectedSourateLabel={selectedSourateLabel}
          selectedReciter={selectedReciter}
          selectedSourate={selectedSourate}
          sourates={sourates}
          onSelectSourate={(id) => void selectSourateFromPicker(id)}
          onOpenSouratePicker={() => setModalVisible(true)}
          onOpenReciterPicker={() => setReciterModalVisible(true)}
          onOpenDownloads={() => setShowDownloadsView(true)}
        />

        <QuranSouratePickerModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          data={modalSourateData}
          renderItem={renderSourateModalItem}
          maxHeight={windowHeight * 0.8}
          optimizedList
        />

        {isPremium && (
          <QuranFloatingPlayButton
            selectedReciter={selectedReciter}
            currentRecitation={currentRecitation}
            isRecitationPlaying={isRecitationPlaying}
            isLoading={isLoading}
            onOpenReciterPicker={() => setReciterModalVisible(true)}
            onOpenAudioControls={() => setAudioControlsModalVisible(true)}
          />
        )}

        <QuranAudioControlsModal
          visible={audioControlsModalVisible}
          onClose={() => setAudioControlsModalVisible(false)}
          slideAnimatedStyle={slideAnimatedStyle}
          onSwipeNavigate={handleSwipeNavigate}
          onResetSlideAnimation={resetSlideAnimation}
          isRecitationPlaying={isRecitationPlaying}
          selectedGif={selectedGif}
          isPremium={isPremium}
          onSelectGif={(gifId) => void selectGif(gifId)}
          onOpenGifPicker={() => setGifModalVisible(true)}
          currentRecitation={currentRecitation}
          isLoading={isLoading}
          currentlyPlaying={currentlyPlaying}
          onPlayPrevious={playPreviousInPlaylist}
          onPlayNext={playNextInPlaylist}
          onPause={pauseRecitation}
          onResume={resumeRecitation}
          onPlay={playRecitation}
          selectedSourate={selectedSourate}
          selectedSourateLabel={selectedSourateLabel}
          onShowNavigationTooltip={() => setShowNavigationTooltip(true)}
          playbackPosition={playbackPosition}
          playbackDuration={playbackDuration}
          onSeek={seekToPosition}
          downloadState={downloadState}
          onCancelDownload={handleNativeCancelDownload}
          onDownloadRecitation={handleNativeDownloadRecitation}
          onDeleteRecitation={handleDeleteRecitation}
          onStop={stopRecitation}
          gifModalVisible={gifModalVisible}
          onGifModalClose={() => setGifModalVisible(false)}
        />

        <QuranReciterPickerModal
          visible={reciterModalVisible}
          onClose={() => setReciterModalVisible(false)}
          reciters={availableReciters}
          selectedReciter={selectedReciter}
          onSelectReciter={setSelectedReciter}
          maxHeight={windowHeight * 0.6}
        />

        <QuranOnlineVersesList
          selectedSourate={selectedSourate}
          filteredVerses={filteredVerses}
          versesFlatListRef={versesFlatListRef}
          renderVerseItem={renderOnlineVerseItem}
          scrollProps={mainListScrollProps}
        />
      </View>

      {fullscreenModal}

      <QuranNavigationTooltipModal
        visible={showNavigationTooltip}
        onClose={() => setShowNavigationTooltip(false)}
      />
    </CachedImageBackground>
  );
}
