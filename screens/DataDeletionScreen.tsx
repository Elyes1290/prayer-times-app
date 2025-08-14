import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { SettingsContext } from "../contexts/SettingsContext";
import { useCurrentTheme } from "../hooks/useThemeColor";
import apiClient from "../utils/apiClient";

export default function DataDeletionScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const currentTheme = useCurrentTheme();
  const settings = useContext(SettingsContext);

  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const styles = getStyles(currentTheme);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert(
        "Email requis",
        "Veuillez saisir votre adresse email pour continuer."
      );
      return;
    }

    if (!email.includes("@")) {
      Alert.alert(
        "Email invalide",
        "Veuillez saisir une adresse email valide."
      );
      return;
    }

    Alert.alert(
      "Confirmation de suppression",
      t(
        "data_deletion.confirmation",
        "Êtes-vous sûr de vouloir demander la suppression de votre compte et de toutes vos données ? Cette action est irréversible."
      ),
      [
        {
          text: "Annuler",
          style: "cancel",
        },
        {
          text: "Confirmer",
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
      });

      if (response.success) {
        Alert.alert(
          t("data_deletion.request_recorded", "Demande enregistrée"),
          t(
            "data_deletion.request_message",
            "Votre demande de suppression a été enregistrée. Vous recevrez un email de confirmation dans les prochaines minutes. Nous traiterons votre demande dans un délai maximum de 30 jours."
          ),
          [
            {
              text: "OK",
              onPress: () => router.push("/settings"),
            },
          ]
        );
      } else {
        throw new Error(response.message || "Erreur lors de la soumission");
      }
    } catch (error: any) {
      console.error("Erreur demande de suppression:", error);
      Alert.alert(
        "Erreur",
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
        <Text style={styles.headerTitle}>Suppression de compte</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Warning Section */}
      <View style={styles.warningSection}>
        <MaterialCommunityIcons name="alert" size={48} color="#EF4444" />
        <Text style={styles.warningTitle}>⚠️ Attention</Text>
        <Text style={styles.warningText}>
          La suppression de votre compte est définitive et irréversible. Toutes
          vos données seront supprimées.
        </Text>
      </View>

      {/* Form */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Informations de la demande</Text>

        {/* Email Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.textInput}
            value={email}
            onChangeText={setEmail}
            placeholder="Votre adresse email"
            placeholderTextColor={
              currentTheme === "light" ? "#94A3B8" : "#64748B"
            }
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Reason Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Raison de la suppression (optionnel)</Text>
          <TextInput
            style={styles.textInput}
            value={reason}
            onChangeText={setReason}
            placeholder="Pourquoi souhaitez-vous supprimer votre compte ?"
            placeholderTextColor={
              currentTheme === "light" ? "#94A3B8" : "#64748B"
            }
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Message Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Message (optionnel)</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={message}
            onChangeText={setMessage}
            placeholder="Message supplémentaire..."
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
        <Text style={styles.sectionTitle}>Ce qui sera supprimé</Text>

        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="account" size={20} color="#6B7280" />
          <Text style={styles.infoText}>Votre compte utilisateur</Text>
        </View>

        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="chart-line" size={20} color="#6B7280" />
          <Text style={styles.infoText}>Vos statistiques de prière</Text>
        </View>

        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="heart" size={20} color="#6B7280" />
          <Text style={styles.infoText}>Vos favoris et paramètres</Text>
        </View>

        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="crown" size={20} color="#6B7280" />
          <Text style={styles.infoText}>Vos abonnements premium</Text>
        </View>

        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="database" size={20} color="#6B7280" />
          <Text style={styles.infoText}>Toutes vos données personnelles</Text>
        </View>
      </View>

      {/* Process Information */}
      <View style={styles.processSection}>
        <Text style={styles.sectionTitle}>Processus de suppression</Text>

        <View style={styles.processStep}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <Text style={styles.processText}>
            Soumettez votre demande via ce formulaire
          </Text>
        </View>

        <View style={styles.processStep}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <Text style={styles.processText}>
            Recevez un email de confirmation avec votre numéro de demande
          </Text>
        </View>

        <View style={styles.processStep}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <Text style={styles.processText}>
            Nous traiterons votre demande dans un délai maximum de 30 jours
          </Text>
        </View>
      </View>

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
                Demander la suppression
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Contact Information */}
      <View style={styles.contactSection}>
        <Text style={styles.contactText}>
          Questions ? Contactez-nous à{" "}
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
