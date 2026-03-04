import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SettingsContext } from "../../contexts/SettingsContext";
import apiClient from "../../utils/apiClient";
import ChangePasswordModal from "./ChangePasswordModal";
import { useErrorHandler } from "../../utils/errorHandler";

// 🚀 Interface pour les props du composant
interface AccountManagementSectionProps {
  user: any; // Garde pour la compatibilité (isPremium)
  currentTheme: "light" | "dark" | "morning" | "sunset";
  styles: any;
  showToast: (toast: {
    type: "success" | "error" | "info";
    title: string;
    message: string;
  }) => void;
  forceLogout: () => Promise<void>;
  t: any;
  setActiveSection: (section: string | null) => void;
  navigation?: any; // Navigation pour accéder aux écrans
}

// 🚀 Composant principal de gestion de compte
export default function AccountManagementSection({
  user,
  currentTheme,
  styles,
  showToast,
  forceLogout,
  t,
  setActiveSection,
  navigation,
}: AccountManagementSectionProps) {
  const router = useRouter();
  const settings = useContext(SettingsContext);
  const { getErrorTitle, getErrorMessage } = useErrorHandler();
  const isLightTheme = currentTheme === "light" || currentTheme === "morning";

  // 🚀 NOUVEAU : États pour les vraies données utilisateur
  const [realUserData, setRealUserData] = useState<any>(null);

  // 🔍 Charger les vraies données utilisateur depuis AsyncStorage
  useEffect(() => {
    const loadRealUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem("user_data");
        if (userData) {
          const parsedData = JSON.parse(userData);
          console.log("🔍 [DEBUG] Données utilisateur complètes:", parsedData);
          setRealUserData(parsedData);
        } else {
          // Si pas de données, réinitialiser
          setRealUserData(null);
        }
      } catch (error) {
        console.error("❌ Erreur chargement données utilisateur:", error);
        setRealUserData(null);
      }
    };

    loadRealUserData();
  }, [user]); // 🔧 CORRECTION : Ajouter user comme dépendance pour se mettre à jour

  // 🔧 CORRECTION : Recharger les données quand l'utilisateur change de statut
  useEffect(() => {
    if (user?.isPremium !== realUserData?.isPremium) {
      console.log(
        "🔄 [RELOAD] Statut utilisateur changé, rechargement des données..."
      );
      const reloadData = async () => {
        try {
          const userData = await AsyncStorage.getItem("user_data");
          if (userData) {
            const parsedData = JSON.parse(userData);
            setRealUserData(parsedData);
          }
        } catch (error) {
          console.error("❌ Erreur rechargement données:", error);
        }
      };
      reloadData();
    }
  }, [user?.isPremium, realUserData?.isPremium]);

  // 🎯 Utiliser les vraies données si disponibles, sinon fallback sur user
  const userData = realUserData || user;
  const [userFirstName, setUserFirstName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [editedFirstName, setEditedFirstName] = useState("");
  const [editedEmail, setEditedEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  // 🚀 NOUVEAU : Charger les vraies données utilisateur au montage
  useEffect(() => {
    const loadUserData = async () => {
      setIsLoadingUserData(true);
      try {
        // Récupérer les données depuis AsyncStorage et SettingsContext
        const [storedUserData, storedFirstName] = await Promise.all([
          AsyncStorage.getItem("user_data"),
          AsyncStorage.getItem("userFirstName"),
        ]);

        let firstName = "";
        let email = "";

        // 🚀 PRIORITÉ 1: user_data JSON (données du compte connecté)
        if (storedUserData) {
          try {
            const userData = JSON.parse(storedUserData);
            if (userData.user_first_name) {
              firstName = userData.user_first_name;
            }
            if (userData.email) {
              email = userData.email;
            }
          } catch (error) {
            console.error("Erreur parsing user_data:", error);
          }
        }

        // 🚀 PRIORITÉ 2: SettingsContext (prénom local de l'application)
        if (!firstName && settings?.userFirstName) {
          firstName = settings.userFirstName;
        }

        // 🚀 PRIORITÉ 3: AsyncStorage direct (fallback)
        if (!firstName && storedFirstName) {
          firstName = storedFirstName;
        }

        console.log(
          `🔍 [ACCOUNT] Données chargées - Prénom: "${firstName}", Email: "${email}"`
        );

        setUserFirstName(firstName);
        setUserEmail(email);
        setEditedFirstName(firstName);
        setEditedEmail(email);
      } catch (error) {
        console.error("Erreur chargement données utilisateur:", error);
      } finally {
        setIsLoadingUserData(false);
      }
    };

    loadUserData();
  }, [settings?.userFirstName]);

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      // Simulation d'une API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 🚀 NOUVEAU : Sauvegarder les modifications dans SettingsContext et AsyncStorage
      if (settings?.setUserFirstName) {
        await settings.setUserFirstName(editedFirstName);
      }

      // Mettre à jour les données locales
      setUserFirstName(editedFirstName);
      setUserEmail(editedEmail);

      showToast({
        type: "success",
        title: "Profil mis à jour",
        message: "Vos informations ont été sauvegardées avec succès",
      });

      setIsEditing(false);
    } catch (error) {
      // 🚀 NOUVEAU : Utiliser le gestionnaire d'erreurs centralisé
      const errorTitle = getErrorTitle(error);
      const errorMessage = getErrorMessage(error);

      showToast({
        type: "error",
        title: errorTitle,
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await forceLogout();
      setActiveSection(null);
      showToast({
        type: "success",
        title: "Déconnexion",
        message: "Vous avez été déconnecté avec succès",
      });
    } catch (error) {
      // 🚀 NOUVEAU : Utiliser le gestionnaire d'erreurs centralisé
      const errorTitle = getErrorTitle(error);
      const errorMessage = getErrorMessage(error);

      showToast({
        type: "error",
        title: errorTitle,
        message: errorMessage,
      });
    }
  };

  const handleManageSubscription = async () => {
    try {
      // 🐛 DEBUG : Afficher TOUTES les données pour comprendre le problème
      console.log("🐛 [DEBUG] userData complet:", JSON.stringify(userData, null, 2));
      console.log("🐛 [DEBUG] userData.subscription_platform:", userData?.subscription_platform);
      console.log("🐛 [DEBUG] Type de subscription_platform:", typeof userData?.subscription_platform);
      console.log("🐛 [DEBUG] userData.stripe_customer_id:", userData?.stripe_customer_id);
      console.log("🐛 [DEBUG] userData.premium_status:", userData?.premium_status);
      
      // 🎯 NOUVEAU : Détecter la plateforme d'abonnement avec fallback sur stripe_customer_id
      let subscriptionPlatform = userData?.subscription_platform || 'none';
      
      // 🔧 CORRECTION : Nettoyer les valeurs vides ou nulles
      if (!subscriptionPlatform || subscriptionPlatform === '' || subscriptionPlatform === 'none') {
        console.log("🔍 subscription_platform vide/none, vérification stripe_customer_id...");
        if (userData?.stripe_customer_id) {
          console.log("✅ stripe_customer_id existe → Abonnement Stripe détecté");
          subscriptionPlatform = 'stripe';
        }
      }
      
      console.log("🔍 Platform d'abonnement finale:", subscriptionPlatform);
      console.log("🔍 Platform actuelle:", Platform.OS);
      
      // 🍎 Si abonnement créé sur Apple → toujours rediriger vers Apple (même sur Android)
      if (subscriptionPlatform === 'apple') {
        const APPLE_SUBSCRIPTION_URL =
          "https://apps.apple.com/account/subscriptions";
        const canOpen = await Linking.canOpenURL(APPLE_SUBSCRIPTION_URL);
        if (canOpen) {
          await Linking.openURL(APPLE_SUBSCRIPTION_URL);
        } else {
          // Fallback si le lien profond ne marche pas
          await Linking.openURL("https://support.apple.com/HT202039");
        }
        
        // Message neutre si plateforme différente
        if (Platform.OS === 'android') {
          showToast({
            type: "info",
            title: t("subscription_management", "Gestion de l'abonnement"),
            message: t("redirecting_to_provider", "Redirection vers votre espace de gestion..."),
          });
        }
        return;
      }

      // 💳 Si abonnement créé sur Stripe → toujours utiliser Stripe Portal (même sur iOS)
      if (subscriptionPlatform === 'stripe') {
        setIsLoading(true);
        
        // Message neutre si sur iOS (pas de mention "Android")
        if (Platform.OS === 'ios') {
          showToast({
            type: "info",
            title: t("subscription_management", "Gestion de l'abonnement"),
            message: t("redirecting_to_provider", "Redirection vers votre espace de gestion..."),
          });
        }

        const customerId = userData?.stripe_customer_id;

        if (!customerId) {
          showToast({
            type: "error",
            title: "Erreur",
            message: "Aucun abonnement Stripe trouvé pour votre compte",
          });
          setIsLoading(false);
          return;
        }

        // Créer une session pour le Customer Portal
        const response = await apiClient.createPortalSession(customerId);

        if (response.success && response.url) {
          // Ouvrir le lien dans le navigateur
          await Linking.openURL(response.url);
        } else {
          throw new Error(
            response.message || "Erreur lors de la création de la session"
          );
        }
        setIsLoading(false);
        return;
      }
      
      // 👑 VIP : Ne devrait jamais arriver ici car le bouton est caché
      if (subscriptionPlatform === 'vip') {
        showToast({
          type: "info",
          title: "Accès VIP",
          message: "Vous disposez d'un accès premium à vie. Aucun abonnement récurrent à gérer.",
        });
        return;
      }
      
      // ⚠️ Aucune plateforme détectée
      showToast({
        type: "error",
        title: "Erreur",
        message: "Type d'abonnement non reconnu",
      });
    } catch (error) {
      console.error("Erreur gestion abonnement:", error);

      // 🚀 NOUVEAU : Utiliser le gestionnaire d'erreurs centralisé
      const errorTitle = getErrorTitle(error);
      const errorMessage = getErrorMessage(error);

      showToast({
        type: "error",
        title: errorTitle,
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={styles.sectionTitle}>
        👤 {t("manage_account", "Gestion du compte")}
      </Text>

      {/* Section Profil */}
      <View style={[styles.accountSection, { marginTop: 20 }]}>
        <View style={styles.accountSectionHeader}>
          <MaterialCommunityIcons
            name="account-edit"
            size={24}
            color="#4ECDC4"
          />
          <Text style={styles.accountSectionTitle}>
            {t("personal_information", "Informations personnelles")}
          </Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing(!isEditing)}
            disabled={isLoading || isLoadingUserData}
          >
            <MaterialCommunityIcons
              name={isEditing ? "close" : "pencil"}
              size={20}
              color={isEditing ? "#FF6B6B" : "#4ECDC4"}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.accountFormContainer}>
          {isLoadingUserData ? (
            <View style={{ alignItems: "center", padding: 20 }}>
              <ActivityIndicator size="small" color="#4ECDC4" />
              <Text style={[styles.inputLabel, { marginTop: 8 }]}>
                {t("loading_data", "Chargement des données...")}
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t("first_name", "Prénom")}
                </Text>
                {isEditing ? (
                  <TextInput
                    style={styles.accountInput}
                    value={editedFirstName}
                    onChangeText={setEditedFirstName}
                    placeholder="Votre prénom"
                    placeholderTextColor={
                      isLightTheme ? "#94A3B8" : "#64748B"
                    }
                  />
                ) : (
                  <Text style={styles.inputValue}>
                    {userFirstName || t("not_provided", "Non renseigné")}
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t("email_address", "Email")}
                </Text>
                {isEditing ? (
                  <TextInput
                    style={styles.accountInput}
                    value={editedEmail}
                    onChangeText={setEditedEmail}
                    placeholder="votre@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor={
                      isLightTheme ? "#94A3B8" : "#64748B"
                    }
                  />
                ) : (
                  <Text style={styles.inputValue}>
                    {userEmail || t("not_provided", "Non renseigné")}
                  </Text>
                )}
              </View>

              {isEditing && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setIsEditing(false);
                      setEditedFirstName(userFirstName || "");
                      setEditedEmail(userEmail || "");
                    }}
                    disabled={isLoading}
                  >
                    <Text style={styles.cancelButtonText}>
                      {t("cancel", "Annuler")}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      isLoading && styles.saveButtonDisabled,
                    ]}
                    onPress={handleSaveProfile}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <MaterialCommunityIcons
                          name="check"
                          size={20}
                          color="#FFFFFF"
                        />
                        <Text style={styles.saveButtonText}>
                          {t("save", "Sauvegarder")}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </View>

      {/* Section Abonnement */}
      <View style={[styles.accountSection, { marginTop: 16 }]}>
        <View style={styles.accountSectionHeader}>
          <MaterialCommunityIcons name="crown" size={24} color="#FFD700" />
          <Text style={styles.accountSectionTitle}>
            {t("premium_subscription", "Abonnement Premium")}
          </Text>
        </View>

        <View style={styles.subscriptionInfo}>
          <View style={styles.subscriptionRow}>
            <Text style={styles.subscriptionLabel}>
              {t("status", "Statut")}
            </Text>
            <View
              style={[
                styles.premiumBadge,
                {
                  backgroundColor: user?.isPremium
                    ? "rgba(255, 215, 0, 0.1)"
                    : "rgba(107, 114, 128, 0.1)",
                },
              ]}
            >
              <MaterialCommunityIcons
                name={user?.isPremium ? "crown" : "account"}
                size={16}
                color={user?.isPremium ? "#FFD700" : "#6B7280"}
              />
              <Text
                style={[
                  styles.premiumBadgeText,
                  { color: user?.isPremium ? "#FFD700" : "#6B7280" },
                ]}
              >
                {user?.isPremium
                  ? t("premium_active", "Premium Actif")
                  : t("free", "Gratuit")}
              </Text>
            </View>
          </View>

          <View style={styles.subscriptionRow}>
            <Text style={styles.subscriptionLabel}>{t("type", "Type")}</Text>
            <Text style={styles.subscriptionValue}>
              {user?.isPremium
                ? userData?.subscription_platform === "vip"
                  ? "👑 VIP"
                  : userData?.subscription_type === "monthly"
                  ? t("monthly_subscription", "Abonnement Mensuel")
                  : userData?.subscription_type === "yearly"
                  ? t("yearly_subscription", "Abonnement Annuel")
                  : userData?.subscription_type === "family"
                  ? t("family_subscription", "Abonnement Familial")
                  : userData?.stripe_customer_id
                  ? t("stripe_subscription", "Abonnement Stripe")
                  : userData?.subscription_type ||
                    t("type_undefined", "Type non défini")
                : t("free_version", "Version Gratuite")}
            </Text>
          </View>

          {user?.isPremium && (
            <View style={styles.subscriptionRow}>
              <Text style={styles.subscriptionLabel}>
                {t("next_billing", "Prochaine facturation")}
              </Text>
              <Text style={styles.subscriptionValue}>
                {(() => {
                  // 🔄 CORRECTION : Utiliser premium_expiry directement au lieu de le calculer
                  console.log("🔍 [DEBUG] userData pour facturation:", {
                    premium_expiry: userData?.premium_expiry,
                    subscription_type: userData?.subscription_type,
                  });

                  // Vérifier si premium_expiry existe
                  if (!userData?.premium_expiry) {
                    console.warn(
                      "⚠️ [WARNING] premium_expiry manquant dans userData"
                    );
                    return t("not_available", "Non disponible");
                  }

                  try {
                    // Utiliser directement premium_expiry qui contient la vraie date de facturation
                    const expiryDate = new Date(userData.premium_expiry);

                    console.log(
                      "✅ [OK] Date d'expiration/prochaine facturation:",
                      expiryDate.toLocaleDateString("fr-FR")
                    );

                    // Formatage en français
                    return expiryDate.toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    });
                  } catch (error) {
                    console.error("❌ [ERROR] Erreur parsing date:", error);
                    return t("not_available", "Non disponible");
                  }
                })()}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Section Sécurité */}
      <View style={[styles.accountSection, { marginTop: 16 }]}>
        <View style={styles.accountSectionHeader}>
          <MaterialCommunityIcons
            name="shield-account"
            size={24}
            color="#6C5CE7"
          />
          <Text style={styles.accountSectionTitle}>
            {t("security", "Sécurité")}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.securityOption}
          onPress={() => setShowChangePasswordModal(true)}
        >
          <MaterialCommunityIcons name="key" size={20} color="#6C5CE7" />
          <Text style={styles.securityOptionText}>
            {t("change_password", "Changer le mot de passe")}
          </Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={isLightTheme ? "#94A3B8" : "#64748B"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.securityOption}
          onPress={() => {
            showToast({
              type: "info",
              title: "Authentification 2FA",
              message: "Fonctionnalité en cours de développement",
            });
          }}
        >
          <MaterialCommunityIcons
            name="two-factor-authentication"
            size={20}
            color="#6C5CE7"
          />
          <Text style={styles.securityOptionText}>
            {t("two_factor_auth", "Authentification à deux facteurs")}
          </Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={isLightTheme ? "#94A3B8" : "#64748B"}
          />
        </TouchableOpacity>
      </View>

      {/* Section Actions */}
      <View style={[styles.accountSection, { marginTop: 16 }]}>
        {/* Bouton Gestion Abonnement - seulement pour les utilisateurs premium NON-VIP */}
        {/* 🔧 CORRECTION : Afficher aussi pour les anciens utilisateurs avec stripe_customer_id */}
        {userData?.premium_status === 1 && 
         userData?.subscription_platform !== 'vip' && 
         (userData?.subscription_platform === 'stripe' || userData?.subscription_platform === 'apple' || userData?.stripe_customer_id) && (
          <TouchableOpacity
            style={[
              styles.logoutButton,
              { backgroundColor: "#3B82F6", marginBottom: 12 },
            ]}
            onPress={handleManageSubscription}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialCommunityIcons name="crown" size={20} color="#FFFFFF" />
            )}
            <Text style={[styles.logoutButtonText, { marginLeft: 8 }]}>
              {t("manage_subscription", "Gérer mon abonnement")}
            </Text>
          </TouchableOpacity>
        )}

        {/* 🔒 SÉCURITÉ : Bouton déconnexion uniquement pour utilisateurs connectés avec email */}
        {userEmail && (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <MaterialCommunityIcons name="logout" size={20} color="#FF6B6B" />
            <Text style={styles.logoutButtonText}>
              {t("logout", "Se déconnecter")}
            </Text>
          </TouchableOpacity>
        )}

        {/* 🔒 SÉCURITÉ : Bouton suppression uniquement pour utilisateurs connectés avec email */}
        {userEmail && (
          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={() => {
              // Navigation vers la page de suppression de données via le router Expo
              router.push("/data-deletion");
            }}
          >
            <MaterialCommunityIcons
              name="delete-forever"
              size={20}
              color="#EF4444"
            />
            <Text style={styles.deleteAccountButtonText}>
              {t("delete_account", "Supprimer le compte")}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modal de changement de mot de passe */}
      <ChangePasswordModal
        visible={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />
    </View>
  );
}
