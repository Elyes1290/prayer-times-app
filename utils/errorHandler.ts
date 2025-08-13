/**
 * 🚀 NOUVEAU : Gestionnaire d'erreurs centralisé pour l'application
 * Analyse les erreurs et retourne des messages d'erreur appropriés avec traduction i18n
 */

import { useTranslation } from "react-i18next";

export interface ErrorInfo {
  title: string;
  message: string;
  type:
    | "authentication"
    | "validation"
    | "network"
    | "server"
    | "technical"
    | "unknown";
}

/**
 * Hook pour analyser une erreur avec traduction i18n
 */
export function useErrorHandler() {
  const { t } = useTranslation();

  const analyzeError = (error: any): ErrorInfo => {
    if (!error) {
      return {
        title: t("errors.validation.title"),
        message: t("errors.unknown_error"),
        type: "unknown",
      };
    }

    const errorMsg = (error.message || "").toLowerCase();
    const errorString = error.toString().toLowerCase();

    // Erreurs d'authentification
    if (
      errorMsg.includes("mot de passe incorrect") ||
      errorMsg.includes("password incorrect") ||
      errorMsg.includes("identifiants incorrects") ||
      errorMsg.includes("invalid credentials") ||
      errorMsg.includes("http 401") ||
      errorMsg.includes("unauthorized")
    ) {
      return {
        title: t("errors.authentication.title"),
        message: t("errors.authentication.invalid_credentials"),
        type: "authentication",
      };
    }

    if (
      errorMsg.includes("utilisateur non trouvé") ||
      errorMsg.includes("user not found") ||
      errorMsg.includes("compte inexistant")
    ) {
      return {
        title: t("errors.authentication.title"),
        message: t("errors.authentication.user_not_found"),
        type: "authentication",
      };
    }

    if (
      errorMsg.includes("token expiré") ||
      errorMsg.includes("expired token") ||
      errorMsg.includes("session expirée")
    ) {
      return {
        title: t("errors.authentication.title"),
        message: t("errors.authentication.session_expired"),
        type: "authentication",
      };
    }

    // Erreurs de validation
    if (
      errorMsg.includes("email requis") ||
      errorMsg.includes("email required") ||
      errorMsg.includes("email manquant")
    ) {
      return {
        title: t("errors.validation.title"),
        message: t("errors.validation.email_required"),
        type: "validation",
      };
    }

    if (
      errorMsg.includes("mot de passe requis") ||
      errorMsg.includes("password required") ||
      errorMsg.includes("mot de passe manquant")
    ) {
      return {
        title: t("errors.validation.title"),
        message: t("errors.validation.password_required"),
        type: "validation",
      };
    }

    if (
      errorMsg.includes("email invalide") ||
      errorMsg.includes("invalid email") ||
      errorMsg.includes("format email")
    ) {
      return {
        title: t("errors.validation.title"),
        message: t("errors.validation.invalid_email"),
        type: "validation",
      };
    }

    if (
      errorMsg.includes("mot de passe doit contenir") ||
      errorMsg.includes("password must contain") ||
      errorMsg.includes("critères de sécurité")
    ) {
      return {
        title: t("errors.validation.title"),
        message: t("errors.validation.password_criteria"),
        type: "validation",
      };
    }

    if (
      errorMsg.includes("prénom requis") ||
      errorMsg.includes("first name required") ||
      errorMsg.includes("nom manquant")
    ) {
      return {
        title: t("errors.validation.title"),
        message: t("errors.validation.first_name_required"),
        type: "validation",
      };
    }

    if (
      errorMsg.includes("nouveau mot de passe ne peut pas être identique") ||
      errorMsg.includes("same password") ||
      errorMsg.includes("password cannot be the same")
    ) {
      return {
        title: t("errors.validation.title"),
        message: t("errors.validation.same_password"),
        type: "validation",
      };
    }

    // Erreurs d'inscription
    if (
      errorMsg.includes("compte existe déjà") ||
      errorMsg.includes("account already exists") ||
      errorMsg.includes("email déjà utilisé")
    ) {
      return {
        title: t("errors.registration.title"),
        message: t("errors.validation.account_exists"),
        type: "validation",
      };
    }

    // Erreurs HTTP
    if (errorMsg.includes("http 400")) {
      return {
        title: t("errors.validation.title"),
        message: t("errors.http.400"),
        type: "validation",
      };
    }

    if (errorMsg.includes("http 403")) {
      return {
        title: t("errors.authentication.title"),
        message: t("errors.http.403"),
        type: "authentication",
      };
    }

    if (errorMsg.includes("http 404")) {
      return {
        title: t("errors.technical.title"),
        message: t("errors.http.404"),
        type: "technical",
      };
    }

    if (errorMsg.includes("http 500")) {
      return {
        title: t("errors.server.title"),
        message: t("errors.http.500"),
        type: "server",
      };
    }

    if (errorMsg.includes("http 503")) {
      return {
        title: t("errors.server.title"),
        message: t("errors.http.503"),
        type: "server",
      };
    }

    // Erreurs de connexion
    if (
      errorMsg.includes("timeout") ||
      errorMsg.includes("abort") ||
      errorMsg.includes("délai d'attente")
    ) {
      return {
        title: t("errors.network.title"),
        message: t("errors.network.timeout"),
        type: "network",
      };
    }

    if (
      errorMsg.includes("network") ||
      errorMsg.includes("fetch") ||
      errorMsg.includes("connexion réseau")
    ) {
      return {
        title: t("errors.network.title"),
        message: t("errors.network.connection_error"),
        type: "network",
      };
    }

    if (
      errorMsg.includes("json") ||
      errorMsg.includes("parse") ||
      errorMsg.includes("invalid json")
    ) {
      return {
        title: t("errors.technical.title"),
        message: t("errors.technical.communication_error"),
        type: "technical",
      };
    }

    // Erreurs spécifiques à l'application
    if (errorMsg.includes("device_id")) {
      return {
        title: t("errors.technical.title"),
        message: t("errors.technical.device_id_error"),
        type: "technical",
      };
    }

    if (errorMsg.includes("subscription") || errorMsg.includes("abonnement")) {
      return {
        title: t("errors.technical.title"),
        message: t("errors.technical.subscription_error"),
        type: "technical",
      };
    }

    if (errorMsg.includes("payment") || errorMsg.includes("paiement")) {
      return {
        title: t("errors.technical.title"),
        message: t("errors.technical.payment_error"),
        type: "technical",
      };
    }

    // Si c'est une erreur API avec un message personnalisé, l'utiliser
    if (
      error.message &&
      !errorMsg.includes("http") &&
      !errorMsg.includes("network")
    ) {
      return {
        title: t("errors.validation.title"),
        message: error.message,
        type: "unknown",
      };
    }

    // Erreur par défaut
    return {
      title: t("errors.validation.title"),
      message: t("errors.unexpected_error"),
      type: "unknown",
    };
  };

  const getErrorMessage = (error: any): string => {
    const errorInfo = analyzeError(error);
    return errorInfo.message;
  };

  const getErrorTitle = (error: any): string => {
    const errorInfo = analyzeError(error);
    return errorInfo.title;
  };

  const getErrorType = (error: any): string => {
    const errorInfo = analyzeError(error);
    return errorInfo.type;
  };

  return {
    analyzeError,
    getErrorMessage,
    getErrorTitle,
    getErrorType,
  };
}

