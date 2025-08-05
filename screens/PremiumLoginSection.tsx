import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  useRef,
} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Animated,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../utils/apiClient";
import { SettingsContext } from "../contexts/SettingsContext";
import { usePremium } from "../contexts/PremiumContext";
import { LinearGradient } from "expo-linear-gradient";

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
}

const PremiumLoginSection: React.FC<PremiumLoginSectionProps> = ({
  activatePremium,
  styles,
  showToast,
  t,
  onLoginSuccess,
  currentTheme = "dark",
}) => {
  const settings = useContext(SettingsContext);
  const { forceLogout, activatePremiumAfterLogin } = usePremium();
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
  const [passwordValid, setPasswordValid] = useState(false);
  const [firstNameValid, setFirstNameValid] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [firstNameTouched, setFirstNameTouched] = useState(false);

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

  const validatePassword = (password: string) => {
    // Mot de passe doit avoir au moins 6 caractères et au maximum 50
    return password.trim().length >= 6 && password.trim().length <= 50;
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
    [toastTranslateY, toastOpacity]
  );

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
          const userData = JSON.parse(userDataString);
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

  useEffect(() => {
    setPasswordValid(validatePassword(password));
  }, [password]);

  useEffect(() => {
    setFirstNameValid(validateFirstName(firstName));
  }, [firstName]);

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
            title: t("toasts.error"),
            message: t("toasts.validation_email_required"),
          });
          return;
        }
        if (!currentPassword) {
          showLocalToast({
            type: "error",
            title: t("toasts.error"),
            message: t("toasts.validation_password_required"),
          });
          return;
        }
      } else {
        // Inscription - Validation des champs
        if (!currentEmail || !currentPassword || !currentFirstName) {
          Alert.alert(
            t("toasts.error"),
            t("toasts.validation_email_password_required")
          );
          return;
        }

        // Validation en temps réel des champs
        const isEmailValid = validateEmail(currentEmail);
        const isFirstNameValid = validateFirstName(currentFirstName);
        const isPasswordValid = validatePassword(currentPassword);

        if (!isEmailValid) {
          Alert.alert(t("toasts.error"), t("toasts.validation_email_invalid"));
          return;
        }

        if (!isFirstNameValid) {
          Alert.alert(
            t("toasts.error"),
            t("toasts.validation_firstname_required")
          );
          return;
        }

        if (!isPasswordValid) {
          Alert.alert(
            t("toasts.error"),
            t("toasts.validation_password_invalid")
          );
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
            setUserData(userData);
            setIsConnected(true);

            // Synchroniser les données utilisateur
            await syncUserDataToLocal(userData);

            showLocalToast({
              type: "success",
              title: t("toasts.success"),
              message: t("toasts.login_success"),
            });

            if (onLoginSuccess) {
              onLoginSuccess(userData);
            }
          } else {
            showLocalToast({
              type: "error",
              title: t("toasts.error"),
              message: result.message || t("toasts.login_failed"),
            });
          }
        } else {
          // Inscription - Redirection vers le paiement
          try {
            // Stocker temporairement les données d'inscription
            await AsyncStorage.setItem(
              "pending_registration",
              JSON.stringify({
                email: currentEmail,
                password: currentPassword,
                user_first_name: currentFirstName,
                language: "fr",
              })
            );

            // Rediriger vers la page de paiement
            const { router } = await import("expo-router");
            router.push("/premium-payment");
            setIsLoading(false);
            return;
          } catch (paymentError) {
            console.error("❌ Erreur paiement:", paymentError);
            showToast({
              type: "error",
              title: "Erreur de paiement",
              message: "Impossible d'accéder à la page de paiement",
            });
            setIsLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error("❌ Erreur authentification:", error);
        showLocalToast({
          type: "error",
          title: t("toasts.error"),
          message: t("toasts.network_error"),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [isLogin, t, showLocalToast, showToast, onLoginSuccess]
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
      <View style={localStyles.container}>
        <View style={localStyles.connectedHeader}>
          <MaterialCommunityIcons
            name="account-check"
            size={24}
            color="#4CAF50"
          />
          <Text style={localStyles.connectedTitle}>Compte connecté</Text>
        </View>

        <View style={localStyles.userInfo}>
          <Text style={localStyles.userName}>
            {userData.user_first_name || "Utilisateur"}
          </Text>
          <Text style={localStyles.userEmail}>
            {userData.email || "Aucun email"}
          </Text>
          <Text style={localStyles.userStatus}>Statut: Premium</Text>
        </View>

        <TouchableOpacity
          style={localStyles.logoutButton}
          onPress={handleLogout}
        >
          <MaterialCommunityIcons name="logout" size={20} color="#FF6B6B" />
          <Text style={localStyles.logoutButtonText}>Se déconnecter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={localStyles.manageAccountButton}
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

  // Interface login/inscription (inchangée)
  return (
    <View style={localStyles.container}>
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
            setFirstNameTouched(false);
          }}
        >
          <Text
            style={[
              localStyles.toggleText,
              isLogin && localStyles.toggleTextActive,
            ]}
          >
            Connexion
          </Text>
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
          <Text
            style={[
              localStyles.toggleText,
              !isLogin && localStyles.toggleTextActive,
            ]}
          >
            Inscription
          </Text>
        </TouchableOpacity>
      </View>

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
              firstName ? "Modifier le prénom pré-rempli" : "Prénom ou pseudo"
            }
            value={firstName}
            onChangeText={(text) => {
              setFirstName(text);
              setFirstNameTouched(true); // Toujours marquer comme touché
            }}
            onFocus={() => {
              setFirstNameTouched(true); // Marquer comme touché au focus
            }}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={localStyles.infoIcon}
            onPress={() =>
              Alert.alert(
                t("toasts.help_firstname_title"),
                firstName
                  ? t("toasts.help_firstname_prefilled")
                  : t("toasts.help_firstname_empty"),
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
          placeholder={isLogin ? "Email" : "Email"}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setEmailTouched(true); // Toujours marquer comme touché
          }}
          onFocus={() => {
            setEmailTouched(true); // Marquer comme touché au focus
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isLoading}
        />
        <TouchableOpacity
          style={localStyles.infoIcon}
          onPress={() =>
            Alert.alert(
              t("toasts.help_email_title"),
              t("toasts.help_email_content"),
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
          getInputStyle(password, passwordValid),
        ]}
      >
        <MaterialCommunityIcons
          name="lock"
          size={20}
          color={getIconColor(password, passwordValid)}
          style={localStyles.inputIcon}
        />
        <TextInput
          ref={passwordRef}
          style={localStyles.input}
          placeholder={
            isLogin ? "Mot de passe" : "Mot de passe (6+ caractères)"
          }
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setPasswordTouched(true); // Toujours marquer comme touché
          }}
          onFocus={() => {
            setPasswordTouched(true); // Marquer comme touché au focus
          }}
          onBlur={() => {
            // Forcer la validation quand on quitte le champ
            setPasswordValid(validatePassword(password));
          }}
          onSubmitEditing={() => {
            // Forcer la validation quand on appuie sur Entrée
            setPasswordValid(validatePassword(password));
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
            color={getIconColor(password, passwordValid)}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={localStyles.infoIcon}
          onPress={() =>
            Alert.alert(
              t("toasts.help_password_title"),
              t("toasts.help_password_content"),
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
          setPasswordValid(validatePassword(currentPassword));
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
              {isLogin ? "Se connecter" : "S'inscrire"}
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
            ? "Connectez-vous avec votre email et mot de passe."
            : "Cliquez sur les icônes ℹ️ pour voir les détails de chaque champ."}
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
                  <Text style={localStyles.toastTitle}>{localToast.title}</Text>
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
    </View>
  );
};

const localStyles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "rgba(231, 200, 106, 0.15)",
    borderRadius: 12,
    margin: 8,
    borderWidth: 1,
    borderColor: "#e7c86a",
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
    marginBottom: 16,
  },
  connectedTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
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
    maxHeight: "85%",
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
});

export default PremiumLoginSection;
