import AsyncStorage from "@react-native-async-storage/async-storage";
import { safeJsonParse } from "./safeJson";
import {
  ensureVipSessionPersistence,
  isStoredUserVip,
} from "./vipSession";

export interface UserData {
  id: number;
  user_id: number;
  email: string;
  user_first_name: string;
  premium_status: number;
  subscription_type?: string;
  subscription_id?: string;
  subscription_platform?: string;
  stripe_customer_id?: string;
  premium_expiry?: string;
  premium_activated_at?: string;
  language: string;
  last_sync: string;
  device_id?: string;
  is_vip?: boolean;
  vip_reason?: string | null;
  vip_granted_by?: string | null;
  vip_granted_at?: string | null;
}

/**
 * Récupère le user_id de l'utilisateur connecté depuis AsyncStorage
 * 🚀 MODIFIÉ : Ne retourne des données que si l'utilisateur est explicitement connecté
 */
export const getCurrentUserId = async (): Promise<number | null> => {
  try {
    // 🧪 DEBUG : Afficher le statut de connexion
    await debugConnectionStatus();

    // 🚀 NOUVEAU : Vérifier d'abord s'il y a une connexion explicite
    const explicitConnection = await AsyncStorage.getItem(
      "explicit_connection"
    );
    if (explicitConnection !== "true") {
      console.log(
        "🔍 getCurrentUserId - Aucun utilisateur connecté (mode professionnel)"
      );
      return null;
    }

    // 🚀 NOUVEAU : Si connexion explicite, permettre la lecture des données
    const userData = await AsyncStorage.getItem("user_data");
    if (userData) {
      let parsedData: UserData | null = null;
      try {
        parsedData = JSON.parse(userData);
      } catch {
        parsedData = null;
      }
      if (!parsedData) return null;
      const userId = parsedData.user_id || parsedData.id;
      console.log(
        `✅ getCurrentUserId - Utilisateur connecté explicitement: ${userId}`
      );
      return userId;
    }

    console.log(
      "🔍 getCurrentUserId - Données utilisateur non trouvées malgré connexion explicite"
    );
    return null;
  } catch (error) {
    console.error("Erreur récupération user_id:", error);
    return null;
  }
};

/**
 * Récupère toutes les données utilisateur depuis AsyncStorage
 * 🚀 MODIFIÉ : Ne retourne des données que si l'utilisateur est explicitement connecté
 */
export const getCurrentUserData = async (): Promise<UserData | null> => {
  try {
    // 🚀 NOUVEAU : Vérifier d'abord s'il y a une connexion explicite
    const explicitConnection = await AsyncStorage.getItem(
      "explicit_connection"
    );
    if (explicitConnection !== "true") {
      console.log(
        "🔍 getCurrentUserData - Aucun utilisateur connecté (mode professionnel)"
      );
      return null;
    }

    // 🚀 NOUVEAU : Si connexion explicite, permettre la lecture des données
    const userData = await AsyncStorage.getItem("user_data");
    if (userData) {
      console.log(
        "✅ getCurrentUserData - Données utilisateur trouvées avec connexion explicite"
      );
      // 🔧 CORRECTION : Utiliser safeJsonParse
      const parsedData = safeJsonParse<UserData | null>(userData, null);
      if (!parsedData) {
        console.log(
          "⚠️ getCurrentUserData - Erreur parsing user_data, retour null"
        );
      }
      return parsedData;
    }

    console.log(
      "🔍 getCurrentUserData - Données utilisateur non trouvées malgré connexion explicite"
    );
    return null;
  } catch (error) {
    console.error("Erreur récupération données utilisateur:", error);
    return null;
  }
};

/**
 * Vérifie si un utilisateur est connecté
 */
const isUserLoggedIn = async (): Promise<boolean> => {
  const userId = await getCurrentUserId();
  return userId !== null;
};

/** Bloque la réactivation premium iOS (RevenueCat) tant que l'utilisateur ne s'est pas reconnecté. */
export const ACCOUNT_LOGOUT_LOCK_KEY = "@account_logout_lock";

/** Clés de session à effacer lors d'une déconnexion volontaire. */
export const AUTH_SESSION_STORAGE_KEYS = [
  "user_data",
  "auth_token",
  "refresh_token",
  "explicit_connection",
  "premium_user_data",
  "premium_catalog_cache",
  "user_stats_cache",
] as const;

export async function setAccountLogoutLock(): Promise<void> {
  await AsyncStorage.setItem(ACCOUNT_LOGOUT_LOCK_KEY, Date.now().toString());
}

export async function clearAccountLogoutLock(): Promise<void> {
  await AsyncStorage.removeItem(ACCOUNT_LOGOUT_LOCK_KEY);
}

export async function isAccountLogoutLocked(): Promise<boolean> {
  return (await AsyncStorage.getItem(ACCOUNT_LOGOUT_LOCK_KEY)) !== null;
}

/** Supprime la session locale pour empêcher une reconnexion automatique. */
export async function clearLocalAuthSession(): Promise<void> {
  await Promise.all(
    AUTH_SESSION_STORAGE_KEYS.map((key) => AsyncStorage.removeItem(key)),
  );
}

