import React from "react";
import { View, Text } from "react-native";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { isVipUserRecord } from "../../../utils/isVipUser";
import {
  isPlaceholderVipExpiry,
} from "../../../utils/userDataSync";

type Props = {
  user: { isPremium?: boolean } | null | undefined;
  userData: Record<string, unknown> | null | undefined;
  styles: Record<string, object>;
  t: (key: string, fallback?: string) => string;
};

function formatNextBilling(
  userData: Record<string, unknown> | null | undefined,
  t: Props["t"],
): string {
  const expiry = userData?.premium_expiry as string | undefined;
  if (!expiry || (!isVipUserRecord(userData) && isPlaceholderVipExpiry(expiry))) {
    return t("not_available", "Non disponible");
  }

  try {
    const expiryDate = new Date(expiry);
    return expiryDate.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch (error) {
    console.error("❌ [ERROR] Erreur parsing date:", error);
    return t("not_available", "Non disponible");
  }
}

export function AccountSubscriptionSection({
  user,
  userData,
  styles,
  t,
}: Props) {
  return (
    <View style={[styles.accountSection, { marginTop: 16 }]}>
      <View style={styles.accountSectionHeader}>
        <MCIcon name="crown" size={24} color="#FFD700" />
        <Text style={styles.accountSectionTitle}>
          {t("premium_subscription", "Abonnement Premium")}
        </Text>
      </View>

      <View style={styles.subscriptionInfo}>
        <View style={styles.subscriptionRow}>
          <Text style={styles.subscriptionLabel}>{t("status", "Statut")}</Text>
          <View
            style={[
              styles.premiumBadgeRow,
              {
                backgroundColor: user?.isPremium
                  ? "rgba(255, 215, 0, 0.1)"
                  : "rgba(107, 114, 128, 0.1)",
              },
            ]}
          >
            <MCIcon
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
              ? isVipUserRecord(userData)
                ? "👑 VIP"
                : userData?.subscription_platform === "apple"
                  ? t("apple_subscription", "Abonnement Apple")
                  : userData?.subscription_type === "monthly"
                  ? t("monthly_subscription", "Abonnement Mensuel")
                  : userData?.subscription_type === "yearly"
                    ? t("yearly_subscription", "Abonnement Annuel")
                    : userData?.subscription_type === "family"
                      ? t("family_subscription", "Abonnement Familial")
                      : userData?.stripe_customer_id
                        ? t("stripe_subscription", "Abonnement Stripe")
                        : (userData?.subscription_type as string) ||
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
              {formatNextBilling(userData, t)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
