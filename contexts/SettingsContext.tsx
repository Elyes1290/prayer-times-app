import AsyncStorage from "@react-native-async-storage/async-storage";
import { safeJsonParse, safeStorageJsonParse } from "../utils/safeJson";
import { safeStorage } from "../utils/safeStorage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Platform, NativeModules } from "react-native";
import useColorScheme from "react-native/Libraries/Utilities/useColorScheme";
import * as Location from "expo-location";
import i18n, { changeLanguage } from "../locales/i18n-optimized";
import { scheduleNotificationsFor2Days } from "../utils/sheduleAllNotificationsFor30Days";
import { debugLog, errorLog } from "../utils/logger";
import ApiClient from "../utils/apiClient";
// 🚀 NOUVEAU : Import du gestionnaire de stockage stratifié
import {
  LocalStorageManager,
  useLocalStorage,
} from "../utils/localStorageManager";

const FIRST_LAUNCH_FLAG = "app_first_launch_done";

const { AdhanModule } = NativeModules;

export type AdhanSoundKey =
  | "adhamalsharqawe"
  | "adhanaljazaer"
  | "ahmadnafees"
  | "ahmedelkourdi"
  | "dubai"
  | "karljenkins"
  | "mansourzahrani"
  | "misharyrachid"
  | "mustafaozcan"
  | "masjidquba"
  | "islamsobhi"
  | string; // Permettre n'importe quel string pour les sons premium dynamiques

export type CalcMethodKey =
  | "MuslimWorldLeague"
  | "Egyptian"
  | "Karachi"
  | "UmmAlQura"
  | "NorthAmerica"
  | "Kuwait"
  | "Qatar"
  | "Singapore"
  | "Tehran"
  | "Turkey";

export type LocationMode = "auto" | "manual" | null;

// 🖼️ Type pour les images de fond (premium)
export type BackgroundImageType = "prophet" | "makka" | "alquds";

export type Coords = {
  lat: number;
  lon: number;
};

export type ManualLocation = {
  city: string;
  country?: string;
} & Coords;

export interface SettingsContextType {
  isLoading: boolean;
  errorMsg: string | null;
  locationMode: "auto" | "manual" | null;
  manualLocation: { lat: number; lon: number; city: string } | null;
  autoLocation: { lat: number; lon: number } | null;
  isRefreshingLocation: boolean;
  notificationsEnabled: boolean;
  remindersEnabled: boolean;
  reminderOffset: number;
  duaAfterAdhanEnabled: boolean; // 🚀 NOUVEAU : Option pour activer/désactiver la dua après l'adhan
  calcMethod: CalcMethodKey;
  adhanSound: AdhanSoundKey;
  adhanVolume: number;
  dhikrSettings: {
    enabledAfterSalah: boolean;
    delayAfterSalah: number;
    enabledMorningDhikr: boolean;
    delayMorningDhikr: number;
    enabledEveningDhikr: boolean;
    delayEveningDhikr: number;
    enabledSelectedDua: boolean;
    delaySelectedDua: number;
  };
  currentLanguage: string;
  userFirstName: string | null;
  isFirstTime: boolean;
  themeMode: "auto" | "light" | "dark" | "morning" | "sunset";
  currentTheme: "light" | "dark" | "morning" | "sunset";
  backgroundImageType: BackgroundImageType; // 🖼️ NOUVEAU : Type d'image de fond (premium)
  audioQuality: "low" | "medium" | "high";
  downloadStrategy: "streaming_only" | "wifi_download" | "always_download";
  enableDataSaving: boolean;
  maxCacheSize: number; // en MB
  setLocationMode: (mode: "auto" | "manual" | null) => void;
  setManualLocation: (
    location: { lat: number; lon: number; city: string } | null
  ) => void;
  refreshAutoLocation: () => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => void;
  setRemindersEnabled: (enabled: boolean) => void;
  setReminderOffset: (offset: number) => void;
  setDuaAfterAdhanEnabled: (enabled: boolean) => void; // 🚀 NOUVEAU : Setter pour la dua après l'adhan
  setCalcMethod: (method: CalcMethodKey) => void;
  setAdhanSound: (sound: AdhanSoundKey) => void;
  setAdhanVolume: (volume: number) => void;
  setEnabledAfterSalah: (enabled: boolean) => void;
  setEnabledMorningDhikr: (enabled: boolean) => void;
  setEnabledEveningDhikr: (enabled: boolean) => void;
  setDelayMorningDhikr: (delay: number) => void;
  setDelayEveningDhikr: (delay: number) => void;
  setEnabledSelectedDua: (enabled: boolean) => void;
  setDelaySelectedDua: (delay: number) => void;
  setCurrentLanguage: (language: string) => void;
  setUserFirstName: (firstName: string | null) => void;
  setIsFirstTime: (isFirstTime: boolean) => void;
  setThemeMode: (
    mode: "auto" | "light" | "dark" | "morning" | "sunset"
  ) => void;
  setBackgroundImageType: (type: BackgroundImageType) => void; // 🖼️ NOUVEAU : Setter pour le type d'image de fond
  setAudioQuality: (quality: "low" | "medium" | "high") => void;
  setDownloadStrategy: (
    strategy: "streaming_only" | "wifi_download" | "always_download"
  ) => void;
  setEnableDataSaving: (enabled: boolean) => void;
  setMaxCacheSize: (size: number) => void;
  saveAndReprogramAll: () => Promise<void>;
  // 🚀 NOUVEAU : Contrôle de la synchronisation API (premium uniquement)
  enableApiSync: () => Promise<void>;
  disableApiSync: () => void;
  isApiSyncEnabled: boolean;
}

const defaultSettings: SettingsContextType = {
  isLoading: true,
  errorMsg: null,
  locationMode: "auto",
  manualLocation: null,
  autoLocation: null,
  isRefreshingLocation: false,
  notificationsEnabled: true,
  remindersEnabled: true,
  reminderOffset: 10,
  duaAfterAdhanEnabled: false, // 🚀 NOUVEAU : Par défaut désactivé
  calcMethod: "MuslimWorldLeague",
  adhanSound: "misharyrachid",
  adhanVolume: 1.0,
  dhikrSettings: {
    enabledAfterSalah: true,
    delayAfterSalah: 5,
    enabledMorningDhikr: true,
    delayMorningDhikr: 10,
    enabledEveningDhikr: true,
    delayEveningDhikr: 10,
    enabledSelectedDua: true,
    delaySelectedDua: 15,
  },
  currentLanguage: "en",
  userFirstName: null,
  isFirstTime: true,
  themeMode: "auto",
  currentTheme: "light",
  backgroundImageType: "prophet", // 🖼️ NOUVEAU : Par défaut Mosquée du Prophète
  audioQuality: "medium",
  downloadStrategy: "streaming_only",
  enableDataSaving: true,
  maxCacheSize: 100, // en MB
  setLocationMode: () => {},
  setManualLocation: () => {},
  refreshAutoLocation: async () => {},
  setNotificationsEnabled: () => {},
  setRemindersEnabled: () => {},
  setReminderOffset: () => {},
  setDuaAfterAdhanEnabled: () => {}, // 🚀 NOUVEAU : Setter pour la dua après l'adhan
  setCalcMethod: () => {},
  setAdhanSound: () => {},
  setAdhanVolume: () => {},
  setEnabledAfterSalah: () => {},
  setEnabledMorningDhikr: () => {},
  setEnabledEveningDhikr: () => {},
  setDelayMorningDhikr: () => {},
  setDelayEveningDhikr: () => {},
  setEnabledSelectedDua: () => {},
  setDelaySelectedDua: () => {},
  setCurrentLanguage: () => {},
  setUserFirstName: () => {},
  setIsFirstTime: () => {},
  setThemeMode: () => {},
  setBackgroundImageType: () => {}, // 🖼️ NOUVEAU : Setter pour le type d'image de fond
  setAudioQuality: () => {},
  setDownloadStrategy: () => {},
  setEnableDataSaving: () => {},
  setMaxCacheSize: () => {},
  saveAndReprogramAll: async () => {},
  // 🚀 NOUVEAU : Contrôle API sync (premium uniquement)
  enableApiSync: async () => {},
  disableApiSync: () => {},
  isApiSyncEnabled: false,
};

