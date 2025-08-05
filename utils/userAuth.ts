import AsyncStorage from "@react-native-async-storage/async-storage";

export interface UserData {
  id: number;
  user_id: number;
  email: string;
  user_first_name: string;
  premium_status: number;
  subscription_type?: string;
  subscription_id?: string;
  premium_expiry?: string;
  language: string;
  last_sync: string;
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
      const parsedData: UserData = JSON.parse(userData);
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
      return JSON.parse(userData);
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
export const isUserLoggedIn = async (): Promise<boolean> => {
  const userId = await getCurrentUserId();
  return userId !== null;
};

/**
 * Déconnecte l'utilisateur en supprimant les données du stockage
 */
export const logoutUser = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem("user_data");
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

    // 🚀 NOUVEAU : Vérifier d'abord s'il y a une connexion explicite
    const explicitConnection = await AsyncStorage.getItem(
      "explicit_connection"
    );

    // 🚀 NOUVEAU : Vérifier s'il y a un processus de paiement en cours
    const pendingRegistration = await AsyncStorage.getItem(
      "pending_registration"
    );

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
    } else {
      console.log("🔍 Aucune connexion explicite - nettoyage complet");

      // 🚀 NOUVEAU : Nettoyage complet pour utilisateurs non connectés
      const keysToRemove = [
        "user_data",
        "userFirstName",
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
        "isFirstTime", // 🚀 CRITIQUE : Force toujours première fois
        "locationMode", // 🚀 NOUVEAU : Force le choix de localisation
        "manualLocation", // 🚀 NOUVEAU : Pas de localisation pré-configurée
      ];

      await AsyncStorage.multiRemove(keysToRemove);
      console.log(
        "✅ Toutes les données utilisateur obsolètes ont été supprimées"
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
export const debugConnectionStatus = async (): Promise<void> => {
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
