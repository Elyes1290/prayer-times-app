/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, {
  useContext,
  useRef,
  useEffect,
  useCallback,
  useState,
} from "react";
import audioManager from "../utils/AudioManager";
import {
  SectionList,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import ThemedImageBackground from "../components/ThemedImageBackground";
import {
  SettingsContext,
  AdhanSoundKey,
  CalcMethodKey,
} from "../contexts/SettingsContext";
import {
  useThemeColors,
  useOverlayTextColor,
  useOverlayIconColor,
  useCurrentTheme,
} from "../hooks/useThemeColor";
import { NominatimResult, useCitySearch } from "../hooks/useCitySearch";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { usePremium } from "../contexts/PremiumContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useToast } from "../contexts/ToastContext";

import PremiumContentManager, { PremiumContent } from "../utils/premiumContent";
import { useNativeDownload } from "../hooks/useNativeDownload";
import { useSettingsOptimized } from "../hooks/useSettingsOptimized";

import AdhanSoundSection from "../components/settings/AdhanSoundSection";
import DhikrSection from "../components/settings/DhikrSection";
import GeneralSection from "../components/settings/GeneralSection";
import LocationSection from "../components/settings/LocationSection";
import BackupSection from "../components/settings/BackupSection";
import AccountManagementSection from "../components/settings/AccountManagementSection";
import AppearanceSection from "../components/settings/AppearanceSection";
import { LocalStorageManager } from "../utils/localStorageManager";

// 🚀 Import des nouveaux composants optimisés
import SettingsGrid from "../components/settings/layout/SettingsGrid";
import SettingsHeader from "../components/settings/layout/SettingsHeader";
import SettingsModals from "../components/settings/layout/SettingsModals";
import { getStyles } from "../styles/SettingsScreen.styles";

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

interface OptimizedSettingsSectionsProps {
  settings: any;
  dhikrSettings: any;
  methods: CalcMethodKey[];
  sounds: AdhanSoundKey[];
  languages: { code: string; label: string }[];
  selectedLang: string;
  onChangeLanguage: (langCode: string) => void;
  reprogrammateNotifications: () => Promise<void>;
  cityInput: string;
  citySearchResults: NominatimResult[];
  citySearchLoading: boolean;
  handleCityInputChange: (text: string) => void;
  selectCity: (city: NominatimResult) => void;
  isPreviewing: boolean;
  isAudioPlaying: boolean;
  currentPlayingAdhan: string | null;
  isLoadingPreview: boolean;
  playPreview: () => void;
  stopPreview: () => void;
  pausePreview: () => Promise<void>;
  resumePreview: () => Promise<void>;
  isPlayingPremiumAdhan: boolean;
  currentPlayingPremiumAdhan: string | null;
  premiumAdhanPlaybackPosition: number;
  premiumAdhanPlaybackDuration: number;
  isLoadingPremiumAdhan: boolean;
  playPremiumAdhan: (adhan: PremiumContent) => Promise<void>;
  pausePremiumAdhan: () => Promise<void>;
  resumePremiumAdhan: () => Promise<void>;
  seekPremiumAdhanPosition: (position: number) => Promise<void>;
  stopPremiumAdhan: () => Promise<void>;
  availableAdhanVoices: PremiumContent[];
  downloadingAdhans: Set<string>;
  downloadProgress: { [key: string]: number };
  isApplyingChanges: boolean;
  downloadState: Map<
    string,
    {
      isDownloading: boolean;
      progress: number;
      error: string | null;
      localUri?: string;
    }
  >;
  handleDownloadAdhan: (adhan: PremiumContent) => Promise<void>;
  handleDeleteAdhan: (adhan: PremiumContent) => Promise<void>;
  handleCancelDownload: (adhanId: string) => void;
  loadAvailableAdhans: (forceRefresh?: boolean) => Promise<void>;
  getSoundDisplayName: (soundId: string) => string;
  formatTime: (milliseconds: number) => string;
  activatePremium: (
    type: "monthly" | "yearly" | "family",
    subscriptionId: string
  ) => Promise<void>;
  showToast: (toast: {
    type: "success" | "error" | "info";
    title: string;
    message: string;
  }) => void;
  handleBuyPremium: () => void;
  onLoginSuccess: (userData: any) => void;
  forceLogout: () => Promise<void>;
  user: any;
  cleanupCorruptedFiles: () => Promise<void>;
  diagnoseAndCleanFiles: () => Promise<void>;
  updateAvailableSounds: () => void;
  forceRefreshAdhans: () => Promise<void>;
  premiumContent: any;
  sectionListRef: React.RefObject<SectionList<any, any> | null>;
  styles: any;
  activeSection: string | null;
  setActiveSection: (sectionId: string | null) => void;
  currentTheme: "light" | "dark" | "morning" | "sunset";
  setThemeMode: (
    mode: "auto" | "light" | "dark" | "morning" | "sunset"
  ) => void;
  hasPendingChanges: boolean;
  markPendingChanges: () => void;
  applyAllChanges: () => void;
  navigation: any;
  openPremiumModal: () => void;
  locationUIMode: "auto" | "manual";
  setLocationUIMode: (mode: "auto" | "manual") => void;
  t: any;
}

function SettingsSections(props: OptimizedSettingsSectionsProps) {
  const {
    settings,
    styles,
    activeSection,
    setActiveSection,
    currentTheme,
    setThemeMode,
    user,
    updateAvailableSounds,
    t: propT,
  } = props;

  const { t } = useTranslation();
  const isLightTheme = currentTheme === "light" || currentTheme === "morning";

  // États locaux pour le dhikr
  const [allDhikrEnabled, setAllDhikrEnabled] = useState(true);

  // Gestionnaires de Toggle
  const toggleAllDhikr = async (value: boolean) => {
    setAllDhikrEnabled(value);
    if (!value) {
      settings.setEnabledAfterSalah(false);
      settings.setEnabledMorningDhikr(false);
      settings.setEnabledEveningDhikr(false);
      settings.setEnabledSelectedDua(false);
    } else {
      settings.setEnabledAfterSalah(true);
      settings.setEnabledMorningDhikr(true);
      settings.setEnabledEveningDhikr(true);
      settings.setEnabledSelectedDua(true);
    }
    props.markPendingChanges();
  };

  const handleNotificationsToggle = async (value: boolean) => {
    settings.setNotificationsEnabled(value);
    if (!value) {
      settings.setRemindersEnabled(false);
      setAllDhikrEnabled(false);
      settings.setEnabledAfterSalah(false);
      settings.setEnabledMorningDhikr(false);
      settings.setEnabledEveningDhikr(false);
      settings.setEnabledSelectedDua(false);
    }
    props.markPendingChanges();
  };

  const handleSectionToggle = async (sectionId: string) => {
    if (activeSection === sectionId) {
      setActiveSection(null);
    } else {
      setActiveSection(sectionId);
      if (sectionId === "adhan_sound" && user?.isPremium) {
        try {
          await updateAvailableSounds();
          // 🚀 NOUVEAU : Charger aussi le catalogue pour la liste premium
          await props.loadAvailableAdhans();
        } catch (error) {
          console.error("❌ Erreur scan adhans:", error);
        }
      }
    }
  };

  const closeActiveSection = () => setActiveSection(null);

  // Wrappers pour memoization
  const LocationSectionWrapper = React.memo(function LocationSectionWrapper() {
    const stableSetLocationMode = useCallback(
      (mode: "auto" | "manual") => settings.setLocationMode(mode),
      [settings.setLocationMode]
    );

    const locationSections = LocationSection({
      locationMode: settings.locationMode,
      autoLocation: settings.autoLocation,
      isRefreshingLocation: settings.isRefreshingLocation,
      cityInput: props.cityInput,
      citySearchResults: props.citySearchResults,
      citySearchLoading: props.citySearchLoading,
      setLocationMode: stableSetLocationMode,
      refreshAutoLocation: settings.refreshAutoLocation,
      handleCityInputChange: props.handleCityInputChange,
      selectCity: props.selectCity,
      styles: styles,
      setActiveSection: setActiveSection,
      uiMode: props.locationUIMode,
      setUIMode: props.setLocationUIMode,
    });

    const locationComponent = locationSections[0]?.data[0]?.component;
    return (
      locationComponent || (
        <View style={{ padding: 16 }}>
          <Text style={styles.sectionTitle}>Section Localisation</Text>
        </View>
      )
    );
  });

  const GeneralSectionWrapper = React.memo(function GeneralSectionWrapper() {
    const generalSections = GeneralSection({
      notificationsEnabled: settings.notificationsEnabled,
      remindersEnabled: settings.remindersEnabled,
      reminderOffset: settings.reminderOffset,
      duaAfterAdhanEnabled: settings.duaAfterAdhanEnabled,
      handleNotificationsToggle: handleNotificationsToggle,
      setDuaAfterAdhanEnabled: (enabled) => {
        settings.setDuaAfterAdhanEnabled(enabled);
        props.markPendingChanges();
      },
      markPendingChanges: props.markPendingChanges,
      setRemindersEnabled: (enabled) => {
        settings.setRemindersEnabled(enabled);
        props.markPendingChanges();
      },
      setReminderOffset: (offset) => {
        settings.setReminderOffset(offset);
        props.markPendingChanges();
      },
      styles: styles,
    });

    return (
      <View style={{ gap: 20 }}>
        {generalSections.map((section, sectionIndex) => (
          <View key={section.key || sectionIndex}>
            {section.data?.map((item, itemIndex) => (
              <View key={item.key || itemIndex}>{item.component}</View>
            ))}
          </View>
        ))}
      </View>
    );
  });

  const DhikrSectionWrapper = React.memo(function DhikrSectionWrapper() {
    const dhikrSections = DhikrSection({
      dhikrSettings: settings.dhikrSettings,
      allDhikrEnabled: allDhikrEnabled,
      notificationsEnabled: settings.notificationsEnabled,
      toggleAllDhikr: toggleAllDhikr,
      markPendingChanges: props.markPendingChanges,
      setEnabledAfterSalah: (enabled) => {
        settings.setEnabledAfterSalah(enabled);
        props.markPendingChanges();
      },
      setEnabledMorningDhikr: (enabled) => {
        settings.setEnabledMorningDhikr(enabled);
        props.markPendingChanges();
      },
      setEnabledEveningDhikr: (enabled) => {
        settings.setEnabledEveningDhikr(enabled);
        props.markPendingChanges();
      },
      setEnabledSelectedDua: (enabled) => {
        settings.setEnabledSelectedDua(enabled);
        props.markPendingChanges();
      },
      setDelayMorningDhikr: (delay) => {
        settings.setDelayMorningDhikr(delay);
        props.markPendingChanges();
      },
      setDelayEveningDhikr: (delay) => {
        settings.setDelayEveningDhikr(delay);
        props.markPendingChanges();
      },
      setDelaySelectedDua: (delay) => {
        settings.setDelaySelectedDua(delay);
        props.markPendingChanges();
      },
      styles: styles,
    });

    return (
      <View style={{ gap: 20 }}>
        {dhikrSections.map((section, sectionIndex) => (
          <View key={section.key || sectionIndex}>
            {section.data?.map((item, itemIndex) => (
              <View key={item.key || itemIndex}>{item.component}</View>
            ))}
          </View>
        ))}
      </View>
    );
  });

  const AdhanSoundSectionWrapper = React.memo(
    function AdhanSoundSectionWrapper() {
      const adhanSections = AdhanSoundSection({
        isPreviewing: props.isPreviewing,
        isAudioPlaying: props.isAudioPlaying,
        currentPlayingAdhan: props.currentPlayingAdhan,
        isLoadingPreview: props.isLoadingPreview,
        isPlayingPremiumAdhan: props.isPlayingPremiumAdhan,
        currentPlayingPremiumAdhan: props.currentPlayingPremiumAdhan,
        premiumAdhanPlaybackPosition: props.premiumAdhanPlaybackPosition,
        premiumAdhanPlaybackDuration: props.premiumAdhanPlaybackDuration,
        isLoadingPremiumAdhan: props.isLoadingPremiumAdhan,
        availableAdhanVoices: props.availableAdhanVoices,
        downloadingAdhans: props.downloadingAdhans,
        downloadProgress: props.downloadProgress,
        downloadState: props.downloadState,
        settings: settings,
        calcMethod: settings.calcMethod,
        setCalcMethod: (value) => {
          settings.setCalcMethod(value);
          props.markPendingChanges();
        },
        adhanSound: settings.adhanSound,
        setAdhanSound: (value) => {
          settings.setAdhanSound(value);
          props.markPendingChanges();
        },
        adhanVolume: settings.adhanVolume,
        setAdhanVolume: (value) => {
          settings.setAdhanVolume(value);
          props.markPendingChanges();
        },
        methods: props.methods,
        sounds: props.sounds,
        user: user,
        playPreview: props.playPreview,
        stopPreview: props.stopPreview,
        pausePreview: props.pausePreview,
        resumePreview: props.resumePreview,
        playPremiumAdhan: props.playPremiumAdhan,
        pausePremiumAdhan: props.pausePremiumAdhan,
        resumePremiumAdhan: props.resumePremiumAdhan,
        seekPremiumAdhanPosition: props.seekPremiumAdhanPosition,
        stopPremiumAdhan: props.stopPremiumAdhan,
        handleDownloadAdhan: props.handleDownloadAdhan,
        handleDeleteAdhan: props.handleDeleteAdhan,
        handleCancelDownload: props.handleCancelDownload,
        getSoundDisplayName: props.getSoundDisplayName,
        formatTime: props.formatTime,
        isRefreshingAdhans: false,
        isCleaningFiles: false,
        handleRefreshAdhans: async () => {
          await props.loadAvailableAdhans(true);
          await props.updateAvailableSounds();
        },
        handleCleanFiles: props.cleanupCorruptedFiles,
        updateAvailableSounds: props.updateAvailableSounds,
        forceRefreshAdhans: props.forceRefreshAdhans,
        markPendingChanges: props.markPendingChanges,
        styles: styles,
      });

      return (
        <View style={{ gap: 20 }}>
          {adhanSections.map((section, index) => (
            <View key={section.key || index}>{section.component}</View>
          ))}
        </View>
      );
    }
  );

  const BackupSectionWrapper = React.memo(function BackupSectionWrapper() {
    const backupSections = BackupSection({ styles: styles });
    return (
      <View style={{ gap: 20 }}>
        {backupSections.map((section, sectionIndex) => (
          <View key={section.key || sectionIndex}>
            {section.data?.map((item, itemIndex) => (
              <View key={item.key || itemIndex}>{item.component}</View>
            ))}
          </View>
        ))}
      </View>
    );
  });

  const renderActiveSectionContent = () => {
    if (!activeSection) return null;

    const sectionContent = {
      location: <LocationSectionWrapper />,
      adhan_sound: <AdhanSoundSectionWrapper />,
      notifications: <GeneralSectionWrapper />,
      dhikr_dua: <DhikrSectionWrapper />,
      appearance: (
        <AppearanceSection
          selectedLang={props.selectedLang}
          languages={props.languages}
          onChangeLanguage={props.onChangeLanguage}
          currentTheme={settings.themeMode}
          setThemeMode={settings.setThemeMode}
          backgroundImageType={settings.backgroundImageType} // 🖼️ NOUVEAU : Type d'image de fond
          setBackgroundImageType={settings.setBackgroundImageType} // 🖼️ NOUVEAU : Setter pour le type d'image
          styles={styles}
          t={t}
          isPremium={user?.isPremium || false}
          onShowPremiumModal={props.handleBuyPremium}
        />
      ),
      backup: <BackupSectionWrapper />,
      account_management: (
        <AccountManagementSection
          user={user}
          currentTheme={currentTheme}
          styles={styles}
          showToast={props.showToast}
          forceLogout={props.forceLogout}
          t={t}
          setActiveSection={setActiveSection}
          navigation={props.navigation}
        />
      ),
      about: (
        <View style={{ padding: 16 }}>
          <Text style={styles.sectionTitle}>{t("about", "À propos")}</Text>
          <View style={{ marginTop: 16, gap: 12 }}>
            <View style={styles.row}>
              <Text style={styles.label}>{t("version", "Version")}</Text>
              <Text style={styles.settingValue}>
                {Constants.expoConfig?.version || "1.0.3"} (Build{" "}
                {Constants.expoConfig?.android?.versionCode || "48"})
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t("developer", "Développeur")}</Text>
              <Text style={styles.settingValue}>Drogbinho</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>
                {t("last_update", "Dernière mise à jour")}
              </Text>
              <Text style={styles.settingValue}>14 septembre 2025</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>{t("status", "Statut")}</Text>
              <View style={styles.premiumStatusContainer}>
                <MaterialCommunityIcons
                  name={user?.isPremium ? "crown" : "account"}
                  size={16}
                  color={user?.isPremium ? "#FFD700" : "#666"}
                />
                <Text
                  style={[
                    styles.premiumStatusText,
                    {
                      color: user?.isPremium ? "#FFD700" : "#666",
                      marginBottom: 0,
                    },
                  ]}
                >
                  {user?.isPremium
                    ? t("premium_status", "Premium")
                    : t("free", "Gratuit")}
                </Text>
              </View>
            </View>

            {user && (
              <>
                <View style={styles.row}>
                  <Text style={styles.label}>
                    {t("account_label", "Compte")}
                  </Text>
                  <Text style={styles.settingValue}>
                    {user.user_first_name ||
                      user.email ||
                      t("user", "Utilisateur")}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.row, { marginTop: 8 }]}
                  onPress={() => setActiveSection("account_management")}
                >
                  <Text style={styles.label}>
                    {t("manage_account", "Gérer le compte")}
                  </Text>
                  <MaterialCommunityIcons
                    name="account-cog"
                    size={20}
                    color={isLightTheme ? "#333333" : "#F8FAFC"}
                  />
                </TouchableOpacity>
              </>
            )}

            {/* DEBUG: Bouton caché pour la prod
            {Platform.OS === "ios" && (
              <TouchableOpacity
                style={[
                  styles.row,
                  {
                    marginTop: 20,
                    backgroundColor: "rgba(255, 165, 0, 0.1)",
                    borderColor: "orange",
                  },
                ]}
                onPress={() => props.navigation.navigate("debugNotifications")}
              >
                <Text style={[styles.label, { color: "orange" }]}>
                  🐛 Debug Notifications (iOS)
                </Text>
                <MaterialCommunityIcons
                  name="bug-outline"
                  size={20}
                  color="orange"
                />
              </TouchableOpacity>
            )}
            */}

            <TouchableOpacity
              style={[styles.row, { marginTop: 20 }]}
              onPress={() => {
                Alert.alert(
                  t("license", "Licence"),
                  t(
                    "license_text",
                    "Cette application est développée avec amour pour la communauté musulmane."
                  )
                );
              }}
            >
              <Text style={styles.label}>{t("license", "Licence")}</Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={isLightTheme ? "#333333" : "#F8FAFC"}
              />
            </TouchableOpacity>
          </View>
        </View>
      ),
      help: (
        <View style={{ padding: 16 }}>
          <Text style={styles.sectionTitle}>{t("help", "Aide")}</Text>
          <View style={{ marginTop: 16, gap: 12 }}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => {
                Alert.alert(
                  t("contact_support", "Contact Support"),
                  t("support_email", "support@prayertimes.app")
                );
              }}
            >
              <Text style={styles.label}>
                {t("contact_support", "Contact Support")}
              </Text>
              <MaterialCommunityIcons
                name="email"
                size={20}
                color={isLightTheme ? "#333333" : "#F8FAFC"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.row}
              onPress={() => {
                Alert.alert(
                  t("faq", "FAQ"),
                  t("faq_text", "Questions fréquemment posées")
                );
              }}
            >
              <Text style={styles.label}>{t("faq", "FAQ")}</Text>
              <MaterialCommunityIcons
                name="help-circle"
                size={20}
                color={isLightTheme ? "#333333" : "#F8FAFC"}
              />
            </TouchableOpacity>
          </View>
        </View>
      ),
    };

    const settingsButtons = [
      { id: "location", title: t("location", "Localisation") },
      { id: "adhan_sound", title: t("adhan_sound", "Son et Adhan") },
      { id: "notifications", title: t("notifications", "Notifications") },
      { id: "dhikr_dua", title: t("dhikr_dua", "Dhikr & Doua") },
      { id: "appearance", title: t("appearance", "Apparence") },
      { id: "backup", title: t("backup", "Sauvegarde") },
      {
        id: "account_management",
        title: t("manage_account", "Gérer le compte"),
      },
      { id: "about", title: t("about", "À propos") },
      { id: "help", title: t("help", "Aide") },
    ];

    return (
      <View style={styles.activeSectionContainer}>
        <View style={styles.activeSectionHeader}>
          <Text style={styles.activeSectionTitle}>
            {
              settingsButtons.find((btn: any) => btn.id === activeSection)
                ?.title
            }
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={closeActiveSection}
          >
            <MaterialCommunityIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        <View style={styles.activeSectionContent}>
          {sectionContent[activeSection as keyof typeof sectionContent]}
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingBottom: props.hasPendingChanges ? 160 : 100,
      }}
      showsVerticalScrollIndicator={false}
    >
      <SettingsHeader
        t={t}
        currentTheme={currentTheme}
        setThemeMode={setThemeMode}
        onPremiumPress={() => props.openPremiumModal()}
        overlayTextColor={styles.text.color}
        styles={styles}
        isPremium={user?.isPremium || false}
      />

      <SettingsGrid
        t={t}
        activeSection={activeSection}
        handleSectionToggle={handleSectionToggle}
        isPremium={user?.isPremium}
        styles={styles}
      />

      {renderActiveSectionContent()}

      {props.hasPendingChanges && (
        <View style={styles.applyChangesContainer}>
          <TouchableOpacity
            style={styles.applyChangesButton}
            onPress={props.applyAllChanges}
            activeOpacity={0.8}
          >
            <View style={styles.applyChangesIconContainer}>
              <MaterialCommunityIcons
                name="bell-ring"
                size={26}
                color="#FFFFFF"
              />
              <View style={styles.applyChangesBadge}>
                <Text style={styles.applyChangesBadgeText}>!</Text>
              </View>
            </View>
            <View style={styles.applyChangesTextContainer}>
              <Text style={styles.applyChangesButtonTitle}>
                {t("apply_and_reprogram", "Appliquer & Reprogrammer")}
              </Text>
              <Text style={styles.applyChangesButtonSubtitle}>
                {t("reprogram_notifications", "Notifications • Adhan • Dhikr")}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

export default function SettingsScreenOptimized() {
  const settings = useContext(SettingsContext);
  const { t, i18n } = useTranslation();
  const { user, activatePremium, forceLogout } = usePremium();
  const { showToast } = useToast();
  const navigation = useNavigation();

  const { openLocation, mode, openPremium, premiumTab } =
    useLocalSearchParams();

  const {
    audioPlayer,
    citySearch,
    downloadManager,
    uiManager,
    premiumContent,
  } = useSettingsOptimized();

  const citySearchAPI = useCitySearch();
  const sectionListRef = useRef<SectionList>(null);

  const colors = useThemeColors();
  const overlayTextColor = useOverlayTextColor();
  const overlayIconColor = useOverlayIconColor();
  const currentTheme = useCurrentTheme();
  const isLightTheme = currentTheme === "light" || currentTheme === "morning";

  const styles = React.useMemo(
    () => getStyles(colors, overlayTextColor, overlayIconColor, currentTheme),
    [colors, overlayTextColor, overlayIconColor, currentTheme]
  );

  const { downloadState, isNativeAvailable, forceRefreshAdhans } =
    useNativeDownload();

  const processedThisCycleRef = useRef<Set<string>>(new Set());
  const permanentlyProcessedRef = useRef<Set<string>>(new Set());

  type AlertButton = {
    text: string;
    onPress: () => void;
    style?: "default" | "cancel" | "destructive";
  };

  const [themedAlert, setThemedAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: AlertButton[];
  } | null>(null);

  const [activeSection, setActiveSection] = useState<string | null>(null);

  const [locationUIMode, setLocationUIMode] = useState<"auto" | "manual">(
    settings.locationMode || "auto"
  );

  useEffect(() => {
    if (settings.locationMode === "manual") {
      setLocationUIMode("manual");
    }
  }, [settings.locationMode]);

  useEffect(() => {
    if (openPremium === "true") {
      uiManager.setShowPremiumModal(true);
    }
  }, [openPremium]);

  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  const showThemedAlert = useCallback(
    (alert: {
      title: string;
      message: string;
      buttons: AlertButton[];
      iconType?:
        | "info"
        | "success"
        | "warning"
        | "error"
        | "download"
        | "delete"
        | "question";
    }) => {
      setThemedAlert({
        visible: true,
        ...alert,
      });
    },
    []
  );

  const methods = [
    "MuslimWorldLeague",
    "Egyptian",
    "Karachi",
    "UmmAlQura",
    "Qatar",
    "Kuwait",
    "Singapore",
    "Turkey",
    "Tehran",
    "NorthAmerica",
  ] as CalcMethodKey[];

  const languages = [
    { code: "fr", label: "Français" },
    { code: "en", label: "English" },
    { code: "ar", label: "العربية" },
    { code: "es", label: "Español" },
    { code: "de", label: "Deutsch" },
    { code: "it", label: "Italiano" },
    { code: "pt", label: "Português" },
    { code: "tr", label: "Türkçe" },
    { code: "ru", label: "Русский" },
    { code: "ur", label: "اردو" },
    { code: "bn", label: "বাংলা" },
    { code: "fa", label: "فارسی" },
    { code: "nl", label: "Nederlands" },
  ];

  const handleLoginSuccess = (userData: any) => {
    // Logique post-login si nécessaire
  };

  useEffect(() => {
    if (settings?.locationMode === "manual" && settings.manualLocation?.city) {
      citySearch.setCityInput(settings.manualLocation.city);
    }
  }, [settings?.locationMode, settings?.manualLocation?.city]);

  useEffect(() => {
    return () => {
      if (audioPlayer.audioState.premiumAdhanSound) {
        audioPlayer.audioState.premiumAdhanSound.unloadAsync();
      }
    };
  }, [audioPlayer.audioState.premiumAdhanSound]);

  const markPendingChanges = () => {
    setHasPendingChanges(true);
  };

  const applyAllChanges = async () => {
    if (!settings) {
      showToast({
        type: "error",
        title: t("toast_error"),
        message: t("toast_configuration_unavailable"),
      });
      return;
    }

    showThemedAlert({
      title: t("apply_changes_title", "Appliquer les modifications"),
      message: t(
        "apply_changes_message",
        "Voulez-vous appliquer tous les changements et reprogrammer les notifications ?"
      ),
      buttons: [
        { text: t("cancel", "Annuler"), style: "cancel", onPress: () => {} },
        {
          text: t("apply", "Appliquer"),
          style: "default",
          onPress: async () => {
            try {
              uiManager.setIsApplyingChanges(true);
              await settings.saveAndReprogramAll();
              setHasPendingChanges(false);
              uiManager.setShowSuccessModal(true);
            } catch (error) {
              console.log("❌ Erreur application des changements:", error);
              showToast({
                type: "error",
                title: t("toast_error"),
                message: t("toast_apply_changes_error"),
              });
            } finally {
              uiManager.setIsApplyingChanges(false);
            }
          },
        },
      ],
      iconType: "question",
    });
  };

  const reprogrammateNotifications = async () => {
    markPendingChanges();
  };

  const getSoundDisplayName = useCallback(
    (soundId: string): string => {
      const translationKey = `sound_${soundId}`;
      const translatedName = t(translationKey, "");
      // Si une traduction existe et n'est pas juste la clé, on l'utilise
      if (translatedName && translatedName !== translationKey)
        return translatedName;

      const premiumSoundTitles =
        premiumContent.premiumContentState.premiumSoundTitles;

      let displayName = soundId;

      // Si on a un titre stocké en mémoire (via updateAvailableSounds)
      if (premiumSoundTitles[soundId]) {
        displayName = premiumSoundTitles[soundId];
      }

      // Nettoyage agressif des préfixes techniques
      displayName = displayName
        .replace(/^(adhan_|son_|reciter_)/i, "") // Enlève adhan_, son_, etc.
        .replace(/^(Adhan|Son)\s*[-:]\s*/i, "") // Enlève "Adhan - "
        .replace(/\.mp3$/i, ""); // Enlève l'extension si présente

      // Remplace les underscores/tirets par des espaces et met en majuscules chaque mot
      return displayName
        .replace(/[_-]/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase())
        .trim();
    },
    [t, premiumContent.premiumContentState.premiumSoundTitles]
  );

  const onChangeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
    if (settings) {
      settings.setCurrentLanguage(langCode);
      setTimeout(async () => {
        try {
          await settings.saveAndReprogramAll();
        } catch (error) {
          console.log("Erreur reprogrammation notifications:", error);
        }
      }, 100);
    }
  };

  const updateAvailableSounds = useCallback(async () => {
    try {
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
      const downloadedPremiumSounds: AdhanSoundKey[] = [];
      const premiumTitles: { [key: string]: string } = {};

      if (user.isPremium) {
        try {
          const RNFS = await import("react-native-fs");
          const downloadedContent = await LocalStorageManager.getPremium(
            "DOWNLOADED_CONTENT"
          );
          if (downloadedContent) {
            const downloaded = JSON.parse(downloadedContent);
            const contentIds = Object.keys(downloaded);
            for (const contentId of contentIds) {
              const adhanData = downloaded[contentId];
              const isAdhan =
                contentId.startsWith("adhan_") ||
                adhanData.type === "adhan" ||
                (!contentId.includes("quran_") &&
                  !contentId.startsWith("reciter_") &&
                  !contentId.match(/^\d{3}_/));
              if (!isAdhan) continue;

              if (adhanData.downloadPath) {
                const filePath = adhanData.downloadPath.replace("file://", "");
                const fileExists = await RNFS.default.exists(filePath);
                if (fileExists) {
                  downloadedPremiumSounds.push(contentId as AdhanSoundKey);

                  // FIX: S'assurer qu'on a toujours un titre propre
                  if (adhanData.title) {
                    premiumTitles[contentId] = adhanData.title;
                  } else {
                    // Génération fallback d'un titre propre si manquant
                    premiumTitles[contentId] = contentId
                      .replace(/^adhan_/, "")
                      .replace(/[_-]/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase());
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
      const allAvailableSounds = [...baseSounds, ...downloadedPremiumSounds];
      premiumContent.setAvailableSounds(allAvailableSounds);
      premiumContent.setPremiumSoundTitles(premiumTitles);
    } catch (error) {
      console.error(error);
    }
  }, [premiumContent, user.isPremium]);

  // 🚀 FIX : Mettre à jour la liste des sons au démarrage pour inclure les téléchargements
  // Utilisation d'un ref pour éviter la boucle infinie (update -> render -> update)
  const hasInitialSoundUpdate = React.useRef(false);

  React.useEffect(() => {
    if (user?.isPremium && !hasInitialSoundUpdate.current) {
      // Délai pour laisser le temps au système de fichiers et à Async Storage de s'initialiser
      const timer = setTimeout(() => {
        updateAvailableSounds();
        hasInitialSoundUpdate.current = true;
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [user?.isPremium, updateAvailableSounds]);

  const previewAdhanIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    const selectedId = settings?.adhanSound;
    if (
      previewAdhanIdRef.current &&
      previewAdhanIdRef.current !== selectedId &&
      audioPlayer.audioState.sound
    ) {
      stopPreview().catch(() => {});
    }
  }, [settings?.adhanSound]);

  const playPreview = async () => {
    if (!settings) return;
    try {
      if (audioPlayer.audioState.premiumAdhanSound) await stopPremiumAdhan();
      audioPlayer.setIsLoadingPreview(true);
      previewAdhanIdRef.current = settings.adhanSound;
      audioPlayer.setCurrentPlayingAdhan("main_preview");

      let soundSource = soundObjects[settings.adhanSound];

      // Si pas dans les sons de base (donc c'est un son premium ou téléchargé)
      if (!soundSource) {
        const targetId = settings.adhanSound;
        console.log(`🔍 Preview demandée pour: ${targetId}`);

        // 1. Chercher d'abord dans les objets premium chargés (pour avoir l'URL de streaming si besoin)
        const premiumAdhan =
          premiumContent.premiumContentState.availableAdhanVoices.find(
            (a) =>
              a.id === targetId ||
              a.id === `adhan_${targetId}` ||
              `adhan_${a.id}` === targetId
          );

        if (premiumAdhan) {
          soundSource = { uri: premiumAdhan.fileUrl };
        }

        // 2. Vérification prioritaire du fichier local (écrasera l'URL streaming si trouvé)
        try {
          const PremiumContentManager = (
            await import("../utils/premiumContent")
          ).default;
          const manager = PremiumContentManager.getInstance();

          // Essayer avec l'ID exact
          let localPath = await manager.isContentDownloaded(targetId);

          // Si pas trouvé, essayer sans le préfixe 'adhan_' si présent
          if (!localPath && targetId.startsWith("adhan_")) {
            localPath = await manager.isContentDownloaded(
              targetId.replace("adhan_", "")
            );
          }
          // Si pas trouvé, essayer AVEC le préfixe 'adhan_' si absent
          if (!localPath && !targetId.startsWith("adhan_")) {
            localPath = await manager.isContentDownloaded(`adhan_${targetId}`);
          }

          if (localPath) {
            console.log(`✅ Fichier local trouvé pour preview: ${localPath}`);
            soundSource = {
              uri: localPath.startsWith("file://")
                ? localPath
                : "file://" + localPath,
            };
          } else if (!soundSource) {
            console.warn(
              `❌ Aucun fichier local ni URL streaming trouvé pour: ${targetId}`
            );
          }
        } catch (err) {
          console.error("Erreur recherche fichier local preview:", err);
        }
      }

      if (!soundSource) {
        showToast({
          type: "error",
          title: t("error"),
          message: t("toast_playback_error_message"),
        });
        audioPlayer.setIsLoadingPreview(false);
        return;
      }

      const volumeLevel = settings.adhanVolume || 0.8;
      const sound = await audioManager.playSource(
        soundSource,
        volumeLevel,
        (status: any) => {
          if (status.didJustFinish) {
            audioPlayer.setIsPreviewing(false);
            audioPlayer.setIsAudioPlaying(false);
            audioPlayer.setCurrentPlayingAdhan(null);
          }
        }
      );
      audioPlayer.setSound(sound);
      audioPlayer.setIsPreviewing(true);
      audioPlayer.setIsLoadingPreview(false);
      audioPlayer.setIsAudioPlaying(true);
    } catch (e) {
      console.error("Erreur playPreview:", e);
      audioPlayer.setIsLoadingPreview(false);
      showToast({
        type: "error",
        title: t("error"),
        message: t("error_playing_preview"),
      });
    }
  };

  const stopPreview = async () => {
    await audioManager.stop();
    audioPlayer.setIsPreviewing(false);
    audioPlayer.setIsAudioPlaying(false);
    audioPlayer.setCurrentPlayingAdhan(null);
    previewAdhanIdRef.current = null;
  };

  const pausePreview = async () => {
    if (audioPlayer.audioState.sound) {
      await audioManager.pause();
      audioPlayer.setIsAudioPlaying(false);
    }
  };

  const resumePreview = async () => {
    if (audioPlayer.audioState.sound) {
      await audioManager.resume();
      audioPlayer.setIsAudioPlaying(true);
    }
  };

  const playPremiumAdhan = async (adhan: PremiumContent) => {
    try {
      audioPlayer.setIsLoadingPremiumAdhan(true);
      if (
        audioPlayer.audioState.sound &&
        (audioPlayer.audioState.isPreviewing ||
          audioPlayer.audioState.currentPlayingAdhan === "main_preview")
      ) {
        await stopPreview();
      }
      if (audioPlayer.audioState.premiumAdhanSound) {
        await audioPlayer.audioState.premiumAdhanSound.unloadAsync();
        audioPlayer.setPremiumAdhanSound(null);
      }
      audioPlayer.setCurrentPlayingPremiumAdhan(adhan.id);

      let audioSource: any;
      const PremiumContentManager = (await import("../utils/premiumContent"))
        .default;
      const manager = PremiumContentManager.getInstance();
      const actualDownloadPath = await manager.isContentDownloaded(adhan.id);

      if (actualDownloadPath) {
        const uri = actualDownloadPath.startsWith("file://")
          ? actualDownloadPath
          : "file://" + actualDownloadPath;
        audioSource = { uri };
      } else {
        audioSource = { uri: adhan.fileUrl };
      }

      const volumeLevel = settings.adhanVolume || 0.8;
      const newSound = await audioManager.playSource(
        audioSource,
        volumeLevel,
        (status: any) => {
          if (status?.isLoaded) {
            audioPlayer.setPremiumAdhanPlaybackPosition(
              status.positionMillis || 0
            );
            audioPlayer.setPremiumAdhanPlaybackDuration(
              status.durationMillis || 0
            );
            if (status.didJustFinish) {
              audioPlayer.setIsPlayingPremiumAdhan(false);
              audioPlayer.setCurrentPlayingPremiumAdhan(null);
              audioPlayer.setPremiumAdhanPlaybackPosition(0);
              audioPlayer.setPremiumAdhanPlaybackDuration(0);
            }
          }
        }
      );

      audioPlayer.setPremiumAdhanSound(newSound);
      audioPlayer.setIsPlayingPremiumAdhan(true);
      showToast({
        type: "success",
        title: actualDownloadPath
          ? t("toast_local_playback")
          : t("toast_streaming"),
        message: adhan.title,
      });
    } catch (error) {
      console.error("Erreur lecture adhan premium:", error);
      showToast({
        type: "error",
        title: t("toast_playback_error_title"),
        message: t("toast_playback_error_message"),
      });
      audioPlayer.setCurrentPlayingPremiumAdhan(null);
      audioPlayer.setIsPlayingPremiumAdhan(false);
    } finally {
      audioPlayer.setIsLoadingPremiumAdhan(false);
    }
  };

  const stopPremiumAdhan = async () => {
    if (audioPlayer.audioState.premiumAdhanSound) {
      await audioPlayer.audioState.premiumAdhanSound.stopAsync();
      await audioPlayer.audioState.premiumAdhanSound.unloadAsync();
      audioPlayer.setPremiumAdhanSound(null);
    }
    audioPlayer.setIsPlayingPremiumAdhan(false);
    audioPlayer.setCurrentPlayingPremiumAdhan(null);
  };

  const pausePremiumAdhan = async () => {
    if (audioPlayer.audioState.premiumAdhanSound) {
      await audioPlayer.audioState.premiumAdhanSound.pauseAsync();
      audioPlayer.setIsPlayingPremiumAdhan(false);
    }
  };

  const resumePremiumAdhan = async () => {
    if (audioPlayer.audioState.premiumAdhanSound) {
      await audioPlayer.audioState.premiumAdhanSound.playAsync();
      audioPlayer.setIsPlayingPremiumAdhan(true);
    }
  };

  const seekPremiumAdhanPosition = async (pos: number) => {
    if (audioPlayer.audioState.premiumAdhanSound) {
      await audioPlayer.audioState.premiumAdhanSound.setPositionAsync(pos);
    }
  };

  const handleDownloadAdhan = async (adhan: PremiumContent) => {
    showThemedAlert({
      title: t("settings_screen.download_adhan_title") || "Télécharger",
      message:
        t("settings_screen.download_adhan_message") ||
        "Voulez-vous télécharger ?",
      buttons: [
        { text: t("cancel"), style: "cancel", onPress: () => {} },
        {
          text: t("download"),
          style: "default",
          onPress: async () => {
            try {
              if (!user.isPremium) return;
              downloadManager.addDownloadingAdhan(adhan.id);
              const PremiumContentManager = (
                await import("../utils/premiumContent")
              ).default;
              const manager = PremiumContentManager.getInstance();
              await manager.downloadPremiumContent(
                adhan,
                (progress) => {
                  downloadManager.setDownloadProgress(adhan.id, progress);
                },
                () => false
              );
              // Refresh list
              const updatedAdhans =
                premiumContent.premiumContentState.availableAdhanVoices.map(
                  (ad) =>
                    ad.id === adhan.id ? { ...ad, isDownloaded: true } : ad
                );
              premiumContent.setAvailableAdhanVoices(updatedAdhans);
              // 🚀 NOUVEAU : Mettre à jour la liste déroulante immédiatement
              await updateAvailableSounds();
              showToast({
                type: "success",
                title: t("success"),
                message: t("download_completed"),
              });
            } catch (e) {
              console.error(e);
              showToast({
                type: "error",
                title: t("error"),
                message: t("download_error"),
              });
            } finally {
              downloadManager.removeDownloadingAdhan(adhan.id);
            }
          },
        },
      ],
      iconType: "download",
    });
  };

  const handleDeleteAdhan = async (adhan: PremiumContent) => {
    try {
      const PremiumContentManager = (await import("../utils/premiumContent"))
        .default;
      const manager = PremiumContentManager.getInstance();
      await manager.deletePremiumContent(adhan.id);
      const updatedAdhans =
        premiumContent.premiumContentState.availableAdhanVoices.map((ad) =>
          ad.id === adhan.id ? { ...ad, isDownloaded: false } : ad
        );
      premiumContent.setAvailableAdhanVoices(updatedAdhans);
      await updateAvailableSounds();
      showToast({
        type: "info",
        title: t("toast_adhan_deleted_title"), // "Adhan supprimé"
        message: t("toast_adhan_deleted_message"), // "supprimé"
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelDownload = (id: string) => {
    // Implémentation basique
    downloadManager.removeDownloadingAdhan(id);
  };

  const loadAvailableAdhans = async (force?: boolean) => {
    try {
      const PremiumContentManager = (await import("../utils/premiumContent"))
        .default;
      const manager = PremiumContentManager.getInstance();
      const adhans = await manager.getAdhanCatalogOnly();
      if (adhans) premiumContent.setAvailableAdhanVoices(adhans);
    } catch (e) {
      console.error(e);
    }
  };

  const cleanupCorruptedFiles = async () => {
    // Appel manager
  };
  const diagnoseAndCleanFiles = async () => {
    // Appel manager
  };

  const formatTime = (milliseconds: number) => {
    if (!milliseconds) return "00:00";
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (!isNativeAvailable) return;
    // Logic native download monitoring
  }, [isNativeAvailable, downloadState]);

  return (
    <ThemedImageBackground style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 20}
        >
          <SettingsSections
            settings={settings}
            dhikrSettings={settings.dhikrSettings}
            methods={methods}
            sounds={premiumContent.premiumContentState.availableSounds}
            languages={languages}
            selectedLang={i18n.language}
            onChangeLanguage={onChangeLanguage}
            reprogrammateNotifications={reprogrammateNotifications}
            navigation={navigation}
            openPremiumModal={() => uiManager.setShowPremiumModal(true)}
            locationUIMode={locationUIMode}
            setLocationUIMode={setLocationUIMode}
            cityInput={citySearch.citySearchState.cityInput}
            citySearchResults={citySearchAPI.results}
            citySearchLoading={citySearchAPI.loading}
            handleCityInputChange={(text) => {
              if (activeSection !== "location") setActiveSection("location");
              citySearch.setCityInput(text);
              citySearchAPI.searchCity(text);
            }}
            selectCity={(city) => {
              if (activeSection !== "location") setActiveSection("location");
              citySearch.setCityInput(city.display_name);
              citySearch.clearSearchResults();
              if (settings?.setManualLocation) {
                settings.setManualLocation({
                  lat: parseFloat(city.lat),
                  lon: parseFloat(city.lon),
                  city: city.display_name.split(",")[0].trim(),
                });
              }
            }}
            isPreviewing={audioPlayer.audioState.isPreviewing}
            isAudioPlaying={audioPlayer.audioState.isAudioPlaying}
            currentPlayingAdhan={audioPlayer.audioState.currentPlayingAdhan}
            isLoadingPreview={audioPlayer.audioState.isLoadingPreview}
            playPreview={playPreview}
            stopPreview={stopPreview}
            pausePreview={pausePreview}
            resumePreview={resumePreview}
            isPlayingPremiumAdhan={audioPlayer.audioState.isPlayingPremiumAdhan}
            currentPlayingPremiumAdhan={
              audioPlayer.audioState.currentPlayingPremiumAdhan
            }
            premiumAdhanPlaybackPosition={
              audioPlayer.audioState.premiumAdhanPlaybackPosition
            }
            premiumAdhanPlaybackDuration={
              audioPlayer.audioState.premiumAdhanPlaybackDuration
            }
            isLoadingPremiumAdhan={audioPlayer.audioState.isLoadingPremiumAdhan}
            playPremiumAdhan={playPremiumAdhan}
            pausePremiumAdhan={pausePremiumAdhan}
            resumePremiumAdhan={resumePremiumAdhan}
            seekPremiumAdhanPosition={seekPremiumAdhanPosition}
            stopPremiumAdhan={stopPremiumAdhan}
            availableAdhanVoices={
              premiumContent.premiumContentState.availableAdhanVoices
            }
            downloadingAdhans={downloadManager.downloadState.downloadingAdhans}
            downloadProgress={downloadManager.downloadState.downloadProgress}
            isApplyingChanges={uiManager.uiState.isApplyingChanges}
            downloadState={downloadState}
            user={user}
            handleDownloadAdhan={handleDownloadAdhan}
            handleDeleteAdhan={handleDeleteAdhan}
            handleCancelDownload={handleCancelDownload}
            loadAvailableAdhans={loadAvailableAdhans}
            getSoundDisplayName={getSoundDisplayName}
            formatTime={formatTime}
            activatePremium={activatePremium}
            showToast={showToast}
            handleBuyPremium={() => uiManager.setShowPremiumModal(true)}
            onLoginSuccess={handleLoginSuccess}
            forceLogout={forceLogout}
            cleanupCorruptedFiles={cleanupCorruptedFiles}
            diagnoseAndCleanFiles={diagnoseAndCleanFiles}
            updateAvailableSounds={updateAvailableSounds}
            forceRefreshAdhans={forceRefreshAdhans}
            premiumContent={premiumContent}
            sectionListRef={sectionListRef}
            styles={styles}
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            currentTheme={currentTheme}
            setThemeMode={settings.setThemeMode}
            hasPendingChanges={hasPendingChanges}
            markPendingChanges={markPendingChanges}
            applyAllChanges={applyAllChanges}
            t={t}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>

      <SettingsModals
        uiManager={uiManager}
        themedAlert={themedAlert}
        setThemedAlert={setThemedAlert}
        styles={styles}
        t={t}
        colors={colors}
        currentTheme={currentTheme}
        activatePremium={activatePremium}
        showToast={showToast}
        handleLoginSuccess={handleLoginSuccess}
        initialTab={(premiumTab as "login" | "signup") || "login"}
      />
    </ThemedImageBackground>
  );
}
