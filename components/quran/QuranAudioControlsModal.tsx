import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Animated, { AnimatedStyle } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { Image as ExpoImage } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  GestureHandlerRootView,
  PanGestureHandler,
  State,
} from "react-native-gesture-handler";
import { MCIcon, IonIcon } from "@/components/icons/AppVectorIcons";
import { QuranGifListItem } from "./QuranListItems";
import {
  AudioGifType,
  AVAILABLE_GIFS,
  AVAILABLE_GIFS_LIST,
} from "../../constants/quranGifs";
import { quranScreenStyles as styles } from "../../styles/QuranScreen.styles";
import { PremiumContent } from "../../utils/premiumContent";
import { QuranAudioSeekBar } from "./QuranAudioControls";
import { QuranAudioDownloadSection } from "./QuranAudioDownloadSection";

type DownloadStateEntry = {
  isDownloading: boolean;
  progress: number;
};

type QuranAudioControlsModalProps = {
  visible: boolean;
  onClose: () => void;
  slideAnimatedStyle: AnimatedStyle;
  onSwipeNavigate: (direction: "previous" | "next") => void;
  onResetSlideAnimation: () => void;
  isRecitationPlaying: boolean;
  selectedGif: AudioGifType;
  isPremium: boolean;
  onSelectGif: (gifId: AudioGifType) => void;
  onOpenGifPicker: () => void;
  currentRecitation: PremiumContent | null;
  isLoading: boolean;
  currentlyPlaying: string | null;
  onPlayPrevious: () => void;
  onPlayNext: () => void;
  onPause: () => void;
  onResume: () => void;
  onPlay: (recitation: PremiumContent) => void;
  selectedSourate: number;
  selectedSourateLabel: string;
  onShowNavigationTooltip: () => void;
  playbackPosition: number;
  playbackDuration: number;
  onSeek: (position: number) => void;
  downloadState: Map<string, DownloadStateEntry>;
  onCancelDownload: (contentId: string) => void;
  onDownloadRecitation: (recitation: PremiumContent) => void;
  onDeleteRecitation: (recitation: PremiumContent) => void;
  onStop: () => void;
  gifModalVisible: boolean;
  onGifModalClose: () => void;
};

