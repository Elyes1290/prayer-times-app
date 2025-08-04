import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SettingsContext } from "../../contexts/SettingsContext";

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
}: AccountManagementSectionProps) {
  const settings = useContext(SettingsContext);

  // 🚀 NOUVEAU : États pour les vraies données utilisateur
  const [userFirstName, setUserFirstName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [editedFirstName, setEditedFirstName] = useState("");
  const [editedEmail, setEditedEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
      showToast({
        type: "error",
        title: "Erreur",
        message: "Impossible de sauvegarder le profil",
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
      showToast({
        type: "error",
        title: "Erreur",
        message: "Erreur lors de la déconnexion",
      });
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={styles.sectionTitle}>👤 Gestion du compte</Text>

      {/* Section Profil */}
      <View style={[styles.accountSection, { marginTop: 20 }]}>
        <View style={styles.accountSectionHeader}>
          <MaterialCommunityIcons
            name="account-edit"
            size={24}
            color="#4ECDC4"
          />
          <Text style={styles.accountSectionTitle}>
            Informations personnelles
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
                Chargement des données...
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Prénom</Text>
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
                    {userFirstName || "Non renseigné"}
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
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
                    {userEmail || "Non renseigné"}
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
                    <Text style={styles.cancelButtonText}>Annuler</Text>
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
                        <Text style={styles.saveButtonText}>Sauvegarder</Text>
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
          <Text style={styles.accountSectionTitle}>Abonnement Premium</Text>
        </View>

        <View style={styles.subscriptionInfo}>
          <View style={styles.subscriptionRow}>
            <Text style={styles.subscriptionLabel}>Statut</Text>
            <View style={styles.premiumBadge}>
              <MaterialCommunityIcons name="crown" size={16} color="#FFD700" />
              <Text style={styles.premiumBadgeText}>Premium Actif</Text>
            </View>
          </View>

          <View style={styles.subscriptionRow}>
            <Text style={styles.subscriptionLabel}>Type</Text>
            <Text style={styles.subscriptionValue}>Abonnement Mensuel</Text>
          </View>

          <View style={styles.subscriptionRow}>
            <Text style={styles.subscriptionLabel}>Prochaine facturation</Text>
            <Text style={styles.subscriptionValue}>15 Août 2024</Text>
          </View>
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
          <Text style={styles.accountSectionTitle}>Sécurité</Text>
        </View>

        <TouchableOpacity
          style={styles.securityOption}
          onPress={() => {
            showToast({
              type: "info",
              title: "Changer le mot de passe",
              message: "Fonctionnalité en cours de développement",
            });
          }}
        >
          <MaterialCommunityIcons name="key" size={20} color="#6C5CE7" />
          <Text style={styles.securityOptionText}>Changer le mot de passe</Text>
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
            Authentification à deux facteurs
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
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color="#FF6B6B" />
          <Text style={styles.logoutButtonText}>Se déconnecter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteAccountButton}
          onPress={() => {
            showToast({
              type: "info",
              title: "Suppression de compte",
              message: "Contactez le support pour supprimer votre compte",
            });
          }}
        >
          <MaterialCommunityIcons
            name="delete-forever"
            size={20}
            color="#EF4444"
          />
          <Text style={styles.deleteAccountButtonText}>
            Supprimer le compte
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
