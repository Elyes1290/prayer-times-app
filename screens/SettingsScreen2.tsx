/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, {
  useContext,
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
} from "react";
import audioManager from "../utils/AudioManager";
import {
  SectionList,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
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
import PremiumLoginSection from "./PremiumLoginSection";
import { useNativeDownload } from "../hooks/useNativeDownload";
// 🚀 OPTIMISATION : Import des hooks optimisés adaptés
import { useSettingsOptimized } from "../hooks/useSettingsOptimized";

import AdhanSoundSection from "../components/settings/AdhanSoundSection";
import DhikrSection from "../components/settings/DhikrSection";
import GeneralSection from "../components/settings/GeneralSection";
import LocationSection from "../components/settings/LocationSection";
import BackupSection from "../components/settings/BackupSection";
import AccountManagementSection from "../components/settings/AccountManagementSection";
// import AudioCacheSection from "../components/settings/AudioCacheSection";
import ThemedAlert from "../components/ThemedAlert";
import { LocalStorageManager } from "../utils/localStorageManager";

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

// 🚀 OPTIMISATION : Interface Props simplifiée
interface OptimizedSettingsSectionsProps {
  settings: any;
  dhikrSettings: any;
  methods: CalcMethodKey[];
  sounds: AdhanSoundKey[]; // 🔧 AJOUTÉ : Liste des sons disponibles
  languages: { code: string; label: string }[];
  selectedLang: string;
  onChangeLanguage: (langCode: string) => void;
  reprogrammateNotifications: () => Promise<void>;

  // 🔧 AJOUTÉ : États recherche ville depuis hooks optimisés
  cityInput: string;
  citySearchResults: NominatimResult[];
  citySearchLoading: boolean;

  // Fonctions gestion ville
  handleCityInputChange: (text: string) => void;
  selectCity: (city: NominatimResult) => void;

  // 🔧 AJOUTÉ : États audio depuis hooks optimisés
  isPreviewing: boolean;
  isAudioPlaying: boolean;
  currentPlayingAdhan: string | null;
  isLoadingPreview: boolean;

  // Fonctions audio
  playPreview: () => void;
  stopPreview: () => void;
  pausePreview: () => Promise<void>;
  resumePreview: () => Promise<void>;

  // 🔧 AJOUTÉ : États premium audio depuis hooks optimisés
  isPlayingPremiumAdhan: boolean;
  currentPlayingPremiumAdhan: string | null;
  premiumAdhanPlaybackPosition: number;
  premiumAdhanPlaybackDuration: number;
  isLoadingPremiumAdhan: boolean;

  // Fonctions premium audio
  playPremiumAdhan: (adhan: PremiumContent) => Promise<void>;
  pausePremiumAdhan: () => Promise<void>;
  resumePremiumAdhan: () => Promise<void>;
  seekPremiumAdhanPosition: (position: number) => Promise<void>;
  stopPremiumAdhan: () => Promise<void>;

  // 🔧 AJOUTÉ : États téléchargement depuis hooks optimisés
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
  >; // 🔧 AJOUTÉ : État téléchargement natif

  // Fonctions téléchargement
  handleDownloadAdhan: (adhan: PremiumContent) => Promise<void>;
  handleDeleteAdhan: (adhan: PremiumContent) => Promise<void>;
  handleCancelDownload: (adhanId: string) => void;
  loadAvailableAdhans: (forceRefresh?: boolean) => Promise<void>;

  // Fonctions utilitaires
  getSoundDisplayName: (soundId: string) => string;
  formatTime: (milliseconds: number) => string;

  // Fonctions premium auth
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
  user: any; // 🔧 AJOUTÉ : User depuis usePremium

  // Fonctions nettoyage
  cleanupCorruptedFiles: () => Promise<void>;
  diagnoseAndCleanFiles: () => Promise<void>;

  // 🔧 FIX: Fonction de mise à jour des sons disponibles (simplifiée)
  updateAvailableSounds: () => void;

  // 🔧 FIX: Fonction de rafraîchissement des adhans du hook useNativeDownload
  forceRefreshAdhans: () => Promise<void>;

  // 🔧 FIX: PremiumContent hook pour accès dans SettingsSections
  premiumContent: any;

  // Références
  sectionListRef: React.RefObject<SectionList<any, any> | null>;

  // Styles
  styles: any;

  // 🚀 NOUVEAU : Props pour la gestion des sections actives
  activeSection: string | null;
  setActiveSection: (sectionId: string | null) => void;

  // 🔧 AJOUTÉ : Props pour le thème
  currentTheme: "light" | "dark";
  setThemeMode: (mode: "auto" | "light" | "dark") => void;

  // 🚀 NOUVEAU : Props pour la gestion des changements en attente
  hasPendingChanges: boolean;
  markPendingChanges: () => void;
  applyAllChanges: () => void;

  // 🔧 AJOUTÉ : Navigation pour les boutons
  navigation: any;
  // 🔧 AJOUTÉ : Ouverture de la modale premium existante
  openPremiumModal: () => void;

  // 🚀 NOUVEAU : UI Mode location externe
  locationUIMode: "auto" | "manual";
  setLocationUIMode: (mode: "auto" | "manual") => void;
}

// Le composant SettingsSections reste identique (sera copié de l'original)
function SettingsSections({
  settings,
  dhikrSettings,
  methods,
  sounds,
  languages,
  selectedLang,
  onChangeLanguage,
  reprogrammateNotifications,
  // États recherche ville
  cityInput,
  citySearchResults,
  citySearchLoading,
  // Fonctions ville
  handleCityInputChange,
  selectCity,
  // États audio
  isPreviewing,
  isAudioPlaying,
  currentPlayingAdhan,
  isLoadingPreview,
  // Fonctions audio
  playPreview,
  stopPreview,
  pausePreview,
  resumePreview,
  // États premium audio
  isPlayingPremiumAdhan,
  currentPlayingPremiumAdhan,
  premiumAdhanPlaybackPosition,
  premiumAdhanPlaybackDuration,
  isLoadingPremiumAdhan,
  // Fonctions premium audio
  playPremiumAdhan,
  pausePremiumAdhan,
  resumePremiumAdhan,
  seekPremiumAdhanPosition,
  stopPremiumAdhan,
  // États téléchargement
  availableAdhanVoices,
  downloadingAdhans,
  downloadProgress,
  isApplyingChanges,
  downloadState, // 🔧 AJOUTÉ : État téléchargement natif
  // Fonctions téléchargement
  handleDownloadAdhan,
  handleDeleteAdhan,
  handleCancelDownload,
  loadAvailableAdhans,
  getSoundDisplayName,
  formatTime,
  activatePremium,
  showToast,
  handleBuyPremium,
  onLoginSuccess,
  forceLogout,
  user, // 🔧 AJOUTÉ : User depuis usePremium
  cleanupCorruptedFiles,
  diagnoseAndCleanFiles,
  updateAvailableSounds, // 🔧 FIX: Fonction de mise à jour des sons
  forceRefreshAdhans, // 🔧 FIX: Fonction de rafraîchissement des adhans du hook
  premiumContent, // 🔧 FIX: PremiumContent hook pour accès dans SettingsSections
  sectionListRef,
  styles,
  // 🚀 NOUVEAU : Props pour la gestion des sections actives
  activeSection,
  setActiveSection,
  // 🔧 AJOUTÉ : Props pour le thème
  currentTheme,
  setThemeMode,
  // 🚀 NOUVEAU : Props pour la gestion des changements en attente
  hasPendingChanges,
  markPendingChanges,
  applyAllChanges,
  // 🔧 AJOUTÉ : Navigation pour les boutons
  navigation,
  openPremiumModal,
  // 🚀 NOUVEAU : UI Mode location externe
  locationUIMode,
  setLocationUIMode,
}: OptimizedSettingsSectionsProps) {
  const { t } = useTranslation();

  // États locaux pour le dhikr - Switch principal indépendant
  const [allDhikrEnabled, setAllDhikrEnabled] = useState(true);

  // Fonctions utilitaires
  const toggleAllDhikr = async (value: boolean) => {
    // console.log(`🔔 Changement tous dhikrs: ${value}`);
    setAllDhikrEnabled(value);

    if (!value) {
      // Désactiver tous les dhikrs individuels si "tous" est désactivé
      settings.setEnabledAfterSalah(false);
      settings.setEnabledMorningDhikr(false);
      settings.setEnabledEveningDhikr(false);
      settings.setEnabledSelectedDua(false);
    } else {
      // Activer tous les dhikrs individuels si "tous" est activé
      settings.setEnabledAfterSalah(true);
      settings.setEnabledMorningDhikr(true);
      settings.setEnabledEveningDhikr(true);
      settings.setEnabledSelectedDua(true);
    }

    // 🔧 NOUVEAU : Marquer les changements en attente
    markPendingChanges();
  };

  const handleNotificationsToggle = async (value: boolean) => {
    // console.log(`🔔 Changement notifications: ${value}`);

    // 🔧 NOUVEAU : Mettre à jour l'état local ET settings
    setNotificationsEnabled(value);
    settings.setNotificationsEnabled(value);

    if (!value) {
      // Désactiver tous les rappels et dhikrs si notifications désactivées
      settings.setRemindersEnabled(false);
      setRemindersEnabled(false);
      setAllDhikrEnabled(false);
      settings.setEnabledAfterSalah(false);
      settings.setEnabledMorningDhikr(false);
      settings.setEnabledEveningDhikr(false);
      settings.setEnabledSelectedDua(false);
    }

    // 🔧 NOUVEAU : Marquer les changements en attente
    markPendingChanges();
  };

  // 🚀 AJOUT : Variables manquantes pour les sections complètes
  const [locationMode, setLocationMode] = useState<"auto" | "manual">(
    settings.locationMode || "auto"
  );
  const [autoLocation, setAutoLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(settings.autoLocation || null);

  const [calcMethod, setCalcMethod] = useState<CalcMethodKey>(
    settings.calcMethod || "MuslimWorldLeague"
  );
  const [adhanSound, setAdhanSound] = useState<AdhanSoundKey>(
    settings.adhanSound || "ahmadnafees"
  );
  const [adhanVolume, setAdhanVolume] = useState(settings.adhanVolume || 0.8);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    settings.notificationsEnabled || false
  );
  const [remindersEnabled, setRemindersEnabled] = useState(
    settings.remindersEnabled || false
  );
  const [reminderOffset, setReminderOffset] = useState(
    settings.reminderOffset || 10
  );
  // Les setters sont utilisés directement depuis settings dans DhikrSectionWrapper
  const [soundRef] = useState(() => ({ current: null as any }));

  // 🚀 NOUVEAU : États de loading pour les boutons premium
  const [isRefreshingAdhans, setIsRefreshingAdhans] = useState(false);
  const [isCleaningFiles, setIsCleaningFiles] = useState(false);

  // 🚀 FONCTION STABLE pour rafraîchir la localisation automatique
  const refreshAutoLocation = useCallback(async () => {
    // 🔧 CORRECTION : Utiliser la vraie fonction du contexte
    await settings.refreshAutoLocation();
  }, [settings.refreshAutoLocation]);

  // 🚀 NOUVEAU : Fonctions wrapper avec feedback visuel
  const handleRefreshAdhans = async () => {
    if (isRefreshingAdhans) return;

    setIsRefreshingAdhans(true);
    // console.log("🔄 Début actualisation adhans premium...");

    try {
      // 🚀 SOLUTION HYBRIDE : Préserver les téléchargements AVANT de recharger
      const currentAdhans =
        premiumContent.premiumContentState.availableAdhanVoices;
      const downloadedAdhans = currentAdhans.filter(
        (adhan: PremiumContent) => adhan.isDownloaded
      );
      // console.log(
      //   `💾 Sauvegarde de ${downloadedAdhans.length} adhans téléchargés avant actualisation`
      // );

      // Charger depuis le serveur
      await loadAvailableAdhans(true);

      // Restaurer les téléchargements après chargement
      if (downloadedAdhans.length > 0) {
        const freshAdhans =
          premiumContent.premiumContentState.availableAdhanVoices;
        const mergedAdhans = freshAdhans.map((freshAdhan: PremiumContent) => {
          const downloadedVersion = downloadedAdhans.find(
            (d: PremiumContent) => d.id === freshAdhan.id
          );
          if (downloadedVersion) {
            // console.log(`🔄 Restauration téléchargement: ${freshAdhan.id}`);
            return {
              ...freshAdhan,
              isDownloaded: true,
              downloadPath: downloadedVersion.downloadPath,
            };
          }
          return freshAdhan;
        });
        premiumContent.setAvailableAdhanVoices(mergedAdhans);
        updateAvailableSounds(); // Mettre à jour la liste de sélection
      }

      // console.log("✅ Actualisation adhans terminée");
      showToast({
        type: "success",
        title: t("success", "Succès"),
        message: t("adhans.list_updated", "Liste des adhans actualisée"),
      });
    } catch (error) {
      console.error("❌ Erreur actualisation adhans:", error);
      showToast({
        type: "error",
        title: t("error", "Erreur"),
        message: t(
          "adhans.cannot_update_list",
          "Impossible d'actualiser la liste"
        ),
      });
    } finally {
      setIsRefreshingAdhans(false);
    }
  };

  const handleCleanFiles = async () => {
    if (isCleaningFiles) return;

    setIsCleaningFiles(true);
    try {
      // console.log("🧹 Début nettoyage fichiers...");
      await cleanupCorruptedFiles();
      // console.log("✅ Nettoyage terminé");
    } catch (error) {
      console.error("❌ Erreur nettoyage:", error);
      showToast({
        type: "error",
        title: t("error", "Erreur"),
        message: t(
          "settings.cannot_clean_files",
          "Impossible de nettoyer les fichiers"
        ),
      });
    } finally {
      setIsCleaningFiles(false);
    }
  };

  // Synchronisation avec les settings
  useEffect(() => {
    if (settings) {
      setLocationMode(settings.locationMode || "auto");
      setAutoLocation(settings.autoLocation || null);
      setCalcMethod(settings.calcMethod || "MuslimWorldLeague");
      setAdhanSound(settings.adhanSound || "ahmadnafees");
      setAdhanVolume(settings.adhanVolume || 0.8);
      setNotificationsEnabled(settings.notificationsEnabled || false);
      setRemindersEnabled(settings.remindersEnabled || false);
      setReminderOffset(settings.reminderOffset || 10);
    }
  }, [settings]);

  // Switch principal dhikr indépendant des dhikrs individuels

  // 🚀 NOUVEAU : Grille de boutons carrés pour les paramètres
  const renderSettingsGrid = () => {
    const settingsButtons = [
      {
        id: "location",
        title: t("location", "Localisation"),
        icon: "map-marker" as const,
        iconColor: "#4ECDC4",
        onPress: () => handleSectionToggle("location"),
      },
      {
        id: "adhan_sound",
        title: t("adhan_sound", "Son et Adhan"),
        icon: "volume-high" as const,
        iconColor: "#FF6B6B",
        onPress: () => handleSectionToggle("adhan_sound"),
      },
      {
        id: "notifications",
        title: t("notifications", "Notifications"),
        icon: "bell" as const,
        iconColor: "#FFD93D",
        onPress: () => handleSectionToggle("notifications"),
      },
      {
        id: "dhikr_dua",
        title: t("dhikr_dua", "Dhikr & Doua"),
        icon: "heart" as const,
        iconColor: "#6C5CE7",
        onPress: () => handleSectionToggle("dhikr_dua"),
      },
      {
        id: "appearance",
        title: t("appearance", "Apparence"),
        icon: "palette" as const,
        iconColor: "#A8E6CF",
        onPress: () => handleSectionToggle("appearance"),
      },
      // {
      //   id: "premium",
      //   title: t("premium_access", "Premium"),
      //   icon: "crown" as const,
      //   iconColor: "#FFD700",
      //   onPress: () => handleSectionToggle("premium"),
      // },

      {
        id: "backup",
        title: t("backup", "Sauvegarde"),
        icon: "cloud-upload" as const,
        iconColor: user?.isPremium ? "#4ECDC4" : "#6B7280",
        onPress: user?.isPremium
          ? () => handleSectionToggle("backup")
          : undefined,
        disabled: !user?.isPremium,
      },
      {
        id: "about",
        title: t("about", "À propos"),
        icon: "information-outline" as const,
        iconColor: "#74B9FF",
        onPress: () => handleSectionToggle("about"),
      },
      {
        id: "help",
        title: t("help", "Aide"),
        icon: "help" as const,
        iconColor: "#FD79A8",
        onPress: () => handleSectionToggle("help"),
      },
    ];

    return (
      <View style={{ padding: 16 }}>
        <View style={styles.gridContainer}>
          {settingsButtons.map((button, index) => (
            <TouchableOpacity
              key={button.id}
              style={[
                styles.gridButton,
                activeSection === button.id && styles.gridButtonActive,
                button.disabled && styles.gridButtonDisabled,
              ]}
              onPress={button.onPress}
              disabled={button.disabled}
            >
              <MaterialCommunityIcons
                name={button.icon}
                size={32}
                color={button.iconColor}
              />
              <Text
                style={[
                  styles.gridButtonText,
                  button.disabled && styles.gridButtonTextDisabled,
                ]}
              >
                {button.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // 🚀 NOUVEAU : Fonction pour gérer le toggle des sections
  const handleSectionToggle = async (sectionId: string) => {
    if (activeSection === sectionId) {
      setActiveSection(null);
    } else {
      setActiveSection(sectionId);

      // 🔄 NOUVEAU : Rafraîchissement automatique de la liste des adhans premium
      if (sectionId === "adhan_sound" && user?.isPremium) {
        try {
          console.log(
            "🔄 Ouverture section Son & Adhan - rafraîchissement automatique..."
          );

          // Charger les adhans depuis le serveur avec forceRefresh
          await loadAvailableAdhans(true);

          // Mettre à jour immédiatement la liste de sélection
          await updateAvailableSounds();

          console.log("✅ Liste des adhans premium rafraîchie automatiquement");
        } catch (error) {
          console.error("❌ Erreur rafraîchissement automatique:", error);
          // Continuer silencieusement, pas besoin de toast ici
        }
      }
    }
  };

  // 🚀 NOUVEAU : Fonction pour fermer la section active
  const closeActiveSection = () => {
    setActiveSection(null);
  };

  // 🚀 STABLE LOCATION MODE SETTER - DOIT ÊTRE DÉFINI AVANT USEMEMO !
  const stableSetLocationMode = useCallback(
    (mode: "auto" | "manual") => settings.setLocationMode(mode),
    [settings.setLocationMode]
  );

  // 🚀 TOUTES CES FONCTIONS EXISTENT DÉJÀ DANS LES PARAMÈTRES !

  // 🚀 SUPPRESSION DU USEMEMO - APPEL DIRECT SANS OPTIMISATION
  const locationSections = LocationSection({
    locationMode: settings.locationMode,
    autoLocation: settings.autoLocation,
    isRefreshingLocation: settings.isRefreshingLocation,
    cityInput: cityInput,
    citySearchResults: citySearchResults,
    citySearchLoading: citySearchLoading,
    setLocationMode: stableSetLocationMode,
    refreshAutoLocation: refreshAutoLocation,
    handleCityInputChange: handleCityInputChange,
    selectCity: selectCity,
    styles: styles,
    // ✅ AJOUT : Passer setActiveSection pour maintenir section ouverte
    setActiveSection: setActiveSection,
    // 🚀 NOUVEAU : États UI mode stables
    uiMode: locationUIMode,
    setUIMode: setLocationUIMode,
  });

  const LocationSectionWrapper = React.memo(function LocationSectionWrapper() {
    const locationComponent = locationSections[0]?.data[0]?.component;
    return (
      locationComponent || (
        <View style={{ padding: 16 }}>
          <Text style={styles.sectionTitle}>Section Localisation</Text>
          <Text style={styles.sectionDescription}>
            Configuration de la localisation pour les horaires de prière
          </Text>
        </View>
      )
    );
  });

  const GeneralSectionWrapper = React.memo(function GeneralSectionWrapper() {
    const generalSections = GeneralSection({
      notificationsEnabled: settings.notificationsEnabled,
      remindersEnabled: settings.remindersEnabled,
      reminderOffset: settings.reminderOffset,
      duaAfterAdhanEnabled: settings.duaAfterAdhanEnabled, // 🚀 NOUVEAU : Ajouter la dua après l'adhan
      handleNotificationsToggle: handleNotificationsToggle,
      setDuaAfterAdhanEnabled: (enabled) => {
        settings.setDuaAfterAdhanEnabled(enabled);
        markPendingChanges();
      },
      markPendingChanges: markPendingChanges,
      setRemindersEnabled: (enabled) => {
        settings.setRemindersEnabled(enabled);
        markPendingChanges();
      },
      setReminderOffset: (offset) => {
        settings.setReminderOffset(offset);
        markPendingChanges();
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
      markPendingChanges: markPendingChanges,
      setEnabledAfterSalah: (enabled) => {
        settings.setEnabledAfterSalah(enabled);
        markPendingChanges();
      },
      setEnabledMorningDhikr: (enabled) => {
        settings.setEnabledMorningDhikr(enabled);
        markPendingChanges();
      },
      setEnabledEveningDhikr: (enabled) => {
        settings.setEnabledEveningDhikr(enabled);
        markPendingChanges();
      },
      setEnabledSelectedDua: (enabled) => {
        settings.setEnabledSelectedDua(enabled);
        markPendingChanges();
      },
      setDelayMorningDhikr: (delay) => {
        settings.setDelayMorningDhikr(delay);
        markPendingChanges();
      },
      setDelayEveningDhikr: (delay) => {
        settings.setDelayEveningDhikr(delay);
        markPendingChanges();
      },
      setDelaySelectedDua: (delay) => {
        settings.setDelaySelectedDua(delay);
        markPendingChanges();
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
        isPreviewing: isPreviewing,
        isAudioPlaying: isAudioPlaying,
        currentPlayingAdhan: currentPlayingAdhan,

        isLoadingPreview: isLoadingPreview,
        isPlayingPremiumAdhan: isPlayingPremiumAdhan,
        currentPlayingPremiumAdhan: currentPlayingPremiumAdhan,
        premiumAdhanPlaybackPosition: premiumAdhanPlaybackPosition,
        premiumAdhanPlaybackDuration: premiumAdhanPlaybackDuration,
        isLoadingPremiumAdhan: isLoadingPremiumAdhan,
        availableAdhanVoices: availableAdhanVoices,
        downloadingAdhans: downloadingAdhans,
        downloadProgress: downloadProgress,
        downloadState: downloadState,
        settings: settings,
        calcMethod: settings.calcMethod,
        setCalcMethod: (value) => {
          settings.setCalcMethod(value);
          markPendingChanges();
        },
        adhanSound: settings.adhanSound,
        setAdhanSound: (value) => {
          settings.setAdhanSound(value);
          markPendingChanges();
        },
        adhanVolume: settings.adhanVolume,
        setAdhanVolume: (value) => {
          settings.setAdhanVolume(value);
          markPendingChanges();
        },
        methods: methods,
        sounds: sounds,
        user: user,
        playPreview: playPreview,
        stopPreview: stopPreview,
        pausePreview: pausePreview,
        resumePreview: resumePreview,

        playPremiumAdhan: playPremiumAdhan,
        pausePremiumAdhan: pausePremiumAdhan,
        resumePremiumAdhan: resumePremiumAdhan,
        seekPremiumAdhanPosition: seekPremiumAdhanPosition,
        stopPremiumAdhan: stopPremiumAdhan,
        handleDownloadAdhan: handleDownloadAdhan,
        handleDeleteAdhan: handleDeleteAdhan,
        handleCancelDownload: handleCancelDownload,
        getSoundDisplayName: getSoundDisplayName,
        formatTime: formatTime,
        isRefreshingAdhans: false,
        isCleaningFiles: false,
        handleRefreshAdhans: handleRefreshAdhans,
        handleCleanFiles: cleanupCorruptedFiles,
        updateAvailableSounds: updateAvailableSounds,
        forceRefreshAdhans: forceRefreshAdhans,
        markPendingChanges: markPendingChanges,
        styles: styles,
      });

      // Afficher tous les composants de la section AdhanSound
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

  // 🚀 NOUVEAU : Fonction pour rendre le contenu de la section active
  const renderActiveSectionContent = () => {
    if (!activeSection) return null;

    // 🚀 NOUVEAU : Contenu avec composants stables
    const sectionContent = {
      location: <LocationSectionWrapper />,
      adhan_sound: <AdhanSoundSectionWrapper />,
      notifications: <GeneralSectionWrapper />,
      dhikr_dua: <DhikrSectionWrapper />,
      appearance: (
        <View style={{ padding: 16 }}>
          <Text style={styles.sectionTitle}>
            {t("appearance", "Apparence")}
          </Text>
          <View style={{ marginTop: 16, gap: 12 }}>
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
            <View style={styles.row}>
              <Text style={styles.label}>{t("theme", "Thème")}</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={currentTheme}
                  style={styles.picker}
                  onValueChange={(value) => {
                    // Changer le thème
                    if (
                      value === "light" ||
                      value === "dark" ||
                      value === "auto"
                    ) {
                      // Utiliser la fonction setThemeMode du SettingsContext
                      settings.setThemeMode(value);
                    }
                  }}
                  itemStyle={styles.pickerItem}
                  mode="dropdown"
                >
                  <Picker.Item
                    label={t("theme.light", "Clair")}
                    value="light"
                  />
                  <Picker.Item label={t("theme.dark", "Sombre")} value="dark" />
                  <Picker.Item
                    label={t("theme.auto", "Automatique")}
                    value="auto"
                  />
                </Picker>
              </View>
            </View>
          </View>
        </View>
      ),
      // premium: (
      //   <PremiumLoginSection
      //     activatePremium={activatePremium}
      //     styles={styles}
      //     showToast={showToast}
      //     t={t}
      //     onLoginSuccess={onLoginSuccess}
      //     currentTheme={currentTheme}
      //     isInModal={false}
      //     onOpenPremiumModal={openPremiumModal}
      //     // 🚀 SUPPRIMÉ : onManageAccount car gestion interne maintenant
      //   />
      // ),
      backup: <BackupSectionWrapper />,
      // audio_cache: <AudioCacheSection />,
      account_management: (
        <AccountManagementSection
          user={user}
          currentTheme={currentTheme}
          styles={styles}
          showToast={showToast}
          forceLogout={forceLogout}
          t={t}
          setActiveSection={setActiveSection}
          navigation={navigation}
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

            {/* 🚀 NOUVEAU : État de connexion */}
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
                    { color: user?.isPremium ? "#FFD700" : "#666" },
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
                    color={currentTheme === "light" ? "#333333" : "#F8FAFC"}
                  />
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={[styles.row, { marginTop: 20 }]}
              onPress={() => {
                // Ouvrir les informations de licence
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
                color={currentTheme === "light" ? "#333333" : "#F8FAFC"}
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
                color={currentTheme === "light" ? "#333333" : "#F8FAFC"}
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
                color={currentTheme === "light" ? "#333333" : "#F8FAFC"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.row}
              onPress={() => {
                Alert.alert(
                  t("tutorial", "Tutoriel"),
                  t("tutorial_text", "Guide d'utilisation de l'application")
                );
              }}
            >
              <Text style={styles.label}>{t("tutorial", "Tutoriel")}</Text>
              <MaterialCommunityIcons
                name="play-circle"
                size={20}
                color={currentTheme === "light" ? "#333333" : "#F8FAFC"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.row}
              onPress={() => {
                Alert.alert(
                  t("feedback", "Feedback"),
                  t("feedback_text", "Partagez votre avis sur l'application")
                );
              }}
            >
              <Text style={styles.label}>{t("feedback", "Feedback")}</Text>
              <MaterialCommunityIcons
                name="star"
                size={20}
                color={currentTheme === "light" ? "#333333" : "#F8FAFC"}
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
      // { id: "premium", title: t("premium_access", "Premium") },
      { id: "backup", title: t("backup", "Sauvegarde") },

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
        paddingBottom: hasPendingChanges ? 160 : 100, // 🔧 FIX: Espace supplémentaire si bouton présent
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* 🚀 NOUVEAU : Section de switch de thème en haut */}
      <View style={styles.themeSection}>
        <View style={styles.themeSectionHeader}>
          <MaterialCommunityIcons
            name="theme-light-dark"
            size={24}
            color={currentTheme === "light" ? "#4ECDC4" : "#4ECDC4"}
          />
          <Text
            style={[
              styles.themeSectionTitle,
              { color: currentTheme === "light" ? "#333333" : "#F8FAFC" },
            ]}
          >
            {t("theme", "Thème")}
          </Text>
        </View>
        <View style={styles.themeSwitchContainer}>
          <TouchableOpacity
            style={[
              styles.themeOption,
              currentTheme === "light" && styles.themeOptionActive,
            ]}
            onPress={() => setThemeMode("light")}
          >
            <MaterialCommunityIcons
              name="weather-sunny"
              size={20}
              color={currentTheme === "light" ? "#FFFFFF" : "#333333"}
            />
            <Text
              style={[
                styles.themeOptionText,
                {
                  color: currentTheme === "light" ? "#FFFFFF" : "#333333",
                },
              ]}
            >
              {t("light_mode", "Clair")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.themeOption,
              currentTheme === "dark" && styles.themeOptionActive,
            ]}
            onPress={() => setThemeMode("dark")}
          >
            <MaterialCommunityIcons
              name="weather-night"
              size={20}
              color={currentTheme === "dark" ? "#FFFFFF" : "#333333"}
            />
            <Text
              style={[
                styles.themeOptionText,
                {
                  color: currentTheme === "dark" ? "#FFFFFF" : "#333333",
                },
              ]}
            >
              {t("dark_mode", "Sombre")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderSettingsGrid()}
      {renderActiveSectionContent()}

      {/* 🚀 NOUVEAU : Bouton flottant amélioré pour reprogrammer les notifications */}
      {hasPendingChanges && (
        <View style={styles.applyChangesContainer}>
          <TouchableOpacity
            style={styles.applyChangesButton}
            onPress={applyAllChanges}
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

// 🚀 COMPOSANT PRINCIPAL OPTIMISÉ
export default function SettingsScreenOptimized() {
  const settings = useContext(SettingsContext);
  const { t, i18n } = useTranslation();
  const { user, activatePremium, checkExistingPremium, forceLogout } =
    usePremium();
  const { showToast } = useToast();
  const navigation = useNavigation();

  // 🚀 NOUVEAU : Détecter les paramètres de navigation
  const { openLocation, mode } = useLocalSearchParams();

  // 🚀 OPTIMISATION : Utiliser le hook centralisé au lieu de 26 useState
  const {
    audioPlayer,
    citySearch,
    downloadManager,
    uiManager,
    premiumContent,
  } = useSettingsOptimized();

  // 🚀 NOUVEAU : Hook API pour les vraies recherches
  const citySearchAPI = useCitySearch();

  // Références pour le scroll
  const premiumSectionRef = useRef<View>(null);
  const sectionListRef = useRef<SectionList>(null);

  // Couleurs thématiques
  const colors = useThemeColors();
  const overlayTextColor = useOverlayTextColor();
  const overlayIconColor = useOverlayIconColor();
  const currentTheme = useCurrentTheme();

  // Styles
  const styles = getStyles(
    colors,
    overlayTextColor,
    overlayIconColor,
    currentTheme
  );

  // Hook pour téléchargement natif
  const {
    downloadState,
    startDownload,
    cancelDownload,
    isNativeAvailable,
    activeDownloadsCount,
    restoreActiveDownloads,
    forceRefreshAdhans,
  } = useNativeDownload();

  // 🚀 NOUVEAU : Ref pour éviter les re-traitements multiples au sein du même cycle
  const processedThisCycleRef = useRef<Set<string>>(new Set());
  // 🔧 NOUVEAU : Référence persistante pour les téléchargements définitivement terminés
  const permanentlyProcessedRef = useRef<Set<string>>(new Set());

  // 🚀 NOUVEAU : État pour les modals ThemedAlert
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

  // 🚀 NOUVEAU : État pour la section active (grille de boutons)
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // 🚀 NOUVEAU : État pour l'interface mode location (stable)
  const [locationUIMode, setLocationUIMode] = useState<"auto" | "manual">(
    settings.locationMode || "auto"
  );

  // 🚀 SYNCHRONISATION : locationUIMode avec locationMode (quand mode réel change)
  useEffect(() => {
    if (settings.locationMode === "manual") {
      setLocationUIMode("manual");
    }
  }, [settings.locationMode]);

  // 🚀 NOUVEAU : Auto-ouverture de la section location si demandé
  useEffect(() => {
    if (openLocation === "true") {
      console.log("🚀 Auto-ouverture section location demandée");
      setActiveSection("location");

      // Si mode=manual, pré-sélectionner manuel
      if (mode === "manual") {
        console.log("🚀 Pré-sélection mode manuel");
        setLocationUIMode("manual");
      }
    }
  }, [openLocation, mode]);

  // 🚀 NOUVEAU : État pour tracker les changements en attente
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  // 🚀 NOUVEAU : Fonction pour afficher la modal ThemedAlert
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

  const premiumManager = PremiumContentManager.getInstance();

  // Variables requises pour SettingsSections
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
    // Identique à l'original
  };

  // useEffect pour initialiser la ville - SANS citySearch dans les dépendances
  useEffect(() => {
    if (settings?.locationMode === "manual" && settings.manualLocation?.city) {
      citySearch.setCityInput(settings.manualLocation.city);
    }
  }, [settings?.locationMode, settings?.manualLocation?.city]); // 🔥 RETIRÉ citySearch !

  // Nettoyage audio premium
  useEffect(() => {
    return () => {
      if (audioPlayer.audioState.premiumAdhanSound) {
        audioPlayer.audioState.premiumAdhanSound.unloadAsync();
      }
    };
  }, [audioPlayer.audioState.premiumAdhanSound]);

  // 🚀 NOUVEAU : Fonction pour marquer des changements en attente
  const markPendingChanges = () => {
    setHasPendingChanges(true);
  };

  // 🚀 NOUVEAU : Fonction centralisée pour appliquer tous les changements
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
        {
          text: t("cancel", "Annuler"),
          style: "cancel",
          onPress: () => {},
        },
        {
          text: t("apply", "Appliquer"),
          style: "default",
          onPress: async () => {
            try {
              console.log("🔔 Début application des changements...");
              uiManager.setIsApplyingChanges(true);

              await settings.saveAndReprogramAll();

              console.log("✅ Changements appliqués avec succès");
              setHasPendingChanges(false); // Reset l'état des changements en attente

              // Afficher la modal de succès après la reprogrammation
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

  // 🚀 ANCIEN : Fonction reprogrammateNotifications simplifiée (pour compatibilité)
  const reprogrammateNotifications = async () => {
    // Ne plus reprogrammer automatiquement, juste marquer les changements en attente
    markPendingChanges();
  };

  const getSoundDisplayName = useCallback(
    (soundId: string): string => {
      const translationKey = `sound_${soundId}`;
      const translatedName = t(translationKey, "");

      if (translatedName && translatedName !== translationKey) {
        return translatedName;
      }

      const premiumSoundTitles =
        premiumContent.premiumContentState.premiumSoundTitles;
      if (premiumSoundTitles[soundId]) {
        let cleanTitle = premiumSoundTitles[soundId];
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

      return soundId
        .replace(/[_-]/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
    },
    [t, premiumContent.premiumContentState.premiumSoundTitles]
  );

  // 🌍 FONCTION DE CHANGEMENT DE LANGUE - Copiée de l'original
  const onChangeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
    if (settings) {
      settings.setCurrentLanguage(langCode);

      // Reprogrammer automatiquement les notifications pour prendre en compte la nouvelle langue
      // On le fait de manière asynchrone pour ne pas bloquer l'interface
      setTimeout(async () => {
        try {
          await settings.saveAndReprogramAll();
        } catch (error) {
          console.log("Erreur reprogrammation notifications:", error);
        }
      }, 100); // Petit délai pour laisser l'interface se mettre à jour d'abord
    }
  };

  // 🎵 FONCTION SONS DISPONIBLES - Version scanner de dossier (plus fiable)
  const updateAvailableSounds = useCallback(async () => {
    // 🔧 FIX: Réduire les logs pour éviter la répétition

    try {
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

      const downloadedPremiumSounds: AdhanSoundKey[] = [];
      const premiumTitles: { [key: string]: string } = {};

      // 🚀 NOUVEAU : Si utilisateur premium, scanner le dossier physique
      if (user.isPremium) {
        try {
          const RNFS = await import("react-native-fs");
          const AsyncStorage = await import(
            "@react-native-async-storage/async-storage"
          );

          // Récupérer le chemin du dossier depuis AsyncStorage
          const downloadedContent = await LocalStorageManager.getPremium(
            "DOWNLOADED_CONTENT"
          );

          if (downloadedContent) {
            const downloaded = JSON.parse(downloadedContent);
            const contentIds = Object.keys(downloaded);

            // 🔧 FIX: Logs uniquement si debug nécessaire
            // console.log(`📁 Scan dossier: ${contentIds.length} adhans potentiels`);

            // Vérifier chaque adhan physiquement
            for (const contentId of contentIds) {
              const adhanData = downloaded[contentId];
              if (adhanData.downloadPath) {
                const filePath = adhanData.downloadPath.replace("file://", "");

                try {
                  const fileExists = await RNFS.default.exists(filePath);
                  if (fileExists) {
                    const fileStats = await RNFS.default.stat(filePath);

                    // Vérifier que le fichier n'est pas corrompu (> 1KB)
                    if (fileStats.size > 1000) {
                      downloadedPremiumSounds.push(contentId as AdhanSoundKey);

                      // Récupérer le titre depuis les données ou le catalogue
                      const catalogAdhan =
                        premiumContent.premiumContentState.availableAdhanVoices.find(
                          (a) => a.id === contentId
                        );
                      premiumTitles[contentId] =
                        catalogAdhan?.title || contentId;

                      // 🔧 FIX: Logs uniquement si debug nécessaire
                      // console.log(`✅ TROUVÉ: ${contentId} (${fileStats.size} bytes) - ${premiumTitles[contentId]}`);
                    }
                  }
                } catch (fileError) {
                  // 🔧 FIX: Logs uniquement en cas d'erreur critique
                  // console.log(`❌ ERREUR VÉRIFICATION: ${contentId} -`, fileError);
                }
              }
            }
          }
        } catch (scanError) {
          console.error("❌ Erreur scan dossier:", scanError);
        }
      }

      // Combiner et mettre à jour immédiatement
      const allAvailableSounds = [...baseSounds, ...downloadedPremiumSounds];

      // 🔧 FIX: Log final uniquement si changement significatif
      const hasChanged =
        allAvailableSounds.length !==
        premiumContent.premiumContentState.availableSounds.length;
      if (hasChanged) {
        console.log(
          `🎵 Sons mise à jour: ${baseSounds.length} base + ${downloadedPremiumSounds.length} premium`
        );
      }

      // Mettre à jour immédiatement
      premiumContent.setAvailableSounds(allAvailableSounds);
      premiumContent.setPremiumSoundTitles(premiumTitles);
    } catch (error) {
      console.error("❌ Erreur updateAvailableSounds:", error);

      // Fallback : adhans de base uniquement
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
      premiumContent.setAvailableSounds(baseSounds);
    }
  }, [premiumContent, user.isPremium]);

  // 🎵 FONCTIONS AUDIO OPTIMISÉES - Remplaçant les anciens placeholders

  // 🎵 FONCTIONS AUDIO PRINCIPALES - Adaptées pour les hooks optimisés
  const previewAdhanIdRef = React.useRef<string | null>(null);

  // Réinitialiser la preview si l'utilisateur change d'adhan sélectionné
  React.useEffect(() => {
    const selectedId = settings?.adhanSound;
    if (!selectedId) return;
    if (
      previewAdhanIdRef.current &&
      previewAdhanIdRef.current !== selectedId &&
      (audioPlayer.audioState.isPreviewing ||
        audioPlayer.audioState.currentPlayingAdhan === "main_preview")
    ) {
      // Arrêter et nettoyer immédiatement l'ancienne preview
      stopPreview().catch(() => {});
    }
  }, [settings?.adhanSound]);

  const playPreview = async () => {
    if (!settings) return;

    try {
      // 🚀 NOUVEAU : Arrêter l'adhan premium s'il est en cours de lecture
      if (
        audioPlayer.audioState.premiumAdhanSound &&
        (audioPlayer.audioState.isPlayingPremiumAdhan ||
          audioPlayer.audioState.currentPlayingPremiumAdhan)
      ) {
        await stopPremiumAdhan();
      }

      // 🚀 NOUVEAU : Réinitialiser si l'adhan de preview a changé
      const currentAdhanId = settings.adhanSound;
      if (
        previewAdhanIdRef.current &&
        previewAdhanIdRef.current !== currentAdhanId &&
        audioPlayer.audioState.sound
      ) {
        try {
          await audioPlayer.audioState.sound.unloadAsync();
        } catch {}
        audioPlayer.setPlaybackPosition(0);
        audioPlayer.setPlaybackDuration(0);
      }

      // Arrêter l'audio actuel s'il y en a un différent
      if (
        audioPlayer.audioState.sound &&
        audioPlayer.audioState.currentPlayingAdhan !== "main_preview"
      ) {
        await audioPlayer.audioState.sound.unloadAsync();
        audioPlayer.setPlaybackPosition(0);
        audioPlayer.setPlaybackDuration(0);
      }

      audioPlayer.setIsLoadingPreview(true);
      previewAdhanIdRef.current = currentAdhanId;
      audioPlayer.setCurrentPlayingAdhan("main_preview");

      let soundSource = soundObjects[settings.adhanSound];

      // Si c'est un son premium (commence par "adhan_" ou pas dans soundObjects), essayer de charger le fichier téléchargé ou streamer
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
            // 🚀 FIX: Éviter la duplication du préfixe file://
            const uri = downloadPath.startsWith("file://")
              ? downloadPath
              : "file://" + downloadPath;
            soundSource = { uri };
            // console.log(`🎵 Lecture locale (preview): ${uri}`);

            // 🔍 DIAGNOSTIC : Vérifier l'intégrité du fichier
            try {
              const RNFS = await import("react-native-fs");
              const filePath = uri.replace("file://", "");
              const fileExists = await RNFS.default.exists(filePath);
              if (fileExists) {
                const fileStats = await RNFS.default.stat(filePath);
                // console.log(
                //   `📊 Diagnostic fichier: ${fileStats.size} bytes, modifié: ${fileStats.mtime}`
                // );

                // Vérifier si le fichier est vide ou trop petit
                if (fileStats.size < 1000) {
                  // console.log(
                  //   `⚠️ Fichier suspect (trop petit): ${fileStats.size} bytes`
                  // );

                  // 🔍 DIAGNOSTIC : Lire le contenu pour voir ce qui a été téléchargé
                  try {
                    const fileContent = await RNFS.default.readFile(
                      filePath,
                      "utf8"
                    );
                    // console.log(
                    //   `🔍 Contenu du fichier corrompu (premiers 500 caractères):`,
                    //   fileContent.substring(0, 500)
                    // );
                  } catch (readError) {
                    // console.log(
                    //   `🔍 Impossible de lire le fichier comme texte:`,
                    //   readError
                    // );
                    // Essayer de lire en base64 pour voir si c'est du binaire
                    try {
                      const base64Content = await RNFS.default.readFile(
                        filePath,
                        "base64"
                      );
                      // console.log(
                      //   `🔍 Contenu en base64 (premiers 100 chars):`,
                      //   base64Content.substring(0, 100)
                      // );
                    } catch (base64Error) {
                      // console.log(
                      //   `🔍 Impossible de lire le fichier:`,
                      //   base64Error
                      // );
                    }
                  }
                }
              } // Fichier n'existe pas
            } catch (diagError) {
              // Erreur diagnostic fichier (silencieux)
            }
          } else {
            // 🌐 Priorité 2: Streaming via l'URL déjà présente dans l'état (évite un rechargement du catalogue)
            const premiumAdhan =
              premiumContent.premiumContentState.availableAdhanVoices.find(
                (a) => a.id === settings.adhanSound
              );
            if (premiumAdhan?.fileUrl) {
              soundSource = { uri: premiumAdhan.fileUrl };
            } else {
              audioPlayer.setIsLoadingPreview(false);
              audioPlayer.setCurrentPlayingAdhan(null);
              return;
            }
          }
        } catch (error) {
          console.log(
            "Erreur chargement son premium, abandon de la prévisualisation:",
            error
          );
          audioPlayer.setIsLoadingPreview(false);
          audioPlayer.setCurrentPlayingAdhan(null);
          return;
        }
      }

      const volumeLevel = settings.adhanVolume || 0.8;
      const sound = await audioManager.playSource(
        soundSource,
        volumeLevel,
        (status: any) => {
          if (status?.isLoaded) {
            if (status.positionMillis && status.positionMillis >= 20000) {
              console.log(
                "⏰ Preview limitée à 20 secondes - arrêt automatique"
              );
              stopPreview().catch(console.error);
              return;
            }
            if (status.didJustFinish) {
              audioPlayer.setIsPreviewing(false);
              audioPlayer.setIsAudioPlaying(false);
              audioPlayer.setCurrentPlayingAdhan(null);
              audioPlayer.setPlaybackPosition(0);
              audioPlayer.setPlaybackDuration(0);
            }
          }
        }
      );

      audioPlayer.setSound(sound);
      audioPlayer.setIsPreviewing(true);

      // Volume déjà appliqué via audioManager
      // 🔧 FIX: Log silencieux pour éviter les répétitions
      // console.log(`🔊 Volume appliqué à la preview: ${Math.round(volumeLevel * 100)}%`);

      // 🚀 FIX : Mettre à jour l'ID de l'adhan chargé (garder "main_preview" pour la jauge)
      audioPlayer.setCurrentPlayingAdhan("main_preview");

      // playAsync déjà déclenché par playSource
      // 🚀 FIX: Mettre isLoadingPreview à false et isAudioPlaying à true APRÈS que l'audio ait commencé
      audioPlayer.setIsLoadingPreview(false);
      audioPlayer.setIsAudioPlaying(true);

      // 🚀 FIX: Obtenir la durée totale une seule fois au début
      const soundStatus = await sound.getStatusAsync();
      if (soundStatus.isLoaded && soundStatus.durationMillis) {
        audioPlayer.setPlaybackDuration(soundStatus.durationMillis);
      }
    } catch (error) {
      console.log("Erreur prévisualisation:", error);
      audioPlayer.setIsPreviewing(false);
      audioPlayer.setIsLoadingPreview(false);
      audioPlayer.setIsAudioPlaying(false);
      audioPlayer.setCurrentPlayingAdhan(null);
    }
  };

  const stopPreview = async () => {
    await audioManager.stop();

    audioPlayer.setIsPreviewing(false);
    audioPlayer.setIsAudioPlaying(false);
    audioPlayer.setCurrentPlayingAdhan(null);
    audioPlayer.setPlaybackPosition(0);
    audioPlayer.setPlaybackDuration(0);
    previewAdhanIdRef.current = null;
  };

  // 🚀 FIX: Utiliser useCallback pour éviter les re-créations de fonctions
  const pausePreview = useCallback(async () => {
    try {
      if (audioPlayer.audioState.sound) {
        await audioManager.pause();
        // 🚀 FIX : Mettre à jour manuellement l'état isAudioPlaying
        audioPlayer.setIsAudioPlaying(false);
        // 🚀 FIX : Garder isPreviewing=true pour que la jauge reste visible
        // console.log("⏸️ Audio mis en pause");
      }
    } catch (error) {
      console.error("Erreur pause audio:", error);
    }
  }, [audioPlayer.audioState.sound]);

  const resumePreview = useCallback(async () => {
    try {
      if (audioPlayer.audioState.sound) {
        // 🔧 NOUVEAU : Appliquer le volume configuré lors de la reprise
        const volumeLevel = settings.adhanVolume || 0.8;
        await audioManager.setVolume(volumeLevel);
        await audioManager.resume();
        // 🚀 FIX : Mettre à jour manuellement l'état isAudioPlaying
        audioPlayer.setIsAudioPlaying(true);
        // 🚀 FIX : isPreviewing est déjà true, pas besoin de le remettre
        // console.log(`▶️ Audio repris avec volume: ${Math.round(volumeLevel * 100)}%`);
      }
    } catch (error) {
      console.error("Erreur reprise audio:", error);
    }
  }, [audioPlayer.audioState.sound, settings.adhanVolume]);

  const seekToPosition = useCallback(
    async (position: number) => {
      try {
        if (audioPlayer.audioState.sound) {
          const sound = audioManager.getSound();
          if (sound) {
            await sound.setPositionAsync(position);
          }
        }
      } catch (error) {
        console.error("Erreur navigation audio:", error);
      }
    },
    [audioPlayer.audioState.sound]
  );

  // Fonction utilitaire pour formater le temps
  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // 🎵 NOUVEAU : Fonctions de lecture pour les adhans premium
  const playPremiumAdhan = async (adhan: PremiumContent) => {
    try {
      audioPlayer.setIsLoadingPremiumAdhan(true);

      // 🚀 NOUVEAU : Arrêter le preview principal s'il est en cours
      if (
        audioPlayer.audioState.sound &&
        (audioPlayer.audioState.isPreviewing ||
          audioPlayer.audioState.currentPlayingAdhan === "main_preview")
      ) {
        await stopPreview();
      }

      // Arrêter toute lecture précédente
      if (audioPlayer.audioState.premiumAdhanSound) {
        await audioPlayer.audioState.premiumAdhanSound.unloadAsync();
        audioPlayer.setPremiumAdhanSound(null);
      }

      audioPlayer.setCurrentPlayingPremiumAdhan(adhan.id);

      let audioSource: any;

      // 🎯 Priorité 1: Fichier local téléchargé (hors ligne)
      const PremiumContentManager = (await import("../utils/premiumContent"))
        .default;
      const manager = PremiumContentManager.getInstance();
      const actualDownloadPath = await manager.isContentDownloaded(adhan.id);

      if (actualDownloadPath) {
        // 🚀 FIX: Éviter la duplication du préfixe file://
        const uri = actualDownloadPath.startsWith("file://")
          ? actualDownloadPath
          : "file://" + actualDownloadPath;
        audioSource = { uri };
        // console.log(`🎵 Lecture locale: ${uri}`);

        // 🔍 DIAGNOSTIC : Vérifier l'intégrité du fichier
        try {
          const RNFS = await import("react-native-fs");
          const filePath = uri.replace("file://", "");
          const fileExists = await RNFS.default.exists(filePath);
          if (fileExists) {
            const fileStats = await RNFS.default.stat(filePath);
            // console.log(
            //   `📊 Diagnostic fichier premium: ${fileStats.size} bytes, modifié: ${fileStats.mtime}`
            // );

            // Vérifier si le fichier est vide ou trop petit
            if (fileStats.size < 1000) {
              // console.log(
              //   `⚠️ Fichier premium suspect (trop petit): ${fileStats.size} bytes`
              // );

              // 🔍 DIAGNOSTIC : Lire le contenu pour voir ce qui a été téléchargé
              try {
                const fileContent = await RNFS.default.readFile(
                  filePath,
                  "utf8"
                );
                // console.log(
                //   `🔍 Contenu du fichier premium corrompu (premiers 500 caractères):`,
                //   fileContent.substring(0, 500)
                // );
              } catch (readError) {
                // console.log(
                //   `🔍 Impossible de lire le fichier premium comme texte:`,
                //   readError
                // );
                // Essayer de lire en base64 pour voir si c'est du binaire
                try {
                  const base64Content = await RNFS.default.readFile(
                    filePath,
                    "base64"
                  );
                  // console.log(
                  //   `🔍 Contenu premium en base64 (premiers 100 chars):`,
                  //   base64Content.substring(0, 100)
                  // );
                } catch (base64Error) {
                  // console.log(
                  //   `🔍 Impossible de lire le fichier premium:`,
                  //   base64Error
                  // );
                }
              }
            }
          } // Fichier premium n'existe pas
        } catch (diagError) {
          // Erreur diagnostic fichier premium (silencieux)
        }
      }
      // 🌐 Priorité 2: Streaming depuis Infomaniak
      else {
        audioSource = { uri: adhan.fileUrl };
        // console.log(`🌐 Streaming: ${adhan.fileUrl}`);
      }

      // Créer et configurer l'objet audio via AudioManager (lecture auto)
      const volumeLevel = settings.adhanVolume || 0.8;
      const newSound = await audioManager.playSource(
        audioSource,
        volumeLevel,
        (status: any) => {
          if (status?.isLoaded) {
            if (status.positionMillis && status.positionMillis >= 20000) {
              console.log(
                "⏰ Preview premium limitée à 20 secondes - arrêt automatique"
              );
              stopPremiumAdhan().catch(console.error);
              return;
            }
            // 🔧 OPTIMISÉ : Mise à jour silencieuse de la progression premium
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
      // 🔧 FIX: Log silencieux pour éviter les répétitions
      // console.log(`🔊 Volume appliqué à l'adhan premium: ${Math.round(volumeLevel * 100)}%`);

      audioPlayer.setPremiumAdhanSound(newSound);
      audioPlayer.setIsPlayingPremiumAdhan(true);

      // Callbacks gérés via AudioManager

      showToast({
        type: "success",
        title: actualDownloadPath
          ? t("toast_local_playback")
          : t("toast_streaming"),
        message: `${adhan.title} - ${
          actualDownloadPath ? "Fichier local" : "En streaming"
        }`,
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

  const pausePremiumAdhan = async () => {
    try {
      if (audioPlayer.audioState.premiumAdhanSound) {
        await audioPlayer.audioState.premiumAdhanSound.pauseAsync();
        audioPlayer.setIsPlayingPremiumAdhan(false);
      }
    } catch (error) {
      console.error("Erreur pause adhan premium:", error);
    }
  };

  const resumePremiumAdhan = async () => {
    try {
      if (audioPlayer.audioState.premiumAdhanSound) {
        // 🔧 NOUVEAU : Appliquer le volume configuré lors de la reprise
        const volumeLevel = settings.adhanVolume || 0.8;
        await audioPlayer.audioState.premiumAdhanSound.setVolumeAsync(
          volumeLevel
        );
        await audioPlayer.audioState.premiumAdhanSound.playAsync();
        audioPlayer.setIsPlayingPremiumAdhan(true);
        // 🔧 FIX: Log silencieux pour éviter les répétitions
        // console.log(`🔊 Volume appliqué à la reprise premium: ${Math.round(volumeLevel * 100)}%`);
      }
    } catch (error) {
      console.error("Erreur reprise adhan premium:", error);
    }
  };

  const seekPremiumAdhanPosition = async (positionMillis: number) => {
    try {
      if (audioPlayer.audioState.premiumAdhanSound) {
        await audioPlayer.audioState.premiumAdhanSound.setPositionAsync(
          positionMillis
        );
      }
    } catch (error) {
      console.error("Erreur navigation adhan premium:", error);
    }
  };

  // 🚀 NOUVEAU : Arrêter la lecture d'un adhan premium
  const stopPremiumAdhan = async () => {
    try {
      if (audioPlayer.audioState.premiumAdhanSound) {
        await audioPlayer.audioState.premiumAdhanSound.stopAsync();
        await audioPlayer.audioState.premiumAdhanSound.unloadAsync();
        audioPlayer.setPremiumAdhanSound(null);
      }
      audioPlayer.setIsPlayingPremiumAdhan(false);
      audioPlayer.setCurrentPlayingPremiumAdhan(null);
      audioPlayer.setPremiumAdhanPlaybackPosition(0);
      audioPlayer.setPremiumAdhanPlaybackDuration(0);
    } catch (error) {
      console.error("Erreur arrêt adhan premium:", error);
    }
  };

  // 🚀 FONCTIONS DE TÉLÉCHARGEMENT - Adaptées pour les hooks optimisés
  const loadAvailableAdhans = useCallback(
    async (forceRefresh = false) => {
      try {
        // 🔄 Chargement des adhans disponibles (silencieux si pas forceRefresh)
        if (forceRefresh) {
          // console.log("🔄 Actualisation forcée des adhans");
        } else {
          // console.log("🔄 Chargement adhans (pas forcé)");
        }

        // Vider le cache spécifique aux adhans si forceRefresh est true
        if (forceRefresh) {
          await LocalStorageManager.removePremium("DOWNLOADED_CONTENT");
        }

        // 🚀 NOUVEAU : Utiliser la méthode optimisée pour les adhans uniquement
        const PremiumContentManager = (await import("../utils/premiumContent"))
          .default;
        const manager = PremiumContentManager.getInstance();
        const adhans = await manager.getAdhanCatalogOnly();
        // console.log("🎵 Adhans récupérés:", adhans.length, adhans);

        if (adhans && adhans.length > 0) {
          // 🔍 DIAGNOSTIC: Vérifier si on écrase des téléchargements récents
          const currentAdhans =
            premiumContent.premiumContentState.availableAdhanVoices;
          const downloadedBefore = currentAdhans
            .filter((ad) => ad.isDownloaded)
            .map((ad) => ad.id);
          const downloadedAfter = adhans
            .filter((ad) => ad.isDownloaded)
            .map((ad) => ad.id);

          // console.log(
          // `📊 AVANT loadAvailableAdhans: ${
          //  downloadedBefore.length
          //  } téléchargés [${downloadedBefore.join(", ")}]`
          // );
          // console.log(
          //   `📊 APRÈS loadAvailableAdhans: ${
          //     downloadedAfter.length
          //   } téléchargés [${downloadedAfter.join(", ")}]`
          // );//

          const ecrasements = downloadedBefore.filter(
            (id) => !downloadedAfter.includes(id)
          );
          if (ecrasements.length > 0) {
            // console.log(
            //   `⚠️ ÉCRASEMENT DÉTECTÉ! Adhans perdus: [${ecrasements.join(
            //     ", "
            //   )}]`
            // );
          }

          premiumContent.setAvailableAdhanVoices(adhans);
        } else {
          // console.log("⚠️ Aucun adhan récupéré, liste vide");
          premiumContent.setAvailableAdhanVoices([]);
        }
      } catch (error) {
        console.error("Erreur rechargement adhans premium:", error);
        premiumContent.setAvailableAdhanVoices([]);
      }
    },
    [premiumContent]
  );

  // 🔄 NOUVEAU : Rafraîchir automatiquement la liste des adhans premium quand on arrive sur la page Settings
  useFocusEffect(
    useCallback(() => {
      const refreshAdhanListOnFocus = async () => {
        try {
          if (user.isPremium && premiumContent) {
            // console.log(
            //   "🔄 Page Settings active - Rafraîchissement automatique de la liste des adhans premium..."
            // );

            // Appel direct sans passer par la fonction pour éviter les dépendances cycliques
            try {
              const PremiumContentManager = (
                await import("../utils/premiumContent")
              ).default;
              const manager = PremiumContentManager.getInstance();
              const adhans = await manager.getAdhanCatalogOnly();

              if (adhans && adhans.length > 0) {
                // console.log(`🎵 Adhans récupérés: ${adhans.length}`);
                premiumContent.setAvailableAdhanVoices(adhans);

                // 🔧 NOUVEAU : Mettre à jour les titres premium pour les adhans téléchargés
                const premiumTitles: { [key: string]: string } = {};
                adhans.forEach((adhan) => {
                  if (adhan.isDownloaded) {
                    premiumTitles[adhan.id] = adhan.title;
                  }
                });

                if (Object.keys(premiumTitles).length > 0) {
                  premiumContent.setPremiumSoundTitles(premiumTitles);
                  // console.log(
                  //   `🏷️ Titres mis à jour pour ${
                  //     Object.keys(premiumTitles).length
                  //   } adhans téléchargés`
                  // );
                }
              } else {
                // console.log("⚠️ Aucun adhan récupéré, liste vide");
                premiumContent.setAvailableAdhanVoices([]);
              }

              //  console.log(
              //   "✅ Liste des adhans premium rafraîchie automatiquement"
              // );
            } catch (error) {
              console.error("Erreur rechargement adhans premium:", error);
              premiumContent.setAvailableAdhanVoices([]);
            }
          }
        } catch (error) {
          console.error(
            "❌ Erreur lors du rafraîchissement automatique des adhans:",
            error
          );
        }
      };

      refreshAdhanListOnFocus();
    }, [user.isPremium]) // Seulement user.isPremium comme dépendance
  );

  const handleDownloadAdhan = async (adhan: PremiumContent) => {
    // 🔔 NOUVEAU : Confirmation avant téléchargement avec ThemedAlert
    showThemedAlert({
      title: t("settings_screen.download_adhan_title") || "Télécharger l'adhan",
      message: `${
        t("settings_screen.download_adhan_message") || "Voulez-vous télécharger"
      } "${adhan.title}" ?\n\n${
        t("settings_screen.download_adhan_warning") ||
        "Le téléchargement peut prendre quelques minutes selon votre connexion."
      }`,
      buttons: [
        {
          text: t("settings_screen.download_adhan_cancel") || "Annuler",
          style: "cancel",
          onPress: () => {},
        },
        {
          text: t("settings_screen.download_adhan_confirm") || "Télécharger",
          style: "default",
          onPress: async () => {
            await performDownload(adhan);
          },
        },
      ],
      iconType: "download",
    });
  };

  // 🔧 NOUVEAU : Fonction de téléchargement séparée pour être appelée après confirmation
  const performDownload = async (adhan: PremiumContent) => {
    try {
      // 🚀 NOUVEAU : Téléchargement natif si disponible
      if (isNativeAvailable) {
        // 🔍 NOUVEAU : D'abord récupérer la vraie URL de téléchargement

        try {
          const response = await fetch(adhan.fileUrl);
          const jsonResponse = await response.json();

          if (jsonResponse.success && jsonResponse.data?.downloadUrl) {
            const realDownloadUrl = jsonResponse.data.downloadUrl;

            // Maintenant télécharger le vrai fichier MP3
            const { default: nativeDownloadManager } = await import(
              "../utils/nativeDownloadManager"
            );

            const downloadInfo = {
              contentId: adhan.id,
              url: realDownloadUrl,
              fileName: `${adhan.id}.mp3`,
              title: adhan.title,
            };

            await nativeDownloadManager.startDownload(downloadInfo);

            showToast({
              type: "info",
              title: t("toast_download_started_title"),
              message: `${adhan.title} - ${t(
                "toast_download_started_message"
              )}`,
            });

            // 🔧 OPTIMISÉ : Pas de setInterval répétitif
            // Les événements de téléchargement natif sont gérés par le useEffect dédié

            return; // Sortir de la fonction, le téléchargement natif se charge du reste
          } else {
            console.error("❌ Réponse API invalide:", jsonResponse);
            throw new Error("URL de téléchargement non trouvée");
          }
        } catch (urlError) {
          console.error("❌ Erreur récupération URL:", urlError);
          showToast({
            type: "error",
            title: t("toast_download_url_error_title"),
            message: t("toast_download_url_error_message"),
          });
          return;
        }
      }

      // 🔄 FALLBACK : Téléchargement classique si le téléchargement natif n'est pas disponible

      if (!user.isPremium) {
        showToast({
          type: "error",
          title: t("premium_required"),
          message: t("adhan_premium_only"),
        });
        return;
      }

      try {
        downloadManager.addDownloadingAdhan(adhan.id);

        // Variable pour gérer l'annulation
        let isCancelled = false;

        const cancelDownload = () => {
          isCancelled = true;
          // console.log(`🛑 Annulation demandée pour: ${adhan.id}`);
        };

        // Stocker la fonction d'annulation
        downloadManager.setDownloadController(adhan.id, cancelDownload);

        // Téléchargement classique
        const PremiumContentManager = (await import("../utils/premiumContent"))
          .default;
        const manager = PremiumContentManager.getInstance();
        const success = await manager.downloadPremiumContent(
          adhan,
          (progress) => {
            if (!isCancelled) {
              downloadManager.setDownloadProgress(adhan.id, progress);
            }
          },
          () => isCancelled
        );

        if (success && !isCancelled) {
          showToast({
            type: "success",
            title: t("toast_download_completed_title"),
            message: `${adhan.title} ${t("toast_download_completed_message")}`,
          });

          // Mettre à jour la liste
          const updatedAdhans =
            premiumContent.premiumContentState.availableAdhanVoices.map((ad) =>
              ad.id === adhan.id ? { ...ad, isDownloaded: true } : ad
            );
          premiumContent.setAvailableAdhanVoices(updatedAdhans);
          // await settings.updateAvailableSounds(); // TODO: Vérifier cette méthode
        } else if (isCancelled) {
          showToast({
            type: "info",
            title: t("toast_download_cancelled_title"),
            message: t("toast_download_cancelled_message"),
          });
        } else {
          showToast({
            type: "error",
            title: t("toast_download_failed_title"),
            message: `${t("toast_download_failed_message")} ${adhan.title}`,
          });
        }
      } catch (fallbackError) {
        console.error("Erreur téléchargement fallback:", fallbackError);
        showToast({
          type: "error",
          title: t("toast_download_error_title"),
          message: t("toast_download_error_message"),
        });
      } finally {
        downloadManager.removeDownloadingAdhan(adhan.id);
        downloadManager.clearDownloadProgress(adhan.id);
        downloadManager.removeDownloadController(adhan.id);
      }
    } catch (error) {
      console.error("Erreur téléchargement adhan:", error);
      showToast({
        type: "error",
        title: t("toast_download_error_title"),
        message: t("toast_download_error_message"),
      });
    }
  };

  // 🚀 NOUVEAU : Écouter les événements de téléchargement natif pour les adhans (comme l'ancien fichier)
  useEffect(() => {
    if (!isNativeAvailable) return;

    const handleNativeDownloadCompleted = async (
      contentId: string,
      localUri: string
    ) => {
      //  console.log(`🎉 Téléchargement natif adhan terminé: ${contentId}`);

      try {
        // 🚀 NOUVEAU : Vérifier si déjà traité avec succès (adhan déjà marqué comme téléchargé)
        const currentAdhans =
          premiumContent.premiumContentState.availableAdhanVoices;
        const existingAdhan = currentAdhans.find((a) => a.id === contentId);

        if (existingAdhan && existingAdhan.isDownloaded === true) {
          // console.log(
          //   `⏸️ ${contentId} déjà marqué comme téléchargé, traitement ignoré`
          // );
          return;
        }

        // console.log(`🔄 Synchronisation forcée des données pour: ${contentId}`);

        const PremiumContentManager = (await import("../utils/premiumContent"))
          .default;
        const premiumManager = PremiumContentManager.getInstance();

        // Forcer la persistance immédiate
        const migratedPath = await premiumManager.migrateFileToInternal(
          localUri.replace("file://", ""),
          contentId
        );

        const finalPath = migratedPath || localUri;
        await premiumManager.markContentAsDownloaded(contentId, finalPath);
        // console.log(
        //   `✅ Persistance forcée terminée: ${contentId} -> ${finalPath}`
        // );

        // 🔧 FIX: Mise à jour incrémentale au lieu de remplacement complet
        // Évite les race conditions lors de téléchargements multiples
        const currentAdhansList =
          premiumContent.premiumContentState.availableAdhanVoices;

        // Mettre à jour seulement l'adhan concerné
        const updatedAdhans = currentAdhansList.map((ad) =>
          ad.id === contentId
            ? { ...ad, isDownloaded: true, downloadPath: finalPath }
            : ad
        );

        // console.log(`🔧 Mise à jour incrémentale pour: ${contentId}`);
        premiumContent.setAvailableAdhanVoices(updatedAdhans);

        // Vérifier que la mise à jour a bien eu lieu
        const verifyAdhan = updatedAdhans.find((a) => a.id === contentId);
        // console.log(
        //   `🔍 Adhan après mise à jour incrémentale: ${contentId} -> isDownloaded=${verifyAdhan?.isDownloaded}`
        // );

        // 🚀 MISE À JOUR INSTANTANÉE de la liste de sélection avec les données fraîches
        await updateAvailableSounds();

        // 🚀 FEEDBACK IMMÉDIAT à l'utilisateur
        const adhanTitle =
          updatedAdhans.find((a) => a.id === contentId)?.title || contentId;
        showToast({
          type: "success",
          title: t("download.completed", "Téléchargement terminé"),
          message: t(
            "download.added_to_list",
            "✅ Ajouté à la liste: {{title}}",
            { title: adhanTitle }
          ),
        });

        // console.log(`✅ Synchronisation forcée terminée pour: ${contentId}`);
      } catch (error) {
        console.error(`❌ Erreur synchronisation forcée ${contentId}:`, error);

        // Fallback : mise à jour basique si la synchronisation échoue
        const currentAdhans =
          premiumContent.premiumContentState.availableAdhanVoices;
        const updatedAdhans = currentAdhans.map((ad) =>
          ad.id === contentId
            ? { ...ad, isDownloaded: true, downloadPath: localUri }
            : ad
        );
        premiumContent.setAvailableAdhanVoices(updatedAdhans);
        await updateAvailableSounds();

        showToast({
          type: "success",
          title: t("download.completed", "Téléchargement terminé"),
          message: t("download.item_downloaded", "✅ {{item}} téléchargé", {
            item: contentId,
          }),
        });
      }
    };

    const handleNativeDownloadFailed = (contentId: string) => {
      // console.log(`❌ Téléchargement natif adhan échoué: ${contentId}`);

      showToast({
        type: "error",
        title: t("download.failed", "Téléchargement échoué"),
        message: t("download.failed_message", "Le téléchargement a échoué"),
      });
    };

    const handleNativeDownloadCancelled = (contentId: string) => {
      // console.log(`🚫 Téléchargement natif adhan annulé: ${contentId}`);

      showToast({
        type: "info",
        title: t("download.cancelled", "Téléchargement annulé"),
        message: t(
          "download.cancelled_message",
          "Le téléchargement a été interrompu"
        ),
      });
    };

    // Écouter les changements dans downloadState de manière optimisée
    const checkDownloadState = () => {
      // 🔧 FIX: Compter seulement les téléchargements réellement actifs (en cours)
      const activeDownloads = Array.from(downloadState.values()).filter(
        (state) => state.isDownloading || (state.progress < 1 && !state.error)
      ).length;

      // 🔧 FIX: Logs uniquement si téléchargements VRAIMENT actifs
      if (activeDownloads > 0) {
        // console.log(`🔍 Téléchargements en cours: ${activeDownloads}`);
      }

      downloadState.forEach((state, contentId) => {
        // 🔧 FIX: Éviter les traitements répétitifs pour les fichiers définitivement traités
        if (permanentlyProcessedRef.current.has(contentId)) {
          return; // Fichier déjà traité définitivement, aucune action
        }

        // 🔧 FIX: Éviter les logs répétitifs pour les fichiers déjà traités dans ce cycle
        if (processedThisCycleRef.current.has(contentId)) {
          return; // Pas de log répétitif dans le même cycle
        }

        if (!state.isDownloading && state.progress === 1 && state.localUri) {
          // Téléchargement terminé
          // console.log(`✅ Téléchargement terminé: ${contentId}`);
          processedThisCycleRef.current.add(contentId);
          permanentlyProcessedRef.current.add(contentId); // Marquer comme définitivement traité
          handleNativeDownloadCompleted(contentId, state.localUri);
        } else if (!state.isDownloading && state.error) {
          // Téléchargement échoué
          // console.log(`❌ Téléchargement échoué: ${contentId}`);
          processedThisCycleRef.current.add(contentId);
          permanentlyProcessedRef.current.add(contentId); // Marquer comme définitivement traité
          handleNativeDownloadFailed(contentId);
        }
        // 🔧 FIX: Supprimer les logs pour les téléchargements en cours
      });
    };

    // 🔧 FIX: Vérifier l'état seulement si nécessaire
    const activeDownloads = Array.from(downloadState.values()).filter(
      (state) => state.isDownloading || (state.progress < 1 && !state.error)
    ).length;

    // Ne vérifier que s'il y a des téléchargements actifs ou terminés non traités
    const hasUnprocessedCompleted = Array.from(downloadState.entries()).some(
      ([contentId, state]) =>
        !permanentlyProcessedRef.current.has(contentId) &&
        !processedThisCycleRef.current.has(contentId) &&
        !state.isDownloading &&
        (state.progress === 1 || state.error)
    );

    if (activeDownloads > 0 || hasUnprocessedCompleted) {
      checkDownloadState();
    }

    // 🔧 FIX: Vider le cache de traitement quand les téléchargements sont terminés
    return () => {
      // Vider le cache si aucun téléchargement réellement actif
      const activeDownloads = Array.from(downloadState.values()).filter(
        (state) => state.isDownloading || (state.progress < 1 && !state.error)
      ).length;

      if (activeDownloads === 0) {
        processedThisCycleRef.current.clear();
      }
    };
  }, [
    isNativeAvailable,
    downloadState,
    showToast,
    premiumContent,
    updateAvailableSounds,
    forceRefreshAdhans,
    loadAvailableAdhans,
  ]);

  const handleCancelDownload = (adhanId: string) => {
    // console.log("🛑 Annulation demandée pour:", adhanId);

    // 🚀 NOUVEAU : Utiliser le système natif si disponible
    if (isNativeAvailable) {
      try {
        // Supposons que cancelDownload est une fonction globale pour le téléchargement natif
        // cancelDownload(adhanId);
        // console.log("✅ Annulation natif demandée pour:", adhanId);
      } catch (error) {
        console.error("❌ Erreur annulation natif:", error);
      }
    } else {
      // 🚀 FALLBACK : Ancien système
      const cancelFunction =
        downloadManager.downloadState.downloadControllers[adhanId];
      if (cancelFunction) {
        // console.log("✅ Fonction d'annulation trouvée, appel...");
        cancelFunction();
      } else {
        // console.log("⚠️ Aucune fonction d'annulation trouvée");
      }
    }

    // 🚀 FIX: Nettoyer immédiatement les états pour une réponse instantanée
    downloadManager.removeDownloadingAdhan(adhanId);
    downloadManager.clearDownloadProgress(adhanId);
    downloadManager.removeDownloadController(adhanId);

    // 🚀 FIX: Afficher le toast de manière asynchrone pour ne pas bloquer
    setTimeout(() => {
      showToast({
        type: "info",
        title: t("toast_download_cancelled_title"),
        message: t("toast_download_cancelled_message"),
      });
    }, 50);
  };

  const handleDeleteAdhan = async (adhan: PremiumContent) => {
    showThemedAlert({
      title: t("settings_screen.delete_adhan_title"),
      message: `${t("settings_screen.delete_adhan_message")} "${
        adhan.title
      }" ?`,
      buttons: [
        {
          text: t("settings_screen.delete_adhan_cancel"),
          style: "cancel",
          onPress: () => {},
        },
        {
          text: t("settings_screen.delete_adhan_confirm"),
          style: "destructive",
          onPress: async () => {
            try {
              const PremiumContentManager = (
                await import("../utils/premiumContent")
              ).default;
              const manager = PremiumContentManager.getInstance();
              const success = await manager.deletePremiumContent(adhan.id);
              if (success) {
                showToast({
                  type: "info",
                  title: t("toast_adhan_deleted_title"),
                  message: `${adhan.title} ${t("toast_adhan_deleted_message")}`,
                });

                // 🚀 NOUVEAU : Invalider le cache adhans après suppression
                await manager.invalidateAdhanCache();
                // console.log(
                //   `🧹 Cache adhans invalidé après suppression de: ${adhan.id}`
                // );

                // 🚀 CORRECTION : Mettre à jour UNIQUEMENT localement sans appel serveur
                const updatedAdhans =
                  premiumContent.premiumContentState.availableAdhanVoices.map(
                    (ad: PremiumContent) =>
                      ad.id === adhan.id
                        ? {
                            ...ad,
                            isDownloaded: false,
                            downloadPath: undefined,
                          }
                        : ad
                  );
                premiumContent.setAvailableAdhanVoices(updatedAdhans);

                // 🚀 CORRECTION : Mettre à jour immédiatement la liste de sélection
                await updateAvailableSounds();

                //  console.log(
                //   `✅ Suppression et mise à jour locale terminée pour: ${adhan.id}`
                // );
              } else {
                showToast({
                  type: "error",
                  title: t("toast_delete_error_title"),
                  message: t("toast_delete_error_message"),
                });
              }
            } catch (error) {
              console.error("Erreur suppression adhan:", error);
              showToast({
                type: "error",
                title: t("toast_delete_error_title"),
                message: t("toast_delete_error_message"),
              });
            }
          },
        },
      ],
      iconType: "delete",
    });
  };

  const handleBuyPremium = async () => {
    try {
      // console.log("🚀 Ouverture de la modal premium...");

      // 🚀 NOUVEAU : Ouvrir la modal premium
      uiManager.setShowPremiumModal(true);
    } catch (error) {
      console.error("❌ Erreur ouverture modal premium:", error);
      showToast({
        type: "error",
        title: t("toast_error"),
        message: t("toast_premium_modal_error"),
      });
    }
  };

  // 🚀 FONCTIONS DE DIAGNOSTIC - Adaptées pour les hooks optimisés
  const cleanupCorruptedFiles = async () => {
    try {
      showToast({
        type: "info",
        title: t("toast_cleanup_started_title"),
        message: t("toast_cleanup_started_message"),
      });

      const RNFS = await import("react-native-fs");
      const PremiumContentManager = (await import("../utils/premiumContent"))
        .default;
      const manager = PremiumContentManager.getInstance();

      // 🗑️ NOUVEAU : Nettoyer complètement le dossier premium_content
      // Récupérer le chemin depuis les fichiers existants
      const downloadedContent = await LocalStorageManager.getPremium(
        "DOWNLOADED_CONTENT"
      );
      if (!downloadedContent) {
        showToast({
          type: "info",
          title: t("toast_cleanup_no_files_title"),
          message: t("toast_cleanup_no_files_message"),
        });
        return;
      }

      const downloaded = JSON.parse(downloadedContent);
      const contentIds = Object.keys(downloaded);

      if (contentIds.length === 0) {
        showToast({
          type: "info",
          title: t("toast_cleanup_no_files_title"),
          message: t("toast_cleanup_no_files_message"),
        });
        return;
      }

      // Récupérer le dossier depuis le premier fichier
      const firstFile = downloaded[contentIds[0]];
      const firstFilePath = firstFile.downloadPath?.replace("file://", "");

      if (!firstFilePath) {
        showToast({
          type: "error",
          title: t("toast_error"),
          message: t("toast_cleanup_folder_error_message"),
        });
        return;
      }

      const premiumContentDir = firstFilePath.substring(
        0,
        firstFilePath.lastIndexOf("/")
      );
      // console.log(`🗑️ Dossier à nettoyer: ${premiumContentDir}`);

      let cleanedCount = 0;
      let totalSize = 0;

      // Vérifier si le dossier existe
      const dirExists = await RNFS.default.exists(premiumContentDir);
      if (!dirExists) {
        showToast({
          type: "info",
          title: t("toast_cleanup_empty_folder_title"),
          message: t("toast_cleanup_no_files_message"),
        });
        return;
      }

      // Lister tous les fichiers dans le dossier
      const files = await RNFS.default.readdir(premiumContentDir);
      // console.log(`🗑️ Nettoyage: ${files.length} fichiers trouvés`);

      // Supprimer tous les fichiers
      for (const fileName of files) {
        const filePath = `${premiumContentDir}/${fileName}`;
        try {
          const fileStats = await RNFS.default.stat(filePath);
          totalSize += fileStats.size;

          await RNFS.default.unlink(filePath);
          cleanedCount++;
          // console.log(`🗑️ Supprimé: ${fileName} (${fileStats.size} bytes)`);
        } catch (fileError) {
          console.error(`❌ Erreur suppression ${fileName}:`, fileError);
        }
      }

      // 🧹 Vider complètement les données de téléchargement
      await LocalStorageManager.removePremium("DOWNLOADED_CONTENT");
      await manager.invalidateAdhanCache();
      // console.log("🧹 Données de téléchargement et cache vidés");

      // 🚀 CORRECTION : Mettre à jour UNIQUEMENT localement sans appel serveur
      const updatedAdhans =
        premiumContent.premiumContentState.availableAdhanVoices.map(
          (adhan: PremiumContent) => ({
            ...adhan,
            isDownloaded: false,
            downloadPath: undefined,
          })
        );
      premiumContent.setAvailableAdhanVoices(updatedAdhans);

      // 🚀 CORRECTION : Mettre à jour immédiatement la liste de sélection
      updateAvailableSounds();

      const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);

      showToast({
        type: "success",
        title: t("toast_cleanup_completed_title"),
        message: t("toast_cleanup_completed_detailed_message", {
          count: cleanedCount,
          size: sizeInMB,
        }),
      });

      // console.log(
      //   `✅ Nettoyage terminé: ${cleanedCount} fichiers, ${sizeInMB} MB libérés`
      // );
    } catch (error) {
      console.error("❌ Erreur nettoyage:", error);
      showToast({
        type: "error",
        title: t("toast_cleanup_error_title"),
        message: t("toast_cleanup_error_message"),
      });
    }
  };

  const diagnoseAndCleanFiles = async () => {
    try {
      showToast({
        type: "info",
        title: t("toast_diagnostic_started_title"),
        message: t("toast_diagnostic_started_message"),
      });

      const PremiumContentManager = (await import("../utils/premiumContent"))
        .default;
      const manager = PremiumContentManager.getInstance();

      // 🚀 NOUVEAU : Téléchargement forcé pour Ibrahim Al Arkani
      const forceResult = await manager.forceDownloadWithPersistence(
        "adhan_ibrahim_al_arkani"
      );

      // 🚀 NOUVEAU : Diagnostic complet de persistance
      const persistenceResult = await manager.diagnosePersistenceIssue();

      // 🚀 NOUVEAU : Synchronisation complète forcée
      const syncResult = await manager.forceFullSync();

      // 🚀 NOUVEAU : Forcer la sauvegarde de la version pour éviter les suppressions futures
      await manager.forceMarkCurrentVersion();

      // Nettoyer les fichiers corrompus
      await manager.cleanupCorruptedDownloads();

      // Afficher le rapport de diagnostic détaillé
      const recommendations = persistenceResult.recommendations.join(", ");
      const message = `
Téléchargement forcé:
• Succès: ${forceResult.success ? "✅" : "❌"}
• Fichier: ${forceResult.filePath ? "✅" : "❌"}
• Erreur: ${forceResult.error || "Aucune"}

Fichiers trouvés:
• Dossier principal: ${persistenceResult.filesInMainDir.length}
• Dossier natif: ${persistenceResult.filesInNativeDir.length}
• Synchronisés: ${syncResult.syncedFiles}
• Nettoyés: ${syncResult.cleanedFiles}

${
  recommendations
    ? `Recommandations: ${recommendations}`
    : "Tout semble correct !"
}
              `.trim();

      showToast({
        type: syncResult.errors.length > 0 ? "error" : "success",
        title: t("toast_diagnostic_completed_title"),
        message: message,
      });

      // Log détaillé pour debug
      /*
        // console.log("🔍 Diagnostic complet:", {
          forceResult,
          persistenceResult,
          syncResult,
        });
        */

      // 🚀 CORRECTION : Utiliser forceRefreshAdhans au lieu de loadAvailableAdhans
      // pour préserver les téléchargements locaux après diagnostic
      await forceRefreshAdhans();
    } catch (error) {
      console.error("Erreur diagnostic:", error);
      showToast({
        type: "error",
        title: t("toast_diagnostic_error_title"),
        message: t("toast_diagnostic_error_message"),
      });
    }
  };

  // 🎯 COMPOSANT SETTINGSSECTIONS COMPLET - Partie 1/4: Déclaration et hooks
  return (
    <ThemedImageBackground style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 20}
        >
          {/* 🚀 NOUVEAU : Header avec titre et bouton premium */}
          <View style={styles.headerContainer}>
            <Text style={styles.title}>
              {t("settings_title", "Paramètres")}
            </Text>
            <TouchableOpacity
              style={styles.premiumButton}
              onPress={() => uiManager.setShowPremiumModal(true)}
            >
              <MaterialCommunityIcons
                name="account-circle"
                size={28}
                color={overlayTextColor}
              />
            </TouchableOpacity>
          </View>

          {/* 🚀 NOUVEAU : SettingsSections avec les hooks optimisés */}
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
            // 🚀 NOUVEAU : UI Mode location externe (stable)
            locationUIMode={locationUIMode}
            setLocationUIMode={setLocationUIMode}
            // 🏙️ États recherche ville depuis hooks optimisés
            cityInput={citySearch.citySearchState.cityInput}
            citySearchResults={citySearchAPI.results} // ✅ Utiliser les résultats de l'API
            citySearchLoading={citySearchAPI.loading} // ✅ Utiliser le loading de l'API
            // 🏙️ Fonctions ville - RECHERCHE MANUELLE SEULEMENT
            handleCityInputChange={(text: string) => {
              // ✅ MAINTENIR la section location OUVERTE pendant la recherche !
              if (activeSection !== "location") {
                setActiveSection("location");
              }

              // ✅ Mettre à jour l'état local + déclencher la vraie recherche API
              citySearch.setCityInput(text);
              citySearchAPI.searchCity(text); // 🚀 Déclenche la recherche API
            }}
            selectCity={(city: any) => {
              // ✅ MAINTENIR la section location OUVERTE après sélection !
              if (activeSection !== "location") {
                setActiveSection("location");
              }

              citySearch.setCityInput(city.display_name);
              citySearch.clearSearchResults();
              // Sauvegarder dans les paramètres
              if (settings?.setManualLocation) {
                settings.setManualLocation({
                  lat: parseFloat(city.lat),
                  lon: parseFloat(city.lon),
                  city: city.display_name.split(",")[0].trim(),
                });
              }
            }}
            // 🎵 États audio depuis hooks optimisés
            isPreviewing={audioPlayer.audioState.isPreviewing}
            isAudioPlaying={audioPlayer.audioState.isAudioPlaying}
            currentPlayingAdhan={audioPlayer.audioState.currentPlayingAdhan}
            isLoadingPreview={audioPlayer.audioState.isLoadingPreview}
            // 🎵 Fonctions audio via audioPlayer hook
            playPreview={playPreview}
            stopPreview={stopPreview}
            pausePreview={pausePreview}
            resumePreview={resumePreview}
            // 🎵 États premium audio depuis hooks optimisés
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
            // 🎵 Fonctions premium audio via audioPlayer hook
            playPremiumAdhan={playPremiumAdhan}
            pausePremiumAdhan={pausePremiumAdhan}
            resumePremiumAdhan={resumePremiumAdhan}
            seekPremiumAdhanPosition={seekPremiumAdhanPosition}
            stopPremiumAdhan={stopPremiumAdhan}
            // 📥 États téléchargement depuis hooks optimisés
            availableAdhanVoices={
              premiumContent.premiumContentState.availableAdhanVoices
            }
            downloadingAdhans={downloadManager.downloadState.downloadingAdhans}
            downloadProgress={downloadManager.downloadState.downloadProgress}
            isApplyingChanges={uiManager.uiState.isApplyingChanges}
            downloadState={downloadState} // 🔧 AJOUTÉ : État téléchargement natif
            user={user} // 🔧 AJOUTÉ : User depuis usePremium
            // 📥 Fonctions téléchargements via downloadManager hook
            handleDownloadAdhan={handleDownloadAdhan}
            handleDeleteAdhan={handleDeleteAdhan}
            handleCancelDownload={handleCancelDownload}
            loadAvailableAdhans={loadAvailableAdhans}
            // 🔧 Fonctions utilitaires
            getSoundDisplayName={getSoundDisplayName}
            formatTime={formatTime}
            // 🔧 Fonctions premium auth
            activatePremium={activatePremium}
            showToast={showToast}
            handleBuyPremium={handleBuyPremium}
            onLoginSuccess={handleLoginSuccess}
            forceLogout={forceLogout}
            // 🧹 Fonctions nettoyage
            cleanupCorruptedFiles={cleanupCorruptedFiles}
            diagnoseAndCleanFiles={diagnoseAndCleanFiles}
            // 🔧 FIX: Fonction de mise à jour des sons
            updateAvailableSounds={updateAvailableSounds}
            // 🔧 FIX: Fonction de rafraîchissement des adhans du hook
            forceRefreshAdhans={forceRefreshAdhans}
            // 🎨 Référence
            sectionListRef={sectionListRef}
            // 🎨 Styles
            styles={styles}
            premiumContent={premiumContent}
            // 🚀 NOUVEAU : Props pour la gestion des sections actives
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            // 🔧 AJOUTÉ : Props pour le thème
            currentTheme={currentTheme}
            setThemeMode={settings.setThemeMode}
            // 🚀 NOUVEAU : Props pour la gestion des changements en attente
            hasPendingChanges={hasPendingChanges}
            markPendingChanges={markPendingChanges}
            applyAllChanges={applyAllChanges}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* 🌙 Modal de confirmation mystique */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={uiManager.uiState.showSuccessModal}
        onRequestClose={() => uiManager.setShowSuccessModal(false)}
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
              onPress={() => uiManager.setShowSuccessModal(false)}
            >
              <Text style={styles.modalButtonText}>✨ بارك الله فيك ✨</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 👑 Modal Premium */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={uiManager.uiState.showPremiumModal}
        onRequestClose={() => uiManager.setShowPremiumModal(false)}
      >
        <View style={styles.premiumModalOverlay}>
          <View style={styles.premiumModalContent}>
            <View style={styles.premiumModalHeader}>
              <Text style={styles.premiumModalTitle}>
                👑 {t("premium_access", "Accès Premium")}
              </Text>
              <TouchableOpacity
                style={styles.premiumModalCloseButton}
                onPress={() => uiManager.setShowPremiumModal(false)}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={
                    currentTheme === "light" ? colors.textSecondary : "#CBD5E1"
                  }
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              <PremiumLoginSection
                activatePremium={activatePremium}
                styles={styles}
                showToast={showToast}
                t={t}
                onLoginSuccess={(userData) => {
                  handleLoginSuccess(userData);
                }}
                isInModal={true}
              />

              {/* 🚀 Toast dans la zone scrollable pour rester visible */}
              <View style={styles.modalToastContainer} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 🚀 NOUVEAU : ThemedAlert personnalisé */}
      {themedAlert && (
        <ThemedAlert
          visible={themedAlert.visible}
          title={themedAlert.title}
          message={themedAlert.message}
          buttons={themedAlert.buttons}
          onClose={() => setThemedAlert(null)}
        />
      )}
    </ThemedImageBackground>
  );
}

// 🎨 STYLES COMPLETS - Copiés et adaptés de l'original
const getStyles = (
  colors: any,
  overlayTextColor: string,
  overlayIconColor: string,
  currentTheme: "light" | "dark"
) =>
  StyleSheet.create({
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
      flex: 1, // 🚀 NOUVEAU : Pour que le titre prenne l'espace disponible
    },
    // 🚀 NOUVEAU : Styles pour le header avec bouton premium
    headerContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
    },
    premiumButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor:
        currentTheme === "light"
          ? "rgba(255, 255, 255, 0.2)"
          : "rgba(0, 0, 0, 0.3)",
      borderWidth: 1,
      borderColor:
        currentTheme === "light"
          ? "rgba(255, 255, 255, 0.3)"
          : "rgba(255, 255, 255, 0.2)",
      shadowColor: currentTheme === "light" ? colors.shadow : "#D4AF37",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    text: {
      color: overlayTextColor,
    },
    // 🌙 Modal de confirmation mystique - Styles originaux
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
    // Premium Modal
    premiumModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      justifyContent: "flex-end",
    },
    premiumModalContent: {
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(15, 23, 42, 0.95)",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: "90%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.5,
      shadowRadius: 24,
      elevation: 12,
    },
    premiumModalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.2)",
    },
    premiumModalTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      flex: 1,
    },
    premiumModalCloseButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor:
        currentTheme === "light" ? colors.cardBG : "rgba(30, 41, 59, 0.8)",
    },
    modalToastContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 999999,
      elevation: 999999,
      pointerEvents: "box-none",
    },
    // 🏙️ Styles pour la section location
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
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      marginHorizontal: 2,
      flex: 1, // 🔧 FIX: Partager l'espace équitablement
      minWidth: 85, // 🔧 FIX: Largeur minimum pour éviter les retours à la ligne
      maxWidth: 120, // 🔧 FIX: Limiter la largeur maximale
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
    toggleContainer: {
      flexDirection: "row",
      justifyContent: "space-between", // 🔧 FIX: Répartir uniformément les boutons
      marginTop: 12,
      marginBottom: 16,
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(15, 23, 42, 0.8)",
      borderRadius: 12,
      padding: 4,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
      shadowColor: currentTheme === "light" ? colors.shadow : "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
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
      fontSize: 14,
      color: currentTheme === "light" ? colors.textSecondary : "#CBD5E1",
      textAlign: "center",
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
      // 🔧 Assurer la visibilité au-dessus du clavier
      zIndex: 10,
    },

    // 🚀 NOUVEAUX STYLES pour la recherche manuelle
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 12,
    },

    searchInput: {
      flex: 1,
      marginBottom: 0, // Override du marginBottom de input
    },

    searchButton: {
      backgroundColor: "#2E7D32",
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderRadius: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: "#1B5E20",
    },

    searchButtonText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "600",
      textAlign: "center",
    },
    resultsList: {
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(15, 23, 42, 0.9)",
      borderRadius: 12,
      shadowColor: currentTheme === "light" ? colors.shadow : "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
    },
    resultItem: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.2)",
    },

    // 🚀 NOUVEAU : Style pour le texte des résultats adapté au thème
    resultText: {
      fontSize: 16,
      lineHeight: 22,
      color: currentTheme === "light" ? colors.text : "#F8FAFC", // ✅ Blanc sur thème sombre
      fontWeight: "500",
    },
    // 🎵 Styles pour les contrôles audio
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 16,
      paddingHorizontal: 20,
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(15, 23, 42, 0.8)",
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
      shadowColor: currentTheme === "light" ? colors.shadow : "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    label: {
      fontSize: 16,
      fontWeight: "600",
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      letterSpacing: -0.2,
    },
    pickerContainer: {
      flex: 1,
      marginLeft: 16,
      backgroundColor:
        currentTheme === "light" ? colors.cardBG : "rgba(30, 41, 59, 0.8)",
      borderRadius: 8,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
    },
    pickerContainerFull: {
      flex: 1,
      marginLeft: 16,
      backgroundColor:
        currentTheme === "light" ? colors.cardBG : "rgba(30, 41, 59, 0.8)",
      borderRadius: 8,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
    },
    picker: {
      height: 50,
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
    },
    pickerItem: {
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      fontSize: 16,
    },
    previewControlsContainer: {
      marginTop: 20,
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
    previewControls: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 16,
    },
    previewInfo: {
      fontSize: 12,
      color: currentTheme === "light" ? colors.textSecondary : "#CBD5E1",
      textAlign: "center",
      marginBottom: 8,
      fontStyle: "italic",
    },
    playButtonMain: {
      backgroundColor:
        currentTheme === "light" ? colors.primary : "rgba(212, 175, 55, 0.9)",
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: currentTheme === "light" ? colors.shadow : "#D4AF37",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 2,
      borderColor:
        currentTheme === "light" ? colors.primary : "rgba(212, 175, 55, 0.5)",
    },
    stopButtonMain: {
      backgroundColor:
        currentTheme === "light" ? "#EF4444" : "rgba(239, 68, 68, 0.9)",
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: currentTheme === "light" ? "#EF4444" : "#EF4444",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 2,
      borderColor:
        currentTheme === "light" ? "#EF4444" : "rgba(239, 68, 68, 0.5)",
    },
    progressContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 20,
      gap: 12,
    },
    timeText: {
      fontSize: 12,
      color: currentTheme === "light" ? colors.textSecondary : "#CBD5E1",
      fontWeight: "500",
      minWidth: 45,
      textAlign: "center",
    },
    progressBarContainer: {
      flex: 1,
      height: 40,
      justifyContent: "center",
    },
    progressBar: {
      height: 8,
      backgroundColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
      borderRadius: 4,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor:
        currentTheme === "light" ? colors.primary : "rgba(212, 175, 55, 0.9)",
      borderRadius: 4,
    },
    sliderContainer: {
      flex: 1,
      marginLeft: 16,
      alignItems: "center",
    },
    sliderValue: {
      fontSize: 14,
      color: currentTheme === "light" ? colors.textSecondary : "#CBD5E1",
      fontWeight: "600",
      marginTop: 8,
    },
    // 📋 Styles pour les sections
    sectionHeader: {
      fontSize: 20,
      fontWeight: "700",
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      paddingTop: 24,
      paddingBottom: 12,
      paddingHorizontal: 20,
      backgroundColor: "transparent",
      letterSpacing: -0.3,
      textShadowColor:
        currentTheme === "light"
          ? "rgba(255, 255, 255, 0.5)"
          : "rgba(0,0,0,0.7)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    subLabel: {
      fontSize: 15,
      fontWeight: "500",
      color: currentTheme === "light" ? colors.textSecondary : "#CBD5E1",
      letterSpacing: -0.1,
    },
    // 🚀 NOUVEAU : Styles manquants pour les sections premium
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
      maxWidth: 120,
      gap: 6,
    },
    downloadProgressRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      gap: 8,
    },
    progressBarPremium: {
      width: 80,
      height: 6,
      backgroundColor: "rgba(78, 205, 196, 0.2)",
      borderRadius: 3,
      overflow: "hidden",
    },
    progressFillPremium: {
      height: "100%",
      backgroundColor: "#4ECDC4",
      borderRadius: 2,
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
    cancelDownloadButton: {
      backgroundColor: "rgba(255, 107, 107, 0.2)",
      borderRadius: 20,
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "#FF6B6B",
    },

    // 🔧 NOUVEAU : Styles pour les éléments téléchargés
    downloadedContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minWidth: 180,
      gap: 12,
      flexWrap: "nowrap",
    },
    downloadedIndicator: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(78, 205, 196, 0.1)",
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: "rgba(78, 205, 196, 0.3)",
      flexShrink: 0,
      minWidth: 120,
      maxWidth: 160,
      flexWrap: "nowrap",
    },
    downloadedText: {
      marginLeft: 6,
      fontSize: 13,
      color: "#4ECDC4",
      fontWeight: "600",
      flexShrink: 0,
    },

    // 🚀 NOUVEAU : Styles pour les actions
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

    // 🚀 NOUVEAU : Styles pour les sections premium buy et status
    premiumBuySection: {
      alignItems: "center",
      padding: 20,
      backgroundColor: "rgba(255, 215, 0, 0.1)",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "rgba(255, 215, 0, 0.3)",
      marginTop: 16,
    },
    premiumBuyTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: "#FFD700",
      marginBottom: 8,
      textAlign: "center",
    },
    premiumBuySubtitle: {
      fontSize: 14,
      fontWeight: "400",
      color: currentTheme === "light" ? colors.textSecondary : "#CBD5E1",
      marginBottom: 16,
      textAlign: "center",
      lineHeight: 20,
    },
    premiumBuyButton: {
      backgroundColor: "#FFD700",
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: 12,
      shadowColor: "#FFD700",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 1,
      borderColor: "rgba(255, 215, 0, 0.5)",
      marginBottom: 12,
    },
    premiumBuyButtonText: {
      color: "#1A1A1A",
      fontSize: 16,
      fontWeight: "600",
      letterSpacing: 0.5,
    },
    premiumStatusSection: {
      alignItems: "center",
      padding: 20,
      backgroundColor: "rgba(78, 205, 196, 0.1)",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "rgba(78, 205, 196, 0.3)",
      marginTop: 16,
    },
    premiumStatusHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    premiumStatusTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: "#4ECDC4",
      marginLeft: 8,
    },
    premiumStatusText: {
      fontSize: 14,
      fontWeight: "400",
      color: currentTheme === "light" ? colors.textSecondary : "#CBD5E1",
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 16,
    },
    premiumLogoutButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255, 107, 107, 0.1)",
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "rgba(255, 107, 107, 0.3)",
    },
    premiumLogoutButtonText: {
      marginLeft: 6,
      fontSize: 14,
      color: "#FF6B6B",
      fontWeight: "600",
    },
    // 🚀 NOUVEAU : Styles pour l'état de connexion dans À propos
    premiumStatusContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    // 🚀 NOUVEAU : Styles pour la section Backup
    section: {
      marginBottom: 20,
    },
    backupSectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      marginLeft: 8,
    },
    iconColor: {
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
    },
    settingItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(15, 23, 42, 0.8)",
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
    },
    settingInfo: {
      flex: 1,
    },
    settingLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      marginBottom: 4,
    },
    settingValue: {
      fontSize: 14,
      color: currentTheme === "light" ? colors.textSecondary : "#CBD5E1",
    },
    settingDescription: {
      fontSize: 12,
      color: currentTheme === "light" ? colors.textSecondary : "#94A3B8",
      marginTop: 2,
    },
    statusIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginLeft: 8,
    },
    toggle: {
      width: 48,
      height: 24,
      borderRadius: 12,
      backgroundColor: currentTheme === "light" ? "#E2E8F0" : "#475569",
      padding: 2,
      justifyContent: "center",
    },
    toggleActive: {
      backgroundColor: currentTheme === "light" ? colors.primary : "#4ECDC4",
    },
    toggleThumb: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: "#FFFFFF",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    toggleThumbActive: {
      transform: [{ translateX: 24 }],
    },
    actionButtons: {
      flexDirection: "row",
      gap: 12,
      marginTop: 16,
    },
    actionButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
    },
    primaryButton: {
      backgroundColor: currentTheme === "light" ? colors.primary : "#4ECDC4",
      borderColor: currentTheme === "light" ? colors.primary : "#4ECDC4",
    },
    secondaryButton: {
      backgroundColor: "transparent",
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: "600",
      marginLeft: 6,
    },
    secondaryButtonText: {
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
    },
    syncStatus: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 12,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor:
        currentTheme === "light"
          ? "rgba(78, 205, 196, 0.1)"
          : "rgba(78, 205, 196, 0.2)",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "rgba(78, 205, 196, 0.3)",
    },
    syncStatusText: {
      fontSize: 12,
      color: "#4ECDC4",
      fontWeight: "500",
      marginLeft: 6,
    },
    upgradeContainer: {
      alignItems: "center",
      padding: 20,
      backgroundColor: "rgba(255, 215, 0, 0.1)",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "rgba(255, 215, 0, 0.3)",
      marginTop: 16,
    },
    upgradeTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: "#FFD700",
      marginTop: 12,
      marginBottom: 8,
      textAlign: "center",
    },
    upgradeDescription: {
      fontSize: 14,
      fontWeight: "400",
      color: currentTheme === "light" ? colors.textSecondary : "#CBD5E1",
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 16,
    },
    upgradeButton: {
      backgroundColor: "#FFD700",
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 12,
      shadowColor: "#FFD700",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 1,
      borderColor: "rgba(255, 215, 0, 0.5)",
    },
    upgradeButtonText: {
      color: "#1A1A1A",
      fontSize: 14,
      fontWeight: "600",
      letterSpacing: 0.5,
    },

    // 🚀 NOUVEAU : Styles pour la grille de boutons
    gridContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: 12,
    },
    gridButton: {
      width: "30%",
      aspectRatio: 1,
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(15, 23, 42, 0.8)",
      borderRadius: 16,
      padding: 16,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
      shadowColor: currentTheme === "light" ? colors.shadow : "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    gridButtonActive: {
      borderColor: currentTheme === "light" ? colors.primary : "#4ECDC4",
      backgroundColor:
        currentTheme === "light"
          ? "rgba(78, 205, 196, 0.1)"
          : "rgba(78, 205, 196, 0.2)",
      shadowColor: currentTheme === "light" ? colors.primary : "#4ECDC4",
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    gridButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      textAlign: "center",
      marginTop: 8,
      lineHeight: 16,
    },
    gridButtonDisabled: {
      backgroundColor:
        currentTheme === "light"
          ? "rgba(107, 114, 128, 0.1)"
          : "rgba(107, 114, 128, 0.2)",
      borderColor:
        currentTheme === "light"
          ? "rgba(107, 114, 128, 0.3)"
          : "rgba(107, 114, 128, 0.4)",
      opacity: 0.6,
    },
    gridButtonTextDisabled: {
      color: currentTheme === "light" ? "#6B7280" : "#9CA3AF",
    },
    // 🚀 NOUVEAU : Styles pour les sections actives
    activeSectionContainer: {
      marginTop: 16,
      marginHorizontal: 16,
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(15, 23, 42, 0.8)",
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
      overflow: "hidden",
    },
    activeSectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
    },
    activeSectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
    },
    closeButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor:
        currentTheme === "light"
          ? "rgba(0, 0, 0, 0.05)"
          : "rgba(255, 255, 255, 0.1)",
    },
    activeSectionContent: {
      padding: 16,
    },
    sectionDescription: {
      fontSize: 14,
      color: currentTheme === "light" ? colors.textSecondary : "#CBD5E1",
      lineHeight: 20,
    },

    // 🚀 NOUVEAU : Styles pour la section de thème
    themeSection: {
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 24,
      padding: 16,
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(15, 23, 42, 0.8)",
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
      shadowColor: currentTheme === "light" ? colors.shadow : "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    themeSectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },
    themeSectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      marginLeft: 8,
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
    },
    themeSwitchContainer: {
      flexDirection: "row",
      gap: 12,
    },
    themeOption: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor:
        currentTheme === "light" ? colors.cardBG : "rgba(30, 41, 59, 0.8)",
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
    },
    themeOptionActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    themeOptionText: {
      fontSize: 14,
      fontWeight: "600",
      marginLeft: 6,
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
    },

    // 🚀 NOUVEAU : Styles pour le bouton flottant amélioré
    applyChangesContainer: {
      position: "absolute" as const,
      bottom: 90,
      left: 16,
      right: 16,
      zIndex: 1000,
      elevation: 1000,
    },
    applyChangesButton: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      backgroundColor: "#FF6B35", // Orange vif pour attirer l'attention
      paddingVertical: 18,
      paddingHorizontal: 20,
      borderRadius: 20,
      shadowColor: "#FF6B35",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.6,
      shadowRadius: 20,
      elevation: 12,
      borderWidth: 2,
      borderColor: "#FF8A65", // Bordure légèrement plus claire
    },
    applyChangesIconContainer: {
      position: "relative" as const,
      marginRight: 12,
    },
    applyChangesBadge: {
      position: "absolute" as const,
      top: -4,
      right: -4,
      backgroundColor: "#FFD700", // Badge doré
      width: 16,
      height: 16,
      borderRadius: 8,
      justifyContent: "center" as const,
      alignItems: "center" as const,
      borderWidth: 1,
      borderColor: "#FFFFFF",
    },
    applyChangesBadgeText: {
      color: "#FF6B35",
      fontSize: 10,
      fontWeight: "900",
      lineHeight: 12,
    },
    applyChangesTextContainer: {
      flex: 1,
      justifyContent: "center" as const,
    },
    applyChangesButtonTitle: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "800",
      letterSpacing: 0.5,
      textShadowColor: "rgba(0, 0, 0, 0.4)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
      marginBottom: 2,
    },
    applyChangesButtonSubtitle: {
      color: "rgba(255, 255, 255, 0.9)",
      fontSize: 12,
      fontWeight: "500",
      letterSpacing: 0.3,
      opacity: 0.95,
    },

    // 🚀 NOUVEAU : Styles pour la section de gestion de compte
    accountSection: {
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(15, 23, 42, 0.8)",
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
      shadowColor: currentTheme === "light" ? colors.shadow : "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
      overflow: "hidden",
    },
    accountSectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.2)",
    },
    accountSectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      flex: 1,
      marginLeft: 12,
    },
    editButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor:
        currentTheme === "light"
          ? "rgba(78, 205, 196, 0.1)"
          : "rgba(78, 205, 196, 0.2)",
      borderWidth: 1,
      borderColor: "rgba(78, 205, 196, 0.3)",
    },
    accountFormContainer: {
      padding: 16,
    },
    inputGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      marginBottom: 8,
    },
    inputValue: {
      fontSize: 16,
      color: currentTheme === "light" ? colors.textSecondary : "#CBD5E1",
      padding: 12,
      backgroundColor:
        currentTheme === "light" ? colors.cardBG : "rgba(30, 41, 59, 0.8)",
      borderRadius: 8,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
    },
    accountInput: {
      fontSize: 16,
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      padding: 12,
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(30, 41, 59, 0.9)",
      borderRadius: 8,
      borderWidth: 2,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
      marginRight: 8,
      alignItems: "center",
    },
    cancelButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
    },
    saveButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: "#4ECDC4",
      marginLeft: 8,
      gap: 8,
    },
    saveButtonDisabled: {
      backgroundColor: "#94A3B8",
    },
    saveButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#FFFFFF",
    },
    subscriptionInfo: {
      padding: 16,
    },
    subscriptionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    subscriptionLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
    },
    subscriptionValue: {
      fontSize: 14,
      color: currentTheme === "light" ? colors.textSecondary : "#CBD5E1",
    },
    premiumBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255, 215, 0, 0.1)",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "rgba(255, 215, 0, 0.3)",
      gap: 4,
    },
    premiumBadgeText: {
      fontSize: 12,
      fontWeight: "600",
      color: "#FFD700",
    },
    securityOption: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.2)",
    },
    securityOptionText: {
      fontSize: 14,
      fontWeight: "500",
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      flex: 1,
      marginLeft: 12,
    },
    logoutButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      backgroundColor: "rgba(255, 107, 107, 0.1)",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "rgba(255, 107, 107, 0.3)",
      marginBottom: 12,
      gap: 8,
    },
    logoutButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#FF6B6B",
    },
    deleteAccountButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      backgroundColor: "rgba(239, 68, 68, 0.1)",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "rgba(239, 68, 68, 0.3)",
      gap: 8,
    },
    deleteAccountButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#EF4444",
    },
  });
