import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  FlatList,
  ListRenderItem,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useTranslation } from "react-i18next";
import { PremiumContent } from "../../utils/premiumContent";
import ThemedPicker from "../ThemedPicker";
import { useThemeAssets } from "../../hooks/useThemeAssets";

interface AdhanSoundSectionProps {
  // États audio
  isPreviewing: boolean;
  isAudioPlaying: boolean;
  currentPlayingAdhan: string | null;
  isLoadingPreview: boolean;

  // États premium audio
  isPlayingPremiumAdhan: boolean;
  currentPlayingPremiumAdhan: string | null;
  premiumAdhanPlaybackPosition: number;
  premiumAdhanPlaybackDuration: number;
  isLoadingPremiumAdhan: boolean;

  // États téléchargement
  availableAdhanVoices: PremiumContent[];
  downloadingAdhans: Set<string>;
  downloadProgress: { [key: string]: number };
  downloadState: Map<
    string,
    {
      isDownloading: boolean;
      progress: number;
      error: string | null;
      localUri?: string;
    }
  >;

  // Settings
  settings: any;
  calcMethod: string;
  setCalcMethod: (value: any) => void;
  adhanSound: string;
  setAdhanSound: (value: any) => void;
  adhanVolume: number;
  setAdhanVolume: (value: any) => void;
  methods: string[];
  sounds: string[];
  user: any;

  // Fonctions audio
  playPreview: () => void;
  stopPreview: () => void;
  pausePreview: () => Promise<void>;
  resumePreview: () => Promise<void>;

  // Fonctions premium audio
  playPremiumAdhan: (adhan: PremiumContent) => Promise<void>;
  pausePremiumAdhan: () => Promise<void>;
  resumePremiumAdhan: () => Promise<void>;
  seekPremiumAdhanPosition: (position: number) => Promise<void>;
  stopPremiumAdhan: () => Promise<void>;

  // Fonctions téléchargement
  handleDownloadAdhan: (adhan: PremiumContent) => Promise<void>;
  handleDeleteAdhan: (adhan: PremiumContent) => Promise<void>;
  handleCancelDownload: (adhanId: string) => void;
  getSoundDisplayName: (sound: string) => string;
  formatTime: (seconds: number) => string;

  // États des boutons d'actions (refresh, clean)
  isRefreshingAdhans: boolean;
  isCleaningFiles: boolean;

  // Fonctions d'actions
  handleRefreshAdhans: () => void;
  handleCleanFiles: () => void;

  // 🔧 FIX: Fonction de mise à jour des sons disponibles
  updateAvailableSounds: () => void;

  // 🔧 FIX: Fonction de rafraîchissement des adhans du hook
  forceRefreshAdhans: () => Promise<void>;

  // 🚀 NOUVEAU : Fonction pour marquer les changements en attente
  markPendingChanges: () => void;

  // Styles
  styles: any;
}

