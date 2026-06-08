import React from "react";
import { View, Text, Pressable } from "react-native";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import type { AccountManagementAction } from "./accountManagementState";

type Props = {
  dispatch: React.Dispatch<AccountManagementAction>;
  styles: Record<string, object>;
  t: (key: string, fallback?: string) => string;
  isLightTheme: boolean;
  showToast: (toast: {
    type: "success" | "error" | "info";
    title: string;
    message: string;
  }) => void;
};

export function AccountSecuritySection({
  dispatch,
  styles,
  t,
  isLightTheme,
  showToast,
}: Props) {
  return (
    <View style={[styles.accountSection, { marginTop: 16 }]}>
      <View style={styles.accountSectionHeader}>
        <MCIcon name="shield-account" size={24} color="#6C5CE7" />
        <Text style={styles.accountSectionTitle}>
          {t("security", "Sécurité")}
        </Text>
      </View>

      <Pressable
        style={styles.securityOption}
        onPress={() =>
          dispatch({ type: "SET_SHOW_CHANGE_PASSWORD_MODAL", payload: true })
        }
      >
        <MCIcon name="key" size={20} color="#6C5CE7" />
        <Text style={styles.securityOptionText}>
          {t("change_password", "Changer le mot de passe")}
        </Text>
        <MCIcon
          name="chevron-right"
          size={20}
          color={isLightTheme ? "#94A3B8" : "#64748B"}
        />
      </Pressable>

      <Pressable
        style={styles.securityOption}
        onPress={() => {
          showToast({
            type: "info",
            title: "Authentification 2FA",
            message: "Fonctionnalité en cours de développement",
          });
        }}
      >
        <MCIcon name="two-factor-authentication" size={20} color="#6C5CE7" />
        <Text style={styles.securityOptionText}>
          {t("two_factor_auth", "Authentification à deux facteurs")}
        </Text>
        <MCIcon
          name="chevron-right"
          size={20}
          color={isLightTheme ? "#94A3B8" : "#64748B"}
        />
      </Pressable>
    </View>
  );
}
