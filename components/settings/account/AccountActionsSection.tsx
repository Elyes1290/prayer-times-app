import React from "react";
import { View, Pressable, Text, ActivityIndicator } from "react-native";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { isVipUserRecord } from "../../../utils/isVipUser";

type Props = {
  userData: Record<string, unknown> | null | undefined;
  userEmail: string;
  isLoading: boolean;
  styles: Record<string, object>;
  t: (key: string, fallback?: string) => string;
  onManageSubscription: () => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
};

export function AccountActionsSection({
  userData,
  userEmail,
  isLoading,
  styles,
  t,
  onManageSubscription,
  onLogout,
  onDeleteAccount,
}: Props) {
  const showManageSubscription =
    userData?.premium_status === 1 &&
    !isVipUserRecord(userData) &&
    (userData?.subscription_platform === "stripe" ||
      userData?.subscription_platform === "apple" ||
      userData?.stripe_customer_id);

  return (
    <View style={[styles.accountSection, { marginTop: 16 }]}>
      {showManageSubscription ? (
        <Pressable
          style={[
            styles.logoutButton,
            { backgroundColor: "#3B82F6", marginBottom: 12 },
          ]}
          onPress={onManageSubscription}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <MCIcon name="crown" size={20} color="#FFFFFF" />
          )}
          <Text style={[styles.logoutButtonText, { marginLeft: 8 }]}>
            {t("manage_subscription", "Gérer mon abonnement")}
          </Text>
        </Pressable>
      ) : null}

      {userEmail ? (
        <Pressable style={styles.logoutButton} onPress={onLogout}>
          <MCIcon name="logout" size={20} color="#FF6B6B" />
          <Text style={styles.logoutButtonText}>
            {t("logout", "Se déconnecter")}
          </Text>
        </Pressable>
      ) : null}

      {userEmail ? (
        <Pressable style={styles.deleteAccountButton} onPress={onDeleteAccount}>
          <MCIcon name="delete-forever" size={20} color="#EF4444" />
          <Text style={styles.deleteAccountButtonText}>
            {t("delete_account", "Supprimer le compte")}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