/**
 * Fonctions utilitaires pour utilisation hors des composants React
 * Ces fonctions utilisent les clés de traduction directement
 */
export function getErrorMessageKey(error: any): string {
  if (!error) {
    return "errors.unknown_error";
  }

  const errorMsg = (error.message || "").toLowerCase();

  // Erreurs d'authentification
  if (
    errorMsg.includes("mot de passe incorrect") ||
    errorMsg.includes("password incorrect") ||
    errorMsg.includes("identifiants incorrects") ||
    errorMsg.includes("invalid credentials") ||
    errorMsg.includes("http 401") ||
    errorMsg.includes("unauthorized")
  ) {
    return "errors.authentication.invalid_credentials";
  }

  if (
    errorMsg.includes("utilisateur non trouvé") ||
    errorMsg.includes("user not found") ||
    errorMsg.includes("compte inexistant")
  ) {
    return "errors.authentication.user_not_found";
  }

  if (
    errorMsg.includes("token expiré") ||
    errorMsg.includes("expired token") ||
    errorMsg.includes("session expirée")
  ) {
    return "errors.authentication.session_expired";
  }

  // Erreurs de validation
  if (
    errorMsg.includes("email requis") ||
    errorMsg.includes("email required") ||
    errorMsg.includes("email manquant")
  ) {
    return "errors.validation.email_required";
  }

  if (
    errorMsg.includes("mot de passe requis") ||
    errorMsg.includes("password required") ||
    errorMsg.includes("mot de passe manquant")
  ) {
    return "errors.validation.password_required";
  }

  if (
    errorMsg.includes("email invalide") ||
    errorMsg.includes("invalid email") ||
    errorMsg.includes("format email")
  ) {
    return "errors.validation.invalid_email";
  }

  if (
    errorMsg.includes("mot de passe doit contenir") ||
    errorMsg.includes("password must contain") ||
    errorMsg.includes("critères de sécurité")
  ) {
    return "errors.validation.password_criteria";
  }

  if (
    errorMsg.includes("prénom requis") ||
    errorMsg.includes("first name required") ||
    errorMsg.includes("nom manquant")
  ) {
    return "errors.validation.first_name_required";
  }

  if (
    errorMsg.includes("nouveau mot de passe ne peut pas être identique") ||
    errorMsg.includes("same password") ||
    errorMsg.includes("password cannot be the same")
  ) {
    return "errors.validation.same_password";
  }

  // Erreurs d'inscription
  if (
    errorMsg.includes("compte existe déjà") ||
    errorMsg.includes("account already exists") ||
    errorMsg.includes("email déjà utilisé")
  ) {
    return "errors.validation.account_exists";
  }

  // Erreurs HTTP
  if (errorMsg.includes("http 400")) {
    return "errors.http.400";
  }

  if (errorMsg.includes("http 403")) {
    return "errors.http.403";
  }

  if (errorMsg.includes("http 404")) {
    return "errors.http.404";
  }

  if (errorMsg.includes("http 500")) {
    return "errors.http.500";
  }

  if (errorMsg.includes("http 503")) {
    return "errors.http.503";
  }

  // Erreurs de connexion
  if (
    errorMsg.includes("timeout") ||
    errorMsg.includes("abort") ||
    errorMsg.includes("délai d'attente")
  ) {
    return "errors.network.timeout";
  }

  if (
    errorMsg.includes("network") ||
    errorMsg.includes("fetch") ||
    errorMsg.includes("connexion réseau")
  ) {
    return "errors.network.connection_error";
  }

  if (
    errorMsg.includes("json") ||
    errorMsg.includes("parse") ||
    errorMsg.includes("invalid json")
  ) {
    return "errors.technical.communication_error";
  }

  // Erreurs spécifiques à l'application
  if (errorMsg.includes("device_id")) {
    return "errors.technical.device_id_error";
  }

  if (errorMsg.includes("subscription") || errorMsg.includes("abonnement")) {
    return "errors.technical.subscription_error";
  }

  if (errorMsg.includes("payment") || errorMsg.includes("paiement")) {
    return "errors.technical.payment_error";
  }

  // Si c'est une erreur API avec un message personnalisé, l'utiliser
  if (
    error.message &&
    !errorMsg.includes("http") &&
    !errorMsg.includes("network")
  ) {
    return error.message; // Retourner le message original
  }

  // Erreur par défaut
  return "errors.unexpected_error";
}

