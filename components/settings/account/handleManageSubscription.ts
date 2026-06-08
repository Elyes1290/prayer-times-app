import { Linking, Platform } from "react-native";
import apiClient from "../../../utils/apiClient";

type ToastFn = (toast: {
  type: "success" | "error" | "info";
  title: string;
  message: string;
}) => void;

type TFn = (key: string, fallback?: string) => string;

export async function handleManageSubscription({
  userData,
  showToast,
  t,
  setLoading,
}: {
  userData: Record<string, unknown> | null | undefined;
  showToast: ToastFn;
  t: TFn;
  setLoading: (loading: boolean) => void;
}): Promise<void> {
  try {
    let subscriptionPlatform =
      (userData?.subscription_platform as string) || "none";

    if (
      !subscriptionPlatform ||
      subscriptionPlatform === "" ||
      subscriptionPlatform === "none"
    ) {
      if (userData?.stripe_customer_id) {
        subscriptionPlatform = "stripe";
      }
    }

    if (subscriptionPlatform === "apple") {
      const APPLE_SUBSCRIPTION_URL =
        "https://apps.apple.com/account/subscriptions";
      const canOpen = await Linking.canOpenURL(APPLE_SUBSCRIPTION_URL);
      if (canOpen) {
        await Linking.openURL(APPLE_SUBSCRIPTION_URL);
      } else {
        await Linking.openURL("https://support.apple.com/HT202039");
      }
      if (Platform.OS === "android") {
        showToast({
          type: "info",
          title: t("subscription_management", "Gestion de l'abonnement"),
          message: t(
            "redirecting_to_provider",
            "Redirection vers votre espace de gestion...",
          ),
        });
      }
      return;
    }

    if (subscriptionPlatform === "stripe") {
      setLoading(true);

      if (Platform.OS === "ios") {
        showToast({
          type: "info",
          title: t("subscription_management", "Gestion de l'abonnement"),
          message: t(
            "redirecting_to_provider",
            "Redirection vers votre espace de gestion...",
          ),
        });
      }

      const customerId = userData?.stripe_customer_id as string | undefined;
      if (!customerId) {
        showToast({
          type: "error",
          title: "Erreur",
          message: "Aucun abonnement Stripe trouvé pour votre compte",
        });
        setLoading(false);
        return;
      }

      const response = await apiClient.createPortalSession(customerId);
      if (response.success && response.url) {
        await Linking.openURL(response.url);
      } else {
        throw new Error(
          response.message || "Erreur lors de la création de la session",
        );
      }
      setLoading(false);
      return;
    }

    if (subscriptionPlatform === "vip") {
      showToast({
        type: "info",
        title: "Accès VIP",
        message:
          "Vous disposez d'un accès premium à vie. Aucun abonnement récurrent à gérer.",
      });
      return;
    }

    showToast({
      type: "error",
      title: "Erreur",
      message: "Type d'abonnement non reconnu",
    });
  } catch (error) {
    console.error("Erreur gestion abonnement:", error);
    throw error;
  } finally {
    setLoading(false);
  }
}
