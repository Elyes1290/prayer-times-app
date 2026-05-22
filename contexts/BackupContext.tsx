import React, {
  createContext,
  use,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { debugLog, errorLog } from "../utils/logger";
import { usePremium } from "./PremiumContext";
import { useToast } from "./ToastContext";
import apiClient from "../utils/apiClient";
import { useTranslation } from "react-i18next";
import { LocalStorageManager } from "../utils/localStorageManager";
import { SettingsContext } from "./SettingsContext";

// Types pour le système de backup
interface UserBackupData {
  favorites: {
    dhikr: any[];
    verses: any[];
    hadiths: any[];
    asmaulhusna: any[];
    duas: any[];
  };
  settings: {
    theme?: string;
    language?: string;
    userFirstName?: string;
    customSettings?: any;
  };
  lastBackupTime: string;
  deviceInfo: {
    platform: string;
    version: string;
  };
}

interface BackupContextType {
  // État du backup
  isSignedIn: boolean;
  userEmail: string | null;
  lastBackupTime: string | null;
  isSyncing: boolean;
  backupStatus: "idle" | "syncing" | "success" | "error";

  // Actions d'authentification (Premium uniquement)
  signInAnonymously: () => Promise<boolean>;
  signOut: () => Promise<void>;

  // Actions de sauvegarde (Premium uniquement)
  backupData: () => Promise<boolean>;
  restoreData: () => Promise<boolean>;

  // Sauvegarde automatique (Premium uniquement)
  enableAutoBackup: (enabled: boolean) => void;
  isAutoBackupEnabled: boolean;

  // Gestion des conflits
  hasCloudData: boolean;
  showRestoreDialog: boolean;
  dismissRestoreDialog: () => void;

  // Nouvelle méthode pour la migration des favoris depuis l'ancien système
  migrateFavoritesFromOldSystem: () => Promise<boolean>;
}

const BackupContext = createContext<BackupContextType | undefined>(undefined);

interface BackupProviderProps {
  children: ReactNode;
}

export const BackupProvider: React.FC<BackupProviderProps> = ({ children }) => {
  const { user } = usePremium();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const settingsContext = use(SettingsContext);

  // États du backup
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [backupStatus, setBackupStatus] = useState<
    "idle" | "syncing" | "success" | "error"
  >("idle");
  const [isAutoBackupEnabled, setIsAutoBackupEnabled] = useState(false);
  const [hasCloudData, setHasCloudData] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  // 🔐 Vérifier l'état d'authentification SEULEMENT pour les premium
  useEffect(() => {
    const checkAuthState = async () => {
      if (user.isPremium) {
        // 🚀 NOUVEAU : Mode professionnel - vérifier SEULEMENT les connexions explicites
        // Distinguer connexion automatique (interdite) vs connexion explicite (autorisée)
        const userData = await AsyncStorage.getItem("user_data");
        const isExplicitConnection = await AsyncStorage.getItem(
          "explicit_connection"
        );

        if (userData && isExplicitConnection === "true") {
          // Connexion explicite autorisée
          try {
            const parsedData = JSON.parse(userData);
            setIsSignedIn(true);
            setUserEmail(
              parsedData.email ||
                `Premium-${parsedData.device_id?.substring(0, 8) || "User"}`
            );
            console.log(
              "✅ [DEBUG] Connexion explicite détectée - backup autorisé"
            );

            // Vérifier les données cloud
            await checkCloudData();
            await loadBackupSettings();
          } catch (error) {
            console.error(
              "❌ Erreur parsing données utilisateur explicite:",
              error
            );
            setIsSignedIn(false);
            setUserEmail(null);
            setHasCloudData(false);
          }
        } else {
          // Pas de connexion explicite - mode professionnel
          console.log(
            "🔍 [DEBUG] Mode professionnel - pas de connexion explicite détectée"
          );
          setIsSignedIn(false);
          setUserEmail(null);
          setHasCloudData(false);
          setIsAutoBackupEnabled(false);
          setShowRestoreDialog(false);
        }
      } else {
        // Utilisateurs gratuits : Reset tout état
        setIsSignedIn(false);
        setUserEmail(null);
        setHasCloudData(false);
        setIsAutoBackupEnabled(false);
        setShowRestoreDialog(false);
      }
    };

    checkAuthState();
  }, [user.isPremium]);

  // Auto-backup uniquement pour les premium
  useEffect(() => {
    if (user.isPremium && isSignedIn && isAutoBackupEnabled) {
      const interval = setInterval(() => {
        backupData();
      }, 5 * 60 * 1000); // Backup toutes les 5 minutes

      return () => clearInterval(interval);
    }
  }, [user.isPremium, isSignedIn, isAutoBackupEnabled]);

  // Vérifier les données cloud (Premium uniquement)
  const checkCloudData = async (): Promise<void> => {
    if (!user.isPremium) return;

    try {
      debugLog("🔍 Vérification des données cloud...");
      // 🚀 NOUVEAU : Vérifier les backups dans l'API MySQL
      const backupsResult = await apiClient.getUserBackups();
      debugLog("📡 Réponse API backups:", backupsResult);

      if (
        backupsResult.success &&
        backupsResult.data &&
        Array.isArray(backupsResult.data) &&
        backupsResult.data.length > 0
      ) {
        setHasCloudData(true);
        // Prendre la date du backup le plus récent
        const latestBackup = backupsResult.data[0];
        setLastBackupTime(latestBackup.created_at);
        debugLog("✅ Données cloud trouvées:", latestBackup);
      } else {
        setHasCloudData(false);
        debugLog("ℹ️ Aucune donnée cloud trouvée - Réponse:", backupsResult);
      }
    } catch (error) {
      errorLog("❌ Erreur vérification données cloud:", error);
      setHasCloudData(false);
    }
  };

  // Charger les paramètres de backup (Premium uniquement)
  const loadBackupSettings = async (): Promise<void> => {
    if (!user.isPremium) return;

    try {
      const autoBackupSetting = await AsyncStorage.getItem("autoBackupEnabled");
      const lastBackup = await AsyncStorage.getItem("lastBackupTime");

      setIsAutoBackupEnabled(autoBackupSetting === "true");
      if (lastBackup) {
        setLastBackupTime(lastBackup);
      }
    } catch (error) {
      errorLog("❌ Erreur chargement paramètres backup:", error);
    }
  };

  // Migration des favoris depuis l'ancien système
  const migrateFavoritesFromOldSystem = async (): Promise<boolean> => {
    try {
      // Vérifier s'il y a des favoris dans l'ancien système
      const oldFavorites = await AsyncStorage.getItem("@prayer_app_favorites");
      const newFavorites = await AsyncStorage.getItem(
        "@prayer_app_favorites_local"
      );

      if (oldFavorites && !newFavorites) {
        // Migrer vers le nouveau système
        await AsyncStorage.setItem("@prayer_app_favorites_local", oldFavorites);

        // Supprimer l'ancienne clé après migration
        await AsyncStorage.removeItem("@prayer_app_favorites");

        debugLog("✅ Migration des favoris réussie");
        return true;
      }

      return false;
    } catch (error) {
      errorLog("❌ Erreur migration favoris:", error);
      return false;
    }
  };

  // Fonction de sauvegarde (Premium uniquement)
  const backupData = async (): Promise<boolean> => {
    if (!user.isPremium) {
      showToast({
        type: "error",
        title: t("backup_premium_required"),
        message: t("backup_premium_message"),
      });
      return false;
    }

    // 🚀 NOUVEAU : Mode professionnel - vérifier la connexion explicite
    const isExplicitConnection = await AsyncStorage.getItem(
      "explicit_connection"
    );
    if (!isSignedIn || isExplicitConnection !== "true") {
      console.log(
        "🔍 [DEBUG] Mode professionnel - backup nécessite une connexion explicite"
      );
      showToast({
        type: "error",
        title: t("backup_connection_required"),
        message:
          "Veuillez vous connecter explicitement pour utiliser les backups",
      });
      return false;
    }

    // Connexion explicite vérifiée - procéder au backup
    try {
      setIsSyncing(true);
      setBackupStatus("syncing");

      // Récupérer toutes les données à sauvegarder
      const [
        allFavorites,
        userFirstName,
        customSettings,
        premiumUser,
        downloadedContent,
        premiumCatalog,
        audioSettings,
        userSettings,
      ] = await Promise.all([
        AsyncStorage.getItem("@prayer_app_favorites_local"),
        AsyncStorage.getItem("userFirstName"),
        AsyncStorage.getItem("customSettings"),
        AsyncStorage.getItem("@prayer_app_premium_user"),
        LocalStorageManager.getPremium("DOWNLOADED_CONTENT"),
        AsyncStorage.getItem("premium_catalog_cache"),
        AsyncStorage.getItem("audio_settings"),
        AsyncStorage.getItem("user_settings"),
      ]);

      // Parser et séparer les favoris par type
      const favorites = allFavorites ? JSON.parse(allFavorites) : [];
      const favoritesByType = {
        dhikr: favorites.filter((f: any) => f.type === "dhikr"),
        verses: favorites.filter((f: any) => f.type === "quran_verse"),
        hadiths: favorites.filter((f: any) => f.type === "hadith"),
        asmaulhusna: favorites.filter((f: any) => f.type === "asmaul_husna"),
        duas: favorites.filter(
          (f: any) => f.type === "dhikr" && f.category?.includes("dua")
        ),
      };

      // 🚀 CORRECTION : Inclure TOUS les paramètres du SettingsContext
      const allSettings = {
        // Paramètres de base
        userFirstName,
        ...(customSettings && customSettings !== null
          ? { customSettings: JSON.parse(customSettings) }
          : {}),
        ...(userSettings && userSettings !== null
          ? { userSettings: JSON.parse(userSettings) }
          : {}),

        // 📊 NOUVEAUX : Paramètres complets du SettingsContext
        calcMethod: settingsContext?.calcMethod,
        adhanSound: settingsContext?.adhanSound,
        adhanVolume: settingsContext?.adhanVolume,
        locationMode: settingsContext?.locationMode,
        manualLocation: settingsContext?.manualLocation,
        notificationsEnabled: settingsContext?.notificationsEnabled,
        remindersEnabled: settingsContext?.remindersEnabled,
        reminderOffset: settingsContext?.reminderOffset,
        themeMode: settingsContext?.themeMode,
        currentLanguage: settingsContext?.currentLanguage,
        audioQuality: settingsContext?.audioQuality,
        downloadStrategy: settingsContext?.downloadStrategy,
        enableDataSaving: settingsContext?.enableDataSaving,
        maxCacheSize: settingsContext?.maxCacheSize,

        // Paramètres Dhikr
        dhikrSettings: {
          enabledAfterSalah: settingsContext?.enabledAfterSalah,
          delayAfterSalah: settingsContext?.delayAfterSalah,
          enabledMorningDhikr: settingsContext?.enabledMorningDhikr,
          delayMorningDhikr: settingsContext?.delayMorningDhikr,
          enabledEveningDhikr: settingsContext?.enabledEveningDhikr,
          delayEveningDhikr: settingsContext?.delayEveningDhikr,
          enabledSelectedDua: settingsContext?.enabledSelectedDua,
          delaySelectedDua: settingsContext?.delaySelectedDua,
        },
      };

      // Préparer les données de backup complètes
      const backupDataToSave = {
        favorites: favoritesByType,
        settings: allSettings,
        premiumData: {
          userProfile:
            premiumUser && typeof premiumUser === "string"
              ? JSON.parse(premiumUser)
              : null,
          downloadedContent:
            downloadedContent && typeof downloadedContent === "string"
              ? JSON.parse(downloadedContent)
              : [],
          catalogCache:
            premiumCatalog && typeof premiumCatalog === "string"
              ? JSON.parse(premiumCatalog)
              : null,
          audioSettings:
            audioSettings && typeof audioSettings === "string"
              ? JSON.parse(audioSettings)
              : null,
        },
        metadata: {
          version: "2.0",
          timestamp: new Date().toISOString(),
          device: await AsyncStorage.getItem("device_id"),
        },
      };

      // Sauvegarder via l'API
      const result = await apiClient.saveUserBackup({
        backup_data: JSON.stringify(backupDataToSave),
        backup_type: "full",
        backup_name: `Backup-${new Date().toISOString().split("T")[0]}`,
      });

      if (result.success) {
        const backupTime = new Date().toISOString();
        setLastBackupTime(backupTime);
        await AsyncStorage.setItem("lastBackupTime", backupTime);

        setBackupStatus("success");
        showToast({
          type: "success",
          title: t("backup_success_title"),
          message: t("backup_success_message"),
        });

        console.log("✅ [DEBUG] Backup réussi avec connexion explicite");
        return true;
      } else {
        throw new Error(result.message || "Échec de la sauvegarde");
      }
    } catch (error) {
      console.error("❌ Erreur backup:", error);
      setBackupStatus("error");
      showToast({
        type: "error",
        title: t("backup_error_title"),
        message: t("backup_error_message"),
      });
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  // Authentification anonyme (Premium uniquement)
  const signInAnonymously = async (): Promise<boolean> => {
    if (!user.isPremium) {
      showToast({
        type: "error",
        title: t("backup_premium_required"),
        message: t("backup_premium_message"),
      });
      return false;
    }

    try {
      setIsSyncing(true);
      setBackupStatus("syncing");

      // 🚀 NOUVEAU : Mode professionnel - vérifier si l'utilisateur est explicitement connecté
      const userData = await AsyncStorage.getItem("user_data");
      if (!userData) {
        console.log(
          "🔍 [DEBUG] Mode professionnel - aucune donnée utilisateur pour backup"
        );
        showToast({
          type: "error",
          title: t("backup_login_required_title"),
          message: "Veuillez vous connecter pour utiliser les backups",
        });
        setBackupStatus("error");
        setIsSyncing(false);
        return false;
      }

      // Marquer comme connexion explicite pour le backup
      await AsyncStorage.setItem("explicit_connection", "true");

      const parsedData = JSON.parse(userData);
      setIsSignedIn(true);
      setUserEmail(
        parsedData.email ||
          `Premium-${parsedData.device_id?.substring(0, 8) || "User"}`
      );

      console.log("✅ [DEBUG] Connexion backup explicite réussie");

      showToast({
        type: "success",
        title: t("backup_login_success_title"),
        message: "Connecté à la sauvegarde cloud Premium!",
      });

      // Vérifier les données cloud
      await checkCloudData();

      setBackupStatus("success");
      return true;
    } catch (error) {
      console.error("❌ Erreur connexion backup:", error);
      setBackupStatus("error");
      setIsSyncing(false);
      return false;
    }
  };

  // Déconnexion (Premium uniquement)
  const signOut = async (): Promise<void> => {
    if (!user.isPremium) return;

    try {
      // Réinitialiser l'état local
      setIsSignedIn(false);
      setUserEmail(null);
      setHasCloudData(false);
      setLastBackupTime(null);
      setIsAutoBackupEnabled(false);
      setShowRestoreDialog(false);

      // Supprimer les données de backup locales si désiré
      await AsyncStorage.removeItem("lastBackupTime");
      await AsyncStorage.removeItem("autoBackupEnabled");

      // 🚀 NOUVEAU : Nettoyer le cache des statistiques
      await AsyncStorage.removeItem("user_stats_cache");

      showToast({
        type: "info",
        title: t("backup_logout_success_title"),
        message: t("backup_logout_success_message"),
      });
    } catch (error) {
      errorLog("❌ Erreur déconnexion:", error);
    }
  };

  // Restaurer les données (Premium uniquement)
  const restoreData = async (): Promise<boolean> => {
    if (!user.isPremium) {
      showToast({
        type: "error",
        title: t("restore_premium_required"),
        message: t("restore_premium_message"),
      });
      return false;
    }

    // 🚀 NOUVEAU : Mode professionnel - vérifier la connexion explicite
    const isExplicitConnection = await AsyncStorage.getItem(
      "explicit_connection"
    );
    if (!isSignedIn || isExplicitConnection !== "true") {
      console.log(
        "🔍 [DEBUG] Mode professionnel - restauration nécessite une connexion explicite"
      );
      showToast({
        type: "error",
        title: t("restore_connection_required"),
        message:
          "Veuillez vous connecter explicitement pour restaurer vos données",
      });
      return false;
    }

    // Connexion explicite vérifiée - procéder à la restauration
    try {
      setIsSyncing(true);
      setBackupStatus("syncing");

      // Récupérer les backups depuis l'API
      const backupsResult = await apiClient.getUserBackups();

      if (
        !backupsResult.success ||
        !backupsResult.data ||
        !Array.isArray(backupsResult.data) ||
        backupsResult.data.length === 0
      ) {
        showToast({
          type: "info",
          title: t("restore_no_backup_title"),
          message: t("restore_no_backup_message"),
        });
        setBackupStatus("idle");
        return false;
      }

      // Prendre le backup le plus récent
      const latestBackup = backupsResult.data[0];
      const cloudData = JSON.parse(latestBackup.backup_data);

      // Vérifier que les données cloud existent
      if (!cloudData) {
        throw new Error("Données cloud invalides ou corrompues");
      }

      // Restaurer les favoris
      if (cloudData.favorites) {
        const allFavorites = [
          ...(cloudData.favorites.dhikr || []),
          ...(cloudData.favorites.verses || []),
          ...(cloudData.favorites.hadiths || []),
          ...(cloudData.favorites.asmaulhusna || []),
          ...(cloudData.favorites.duas || []),
        ];
        await AsyncStorage.setItem(
          "@prayer_app_favorites_local",
          JSON.stringify(allFavorites)
        );
      }

      // 🚀 CORRECTION : Restaurer TOUS les paramètres
      if (cloudData.settings) {
        // Paramètres de base
        if (cloudData.settings.userFirstName) {
          await AsyncStorage.setItem(
            "userFirstName",
            cloudData.settings.userFirstName
          );
          settingsContext?.setUserFirstName(cloudData.settings.userFirstName);
        }

        // 📊 NOUVEAUX : Restaurer tous les paramètres SettingsContext
        if (cloudData.settings.calcMethod) {
          await AsyncStorage.setItem(
            "calcMethod",
            cloudData.settings.calcMethod
          );
          settingsContext?.setCalcMethod(cloudData.settings.calcMethod);
        }

        if (cloudData.settings.adhanSound) {
          await AsyncStorage.setItem(
            "adhanSound",
            cloudData.settings.adhanSound
          );
          settingsContext?.setAdhanSound(cloudData.settings.adhanSound);
        }

        if (cloudData.settings.adhanVolume !== undefined) {
          await AsyncStorage.setItem(
            "adhanVolume",
            cloudData.settings.adhanVolume.toString()
          );
          settingsContext?.setAdhanVolume(cloudData.settings.adhanVolume);
        }

        if (cloudData.settings.locationMode) {
          await AsyncStorage.setItem(
            "locationMode",
            cloudData.settings.locationMode
          );
          settingsContext?.setLocationMode(cloudData.settings.locationMode);
        }

        if (cloudData.settings.manualLocation) {
          await AsyncStorage.setItem(
            "manualLocation",
            JSON.stringify(cloudData.settings.manualLocation)
          );
          settingsContext?.setManualLocation(cloudData.settings.manualLocation);
        }

        if (cloudData.settings.notificationsEnabled !== undefined) {
          await AsyncStorage.setItem(
            "notificationsEnabled",
            cloudData.settings.notificationsEnabled.toString()
          );
          settingsContext?.setNotificationsEnabled(
            cloudData.settings.notificationsEnabled
          );
        }

        if (cloudData.settings.remindersEnabled !== undefined) {
          await AsyncStorage.setItem(
            "remindersEnabled",
            cloudData.settings.remindersEnabled.toString()
          );
          settingsContext?.setRemindersEnabled(
            cloudData.settings.remindersEnabled
          );
        }

        if (cloudData.settings.reminderOffset !== undefined) {
          await AsyncStorage.setItem(
            "reminderOffset",
            cloudData.settings.reminderOffset.toString()
          );
          settingsContext?.setReminderOffset(cloudData.settings.reminderOffset);
        }

        if (cloudData.settings.themeMode) {
          await AsyncStorage.setItem("themeMode", cloudData.settings.themeMode);
          settingsContext?.setThemeMode(cloudData.settings.themeMode);
        }

        if (cloudData.settings.currentLanguage) {
          await AsyncStorage.setItem(
            "language",
            cloudData.settings.currentLanguage
          );
          settingsContext?.setCurrentLanguage(
            cloudData.settings.currentLanguage
          );
        }

        if (cloudData.settings.audioQuality) {
          await AsyncStorage.setItem(
            "audioQuality",
            cloudData.settings.audioQuality
          );
          settingsContext?.setAudioQuality(cloudData.settings.audioQuality);
        }

        if (cloudData.settings.downloadStrategy) {
          await AsyncStorage.setItem(
            "downloadStrategy",
            cloudData.settings.downloadStrategy
          );
          settingsContext?.setDownloadStrategy(
            cloudData.settings.downloadStrategy
          );
        }

        if (cloudData.settings.enableDataSaving !== undefined) {
          await AsyncStorage.setItem(
            "enableDataSaving",
            cloudData.settings.enableDataSaving.toString()
          );
          settingsContext?.setEnableDataSaving(
            cloudData.settings.enableDataSaving
          );
        }

        if (cloudData.settings.maxCacheSize !== undefined) {
          await AsyncStorage.setItem(
            "maxCacheSize",
            cloudData.settings.maxCacheSize.toString()
          );
          settingsContext?.setMaxCacheSize(cloudData.settings.maxCacheSize);
        }

        // 🤲 Restaurer les paramètres Dhikr
        if (cloudData.settings.dhikrSettings) {
          const dhikr = cloudData.settings.dhikrSettings;

          if (dhikr.enabledAfterSalah !== undefined) {
            await AsyncStorage.setItem(
              "enabledAfterSalah",
              dhikr.enabledAfterSalah.toString()
            );
            settingsContext?.setEnabledAfterSalah(dhikr.enabledAfterSalah);
          }

          if (dhikr.delayAfterSalah !== undefined) {
            await AsyncStorage.setItem(
              "delayAfterSalah",
              dhikr.delayAfterSalah.toString()
            );
            settingsContext?.setDelayAfterSalah(dhikr.delayAfterSalah);
          }

          if (dhikr.enabledMorningDhikr !== undefined) {
            await AsyncStorage.setItem(
              "enabledMorningDhikr",
              dhikr.enabledMorningDhikr.toString()
            );
            settingsContext?.setEnabledMorningDhikr(dhikr.enabledMorningDhikr);
          }

          if (dhikr.delayMorningDhikr !== undefined) {
            await AsyncStorage.setItem(
              "delayMorningDhikr",
              dhikr.delayMorningDhikr.toString()
            );
            settingsContext?.setDelayMorningDhikr(dhikr.delayMorningDhikr);
          }

          if (dhikr.enabledEveningDhikr !== undefined) {
            await AsyncStorage.setItem(
              "enabledEveningDhikr",
              dhikr.enabledEveningDhikr.toString()
            );
            settingsContext?.setEnabledEveningDhikr(dhikr.enabledEveningDhikr);
          }

          if (dhikr.delayEveningDhikr !== undefined) {
            await AsyncStorage.setItem(
              "delayEveningDhikr",
              dhikr.delayEveningDhikr.toString()
            );
            settingsContext?.setDelayEveningDhikr(dhikr.delayEveningDhikr);
          }

          if (dhikr.enabledSelectedDua !== undefined) {
            await AsyncStorage.setItem(
              "enabledSelectedDua",
              dhikr.enabledSelectedDua.toString()
            );
            settingsContext?.setEnabledSelectedDua(dhikr.enabledSelectedDua);
          }

          if (dhikr.delaySelectedDua !== undefined) {
            await AsyncStorage.setItem(
              "delaySelectedDua",
              dhikr.delaySelectedDua.toString()
            );
            settingsContext?.setDelaySelectedDua(dhikr.delaySelectedDua);
          }
        }

        // Anciens paramètres (compatibilité)
        if (cloudData.settings.customSettings) {
          await AsyncStorage.setItem(
            "customSettings",
            JSON.stringify(cloudData.settings.customSettings)
          );
        }
        if (cloudData.settings.userSettings) {
          await AsyncStorage.setItem(
            "user_settings",
            JSON.stringify(cloudData.settings.userSettings)
          );
        }
      }

      // Restaurer les données premium
      if (cloudData.premiumData) {
        if (cloudData.premiumData.userProfile) {
          await AsyncStorage.setItem(
            "@prayer_app_premium_user",
            JSON.stringify(cloudData.premiumData.userProfile)
          );
        }
        if (cloudData.premiumData.downloadedContent) {
          await LocalStorageManager.savePremium(
            "DOWNLOADED_CONTENT",
            cloudData.premiumData.downloadedContent,
            true,
            true
          );
        }
        if (cloudData.premiumData.catalogCache) {
          await AsyncStorage.setItem(
            "premium_catalog_cache",
            JSON.stringify(cloudData.premiumData.catalogCache)
          );
        }
        if (cloudData.premiumData.audioSettings) {
          await AsyncStorage.setItem(
            "audio_settings",
            JSON.stringify(cloudData.premiumData.audioSettings)
          );
        }
      }

      const restoreTime = new Date().toISOString();
      setLastBackupTime(restoreTime);
      await AsyncStorage.setItem("lastBackupTime", restoreTime);

      setBackupStatus("success");
      showToast({
        type: "success",
        title: t("restore_success_title"),
        message: t("restore_success_message"),
      });

      console.log("✅ [DEBUG] Restauration réussie avec connexion explicite");
      return true;
    } catch (error) {
      console.error("❌ Erreur restauration:", error);
      setBackupStatus("error");
      showToast({
        type: "error",
        title: t("restore_error_title"),
        message: t("restore_error_message"),
      });
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  // Activer/désactiver le backup automatique (Premium uniquement)
  const enableAutoBackup = async (enabled: boolean): Promise<void> => {
    if (!user.isPremium) {
      showToast({
        type: "error",
        title: t("auto_backup_premium_required"),
        message: t("auto_backup_premium_message"),
      });
      return;
    }

    setIsAutoBackupEnabled(enabled);
    await AsyncStorage.setItem("autoBackupEnabled", enabled.toString());

    if (enabled && isSignedIn) {
      showToast({
        type: "success",
        title: t("auto_backup_enabled_title"),
        message: t("auto_backup_enabled_message"),
      });
      // Faire un backup immédiat
      await backupData();
    } else {
      showToast({
        type: "info",
        title: t("auto_backup_disabled_title"),
        message: t("auto_backup_disabled_message"),
      });
    }
  };

  // Fermer la dialog de restauration
  const dismissRestoreDialog = (): void => {
    setShowRestoreDialog(false);
  };

  const value: BackupContextType = {
    // État
    isSignedIn: user.isPremium ? isSignedIn : false,
    userEmail: user.isPremium ? userEmail : null,
    lastBackupTime: user.isPremium ? lastBackupTime : null,
    isSyncing: user.isPremium ? isSyncing : false,
    backupStatus: user.isPremium ? backupStatus : "idle",

    // Actions auth (Premium uniquement)
    signInAnonymously,
    signOut,

    // Actions backup (Premium uniquement)
    backupData,
    restoreData,

    // Auto backup (Premium uniquement)
    enableAutoBackup,
    isAutoBackupEnabled: user.isPremium ? isAutoBackupEnabled : false,

    // Conflits (Premium uniquement)
    hasCloudData: user.isPremium ? hasCloudData : false,
    showRestoreDialog: user.isPremium ? showRestoreDialog : false,
    dismissRestoreDialog,

    // Migration
    migrateFavoritesFromOldSystem,
  };

  return (
    <BackupContext.Provider value={value}>{children}</BackupContext.Provider>
  );
};

export const useBackup = (): BackupContextType => {
  const context = use(BackupContext);
  if (!context) {
    throw new Error("useBackup must be used within a BackupProvider");
  }
  return context;
};
