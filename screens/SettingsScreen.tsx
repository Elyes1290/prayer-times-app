import React, { useContext, useState, useRef, useEffect } from "react";
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
} from "react-native";
import bgImage from "../assets/images/prayer-bg.png";
import {
  SettingsContext,
  AdhanSoundKey,
  CalcMethodKey,
  SettingsContextType,
} from "../contexts/SettingsContext";
import { useCitySearch, NominatimResult } from "../hooks/useCitySearch";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

const soundObjects: Record<AdhanSoundKey, any> = {
  adhamalsharqawe: require("../assets/sounds/adhamalsharqawe.wav"),
  adhanaljazaer: require("../assets/sounds/adhanaljazaer.wav"),
  ahmadnafees: require("../assets/sounds/ahmadnafees.mp3"),
  ahmedelkourdi: require("../assets/sounds/ahmedelkourdi.wav"),
  dubai: require("../assets/sounds/dubai.mp3"),
  karljenkins: require("../assets/sounds/karljenkins.mp3"),
  mansourzahrani: require("../assets/sounds/mansourzahrani.mp3"),
  misharyrachid: require("../assets/sounds/misharyrachid.mp3"),
  mustafaozcan: require("../assets/sounds/mustafaozcan.mp3"),
  masjidquba: require("../assets/sounds/masjidquba.mp3"),
  islamsobhi: require("../assets/sounds/islamsobhi.mp3"),
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
}: SettingsSectionsProps) {
  const { t } = useTranslation();
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
                        label={t(`sound_${sound}`, sound)}
                        value={sound}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
              <View style={styles.previewButtonContainer}>
                <TouchableOpacity
                  onPress={isPreviewing ? stopPreview : playPreview}
                  style={styles.previewButtonFull}
                >
                  <Text style={styles.previewButtonText}>
                    {isPreviewing
                      ? t("stop_preview", "Arrêter")
                      : t("play_preview", "Aperçu")}
                  </Text>
                </TouchableOpacity>
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
      contentContainerStyle={styles.listContentContainer}
      stickySectionHeadersEnabled={false}
    />
  );
}

export default function SettingsScreen() {
  const settings = useContext(SettingsContext);
  const { t, i18n } = useTranslation();
  const [isPreviewing, setIsPreviewing] = useState(false);
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

  const sounds: AdhanSoundKey[] = [
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
    setIsPreviewing(true);
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        soundObjects[settings.adhanSound]
      );
      soundRef.current = sound;

      // Callback pour détecter quand le son se termine naturellement
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPreviewing(false);
        }
      });

      await sound.playAsync();
    } catch (error) {
      setIsPreviewing(false); // Seulement en cas d'erreur
    }
  };

  const stopPreview = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
    }
    setIsPreviewing(false);
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
    <ImageBackground source={bgImage} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <Text style={styles.title}>{t("settings_title", "Paramètres")}</Text>
        <SettingsSections
          settings={settings}
          dhikrSettings={settings.dhikrSettings}
          methods={methods}
          sounds={sounds}
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
          <ImageBackground
            source={bgImage}
            style={styles.modalImageBackground}
            imageStyle={styles.modalImageStyle}
          >
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
          </ImageBackground>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#F8FAFC",
    fontWeight: "500",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  errorText: {
    fontSize: 16,
    color: "#FEF2F2",
    textAlign: "center",
    marginHorizontal: 20,
    fontWeight: "500",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  container: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
    marginTop: 16,
    textAlign: "center",
    letterSpacing: -0.5,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: "#D4AF37",
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginVertical: 12,
    marginHorizontal: 16,
    borderRadius: 16,
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
    overflow: "hidden",
    textShadowColor: "rgba(0,0,0,0.8)",
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
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    backdropFilter: "blur(10px)",
  },
  label: {
    fontSize: 16,
    color: "#F8FAFC",
    flex: 1,
    fontWeight: "600",
    letterSpacing: -0.2,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subLabel: {
    fontSize: 15,
    color: "#CBD5E1",
    marginLeft: 16,
    flex: 1,
    fontWeight: "500",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  input: {
    backgroundColor: "rgba(30, 41, 59, 0.9)",
    color: "#F8FAFC",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 2,
    borderColor: "rgba(148, 163, 184, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  locationToggle: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderRadius: 16,
    padding: 6,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)",
    shadowColor: "#000",
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
    backgroundColor: "rgba(212, 175, 55, 0.9)",
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.5)",
  },
  toggleButtonText: {
    color: "#94A3B8",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  toggleButtonTextActive: {
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  autoLocationSection: {
    alignItems: "center",
    padding: 24,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    marginTop: 16,
  },
  refreshButton: {
    backgroundColor: "rgba(212, 175, 55, 0.9)",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.5)",
  },
  refreshButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: -0.2,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  locationText: {
    color: "#CBD5E1",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    fontWeight: "500",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  resultsList: {
    backgroundColor: "rgba(30, 41, 59, 0.95)",
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
    overflow: "hidden",
  },
  resultItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.2)",
  },
  picker: {
    color: "#F8FAFC",
    backgroundColor: "rgba(30, 41, 59, 0.95)",
    borderRadius: 8,
    fontWeight: "500",
    height: 50,
    width: "100%",
  },
  pickerItem: {
    fontSize: 16,
    color: "#F8FAFC",
    fontWeight: "500",
    backgroundColor: "rgba(15, 23, 42, 0.98)",
  },
  pickerContainer: {
    backgroundColor: "rgba(30, 41, 59, 0.95)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.4)",
    overflow: "hidden",
    height: 50,
    justifyContent: "center",
    minWidth: 140,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  pickerContainerFull: {
    backgroundColor: "rgba(30, 41, 59, 0.95)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.4)",
    overflow: "hidden",
    flex: 1,
    marginLeft: 16,
    height: 50,
    justifyContent: "center",
    shadowColor: "#000",
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
    backgroundColor: "rgba(212, 175, 55, 0.9)",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.5)",
  },
  previewButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.2,
    textShadowColor: "rgba(0,0,0,0.8)",
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
    color: "#D4AF37",
    fontWeight: "700",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
  },
  actionsContainer: {
    marginVertical: 25,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  applyButton: {
    backgroundColor: "rgba(212, 175, 55, 0.9)",
    paddingVertical: 16,
    paddingHorizontal: 50,
    borderRadius: 16,
    elevation: 8,
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(212, 175, 55, 0.4)",
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
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  // Styles pour la modal mystique
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalImageBackground: {
    width: "100%",
    maxWidth: 350,
    paddingHorizontal: 20,
    paddingVertical: 30,
    borderRadius: 24,
    overflow: "hidden",
  },
  modalImageStyle: {
    borderRadius: 24,
    opacity: 0.3,
  },
  modalContent: {
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    padding: 28,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 2,
    borderColor: "rgba(212, 175, 55, 0.3)",
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(212, 175, 55, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalIcon: {
    fontSize: 40,
    textAlign: "center",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#D4AF37",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: 0.5,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  modalMessage: {
    fontSize: 16,
    color: "#F8FAFC",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 8,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modalButton: {
    backgroundColor: "rgba(212, 175, 55, 0.9)",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.5)",
    minWidth: 180,
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