export default function AdhanSoundSection({
  isPreviewing,
  isAudioPlaying,
  currentPlayingAdhan,
  isLoadingPreview,
  isPlayingPremiumAdhan,
  currentPlayingPremiumAdhan,
  premiumAdhanPlaybackPosition,
  premiumAdhanPlaybackDuration,
  isLoadingPremiumAdhan,
  availableAdhanVoices,
  downloadingAdhans,
  downloadProgress,
  downloadState,
  settings,
  calcMethod,
  setCalcMethod,
  adhanSound,
  setAdhanSound,
  adhanVolume,
  setAdhanVolume,
  methods,
  sounds,
  user,
  playPreview,
  stopPreview,
  pausePreview,
  resumePreview,
  playPremiumAdhan,
  pausePremiumAdhan,
  resumePremiumAdhan,
  seekPremiumAdhanPosition,
  stopPremiumAdhan,
  handleDownloadAdhan,
  handleDeleteAdhan,
  handleCancelDownload,
  getSoundDisplayName,
  formatTime,
  isRefreshingAdhans,
  isCleaningFiles,
  handleRefreshAdhans,
  handleCleanFiles,
  updateAvailableSounds,
  forceRefreshAdhans,
  markPendingChanges,
  styles,
}: AdhanSoundSectionProps) {
  const { t } = useTranslation();
  const themeAssets = useThemeAssets();

  // 🚀 NOUVEAU : États pour les modals ThemedPicker
  const [methodPickerVisible, setMethodPickerVisible] = useState(false);
  const [soundPickerVisible, setSoundPickerVisible] = useState(false);

  // 🚀 NOUVEAU : Styles adaptatifs pour les boutons avec couleurs directes
  const buttonStyles = StyleSheet.create({
    container: {
      height: 50,
      justifyContent: "center" as const,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      alignSelf: "flex-start" as const,
      minWidth: 200,
      maxWidth: "70%" as any,
      paddingHorizontal: 12,
      paddingRight: 16,
      backgroundColor:
        themeAssets.theme === "light"
          ? themeAssets.colors.cardBG
          : "rgba(30, 41, 59, 0.8)",
      borderColor:
        themeAssets.theme === "light"
          ? themeAssets.colors.border
          : "rgba(148, 163, 184, 0.3)",
      borderRadius: 8,
      borderWidth: 1,
    },
    text: {
      flex: 1,
      fontSize: 16,
      textAlignVertical: "center" as any,
      includeFontPadding: false,
      color:
        themeAssets.theme === "light" ? themeAssets.colors.text : "#F8FAFC",
    },
    icon: {
      marginLeft: 4,
    },
  });

  return [
    {
      key: "calc_method",
      component: (
        <View style={{ alignItems: "center" }}>
          <Text style={[styles.label, { textAlign: "center" }]}>
            {t("calculation_method", "Méthode de calcul")}
          </Text>
          <View style={[styles.row, { justifyContent: "center" }]}>
            <TouchableOpacity
              style={buttonStyles.container}
              onPress={() => setMethodPickerVisible(true)}
            >
              <Text style={buttonStyles.text}>
                {t(`method_${calcMethod}`, calcMethod)}
              </Text>
              <MaterialCommunityIcons
                name="chevron-down"
                size={20}
                color="#4ECDC4"
                style={buttonStyles.icon}
              />
            </TouchableOpacity>
          </View>

          <ThemedPicker
            visible={methodPickerVisible}
            title={t("calculation_method", "Méthode de calcul")}
            items={methods.map((method) => ({
              label: t(`method_${method}`, method),
              value: method,
            }))}
            selectedValue={calcMethod}
            onValueChange={(value) => {
              setCalcMethod(value);
              settings.setCalcMethod(value);
              markPendingChanges(); // 🚀 NOUVEAU : Marquer les changements en attente
            }}
            onClose={() => setMethodPickerVisible(false)}
          />
        </View>
      ),
    },
    {
      key: "adhan_sound",
      component: (
        <View style={{ alignItems: "center" }}>
          <Text style={[styles.label, { textAlign: "center" }]}>
            {t("adhan_sound", "Son de l'Adhan")}
          </Text>
          <View style={[styles.row, { justifyContent: "center" }]}>
            <TouchableOpacity
              style={buttonStyles.container}
              onPress={() => setSoundPickerVisible(true)}
            >
              <Text style={buttonStyles.text}>
                {getSoundDisplayName(adhanSound)}
              </Text>
              <MaterialCommunityIcons
                name="chevron-down"
                size={20}
                color="#4ECDC4"
                style={buttonStyles.icon}
              />
            </TouchableOpacity>

            <ThemedPicker
              visible={soundPickerVisible}
              title={t("adhan_sound", "Son de l'Adhan")}
              items={sounds.map((sound) => ({
                label: getSoundDisplayName(sound),
                value: sound,
              }))}
              selectedValue={adhanSound}
              onValueChange={(value) => {
                setAdhanSound(value);
                settings.setAdhanSound(value);
                markPendingChanges(); // 🚀 NOUVEAU : Marquer les changements en attente
              }}
              onClose={() => setSoundPickerVisible(false)}
            />
          </View>
          <View style={styles.previewControlsContainer}>
            <Text style={styles.previewInfo}>
              {t("adhans.preview_limited", "Preview limitée à 20 secondes")}
            </Text>
            <View style={styles.previewControls}>
              <TouchableOpacity
                onPress={() => {
                  // 🚀 FIX: Éviter le blocage de l'UI avec async/await dans onPress
                  if (
                    isAudioPlaying &&
                    currentPlayingAdhan === "main_preview"
                  ) {
                    pausePreview().catch(console.error);
                  } else if (
                    !isAudioPlaying &&
                    currentPlayingAdhan === "main_preview" &&
                    isPreviewing
                  ) {
                    resumePreview().catch(console.error);
                  } else {
                    playPreview();
                  }
                }}
                style={styles.playButtonMain}
                disabled={isLoadingPreview && !isPreviewing}
              >
                {isLoadingPreview ? (
                  <MaterialCommunityIcons
                    name="loading"
                    size={24}
                    color="#fff"
                  />
                ) : (
                  <MaterialCommunityIcons
                    name={
                      isAudioPlaying && currentPlayingAdhan === "main_preview"
                        ? "pause"
                        : "play"
                    }
                    size={24}
                    color="#fff"
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={stopPreview}
                style={styles.stopButtonMain}
                disabled={
                  !currentPlayingAdhan || (isLoadingPreview && !isPreviewing)
                }
              >
                <MaterialCommunityIcons name="stop" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ),
    },
    {
      key: "adhan_volume",
      component: (
        <View style={styles.row}>
          <Text style={styles.label}>{t("adhan_volume")}</Text>
          <View style={styles.sliderContainer}>
            <Slider
              style={{ width: "80%", alignSelf: "center" }}
              value={adhanVolume}
              minimumValue={0.1}
              maximumValue={1.0}
              step={0.1}
              onSlidingComplete={(value) => {
                // 🚀 FIX: Éviter le blocage de l'UI avec async/await dans onSlidingComplete
                setAdhanVolume(value);
                settings.setAdhanVolume(value);
                markPendingChanges(); // 🚀 NOUVEAU : Marquer les changements en attente
                // console.log(`🔊 Volume configuré: ${Math.round(value * 100)}%`);
              }}
              minimumTrackTintColor="#D4AF37"
              maximumTrackTintColor="rgba(148, 163, 184, 0.4)"
            />
            <Text style={styles.sliderValue}>
              {Math.round(adhanVolume * 100)}%
            </Text>
          </View>
        </View>
      ),
    },
    // 🚀 SECTION PREMIUM ADHANS
    {
      key: "premium_adhans",
      component: user.isPremium
        ? (() => {
            return (
              <View style={styles.premiumSection}>
                <Text style={styles.premiumSectionTitle}>
                  {t("settings_screen.premium_adhans_title")} 👑
                </Text>
                {availableAdhanVoices.length === 0 && (
                  <Text style={{ color: "red", fontStyle: "italic" }}>
                    {t("settings_screen.no_premium_adhans")} (DEBUG)
                  </Text>
                )}
                {(() => {
                  const renderAdhanItem: ListRenderItem<PremiumContent> = ({
                    item,
                  }) => {
                    const nativeState = downloadState.get(item.id);
                    const isDownloading =
                      downloadingAdhans.has(item.id) ||
                      nativeState?.isDownloading ||
                      false;
                    const progress = nativeState?.progress
                      ? Math.round(nativeState.progress * 100)
                      : downloadProgress[item.id] || 0;

                    return (
                      <View style={styles.premiumAdhanItem}>
                        <View style={styles.premiumAdhanInfo}>
                          <Text style={styles.premiumAdhanTitle}>
                            {item.title}
                          </Text>
                          <Text style={styles.premiumAdhanSize}>
                            {item.fileSize
                              ? `${item.fileSize} MB`
                              : t("settings_screen.unknown_size")}
                          </Text>
                        </View>

                        <View style={styles.premiumAdhanActions}>
                          {isDownloading ? (
                            <View style={styles.downloadProgressContainer}>
                              <View style={styles.progressBarPremium}>
                                <View
                                  style={[
                                    styles.progressFillPremium,
                                    { width: `${progress}%` },
                                  ]}
                                />
                              </View>
                              <View style={styles.downloadProgressRow}>
                                <Text style={styles.progressTextPremium}>
                                  {progress}%
                                </Text>
                                <TouchableOpacity
                                  style={styles.cancelDownloadButton}
                                  onPress={() => handleCancelDownload(item.id)}
                                  activeOpacity={0.7}
                                >
                                  <MaterialCommunityIcons
                                    name="close-circle"
                                    size={20}
                                    color="#FF6B6B"
                                  />
                                </TouchableOpacity>
                              </View>
                            </View>
                          ) : item.isDownloaded ? (
                            <View style={styles.downloadedContainer}>
                              <View style={styles.downloadedIndicator}>
                                <MaterialCommunityIcons
                                  name="check-circle"
                                  size={20}
                                  color="#4ECDC4"
                                />
                                <Text style={styles.downloadedText}>
                                  {t("settings_screen.downloaded")}
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={styles.deleteButtonPremium}
                                onPress={() => handleDeleteAdhan(item)}
                              >
                                <MaterialCommunityIcons
                                  name="delete"
                                  size={20}
                                  color="#FF6B6B"
                                />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={styles.downloadButtonPremium}
                              onPress={() => handleDownloadAdhan(item)}
                            >
                              <MaterialCommunityIcons
                                name="download"
                                size={20}
                                color="#4ECDC4"
                              />
                              <Text style={styles.downloadButtonTextPremium}>
                                {t("download")}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  };

                  return (
                    <FlatList
                      data={availableAdhanVoices}
                      keyExtractor={(a) => a.id}
                      renderItem={renderAdhanItem}
                      initialNumToRender={8}
                      maxToRenderPerBatch={8}
                      windowSize={7}
                      removeClippedSubviews
                      nestedScrollEnabled
                      scrollEnabled={false}
                      showsVerticalScrollIndicator={false}
                    />
                  );
                })()}
                <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: isRefreshingAdhans
                        ? "#80CBC4"
                        : "#4ECDC4",
                      padding: 8,
                      borderRadius: 8,
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: isRefreshingAdhans ? 0.7 : 1,
                    }}
                    onPress={handleRefreshAdhans}
                    disabled={isRefreshingAdhans}
                  >
                    {isRefreshingAdhans ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <MaterialCommunityIcons
                        name="refresh"
                        size={16}
                        color="#fff"
                      />
                    )}
                    <Text style={{ color: "#fff", marginLeft: 4 }}>
                      {isRefreshingAdhans
                        ? t("loading", "Chargement...")
                        : t("refresh")}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      backgroundColor: isCleaningFiles ? "#FF8A80" : "#ff6b6b",
                      padding: 8,
                      borderRadius: 8,
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: isCleaningFiles ? 0.7 : 1,
                    }}
                    onPress={handleCleanFiles}
                    disabled={isCleaningFiles}
                  >
                    {isCleaningFiles ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <MaterialCommunityIcons
                        name="broom"
                        size={16}
                        color="#fff"
                      />
                    )}
                    <Text style={{ color: "#fff", marginLeft: 4 }}>
                      {isCleaningFiles
                        ? t("cleaning", "Nettoyage...")
                        : t("clean")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })()
        : null,
    },
  ];
}
