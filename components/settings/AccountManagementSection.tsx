import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SettingsContext } from "../../contexts/SettingsContext";
import apiClient from "../../utils/apiClient";
import ChangePasswordModal from "./ChangePasswordModal";
import { useErrorHandler } from "../../utils/errorHandler";

// 🚀 Interface pour les props du composant
interface AccountManagementSectionProps {
  user: any; // Garde pour la compatibilité (isPremium)
  currentTheme: "light" | "dark";
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
  const settings = useContext(SettingsContext);
  const { getErrorTitle, getErrorMessage } = useErrorHandler();

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
      setIsLoading(true);

      // Récupérer le customer ID depuis les données utilisateur
      const customerId = userData?.subscription_id;

      if (!customerId) {
        showToast({
          type: "error",
          title: "Erreur",
          message: "Aucun abonnement trouvé pour votre compte",
        });
        return;
      }

      // Créer une session pour le Customer Portal
      const response = await apiClient.createPortalSession(customerId);

      if (response.success && response.data?.url) {
        // Ouvrir le lien dans le navigateur
        await Linking.openURL(response.data.url);
      } else {
        throw new Error(
          response.message || "Erreur lors de la création de la session"
        );
      }
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
                      currentTheme === "light" ? "#94A3B8" : "#64748B"
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
                      currentTheme === "light" ? "#94A3B8" : "#64748B"
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
                ? userData?.subscription_type === "monthly"
                  ? t("monthly_subscription", "Abonnement Mensuel")
                  : userData?.subscription_type === "yearly"
                  ? t("yearly_subscription", "Abonnement Annuel")
                  : userData?.subscription_type === "family"
                  ? t("family_subscription", "Abonnement Familial")
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
                  // 🔍 Debug des données disponibles
                  console.log("🔍 [DEBUG] userData pour facturation:", {
                    premium_activated_at: userData?.premium_activated_at,
                    subscription_type: userData?.subscription_type,
                    premium_expiry: userData?.premium_expiry,
                    created_at: userData?.created_at,
                  });

                  if (!userData?.subscription_type) {
                    return `Non disponible (Manque: type abo)`;
                  }

                  // 🔧 Fallback si premium_activated_at manque
                  let activationDate = userData.premium_activated_at;
                  if (!activationDate) {
                    // Utiliser created_at, updated_at, ou la date actuelle moins 1 mois comme fallback
                    activationDate =
                      userData.created_at ||
                      userData.updated_at ||
                      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                    console.log(
                      "⚠️ [FALLBACK] Utilisation date fallback pour activation:",
                      activationDate
                    );
                  } else {
                    console.log(
                      "✅ [OK] Utilisation premium_activated_at:",
                      activationDate
                    );
                  }

                  const activatedDate = new Date(activationDate);
                  console.log(
                    "📅 [DEBUG] Date d'activation:",
                    activatedDate.toLocaleDateString("fr-FR")
                  );

                  let nextBilling = new Date(activatedDate);

                  // Calculer la prochaine facturation selon le type
                  if (userData.subscription_type === "monthly") {
                    nextBilling.setMonth(nextBilling.getMonth() + 1);
                    console.log(
                      "📅 [DEBUG] +1 mois = ",
                      nextBilling.toLocaleDateString("fr-FR")
                    );
                  } else if (
                    userData.subscription_type === "yearly" ||
                    userData.subscription_type === "family"
                  ) {
                    nextBilling.setFullYear(nextBilling.getFullYear() + 1);
                    console.log(
                      "📅 [DEBUG] +1 an = ",
                      nextBilling.toLocaleDateString("fr-FR")
                    );
                  }

                  // Formatage en français
                  return nextBilling.toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  });
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
            color={currentTheme === "light" ? "#94A3B8" : "#64748B"}
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
            color={currentTheme === "light" ? "#94A3B8" : "#64748B"}
          />
        </TouchableOpacity>
      </View>

      {/* Section Actions */}
      <View style={[styles.accountSection, { marginTop: 16 }]}>
        {/* Bouton Gestion Abonnement - seulement pour les utilisateurs premium */}
        {userData?.premium_status === 1 && (
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
              Gérer mon abonnement
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color="#FF6B6B" />
          <Text style={styles.logoutButtonText}>
            {t("logout", "Se déconnecter")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteAccountButton}
          onPress={() => {
            // Navigation vers la page de suppression de données
            if (typeof navigation !== "undefined") {
              navigation.navigate("data-deletion");
            } else {
              showToast({
                type: "info",
                title: "Suppression de compte",
                message: "Contactez le support pour supprimer votre compte",
              });
            }
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
      </View>

      {/* Modal de changement de mot de passe */}
      <ChangePasswordModal
        visible={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />
    </View>
  );
}