export function QuranAudioControlsModal({
  visible,
  onClose,
  slideAnimatedStyle,
  onSwipeNavigate,
  onResetSlideAnimation,
  isRecitationPlaying,
  selectedGif,
  isPremium,
  onSelectGif,
  onOpenGifPicker,
  currentRecitation,
  isLoading,
  currentlyPlaying,
  onPlayPrevious,
  onPlayNext,
  onPause,
  onResume,
  onPlay,
  selectedSourate,
  selectedSourateLabel,
  onShowNavigationTooltip,
  playbackPosition,
  playbackDuration,
  onSeek,
  downloadState,
  onCancelDownload,
  onDownloadRecitation,
  onDeleteRecitation,
  onStop,
  gifModalVisible,
  onGifModalClose,
}: QuranAudioControlsModalProps) {
  const { t } = useTranslation();
  const [gifKey, setGifKey] = useState(0);
  const [audioModalView, setAudioModalView] = useState<
    "player" | "gifSelector"
  >("player");
  const prevVisibleRef = useRef(visible);

  const modalButtonColor = useMemo(
    () =>
      ["makka", "madina", "alquds", "riviere"].includes(selectedGif)
        ? "#FFFFFF"
        : "#483C1C",
    [selectedGif],
  );

  if (visible !== prevVisibleRef.current) {
    prevVisibleRef.current = visible;
    if (!visible) {
      onResetSlideAnimation();
      setAudioModalView("player");
    } else {
      setGifKey((prev) => prev + 1);
    }
  }

  const onGestureEvent = useCallback(() => {}, []);

  const onHandlerStateChange = useCallback(
    (event: { nativeEvent: { state: number; translationX: number; velocityX: number } }) => {
      if (event.nativeEvent.state === State.END) {
        const { translationX, velocityX } = event.nativeEvent;
        const SWIPE_THRESHOLD = 50;
        const VELOCITY_THRESHOLD = 300;

        if (
          Math.abs(translationX) > SWIPE_THRESHOLD &&
          Math.abs(velocityX) > VELOCITY_THRESHOLD
        ) {
          if (translationX > 0) {
            onSwipeNavigate("previous");
          } else {
            onSwipeNavigate("next");
          }
        }
      }
    },
    [onSwipeNavigate],
  );

  const handleClose = useCallback(() => {
    onClose();
    if (Platform.OS === "ios") {
      setAudioModalView("player");
    }
  }, [onClose]);

  const handleOpenGifPicker = useCallback(() => {
    if (Platform.OS === "ios") {
      setAudioModalView("gifSelector");
    } else {
      onOpenGifPicker();
    }
  }, [onOpenGifPicker]);

  const handleGifSelect = useCallback(
    (gifId: AudioGifType) => {
      onSelectGif(gifId);
      setGifKey((prev) => prev + 1);
      if (Platform.OS === "ios") {
        setAudioModalView("player");
      } else {
        onGifModalClose();
      }
    },
    [onSelectGif, onGifModalClose],
  );

  const renderGifItem = useCallback(
    ({ item: gif }: { item: (typeof AVAILABLE_GIFS_LIST)[number] }) => (
      <QuranGifListItem
        gif={gif}
        isLocked={!!(gif.premium && !isPremium)}
        isSelected={selectedGif === gif.id}
        onSelect={(id) => handleGifSelect(id as AudioGifType)}
        styles={styles}
      />
    ),
    [isPremium, selectedGif, handleGifSelect],
  );

  return (
    <>
      <Modal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={handleClose}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaView style={styles.audioModalContainer}>
            <PanGestureHandler
              onGestureEvent={onGestureEvent}
              onHandlerStateChange={onHandlerStateChange}
              activeOffsetX={[-50, 50]}
              failOffsetY={[-50, 50]}
            >
              <ScrollView
                style={styles.audioModalScrollView}
                contentContainerStyle={styles.audioModalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Animated.View
                  style={[styles.audioModalContent, slideAnimatedStyle]}
                >
                  <ExpoImage
                    source={
                      isRecitationPlaying
                        ? AVAILABLE_GIFS[selectedGif].gifImage
                        : AVAILABLE_GIFS[selectedGif].fixImage
                    }
                    style={styles.audioModalGifBackground}
                    contentFit="cover"
                    key={`gif-${gifKey}-${isRecitationPlaying ? "play" : "pause"}`}
                  />
                  <View style={styles.audioModalOverlay}>
                    <View style={styles.audioModalHeader}>
                      {Platform.OS === "ios" && audioModalView === "gifSelector" ? (
                        <Pressable
                          style={styles.closeButton}
                          onPress={() => setAudioModalView("player")}
                        >
                          <MCIcon
                            name="arrow-left"
                            size={24}
                            color={modalButtonColor}
                          />
                        </Pressable>
                      ) : (
                        <Pressable
                          style={styles.closeButton}
                          onPress={handleClose}
                        >
                          <MCIcon
                            name="close"
                            size={24}
                            color={modalButtonColor}
                          />
                        </Pressable>
                      )}

                      {isPremium && audioModalView === "player" && (
                        <Pressable
                          style={styles.gifSelectorButton}
                          onPress={handleOpenGifPicker}
                        >
                          <IonIcon
                            name="images-outline"
                            size={20}
                            color={modalButtonColor}
                          />
                        </Pressable>
                      )}
                    </View>

                    {Platform.OS === "ios" && audioModalView === "gifSelector" ? (
                      <FlatList
                        style={styles.gifList}
                        data={AVAILABLE_GIFS_LIST}
                        keyExtractor={(gif) => gif.id}
                        renderItem={renderGifItem}
                      />
                    ) : (
                      currentRecitation && (
                        <View style={styles.audioModalBody}>
                          <View style={styles.audioAnimationContainer}>
                            <Text
                              style={styles.audioAnimationText}
                              numberOfLines={2}
                              adjustsFontSizeToFit
                              minimumFontScale={0.85}
                            >
                              {isRecitationPlaying
                                ? t("currently_playing")
                                : t("ready_to_listen")}
                            </Text>
                          </View>

                          <View style={styles.audioInfoContainer}>
                            <Text style={styles.audioReciterName}>
                              {currentRecitation.reciter}
                            </Text>
                            <Text style={styles.audioSurahName}>
                              {currentRecitation.surahName}
                            </Text>
                            {currentRecitation.isDownloaded && (
                              <View style={styles.audioLocalBadge}>
                                <MCIcon
                                  name="download"
                                  size={14}
                                  color="#4CAF50"
                                />
                                <Text style={styles.audioLocalText}>
                                  {t("offline")}
                                </Text>
                              </View>
                            )}
                          </View>

                          <View style={styles.audioMainControls}>
                            <Pressable
                              onPress={onPlayPrevious}
                              disabled={isLoading}
                              style={styles.audioSecondaryControlButton}
                            >
                              <MCIcon
                                name="skip-previous"
                                size={40}
                                color="#FFF"
                              />
                            </Pressable>

                            <Pressable
                              style={[
                                styles.audioPlayButton,
                                isRecitationPlaying && styles.audioPlayButtonActive,
                              ]}
                              onPress={() => {
                                if (isRecitationPlaying) {
                                  onPause();
                                } else if (
                                  currentlyPlaying === currentRecitation?.id
                                ) {
                                  onResume();
                                } else {
                                  onPlay(currentRecitation);
                                }
                              }}
                              disabled={isLoading}
                            >
                              <MCIcon
                                name={
                                  isLoading
                                    ? "loading"
                                    : isRecitationPlaying
                                      ? "pause"
                                      : "play"
                                }
                                size={40}
                                color="#fff"
                              />
                            </Pressable>

                            <Pressable
                              onPress={onPlayNext}
                              disabled={isLoading}
                              style={styles.audioSecondaryControlButton}
                            >
                              <MCIcon
                                name="skip-next"
                                size={40}
                                color="#FFF"
                              />
                            </Pressable>
                          </View>

                          <View style={styles.audioNavigationContainer}>
                            <View style={styles.audioCurrentSurah}>
                              <Text style={styles.audioCurrentSurahText}>
                                {t("surah")} {selectedSourate}
                              </Text>
                              <Text style={styles.audioCurrentSurahName}>
                                {selectedSourateLabel}
                              </Text>
                            </View>

                            <View style={styles.navigationInfoContainer}>
                              <Pressable
                                style={styles.navigationInfoButton}
                                onPress={onShowNavigationTooltip}
                              >
                                <MCIcon
                                  name="information-outline"
                                  size={18}
                                  color="#FFD700"
                                />
                                <Text style={styles.navigationInfoText}>
                                  Navigation
                                </Text>
                              </Pressable>
                            </View>
                          </View>

                          <View style={styles.audioProgressContainer}>
                            <QuranAudioSeekBar
                              key={`seek-${currentRecitation.id}-${playbackDuration}`}
                              currentPosition={playbackPosition || 0}
                              totalDuration={playbackDuration || 0}
                              onSeek={onSeek}
                            />
                          </View>

                          <View style={styles.audioOptionsContainer}>
                            <QuranAudioDownloadSection
                              currentRecitation={currentRecitation}
                              downloadState={downloadState}
                              modalButtonColor={modalButtonColor}
                              onCancelDownload={onCancelDownload}
                              onDownloadRecitation={onDownloadRecitation}
                              onDeleteRecitation={onDeleteRecitation}
                            />
                          </View>

                          <Pressable style={styles.audioStopButton} onPress={onStop}>
                            <MCIcon
                              name="stop"
                              size={24}
                              color={modalButtonColor}
                            />
                            <Text
                              style={[
                                styles.audioStopText,
                                { color: modalButtonColor },
                              ]}
                            >
                              {t("stop")}
                            </Text>
                          </Pressable>
                        </View>
                      )
                    )}
                  </View>
                </Animated.View>
              </ScrollView>
            </PanGestureHandler>
          </SafeAreaView>
        </GestureHandlerRootView>
      </Modal>

      {Platform.OS !== "ios" && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={gifModalVisible}
          onRequestClose={onGifModalClose}
        >
          <SafeAreaView style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {t("choose_gif", "Choisir un effet visuel")}
                </Text>
                <Pressable style={styles.closeButton} onPress={onGifModalClose}>
                  <MCIcon name="close" size={24} color="#483C1C" />
                </Pressable>
              </View>

              <FlatList
                style={styles.gifList}
                data={AVAILABLE_GIFS_LIST}
                keyExtractor={(gif) => gif.id}
                renderItem={renderGifItem}
              />
            </View>
          </SafeAreaView>
        </Modal>
      )}
    </>
  );
}
