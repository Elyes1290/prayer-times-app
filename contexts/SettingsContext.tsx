import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Platform, NativeModules, useColorScheme } from "react-native";
import * as Location from "expo-location";
import i18n, { changeLanguage } from "../locales/i18n-optimized";
import { scheduleNotificationsFor2Days } from "../utils/sheduleAllNotificationsFor30Days";
import { debugLog, errorLog } from "../utils/logger";

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
  | "islamsobhi";

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
  themeMode: "auto" | "light" | "dark";
  currentTheme: "light" | "dark";
  setLocationMode: (mode: "auto" | "manual" | null) => void;
  setManualLocation: (
    location: { lat: number; lon: number; city: string } | null
  ) => void;
  refreshAutoLocation: () => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => void;
  setRemindersEnabled: (enabled: boolean) => void;
  setReminderOffset: (offset: number) => void;
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
  setThemeMode: (mode: "auto" | "light" | "dark") => void;
  saveAndReprogramAll: () => Promise<void>;
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
  setLocationMode: () => {},
  setManualLocation: () => {},
  refreshAutoLocation: async () => {},
  setNotificationsEnabled: () => {},
  setRemindersEnabled: () => {},
  setReminderOffset: () => {},
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
  saveAndReprogramAll: async () => {},
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
  const [themeMode, setThemeModeState] = useState<"auto" | "light" | "dark">(
    "auto"
  );
  const systemColorScheme = useColorScheme();

  // Calculer le thème actuel basé sur le mode choisi
  const currentTheme =
    themeMode === "auto" ? systemColorScheme ?? "light" : themeMode;

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
      // Charger d'abord depuis AsyncStorage
      const [
        notificationsEnabledValue,
        calcMethodValue,
        soundEnabledValue,
        adhanSoundValue,
        adhanVolumeValue,
        remindersEnabledValue,
        reminderOffsetValue,
        locationModeValue,
        manualLocationValue,
        enabledAfterSalahValue,
        enabledMorningDhikrValue,
        delayMorningDhikrValue,
        enabledEveningDhikrValue,
        delayEveningDhikrValue,
        enabledSelectedDuaValue,
        delaySelectedDuaValue,
        currentLanguageValue,
        userFirstNameValue,
        isFirstTimeValue,
      ] = await Promise.all([
        AsyncStorage.getItem("notificationsEnabled"),
        AsyncStorage.getItem("calcMethod"),
        AsyncStorage.getItem("soundEnabled"),
        AsyncStorage.getItem("adhanSound"),
        AsyncStorage.getItem("adhanVolume"),
        AsyncStorage.getItem("remindersEnabled"),
        AsyncStorage.getItem("reminderOffset"),
        AsyncStorage.getItem("locationMode"),
        AsyncStorage.getItem("manualLocation"),
        AsyncStorage.getItem("enabledAfterSalah"),
        AsyncStorage.getItem("enabledMorningDhikr"),
        AsyncStorage.getItem("delayMorningDhikr"),
        AsyncStorage.getItem("enabledEveningDhikr"),
        AsyncStorage.getItem("delayEveningDhikr"),
        AsyncStorage.getItem("enabledSelectedDua"),
        AsyncStorage.getItem("delaySelectedDua"),
        AsyncStorage.getItem("currentLanguage"),
        AsyncStorage.getItem("userFirstName"),
        AsyncStorage.getItem("isFirstTime"),
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

        // CRITIQUE: Synchroniser immédiatement la méthode de calcul côté Android
        if (Platform.OS === "android" && AdhanModule) {
          debugLog(
            `🔄 Synchronisation initiale Android - méthode: ${calcMethodValue}`
          );
          AdhanModule.setCalculationMethod(calcMethodValue);
          AdhanModule.saveNotificationSettings({
            calcMethod: calcMethodValue,
          });
          debugLog(
            `✅ Synchronisation initiale terminée pour ${calcMethodValue}`
          );
        }
      }
      if (soundEnabledValue !== null)
        setSoundEnabled(soundEnabledValue === "true");
      if (adhanSoundValue) setAdhanSound(adhanSoundValue as AdhanSoundKey);
      if (adhanVolumeValue !== null) setAdhanVolume(Number(adhanVolumeValue));
      if (remindersEnabledValue !== null) {
        setRemindersEnabled(remindersEnabledValue === "true");
      } else {
      }
      if (reminderOffsetValue !== null)
        setReminderOffset(Number(reminderOffsetValue));
      const loadedLocationMode = locationModeValue as LocationMode | null;
      if (loadedLocationMode) setLocationMode(loadedLocationMode);
      if (manualLocationValue)
        setManualLocation(JSON.parse(manualLocationValue));
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
        AsyncStorage.setItem("currentLanguage", defaultLang);
      }

      // Gestion du prénom et première fois
      if (userFirstNameValue) {
        setUserFirstName(userFirstNameValue);
      }
      if (isFirstTimeValue !== null) {
        setIsFirstTime(isFirstTimeValue === "true");
      }

      // New logic for initial location load
      if (loadedLocationMode === "auto") {
        try {
          const savedAuto = await AdhanModule.getSavedAutoLocation();
          if (savedAuto && savedAuto.lat && savedAuto.lon) {
            setAutoLocation(savedAuto);
          } else {
            // Pas de localisation sauvée, l'utilisateur devra refaire la demande
            setLocationError("Aucune localisation automatique sauvée");
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
    };

    loadSettings();
  }, []); // ✅ Suppression de refreshAutoLocation des dépendances

  // Nouveau : Charger le thème sauvegardé
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem("theme_mode");
        if (savedTheme && ["auto", "light", "dark"].includes(savedTheme)) {
          setThemeModeState(savedTheme as "auto" | "light" | "dark");
        }
      } catch (error) {
        console.error("Erreur lors du chargement du thème:", error);
      }
    };
    loadTheme();
  }, []);

  // Nouveau : Fonction pour changer le thème
  const setThemeMode = async (mode: "auto" | "light" | "dark") => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem("theme_mode", mode);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du thème:", error);
    }
  };

  const handleSetLocationMode = (mode: LocationMode) => {
    setLocationMode(mode);
    if (mode !== null) {
      AsyncStorage.setItem("locationMode", mode);
    } else {
      AsyncStorage.removeItem("locationMode");
    }
  };

  const handleSetManualLocation = (location: ManualLocation | null) => {
    setManualLocation(location);
    if (location) {
      AsyncStorage.setItem("manualLocation", JSON.stringify(location));
    } else {
      AsyncStorage.removeItem("manualLocation");
    }
  };

  // Fonction pour reprogrammer toutes les notifications
  const saveAndReprogramAll = async () => {
    if (!locationMode || (!autoLocation && !manualLocation)) {
      return;
    }

    try {
      const userLocation =
        locationMode === "auto" && autoLocation
          ? { latitude: autoLocation.lat, longitude: autoLocation.lon }
          : manualLocation
          ? { latitude: manualLocation.lat, longitude: manualLocation.lon }
          : null;

      if (!userLocation) {
        return;
      }

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
    } catch (error) {
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
    setLocationMode: handleSetLocationMode,
    setManualLocation: handleSetManualLocation,
    refreshAutoLocation,
    setNotificationsEnabled: (v) => {
      setNotificationsEnabled(v);
      AsyncStorage.setItem("notificationsEnabled", String(v));

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
      AsyncStorage.setItem("remindersEnabled", String(v));

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
      AsyncStorage.setItem("reminderOffset", String(v));

      // CRITIQUE: Sauvegarder immédiatement côté Android
      if (!isInitializing && Platform.OS === "android" && AdhanModule) {
        AdhanModule.saveNotificationSettings({
          reminderOffset: v,
        });
      } else if (isInitializing) {
      }
    },
    setCalcMethod: (v) => {
      debugLog(`🔄 CHANGEMENT MÉTHODE DE CALCUL: ${calcMethod} → ${v}`);
      if (Platform.OS === "android" && AdhanModule) {
        debugLog(`🔄 Sauvegarde méthode Android: ${v}`);
        AdhanModule.setCalculationMethod(v);
      }
      setCalcMethod(v);
      AsyncStorage.setItem("calcMethod", v);

      // IMPORTANT: Reprogrammer automatiquement les notifications pour utiliser les nouveaux horaires
      // car les alarmes Adhan sont programmées avec les anciens horaires de prière
      if (!isInitializing) {
        setTimeout(async () => {
          try {
            debugLog(
              `🔄 DÉBUT REPROGRAMMATION après changement: ${calcMethod} → ${v}`
            );
            // CRITIQUE: Les alarmes ont déjà été annulées par setCalculationMethod ci-dessus
            if (Platform.OS === "android" && AdhanModule) {
              debugLog(
                `🔄 Reprogrammation pour méthode: ${v} (alarmes déjà annulées)`
              );
              // Forcer la mise à jour du widget
              debugLog(`🔄 Forçage mise à jour widget pour méthode: ${v}`);
              AdhanModule.forceUpdateWidgets();
            }

            await saveAndReprogramAll();

            // CRITIQUE: Forcer la mise à jour immédiate des horaires du widget avec la nouvelle méthode
            try {
              const userLocation =
                locationMode === "auto" && autoLocation
                  ? { latitude: autoLocation.lat, longitude: autoLocation.lon }
                  : manualLocation
                  ? {
                      latitude: manualLocation.lat,
                      longitude: manualLocation.lon,
                    }
                  : null;

              if (userLocation) {
                debugLog(
                  `🔄 Recalcul immédiat horaires widget pour méthode: ${v}`
                );
                const {
                  computePrayerTimesForDate,
                } = require("../utils/prayerTimes");
                const todayTimes = computePrayerTimesForDate(
                  new Date(),
                  userLocation,
                  v
                );

                // Convertir en format widget
                const formattedTimes: Record<string, string> = {};
                Object.entries(todayTimes).forEach(([prayer, date]) => {
                  const hours = (date as Date)
                    .getHours()
                    .toString()
                    .padStart(2, "0");
                  const minutes = (date as Date)
                    .getMinutes()
                    .toString()
                    .padStart(2, "0");
                  formattedTimes[prayer] = `${hours}:${minutes}`;
                });

                debugLog(
                  `💾 Sauvegarde immédiate horaires widget:`,
                  formattedTimes
                );
                await AdhanModule.saveTodayPrayerTimes(formattedTimes);

                // CRITIQUE: Attendre un peu pour que la sauvegarde soit bien écrite
                await new Promise((resolve) => setTimeout(resolve, 200));

                // Forcer la mise à jour du widget après la sauvegarde SANS vider le cache
                debugLog(
                  `🔄 Forçage final mise à jour widget avec délai (sans vider cache)`
                );
                AdhanModule.forceUpdateWidgetsWithoutClearingCache();
              }
            } catch (recalcError) {
              errorLog(`❌ Erreur recalcul widget:`, recalcError);
            }
          } catch (error) {
            errorLog(
              "❌ Erreur reprogrammation après changement méthode:",
              error
            );
          }
        }, 100); // Petit délai pour laisser l'interface se mettre à jour d'abord
      }
    },
    setAdhanSound: (v) => {
      debugLog("SettingsContext", `🔊 Changement son d'adhan vers: ${v}`);
      setAdhanSound(v); // Cette ligne utilise le setter React useState
      AsyncStorage.setItem("adhanSound", v);

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

      // Reprogrammer automatiquement les notifications pour utiliser le nouveau son
      // MAIS d'abord annuler toutes les alarmes adhan existantes car elles gardent l'ancien son
      if (!isInitializing) {
        setTimeout(async () => {
          try {
            debugLog(
              "SettingsContext",
              `🔄 Début reprogrammation après changement son vers: ${v}`
            );

            // CRITIQUE: Annuler d'abord toutes les alarmes adhan existantes
            if (Platform.OS === "android" && AdhanModule) {
              debugLog(
                "SettingsContext",
                "❌ Annulation alarmes adhan existantes..."
              );
              AdhanModule.cancelAllAdhanAlarms();

              // Petit délai pour s'assurer que l'annulation est bien prise en compte
              await new Promise((resolve) => setTimeout(resolve, 100));
            }

            debugLog(
              "SettingsContext",
              "🔄 Reprogrammation avec nouveau son..."
            );
            await saveAndReprogramAll();
            debugLog(
              "SettingsContext",
              `✅ Reprogrammation terminée avec son: ${v}`
            );
          } catch (error) {
            errorLog(
              "SettingsContext",
              `❌ Erreur reprogrammation son: ${error}`
            );
          }
        }, 150); // Délai augmenté pour laisser temps à la sauvegarde Android
      }
    },
    setAdhanVolume: (v) => {
      setAdhanVolume(v);
      AsyncStorage.setItem("adhanVolume", String(v));

      // Sauvegarder côté Android
      if (Platform.OS === "android" && AdhanModule) {
        AdhanModule.setAdhanVolume(v);
      }
    },
    setEnabledAfterSalah: (v) => {
      setEnabledAfterSalah(v);
      AsyncStorage.setItem("enabledAfterSalah", String(v));

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
      AsyncStorage.setItem("enabledMorningDhikr", String(v));

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
      AsyncStorage.setItem("enabledEveningDhikr", String(v));

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
      AsyncStorage.setItem("delayMorningDhikr", String(v));

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
      AsyncStorage.setItem("delayEveningDhikr", String(v));

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
      AsyncStorage.setItem("enabledSelectedDua", String(v));

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
      AsyncStorage.setItem("delaySelectedDua", String(v));

      // CRITIQUE: Sauvegarder immédiatement côté Android
      if (!isInitializing && Platform.OS === "android" && AdhanModule) {
        AdhanModule.saveNotificationSettings({
          delaySelectedDua: v,
        });
      } else if (isInitializing) {
      }
    },
    setCurrentLanguage: (language) => {
      setCurrentLanguage(language);
      AsyncStorage.setItem("currentLanguage", language);

      // Synchroniser avec i18n optimisé
      changeLanguage(language);

      // IMPORTANT: Transmettre immédiatement la langue côté Android
      // pour les notifications ET le widget !
      if (!isInitializing && Platform.OS === "android" && AdhanModule) {
        AdhanModule.saveNotificationSettings({
          currentLanguage: language,
        });

        // Sauvegarder aussi dans SharedPreferences pour le widget
        try {
          const AsyncStorage =
            require("@react-native-async-storage/async-storage").default;
          AsyncStorage.setItem("currentLanguage", language);
        } catch (error) {}
      } else if (isInitializing) {
      }
    },
    setUserFirstName: (firstName) => {
      setUserFirstName(firstName);
      AsyncStorage.setItem("userFirstName", firstName || "");
    },
    setIsFirstTime: (isFirst) => {
      setIsFirstTime(isFirst);
      AsyncStorage.setItem("isFirstTime", String(isFirst));
    },
    setThemeMode,
    saveAndReprogramAll,
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