export function getErrorTitleKey(error: any): string {
  if (!error) {
    return "errors.validation.title";
  }

  const errorMsg = (error.message || "").toLowerCase();

  // Erreurs d'authentification
  if (
    errorMsg.includes("mot de passe incorrect") ||
    errorMsg.includes("password incorrect") ||
    errorMsg.includes("identifiants incorrects") ||
    errorMsg.includes("invalid credentials") ||
    errorMsg.includes("http 401") ||
    errorMsg.includes("unauthorized") ||
    errorMsg.includes("utilisateur non trouvé") ||
    errorMsg.includes("user not found") ||
    errorMsg.includes("compte inexistant") ||
    errorMsg.includes("token expiré") ||
    errorMsg.includes("expired token") ||
    errorMsg.includes("session expirée") ||
    errorMsg.includes("http 403")
  ) {
    return "errors.authentication.title";
  }

  // Erreurs de validation
  if (
    errorMsg.includes("email requis") ||
    errorMsg.includes("email required") ||
    errorMsg.includes("email manquant") ||
    errorMsg.includes("mot de passe requis") ||
    errorMsg.includes("password required") ||
    errorMsg.includes("mot de passe manquant") ||
    errorMsg.includes("email invalide") ||
    errorMsg.includes("invalid email") ||
    errorMsg.includes("format email") ||
    errorMsg.includes("mot de passe doit contenir") ||
    errorMsg.includes("password must contain") ||
    errorMsg.includes("critères de sécurité") ||
    errorMsg.includes("prénom requis") ||
    errorMsg.includes("first name required") ||
    errorMsg.includes("nom manquant") ||
    errorMsg.includes("nouveau mot de passe ne peut pas être identique") ||
    errorMsg.includes("same password") ||
    errorMsg.includes("password cannot be the same") ||
    errorMsg.includes("compte existe déjà") ||
    errorMsg.includes("account already exists") ||
    errorMsg.includes("email déjà utilisé") ||
    errorMsg.includes("http 400")
  ) {
    return "errors.validation.title";
  }

  // Erreurs d'inscription
  if (
    errorMsg.includes("compte existe déjà") ||
    errorMsg.includes("account already exists") ||
    errorMsg.includes("email déjà utilisé")
  ) {
    return "errors.registration.title";
  }

  // Erreurs réseau
  if (
    errorMsg.includes("timeout") ||
    errorMsg.includes("abort") ||
    errorMsg.includes("délai d'attente") ||
    errorMsg.includes("network") ||
    errorMsg.includes("fetch") ||
    errorMsg.includes("connexion réseau")
  ) {
    return "errors.network.title";
  }

  // Erreurs serveur
  if (errorMsg.includes("http 500") || errorMsg.includes("http 503")) {
    return "errors.server.title";
  }

  // Erreurs techniques
  if (
    errorMsg.includes("json") ||
    errorMsg.includes("parse") ||
    errorMsg.includes("invalid json") ||
    errorMsg.includes("device_id") ||
    errorMsg.includes("subscription") ||
    errorMsg.includes("abonnement") ||
    errorMsg.includes("payment") ||
    errorMsg.includes("paiement") ||
    errorMsg.includes("http 404")
  ) {
    return "errors.technical.title";
  }

  // Par défaut
  return "errors.validation.title";
}
