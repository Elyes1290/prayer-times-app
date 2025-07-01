import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { debugLog, errorLog } from "../utils/logger";
import { usePremium } from "./PremiumContext";
import { useToast } from "./ToastContext";

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

  // Actions d'authentification
  signInAnonymously: () => Promise<boolean>;
  signOut: () => Promise<void>;

  // Actions de sauvegarde
  backupData: () => Promise<boolean>;
  restoreData: () => Promise<boolean>;

  // Sauvegarde automatique
  enableAutoBackup: (enabled: boolean) => void;
  isAutoBackupEnabled: boolean;

  // Gestion des conflits
  hasCloudData: boolean;
  showRestoreDialog: boolean;
  dismissRestoreDialog: () => void;
}

const BackupContext = createContext<BackupContextType | undefined>(undefined);

interface BackupProviderProps {
  children: ReactNode;
}

export const BackupProvider: React.FC<BackupProviderProps> = ({ children }) => {
  const { user } = usePremium();
  const { showToast } = useToast();

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

  // Vérifier les données cloud
  const checkCloudData = async (userId: string): Promise<void> => {
    try {
      const doc = await firestore().collection("userBackups").doc(userId).get();

      if (doc.exists) {
        setHasCloudData(true);
        const data = doc.data();
        if (data?.lastBackupTime) {
          setLastBackupTime(data.lastBackupTime);

          // Vérifier si les données cloud sont plus récentes
          const localLastBackup = await AsyncStorage.getItem("lastBackupTime");
          if (
            !localLastBackup ||
            new Date(data.lastBackupTime) > new Date(localLastBackup)
          ) {
            setShowRestoreDialog(true);
          }
        }
      }
    } catch (error) {
      errorLog("❌ Erreur vérification données cloud:", error);
    }
  };

  // Charger les paramètres de backup
  const loadBackupSettings = async (): Promise<void> => {
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

  // Fonction de sauvegarde
  const backupData = async (): Promise<boolean> => {
    if (!user.isPremium) {
      showToast({
        type: "error",
        title: "Fonctionnalité Premium",
        message: "La sauvegarde cloud est réservée aux utilisateurs premium",
      });
      return false;
    }

    if (!isSignedIn) {
      showToast({
        type: "error",
        title: "Connexion requise",
        message: "Vous devez être connecté pour sauvegarder",
      });
      return false;
    }

    try {
      setIsSyncing(true);
      setBackupStatus("syncing");

      const currentUser = auth().currentUser;
      if (!currentUser) throw new Error("Utilisateur non connecté");

      // ✅ Récupérer TOUS les favoris depuis la clé unique utilisée par FavoritesContext
      const [allFavorites, userFirstName, customSettings] = await Promise.all([
        AsyncStorage.getItem("@prayer_app_favorites"),
        AsyncStorage.getItem("userFirstName"),
        AsyncStorage.getItem("customSettings"),
      ]);

      // ✅ Parser et séparer les favoris par type
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

      // ✅ Préparer les données (sans valeurs undefined)
      const backupDataToSave: UserBackupData = {
        favorites: favoritesByType,
        settings: {
          // ✅ Omettre les champs undefined (Firestore ne les supporte pas)
          ...(userFirstName ? { userFirstName } : {}),
          ...(customSettings
            ? { customSettings: JSON.parse(customSettings) }
            : {}),
        },
        lastBackupTime: new Date().toISOString(),
        deviceInfo: {
          platform: "react-native",
          version: "1.0.3",
        },
      };

      // Sauvegarder dans Firestore
      await firestore()
        .collection("userBackups")
        .doc(currentUser.uid)
        .set(backupDataToSave);

      // Sauvegarder le timestamp localement
      await AsyncStorage.setItem(
        "lastBackupTime",
        backupDataToSave.lastBackupTime
      );
      setLastBackupTime(backupDataToSave.lastBackupTime);

      debugLog("✅ Sauvegarde réussie:", backupDataToSave);
      showToast({
        type: "success",
        title: "Sauvegarde réussie",
        message: "Données sauvegardées dans le cloud!",
      });
      setBackupStatus("success");
      return true;
    } catch (error) {
      errorLog("❌ Erreur sauvegarde:", error);
      showToast({
        type: "error",
        title: "Erreur de sauvegarde",
        message: "Impossible de sauvegarder les données",
      });
      setBackupStatus("error");
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  // Vérifier l'état d'authentification au démarrage
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setIsSignedIn(true);
        setUserEmail(
          firebaseUser.email || `Anonyme-${firebaseUser.uid.substring(0, 8)}`
        );

        // Vérifier s'il y a des données dans le cloud
        await checkCloudData(firebaseUser.uid);

        // Charger les préférences de backup
        await loadBackupSettings();
      } else {
        setIsSignedIn(false);
        setUserEmail(null);
        setHasCloudData(false);
      }
    });

    return unsubscribe;
  }, []);

  // Auto-backup quand l'utilisateur est premium et a activé l'option
  useEffect(() => {
    if (user.isPremium && isSignedIn && isAutoBackupEnabled) {
      const interval = setInterval(() => {
        backupData();
      }, 5 * 60 * 1000); // Backup toutes les 5 minutes

      return () => clearInterval(interval);
    }
  }, [user.isPremium, isSignedIn, isAutoBackupEnabled]);

  // Authentification anonyme
  const signInAnonymously = async (): Promise<boolean> => {
    console.log("🧪 TEST: signInAnonymously appelé");
    console.log("🧪 TEST: user.isPremium =", user.isPremium);

    if (!user.isPremium) {
      console.log("🧪 TEST: User non premium");
      showToast({
        type: "error",
        title: "Fonctionnalité Premium",
        message: "La sauvegarde cloud est réservée aux utilisateurs premium",
      });
      return false;
    }

    try {
      console.log("🧪 TEST: Début connexion Firebase...");
      setIsSyncing(true);
      setBackupStatus("syncing");

      const userCredential = await auth().signInAnonymously();
      console.log(
        "🧪 TEST: Connexion Firebase OK, UID:",
        userCredential.user?.uid
      );

      if (userCredential.user) {
        const firebaseUser = userCredential.user;

        // ✅ IMPORTANT: Mettre à jour les états
        setIsSignedIn(true);
        setUserEmail(firebaseUser.uid);

        debugLog("🔐 Connexion Firebase réussie:", firebaseUser.uid);
        console.log(
          "🧪 TEST: États mis à jour - isSignedIn=true, userEmail=",
          firebaseUser.uid
        );

        showToast({
          type: "success",
          title: "Connexion réussie",
          message: "Connecté à la sauvegarde cloud!",
        });

        // ✅ IMPORTANT: Vérifier les données cloud
        await checkCloudData(firebaseUser.uid);

        setBackupStatus("success");
        return true;
      }

      return false;
    } catch (error) {
      console.error("🧪 TEST: Erreur Firebase:", error);
      errorLog("❌ Erreur connexion Firebase:", error);
      showToast({
        type: "error",
        title: "Erreur de connexion",
        message: "Impossible de se connecter à la sauvegarde cloud",
      });
      setBackupStatus("error");
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  // Déconnexion
  const signOut = async (): Promise<void> => {
    try {
      await auth().signOut();
      showToast({
        type: "info",
        title: "Déconnexion",
        message: "Déconnecté de la sauvegarde cloud",
      });
    } catch (error) {
      errorLog("❌ Erreur déconnexion:", error);
    }
  };

  // Restaurer les données
  const restoreData = async (): Promise<boolean> => {
    if (!user.isPremium) {
      showToast({
        type: "error",
        title: "Fonctionnalité Premium",
        message: "La restauration cloud est réservée aux utilisateurs premium",
      });
      return false;
    }

    if (!isSignedIn) {
      showToast({
        type: "error",
        title: "Connexion requise",
        message: "Vous devez être connecté pour restaurer",
      });
      return false;
    }

    try {
      setIsSyncing(true);
      setBackupStatus("syncing");

      const currentUser = auth().currentUser;
      if (!currentUser) throw new Error("Utilisateur non connecté");

      const doc = await firestore()
        .collection("userBackups")
        .doc(currentUser.uid)
        .get();

      if (!doc.exists) {
        showToast({
          type: "info",
          title: "Aucune sauvegarde",
          message: "Aucune sauvegarde trouvée dans le cloud",
        });
        return false;
      }

      const cloudData = doc.data() as UserBackupData;

      // ✅ Vérifier que les données cloud existent
      if (!cloudData || !cloudData.favorites) {
        throw new Error("Données cloud invalides ou corrompues");
      }

      // ✅ Reconstituer la liste complète des favoris comme attendu par FavoritesContext
      const allFavoritesToRestore = [
        ...(cloudData.favorites.dhikr || []),
        ...(cloudData.favorites.verses || []),
        ...(cloudData.favorites.hadiths || []),
        ...(cloudData.favorites.asmaulhusna || []),
        ...(cloudData.favorites.duas || []),
      ];

      // ✅ Restaurer dans la clé unique utilisée par FavoritesContext
      await AsyncStorage.setItem(
        "@prayer_app_favorites",
        JSON.stringify(allFavoritesToRestore)
      );

      // Restaurer les paramètres avec vérification de sécurité
      if (cloudData.settings?.userFirstName) {
        await AsyncStorage.setItem(
          "userFirstName",
          cloudData.settings.userFirstName
        );
      }
      if (cloudData.settings?.customSettings) {
        await AsyncStorage.setItem(
          "customSettings",
          JSON.stringify(cloudData.settings.customSettings)
        );
      }

      // Mettre à jour le timestamp local
      await AsyncStorage.setItem("lastBackupTime", cloudData.lastBackupTime);
      setLastBackupTime(cloudData.lastBackupTime);

      debugLog("✅ Restauration réussie:", cloudData);
      showToast({
        type: "success",
        title: "Restauration réussie",
        message: "Données restaurées depuis le cloud!",
      });
      setBackupStatus("success");
      setShowRestoreDialog(false);
      return true;
    } catch (error) {
      errorLog("❌ Erreur restauration:", error);
      showToast({
        type: "error",
        title: "Erreur de restauration",
        message: "Impossible de restaurer les données",
      });
      setBackupStatus("error");
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  // Activer/désactiver le backup automatique
  const enableAutoBackup = async (enabled: boolean): Promise<void> => {
    setIsAutoBackupEnabled(enabled);
    await AsyncStorage.setItem("autoBackupEnabled", enabled.toString());

    if (enabled && user.isPremium && isSignedIn) {
      showToast({
        type: "success",
        title: "Sauvegarde automatique",
        message: "Sauvegarde automatique activée",
      });
      // Faire un backup immédiat
      await backupData();
    } else {
      showToast({
        type: "info",
        title: "Sauvegarde automatique",
        message: "Sauvegarde automatique désactivée",
      });
    }
  };

  // Fermer la dialog de restauration
  const dismissRestoreDialog = (): void => {
    setShowRestoreDialog(false);
  };

  const value: BackupContextType = {
    // État
    isSignedIn,
    userEmail,
    lastBackupTime,
    isSyncing,
    backupStatus,

    // Actions auth
    signInAnonymously,
    signOut,

    // Actions backup
    backupData,
    restoreData,

    // Auto backup
    enableAutoBackup,
    isAutoBackupEnabled,

    // Conflits
    hasCloudData,
    showRestoreDialog,
    dismissRestoreDialog,
  };

  return (
    <BackupContext.Provider value={value}>{children}</BackupContext.Provider>
  );
};

export const useBackup = (): BackupContextType => {
  const context = useContext(BackupContext);
  if (!context) {
    throw new Error("useBackup must be used within a BackupProvider");
  }
  return context;
};
