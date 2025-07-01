import React, {
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { Picker } from "@react-native-picker/picker";
import Slider from "@react-native-community/slider";
import { Audio } from "expo-av";
import {
  ImageBackground,
  SectionList,
  View,
  Text,
  Switch,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Alert,
  Platform,
  NativeModules,
} from "react-native";
import ThemedImageBackground from "../components/ThemedImageBackground";
import {
  SettingsContext,
  AdhanSoundKey,
  CalcMethodKey,
  SettingsContextType,
} from "../contexts/SettingsContext";
import {
  useThemeColors,
  useOverlayTextColor,
  useOverlayIconColor,
  useCurrentTheme,
} from "../hooks/useThemeColor";
import { useCitySearch, NominatimResult } from "../hooks/useCitySearch";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useBackup } from "../contexts/BackupContext";
import { usePremium } from "../contexts/PremiumContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useToast } from "../contexts/ToastContext";
import PremiumContentManager, { PremiumContent } from "../utils/premiumContent";

const soundObjects: Record<AdhanSoundKey, any> = {
  adhamalsharqawe: require("../assets/sounds/adhamalsharqawe.mp3"),
  adhanaljazaer: require("../assets/sounds/adhanaljazaer.mp3"),
  ahmadnafees: require("../assets/sounds/ahmadnafees.mp3"),
  ahmedelkourdi: require("../assets/sounds/ahmedelkourdi.mp3"),
  dubai: require("../assets/sounds/dubai.mp3"),
  karljenkins: require("../assets/sounds/karljenkins.mp3"),
  mansourzahrani: require("../assets/sounds/mansourzahrani.mp3"),
  misharyrachid: require("../assets/sounds/misharyrachid.mp3"),
  mustafaozcan: require("../assets/sounds/mustafaozcan.mp3"),
  masjidquba: require("../assets/sounds/masjidquba.mp3"),
  islamsobhi: require("../assets/sounds/islamsobhi.mp3"),
  adhan_muhammad_hessen: require("../assets/sounds/ahmadnafees.mp3"), // Fallback temporaire
};

// Interface pour les props du composant SettingsSections
interface SettingsSectionsProps {
  settings: SettingsContextType;
  dhikrSettings: SettingsContextType["dhikrSettings"];
  methods: CalcMethodKey[];
  sounds: AdhanSoundKey[];
  languages: { code: string; label: string }[];
  isPreviewing: boolean;
  playPreview: () => void;
  stopPreview: () => void;
  onChangeLanguage: (langCode: string) => void;
  selectedLang: string;
  reprogrammateNotifications: () => Promise<void>;
  handleCityInputChange: (text: string) => void;
  selectCity: (city: NominatimResult) => void;
  cityInput: string;
  citySearchResults: NominatimResult[];
  citySearchLoading: boolean;
  isApplyingChanges: boolean;
  getSoundDisplayName: (soundId: string) => string;
  styles: any;
  availableAdhanVoices: PremiumContent[];
  downloadingAdhans: Set<string>;
  downloadProgress: { [key: string]: number };
  handleDownloadAdhan: (adhan: PremiumContent) => Promise<void>;
  handleDeleteAdhan: (adhan: PremiumContent) => Promise<void>;

  // Props pour la progression audio (uniquement pour le preview principal)
  playbackPosition: number;
  playbackDuration: number;
  currentPlayingAdhan: string | null;
  isLoadingPreview: boolean;
  pausePreview: () => Promise<void>;
  resumePreview: () => Promise<void>;
  seekToPosition: (position: number) => Promise<void>;
  formatTime: (milliseconds: number) => string;
}