/** Session connectée explicitement (token + flag de connexion volontaire). */
export async function hasExplicitAuthSession(): Promise<boolean> {
  const [token, explicitConnection] = await Promise.all([
    AsyncStorage.getItem("auth_token"),
    AsyncStorage.getItem("explicit_connection"),
  ]);

  return !!token && explicitConnection === "true";
}

/**
 * Déconnecte l'utilisateur en supprimant les données du stockage
 */
const logoutUser = async (): Promise<void> => {
  try {
    await clearLocalAuthSession();
    console.log("✅ Utilisateur déconnecté");
  } catch (error) {
    console.error("Erreur déconnexion:", error);
  }
};

/**
 * 🚀 NOUVEAU : Nettoie définitivement toutes les données utilisateur obsolètes
 * À utiliser pour passer en mode professionnel
 */
export const cleanupObsoleteUserData = async (): Promise<void> => {
  try {
    // 🧪 DEBUG : Vérifier le statut avant nettoyage
    console.log("🧪 [DEBUG] === AVANT NETTOYAGE ===");
    await debugConnectionStatus();

    const [explicitConnection, pendingRegistration] = await Promise.all([
      AsyncStorage.getItem("explicit_connection"),
      AsyncStorage.getItem("pending_registration"),
    ]);

    if (pendingRegistration) {
      console.log("🔍 Processus de paiement en cours - pas de nettoyage");
      return; // Ne pas nettoyer pendant le processus de paiement
    }

    if (explicitConnection === "true") {
      console.log(
        "🔍 Connexion explicite détectée - nettoyage sélectif uniquement"
      );

      // 🚀 NOUVEAU : Nettoyage sélectif - préserver les données utilisateur essentielles
      const keysToRemove = [
        "premium_user_data", // Ancien format premium
        "premium_catalog_cache", // Cache obsolète
        "downloaded_premium_content", // Contenu obsolète
        "user_settings", // Paramètres obsolètes
        "customSettings", // Paramètres obsolètes
        "audio_settings", // Paramètres obsolètes
        "lastBackupTime", // Métadonnées obsolètes
        "autoBackupEnabled", // Paramètres obsolètes
        "apiSyncEnabled", // Paramètres obsolètes
        // 🚀 NOUVEAU : NE PAS supprimer pending_registration pendant le processus de paiement
      ];

      await AsyncStorage.multiRemove(keysToRemove);
      console.log(
        "✅ Nettoyage sélectif terminé (utilisateur connecté explicitement)"
      );
    } else if (await isStoredUserVip()) {
      await ensureVipSessionPersistence();
      console.log(
        "👑 [VIP] Nettoyage sans suppression des données de session VIP"
      );

      const keysToRemove = [
        "premium_user_data",
        "premium_catalog_cache",
        "downloaded_premium_content",
        "user_settings",
        "customSettings",
        "audio_settings",
        "lastBackupTime",
        "autoBackupEnabled",
        "apiSyncEnabled",
      ];

      await AsyncStorage.multiRemove(keysToRemove);
    } else {
      console.log(
        "🔍 Aucune connexion explicite - nettoyage sélectif sans toucher à l'onboarding"
      );

      // 🚀 IMPORTANT : Préserver l'onboarding et la localisation choisie par l'utilisateur
      // NE PAS supprimer :
      // - "userFirstName" (prénom saisi)
      // - "isFirstTime" (flag première ouverture)
      // - "locationMode", "manualLocation", "autoLocation" (choix de localisation)

      const keysToRemove = [
        "user_data",
        "premium_user_data",
        "@prayer_app_premium_user",
        "premium_catalog_cache",
        "downloaded_premium_content",
        "user_settings",
        "customSettings",
        "@prayer_app_favorites_local",
        "audio_settings",
        "lastBackupTime",
        "autoBackupEnabled",
        "apiSyncEnabled",
      ];

      await AsyncStorage.multiRemove(keysToRemove);
      console.log(
        "✅ Données obsolètes supprimées (onboarding et localisation préservés)"
      );
    }

    // 🧪 DEBUG : Vérifier le statut après nettoyage
    console.log("🧪 [DEBUG] === APRÈS NETTOYAGE ===");
    await debugConnectionStatus();
  } catch (error) {
    console.error("❌ Erreur lors du nettoyage des données obsolètes:", error);
  }
};

/**
 * 🧪 DEBUG : Fonction pour vérifier le statut de connexion explicite
 */
const debugConnectionStatus = async (): Promise<void> => {
  try {
    const explicitConnection = await AsyncStorage.getItem(
      "explicit_connection"
    );
    const userData = await AsyncStorage.getItem("user_data");

    console.log("🧪 [DEBUG] === STATUT CONNEXION ===");
    console.log("🧪 [DEBUG] explicit_connection:", explicitConnection);
    console.log("🧪 [DEBUG] user_data exists:", userData ? "OUI" : "NON");

    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        console.log(
          "🧪 [DEBUG] user_id from user_data:",
          parsed.user_id || parsed.id
        );
      } catch (e) {
        console.log("🧪 [DEBUG] Erreur parsing user_data:", e);
      }
    }
    console.log("🧪 [DEBUG] ========================");
  } catch (error) {
    console.error("🧪 [DEBUG] Erreur debug connexion:", error);
  }
};
