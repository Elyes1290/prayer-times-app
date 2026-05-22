import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { useSettings } from "../../contexts/SettingsContext";
// import { usePremium } from "../../contexts/PremiumContext";
import { useToast } from "../../contexts/ToastContext";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ApiClient from "../../utils/apiClient";
import { useErrorHandler } from "../../utils/errorHandler";

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({
  visible,
  onClose,
}: ChangePasswordModalProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { currentTheme } = useSettings();
  const isLightTheme = currentTheme === "light" || currentTheme === "morning";
  const { getErrorTitle, getErrorMessage } = useErrorHandler();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const currentPasswordRef = useRef<TextInput>(null);
  const newPasswordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // Validation du mot de passe
  const validatePassword = (password: string) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[^a-zA-Z\d]/.test(password);

    const isValid =
      password.length >= minLength &&
      hasUpperCase &&
      hasLowerCase &&
      hasNumbers &&
      hasSpecialChar;

    return {
      isValid,
      minLength: password.length >= minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar,
      strength: [
        password.length >= minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumbers,
        hasSpecialChar,
      ].filter(Boolean).length,
    };
  };

  const newPasswordValidation = validatePassword(newPassword);
  const confirmPasswordValidation = newPassword === confirmPassword;

  const getPasswordStrengthColor = (strength: number) => {
    if (strength <= 2) return "#EF4444"; // Rouge
    if (strength <= 3) return "#F59E0B"; // Orange
    if (strength <= 4) return "#10B981"; // Vert
    return "#059669"; // Vert foncé
  };

  const getPasswordStrengthText = (strength: number) => {
    if (strength <= 2) return t("password.password_strength_weak", "Faible");
    if (strength <= 3) return t("password.password_strength_medium", "Moyen");
    if (strength <= 4) return t("password.password_strength_good", "Bon");
    return t("password.password_strength_excellent", "Excellent");
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      showToast({
        type: "error",
        title: t("password.error", "Erreur"),
        message: t(
          "validation_password_required",
          "Veuillez saisir votre mot de passe"
        ),
      });
      currentPasswordRef.current?.focus();
      return;
    }

    if (!newPasswordValidation.isValid) {
      showToast({
        type: "error",
        title: t("password.error", "Erreur"),
        message: t(
          "password.criteria",
          "Le nouveau mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial"
        ),
      });
      newPasswordRef.current?.focus();
      return;
    }

    if (!confirmPasswordValidation) {
      showToast({
        type: "error",
        title: t("password.error", "Erreur"),
        message: t(
          "password_mismatch",
          "Les mots de passe ne correspondent pas"
        ),
      });
      confirmPasswordRef.current?.focus();
      return;
    }

    // 🚀 NOUVEAU : Vérifier que le nouveau mot de passe est différent de l'ancien
    if (currentPassword === newPassword) {
      showToast({
        type: "error",
        title: t("password.error", "Erreur"),
        message: t(
          "password.same_password_error",
          "Le nouveau mot de passe ne peut pas être identique à l'ancien"
        ),
      });
      newPasswordRef.current?.focus();
      return;
    }

    setIsLoading(true);

    try {
      // Récupérer l'email de l'utilisateur
      const userData = await AsyncStorage.getItem("user_data");
      let userEmail = "";

      if (userData) {
        const parsedData = JSON.parse(userData);
        userEmail = parsedData.email || "";
      }

      if (!userEmail) {
        throw new Error("Email utilisateur non trouvé");
      }

      // Appel API pour changer le mot de passe
      const response = await ApiClient.changePassword({
        email: userEmail,
        current_password: currentPassword,
        new_password: newPassword,
      });

      if (response.success) {
        showToast({
          type: "success",
          title: t("password.success", "Succès"),
          message: t(
            "password.password_changed_success",
            "Mot de passe modifié avec succès"
          ),
        });

        // Réinitialiser les champs
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");

        // Fermer le modal
        onClose();
      } else {
        throw new Error(
          response.message ||
            t(
              "password.password_change_error",
              "Erreur lors du changement de mot de passe"
            )
        );
      }
    } catch (error: any) {
      console.error("Erreur changement mot de passe:", error);

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

  const handleClose = () => {
    if (isLoading) return;

    Alert.alert(
      t("password.cancel", "Annuler"),
      t(
        "password.cancel_changes_message",
        "Êtes-vous sûr de vouloir annuler ? Les modifications seront perdues."
      ),
      [
        { text: t("password.continue", "Continuer"), style: "cancel" },
        {
          text: t("password.cancel", "Annuler"),
          style: "destructive",
          onPress: () => {
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            onClose();
          },
        },
      ]
    );
  };

  const styles = {
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center" as const,
      alignItems: "center" as const,
    },
    modalContent: {
      backgroundColor: isLightTheme ? "#FFFFFF" : "#1F2937",
      borderRadius: 16,
      padding: 24,
      margin: 20,
      width: "90%" as any,
      maxWidth: 400,
      boxShadow: "0px 2px 4px rgba(0,0,0,0.25)",
    },
    modalHeader: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      marginBottom: 24,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "bold" as const,
      color: isLightTheme ? "#1F2937" : "#F9FAFB",
    },
    closeButton: {
      padding: 4,
    },
    inputContainer: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: isLightTheme ? "#374151" : "#D1D5DB",
      marginBottom: 8,
    },
    inputWrapper: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      borderWidth: 1,
      borderColor: isLightTheme ? "#D1D5DB" : "#4B5563",
      borderRadius: 8,
      backgroundColor: isLightTheme ? "#FFFFFF" : "#374151",
      paddingHorizontal: 12,
    },
    input: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 16,
      color: isLightTheme ? "#1F2937" : "#F9FAFB",
    },
    eyeIcon: {
      padding: 4,
    },
    passwordStrength: {
      marginTop: 8,
      padding: 8,
      borderRadius: 6,
      backgroundColor: isLightTheme ? "#F3F4F6" : "#374151",
    },
    strengthText: {
      fontSize: 12,
      fontWeight: "500" as const,
    },
    strengthBar: {
      height: 4,
      borderRadius: 2,
      backgroundColor: isLightTheme ? "#E5E7EB" : "#4B5563",
      marginTop: 4,
    },
    strengthFill: {
      height: "100%" as any,
      borderRadius: 2,
    },
    requirements: {
      marginTop: 8,
    },
    requirement: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      marginBottom: 4,
    },
    requirementText: {
      fontSize: 12,
      marginLeft: 6,
    },
    buttonContainer: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      marginTop: 24,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isLightTheme ? "#D1D5DB" : "#4B5563",
      marginRight: 8,
      alignItems: "center" as const,
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: "600" as const,
      color: isLightTheme ? "#374151" : "#D1D5DB",
    },
    saveButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: "#6C5CE7",
      marginLeft: 8,
      alignItems: "center" as const,
      opacity: isLoading ? 0.6 : 1,
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: "600" as const,
      color: "#FFFFFF",
    },
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {t("password.change_password", "Changer le mot de passe")}
            </Text>
            <Pressable
              style={styles.closeButton}
              onPress={handleClose}
              disabled={isLoading}
            >
                <MCIcon
                  name="close"
                  size={24}
                  color={isLightTheme ? "#6B7280" : "#9CA3AF"}
                />
            </Pressable>
          </View>

          {/* Mot de passe actuel */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              {t("password.current_password", "Mot de passe actuel")}
            </Text>
            <View style={styles.inputWrapper}>
              <MCIcon
                name="lock"
                size={20}
                color={isLightTheme ? "#6B7280" : "#9CA3AF"}
              />
              <TextInput
                ref={currentPasswordRef}
                style={styles.input}
                placeholder={t(
                  "password.current_password_placeholder",
                  "Saisissez votre mot de passe actuel"
                )}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrentPassword}
                autoCapitalize="none"
                editable={!isLoading}
                returnKeyType="next"
                onSubmitEditing={() => newPasswordRef.current?.focus()}
              />
              <Pressable
                style={styles.eyeIcon}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                <MCIcon
                  name={showCurrentPassword ? "eye" : "eye-off"}
                  size={20}
                  color={isLightTheme ? "#6B7280" : "#9CA3AF"}
                />
              </Pressable>
            </View>
          </View>

          {/* Nouveau mot de passe */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              {t("password.new_password", "Nouveau mot de passe")}
            </Text>
            <View style={styles.inputWrapper}>
              <MCIcon
                name="lock-plus"
                size={20}
                color={isLightTheme ? "#6B7280" : "#9CA3AF"}
              />
              <TextInput
                ref={newPasswordRef}
                style={styles.input}
                placeholder={t(
                  "password.new_password_placeholder",
                  "Saisissez votre nouveau mot de passe"
                )}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                editable={!isLoading}
                returnKeyType="next"
                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
              />
              <Pressable
                style={styles.eyeIcon}
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <MCIcon
                  name={showNewPassword ? "eye" : "eye-off"}
                  size={20}
                  color={isLightTheme ? "#6B7280" : "#9CA3AF"}
                />
              </Pressable>
            </View>
            {/* Indicateur de force du mot de passe */}
            {newPassword.length > 0 && (
              <View style={styles.passwordStrength}>
                <Text
                  style={[
                    styles.strengthText,
                    {
                      color: getPasswordStrengthColor(
                        newPasswordValidation.strength
                      ),
                    },
                  ]}
                >
                  {t("password.password_strength", "Force")} :{" "}
                  {getPasswordStrengthText(newPasswordValidation.strength)}
                </Text>
                <View style={styles.strengthBar}>
                  <View
                    style={[
                      styles.strengthFill,
                      {
                        width: `${(newPasswordValidation.strength / 5) * 100}%`,
                        backgroundColor: getPasswordStrengthColor(
                          newPasswordValidation.strength
                        ),
                      },
                    ]}
                  />
                </View>
              </View>
            )}
            {/* Exigences du mot de passe */}
            {newPassword.length > 0 && (
              <View style={styles.requirements}>
                <View style={styles.requirement}>
                  <MCIcon
                    name={
                      newPasswordValidation.minLength
                        ? "check-circle"
                        : "circle-outline"
                    }
                    size={14}
                    color={
                      newPasswordValidation.minLength ? "#10B981" : "#6B7280"
                    }
                  />
                  <Text
                    style={[
                      styles.requirementText,
                      {
                        color: newPasswordValidation.minLength
                          ? "#10B981"
                          : isLightTheme
                          ? "#6B7280"
                          : "#9CA3AF",
                      },
                    ]}
                  >
                    {t(
                      "password.password_min_length_8",
                      "Au moins 8 caractères"
                    )}
                  </Text>
                </View>
                <View style={styles.requirement}>
                  <MCIcon
                    name={
                      newPasswordValidation.hasUpperCase
                        ? "check-circle"
                        : "circle-outline"
                    }
                    size={14}
                    color={
                      newPasswordValidation.hasUpperCase ? "#10B981" : "#6B7280"
                    }
                  />
                  <Text
                    style={[
                      styles.requirementText,
                      {
                        color: newPasswordValidation.hasUpperCase
                          ? "#10B981"
                          : isLightTheme
                          ? "#6B7280"
                          : "#9CA3AF",
                      },
                    ]}
                  >
                    {t("password.password_uppercase", "Au moins une majuscule")}
                  </Text>
                </View>
                <View style={styles.requirement}>
                  <MCIcon
                    name={
                      newPasswordValidation.hasNumbers
                        ? "check-circle"
                        : "circle-outline"
                    }
                    size={14}
                    color={
                      newPasswordValidation.hasNumbers ? "#10B981" : "#6B7280"
                    }
                  />
                  <Text
                    style={[
                      styles.requirementText,
                      {
                        color: newPasswordValidation.hasNumbers
                          ? "#10B981"
                          : isLightTheme
                          ? "#6B7280"
                          : "#9CA3AF",
                      },
                    ]}
                  >
                    {t("password.password_number", "Au moins un chiffre")}
                  </Text>
                </View>
                <View style={styles.requirement}>
                  <MCIcon
                    name={
                      newPasswordValidation.hasSpecialChar
                        ? "check-circle"
                        : "circle-outline"
                    }
                    size={14}
                    color={
                      newPasswordValidation.hasSpecialChar
                        ? "#10B981"
                        : "#6B7280"
                    }
                  />
                  <Text
                    style={[
                      styles.requirementText,
                      {
                        color: newPasswordValidation.hasSpecialChar
                          ? "#10B981"
                          : isLightTheme
                          ? "#6B7280"
                          : "#9CA3AF",
                      },
                    ]}
                  >
                    {t(
                      "password.password_special_char",
                      "Au moins un caractère spécial"
                    )}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Confirmation du mot de passe */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              {t("password.confirm_password", "Confirmer le mot de passe")}
            </Text>
            <View style={styles.inputWrapper}>
              <MCIcon
                name="lock-check"
                size={20}
                color={
                  confirmPassword.length > 0
                    ? confirmPasswordValidation
                      ? "#10B981"
                      : "#EF4444"
                    : isLightTheme
                    ? "#6B7280"
                    : "#9CA3AF"
                }
              />
              <TextInput
                ref={confirmPasswordRef}
                style={styles.input}
                placeholder={t(
                  "password.confirm_password_placeholder",
                  "Confirmez votre nouveau mot de passe"
                )}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                editable={!isLoading}
                returnKeyType="done"
                onSubmitEditing={handleChangePassword}
              />
              <Pressable
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <MCIcon
                  name={showConfirmPassword ? "eye" : "eye-off"}
                  size={20}
                  color={isLightTheme ? "#6B7280" : "#9CA3AF"}
                />
              </Pressable>
            </View>
            {confirmPassword.length > 0 && !confirmPasswordValidation && (
              <Text style={{ color: "#EF4444", fontSize: 12, marginTop: 4 }}>
                {t(
                  "password.password_mismatch",
                  "Les mots de passe ne correspondent pas"
                )}
              </Text>
            )}
          </View>

          {/* Boutons */}
          <View style={styles.buttonContainer}>
            <Pressable
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>
                {t("password.cancel", "Annuler")}
              </Text>
            </Pressable>
            <Pressable
              style={styles.saveButton}
              onPress={handleChangePassword}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {t("password.change", "Changer")}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