function SettingsSections({
  settings,
  dhikrSettings,
  methods,
  sounds,
  languages,
  isPreviewing,
  playPreview,
  stopPreview,
  onChangeLanguage,
  selectedLang,
  reprogrammateNotifications,
  handleCityInputChange,
  selectCity,
  cityInput,
  citySearchResults,
  citySearchLoading,
  isApplyingChanges,
  getSoundDisplayName,
  styles,
  availableAdhanVoices,
  downloadingAdhans,
  downloadProgress,
  handleDownloadAdhan,
  handleDeleteAdhan,

  // Nouveaux paramètres pour la progression audio
  playbackPosition,
  playbackDuration,
  currentPlayingAdhan,
  isLoadingPreview,
  pausePreview,
  resumePreview,
  seekToPosition,
  formatTime,
}: SettingsSectionsProps) {
  const { t } = useTranslation();

  // Hooks pour la sauvegarde cloud premium
  const { user, activatePremium } = usePremium();
  const {
    isSignedIn,
    userEmail,
    lastBackupTime,
    isSyncing,
    backupStatus,
    signInAnonymously,
    signOut,
    backupData,
    restoreData,
    enableAutoBackup,
    isAutoBackupEnabled,
    hasCloudData,
  } = useBackup();
  const {
    locationMode,
    setLocationMode,
    autoLocation,
    isRefreshingLocation,
    refreshAutoLocation,
    notificationsEnabled,
    setNotificationsEnabled,
    remindersEnabled,
    setRemindersEnabled,
    reminderOffset,
    setReminderOffset,
    calcMethod,
    setCalcMethod,
    adhanSound,
    setAdhanSound,
    adhanVolume,
    setAdhanVolume,
    setEnabledAfterSalah,
    setEnabledMorningDhikr,
    setDelayMorningDhikr,
    setEnabledEveningDhikr,
    setDelayEveningDhikr,
    setEnabledSelectedDua,
    setDelaySelectedDua,
  } = settings;

  const [allDhikrEnabled, setAllDhikrEnabled] = useState(
    dhikrSettings.enabledAfterSalah ||
      dhikrSettings.enabledMorningDhikr ||
      dhikrSettings.enabledEveningDhikr ||
      dhikrSettings.enabledSelectedDua
  );

  useEffect(() => {
    const areAnyDhikrEnabled =
      dhikrSettings.enabledAfterSalah ||
      dhikrSettings.enabledMorningDhikr ||
      dhikrSettings.enabledEveningDhikr ||
      dhikrSettings.enabledSelectedDua;
    if (areAnyDhikrEnabled !== allDhikrEnabled) {
      setAllDhikrEnabled(areAnyDhikrEnabled);
    }
  }, [
    dhikrSettings.enabledAfterSalah,
    dhikrSettings.enabledMorningDhikr,
    dhikrSettings.enabledEveningDhikr,
    dhikrSettings.enabledSelectedDua,
  ]);

  const toggleAllDhikr = (value: boolean) => {
    setAllDhikrEnabled(value);

    // Seulement quand on DÉSACTIVE le dhikr général, on désactive tous les individuels
    if (!value) {
      setEnabledAfterSalah(false);
      setEnabledMorningDhikr(false);
      setEnabledEveningDhikr(false);
      setEnabledSelectedDua(false);
    }
    // Quand on l'active (value = true), on ne touche pas aux dhikrs individuels
  };

  // Nouvelle fonction pour gérer les notifications générales
  const handleNotificationsToggle = (value: boolean) => {
    setNotificationsEnabled(value);

    // Si on désactive les notifications générales, on désactive tout immédiatement
    if (!value) {
      setRemindersEnabled(false);
      // Désactiver tous les dhikrs individuellement ET le toggle général
      setAllDhikrEnabled(false);
      setEnabledAfterSalah(false);
      setEnabledMorningDhikr(false);
      setEnabledEveningDhikr(false);
      setEnabledSelectedDua(false);
    }
  };

  const SECTIONS = [
    {
      key: "location",
      title: t("location_method", "Méthode de localisation"),
      data: [
        {
          key: "location_content",
          component: (
            <View>
              <View style={styles.locationToggle}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    locationMode === "auto" && styles.toggleButtonActive,
                  ]}
                  onPress={() => setLocationMode("auto")}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      locationMode === "auto" && styles.toggleButtonTextActive,
                    ]}
                  >
                    {t("automatic")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    locationMode === "manual" && styles.toggleButtonActive,
                  ]}
                  onPress={() => setLocationMode("manual")}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      locationMode === "manual" &&
                        styles.toggleButtonTextActive,
                    ]}
                  >
                    {t("manual")}
                  </Text>
                </TouchableOpacity>
              </View>

              {locationMode === "auto" && (
                <View style={styles.autoLocationSection}>
                  <TouchableOpacity
                    onPress={refreshAutoLocation}
                    style={styles.refreshButton}
                    disabled={isRefreshingLocation}
                  >
                    <Text style={styles.refreshButtonText}>
                      {isRefreshingLocation
                        ? t("updating_location", "Mise à jour...")
                        : t("refresh_location", "Actualiser la position")}
                    </Text>
                  </TouchableOpacity>
                  {autoLocation && (
                    <Text style={styles.locationText}>
                      {t("location_detected", "Position détectée")}:{" "}
                      {autoLocation.lat.toFixed(3)},{" "}
                      {autoLocation.lon.toFixed(3)}
                    </Text>
                  )}
                </View>
              )}

              {locationMode === "manual" && (
                <View>
                  <TextInput
                    style={styles.input}
                    placeholder={t("search_city", "Rechercher une ville")}
                    placeholderTextColor="#999"
                    value={cityInput}
                    onChangeText={handleCityInputChange}
                  />
                  {citySearchLoading && (
                    <ActivityIndicator
                      size="small"
                      color="#D4AF37"
                      style={{ marginVertical: 10 }}
                    />
                  )}
                  {citySearchResults.length > 0 && (
                    <View style={styles.resultsList}>
                      {citySearchResults.map((item) => (
                        <TouchableOpacity
                          key={item.place_id}
                          style={styles.resultItem}
                          onPress={() => selectCity(item)}
                        >
                          <Text>{item.display_name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          ),
        },
      ],
    },
    {
      key: "adhan_sound",
      title: t("adhan_settings", "Son et Adhan"),
      data: [
        {
          key: "calc_method",
          component: (
            <View style={styles.row}>
              <Text style={styles.label}>
                {t("calculation_method", "Méthode de calcul")}
              </Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={calcMethod}
                  style={styles.picker}
                  onValueChange={(itemValue) => setCalcMethod(itemValue)}
                  itemStyle={styles.pickerItem}
                  mode="dropdown"
                >
                  {methods.map((method) => (
                    <Picker.Item
                      key={method}
                      label={t(`method_${method}`, method)}
                      value={method}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          ),
        },
        {
          key: "adhan_sound",
          component: (
            <View>
              <View style={styles.row}>
                <Text style={styles.label}>
                  {t("adhan_sound", "Son de l'Adhan")}
                </Text>
                <View style={styles.pickerContainerFull}>
                  <Picker
                    selectedValue={adhanSound}
                    style={styles.picker}
                    onValueChange={(itemValue) => setAdhanSound(itemValue)}
                    itemStyle={styles.pickerItem}
                  >
                    {sounds.map((sound) => (
                      <Picker.Item
                        key={sound}
                        label={getSoundDisplayName(sound)}
                        value={sound}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
              <View style={styles.previewControlsContainer}>
                {/* Contrôles principaux */}
                <View style={styles.previewControls}>
                  <TouchableOpacity
                    onPress={playPreview}
                    style={styles.playButtonMain}
                    disabled={isLoadingPreview}
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
                          isPreviewing && currentPlayingAdhan === "main_preview"
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
                      !isPreviewing || currentPlayingAdhan !== "main_preview"
                    }
                  >
                    <MaterialCommunityIcons
                      name="stop"
                      size={20}
                      color="#fff"
                    />
                  </TouchableOpacity>
                </View>

                {/* Jauge de progression */}
                {isPreviewing &&
                  currentPlayingAdhan === "main_preview" &&
                  playbackDuration > 0 && (
                    <View style={styles.progressContainer}>
                      <Text style={styles.timeText}>
                        {formatTime(playbackPosition)}
                      </Text>

                      <TouchableOpacity
                        style={styles.progressBarContainer}
                        onPress={(event) => {
                          const { locationX } = event.nativeEvent;
                          const progressBarWidth = 200; // width fixe pour éviter les erreurs
                          const newPosition =
                            (locationX / progressBarWidth) * playbackDuration;
                          seekToPosition(newPosition);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${
                                  playbackDuration > 0
                                    ? (playbackPosition / playbackDuration) *
                                      100
                                    : 0
                                }%`,
                              },
                            ]}
                          />
                        </View>
                      </TouchableOpacity>

                      <Text style={styles.timeText}>
                        {formatTime(playbackDuration)}
                      </Text>
                    </View>
                  )}
              </View>
            </View>
          ),
        },
        {
          key: "adhan_volume",
          component: (
            <View style={styles.row}>
              <Text style={styles.label}>
                {t("adhan_volume", "Volume de l'Adhan")}
              </Text>
              <View style={styles.sliderContainer}>
                <Slider
                  style={{ width: "80%", alignSelf: "center" }}
                  value={adhanVolume}
                  minimumValue={0.1}
                  maximumValue={1.0}
                  step={0.1}
                  onSlidingComplete={setAdhanVolume}
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
        // Section Adhans Premium (uniquement pour les utilisateurs premium)
        {
          key: "premium_adhans",
          component:
            user.isPremium && availableAdhanVoices.length > 0 ? (
              <View style={styles.premiumSection}>
                <Text style={styles.premiumSectionTitle}>
                  Adhans Premium 👑
                </Text>
                {availableAdhanVoices.map((adhan) => {
                  const isDownloading = downloadingAdhans.has(adhan.id);
                  const progress = downloadProgress[adhan.id] || 0;

                  return (
                    <View key={adhan.id} style={styles.premiumAdhanItem}>
                      <View style={styles.premiumAdhanInfo}>
                        <Text style={styles.premiumAdhanTitle}>
                          {adhan.title}
                        </Text>
                        <Text style={styles.premiumAdhanSize}>
                          {adhan.fileSize
                            ? `${adhan.fileSize} MB`
                            : "Taille inconnue"}
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
                            <Text style={styles.progressTextPremium}>
                              {progress}%
                            </Text>
                          </View>
                        ) : adhan.isDownloaded ? (
                          <View style={styles.downloadedContainer}>
                            <View style={styles.downloadedIndicator}>
                              <MaterialCommunityIcons
                                name="check-circle"
                                size={20}
                                color="#4ECDC4"
                              />
                              <Text style={styles.downloadedText}>
                                Téléchargé
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={styles.deleteButtonPremium}
                              onPress={() => handleDeleteAdhan(adhan)}
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
                            onPress={() => handleDownloadAdhan(adhan)}
                          >
                            <MaterialCommunityIcons
                              name="download"
                              size={20}
                              color="#4ECDC4"
                            />
                            <Text style={styles.downloadButtonTextPremium}>
                              Télécharger
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null,
        },
      ],
    },
    {
      key: "general",
      title: t("general_settings", "Réglages généraux"),
      data: [
        {
          key: "general_content",
          component: (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>{t("notifications")}</Text>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleNotificationsToggle}
                />
              </View>
            </>
          ),
        },
        {
          key: "language_select",
          component: (
            <View style={styles.row}>
              <Text style={styles.label}>{t("language", "Langue")}</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedLang}
                  style={styles.picker}
                  onValueChange={(itemValue) => onChangeLanguage(itemValue)}
                  itemStyle={styles.pickerItem}
                  mode="dropdown"
                >
                  {languages.map((lang) => (
                    <Picker.Item
                      key={lang.code}
                      label={lang.label}
                      value={lang.code}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          ),
        },
        {
          key: "reminders",
          component: notificationsEnabled ? (
            <View style={styles.row}>
              <Text style={styles.label}>
                {t("prayer_reminders_before", "Rappels avant la prière")}
              </Text>
              <Switch
                value={remindersEnabled}
                onValueChange={setRemindersEnabled}
              />
            </View>
          ) : null,
        },
        {
          key: "reminder_offset",
          component: remindersEnabled ? (
            <View style={styles.row}>
              <Text style={styles.label}>
                {t("reminder_offset_minutes", "Délai (minutes)")}
              </Text>
              <View style={styles.sliderContainer}>
                <Slider
                  style={{ width: "80%", alignSelf: "center" }}
                  value={reminderOffset}
                  minimumValue={5}
                  maximumValue={30}
                  step={1}
                  onSlidingComplete={setReminderOffset}
                  minimumTrackTintColor="#D4AF37"
                  maximumTrackTintColor="rgba(148, 163, 184, 0.4)"
                />
                <Text style={styles.sliderValue}>{reminderOffset} min</Text>
              </View>
            </View>
          ) : null,
        },
      ],
    },
    {
      key: "dhikr",
      title: t("dhikr.title", "Notifications de Dhikr"),
      data: notificationsEnabled
        ? [
            {
              key: "dhikr_content",
              component: (
                <>
                  <View style={styles.row}>
                    <Text style={styles.label}>
                      {t("dhikr_settings", "Activer tous les Dhikrs")}
                    </Text>
                    <Switch
                      value={allDhikrEnabled}
                      onValueChange={toggleAllDhikr}
                    />
                  </View>
                  {allDhikrEnabled && (
                    <>
                      <View style={styles.row}>
                        <Text style={styles.subLabel}>
                          {t(
                            "dhikr.categories.afterSalah",
                            "Dhikr après la prière"
                          )}
                        </Text>
                        <Switch
                          value={dhikrSettings.enabledAfterSalah}
                          onValueChange={setEnabledAfterSalah}
                        />
                      </View>
                      <View style={styles.row}>
                        <Text style={styles.subLabel}>
                          {t("dhikr.categories.morning", "Dhikr du matin")}
                        </Text>
                        <Switch
                          value={dhikrSettings.enabledMorningDhikr}
                          onValueChange={setEnabledMorningDhikr}
                        />
                      </View>
                      {dhikrSettings.enabledMorningDhikr && (
                        <View style={styles.row}>
                          <Text style={styles.label}>
                            {t("morning_dhikr_delay", "Délai après Fajr (min)")}
                          </Text>
                          <View style={styles.sliderContainer}>
                            <Slider
                              style={{ width: "80%", alignSelf: "center" }}
                              value={dhikrSettings.delayMorningDhikr}
                              minimumValue={5}
                              maximumValue={60}
                              step={5}
                              onSlidingComplete={setDelayMorningDhikr}
                              minimumTrackTintColor="#D4AF37"
                              maximumTrackTintColor="rgba(148, 163, 184, 0.4)"
                            />
                            <Text style={styles.sliderValue}>
                              {dhikrSettings.delayMorningDhikr} min
                            </Text>
                          </View>
                        </View>
                      )}
                      <View style={styles.row}>
                        <Text style={styles.subLabel}>
                          {t("dhikr.categories.evening", "Dhikr du soir")}
                        </Text>
                        <Switch
                          value={dhikrSettings.enabledEveningDhikr}
                          onValueChange={setEnabledEveningDhikr}
                        />
                      </View>
                      {dhikrSettings.enabledEveningDhikr && (
                        <View style={styles.row}>
                          <Text style={styles.label}>
                            {t(
                              "evening_dhikr_delay",
                              "Délai après Maghrib (min)"
                            )}
                          </Text>
                          <View style={styles.sliderContainer}>
                            <Slider
                              style={{ width: "80%", alignSelf: "center" }}
                              value={dhikrSettings.delayEveningDhikr}
                              minimumValue={5}
                              maximumValue={60}
                              step={5}
                              onSlidingComplete={setDelayEveningDhikr}
                              minimumTrackTintColor="#D4AF37"
                              maximumTrackTintColor="rgba(148, 163, 184, 0.4)"
                            />
                            <Text style={styles.sliderValue}>
                              {dhikrSettings.delayEveningDhikr} min
                            </Text>
                          </View>
                        </View>
                      )}
                      <View style={styles.row}>
                        <Text style={styles.subLabel}>
                          {t(
                            "dhikr.categories.selectedDua",
                            "Dua sélectionnée"
                          )}
                        </Text>
                        <Switch
                          value={dhikrSettings.enabledSelectedDua}
                          onValueChange={setEnabledSelectedDua}
                        />
                      </View>
                      {dhikrSettings.enabledSelectedDua && (
                        <View style={styles.row}>
                          <Text style={styles.label}>
                            {t("selected_dua_delay", "Délai après Dhuhr (min)")}
                          </Text>
                          <View style={styles.sliderContainer}>
                            <Slider
                              style={{ width: "80%", alignSelf: "center" }}
                              value={dhikrSettings.delaySelectedDua}
                              minimumValue={5}
                              maximumValue={60}
                              step={5}
                              onSlidingComplete={setDelaySelectedDua}
                              minimumTrackTintColor="#D4AF37"
                              maximumTrackTintColor="rgba(148, 163, 184, 0.4)"
                            />
                            <Text style={styles.sliderValue}>
                              {dhikrSettings.delaySelectedDua} min
                            </Text>
                          </View>
                        </View>
                      )}
                    </>
                  )}
                </>
              ),
            },
          ]
        : [],
    },
    {
      key: "appearance",
      title: t("appearance", "Apparence"),
      data: [
        {
          key: "theme_mode",
          component: (
            <View style={styles.row}>
              <Text style={styles.label}>
                {t("theme_mode", "Mode d'affichage")}
              </Text>
              <View style={styles.locationToggle}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    settings.themeMode === "auto" && styles.toggleButtonActive,
                  ]}
                  onPress={() => settings.setThemeMode("auto")}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      settings.themeMode === "auto" &&
                        styles.toggleButtonTextActive,
                    ]}
                  >
                    {t("theme_auto", "Auto")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    settings.themeMode === "light" && styles.toggleButtonActive,
                  ]}
                  onPress={() => settings.setThemeMode("light")}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      settings.themeMode === "light" &&
                        styles.toggleButtonTextActive,
                    ]}
                  >
                    {t("theme_light", "Jour")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    settings.themeMode === "dark" && styles.toggleButtonActive,
                  ]}
                  onPress={() => settings.setThemeMode("dark")}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      settings.themeMode === "dark" &&
                        styles.toggleButtonTextActive,
                    ]}
                  >
                    {t("theme_dark", "Nuit")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ),
        },
      ],
    },
    // Section Mode Test Premium (uniquement pour les utilisateurs non-premium)
    ...(!user.isPremium
      ? [
          {
            key: "premium_test",
            title: "👑 " + t("premium_test", "Mode Test Premium"),
            data: [
              {
                key: "premium_test_content",
                component: (
                  <View style={styles.premiumTestSection}>
                    <View style={styles.premiumTestInfo}>
                      <MaterialCommunityIcons
                        name="crown"
                        size={24}
                        color="#FFD700"
                      />
                      <Text style={styles.premiumTestDescription}>
                        {t(
                          "premium_test_description",
                          "Activez le mode Premium temporaire pour tester les fonctionnalités avancées comme la sauvegarde cloud."
                        )}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.premiumTestButton}
                      onPress={async () => {
                        try {
                          await activatePremium("yearly", `test-${Date.now()}`);
                          Alert.alert(
                            "🎉 Premium activé !",
                            "Mode Premium temporaire activé. Vous pouvez maintenant tester toutes les fonctionnalités premium !",
                            [
                              {
                                text: "OK",
                                onPress: () => {
                                  // Forcer le rafraîchissement de l'écran
                                  // L'UI se mettra à jour automatiquement grâce au context
                                },
                              },
                            ]
                          );
                        } catch (error) {
                          console.error("Erreur activation Premium:", error);
                          Alert.alert(
                            "Erreur",
                            "Impossible d'activer le mode Premium test"
                          );
                        }
                      }}
                    >
                      <MaterialCommunityIcons
                        name="rocket-launch"
                        size={20}
                        color="#FFF"
                      />
                      <Text style={styles.premiumTestButtonText}>
                        {t(
                          "activate_premium_test",
                          "Activer le Premium (Test)"
                        )}
                      </Text>
                    </TouchableOpacity>

                    <Text style={styles.premiumTestWarning}>
                      {t(
                        "premium_test_warning",
                        "⚠️ Ceci est un mode de test. Dans l'app finale, Premium sera un abonnement payant."
                      )}
                    </Text>
                  </View>
                ),
              },
            ],
          },
        ]
      : []),
    // Section Sauvegarde Cloud Premium (uniquement pour les utilisateurs premium)
    ...(user.isPremium
      ? [
          {
            key: "cloud_backup",
            title: "🔐 " + t("cloud_backup", "Sauvegarde Cloud Premium"),
            data: [
              {
                key: "cloud_backup_content",
                component: (
                  <View style={styles.backupSection}>
                    {/* État de connexion */}
                    <View style={styles.backupRow}>
                      <View style={styles.backupInfo}>
                        <MaterialCommunityIcons
                          name={
                            isSignedIn
                              ? "cloud-check-outline"
                              : "cloud-off-outline"
                          }
                          size={24}
                          color={isSignedIn ? "#4CAF50" : "#FF6B6B"}
                        />
                        <View style={styles.backupTextContainer}>
                          <Text style={styles.backupLabel}>
                            {t("backup_status", "État de la sauvegarde")}
                          </Text>
                          <Text style={styles.backupValue}>
                            {isSignedIn
                              ? `${t("connected", "Connecté")} - ${userEmail}`
                              : t("disconnected", "Déconnecté")}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Dernière sauvegarde */}
                    {lastBackupTime && (
                      <View style={styles.backupRow}>
                        <MaterialCommunityIcons
                          name="clock-outline"
                          size={20}
                          color="#666"
                        />
                        <Text style={styles.backupInfo}>
                          {t("last_backup", "Dernière sauvegarde")}:{" "}
                          {new Date(lastBackupTime).toLocaleString()}
                        </Text>
                      </View>
                    )}

                    {/* Actions de connexion */}
                    {!isSignedIn && (
                      <TouchableOpacity
                        style={styles.backupButton}
                        onPress={signInAnonymously}
                        disabled={isSyncing}
                      >
                        <MaterialCommunityIcons
                          name="cloud-upload-outline"
                          size={20}
                          color="#FFF"
                        />
                        <Text style={styles.backupButtonText}>
                          {isSyncing
                            ? t("connecting", "Connexion...")
                            : t("connect_cloud", "Se connecter au cloud")}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Actions de sauvegarde */}
                    {isSignedIn && (
                      <View style={styles.backupActions}>
                        <TouchableOpacity
                          style={[
                            styles.backupButton,
                            styles.backupButtonSecondary,
                          ]}
                          onPress={backupData}
                          disabled={isSyncing}
                        >
                          <MaterialCommunityIcons
                            name="backup-restore"
                            size={20}
                            color="#2E7D32"
                          />
                          <Text
                            style={[
                              styles.backupButtonText,
                              { color: "#2E7D32" },
                            ]}
                          >
                            {isSyncing && backupStatus === "syncing"
                              ? t("backing_up", "Sauvegarde...")
                              : t("backup_now", "Sauvegarder maintenant")}
                          </Text>
                        </TouchableOpacity>

                        {hasCloudData && (
                          <TouchableOpacity
                            style={[
                              styles.backupButton,
                              styles.backupButtonSecondary,
                            ]}
                            onPress={restoreData}
                            disabled={isSyncing}
                          >
                            <MaterialCommunityIcons
                              name="cloud-download-outline"
                              size={20}
                              color="#1976D2"
                            />
                            <Text
                              style={[
                                styles.backupButtonText,
                                { color: "#1976D2" },
                              ]}
                            >
                              {isSyncing && backupStatus === "syncing"
                                ? t("restoring", "Restauration...")
                                : t("restore_from_cloud", "Restaurer du cloud")}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

                    {/* Sauvegarde automatique */}
                    {isSignedIn && (
                      <View style={styles.backupRow}>
                        <Text style={styles.backupLabel}>
                          {t("auto_backup", "Sauvegarde automatique")}
                        </Text>
                        <Switch
                          value={isAutoBackupEnabled}
                          onValueChange={enableAutoBackup}
                          trackColor={{ false: "#767577", true: "#4CAF50" }}
                          thumbColor={isAutoBackupEnabled ? "#FFF" : "#f4f3f4"}
                        />
                      </View>
                    )}

                    {/* Bouton de déconnexion */}
                    {isSignedIn && (
                      <TouchableOpacity
                        style={[styles.backupButton, styles.backupButtonDanger]}
                        onPress={signOut}
                      >
                        <MaterialCommunityIcons
                          name="logout"
                          size={20}
                          color="#FF6B6B"
                        />
                        <Text
                          style={[
                            styles.backupButtonText,
                            { color: "#FF6B6B" },
                          ]}
                        >
                          {t("disconnect_cloud", "Se déconnecter du cloud")}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Info premium */}
                    <View style={styles.premiumInfo}>
                      <MaterialCommunityIcons
                        name="crown"
                        size={16}
                        color="#FFD700"
                      />
                      <Text style={styles.premiumInfoText}>
                        {t(
                          "backup_premium_feature",
                          "Fonctionnalité premium - Vos favoris et paramètres sont sauvegardés de façon sécurisée"
                        )}
                      </Text>
                    </View>
                  </View>
                ),
              },
            ],
          },
        ]
      : []),
    {
      key: "actions",
      title: t("actions", "Actions"),
      data: [
        {
          key: "actions_content",
          component: (
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={reprogrammateNotifications}
                disabled={isApplyingChanges}
              >
                {isApplyingChanges ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.applyButtonText}>
                    {t("apply_changes", "Appliquer les changements")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ),
        },
      ],
    },
  ];

  return (
    <SectionList
      sections={SECTIONS.filter((section) => section.data.length > 0).map(
        (section) => ({
          ...section,
          data: section.data.filter((item) => item.component !== null),
        })
      )}
      keyExtractor={(item) => item.key}
      renderItem={({ item }) => item.component}
      renderSectionHeader={({ section: { title } }) => (
        <Text style={styles.sectionHeader}>{title}</Text>
      )}
      contentContainerStyle={{ paddingBottom: 150 }}
      stickySectionHeadersEnabled={false}
    />
  );
}

export default function SettingsScreen() {
  const settings = useContext(SettingsContext);
  const { t, i18n } = useTranslation();
  const { user } = usePremium();
  const [isPreviewing, setIsPreviewing] = useState(false);

  // États pour la progression audio
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [currentPlayingAdhan, setCurrentPlayingAdhan] = useState<string | null>(
    null
  );
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Utiliser les couleurs thématiques
  const colors = useThemeColors();
  const overlayTextColor = useOverlayTextColor();
  const overlayIconColor = useOverlayIconColor();
  const currentTheme = useCurrentTheme();
  const soundRef = useRef<Audio.Sound | null>(null);
  const [cityInput, setCityInput] = useState("");
  const {
    results: citySearchResults,
    searchCity,
    setResults,
    loading: citySearchLoading,
  } = useCitySearch();
  const [isApplyingChanges, setIsApplyingChanges] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Styles dynamiques basés sur le thème
  const styles = getStyles(
    colors,
    overlayTextColor,
    overlayIconColor,
    currentTheme
  );

  useEffect(() => {
    // Initialise le champ de recherche avec la ville manuelle sauvegardée
    if (settings?.locationMode === "manual" && settings.manualLocation?.city) {
      setCityInput(settings.manualLocation.city);
    }
  }, [settings?.locationMode, settings?.manualLocation?.city]);

  const reprogrammateNotifications = async () => {
    if (!settings) return;
    setIsApplyingChanges(true);
    await settings.saveAndReprogramAll();

    setIsApplyingChanges(false);
    setShowSuccessModal(true);
  };

  const methods: CalcMethodKey[] = [
    "MuslimWorldLeague",
    "Egyptian",
    "Karachi",
    "UmmAlQura",
    "NorthAmerica",
    "Kuwait",
    "Qatar",
    "Singapore",
    "Tehran",
    "Turkey",
  ];

  const [availableSounds, setAvailableSounds] = useState<AdhanSoundKey[]>([
    "ahmadnafees",
    "ahmedelkourdi",
    "dubai",
    "karljenkins",
    "mansourzahrani",
    "misharyrachid",
    "mustafaozcan",
    "adhamalsharqawe",
    "adhanaljazaer",
    "masjidquba",
    "islamsobhi",
  ]);

  // Map pour stocker les titres des sons premium
  const [premiumSoundTitles, setPremiumSoundTitles] = useState<{
    [key: string]: string;
  }>({});

  // États pour la gestion des adhans premium
  const [availableAdhanVoices, setAvailableAdhanVoices] = useState<
    PremiumContent[]
  >([]);
  const [downloadingAdhans, setDownloadingAdhans] = useState<Set<string>>(
    new Set()
  );
  const [downloadProgress, setDownloadProgress] = useState<{
    [key: string]: number;
  }>({});
  const premiumManager = PremiumContentManager.getInstance();
  const { showToast } = useToast();

  // Fonction pour obtenir le nom d'affichage d'un son
  const getSoundDisplayName = useCallback(
    (soundId: string): string => {
      // D'abord essayer la traduction standard
      const translationKey = `sound_${soundId}`;
      const translatedName = t(translationKey, "");

      // Si la traduction existe et n'est pas vide
      if (translatedName && translatedName !== translationKey) {
        return translatedName;
      }

      // Sinon utiliser le titre premium s'il existe
      if (premiumSoundTitles[soundId]) {
        let cleanTitle = premiumSoundTitles[soundId];

        // Nettoyer les préfixes courants
        const prefixesToRemove = [
          /^Adhan\s*-\s*/i,
          /^Adhan\s*:\s*/i,
          /^Adhan\s+/i,
          /^Son\s*-\s*/i,
          /^Son\s*:\s*/i,
          /^Son\s+/i,
        ];

        for (const regex of prefixesToRemove) {
          cleanTitle = cleanTitle.replace(regex, "");
        }

        return cleanTitle.trim();
      }

      // Fallback: nom formaté à partir de l'ID
      return soundId
        .replace(/[_-]/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
    },
    [t, premiumSoundTitles]
  );

  // Fonction pour vérifier et mettre à jour la liste des sons disponibles
  const updateAvailableSounds = useCallback(async () => {
    try {
      const PremiumContentManager = (await import("../utils/premiumContent"))
        .default;
      const manager = PremiumContentManager.getInstance();

      // Sons de base toujours disponibles
      const baseSounds: AdhanSoundKey[] = [
        "ahmadnafees",
        "ahmedelkourdi",
        "dubai",
        "karljenkins",
        "mansourzahrani",
        "misharyrachid",
        "mustafaozcan",
        "adhamalsharqawe",
        "adhanaljazaer",
        "masjidquba",
        "islamsobhi",
      ];

      // 🔍 Récupérer TOUS les sons premium téléchargés dynamiquement
      const catalog = await manager.getPremiumCatalog();
      const downloadedPremiumSounds: AdhanSoundKey[] = [];
      const premiumTitles: { [key: string]: string } = {};

      if (catalog && catalog.adhanVoices) {
        for (const adhanVoice of catalog.adhanVoices) {
          if (adhanVoice.isDownloaded) {
            downloadedPremiumSounds.push(adhanVoice.id as AdhanSoundKey);
            // Stocker le titre lisible pour ce son premium
            premiumTitles[adhanVoice.id] = adhanVoice.title;
          }
        }
      }

      // Combiner les sons de base + les sons premium téléchargés
      const allAvailableSounds = [...baseSounds, ...downloadedPremiumSounds];

      setAvailableSounds(allAvailableSounds);
      setPremiumSoundTitles(premiumTitles);

      // Charger également tous les adhans premium disponibles (téléchargés et non téléchargés)
      if (catalog && catalog.adhanVoices) {
        setAvailableAdhanVoices(catalog.adhanVoices);
      }

      console.log(
        `✅ Sons disponibles mis à jour: ${baseSounds.length} gratuits + ${downloadedPremiumSounds.length} premium`
      );
    } catch (error) {
      console.log("Erreur vérification sons premium:", error);
      // En cas d'erreur, revenir aux sons de base
      setAvailableSounds([
        "ahmadnafees",
        "ahmedelkourdi",
        "dubai",
        "karljenkins",
        "mansourzahrani",
        "misharyrachid",
        "mustafaozcan",
        "adhamalsharqawe",
        "adhanaljazaer",
        "masjidquba",
        "islamsobhi",
      ]);
    }
  }, []);

  // Vérifier les sons disponibles au chargement et quand l'écran devient actif
  useFocusEffect(
    useCallback(() => {
      updateAvailableSounds();
    }, [updateAvailableSounds])
  );

  // Fonctions pour gérer les téléchargements d'adhans premium
  const handleDownloadAdhan = async (adhan: PremiumContent) => {
    if (!user.isPremium) {
      showToast({
        type: "error",
        title: "Premium requis",
        message: "Les adhans premium sont réservés aux utilisateurs premium",
      });
      return;
    }

    try {
      setDownloadingAdhans((prev) => new Set(prev).add(adhan.id));

      const success = await premiumManager.downloadPremiumContent(
        adhan,
        (progress) => {
          setDownloadProgress((prev) => ({ ...prev, [adhan.id]: progress }));
        }
      );

      if (success) {
        showToast({
          type: "success",
          title: "Téléchargement terminé",
          message: `${adhan.title} téléchargé`,
        });
        await updateAvailableSounds(); // Recharger pour mettre à jour les statuts
      } else {
        showToast({
          type: "error",
          title: "Échec du téléchargement",
          message: `Impossible de télécharger ${adhan.title}`,
        });
      }
    } catch (error) {
      console.error("Erreur téléchargement adhan:", error);
      showToast({
        type: "error",
        title: "Erreur",
        message: "Erreur lors du téléchargement",
      });
    } finally {
      setDownloadingAdhans((prev) => {
        const newSet = new Set(prev);
        newSet.delete(adhan.id);
        return newSet;
      });
      setDownloadProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[adhan.id];
        return newProgress;
      });
    }
  };

  const handleDeleteAdhan = async (adhan: PremiumContent) => {
    Alert.alert(
      "Supprimer l'adhan",
      `Voulez-vous supprimer "${adhan.title}" ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            const success = await premiumManager.deletePremiumContent(adhan.id);
            if (success) {
              showToast({
                type: "info",
                title: "Adhan supprimé",
                message: `${adhan.title} supprimé`,
              });
              await updateAvailableSounds();
            }
          },
        },
      ]
    );
  };

  const languages = [
    { code: "en", label: "English" },
    { code: "fr", label: "Français" },
    { code: "ar", label: "العربية" },
    { code: "tr", label: "Türkçe" },
    { code: "ur", label: "اردو" },
    { code: "ru", label: "Русский" },
    { code: "pt", label: "Português" },
    { code: "nl", label: "Nederlands" },
    { code: "it", label: "Italiano" },
    { code: "fa", label: "فارسی" },
    { code: "es", label: "Español" },
    { code: "de", label: "Deutsch" },
    { code: "bn", label: "বাংলা" },
  ];

  function onChangeLanguage(langCode: string) {
    i18n.changeLanguage(langCode);
    if (settings) {
      settings.setCurrentLanguage(langCode);

      // Reprogrammer automatiquement les notifications pour prendre en compte la nouvelle langue
      // On le fait de manière asynchrone pour ne pas bloquer l'interface
      setTimeout(async () => {
        try {
          await settings.saveAndReprogramAll();
        } catch (error) {}
      }, 100); // Petit délai pour laisser l'interface se mettre à jour d'abord
    }
  }

  const playPreview = async () => {
    if (!settings) return;

    try {
      // Si on a déjà un son chargé, gérer pause/play
      if (currentPlayingAdhan === "main_preview" && soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          if (isPreviewing) {
            await pausePreview();
          } else {
            await resumePreview();
          }
          return;
        }
      }

      // Arrêter l'audio actuel s'il y en a un différent
      if (soundRef.current && currentPlayingAdhan !== "main_preview") {
        await soundRef.current.unloadAsync();
        setPlaybackPosition(0);
        setPlaybackDuration(0);
      }

      setIsLoadingPreview(true);
      setCurrentPlayingAdhan("main_preview");

      let soundSource = soundObjects[settings.adhanSound];

      // Si c'est un son premium (commence par "adhan_" ou pas dans soundObjects), essayer de charger le fichier téléchargé
      if (
        !soundObjects[settings.adhanSound] ||
        settings.adhanSound.startsWith("adhan_")
      ) {
        try {
          const PremiumContentManager = (
            await import("../utils/premiumContent")
          ).default;
          const manager = PremiumContentManager.getInstance();
          const downloadPath = await manager.isContentDownloaded(
            settings.adhanSound
          );
          if (downloadPath) {
            soundSource = { uri: "file://" + downloadPath };
            console.log(
              `✅ Son premium trouvé pour prévisualisation: ${settings.adhanSound}`
            );
          } else {
            console.log(
              `❌ Son premium non téléchargé: ${settings.adhanSound}`
            );
            setIsLoadingPreview(false);
            setCurrentPlayingAdhan(null);
            return;
          }
        } catch (error) {
          console.log(
            "Erreur chargement son premium, abandon de la prévisualisation"
          );
          setIsLoadingPreview(false);
          setCurrentPlayingAdhan(null);
          return;
        }
      }

      const { sound } = await Audio.Sound.createAsync(soundSource);
      soundRef.current = sound;
      setIsPreviewing(true);
      setIsLoadingPreview(false);

      // Callback pour détecter quand le son se termine naturellement avec progression
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPlaybackPosition(status.positionMillis || 0);
          setPlaybackDuration(status.durationMillis || 0);

          if (status.didJustFinish) {
            setIsPreviewing(false);
            setCurrentPlayingAdhan(null);
            setPlaybackPosition(0);
            setPlaybackDuration(0);
          }
        }
      });

      await sound.playAsync();
    } catch (error) {
      console.log("Erreur prévisualisation:", error);
      setIsPreviewing(false);
      setIsLoadingPreview(false);
      setCurrentPlayingAdhan(null);
    }
  };

  const stopPreview = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
    }
    setIsPreviewing(false);
    setCurrentPlayingAdhan(null);
    setPlaybackPosition(0);
    setPlaybackDuration(0);
  };

  // Nouvelles fonctions pour les contrôles audio avancés
  const pausePreview = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.pauseAsync();
        setIsPreviewing(false);
      }
    } catch (error) {
      console.error("Erreur pause audio:", error);
    }
  };

  const resumePreview = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.playAsync();
        setIsPreviewing(true);
      }
    } catch (error) {
      console.error("Erreur reprise audio:", error);
    }
  };

  const seekToPosition = async (positionMillis: number) => {
    try {
      if (soundRef.current) {
        await soundRef.current.setPositionAsync(positionMillis);
      }
    } catch (error) {
      console.error("Erreur navigation audio:", error);
    }
  };

  // Fonction utilitaire pour formater le temps
  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleCityInputChange = (text: string) => {
    setCityInput(text);
    if (text.length > 2) {
      searchCity(text);
    } else {
      setResults([]);
    }
  };

  const selectCity = (city: NominatimResult) => {
    if (!settings) return;
    setCityInput(city.display_name);
    settings.setManualLocation({
      lat: parseFloat(city.lat),
      lon: parseFloat(city.lon),
      city: city.display_name,
    });
    setResults([]);
  };

  if (settings.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text style={styles.loadingText}>
          {t("loading_settings", "Chargement des paramètres...")}
        </Text>
      </View>
    );
  }

  if (settings.errorMsg) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{settings.errorMsg}</Text>
      </View>
    );
  }

  if (!settings || !settings.dhikrSettings) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>
          {t("error_loading_settings", "Erreur critique du contexte.")}
        </Text>
      </View>
    );
  }

  return (
    <ThemedImageBackground style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <Text style={styles.title}>{t("settings_title", "Paramètres")}</Text>
        <SettingsSections
          settings={settings}
          dhikrSettings={settings.dhikrSettings}
          methods={methods}
          sounds={availableSounds}
          languages={languages}
          isPreviewing={isPreviewing}
          playPreview={playPreview}
          stopPreview={stopPreview}
          onChangeLanguage={onChangeLanguage}
          selectedLang={i18n.language}
          reprogrammateNotifications={reprogrammateNotifications}
          handleCityInputChange={handleCityInputChange}
          selectCity={selectCity}
          cityInput={cityInput}
          citySearchResults={citySearchResults}
          citySearchLoading={citySearchLoading}
          isApplyingChanges={isApplyingChanges}
          getSoundDisplayName={getSoundDisplayName}
          styles={styles}
          availableAdhanVoices={availableAdhanVoices}
          downloadingAdhans={downloadingAdhans}
          downloadProgress={downloadProgress}
          handleDownloadAdhan={handleDownloadAdhan}
          handleDeleteAdhan={handleDeleteAdhan}
          // Nouveaux props pour la progression audio
          playbackPosition={playbackPosition}
          playbackDuration={playbackDuration}
          currentPlayingAdhan={currentPlayingAdhan}
          isLoadingPreview={isLoadingPreview}
          pausePreview={pausePreview}
          resumePreview={resumePreview}
          seekToPosition={seekToPosition}
          formatTime={formatTime}
        />
      </SafeAreaView>

      {/* Modal de confirmation mystique */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessModal}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Text style={styles.modalIcon}>🌙</Text>
            </View>
            <Text style={styles.modalTitle}>
              {t("notifications_reprogrammed", "Notifications reprogrammées")}
            </Text>
            <Text style={styles.modalMessage}>
              {t(
                "changes_will_be_active",
                "Vos nouveaux paramètres seront pris en compte pour les prochaines notifications."
              )}
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.modalButtonText}>✨ بارك الله فيك ✨</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ThemedImageBackground>
  );
}

