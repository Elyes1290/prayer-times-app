/**
 * 🚀 Utilitaires de synchronisation après paiement
 * Résout le problème de token manquant après inscription
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "./apiClient";

export interface PaymentSyncResult {
  success: boolean;
  message: string;
  userData?: any;
  requiresManualLogin?: boolean;
}

/**
 * 🔄 Synchronise automatiquement l'utilisateur après un paiement réussi
 * Résout le problème de token manquant qui causait l'erreur 401
 */
export const syncUserAfterPayment = async (): Promise<PaymentSyncResult> => {
  try {
    console.log("🔄 Début synchronisation utilisateur après paiement...");

    // Récupérer les données d'inscription en attente
    const pendingRegistration = await AsyncStorage.getItem(
      "pending_registration"
    );
    if (!pendingRegistration) {
      // 🚀 CORRECTION : Vérifier si l'utilisateur est déjà connecté
      const explicitConnection = await AsyncStorage.getItem(
        "explicit_connection"
      );
      if (explicitConnection === "true") {
        return {
          success: true,
          message: "Utilisateur déjà synchronisé",
          requiresManualLogin: false,
        };
      }

      return {
        success: false,
        message: "Aucune donnée d'inscription en attente",
        requiresManualLogin: true,
      };
    }

    const registrationData = JSON.parse(pendingRegistration);
    console.log(
      "📧 Tentative de synchronisation pour:",
      registrationData.email
    );

    // 🆕 Compte déjà existant/connecté (souscription ou renouvellement depuis le
    // menu compte) : aucun login par identifiants (on n'a pas le mot de passe).
    // On laisse le temps au webhook de mettre à jour le premium puis on
    // rafraîchit les données utilisateur depuis le serveur.
    if (registrationData.isExistingAccount) {
      console.log(
        "🔄 Souscription/renouvellement d'un compte existant — refresh serveur"
      );

      const explicitConnection = await AsyncStorage.getItem(
        "explicit_connection"
      );
      if (explicitConnection !== "true") {
        return {
          success: false,
          message: "Reconnexion requise",
          requiresManualLogin: true,
        };
      }

      // ⏱️ Laisser le webhook (Stripe / RevenueCat) mettre à jour le premium
      await new Promise((resolve) => setTimeout(resolve, 3000));

      try {
        const userResult = await apiClient.getUser();
        if (userResult?.success && userResult.data) {
          const freshUser = (userResult.data as any).user || userResult.data;
          await syncUserDataToLocal(freshUser, userResult.data);
          return {
            success: true,
            message: "Abonnement mis à jour",
            userData: freshUser,
          };
        }
      } catch (refreshError) {
        console.warn(
          "⚠️ Refresh utilisateur après paiement (compte existant):",
          refreshError
        );
      }

      // Le paiement a réussi mais le serveur n'a pas encore propagé : on reste
      // connecté, la vérification premium au premier plan confirmera le statut.
      return {
        success: true,
        message: "Abonnement en cours de validation",
        requiresManualLogin: false,
      };
    }

    // ⏱️ Attendre que le webhook Stripe soit traité
    console.log("⏱️ Attente webhook Stripe (3 secondes)...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 🔐 Tentative de connexion automatique
    try {
      const loginResult = await apiClient.loginWithCredentials({
        email: registrationData.email,
        password: registrationData.password,
      });

      if (loginResult.success && loginResult.data) {
        console.log("✅ Connexion automatique réussie !");
        console.log(
          "🔍 Réponse API complète:",
          JSON.stringify(loginResult, null, 2)
        );

        // Synchroniser les données utilisateur
        const userData = loginResult.data.user || loginResult.data;
        console.log(
          "🔍 Données utilisateur extraites:",
          JSON.stringify(userData, null, 2)
        );
        console.log(
          "🔍 Données API complètes:",
          JSON.stringify(loginResult.data, null, 2)
        );

        await syncUserDataToLocal(userData, loginResult.data);

        // Marquer comme connexion explicite
        await AsyncStorage.setItem("explicit_connection", "true");

        // 🚀 CORRECTION : Ne pas supprimer pending_registration ici
        // Il sera supprimé plus tard dans PaymentSuccessScreen après confirmation complète
        // await AsyncStorage.removeItem("pending_registration");

        return {
          success: true,
          message: "Synchronisation réussie",
          userData: userData,
        };
      } else {
        console.log("⚠️ Connexion automatique échouée:", loginResult.message);
        return {
          success: false,
          message: loginResult.message || "Échec de la connexion automatique",
          requiresManualLogin: true,
        };
      }
    } catch (loginError) {
      console.error("❌ Erreur lors de la connexion automatique:", loginError);
      return {
        success: false,
        message: "Erreur de connexion automatique",
        requiresManualLogin: true,
      };
    }
  } catch (error) {
    console.error("❌ Erreur lors de la synchronisation:", error);
    return {
      success: false,
      message: "Erreur de synchronisation",
      requiresManualLogin: true,
    };
  }
};

/**
 * 💾 Synchronise les données utilisateur avec le stockage local
 * Utilise la même structure que le login normal
 */
const syncUserDataToLocal = async (
  userData: any,
  apiResponse: any
): Promise<void> => {
  try {
    const userDataToStore = {
      id: userData.id,
      user_id: userData.id,
      email: userData.email,
      user_first_name: userData.user_first_name,
      premium_status: userData.premium_status,
      subscription_type: userData.subscription_type,
      subscription_id: userData.subscription_id,
      stripe_customer_id: userData.stripe_customer_id, // 🔑 AJOUT pour gérer l'abonnement Stripe
      premium_expiry: userData.premium_expiry,
      premium_activated_at: userData.premium_activated_at,
      language: userData.language,
      last_sync: new Date().toISOString(),
      device_id: userData.device_id,
    };

    // Stocker les données utilisateur
    await AsyncStorage.setItem("user_data", JSON.stringify(userDataToStore));
    await AsyncStorage.setItem("is_logged_in", "true");

    // 🔑 CORRECTION : Récupérer les tokens depuis la réponse API complète
    // L'API retourne les tokens dans result.data.token et result.data.refresh_token
    const token =
      apiResponse.token ||
      apiResponse.auth_token ||
      userData.token ||
      (userData as any)?.auth_token;
    if (token) {
      await AsyncStorage.setItem("auth_token", token);
      console.log(
        "🔑 Token d'authentification stocké:",
        token.substring(0, 10) + "..."
      );
    } else {
      console.log("⚠️ Aucun token trouvé dans la réponse API");
    }

    // Stocker le refresh token si présent
    const refreshToken = apiResponse.refresh_token || userData.refresh_token;
    if (refreshToken) {
      await AsyncStorage.setItem("refresh_token", refreshToken);
      console.log(
        "🔄 Refresh token stocké:",
        refreshToken.substring(0, 10) + "..."
      );
    } else {
      console.log("⚠️ Aucun refresh token trouvé dans la réponse API");
    }

    console.log("💾 Données utilisateur synchronisées avec succès");
  } catch (error) {
    console.error("❌ Erreur lors de la synchronisation des données:", error);
    throw error;
  }
};

/**
 * 🔍 Vérifie si l'utilisateur est correctement synchronisé
 * Utile pour diagnostiquer les problèmes de token
 */
export const checkUserSyncStatus = async (): Promise<{
  hasUserData: boolean;
  hasAuthToken: boolean;
  hasRefreshToken: boolean;
  isLoggedIn: boolean;
  explicitConnection: boolean;
}> => {
  try {
    const [userData, authToken, refreshToken, isLoggedIn, explicitConnection] =
      await Promise.all([
        AsyncStorage.getItem("user_data"),
        AsyncStorage.getItem("auth_token"),
        AsyncStorage.getItem("refresh_token"),
        AsyncStorage.getItem("is_logged_in"),
        AsyncStorage.getItem("explicit_connection"),
      ]);

    return {
      hasUserData: !!userData,
      hasAuthToken: !!authToken,
      hasRefreshToken: !!refreshToken,
      isLoggedIn: isLoggedIn === "true",
      explicitConnection: explicitConnection === "true",
    };
  } catch (error) {
    console.error("❌ Erreur lors de la vérification du statut:", error);
    return {
      hasUserData: false,
      hasAuthToken: false,
      hasRefreshToken: false,
      isLoggedIn: false,
      explicitConnection: false,
    };
  }
};

/**
 * 🧹 Nettoie les données d'inscription en attente
 * Utile en cas d'échec ou d'annulation
 */
const cleanupPendingRegistration = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem("pending_registration");
    console.log("🧹 Données d'inscription nettoyées");
  } catch (error) {
    console.error("❌ Erreur lors du nettoyage:", error);
  }
};

/**
 * 🔄 Force une nouvelle tentative de synchronisation
 * Utile si la première tentative échoue
 */
export const retryUserSync = async (
  maxRetries: number = 3
): Promise<PaymentSyncResult> => {
  const attemptSync = async (attempt: number): Promise<PaymentSyncResult> => {
    console.log(`🔄 Tentative de synchronisation ${attempt}/${maxRetries}...`);

    const result = await syncUserAfterPayment();
    if (result.success) {
      return result;
    }

    if (attempt < maxRetries) {
      console.log(
        `⏱️ Attente avant nouvelle tentative (${attempt * 2} secondes)...`
      );
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
      return attemptSync(attempt + 1);
    }

    return {
      success: false,
      message: `Échec après ${maxRetries} tentatives`,
      requiresManualLogin: true,
    };
  };

  return attemptSync(1);
};
