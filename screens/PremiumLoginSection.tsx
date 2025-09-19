import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Animated,
  ScrollView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../utils/apiClient";
import { usePremium } from "../contexts/PremiumContext";
import { LinearGradient } from "expo-linear-gradient";
import { useErrorHandler } from "../utils/errorHandler";

interface PremiumLoginSectionProps {
  activatePremium: (
    type: "monthly" | "yearly" | "family",
    subscriptionId: string
  ) => Promise<void>;
  styles: any;
  showToast: (toast: {
    type: "success" | "error" | "info";
    title: string;
    message: string;
  }) => void;
  t: any;
  onLoginSuccess?: (userData: any) => void;
  currentTheme?: "light" | "dark";
  // Nouveau: contrôle d'ouverture de la modale premium existante
  onOpenPremiumModal?: () => void;
  // Nouveau: indique si le composant est rendu DANS la modale
  isInModal?: boolean;
}

const PremiumLoginSection: React.FC<PremiumLoginSectionProps> = ({
  activatePremium,
  styles,
  showToast,
  t,
  onLoginSuccess,
  currentTheme = "dark",
  onOpenPremiumModal,
  isInModal = false,
}) => {
  // Couleurs dynamiques selon le thème
  const isDarkTheme = currentTheme === "dark";
  const textPrimaryColor = isDarkTheme ? "#F1F5F9" : "#1A1A1A"; // Slate-50 vs noir
  const textSecondaryColor = isDarkTheme ? "#CBD5E1" : "#666666"; // Slate-300 vs gris
  const { user: premiumUser, forceLogout, checkPremiumStatus } = usePremium();
  const { getErrorTitle, getErrorMessage } = useErrorHandler();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // 🚀 NOUVEAU : Champ mot de passe
  const [firstName, setFirstName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [hasCheckedUser, setHasCheckedUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailValid, setEmailValid] = useState(false);
  const [firstNameValid, setFirstNameValid] = useState(false);
  // Variables d'état pour la validation (supprimées car non utilisées actuellement)

  // 🚀 NOUVEAU : Toast local pour la modal
  const [localToast, setLocalToast] = useState<{
    visible: boolean;
    type: "success" | "error" | "info";
    title: string;
    message: string;
  } | null>(null);
  const toastTranslateY = useRef(new Animated.Value(-100)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // 🚀 SUPPRIMÉ : État ThemedAlert local - maintenant géré par le parent

  // 🚀 SUPPRIMÉ : État pour la modal de gestion de compte - maintenant Alert.alert

  // 🚀 NOUVEAU : Validation en temps réel
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // 🚀 AMÉLIORÉ : Validation détaillée du mot de passe (alignée avec le serveur)
  const validatePassword = (password: string) => {
    const trimmedPassword = password.trim();
    // Exigences : 8-50 caractères, minuscule, majuscule, chiffre, caractère spécial
    return (
      trimmedPassword.length >= 8 &&
      /[a-z]/.test(trimmedPassword) &&
      /[A-Z]/.test(trimmedPassword) &&
      /\d/.test(trimmedPassword) &&
      /[!@#$%^&*(),.?":{}|<>]/.test(trimmedPassword) &&
      trimmedPassword.length <= 50
    );
  };

  // 🚀 NOUVEAU : Validation visuelle pour l'affichage des indicateurs
  const isPasswordVisuallyValid = (password: string) => {
    const trimmedPassword = password.trim();
    // Le mot de passe est visuellement valide seulement si TOUS les critères sont respectés
    return (
      trimmedPassword.length >= 8 &&
      /[a-z]/.test(trimmedPassword) &&
      /[A-Z]/.test(trimmedPassword) &&
      /\d/.test(trimmedPassword) &&
      /[!@#$%^&*(),.?":{}|<>]/.test(trimmedPassword) &&
      trimmedPassword.length <= 50
    );
  };

  // 🚀 NOUVEAU : Validation détaillée pour afficher les critères (alignée avec le serveur)
  const getPasswordValidationDetails = (password: string) => {
    const trimmedPassword = password.trim();
    return {
      length: trimmedPassword.length >= 8 && trimmedPassword.length <= 50,
      hasLowercase: /[a-z]/.test(trimmedPassword),
      hasUppercase: /[A-Z]/.test(trimmedPassword),
      hasNumbers: /\d/.test(trimmedPassword),
      hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(trimmedPassword),
      minLength: trimmedPassword.length >= 8,
      maxLength: trimmedPassword.length <= 50,
    };
  };

  const validateFirstName = (firstName: string) => {
    return firstName.trim().length >= 2 && firstName.trim().length <= 30;
  };

  const getInputStyle = (value: string, isValid: boolean) => {
    if (!value.trim()) return null; // Pas de style si vide
    return isValid
      ? localStyles.inputContainerValid
      : localStyles.inputContainerInvalid;
  };

  const getIconColor = (value: string, isValid: boolean) => {
    if (!value.trim()) return "#666"; // Gris par défaut
    return isValid ? "#4CAF50" : "#F44336"; // Vert si valide, rouge si invalide
  };

  // 🚀 NOUVEAU : Refs pour gérer le focus des champs
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const firstNameRef = useRef<TextInput>(null);

  const hideLocalToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(toastTranslateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setLocalToast(null);
    });
  }, [toastTranslateY, toastOpacity]);

  // 🚀 NOUVEAU : Fonction locale pour afficher le toast (dans la modal)
  const showLocalToast = useCallback(
    (toast: {
      type: "success" | "error" | "info";
      title: string;
      message: string;
    }) => {
      setLocalToast({
        visible: true,
        ...toast,
      });

      // Animation d'entrée
      Animated.parallel([
        Animated.timing(toastTranslateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(toastOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide après 3 secondes
      setTimeout(() => {
        hideLocalToast();
      }, 3000);
    },
    [toastTranslateY, toastOpacity, hideLocalToast]
  );

  // 🚀 NOUVEAU : Vérifier si l'utilisateur est déjà connecté au démarrage
  useEffect(() => {
    if (hasCheckedUser) return;

    const checkExistingUser = async () => {
      try {
        // 🚀 NOUVEAU : Mode professionnel - vérifier si connexion explicite existe
        const explicitConnection = await AsyncStorage.getItem(
          "explicit_connection"
        );
        const userDataString = await AsyncStorage.getItem("user_data");

        if (explicitConnection === "true" && userDataString) {
          // Utilisateur connecté explicitement - charger les données
          let userData: any = null;
          try {
            userData = JSON.parse(userDataString);
          } catch {
            userData = null;
          }
          if (!userData) {
            setHasCheckedUser(true);
            return;
          }
          console.log(
            "🔍 [DEBUG] Mode professionnel - connexion explicite détectée, chargement des données"
          );
          setIsConnected(true);
          setUserData(userData);

          // Notifier le parent de manière asynchrone
          if (onLoginSuccess) {
            setTimeout(() => {
              onLoginSuccess(userData);
            }, 100);
          }
        } else {
          console.log(
            "🔍 [DEBUG] Mode professionnel - pas de connexion automatique"
          );
        }

        setHasCheckedUser(true);
      } catch (error) {
        console.error("Erreur vérification utilisateur existant:", error);
        setHasCheckedUser(true);
      }
    };

    checkExistingUser();
  }, [hasCheckedUser, onLoginSuccess]);

  // 🔄 NOUVEAU : Listener pour détecter les changements de connexion en temps réel
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    const pollConnectionStatus = async () => {
      try {
        const explicitConnection = await AsyncStorage.getItem(
          "explicit_connection"
        );
        const userDataString = await AsyncStorage.getItem("user_data");

        const shouldBeConnected =
          explicitConnection === "true" && userDataString;

        // 🎯 Si le statut a changé, mettre à jour l'interface
        if (shouldBeConnected && !isConnected) {
          console.log(
            "🔄 [LISTENER] Auto-connexion détectée - mise à jour de l'interface"
          );
          let userData: any = null;
          try {
            userData = JSON.parse(userDataString);
          } catch {
            userData = null;
          }
          if (!userData) return;
          setIsConnected(true);
          setUserData(userData);

          if (onLoginSuccess) {
            onLoginSuccess(userData);
          }
        } else if (!shouldBeConnected && isConnected) {
          console.log(
            "🔄 [LISTENER] Déconnexion détectée - mise à jour de l'interface"
          );
          setIsConnected(false);
          setUserData(null);

          if (onLoginSuccess) {
            onLoginSuccess(null);
          }
        }
      } catch (error) {
        console.error("Erreur polling connexion:", error);
      }
    };

    // Réduire la fréquence pour économiser la batterie
    interval = setInterval(pollConnectionStatus, 5000);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isConnected, onLoginSuccess]);

  // 🚀 NOUVEAU : Mode professionnel - pas de chargement automatique du prénom
  // L'utilisateur doit saisir son prénom manuellement à chaque fois
  useEffect(() => {
    console.log(
      "🔍 [DEBUG] Mode professionnel - pas de chargement automatique du prénom"
    );
    // Pas de chargement automatique en mode professionnel
  }, [isLogin]);

  // 🚀 NOUVEAU : Validation en temps réel pour s'assurer que les états sont toujours à jour
  useEffect(() => {
    setEmailValid(validateEmail(email));
  }, [email]);

  // Pas de state dédié pour le mot de passe: validation calculée à l'affichage

  useEffect(() => {
    setFirstNameValid(validateFirstName(firstName));
  }, [firstName]);

  // Synchroniser l'UI avec l'état global Premium (pour que la section se mette à jour automatiquement)
  useEffect(() => {
    const syncFromContext = async () => {
      try {
        if (premiumUser?.isPremium) {
          setIsConnected(true);
          // Charger les infos utilisateur affichables
          const userDataString = await AsyncStorage.getItem("user_data");
          if (userDataString) {
            try {
              setUserData(JSON.parse(userDataString));
            } catch {
              setUserData(null);
            }
          }
        } else {
          setIsConnected(false);
          setUserData(null);
        }
      } catch {
        // noop
      } finally {
        setHasCheckedUser(true);
      }
    };
    syncFromContext();
  }, [premiumUser?.isPremium]);

  // 🚀 NOUVEAU : Mode professionnel - synchronisation EXPLICITE seulement
  // L'utilisateur doit être explicitement connecté pour synchroniser des données
  const syncUserDataToLocal = useCallback(async (userData: any) => {
    try {
      // 🚀 NOUVEAU : Mode professionnel - synchronisation explicite autorisée
      // Marquer cette connexion comme explicite pour autoriser les backups
      console.log(
        "🔍 [DEBUG] Mode professionnel - synchronisation explicite autorisée"
      );

      // Sauvegarder les données utilisateur dans AsyncStorage
      const userDataToStore = {
        id: userData.id,
        user_id: userData.id,
        email: userData.email,
        user_first_name: userData.user_first_name,
        premium_status: userData.premium_status,
        subscription_type: userData.subscription_type,
        subscription_id: userData.subscription_id,
        premium_expiry: userData.premium_expiry,
        premium_activated_at: userData.premium_activated_at, // 🔑 AJOUT MANQUANT !
        language: userData.language,
        last_sync: new Date().toISOString(),
        device_id: userData.device_id,
      };

      // Sauvegarder dans AsyncStorage
      await AsyncStorage.setItem("user_data", JSON.stringify(userDataToStore));

      // 🚀 NOUVEAU : Marquer comme connexion explicite pour autoriser les backups
      await AsyncStorage.setItem("explicit_connection", "true");

      console.log(
        "✅ [DEBUG] Données utilisateur synchronisées avec connexion explicite"
      );
    } catch (error) {
      console.error("❌ Erreur synchronisation données:", error);
    }
  }, []);

  const handleAuthenticationWithValues = useCallback(
    async (
      currentEmail: string,
      currentPassword: string,
      currentFirstName: string
    ) => {
      if (isLogin) {
        if (!currentEmail) {
          showLocalToast({
            type: "error",
            title: t("toast_error"),
            message: t("toast_validation_email_required"),
          });
          return;
        }
        if (!currentPassword) {
          showLocalToast({
            type: "error",
            title: t("toast_error"),
            message: t("toast_validation_password_required"),
          });
          return;
        }
      } else {
        // Inscription - Validation des champs
        if (!currentEmail || !currentPassword || !currentFirstName) {
          Alert.alert(
            t("toast_error"),
            t("toast_validation_email_password_required")
          );
          return;
        }

        // Validation en temps réel des champs
        const isEmailValid = validateEmail(currentEmail);
        const isFirstNameValid = validateFirstName(currentFirstName);
        const isPasswordValid = validatePassword(currentPassword);

        if (!isEmailValid) {
          Alert.alert(t("toast_error"), t("toast_validation_email_invalid"));
          return;
        }

        if (!isFirstNameValid) {
          Alert.alert(
            t("toast_error"),
            t("toast_validation_firstname_required")
          );
          return;
        }

        if (!isPasswordValid) {
          Alert.alert(t("toast_error"), t("toast_validation_password_invalid"));
          return;
        }
      }

      setIsLoading(true);
      try {
        let result;

        if (isLogin) {
          // Connexion avec email et mot de passe
          result = await apiClient.loginWithCredentials({
            email: currentEmail,
            password: currentPassword,
          });

          if (result.success && result.data) {
            const userData = result.data.user || result.data;
            // Stocker le token si présent pour Authorization
            try {
              const token =
                (result as any)?.data?.token ||
                (result as any)?.token ||
                (userData as any)?.token;
              if (token) {
                await AsyncStorage.setItem("auth_token", token);
              }
              const refreshToken =
                (result as any)?.data?.refresh_token ||
                (result as any)?.refresh_token;
              if (refreshToken) {
                await AsyncStorage.setItem("refresh_token", refreshToken);
              }
            } catch {}
            setUserData(userData);
            setIsConnected(true);

            // Synchroniser les données utilisateur
            await syncUserDataToLocal(userData);

            // 🚀 NOUVEAU : Forcer la recharge du PremiumContext après login
            await checkPremiumStatus();

            // Utiliser le toast global pour garantir l'affichage même après re-render en mode connecté
            showToast({
              type: "success",
              title: t("toast_success"),
              message: t("toast_login_success"),
            });

            if (onLoginSuccess) {
              onLoginSuccess(userData);
            }
          } else {
            showLocalToast({
              type: "error",
              title: t("toast_error"),
              message: result.message || t("toast_login_failed"),
            });
          }
        } else {
          // 🔄 NOUVEAU : Inscription intelligente - Gérer les renouvellements
          try {
            console.log("🔍 Vérification existence email:", currentEmail);
            const checkResult = await apiClient.checkEmailExists(currentEmail);
            console.log("🔍 Résultat vérification email:", checkResult);

            if (checkResult.data && checkResult.data.exists === true) {
              console.log(
                "🔍 Email existe déjà - Vérifier le statut premium..."
              );

              // 🎯 Vérifier si l'utilisateur a un premium actif ou s'il peut renouveler
              try {
                const userResult = await apiClient.getUserByEmail(currentEmail);

                if (userResult.success && userResult.data) {
                  const userData = userResult.data;

                  // 🚀 Si l'utilisateur est premium ET actif, bloquer
                  if (userData.premium_active === true) {
                    showLocalToast({
                      type: "info",
                      title: t("toast_already_premium"),
                      message: t(
                        "toast_already_premium_message",
                        "Vous avez déjà un abonnement premium actif. Connectez-vous pour accéder à vos fonctionnalités."
                      ),
                    });
                    setIsLoading(false);
                    return;
                  }

                  // 🔄 Si l'utilisateur existe mais premium expiré/inactif, permettre le renouvellement
                  if (
                    userData.premium_active === false ||
                    userData.premium_status === 0
                  ) {
                    console.log(
                      "✅ Utilisateur existant avec premium expiré - Permettre le renouvellement"
                    );
                    showLocalToast({
                      type: "info",
                      title: t("toast_renewal_detected"),
                      message: t(
                        "toast_renewal_detected_message",
                        "Compte existant détecté. Votre abonnement sera renouvelé."
                      ),
                    });
                    // Continuer vers le paiement pour renouvellement
                  } else {
                    // 🔄 Cas par défaut - demander de se connecter
                    showLocalToast({
                      type: "info",
                      title: t("toast_account_exists"),
                      message: t(
                        "toast_account_exists_message",
                        "Un compte existe avec cet email. Connectez-vous pour gérer votre abonnement."
                      ),
                    });
                    setIsLoading(false);
                    return;
                  }
                } else {
                  // API ne trouve pas l'utilisateur, continuer normalement
                  console.log(
                    "🔍 Utilisateur non trouvé via API - Continuer l'inscription"
                  );
                }
              } catch (userCheckError) {
                // Erreur lors de la vérification utilisateur - demander confirmation
                console.log(
                  "⚠️ Erreur vérification utilisateur:",
                  userCheckError
                );

                // Demander confirmation à l'utilisateur
                Alert.alert(
                  "Vérification impossible",
                  "Impossible de vérifier si un compte existe déjà avec cet email. Voulez-vous continuer quand même ? (Si vous avez déjà un compte, connectez-vous plutôt)",
                  [
                    {
                      text: "Annuler",
                      style: "cancel",
                      onPress: () => setIsLoading(false),
                    },
                    {
                      text: "Continuer",
                      onPress: () => {
                        // Continuer vers paiement
                        console.log("✅ Utilisateur confirme la continuation");
                      },
                    },
                  ]
                );
                setIsLoading(false);
                return;
              }
            }

            // Email libre OU renouvellement autorisé - redirection vers paiement
            console.log("✅ Redirection vers paiement autorisée");

            // Stocker temporairement les données d'inscription
            const registrationData = {
              email: currentEmail,
              password: currentPassword,
              user_first_name: currentFirstName,
              language: "fr",
            };
            console.log(
              "💾 Stockage des données d'inscription:",
              registrationData
            );
            await AsyncStorage.setItem(
              "pending_registration",
              JSON.stringify(registrationData)
            );

            // Rediriger vers la page de paiement
            const { router } = await import("expo-router");
            router.push("/premium-payment");
            setIsLoading(false);
            return;
          } catch (emailCheckError: any) {
            console.error("❌ Erreur vérification email:", emailCheckError);
            // Ne pas bloquer l'inscription si le check échoue : laisser poursuivre
          }
        }
      } catch (error: any) {
        console.error("❌ Erreur authentification:", error);

        // 🚀 NOUVEAU : Utiliser le gestionnaire d'erreurs centralisé
        const errorTitle = getErrorTitle(error);
        const errorMessage = getErrorMessage(error);

        showLocalToast({
          type: "error",
          title: errorTitle,
          message: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [
      isLogin,
      t,
      showLocalToast,
      showToast,
      onLoginSuccess,
      syncUserDataToLocal,
      checkPremiumStatus,
    ]
  );

  // 🚀 NOUVEAU : Fonction de déconnexion optimisée
  const handleLogout = useCallback(async () => {
    try {
      // 🚀 NOUVEAU : Utiliser forceLogout pour tout nettoyer
      await forceLogout();

      // Réinitialiser l'état local
      setIsConnected(false);
      setUserData(null);
      setEmail("");
      setPassword("");
      setFirstName("");
      setHasCheckedUser(false);

      // 🚀 CORRECTION : Utiliser le toast global pour la déconnexion
      showToast({
        type: "success",
        title: "Déconnexion",
        message: "Vous avez été déconnecté avec succès",
      });

      // Notifier le parent
      if (onLoginSuccess) {
        onLoginSuccess(null);
      }
    } catch (error) {
      console.error("Erreur déconnexion:", error);
      showToast({
        type: "error",
        title: "Erreur",
        message: "Erreur lors de la déconnexion",
      });
    }
  }, [onLoginSuccess, showToast, forceLogout]);

  // 🚀 SUPPRIMÉ : Fonction handleTestMode supprimée car elle embrouille la logique

  // 🚀 NOUVEAU : Interface connecté
  console.log(
    "🎯 [DEBUG] État actuel - isConnected:",
    isConnected,
    "userData:",
    userData ? "présent" : "null"
  );
  if (isConnected && userData) {
    return (
      <View style={[localStyles.container, { minHeight: 300 }]}>
        <View style={localStyles.connectedHeader}>
          <MaterialCommunityIcons
            name="account-check"
            size={24}
            color="#4CAF50"
          />
          <Text
            style={[localStyles.connectedTitle, { color: textPrimaryColor }]}
          >
            Compte connecté
          </Text>
        </View>

        <View style={localStyles.userInfo}>
          <Text style={[localStyles.userName, { color: textPrimaryColor }]}>
            {userData.user_first_name || "Utilisateur"}
          </Text>
          <Text style={[localStyles.userEmail, { color: textSecondaryColor }]}>
            {userData.email || "Aucun email"}
          </Text>
          <Text style={[localStyles.userStatus, { color: textSecondaryColor }]}>
            Statut: Premium
          </Text>
        </View>

        <TouchableOpacity
          style={[localStyles.logoutButton, styles?.logoutButton]}
          onPress={handleLogout}
        >
          <MaterialCommunityIcons name="logout" size={20} color="#FF6B6B" />
          <Text style={localStyles.logoutButtonText}>Se déconnecter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[localStyles.manageAccountButton, styles?.manageAccountButton]}
          onPress={() => {
            // 🚀 TEST : D'abord essayer un simple Alert
            console.log("🔍 [DEBUG] Bouton 'Gérer le compte' cliqué");

            // 🚀 SOLUTION : Utiliser ThemedAlert au lieu de Modal React Native
            Alert.alert(
              "👤 Gestion du compte",
              "Voulez-vous ouvrir la gestion de votre compte ? (Version temporaire avec Alert)",
              [
                {
                  text: "❌ Annuler",
                  style: "cancel",
                  onPress: () => {},
                },
                {
                  text: "✅ Ouvrir",
                  onPress: () => {
                    // Temporairement, rediriger vers la section "À propos"
                    // qui a déjà la gestion de compte qui fonctionne
                    showToast({
                      type: "info",
                      title: "Redirection",
                      message:
                        "Allez dans À propos > Gérer le compte pour l'instant",
                    });
                  },
                },
              ]
            );
          }}
        >
          <MaterialCommunityIcons
            name="account-cog"
            size={20}
            color="#4CAF50"
          />
          <Text style={localStyles.manageAccountButtonText}>
            Gérer le compte
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Interface non connecté
  if (!isInModal) {
    // Mode section: afficher uniquement un bouton qui ouvre la modale premium existante
    return (
      <View style={localStyles.container}>
        <View style={localStyles.ctaWrapper}>
          <TouchableOpacity
            style={localStyles.sectionCtaButton}
            onPress={() => onOpenPremiumModal && onOpenPremiumModal()}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="account" size={20} color="#FFF" />
                <Text style={localStyles.sectionCtaButtonText}>
                  Ouvrir la connexion / inscription
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Mode modal: afficher le formulaire complet
  return (
    <View style={[localStyles.container, { minHeight: isLogin ? 400 : 630 }]}>
      <ScrollView
        style={localStyles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={localStyles.scrollContent}
      >
        {/* Toggle connexion/inscription */}
        <View style={localStyles.toggleContainer}>
          <TouchableOpacity
            style={[
              localStyles.toggleButton,
              isLogin && localStyles.toggleButtonActive,
            ]}
            onPress={async () => {
              setIsLogin(true);
              // Vider le champ prénom en mode connexion
              setFirstName("");
            }}
          >
            <View style={localStyles.signupTabContent}>
              <Text
                style={[
                  localStyles.toggleText,
                  isLogin && localStyles.toggleTextActive,
                ]}
              >
                {t("premium_ui.login_tab", "Connexion")}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              localStyles.toggleButton,
              !isLogin && localStyles.toggleButtonActive,
            ]}
            onPress={async () => {
              setIsLogin(false);
              // Charger le prénom existant en mode inscription
              try {
                const existingFirstName = await AsyncStorage.getItem(
                  "userFirstName"
                );
                if (existingFirstName) {
                  setFirstName(existingFirstName);
                  setFirstNameValid(validateFirstName(existingFirstName));
                  // console.log(
                  //  "✅ Prénom existant chargé lors du basculement:",
                  //  existingFirstName
                  //);
                } else {
                  setFirstName("");
                }
              } catch (error) {
                console.error(
                  "Erreur chargement prénom existant lors du basculement:",
                  error
                );
                setFirstName("");
              }
            }}
          >
            <View style={localStyles.signupTabContent}>
              <View style={localStyles.premiumBadge}>
                <Text style={localStyles.premiumBadgeText}>
                  👑 {t("premium_ui.badge", "Premium")}
                </Text>
              </View>
              <Text
                style={[
                  localStyles.toggleText,
                  !isLogin && localStyles.toggleTextActive,
                ]}
              >
                {t("premium_ui.signup_tab", "Créer un compte Premium")}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Encart d'information (visible uniquement en mode inscription) */}
        {!isLogin && (
          <View style={localStyles.signupInfoCard}>
            <MaterialCommunityIcons name="information" size={18} color="#0B5" />
            <View style={{ flex: 1 }}>
              <Text style={localStyles.signupInfoText}>
                {t(
                  "premium_ui.signup_info_line1",
                  "La création de compte nécessite un abonnement Premium. Votre compte sera créé automatiquement après le paiement."
                )}
              </Text>
              <Text style={localStyles.signupInfoTextSecondary}>
                {t(
                  "premium_ui.signup_info_line2",
                  "Déjà abonné(e) ? Connectez‑vous avec le même email."
                )}
              </Text>
            </View>
          </View>
        )}

        {/* Champs de saisie */}
        {!isLogin && (
          <View
            style={[
              localStyles.inputContainer,
              getInputStyle(firstName, firstNameValid),
            ]}
          >
            <MaterialCommunityIcons
              name="account"
              size={20}
              color={getIconColor(firstName, firstNameValid)}
              style={localStyles.inputIcon}
            />
            <TextInput
              ref={firstNameRef}
              style={localStyles.input}
              placeholder={
                firstName
                  ? t("auth_modal.firstname_placeholder_prefilled")
                  : t("auth_modal.firstname_placeholder_empty")
              }
              value={firstName}
              onChangeText={(text) => {
                setFirstName(text);
              }}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={localStyles.infoIcon}
              onPress={() =>
                Alert.alert(
                  t("toast_help_firstname_title"),
                  firstName
                    ? t("toast_help_firstname_prefilled")
                    : t("toast_help_firstname_empty"),
                  [
                    {
                      text: "OK",
                      onPress: () => {},
                    },
                  ]
                )
              }
            >
              <MaterialCommunityIcons
                name={firstName ? "account-check" : "information-outline"}
                size={16}
                color={firstName ? "#4CAF50" : "#666"}
              />
            </TouchableOpacity>
          </View>
        )}

        <View
          style={[localStyles.inputContainer, getInputStyle(email, emailValid)]}
        >
          <MaterialCommunityIcons
            name="email"
            size={20}
            color={getIconColor(email, emailValid)}
            style={localStyles.inputIcon}
          />
          <TextInput
            ref={emailRef}
            style={localStyles.input}
            placeholder={t("auth_modal.email_placeholder_text")}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isLoading}
          />
          <TouchableOpacity
            style={localStyles.infoIcon}
            onPress={() =>
              Alert.alert(
                t("toast_help_email_title"),
                t("toast_help_email_content"),
                [
                  {
                    text: "OK",
                    onPress: () => {},
                  },
                ]
              )
            }
          >
            <MaterialCommunityIcons
              name="information-outline"
              size={16}
              color="#666"
            />
          </TouchableOpacity>
        </View>

        {/* 🚀 NOUVEAU : Champ mot de passe (après l'email) */}
        <View
          style={[
            localStyles.inputContainer,
            getInputStyle(password, isPasswordVisuallyValid(password)),
          ]}
        >
          <MaterialCommunityIcons
            name="lock"
            size={20}
            color={getIconColor(password, isPasswordVisuallyValid(password))}
            style={localStyles.inputIcon}
          />
          <TextInput
            ref={passwordRef}
            style={localStyles.input}
            placeholder={t("auth_modal.password_placeholder_text")}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
            }}
            onBlur={() => {}}
            onSubmitEditing={() => {
              // Optionnel : passer au champ suivant ou soumettre
              handleAuthenticationWithValues(
                email.trim(),
                password.trim(),
                firstName.trim()
              );
            }}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            editable={!isLoading}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={localStyles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <MaterialCommunityIcons
              name={showPassword ? "eye" : "eye-off"}
              size={20}
              color={getIconColor(password, isPasswordVisuallyValid(password))}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={localStyles.infoIcon}
            onPress={() =>
              Alert.alert(
                t("toast_help_password_title"),
                t("toast_help_password_content"),
                [
                  {
                    text: "OK",
                    onPress: () => {},
                  },
                ]
              )
            }
          >
            <MaterialCommunityIcons
              name="information-outline"
              size={16}
              color="#666"
            />
          </TouchableOpacity>
        </View>

        {/* 🚀 NOUVEAU : Indicateurs de validation du mot de passe (seulement en mode inscription) */}
        {!isLogin && password.length > 0 && (
          <View style={localStyles.passwordValidationContainer}>
            <Text style={localStyles.passwordValidationTitle}>
              {t("auth_modal.password_criteria_title")} :
            </Text>
            {(() => {
              const validation = getPasswordValidationDetails(password);
              return (
                <>
                  <View style={localStyles.validationItem}>
                    <MaterialCommunityIcons
                      name={
                        validation.minLength ? "check-circle" : "circle-outline"
                      }
                      size={16}
                      color={validation.minLength ? "#4CAF50" : "#666"}
                    />
                    <Text
                      style={[
                        localStyles.validationText,
                        validation.minLength && localStyles.validationTextValid,
                      ]}
                    >
                      {t("auth_modal.password_min_length")}
                    </Text>
                  </View>
                  <View style={localStyles.validationItem}>
                    <MaterialCommunityIcons
                      name={
                        validation.maxLength ? "check-circle" : "circle-outline"
                      }
                      size={16}
                      color={validation.maxLength ? "#4CAF50" : "#666"}
                    />
                    <Text
                      style={[
                        localStyles.validationText,
                        validation.maxLength && localStyles.validationTextValid,
                      ]}
                    >
                      Maximum 50 caractères
                    </Text>
                  </View>
                  <View style={localStyles.validationItem}>
                    <MaterialCommunityIcons
                      name={
                        validation.hasLowercase
                          ? "check-circle"
                          : "circle-outline"
                      }
                      size={16}
                      color={validation.hasLowercase ? "#4CAF50" : "#666"}
                    />
                    <Text
                      style={[
                        localStyles.validationText,
                        validation.hasLowercase &&
                          localStyles.validationTextValid,
                      ]}
                    >
                      Contient une minuscule
                    </Text>
                  </View>
                  <View style={localStyles.validationItem}>
                    <MaterialCommunityIcons
                      name={
                        validation.hasUppercase
                          ? "check-circle"
                          : "circle-outline"
                      }
                      size={16}
                      color={validation.hasUppercase ? "#4CAF50" : "#666"}
                    />
                    <Text
                      style={[
                        localStyles.validationText,
                        validation.hasUppercase &&
                          localStyles.validationTextValid,
                      ]}
                    >
                      Contient une majuscule
                    </Text>
                  </View>
                  <View style={localStyles.validationItem}>
                    <MaterialCommunityIcons
                      name={
                        validation.hasNumbers
                          ? "check-circle"
                          : "circle-outline"
                      }
                      size={16}
                      color={validation.hasNumbers ? "#4CAF50" : "#666"}
                    />
                    <Text
                      style={[
                        localStyles.validationText,
                        validation.hasNumbers &&
                          localStyles.validationTextValid,
                      ]}
                    >
                      Contient des chiffres
                    </Text>
                  </View>
                  <View style={localStyles.validationItem}>
                    <MaterialCommunityIcons
                      name={
                        validation.hasSpecialChars
                          ? "check-circle"
                          : "circle-outline"
                      }
                      size={16}
                      color={validation.hasSpecialChars ? "#4CAF50" : "#666"}
                    />
                    <Text
                      style={[
                        localStyles.validationText,
                        validation.hasSpecialChars &&
                          localStyles.validationTextValid,
                      ]}
                    >
                      Contient des caractères spéciaux
                    </Text>
                  </View>
                </>
              );
            })()}
          </View>
        )}

        {/* Bouton principal */}
        <TouchableOpacity
          style={[
            localStyles.authButton,
            isLoading && localStyles.authButtonDisabled,
          ]}
          onPress={() => {
            // Validation directe des valeurs actuelles, pas des états
            const currentEmail = email.trim();
            const currentPassword = password.trim();
            const currentFirstName = firstName.trim();

            // Mettre à jour les états de validation pour l'affichage
            setEmailValid(validateEmail(currentEmail));
            setFirstNameValid(validateFirstName(currentFirstName));

            // Appeler handleAuthentication avec les valeurs actuelles
            handleAuthenticationWithValues(
              currentEmail,
              currentPassword,
              currentFirstName
            );
          }}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <MaterialCommunityIcons
                name={isLogin ? "login" : "account-plus"}
                size={20}
                color="#FFF"
              />
              <Text style={localStyles.authButtonText}>
                {isLogin
                  ? t("auth_modal.login_button")
                  : t("auth_modal.register_button")}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* 🚀 SUPPRIMÉ : Bouton Mode Test Premium supprimé car il embrouille la logique */}

        {/* Informations */}
        <View style={localStyles.infoContainer}>
          <MaterialCommunityIcons name="information" size={16} color="#666" />
          <Text style={localStyles.infoText}>
            {isLogin
              ? t("auth_modal.info_text_login")
              : t("auth_modal.info_text_register")}
          </Text>
        </View>

        {/* 🚀 NOUVEAU : Toast local pour la modal */}
        {localToast && (
          <Animated.View
            style={[
              localStyles.toastContainer,
              {
                transform: [{ translateY: toastTranslateY }],
                opacity: toastOpacity,
              },
            ]}
          >
            <TouchableOpacity activeOpacity={0.9} onPress={hideLocalToast}>
              <LinearGradient
                colors={
                  localToast.type === "success"
                    ? ["#4CAF50", "#2E7D32"]
                    : localToast.type === "error"
                    ? ["#f44336", "#c62828"]
                    : ["#2196F3", "#1565C0"]
                }
                style={localStyles.toast}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={localStyles.toastContent}>
                  <MaterialCommunityIcons
                    name={
                      localToast.type === "success"
                        ? "check-circle"
                        : localToast.type === "error"
                        ? "alert-circle"
                        : "information"
                    }
                    size={24}
                    color="#fff"
                    style={localStyles.toastIcon}
                  />
                  <View style={localStyles.toastTextContainer}>
                    <Text style={localStyles.toastTitle}>
                      {localToast.title}
                    </Text>
                    {localToast.message && (
                      <Text style={localStyles.toastMessage}>
                        {localToast.message}
                      </Text>
                    )}
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* 🚀 SUPPRIMÉ : Modal React Native ne fonctionne pas dans cet environnement */}
      </ScrollView>
    </View>
  );
};

const localStyles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "rgba(231, 200, 106, 0.15)",
    borderRadius: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#e7c86a",
    alignSelf: "stretch",
    maxWidth: "100%",
    overflow: "hidden",
    minHeight: 600,
  },
  toggleContainer: {
    flexDirection: "row",
    marginBottom: 16,
    backgroundColor: "rgba(231, 200, 106, 0.25)",
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  toggleButtonActive: {
    backgroundColor: "#e7c86a",
  },
  toggleText: {
    fontSize: 14,
    color: "#CBD5E1", // Gris clair pour fond sombre
    fontWeight: "500",
  },
  toggleTextActive: {
    color: "#1A1A1A", // Noir pour fond clair (quand actif)
    fontWeight: "600",
  },
  signupTabContent: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  premiumBadge: {
    backgroundColor: "#FDE68A",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  premiumBadgeText: {
    fontSize: 12,
    color: "#92400E",
    fontWeight: "700",
  },
  signupInfoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  signupInfoText: {
    color: "#064E3B",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 2,
  },
  signupInfoTextSecondary: {
    color: "#065F46",
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e7c86a",
  },
  inputContainerValid: {
    borderColor: "#4CAF50",
  },
  inputContainerInvalid: {
    borderColor: "#F44336",
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1A1A1A", // Noir pour fond blanc des inputs
  },
  infoIcon: {
    padding: 4,
    marginLeft: 8,
  },
  eyeIcon: {
    padding: 4,
    marginLeft: 4,
  },
  authButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4ECDC4",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  // Bouton CTA centré pour la section
  ctaWrapper: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 8,
  },
  sectionCtaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e7c86a",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 24,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 260,
  },
  sectionCtaButtonText: {
    color: "#1A1A1A",
    fontSize: 16,
    fontWeight: "700",
  },
  authButtonDisabled: {
    backgroundColor: "#ccc",
  },
  authButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  testButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 12,
    gap: 6,
  },
  testButtonText: {
    color: "#666",
    fontSize: 14,
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: "#666666", // Gris foncé pour une meilleure visibilité sur fond clair
    fontStyle: "italic",
    lineHeight: 16,
  },
  connectedHeader: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  connectedTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
    flexShrink: 1,
    color: "#1A1A1A", // Noir pour une meilleure visibilité sur fond clair
  },
  userInfo: {
    marginBottom: 16,
  },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1A1A1A", // Noir pour une meilleure visibilité sur fond clair
  },
  userEmail: {
    fontSize: 14,
    color: "#666666", // Gris foncé pour une meilleure visibilité sur fond clair
  },
  userStatus: {
    fontSize: 14,
    color: "#666666", // Gris foncé pour une meilleure visibilité sur fond clair
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B6B",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: "stretch",
    width: "100%",
  },
  logoutButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  manageAccountButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: "stretch",
    width: "100%",
  },
  manageAccountButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  closeModalButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4ECDC4",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 8,
  },
  closeModalButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },

  // 🚀 NOUVEAU : Styles pour le toast local
  toastContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999999,
    elevation: 999999,
    pointerEvents: "box-none",
  },
  toast: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
    margin: 16,
  },
  toastContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  toastIcon: {
    marginRight: 12,
  },
  toastTextContainer: {
    flex: 1,
  },
  toastTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  toastMessage: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 18,
  },

  // 🚀 NOUVEAU : Styles pour la modal de gestion de compte
  accountModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    padding: 20,
  },
  accountModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: "100%",
    maxWidth: 450,
    maxHeight: "92%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 25, // 🚀 AUGMENTÉ pour être au-dessus de tout
    zIndex: 9999, // 🚀 AJOUTÉ pour forcer l'affichage au-dessus
  },
  accountModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
    backgroundColor: "#F8F9FA",
  },
  accountModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    flex: 1,
  },
  accountModalCloseButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  accountModalScrollableContent: {
    flex: 1,
    padding: 20,
  },

  // 🚀 NOUVEAU : Styles pour la validation du mot de passe
  passwordValidationContainer: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.3)",
  },
  passwordValidationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  validationItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  validationText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 6,
  },
  validationTextValid: {
    color: "#4CAF50",
    fontWeight: "500",
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: "rgba(231, 200, 106, 0.15)",
    borderRadius: 12,
    margin: 8,
    maxHeight: "92%",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
});

export default PremiumLoginSection;
