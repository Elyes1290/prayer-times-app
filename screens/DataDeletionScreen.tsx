import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { usePremium } from "../contexts/PremiumContext";
import { useCurrentTheme } from "../hooks/useThemeColor";
import apiClient from "../utils/apiClient";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function DataDeletionScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const currentTheme = useCurrentTheme();
  const { forceLogout } = usePremium();

  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);

  const styles = getStyles(currentTheme);

  // 🔒 SÉCURITÉ : Charger l'email de l'utilisateur connecté au montage
  useEffect(() => {
    const loadUserEmail = async () => {
      try {
        const userData = await AsyncStorage.getItem("user_data");
        if (userData) {
          const parsedData = JSON.parse(userData);
          if (parsedData.email) {
            setEmail(parsedData.email);
            console.log("🔒 Email auto-rempli:", parsedData.email);
          }
        }
      } catch (error) {
        console.error("❌ Erreur chargement email utilisateur:", error);
      } finally {
        setIsLoadingUserData(false);
      }
    };

    loadUserEmail();
  }, []);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert(
        t("data_deletion.email_required", "Email requis"),
        t(
          "data_deletion.email_prompt",
          "Veuillez saisir votre adresse email pour continuer."
        )
      );
      return;
    }

    if (!email.includes("@")) {
      Alert.alert(
        t("data_deletion.invalid_email", "Email invalide"),
        t(
          "data_deletion.invalid_email_prompt",
          "Veuillez saisir une adresse email valide."
        )
      );
      return;
    }

    Alert.alert(
      t("data_deletion.confirmation_title", "Confirmation de suppression"),
      t(
        "data_deletion.confirmation",
        "Êtes-vous sûr de vouloir demander la suppression de votre compte et de toutes vos données ? Cette action est irréversible."
      ),
      [
        {
          text: t("cancel", "Annuler"),
          style: "cancel",
        },
        {
          text: t("common.confirm", "Confirmer"),
          style: "destructive",
          onPress: submitDeletionRequest,
        },
      ]
    );
  };

  const submitDeletionRequest = async () => {
    setIsSubmitting(true);

    try {
      const response = await apiClient.submitDataDeletionRequest({
        email: email.trim(),
        reason: reason.trim(),
        message: message.trim(),
        immediate: true, // 🚀 Demander la suppression immédiate pour Apple
      });

      if (response.success) {
        // Si c'est une suppression immédiate réussie
        if (response.status === "deleted") {
          Alert.alert(
            t("data_deletion.deleted", "Compte supprimé"),
            t(
              "data_deletion.deleted_message",
              "Votre compte et toutes vos données ont été supprimés de nos serveurs. Vous allez être déconnecté."
            ),
            [
              {
                text: t("ok", "OK"),
                onPress: async () => {
                  // Déconnexion forcée et retour à l'accueil
                  await forceLogout();
                  router.replace("/");
                },
              },
            ]
          );
        } else {
          // Fallback sur le message de demande enregistrée (si l'admin doit encore valider)
          Alert.alert(
            t("data_deletion.request_recorded", "Demande enregistrée"),
            t(
              "data_deletion.request_message",
              "Votre demande de suppression a été enregistrée. Votre compte sera désactivé et supprimé dans les plus brefs délais."
            ),
            [
              {
                text: t("ok", "OK"),
                onPress: () => router.push("/settings"),
              },
            ]
          );
        }
      } else {
        throw new Error(response.message || "Erreur lors de la soumission");
      }
    } catch (error: any) {
      console.error("Erreur demande de suppression:", error);
      Alert.alert(
        t("error", "Erreur"),
        t(
          "data_deletion.error_message",
          "Une erreur est survenue lors de l'envoi de votre demande. Veuillez réessayer ou nous contacter directement à myadhan@gmail.com"
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/settings")}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={currentTheme === "light" ? "#333333" : "#F8FAFC"}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t("data_deletion.title", "Suppression de compte")}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Warning Section */}
      <View style={styles.warningSection}>
        <MaterialCommunityIcons name="alert" size={48} color="#EF4444" />
        <Text style={styles.warningTitle}>
          ⚠️ {t("data_deletion.warning", "Attention")}
        </Text>
        <Text style={styles.warningText}>
          {t(
            "data_deletion.warning_text",
            "La suppression de votre compte est définitive et irréversible. Toutes vos données seront supprimées."
          )}
        </Text>
      </View>

      {/* Form */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>
          {t("data_deletion.request_info", "Informations de la demande")}
        </Text>

        {/* Email Input - 🔒 LECTURE SEULE pour sécurité */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            {t("data_deletion.email_label", "Email *")}
          </Text>
          {isLoadingUserData ? (
            <View style={[styles.textInput, styles.loadingInput]}>
              <ActivityIndicator size="small" color="#4ECDC4" />
              <Text style={styles.loadingText}>
                {t("loading_data", "Chargement...")}
              </Text>
            </View>
          ) : (
            <>
              <TextInput
                style={[styles.textInput, styles.readOnlyInput]}
                value={email}
                editable={false}
                placeholder={t(
                  "data_deletion.email_placeholder",
                  "Votre adresse email"
                )}
                placeholderTextColor={
                  currentTheme === "light" ? "#94A3B8" : "#64748B"
                }
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.readOnlyNote}>
                🔒{" "}
                {t(
                  "data_deletion.email_locked",
                  "Email auto-rempli depuis votre compte (non modifiable)"
                )}
              </Text>
            </>
          )}
        </View>

        {/* Reason Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            {t(
              "data_deletion.reason_label",
              "Raison de la suppression (optionnel)"
            )}
          </Text>
          <TextInput
            style={styles.textInput}
            value={reason}
            onChangeText={setReason}
            placeholder={t(
              "data_deletion.reason_placeholder",
              "Pourquoi souhaitez-vous supprimer votre compte ?"
            )}
            placeholderTextColor={
              currentTheme === "light" ? "#94A3B8" : "#64748B"
            }
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Message Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            {t("data_deletion.message_label", "Message (optionnel)")}
          </Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={message}
            onChangeText={setMessage}
            placeholder={t(
              "data_deletion.message_placeholder",
              "Message supplémentaire..."
            )}
            placeholderTextColor={
              currentTheme === "light" ? "#94A3B8" : "#64748B"
            }
            multiline
            numberOfLines={4}
          />
        </View>
      </View>

      {/* Information Section */}
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>
          {t("data_deletion.what_deleted", "Ce qui sera supprimé")}
        </Text>

        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="account" size={20} color="#6B7280" />
          <Text style={styles.infoText}>
            {t("data_deletion.user_account", "Votre compte utilisateur")}
          </Text>
        </View>

        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="chart-line" size={20} color="#6B7280" />
          <Text style={styles.infoText}>
            {t("data_deletion.prayer_stats", "Vos statistiques de prière")}
          </Text>
        </View>

        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="heart" size={20} color="#6B7280" />
          <Text style={styles.infoText}>
            {t("data_deletion.favorites_settings", "Vos favoris et paramètres")}
          </Text>
        </View>

        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="crown" size={20} color="#6B7280" />
          <Text style={styles.infoText}>
            {t(
              "data_deletion.premium_subscriptions",
              "Vos abonnements premium"
            )}
          </Text>
        </View>

        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="database" size={20} color="#6B7280" />
          <Text style={styles.infoText}>
            {t(
              "data_deletion.personal_data",
              "Toutes vos données personnelles"
            )}
          </Text>
        </View>
      </View>

      {/* Process Information */}
      <View style={styles.processSection}>
        <Text style={styles.sectionTitle}>
          {t("data_deletion.process", "Processus de suppression")}
        </Text>

        <View style={styles.processStep}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <Text style={styles.processText}>
            {t(
              "data_deletion.process_step_1",
              "Soumettez votre demande via ce formulaire"
            )}
          </Text>
        </View>

        <View style={styles.processStep}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <Text style={styles.processText}>
            {t(
              "data_deletion.process_step_2",
              "Votre compte et toutes vos données sont supprimés immédiatement et définitivement de nos serveurs"
            )}
          </Text>
        </View>

        <View style={styles.processStep}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <Text style={styles.processText}>
            {t(
              "data_deletion.process_step_3",
              "Vous êtes automatiquement déconnecté et redirigé vers l'écran d'accueil"
            )}
          </Text>
        </View>
      </View>

      {/* Subscription Warning - iOS uniquement car Apple ne permet pas l'annulation automatique */}
      {Platform.OS === "ios" && (
        <View style={styles.subscriptionWarningSection}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={24}
            color="#F59E0B"
          />
          <Text style={styles.subscriptionWarningText}>
            {t(
              "data_deletion.subscription_warning_ios",
              "⚠️ Important : La suppression du compte ne supprime PAS automatiquement votre abonnement Apple. Pour annuler votre abonnement, rendez-vous dans Paramètres > Gérer mon abonnement AVANT de supprimer votre compte."
            )}
          </Text>
        </View>
      )}

      {/* Submit Button */}
      <View style={styles.submitButtonContainer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            isSubmitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <MaterialCommunityIcons
                name="delete-forever"
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.submitButtonText}>
                {t(
                  "data_deletion.submit_button",
                  "Supprimer définitivement le compte"
                )}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Contact Information */}
      <View style={styles.contactSection}>
        <Text style={styles.contactText}>
          {t("data_deletion.contact_questions", "Questions ? Contactez-nous à")}{" "}
          <Text style={styles.contactEmail}>myadhan@gmail.com</Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const getStyles = (theme: "light" | "dark") =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme === "light" ? "#FFFFFF" : "#0F172A",
    },
    content: {
      padding: 16,
      paddingBottom: 150, // Augmente l'espace en bas pour éviter que le contenu soit masqué par la barre de navigation
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 24,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme === "light" ? "#1F2937" : "#F8FAFC",
    },
    placeholder: {
      width: 40,
    },
    warningSection: {
      alignItems: "center",
      backgroundColor: theme === "light" ? "#FEF2F2" : "#450A0A",
      padding: 20,
      borderRadius: 12,
      marginBottom: 24,
    },
    warningTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#EF4444",
      marginTop: 12,
      marginBottom: 8,
    },
    warningText: {
      fontSize: 14,
      color: theme === "light" ? "#7F1D1D" : "#FECACA",
      textAlign: "center",
      lineHeight: 20,
    },
    formSection: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme === "light" ? "#1F2937" : "#F8FAFC",
      marginBottom: 16,
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: theme === "light" ? "#374151" : "#E2E8F0",
      marginBottom: 8,
    },
    textInput: {
      borderWidth: 1,
      borderColor: theme === "light" ? "#D1D5DB" : "#374151",
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: theme === "light" ? "#1F2937" : "#F8FAFC",
      backgroundColor: theme === "light" ? "#FFFFFF" : "#1E293B",
    },
    // 🔒 Style pour input en lecture seule
    readOnlyInput: {
      backgroundColor: theme === "light" ? "#F3F4F6" : "#1F2937",
      borderColor: theme === "light" ? "#E5E7EB" : "#334155",
      opacity: 0.8,
    },
    readOnlyNote: {
      fontSize: 12,
      color: theme === "light" ? "#6B7280" : "#94A3B8",
      marginTop: 4,
      fontStyle: "italic",
    },
    loadingInput: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 16,
    },
    loadingText: {
      marginLeft: 8,
      fontSize: 14,
      color: theme === "light" ? "#6B7280" : "#94A3B8",
    },
    textArea: {
      height: 100,
      textAlignVertical: "top",
    },
    infoSection: {
      marginBottom: 24,
    },
    infoItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    infoText: {
      fontSize: 14,
      color: theme === "light" ? "#6B7280" : "#94A3B8",
      marginLeft: 12,
    },
    processSection: {
      marginBottom: 24,
    },
    processStep: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 16,
    },
    stepNumber: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: "#3B82F6",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
      marginTop: 2,
    },
    stepNumberText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "bold",
    },
    processText: {
      fontSize: 14,
      color: theme === "light" ? "#6B7280" : "#94A3B8",
      flex: 1,
      lineHeight: 20,
    },
    subscriptionWarningSection: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: theme === "light" ? "#FEF3C7" : "#78350F",
      padding: 16,
      borderRadius: 12,
      marginBottom: 24,
      marginHorizontal: 16,
      borderWidth: 1,
      borderColor: theme === "light" ? "#FCD34D" : "#92400E",
    },
    subscriptionWarningText: {
      flex: 1,
      fontSize: 13,
      color: theme === "light" ? "#92400E" : "#FEF3C7",
      marginLeft: 12,
      lineHeight: 18,
    },
    submitButtonContainer: {
      marginBottom: 24,
      paddingHorizontal: 16,
    },
    submitButton: {
      backgroundColor: "#EF4444",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      borderRadius: 12,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "bold",
      marginLeft: 8,
    },
    contactSection: {
      alignItems: "center",
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: theme === "light" ? "#E5E7EB" : "#374151",
    },
    contactText: {
      fontSize: 14,
      color: theme === "light" ? "#6B7280" : "#94A3B8",
      textAlign: "center",
    },
    contactEmail: {
      color: "#3B82F6",
      fontWeight: "600",
    },
  });