export const SettingsContext =
  createContext<SettingsContextType>(defaultSettings);

export const SettingsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [calcMethod, setCalcMethod] =
    useState<CalcMethodKey>("MuslimWorldLeague");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [adhanSound, setAdhanSound] = useState<AdhanSoundKey>("misharyrachid");
  const [adhanVolume, setAdhanVolume] = useState(1.0);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [reminderOffset, setReminderOffset] = useState(10);
  const [duaAfterAdhanEnabled, setDuaAfterAdhanEnabled] = useState(false); // 🚀 NOUVEAU : État pour la dua après l'adhan
  const [enabledAfterSalah, setEnabledAfterSalah] = useState(true);
  const [enabledMorningDhikr, setEnabledMorningDhikr] = useState(true);
  const [enabledEveningDhikr, setEnabledEveningDhikr] = useState(true);
  const [delayMorningDhikr, setDelayMorningDhikr] = useState(10);
  const [delayEveningDhikr, setDelayEveningDhikr] = useState(10);
  const [enabledSelectedDua, setEnabledSelectedDua] = useState(true);
  const [delaySelectedDua, setDelaySelectedDua] = useState(15);
  const [locationMode, setLocationMode] = useState<LocationMode | null>(null);
  const [manualLocation, setManualLocation] = useState<ManualLocation | null>(
    null
  );
  const [currentLanguage, setCurrentLanguage] = useState<string>("en");
  const [userFirstName, setUserFirstName] = useState<string | null>(null);
  const [isFirstTime, setIsFirstTime] = useState<boolean>(true);

  // New state for auto location
  const [autoLocation, setAutoLocation] = useState<Coords | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);

  // Nouveau : État du thème
  const [themeMode, setThemeModeState] = useState<
    "auto" | "light" | "dark" | "morning" | "sunset"
  >("auto");
  // 🖼️ NOUVEAU : État pour le type d'image de fond (premium)
  const [backgroundImageType, setBackgroundImageTypeState] = useState<BackgroundImageType>("prophet");
  // 🚀 SOLUTION TEMPORAIRE : Mock useColorScheme pour les tests
  const systemColorScheme = useColorScheme() || "light";

  // Nouveau : États pour les paramètres audio
  const [audioQuality, setAudioQualityState] = useState<
    "low" | "medium" | "high"
  >("medium");
  const [downloadStrategy, setDownloadStrategyState] = useState<
    "streaming_only" | "wifi_download" | "always_download"
  >("streaming_only");
  const [enableDataSaving, setEnableDataSavingState] = useState<boolean>(true);
  const [maxCacheSize, setMaxCacheSizeState] = useState<number>(100);

  // Nouveau : États pour la synchronisation API
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [apiSyncEnabled, setApiSyncEnabled] = useState(false); // 🚀 DÉSACTIVÉ par défaut (premium uniquement)

  // Calculer le thème actuel basé sur le mode choisi
  const currentTheme: "light" | "dark" | "morning" | "sunset" =
    themeMode === "auto"
      ? (systemColorScheme ?? "light")
      : themeMode; // Si ce n'est pas "auto", utiliser directement themeMode

  // 🚀 NOUVEAU : Fonctions de synchronisation API
  const buildSettingsObject = useCallback(() => {
    return {
      // Localisation
      location_mode: locationMode,
      manual_location_lat: manualLocation?.lat || null,
      manual_location_lon: manualLocation?.lon || null,
      manual_location_city: manualLocation?.city || null,
      auto_location_lat: autoLocation?.lat || null,
      auto_location_lon: autoLocation?.lon || null,

      // Notifications et prières
      notifications_enabled: notificationsEnabled,
      reminders_enabled: remindersEnabled,
      reminder_offset: reminderOffset,
      calc_method: calcMethod,
      adhan_sound: adhanSound,
      adhan_volume: adhanVolume,

      // Dhikr
      dhikr_after_salah_enabled: enabledAfterSalah,
      dhikr_after_salah_delay: 5, // Valeur par défaut, pas dans l'état actuel
      dhikr_morning_enabled: enabledMorningDhikr,
      dhikr_morning_delay: delayMorningDhikr,
      dhikr_evening_enabled: enabledEveningDhikr,
      dhikr_evening_delay: delayEveningDhikr,
      dhikr_selected_enabled: enabledSelectedDua,
      dhikr_selected_delay: delaySelectedDua,

      // Interface et préférences
      language: currentLanguage,
      user_first_name: userFirstName,
      is_first_time: isFirstTime,
      theme_mode: themeMode,

      // Audio et téléchargement
      audio_quality: audioQuality,
      download_strategy: downloadStrategy,
      enable_data_saving: enableDataSaving,
      max_cache_size: maxCacheSize,
    };
  }, [
    locationMode,
    manualLocation,
    autoLocation,
    notificationsEnabled,
    remindersEnabled,
    reminderOffset,
    calcMethod,
    adhanSound,
    adhanVolume,
    enabledAfterSalah,
    enabledMorningDhikr,
    delayMorningDhikr,
    enabledEveningDhikr,
    delayEveningDhikr,
    enabledSelectedDua,
    delaySelectedDua,
    currentLanguage,
    userFirstName,
    isFirstTime,
    themeMode,
    audioQuality,
    downloadStrategy,
    enableDataSaving,
    maxCacheSize,
  ]);

  const syncSettingsToAPI = useCallback(async () => {
    if (!apiSyncEnabled || isSyncing) return;

    try {
      setIsSyncing(true);
      debugLog("🔄 Synchronisation des paramètres vers l'API...");

      const settings = buildSettingsObject();
      const response = await ApiClient.syncSettings(settings);

      if (response.success) {
        setLastSyncTime(new Date());
        debugLog("✅ Synchronisation API réussie");
      } else {
        errorLog("❌ Échec synchronisation API:", response.message);
      }
    } catch (error) {
      errorLog("❌ Erreur synchronisation API:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [apiSyncEnabled, isSyncing, buildSettingsObject]);

  const loadSettingsFromAPI = useCallback(async () => {
    try {
      debugLog("📥 Chargement des paramètres depuis l'API...");

      const response = await ApiClient.getUser();

      if (response.success && response.data) {
        const userData = response.data;
        debugLog("✅ Paramètres chargés depuis l'API");

        // Appliquer les paramètres reçus (seulement si ils sont définis)
        if (userData.location_mode !== undefined) {
          setLocationMode(userData.location_mode);
        }
        if (
          userData.manual_location_lat &&
          userData.manual_location_lon &&
          userData.manual_location_city
        ) {
          setManualLocation({
            lat: userData.manual_location_lat,
            lon: userData.manual_location_lon,
            city: userData.manual_location_city,
          });
        }
        if (userData.notifications_enabled !== undefined) {
          setNotificationsEnabled(userData.notifications_enabled);
        }
        if (userData.calc_method) {
          setCalcMethod(userData.calc_method as CalcMethodKey);
        }
        if (userData.adhan_sound) {
          setAdhanSound(userData.adhan_sound as AdhanSoundKey);
        }
        if (userData.language) {
          setCurrentLanguage(userData.language);
          if (i18n.language !== userData.language) {
            changeLanguage(userData.language);
          }
        }
        if (userData.user_first_name) {
          setUserFirstName(userData.user_first_name);
        }
        if (userData.theme_mode) {
          setThemeModeState(
            userData.theme_mode as
              | "auto"
              | "light"
              | "dark"
              | "morning"
              | "sunset"
          );
        }

        // Plus de paramètres selon la réponse API...

        setLastSyncTime(new Date());
        return true;
      }
    } catch (error) {
      debugLog("⚠️ Chargement API échoué, utilisation cache local:", error);
    }
    return false;
  }, []);

  // 🚀 SUPPRIMÉ : Plus d'initialisation automatique d'utilisateur
  // Une app professionnelle demande à l'utilisateur de s'inscrire/se connecter

  const refreshAutoLocation = useCallback(async () => {
    try {
      setLocationError(null);
      setIsRefreshingLocation(true);

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        const err = "La permission d'accès à la localisation a été refusée";
        setLocationError(err);
        setIsRefreshingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        lat: location.coords.latitude,
        lon: location.coords.longitude,
      };

      setAutoLocation(coords);
      setLocationError(null); // Clear any previous errors

      // 💾 Sauvegarder dans AsyncStorage pour iOS et Android
      try {
        await LocalStorageManager.saveEssential(
          "AUTO_LOCATION",
          JSON.stringify(coords)
        );
        debugLog(
          `💾 Localisation automatique sauvegardée: ${coords.lat}, ${coords.lon}`
        );
      } catch (error) {
        errorLog("Erreur sauvegarde autoLocation:", error);
      }

      if (Platform.OS === "android" && AdhanModule && AdhanModule.setLocation) {
        try {
          AdhanModule.setLocation(coords.lat, coords.lon);
        } catch (error) {
          errorLog("Erreur lors de l'appel AdhanModule.setLocation:", error);
          // Ne pas faire échouer le processus pour cette erreur
        }
      }
    } catch (error) {
      const err = `Erreur lors de la récupération de la position: ${error}`;
      setLocationError(err);
      setAutoLocation(null); // Clear location on error
    } finally {
      setIsRefreshingLocation(false);
    }
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      // 🚀 Vérifier le flag de premier lancement absolu
      const firstLaunchFlag = await AsyncStorage.getItem(FIRST_LAUNCH_FLAG);

      if (!firstLaunchFlag) {
        // 🔧 PREMIER LANCEMENT : Préserver la localisation si elle existe déjà
        const existingLocationMode = await AsyncStorage.getItem("locationMode");

        // Effacer tout SAUF les données de localisation critiques
        const keysToPreserve = [
          "locationMode",
          "manualLocation",
          "autoLocation",
        ];
        const allKeys = await AsyncStorage.getAllKeys();
        const keysToDelete = allKeys.filter(
          (key) => !keysToPreserve.includes(key)
        );

        if (keysToDelete.length > 0) {
          await AsyncStorage.multiRemove(keysToDelete);
        }

        await AsyncStorage.setItem(FIRST_LAUNCH_FLAG, "true");

        // Forcer les valeurs par défaut SAUF localisation si elle existe
        setIsFirstTime(true);
        setUserFirstName(null);

        // ✅ Préserver la localisation existante ou mettre null si vraiment inexistante
        if (existingLocationMode) {
          debugLog(
            `🔄 Localisation préservée lors du reset: ${existingLocationMode}`
          );
          // La localisation sera chargée normalement ci-dessous
        } else {
          setLocationMode(null);
          setManualLocation(null);
          setAutoLocation(null);
        }
        setNotificationsEnabled(true);
        setRemindersEnabled(true);
        setReminderOffset(10);
        setCalcMethod("MuslimWorldLeague");
        setAdhanSound("misharyrachid");
        setAdhanVolume(1.0);
        setEnabledAfterSalah(true);
        setEnabledMorningDhikr(true);
        setDelayMorningDhikr(10);
        setEnabledEveningDhikr(true);
        setDelayEveningDhikr(10);
        setEnabledSelectedDua(true);
        setDelaySelectedDua(15);
        setCurrentLanguage(i18n.language || "en");
        setThemeModeState("auto");
        setAudioQualityState("medium");
        setDownloadStrategyState("streaming_only");
        setEnableDataSavingState(true);
        setMaxCacheSizeState(100);
        setApiSyncEnabled(false);
        setIsLoaded(true);
        setIsInitializing(false);
        return;
      }

      // 🚀 NOUVEAU : Charger depuis le gestionnaire de stockage stratifié
      const [
        notificationsEnabledValue,
        calcMethodValue,
        adhanSoundValue,
        adhanVolumeValue,
        remindersEnabledValue,
        reminderOffsetValue,
        duaAfterAdhanEnabledValue, // 🚀 NOUVEAU : Variable pour la dua après l'adhan
        locationModeValue,
        enabledAfterSalahValue,
        enabledMorningDhikrValue,
        delayMorningDhikrValue,
        enabledEveningDhikrValue,
        delayEveningDhikrValue,
        enabledSelectedDuaValue,
        delaySelectedDuaValue,
        currentLanguageValue,
        isFirstTimeValue,
        audioQualityValue,
        downloadStrategyValue,
        enableDataSavingValue,
        maxCacheSizeValue,
        savedFirstName,
      ] = await Promise.all([
        LocalStorageManager.getEssential("NOTIFICATIONS_ENABLED"),
        LocalStorageManager.getEssential("CALC_METHOD"),
        LocalStorageManager.getEssential("ADHAN_SOUND"),
        LocalStorageManager.getEssential("ADHAN_VOLUME"),
        LocalStorageManager.getEssential("REMINDERS_ENABLED"),
        LocalStorageManager.getEssential("REMINDER_OFFSET"),
        AsyncStorage.getItem("DUA_AFTER_ADHAN_ENABLED"), // 🚀 NOUVEAU : Charger la dua après l'adhan
        LocalStorageManager.getEssential("LOCATION_MODE"),
        LocalStorageManager.getEssential("ENABLED_AFTER_SALAH"),
        LocalStorageManager.getEssential("ENABLED_MORNING_DHIKR"),
        LocalStorageManager.getEssential("DELAY_MORNING_DHIKR"),
        LocalStorageManager.getEssential("ENABLED_EVENING_DHIKR"),
        LocalStorageManager.getEssential("DELAY_EVENING_DHIKR"),
        LocalStorageManager.getEssential("ENABLED_SELECTED_DUA"),
        LocalStorageManager.getEssential("DELAY_SELECTED_DUA"),
        LocalStorageManager.getEssential("CURRENT_LANGUAGE"),
        LocalStorageManager.getEssential("IS_FIRST_TIME"),
        LocalStorageManager.getEssential("AUDIO_QUALITY"),
        LocalStorageManager.getEssential("DOWNLOAD_STRATEGY"),
        LocalStorageManager.getEssential("ENABLE_DATA_SAVING"),
        LocalStorageManager.getEssential("MAX_CACHE_SIZE"),
        LocalStorageManager.getEssential("USER_FIRST_NAME"),
      ]);

      // 🚀 NOUVEAU : Charger les données non-essentielles séparément
      const [manualLocationValue, apiSyncEnabledValue] = await Promise.all([
        LocalStorageManager.getEssential("MANUAL_LOCATION"),
        AsyncStorage.getItem("apiSyncEnabled"), // Pas encore migré
      ]);

      // Si AsyncStorage est vide, essayer de charger depuis Android
      let androidSettings = null;
      if (
        Platform.OS === "android" &&
        AdhanModule &&
        (notificationsEnabledValue === null ||
          remindersEnabledValue === null ||
          enabledAfterSalahValue === null)
      ) {
        try {
          // On pourrait ajouter une méthode getNotificationSettings côté Android
          // Pour l'instant, on garde les valeurs par défaut mais on évite d'écraser Android
        } catch (error) {}
      }

      if (notificationsEnabledValue !== null) {
        setNotificationsEnabled(notificationsEnabledValue === "true");
      } else {
        // NE PAS sauvegarder immédiatement côté Android pour éviter d'écraser
      }
      if (calcMethodValue) {
        debugLog(`📋 Chargement méthode de calcul: ${calcMethodValue}`);
        setCalcMethod(calcMethodValue as CalcMethodKey);

        // 🔧 CORRECTION BUG : Synchroniser SANS annuler les alarmes existantes
        if (Platform.OS === "android" && AdhanModule) {
          debugLog(
            `🔄 Synchronisation initiale Android - méthode: ${calcMethodValue} (SANS annulation)`
          );
          // ❌ AdhanModule.setCalculationMethod(calcMethodValue); // Cette fonction annule les alarmes !
          AdhanModule.saveNotificationSettings({
            calcMethod: calcMethodValue,
          });
          debugLog(
            `✅ Synchronisation initiale terminée pour ${calcMethodValue} (alarmes préservées)`
          );
        }
      }
      // soundEnabled supprimé - pas utilisé
      if (adhanSoundValue) setAdhanSound(adhanSoundValue as AdhanSoundKey);
      if (adhanVolumeValue !== null) setAdhanVolume(Number(adhanVolumeValue));
      if (remindersEnabledValue !== null) {
        setRemindersEnabled(remindersEnabledValue === "true");
      } else {
      }
      if (reminderOffsetValue !== null)
        setReminderOffset(Number(reminderOffsetValue));
      if (duaAfterAdhanEnabledValue !== null) {
        setDuaAfterAdhanEnabled(duaAfterAdhanEnabledValue === "true");
      }
      const loadedLocationMode = locationModeValue as LocationMode | null;
      console.log(
        `🔍 [DEBUG] Chargement localisation - locationModeValue: "${locationModeValue}", loadedLocationMode: "${loadedLocationMode}"`
      );

      if (loadedLocationMode) {
        console.log(
          `✅ [DEBUG] Mode localisation chargé: ${loadedLocationMode}`
        );
        setLocationMode(loadedLocationMode);
      } else {
        console.log(
          `⚠️ [DEBUG] Aucun mode localisation sauvegardé - garde la valeur par défaut: null`
        );
      }

      if (manualLocationValue) {
        // 🔧 CORRECTION : Utiliser safeJsonParse avec typage
        const manualLoc = safeJsonParse<ManualLocation | null>(
          manualLocationValue,
          null
        );
        if (
          manualLoc &&
          manualLoc.city &&
          typeof manualLoc.lat === "number" &&
          typeof manualLoc.lon === "number"
        ) {
          console.log(
            `✅ [DEBUG] Localisation manuelle chargée: ${manualLoc.city}`
          );
          setManualLocation(manualLoc);
        } else {
          console.log(
            `⚠️ [DEBUG] Localisation manuelle invalide, reset à null`
          );
          setManualLocation(null);
        }
      } else {
        console.log(`⚠️ [DEBUG] Aucune localisation manuelle sauvegardée`);
      }
      if (enabledAfterSalahValue !== null) {
        setEnabledAfterSalah(enabledAfterSalahValue === "true");
      } else {
      }
      if (enabledMorningDhikrValue !== null) {
        setEnabledMorningDhikr(enabledMorningDhikrValue === "true");
      } else {
      }
      if (delayMorningDhikrValue !== null)
        setDelayMorningDhikr(Number(delayMorningDhikrValue));
      if (enabledEveningDhikrValue !== null) {
        setEnabledEveningDhikr(enabledEveningDhikrValue === "true");
      } else {
      }
      if (delayEveningDhikrValue !== null)
        setDelayEveningDhikr(Number(delayEveningDhikrValue));
      if (enabledSelectedDuaValue !== null) {
        setEnabledSelectedDua(enabledSelectedDuaValue === "true");
      } else {
      }
      if (delaySelectedDuaValue !== null)
        setDelaySelectedDua(Number(delaySelectedDuaValue));

      // Gestion de la langue
      if (currentLanguageValue) {
        setCurrentLanguage(currentLanguageValue);
        if (i18n.language !== currentLanguageValue) {
          changeLanguage(currentLanguageValue);
        }
      } else {
        // Si pas de langue sauvegardée, utiliser celle de i18n (défaut système ou anglais)
        const defaultLang = i18n.language || "en";

        setCurrentLanguage(defaultLang);
        // 🚀 NOUVEAU : Utiliser le gestionnaire de stockage stratifié
        LocalStorageManager.saveEssential("CURRENT_LANGUAGE", defaultLang);
      }

      // 🚀 NOUVEAU : Le prénom est maintenant chargé dans le Promise.all ci-dessus
      console.log(
        `🔍 [DEBUG] Chargement données utilisateur - savedFirstName: "${savedFirstName}", isFirstTimeValue: "${isFirstTimeValue}"`
      );

      if (savedFirstName) {
        console.log(`✅ [DEBUG] Prénom chargé: ${savedFirstName}`);
        setUserFirstName(savedFirstName);
      } else {
        console.log(`⚠️ [DEBUG] Aucun prénom sauvegardé trouvé`);
      }

      if (isFirstTimeValue !== null) {
        const isFirst = isFirstTimeValue === "true";
        console.log(
          `✅ [DEBUG] isFirstTime chargé: ${isFirst} (valeur brute: "${isFirstTimeValue}")`
        );
        setIsFirstTime(isFirst);
      } else {
        console.log(
          `⚠️ [DEBUG] Aucune valeur isFirstTime trouvée - garde la valeur par défaut: true`
        );
      }

      // 🚀 NOUVEAU : Charger les paramètres audio et téléchargement
      if (audioQualityValue) {
        // Validation et fallback pour audioQuality
        const validAudioQuality = ["low", "medium", "high"].includes(
          audioQualityValue
        )
          ? (audioQualityValue as "low" | "medium" | "high")
          : "medium";
        setAudioQualityState(validAudioQuality);
      }
      if (downloadStrategyValue) {
        // Validation et fallback pour downloadStrategy
        const validDownloadStrategy = [
          "streaming_only",
          "wifi_download",
          "always_download",
        ].includes(downloadStrategyValue)
          ? (downloadStrategyValue as
              | "streaming_only"
              | "wifi_download"
              | "always_download")
          : "streaming_only";
        setDownloadStrategyState(validDownloadStrategy);
      }
      if (enableDataSavingValue !== null) {
        setEnableDataSavingState(enableDataSavingValue === "true");
      }
      if (maxCacheSizeValue !== null) {
        // Validation et fallback pour maxCacheSize
        const cacheSize = Number(maxCacheSizeValue);
        const validCacheSize = cacheSize > 0 ? cacheSize : 100;
        setMaxCacheSizeState(validCacheSize);
      }
      if (apiSyncEnabledValue !== null) {
        setApiSyncEnabled(apiSyncEnabledValue === "true");
      }

      // Validation et fallback pour adhanVolume
      if (adhanVolumeValue !== null) {
        const volume = Number(adhanVolumeValue);
        const validVolume = volume >= 0 && volume <= 1 ? volume : 1.0;
        setAdhanVolume(validVolume);
      }

      // Validation et fallback pour la langue
      if (currentLanguageValue) {
        // Validation de la langue (liste des langues supportées)
        const supportedLanguages = [
          "en",
          "fr",
          "ar",
          "es",
          "de",
          "bn",
          "fa",
          "tr",
          "ur",
          "id",
          "ms",
          "nl",
          "pt",
          "ru",
          "it",
        ];
        const validLanguage = supportedLanguages.includes(currentLanguageValue)
          ? currentLanguageValue
          : "en";
        setCurrentLanguage(validLanguage);
        if (i18n.language !== validLanguage) {
          changeLanguage(validLanguage);
        }
      } else {
        // Si pas de langue sauvegardée, utiliser celle de i18n (défaut système ou anglais)
        const defaultLang = i18n.language || "en";
        setCurrentLanguage(defaultLang);
        // 🚀 NOUVEAU : Utiliser le gestionnaire de stockage stratifié
        LocalStorageManager.saveEssential("CURRENT_LANGUAGE", defaultLang);
      }

      // New logic for initial location load
      if (loadedLocationMode === "auto") {
        try {
          // 🔧 ANDROID : Utiliser AdhanModule (SharedPreferences natif)
          // 🔧 iOS : Utiliser AsyncStorage
          if (Platform.OS === "android" && AdhanModule?.getSavedAutoLocation) {
            const savedAuto = await AdhanModule.getSavedAutoLocation();
            if (savedAuto && savedAuto.lat && savedAuto.lon) {
              setAutoLocation(savedAuto);
              debugLog(
                `✅ [Android] Localisation auto chargée: ${savedAuto.lat}, ${savedAuto.lon}`
              );
            } else {
              setLocationError("Aucune localisation automatique sauvée");
            }
          } else {
            // iOS ou AdhanModule indisponible : Utiliser AsyncStorage
            const autoLocationValue = await LocalStorageManager.getEssential(
              "AUTO_LOCATION"
            );

            if (autoLocationValue) {
              const savedAuto = safeJsonParse<Coords | null>(
                autoLocationValue,
                null
              );
              if (savedAuto && savedAuto.lat && savedAuto.lon) {
                setAutoLocation(savedAuto);
                debugLog(
                  `✅ [iOS] Localisation auto chargée: ${savedAuto.lat}, ${savedAuto.lon}`
                );
              } else {
                setLocationError("Aucune localisation automatique sauvée");
              }
            } else {
              setLocationError("Aucune localisation automatique sauvée");
            }
          }
        } catch (error) {
          errorLog(
            "Erreur lors du chargement de la localisation sauvée:",
            error
          );
          setLocationError("Erreur lors du chargement de la localisation");
        }
      } else if (loadedLocationMode === null) {
        // First time user - don't set any default mode
        // Let the HomeScreen handle the choice UI
      }

      setIsLoaded(true);
      setIsInitializing(false);

      // 🚀 DÉSACTIVÉ : Synchronisation API automatique
      // L'API sera activée seulement quand l'utilisateur devient premium
      // via enableApiSync() depuis PremiumContext
    };

    loadSettings();
  }, []); // ✅ Suppression de refreshAutoLocation des dépendances

  // Nouveau : Charger le thème sauvegardé
  useEffect(() => {
    const loadTheme = async () => {
      try {
        // 🚀 NOUVEAU : Utiliser le gestionnaire de stockage stratifié
        const savedTheme = await LocalStorageManager.getEssential("THEME_MODE");
        if (
          savedTheme &&
          ["auto", "light", "dark", "morning", "sunset"].includes(savedTheme)
        ) {
          setThemeModeState(
            savedTheme as "auto" | "light" | "dark" | "morning" | "sunset"
          );
        }
      } catch (error) {
        console.error("Erreur lors du chargement du thème:", error);
      }
    };
    loadTheme();

    // 🖼️ NOUVEAU : Charger le type d'image de fond
    const loadBackgroundImageType = async () => {
      try {
        const savedType = await AsyncStorage.getItem("backgroundImageType");
        if (savedType && ["prophet", "makka", "alquds"].includes(savedType)) {
          setBackgroundImageTypeState(savedType as BackgroundImageType);
        }
      } catch (error) {
        console.error("Erreur lors du chargement du type d'image de fond:", error);
      }
    };
    loadBackgroundImageType();
  }, []);

  // 🚀 NOUVEAU : Synchronisation automatique des paramètres (premium uniquement)
  useEffect(() => {
    // Éviter la sync lors du chargement initial
    if (!isLoaded || isSyncing || !apiSyncEnabled) return;

    // Délai pour éviter trop de syncs rapides
    const timer = setTimeout(() => {
      syncSettingsToAPI();
    }, 2000);

    return () => clearTimeout(timer);
  }, [
    locationMode,
    manualLocation,
    autoLocation,
    notificationsEnabled,
    remindersEnabled,
    reminderOffset,
    calcMethod,
    adhanSound,
    adhanVolume,
    enabledAfterSalah,
    enabledMorningDhikr,
    delayMorningDhikr,
    enabledEveningDhikr,
    delayEveningDhikr,
    enabledSelectedDua,
    delaySelectedDua,
    currentLanguage,
    userFirstName,
    isFirstTime,
    themeMode,
    audioQuality,
    downloadStrategy,
    enableDataSaving,
    maxCacheSize,
    isLoaded,
    syncSettingsToAPI,
    isSyncing,
    apiSyncEnabled,
  ]);

  // Nouveau : Fonction pour changer le thème
  const setThemeMode = async (
    mode: "auto" | "light" | "dark" | "morning" | "sunset"
  ) => {
    try {
      setThemeModeState(mode);
      // 🚀 NOUVEAU : Utiliser le gestionnaire de stockage stratifié
      await LocalStorageManager.saveEssential("THEME_MODE", mode);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du thème:", error);
    }
  };

  // 🖼️ NOUVEAU : Setter pour le type d'image de fond (premium)
  const setBackgroundImageType = async (type: BackgroundImageType) => {
    try {
      setBackgroundImageTypeState(type);
      // Sauvegarder dans le stockage local
      await AsyncStorage.setItem("backgroundImageType", type);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du type d'image de fond:", error);
    }
  };

  const handleSetLocationMode = async (mode: LocationMode) => {
    setLocationMode(mode);
    // 🚀 NOUVEAU : Utiliser le gestionnaire de stockage stratifié
    // LocationMode est essentiel pour le fonctionnement de l'app
    await LocalStorageManager.saveEssential("LOCATION_MODE", mode);
  };

  const handleSetManualLocation = async (location: ManualLocation | null) => {
    setManualLocation(location);
    // 🚀 NOUVEAU : Utiliser le gestionnaire de stockage stratifié
    // ManualLocation est essentiel pour le fonctionnement de l'app
    await LocalStorageManager.saveEssential("MANUAL_LOCATION", location);
  };

  // Fonction pour reprogrammer toutes les notifications
  const saveAndReprogramAll = async () => {
    console.log("═══════════════════════════════════════");
    console.log("💾 [saveAndReprogramAll] DÉBUT");
    console.log("═══════════════════════════════════════");
    console.log("📍 locationMode:", locationMode);
    console.log("🗺️ autoLocation:", autoLocation);
    console.log("📌 manualLocation:", manualLocation);

    // 🔥 LOG VISIBLE DANS 3UTOOLS pour debug iOS
    if (Platform.OS === "ios" && AdhanModule?.debugLog) {
      AdhanModule.debugLog("💾 [JS] saveAndReprogramAll APPELÉ");
    }

    if (!locationMode || (!autoLocation && !manualLocation)) {
      console.log("❌ [saveAndReprogramAll] ARRÊT: Pas de localisation");
      return;
    }

    try {
      const userLocation =
        locationMode === "auto" && autoLocation
          ? { latitude: autoLocation.lat, longitude: autoLocation.lon }
          : manualLocation
          ? { latitude: manualLocation.lat, longitude: manualLocation.lon }
          : null;

      console.log(
        "📍 [saveAndReprogramAll] userLocation calculé:",
        userLocation
      );

      if (!userLocation) {
        console.log("❌ [saveAndReprogramAll] userLocation est null !");
        return;
      }

      // 🎵 NOUVEAU iOS : Vérifier que les sons sont disponibles avant de programmer
      if (Platform.OS === "ios") {
        try {
          const { checkIosSoundsStatus } = await import(
            "../utils/iosSoundsSetup"
          );
          const soundStatus = await checkIosSoundsStatus(adhanSound);

          console.log("🎵 [saveAndReprogramAll] Vérification sons iOS...");
          console.log(
            `   Dossier Library/Sounds existe: ${
              soundStatus.directoryExists ? "✅" : "❌"
            }`
          );
          console.log(`   Sons disponibles: ${soundStatus.totalSounds}`);
          console.log(
            `   Son sélectionné (${adhanSound}.mp3): ${
              soundStatus.currentSoundExists ? "✅ DISPONIBLE" : "❌ MANQUANT"
            }`
          );

          if (!soundStatus.directoryExists || !soundStatus.currentSoundExists) {
            console.log(
              "⚠️ [saveAndReprogramAll] Sons non disponibles - tentative de setup..."
            );
            const { setupIosSoundsForNotifications } = await import(
              "../utils/iosSoundsSetup"
            );
            await setupIosSoundsForNotifications();
            console.log("✅ [saveAndReprogramAll] Setup sons terminé");
          } else {
            console.log("✅ [saveAndReprogramAll] Sons déjà disponibles");
          }
        } catch (error) {
          console.error(
            "⚠️ [saveAndReprogramAll] Erreur vérification sons iOS:",
            error
          );
          console.log(
            "   Programmation continuera avec son par défaut en fallback"
          );
        }
      }

      console.log(
        "✅ [saveAndReprogramAll] Appel scheduleNotificationsFor2Days..."
      );
      await scheduleNotificationsFor2Days({
        userLocation,
        calcMethod,
        settings: {
          notificationsEnabled,
          adhanEnabled: true, // Pour l'instant on suppose que l'adhan est toujours activé
        },
        adhanSound,
        remindersEnabled,
        reminderOffset,
        dhikrSettings: {
          enabledAfterSalah,
          delayAfterSalah: 5,
          enabledMorningDhikr,
          delayMorningDhikr,
          enabledEveningDhikr,
          delayEveningDhikr,
          enabledSelectedDua,
          delaySelectedDua,
        },
      });
      console.log(
        "✅ [saveAndReprogramAll] scheduleNotificationsFor2Days terminé"
      );
      
      // 🕌 NOUVEAU iOS : Rafraîchir le widget Prayer Times
      if (Platform.OS === "ios") {
        try {
          const { PrayerTimesWidgetModule } = require("react-native").NativeModules;
          if (PrayerTimesWidgetModule?.forceWidgetRefresh) {
            await PrayerTimesWidgetModule.forceWidgetRefresh();
            console.log("✅ [saveAndReprogramAll] Widget iOS rafraîchi");
          } else {
            console.log("⚠️ [saveAndReprogramAll] Module Widget iOS non disponible");
          }
        } catch (widgetError) {
          console.log("⚠️ [saveAndReprogramAll] Erreur rafraîchissement widget:", widgetError);
          // Non bloquant - continuer même si le widget ne peut pas être rafraîchi
        }
      }
      
      console.log("═══════════════════════════════════════");
    } catch (error) {
      console.error("❌ [saveAndReprogramAll] ERREUR:", error);
      console.log("═══════════════════════════════════════");
      throw error;
    }
  };

  const value: SettingsContextType = {
    isLoading: !isLoaded,
    errorMsg: locationError,
    locationMode,
    manualLocation,
    autoLocation,
    isRefreshingLocation,
    notificationsEnabled,
    remindersEnabled,
    reminderOffset,
    duaAfterAdhanEnabled, // 🚀 NOUVEAU : Ajouter la dua après l'adhan
    calcMethod,
    adhanSound,
    adhanVolume,
    dhikrSettings: {
      enabledAfterSalah,
      delayAfterSalah: 5,
      enabledMorningDhikr,
      delayMorningDhikr,
      enabledEveningDhikr,
      delayEveningDhikr,
      enabledSelectedDua,
      delaySelectedDua,
    },
    currentLanguage,
    userFirstName,
    isFirstTime,
    themeMode,
    currentTheme,
    backgroundImageType, // 🖼️ NOUVEAU : Type d'image de fond (premium)
    audioQuality,
    downloadStrategy,
    enableDataSaving,
    maxCacheSize, // en MB
    setLocationMode: handleSetLocationMode,
    setManualLocation: handleSetManualLocation,
    refreshAutoLocation,
    setNotificationsEnabled: (v) => {
      setNotificationsEnabled(v);
      // 🚀 NOUVEAU : Utiliser le gestionnaire de stockage stratifié
      LocalStorageManager.saveEssential("NOTIFICATIONS_ENABLED", String(v));

      // Sauvegarder immédiatement côté Android pour que les Receivers aient les bonnes valeurs
      // MAIS seulement si on n'est pas en train d'initialiser (pour éviter d'écraser)
      if (!isInitializing && Platform.OS === "android" && AdhanModule) {
        AdhanModule.saveNotificationSettings({
          notificationsEnabled: v,
        });
      } else if (isInitializing) {
      }
    },
    setRemindersEnabled: (v) => {
      setRemindersEnabled(v);
      // 🚀 NOUVEAU : Utiliser le gestionnaire de stockage stratifié
      LocalStorageManager.saveEssential("REMINDERS_ENABLED", String(v));

      // Sauvegarder immédiatement côté Android
      if (!isInitializing && Platform.OS === "android" && AdhanModule) {
        AdhanModule.saveNotificationSettings({
          remindersEnabled: v,
        });
      } else if (isInitializing) {
      }
    },
    setReminderOffset: (v) => {
      setReminderOffset(v);
      // 🚀 NOUVEAU : Utiliser le gestionnaire de stockage stratifié
      LocalStorageManager.saveEssential("REMINDER_OFFSET", String(v));

      // CRITIQUE: Sauvegarder immédiatement côté Android
      if (!isInitializing && Platform.OS === "android" && AdhanModule) {
        AdhanModule.saveNotificationSettings({
          reminderOffset: v,
        });
      } else if (isInitializing) {
      }
    },
    setDuaAfterAdhanEnabled: (v) => {
      setDuaAfterAdhanEnabled(v);
      // 🚀 NOUVEAU : Sauvegarder dans AsyncStorage
      AsyncStorage.setItem("DUA_AFTER_ADHAN_ENABLED", String(v));

      // Sauvegarder immédiatement côté Android
      if (!isInitializing && Platform.OS === "android" && AdhanModule) {
        AdhanModule.saveNotificationSettings({
          duaAfterAdhanEnabled: v,
        });
      }
    },
    setCalcMethod: async (v) => {
      debugLog(`🔄 CHANGEMENT MÉTHODE DE CALCUL: ${calcMethod} → ${v}`);
      if (Platform.OS === "android" && AdhanModule) {
        debugLog(`🔄 Sauvegarde méthode Android: ${v}`);
        // 🔧 CORRECTION : Ne plus utiliser setCalculationMethod qui annule automatiquement
        // AdhanModule.setCalculationMethod(v); // Cette fonction annule les alarmes !
        // On sauvegarde juste la méthode sans toucher aux alarmes
        AdhanModule.saveNotificationSettings({ calcMethod: v });
      }
      setCalcMethod(v);
      // 🚀 NOUVEAU : Utiliser le gestionnaire de stockage stratifié
      // La méthode de calcul est essentielle pour le fonctionnement de l'app
      await LocalStorageManager.saveEssential("CALC_METHOD", v);

      // 🔧 CORRECTION : Plus de reprogrammation automatique
      // La reprogrammation se fera uniquement via le bouton "Appliquer & Reprogrammer"
      debugLog(
        `✅ Méthode de calcul changée vers ${v} (sans reprogrammation automatique)`
      );

      // Garder seulement la mise à jour du widget pour afficher les nouveaux horaires
      if (Platform.OS === "android" && AdhanModule) {
        AdhanModule.forceUpdateWidgets();
      }
    },
    setAdhanSound: (v) => {
      debugLog("SettingsContext", `🔊 Changement son d'adhan vers: ${v}`);
      setAdhanSound(v); // Cette ligne utilise le setter React useState
      // 🚀 NOUVEAU : Utiliser le gestionnaire de stockage stratifié
      LocalStorageManager.saveEssential("ADHAN_SOUND", v);

      // IMPORTANT: Sauvegarder SYNCHRONE côté Android pour éviter les problèmes de timing
      if (Platform.OS === "android" && AdhanModule) {
        try {
          AdhanModule.setAdhanSound(v);
          debugLog(
            "SettingsContext",
            `✅ Son d'adhan sauvegardé côté Android: ${v}`
          );
        } catch (error) {
          errorLog(
            "SettingsContext",
            `❌ Erreur sauvegarde son Android: ${error}`
          );
        }
      }

      // 🔧 CORRECTION : Plus de reprogrammation automatique
      // La reprogrammation se fera uniquement via le bouton "Appliquer & Reprogrammer"
      debugLog(
        "SettingsContext",
        `✅ Son d'adhan changé vers ${v} (sans reprogrammation automatique)`
      );
    },
    setAdhanVolume: (v) => {
      setAdhanVolume(v);
      // 🚀 NOUVEAU : Utiliser le gestionnaire de stockage stratifié
      LocalStorageManager.saveEssential("ADHAN_VOLUME", String(v));

      // Sauvegarder côté Android
      if (Platform.OS === "android" && AdhanModule) {
        AdhanModule.setAdhanVolume(v);
      }
    },
    setEnabledAfterSalah: (v) => {
      setEnabledAfterSalah(v);
      // 🚀 NOUVEAU : Utiliser le gestionnaire de stockage stratifié
      LocalStorageManager.saveEssential("ENABLED_AFTER_SALAH", String(v));

      // Sauvegarder immédiatement côté Android
      if (!isInitializing && Platform.OS === "android" && AdhanModule) {
        AdhanModule.saveNotificationSettings({
          enabledAfterSalah: v,
        });
      } else if (isInitializing) {
      }
    },
    setEnabledMorningDhikr: (v) => {
      setEnabledMorningDhikr(v);
      // 🚀 NOUVEAU : Utiliser le gestionnaire de stockage stratifié
      LocalStorageManager.saveEssential("ENABLED_MORNING_DHIKR", String(v));

      // Sauvegarder immédiatement côté Android
      if (!isInitializing && Platform.OS === "android" && AdhanModule) {
        AdhanModule.saveNotificationSettings({
          enabledMorningDhikr: v,
        });
      } else if (isInitializing) {
      }
    },
    setEnabledEveningDhikr: (v) => {
      setEnabledEveningDhikr(v);
      // 🚀 NOUVEAU : Utiliser le gestionnaire de stockage stratifié
      LocalStorageManager.saveEssential("ENABLED_EVENING_DHIKR", String(v));

      // Sauvegarder immédiatement côté Android
      if (!isInitializing && Platform.OS === "android" && AdhanModule) {
        AdhanModule.saveNotificationSettings({
          enabledEveningDhikr: v,
        });
      } else if (isInitializing) {
      }
    },
    setDelayMorningDhikr: (v) => {
      setDelayMorningDhikr(v);
      // 🚀 NOUVEAU : Utiliser le gestionnaire de stockage stratifié
      LocalStorageManager.saveEssential("DELAY_MORNING_DHIKR", String(v));

      // CRITIQUE: Sauvegarder immédiatement côté Android
      if (!isInitializing && Platform.OS === "android" && AdhanModule) {
        AdhanModule.saveNotificationSettings({
          delayMorningDhikr: v,
        });
      } else if (isInitializing) {
      }
    },
    setDelayEveningDhikr: (v) => {
      setDelayEveningDhikr(v);
      // 🚀 NOUVEAU : Utiliser le gestionnaire de stockage stratifié
      LocalStorageManager.saveEssential("DELAY_EVENING_DHIKR", String(v));

      // CRITIQUE: Sauvegarder immédiatement côté Android
      if (!isInitializing && Platform.OS === "android" && AdhanModule) {
        AdhanModule.saveNotificationSettings({
          delayEveningDhikr: v,
        });
      } else if (isInitializing) {
      }
    },
    setEnabledSelectedDua: (v) => {
      setEnabledSelectedDua(v);
      // 🚀 NOUVEAU : Utiliser le gestionnaire de stockage stratifié
      LocalStorageManager.saveEssential("ENABLED_SELECTED_DUA", String(v));

      // Sauvegarder immédiatement côté Android
      if (!isInitializing && Platform.OS === "android" && AdhanModule) {
        AdhanModule.saveNotificationSettings({
          enabledSelectedDua: v,
        });
      } else if (isInitializing) {
      }
    },
    setDelaySelectedDua: (v) => {
      setDelaySelectedDua(v);
      // 🚀 NOUVEAU : Utiliser le gestionnaire de stockage stratifié
      LocalStorageManager.saveEssential("DELAY_SELECTED_DUA", String(v));

      // CRITIQUE: Sauvegarder immédiatement côté Android
      if (!isInitializing && Platform.OS === "android" && AdhanModule) {
        AdhanModule.saveNotificationSettings({
          delaySelectedDua: v,
        });
      } else if (isInitializing) {
      }
    },
    setCurrentLanguage: async (language) => {
      setCurrentLanguage(language);
      // 🚀 NOUVEAU : Utiliser le gestionnaire de stockage stratifié
      // La langue est essentielle pour le fonctionnement de l'app
      await LocalStorageManager.saveEssential("CURRENT_LANGUAGE", language);

      // Synchroniser avec i18n optimisé
      changeLanguage(language);

      // IMPORTANT: Transmettre immédiatement la langue côté Android
      // pour les notifications ET le widget !
      if (!isInitializing && Platform.OS === "android" && AdhanModule) {
        AdhanModule.saveNotificationSettings({
          currentLanguage: language,
        });

        // Sauvegarder aussi dans SharedPreferences pour le widget
        await LocalStorageManager.saveEssential("CURRENT_LANGUAGE", language);
      } else if (isInitializing) {
      }
    },
    setUserFirstName: async (firstName) => {
      setUserFirstName(firstName);
      // 🚀 NOUVEAU : Utiliser le gestionnaire de stockage stratifié
      // Le prénom est maintenant considéré comme donnée essentielle (toujours sauvegardé)
      await LocalStorageManager.saveEssential("USER_FIRST_NAME", firstName);
    },
    setIsFirstTime: async (isFirst) => {
      setIsFirstTime(isFirst);
      // 🚀 NOUVEAU : Utiliser le gestionnaire de stockage stratifié
      // isFirstTime est essentiel pour le fonctionnement de l'app
      await LocalStorageManager.saveEssential("IS_FIRST_TIME", String(isFirst));
    },
    setThemeMode,
    setBackgroundImageType, // 🖼️ NOUVEAU : Setter pour le type d'image de fond
    setAudioQuality: (quality) => {
      const validQualities = ["low", "medium", "high"];
      if (!validQualities.includes(quality)) {
        return; // Rejeter les valeurs invalides
      }
      setAudioQualityState(quality);
      // 🚀 NOUVEAU : Utiliser le gestionnaire de stockage stratifié
      LocalStorageManager.saveEssential("AUDIO_QUALITY", quality);
    },
    setDownloadStrategy: (strategy) => {
      const validStrategies = [
        "streaming_only",
        "wifi_download",
        "always_download",
      ];
      if (!validStrategies.includes(strategy)) {
        return; // Rejeter les valeurs invalides
      }
      setDownloadStrategyState(strategy);
      // 🚀 NOUVEAU : Utiliser le gestionnaire de stockage stratifié
      LocalStorageManager.saveEssential("DOWNLOAD_STRATEGY", strategy);
    },
    setEnableDataSaving: (enabled) => {
      setEnableDataSavingState(enabled);
      // 🚀 NOUVEAU : Utiliser le gestionnaire de stockage stratifié
      LocalStorageManager.saveEssential("ENABLE_DATA_SAVING", String(enabled));
    },
    setMaxCacheSize: (size) => {
      if (size < 0) {
        return; // Rejeter les valeurs négatives
      }
      setMaxCacheSizeState(size);
      // 🚀 NOUVEAU : Utiliser le gestionnaire de stockage stratifié
      LocalStorageManager.saveEssential("MAX_CACHE_SIZE", String(size));
    },
    saveAndReprogramAll,
    // 🚀 NOUVEAU : Contrôle API sync (premium uniquement)
    enableApiSync: async () => {
      setApiSyncEnabled(true);
      // 🚀 NOUVEAU : Ces paramètres ne sont pas encore dans le gestionnaire stratifié
      // TODO: Migrer vers le gestionnaire stratifié
      await AsyncStorage.setItem("apiSyncEnabled", "true");
      debugLog("✅ Synchronisation API activée (premium)");

      // 🚀 SUPPRIMÉ : Plus d'initialisation automatique d'utilisateur
      // L'utilisateur doit être connecté explicitement pour synchroniser
      debugLog(
        "ℹ️ Synchronisation API activée - l'utilisateur doit être connecté pour synchroniser"
      );
    },
    disableApiSync: () => {
      setApiSyncEnabled(false);
      // 🚀 NOUVEAU : Ces paramètres ne sont pas encore dans le gestionnaire stratifié
      // TODO: Migrer vers le gestionnaire stratifié
      AsyncStorage.setItem("apiSyncEnabled", "false");
      debugLog("🔒 Synchronisation API désactivée");
    },
    isApiSyncEnabled: apiSyncEnabled,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

// Hook pour utiliser le contexte des paramètres
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};

// 🚀 NOUVEAU : Hook spécialisé pour le contrôle de l'API (pour PremiumContext)
export const useApiSync = () => {
  const { enableApiSync, disableApiSync, isApiSyncEnabled } = useSettings();
  return { enableApiSync, disableApiSync, isApiSyncEnabled };
};
