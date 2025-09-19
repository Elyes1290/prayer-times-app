import { Alert } from "react-native";
import { STRIPE_CONFIG, SubscriptionType, PaymentError } from "./stripeConfig";
import { useToast } from "../contexts/ToastContext";
import { useTranslation } from "react-i18next";

// Service pour gérer les paiements Stripe
export class StripeService {
  private static instance: StripeService;
  private apiUrl: string;

  constructor() {
    this.apiUrl = STRIPE_CONFIG.apiUrl;
  }

  static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  // Créer un intent de paiement côté serveur
  async createPaymentIntent(
    subscriptionType: SubscriptionType
  ): Promise<{ clientSecret: string }> {
    try {
      const response = await fetch(`${this.apiUrl}/create-payment-intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriptionType,
          productId: STRIPE_CONFIG.products[subscriptionType].id,
          amount: STRIPE_CONFIG.products[subscriptionType].price,
          currency: STRIPE_CONFIG.products[subscriptionType].currency,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur serveur: ${response.status}`);
      }

      const data = await response.json();
      return { clientSecret: data.clientSecret };
    } catch (error) {
      console.error("❌ Erreur création payment intent:", error);
      throw new Error("Impossible de créer le paiement. Veuillez réessayer.");
    }
  }

  // Créer un abonnement
  async createSubscription(
    subscriptionType: SubscriptionType,
    paymentMethodId: string
  ): Promise<{ subscriptionId: string }> {
    try {
      const response = await fetch(`${this.apiUrl}/create-subscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriptionType,
          paymentMethodId,
          productId: STRIPE_CONFIG.products[subscriptionType].id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Erreur lors de la création de l'abonnement"
        );
      }

      const data = await response.json();
      return { subscriptionId: data.subscriptionId };
    } catch (error) {
      console.error("❌ Erreur création abonnement:", error);
      throw error;
    }
  }

  // Annuler un abonnement
  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/cancel-subscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscriptionId }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de l'annulation de l'abonnement");
      }
    } catch (error) {
      console.error("❌ Erreur annulation abonnement:", error);
      throw error;
    }
  }

  // Récupérer les détails d'un abonnement
  async getSubscriptionDetails(subscriptionId: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.apiUrl}/subscription/${subscriptionId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des détails");
      }

      return await response.json();
    } catch (error) {
      console.error("❌ Erreur récupération abonnement:", error);
      throw error;
    }
  }

  // Gérer les erreurs de paiement
  handlePaymentError(error: PaymentError): void {
    let message = "Une erreur est survenue lors du paiement.";

    switch (error.type) {
      case "card_error":
        message =
          "Erreur de carte bancaire. Veuillez vérifier vos informations.";
        break;
      case "validation_error":
        message = "Informations de paiement invalides.";
        break;
      case "api_error":
        message = "Erreur de service. Veuillez réessayer plus tard.";
        break;
    }

    Alert.alert("Erreur de Paiement", message);
  }

  // Formater le prix pour l'affichage
  formatPrice(amount: number, currency: string = "eur"): string {
    const formatter = new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency.toUpperCase(),
    });
    return formatter.format(amount / 100); // Stripe utilise les centimes
  }

  // Calculer les économies pour l'abonnement annuel
  calculateSavings(): number {
    const monthlyPrice = STRIPE_CONFIG.products.monthly.price * 12;
    const yearlyPrice = STRIPE_CONFIG.products.yearly.price;
    return Math.round(((monthlyPrice - yearlyPrice) / monthlyPrice) * 100);
  }
}

// Hook personnalisé pour utiliser le service Stripe
export const useStripeService = () => {
  const stripeService = StripeService.getInstance();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const handlePaymentSuccess = (subscriptionType: SubscriptionType) => {
    showToast({
      type: "success",
      title: t("toast_payment_success_title"),
      message: t("toast_payment_success_message", {
        subscriptionName: STRIPE_CONFIG.products[subscriptionType].displayName,
      }),
    });
  };

  const handlePaymentError = (error: PaymentError) => {
    stripeService.handlePaymentError(error);
  };

  return {
    stripeService,
    handlePaymentSuccess,
    handlePaymentError,
  };
};