// Fonction pour créer les styles dynamiques
const getStyles = (
  colors: any,
  overlayTextColor: string,
  overlayIconColor: string,
  currentTheme: "light" | "dark"
) =>
  StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      marginTop: 15,
      fontSize: 16,
      color: overlayTextColor,
      fontWeight: "500",
      textShadowColor:
        currentTheme === "light"
          ? "rgba(255, 255, 255, 0.5)"
          : "rgba(0,0,0,0.8)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    errorText: {
      fontSize: 16,
      color: overlayTextColor,
      textAlign: "center",
      marginHorizontal: 20,
      fontWeight: "500",
      textShadowColor:
        currentTheme === "light"
          ? "rgba(255, 255, 255, 0.5)"
          : "rgba(0,0,0,0.8)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    container: {
      flex: 1,
    },
    title: {
      fontSize: 32,
      fontWeight: "800",
      color: overlayTextColor,
      marginBottom: 8,
      marginTop: 16,
      textAlign: "center",
      letterSpacing: -0.5,
      textShadowColor:
        currentTheme === "light"
          ? "rgba(255, 255, 255, 0.5)"
          : "rgba(0,0,0,0.7)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 8,
    },
    sectionHeader: {
      fontSize: 18,
      fontWeight: "700",
      color: currentTheme === "light" ? colors.primary : "#D4AF37",
      backgroundColor:
        currentTheme === "light" ? colors.cardBG : "rgba(15, 23, 42, 0.85)",
      paddingVertical: 16,
      paddingHorizontal: 20,
      marginVertical: 12,
      marginHorizontal: 16,
      borderRadius: 16,
      shadowColor: currentTheme === "light" ? colors.shadow : "#D4AF37",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(212, 175, 55, 0.3)",
      overflow: "hidden",
      textShadowColor:
        currentTheme === "light"
          ? "rgba(255, 255, 255, 0.5)"
          : "rgba(0,0,0,0.8)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    listContentContainer: {
      padding: 16,
      paddingBottom: 32,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 20,
      paddingHorizontal: 24,
      marginVertical: 6,
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(15, 23, 42, 0.75)",
      borderRadius: 16,
      shadowColor: currentTheme === "light" ? colors.shadow : "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 6,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.2)",
      backdropFilter: "blur(10px)",
    },
    label: {
      fontSize: 16,
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      flex: 1,
      fontWeight: "600",
      letterSpacing: -0.2,
      textShadowColor:
        currentTheme === "light"
          ? "rgba(255, 255, 255, 0.5)"
          : "rgba(0,0,0,0.8)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    subLabel: {
      fontSize: 15,
      color: currentTheme === "light" ? colors.text : "#CBD5E1",
      marginLeft: 16,
      flex: 1,
      fontWeight: "500",
      textShadowColor:
        currentTheme === "light"
          ? "rgba(255, 255, 255, 0.5)"
          : "rgba(0,0,0,0.6)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    input: {
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(30, 41, 59, 0.9)",
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      fontSize: 16,
      borderWidth: 2,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
      shadowColor: currentTheme === "light" ? colors.shadow : "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    locationToggle: {
      flexDirection: "row",
      justifyContent: "center",
      marginBottom: 24,
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(15, 23, 42, 0.8)",
      borderRadius: 16,
      padding: 6,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
      shadowColor: currentTheme === "light" ? colors.shadow : "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    toggleButton: {
      paddingVertical: 14,
      paddingHorizontal: 28,
      borderRadius: 12,
      marginHorizontal: 3,
      minWidth: 110,
      alignItems: "center",
      justifyContent: "center",
    },
    toggleButtonActive: {
      backgroundColor:
        currentTheme === "light" ? colors.primary : "rgba(212, 175, 55, 0.9)",
      shadowColor: currentTheme === "light" ? colors.shadow : "#D4AF37",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.primary : "rgba(212, 175, 55, 0.5)",
    },
    toggleButtonText: {
      color: currentTheme === "light" ? colors.textSecondary : "#94A3B8",
      fontSize: 15,
      fontWeight: "600",
      letterSpacing: -0.2,
      textShadowColor:
        currentTheme === "light"
          ? "rgba(255, 255, 255, 0.5)"
          : "rgba(0,0,0,0.6)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    toggleButtonTextActive: {
      color: "#FFFFFF",
      textShadowColor:
        currentTheme === "light" ? "rgba(0, 0, 0, 0.3)" : "rgba(0,0,0,0.8)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    autoLocationSection: {
      alignItems: "center",
      padding: 24,
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(15, 23, 42, 0.8)",
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
      shadowColor: currentTheme === "light" ? colors.shadow : "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
      marginTop: 16,
    },
    refreshButton: {
      backgroundColor:
        currentTheme === "light" ? colors.primary : "rgba(212, 175, 55, 0.9)",
      paddingVertical: 14,
      paddingHorizontal: 28,
      borderRadius: 12,
      marginBottom: 16,
      shadowColor: currentTheme === "light" ? colors.shadow : "#D4AF37",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.primary : "rgba(212, 175, 55, 0.5)",
    },
    refreshButtonText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "600",
      textAlign: "center",
      letterSpacing: -0.2,
      textShadowColor:
        currentTheme === "light" ? "rgba(0, 0, 0, 0.3)" : "rgba(0,0,0,0.8)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    locationText: {
      color: currentTheme === "light" ? colors.textSecondary : "#CBD5E1",
      fontSize: 14,
      textAlign: "center",
      lineHeight: 20,
      fontWeight: "500",
      textShadowColor:
        currentTheme === "light"
          ? "rgba(255, 255, 255, 0.5)"
          : "rgba(0,0,0,0.6)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    resultsList: {
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(30, 41, 59, 0.95)",
      borderRadius: 12,
      marginTop: 8,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
      shadowColor: currentTheme === "light" ? colors.shadow : "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 6,
      overflow: "hidden",
    },
    resultItem: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.2)",
    },
    picker: {
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(30, 41, 59, 0.95)",
      borderRadius: 8,
      fontWeight: "500",
      height: 50,
      width: "100%",
    },
    pickerItem: {
      fontSize: 16,
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      fontWeight: "500",
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(15, 23, 42, 0.98)",
    },
    pickerContainer: {
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(30, 41, 59, 0.95)",
      borderRadius: 12,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.primary : "rgba(212, 175, 55, 0.4)",
      overflow: "hidden",
      height: 50,
      justifyContent: "center",
      minWidth: 140,
      shadowColor: currentTheme === "light" ? colors.shadow : "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    pickerContainerFull: {
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(30, 41, 59, 0.95)",
      borderRadius: 12,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.primary : "rgba(212, 175, 55, 0.4)",
      overflow: "hidden",
      flex: 1,
      marginLeft: 16,
      height: 50,
      justifyContent: "center",
      shadowColor: currentTheme === "light" ? colors.shadow : "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    previewButtonContainer: {
      marginTop: 16,
      alignItems: "center",
    },
    previewButtonFull: {
      backgroundColor:
        currentTheme === "light" ? colors.primary : "rgba(212, 175, 55, 0.9)",
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: 12,
      shadowColor: currentTheme === "light" ? colors.shadow : "#D4AF37",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.primary : "rgba(212, 175, 55, 0.5)",
    },
    previewButtonText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "700",
      textAlign: "center",
      letterSpacing: -0.2,
      textShadowColor:
        currentTheme === "light" ? "rgba(0, 0, 0, 0.3)" : "rgba(0,0,0,0.8)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    sliderContainer: {
      flex: 1,
      marginLeft: 20,
      alignItems: "center",
    },
    sliderValue: {
      marginTop: 8,
      fontSize: 14,
      color: currentTheme === "light" ? colors.primary : "#D4AF37",
      fontWeight: "700",
      textAlign: "center",
      textShadowColor:
        currentTheme === "light"
          ? "rgba(255, 255, 255, 0.5)"
          : "rgba(0,0,0,0.8)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(15, 23, 42, 0.6)",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(212, 175, 55, 0.3)",
    },
    actionsContainer: {
      marginVertical: 25,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 20,
    },
    applyButton: {
      backgroundColor:
        currentTheme === "light" ? colors.primary : "rgba(212, 175, 55, 0.9)",
      paddingVertical: 16,
      paddingHorizontal: 50,
      borderRadius: 16,
      elevation: 8,
      shadowColor: currentTheme === "light" ? colors.shadow : "#D4AF37",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      borderWidth: 2,
      borderColor:
        currentTheme === "light" ? colors.primary : "rgba(212, 175, 55, 0.4)",
      minWidth: 200,
      alignItems: "center",
    },
    applyButtonText: {
      color: "#FFFFFF",
      fontSize: 17,
      fontWeight: "bold",
      letterSpacing: 1,
      textTransform: "uppercase",
      textAlign: "center",
      textShadowColor:
        currentTheme === "light" ? "rgba(0, 0, 0, 0.3)" : "rgba(0,0,0,0.8)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    // Styles pour la modal mystique
    modalOverlay: {
      flex: 1,
      backgroundColor:
        currentTheme === "light" ? "rgba(0, 0, 0, 0.6)" : "rgba(0, 0, 0, 0.8)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    modalContent: {
      backgroundColor:
        currentTheme === "light"
          ? "rgba(255, 255, 255, 0.98)"
          : "rgba(15, 23, 42, 0.95)",
      padding: 28,
      borderRadius: 20,
      alignItems: "center",
      shadowColor: currentTheme === "light" ? colors.shadow : "#D4AF37",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 10,
      borderWidth: 2,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(212, 175, 55, 0.3)",
      width: "90%",
      maxWidth: 350,
    },
    modalIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor:
        currentTheme === "light"
          ? "rgba(34, 139, 34, 0.15)"
          : "rgba(212, 175, 55, 0.2)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 20,
      shadowColor: currentTheme === "light" ? colors.shadow : "#D4AF37",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.primary : "rgba(212, 175, 55, 0.4)",
    },
    modalIcon: {
      fontSize: 40,
      textAlign: "center",
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: "bold",
      color: currentTheme === "light" ? colors.primary : "#D4AF37",
      textAlign: "center",
      marginBottom: 16,
      letterSpacing: 0.5,
      textShadowColor:
        currentTheme === "light"
          ? "rgba(255, 255, 255, 0.5)"
          : "rgba(0,0,0,0.8)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    modalMessage: {
      fontSize: 16,
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      textAlign: "center",
      lineHeight: 24,
      marginBottom: 24,
      paddingHorizontal: 8,
      textShadowColor:
        currentTheme === "light"
          ? "rgba(255, 255, 255, 0.5)"
          : "rgba(0,0,0,0.6)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    modalButton: {
      backgroundColor:
        currentTheme === "light" ? colors.primary : "rgba(212, 175, 55, 0.9)",
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: 16,
      shadowColor: currentTheme === "light" ? colors.shadow : "#D4AF37",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.primary : "rgba(212, 175, 55, 0.5)",
      minWidth: 180,
    },
    modalButtonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "bold",
      textAlign: "center",
      letterSpacing: 0.5,
      textShadowColor:
        currentTheme === "light" ? "rgba(0, 0, 0, 0.3)" : "rgba(0,0,0,0.8)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    // Styles pour la section sauvegarde cloud premium
    backupSection: {
      padding: 20,
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(15, 23, 42, 0.8)",
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
      shadowColor: currentTheme === "light" ? colors.shadow : "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
    backupRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
      paddingVertical: 8,
    },
    backupInfo: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    backupTextContainer: {
      marginLeft: 12,
      flex: 1,
    },
    backupLabel: {
      fontSize: 16,
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      fontWeight: "600",
      marginBottom: 4,
    },
    backupValue: {
      fontSize: 14,
      color: currentTheme === "light" ? colors.textSecondary : "#CBD5E1",
      fontWeight: "500",
    },
    backupButton: {
      backgroundColor:
        currentTheme === "light" ? colors.primary : "rgba(212, 175, 55, 0.9)",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      marginBottom: 12,
      shadowColor: currentTheme === "light" ? colors.shadow : "#D4AF37",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.primary : "rgba(212, 175, 55, 0.5)",
    },
    backupButtonSecondary: {
      backgroundColor: "transparent",
      borderWidth: 2,
      borderColor: currentTheme === "light" ? "#2E7D32" : "#4CAF50",
    },
    backupButtonDanger: {
      backgroundColor: "transparent",
      borderWidth: 2,
      borderColor: "#FF6B6B",
    },
    backupButtonText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "600",
      marginLeft: 8,
      textAlign: "center",
    },
    backupActions: {
      gap: 12,
      marginBottom: 16,
    },
    premiumInfo: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor:
        currentTheme === "light"
          ? "rgba(255, 215, 0, 0.1)"
          : "rgba(212, 175, 55, 0.2)",
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor:
        currentTheme === "light"
          ? "rgba(255, 215, 0, 0.3)"
          : "rgba(212, 175, 55, 0.4)",
      marginTop: 16,
    },
    premiumInfoText: {
      fontSize: 12,
      color: currentTheme === "light" ? colors.textSecondary : "#CBD5E1",
      marginLeft: 8,
      flex: 1,
      lineHeight: 16,
      fontStyle: "italic",
    },

    // Styles pour la section test Premium
    premiumTestSection: {
      padding: 20,
      borderRadius: 16,
      backgroundColor:
        currentTheme === "light"
          ? "rgba(255, 215, 0, 0.08)"
          : "rgba(212, 175, 55, 0.15)",
      borderWidth: 2,
      borderColor: "#FFD700",
      borderStyle: "dashed",
      shadowColor: "#FFD700",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },

    premiumTestInfo: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 20,
    },

    premiumTestDescription: {
      flex: 1,
      fontSize: 15,
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      lineHeight: 22,
      marginLeft: 12,
      fontWeight: "500",
    },

    premiumTestButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#FFD700",
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      marginBottom: 16,
      shadowColor: "#FFD700",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 1,
      borderColor: "#FFC107",
    },

    premiumTestButtonText: {
      fontSize: 16,
      fontWeight: "700",
      color: "#1A1A1A",
      marginLeft: 8,
      letterSpacing: 0.5,
    },

    premiumTestWarning: {
      fontSize: 13,
      color: currentTheme === "light" ? colors.textTertiary : "#94A3B8",
      textAlign: "center",
      fontStyle: "italic",
      lineHeight: 18,
      opacity: 0.8,
    },

    // Styles pour la section adhans premium
    premiumSection: {
      padding: 16,
      backgroundColor:
        currentTheme === "light"
          ? "rgba(255, 215, 0, 0.08)"
          : "rgba(212, 175, 55, 0.15)",
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        currentTheme === "light"
          ? "rgba(255, 215, 0, 0.3)"
          : "rgba(212, 175, 55, 0.4)",
      marginVertical: 8,
    },
    premiumSectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      marginBottom: 16,
      textAlign: "center",
    },
    premiumAdhanItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(15, 23, 42, 0.7)",
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.2)",
    },
    premiumAdhanInfo: {
      flex: 1,
      marginRight: 12,
    },
    premiumAdhanTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      marginBottom: 4,
    },
    premiumAdhanSize: {
      fontSize: 14,
      color: currentTheme === "light" ? colors.textSecondary : "#CBD5E1",
    },
    premiumAdhanActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    downloadProgressContainer: {
      alignItems: "center",
      minWidth: 80,
    },
    progressBarPremium: {
      width: 80,
      height: 6,
      backgroundColor: "rgba(78, 205, 196, 0.2)",
      borderRadius: 3,
      overflow: "hidden",
      marginBottom: 4,
    },
    progressFillPremium: {
      height: "100%",
      backgroundColor: "#4ECDC4",
      borderRadius: 3,
    },
    progressTextPremium: {
      fontSize: 12,
      color: currentTheme === "light" ? colors.textSecondary : "#CBD5E1",
      fontWeight: "600",
    },
    downloadButtonPremium: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(78, 205, 196, 0.1)",
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: "#4ECDC4",
    },
    downloadButtonTextPremium: {
      marginLeft: 6,
      fontSize: 14,
      color: "#4ECDC4",
      fontWeight: "600",
    },
    previewButtonPremium: {
      backgroundColor: "rgba(78, 205, 196, 0.1)",
      borderRadius: 20,
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#4ECDC4",
    },
    deleteButtonPremium: {
      backgroundColor: "rgba(255, 107, 107, 0.1)",
      borderRadius: 20,
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#FF6B6B",
    },

    // Nouveaux styles pour les contrôles audio avancés
    previewControlsContainer: {
      width: "100%",
      gap: 12,
      marginTop: 8,
    },
    previewControls: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      justifyContent: "center",
    },
    playButtonMain: {
      backgroundColor: "#4ECDC4",
      borderRadius: 25,
      width: 50,
      height: 50,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#4ECDC4",
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
    stopButtonMain: {
      backgroundColor: "rgba(231, 200, 106, 0.8)",
      borderRadius: 20,
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#e7c86a",
    },
    progressContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 8,
    },
    timeText: {
      fontSize: 12,
      color: currentTheme === "light" ? colors.textSecondary : "#CBD5E1",
      fontWeight: "600",
      minWidth: 40,
      textAlign: "center",
    },
    progressBarContainer: {
      flex: 1,
      height: 30,
      justifyContent: "center",
      paddingHorizontal: 8,
    },
    progressBar: {
      height: 6,
      backgroundColor: "rgba(148, 163, 184, 0.3)",
      borderRadius: 3,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: "#4ECDC4",
      borderRadius: 3,
    },

    // Styles pour l'indicateur "Téléchargé" simplifié
    downloadedContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    downloadedIndicator: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(78, 205, 196, 0.1)",
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: "rgba(78, 205, 196, 0.3)",
    },
    downloadedText: {
      marginLeft: 6,
      fontSize: 14,
      color: "#4ECDC4",
      fontWeight: "600",
    },
  });
