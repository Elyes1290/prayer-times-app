import React from "react";
import { View, Text, Pressable, TextInput, ActivityIndicator } from "react-native";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import type { AccountManagementAction, AccountManagementState } from "./accountManagementState";

type Props = {
  state: AccountManagementState;
  dispatch: React.Dispatch<AccountManagementAction>;
  styles: Record<string, object>;
  t: (key: string, fallback?: string) => string;
  isLightTheme: boolean;
  onSaveProfile: () => void;
};

export function AccountProfileSection({
  state,
  dispatch,
  styles,
  t,
  isLightTheme,
  onSaveProfile,
}: Props) {
  const {
    isEditing,
    isLoading,
    isLoadingUserData,
    userFirstName,
    userEmail,
    editedFirstName,
    editedEmail,
  } = state;

  return (
    <View style={[styles.accountSection, { marginTop: 20 }]}>
      <View style={styles.accountSectionHeader}>
        <MCIcon name="account-edit" size={24} color="#4ECDC4" />
        <Text style={styles.accountSectionTitle}>
          {t("personal_information", "Informations personnelles")}
        </Text>
        <Pressable
          style={styles.editButton}
          onPress={() => dispatch({ type: "SET_EDITING", payload: !isEditing })}
          disabled={isLoading || isLoadingUserData}
        >
          <MCIcon
            name={isEditing ? "close" : "pencil"}
            size={20}
            color={isEditing ? "#FF6B6B" : "#4ECDC4"}
          />
        </Pressable>
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
              <Text style={styles.inputLabel}>{t("first_name", "Prénom")}</Text>
              {isEditing ? (
                <TextInput
                  style={styles.accountInput}
                  value={editedFirstName}
                  onChangeText={(text) =>
                    dispatch({ type: "SET_EDITED_FIRST_NAME", payload: text })
                  }
                  placeholder="Votre prénom"
                  placeholderTextColor={isLightTheme ? "#94A3B8" : "#64748B"}
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
                  onChangeText={(text) =>
                    dispatch({ type: "SET_EDITED_EMAIL", payload: text })
                  }
                  placeholder="votre@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={isLightTheme ? "#94A3B8" : "#64748B"}
                />
              ) : (
                <Text style={styles.inputValue}>
                  {userEmail || t("not_provided", "Non renseigné")}
                </Text>
              )}
            </View>

            {isEditing && (
              <View style={styles.actionButtons}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => dispatch({ type: "CANCEL_EDIT" })}
                  disabled={isLoading}
                >
                  <Text style={styles.cancelButtonText}>
                    {t("cancel", "Annuler")}
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.saveButton,
                    isLoading && styles.saveButtonDisabled,
                  ]}
                  onPress={onSaveProfile}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <MCIcon name="check" size={20} color="#FFFFFF" />
                      <Text style={styles.saveButtonText}>
                        {t("save", "Sauvegarder")}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}
