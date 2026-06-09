import * as Font from "expo-font";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  View,
  useWindowDimensions,
} from "react-native";
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
    setSelectedSourate,
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
    setSelectedSourate,
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

  const [fontsLoaded] = Font.useFonts({
    ScheherazadeNew: require("../assets/fonts/ScheherazadeNew-Regular.ttf"),
  });

  const surahCountLabel = t("surah", "Sourate");

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

  const renderOfflineVerseItem = useCallback(
    ({ item }: { item: { id: number; verse_key?: string; text_uthmani?: string } }) => {
      const { phoneticText, translationText, verseNumber } =
        resolveVerseTexts(item);
      return (
        <QuranVerseListItem
          arabicText={item.text_uthmani || ""}
          verseNumber={verseNumber}
          phoneticText={phoneticText}
          translationText={translationText}
          favoriteData={convertToFavorite(
            item,
            translationText,
            selectedSourateLabel,
          )}
          showTranslation={!!translationText}
          showSeparator={false}
          styles={styles}
        />
      );
    },
    [resolveVerseTexts, selectedSourateLabel],
  );

  const renderOnlineVerseItem = useCallback(
    ({ item }: { item: { id: number; verse_key?: string; text_uthmani?: string } }) => {
      const { phoneticText, translationText, verseNumber } =
        resolveVerseTexts(item);
      return (
        <QuranVerseListItem
          arabicText={item.text_uthmani || ""}
          verseNumber={verseNumber}
          phoneticText={phoneticText}
          translationText={translationText}
          favoriteData={convertToFavorite(
            item,
            translationText,
            selectedChapterName,
          )}
          showTranslation={lang !== "ar"}
          showSeparator
          styles={styles}
        />
      );
    },
    [resolveVerseTexts, selectedChapterName, lang],
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
      <QuranOfflinePremiumView
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
    );
  }

  return (
    <ImageBackground
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
        />
      </View>

      <QuranNavigationTooltipModal
        visible={showNavigationTooltip}
        onClose={() => setShowNavigationTooltip(false)}
      />
    </ImageBackground>
  );
}
