import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  StripeProvider,
  CardField,
  useStripe,
  useConfirmPayment,
} from "@stripe/stripe-react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import ThemedImageBackground from "../components/ThemedImageBackground";
import { useThemeColors, useCurrentTheme } from "../hooks/useThemeAssets";
import { STRIPE_CONFIG, SubscriptionType } from "../utils/stripeConfig";
import { useStripeService } from "../utils/stripeService";
import { usePremium } from "../contexts/PremiumContext";
import { useToast } from "../contexts/ToastContext";

const { width } = Dimensions.get("window");

interface SubscriptionCardProps {
  type: SubscriptionType;
  isSelected: boolean;
  onSelect: (type: SubscriptionType) => void;
  styles: any;
  colors: any;
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  type,
  isSelected,
  onSelect,
  styles,
  colors,
}) => {
  const product = STRIPE_CONFIG.products[type];
  const features = STRIPE_CONFIG.features[type];
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      style={[styles.subscriptionCard, isSelected && styles.selectedCard]}
      onPress={() => onSelect(type)}
    >
      <LinearGradient
        colors={
          isSelected
            ? [colors.primary, colors.accent]
            : [colors.surface, colors.surface]
        }
        style={styles.cardGradient}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{product.displayName}</Text>
          <Text style={styles.cardPrice}>
            {new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "EUR",
            }).format(product.price / 100)}
            <Text style={styles.cardInterval}>
              /{product.interval === "month" ? "mois" : "an"}
            </Text>
          </Text>
        </View>

        <View style={styles.cardFeatures}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <MaterialCommunityIcons
                name="check-circle"
                size={16}
                color={colors.success}
              />
              <Text style={styles.featureText}>
                {t(`premium.features.${feature}`) || feature}
              </Text>
            </View>
          ))}
        </View>

        {type === "yearly" && (
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>Économisez 17%</Text>
          </View>
        )}

        {isSelected && (
          <View style={styles.selectedIndicator}>
            <MaterialCommunityIcons
              name="check-circle"
              size={24}
              color={colors.secondary}
            />
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const PaymentForm: React.FC<{
  selectedSubscription: SubscriptionType;
  onPaymentSuccess: () => void;
  onPaymentError: (error: any) => void;
}> = ({ selectedSubscription, onPaymentSuccess, onPaymentError }) => {
  const { confirmPayment, loading } = useConfirmPayment();
  const { stripeService, handlePaymentSuccess, handlePaymentError } =
    useStripeService();
  const [cardDetails, setCardDetails] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    if (!cardDetails?.complete) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs de la carte.");
      return;
    }

    setIsProcessing(true);

    try {
      // Créer le payment intent côté serveur
      const { clientSecret } = await stripeService.createPaymentIntent(
        selectedSubscription
      );

      // Confirmer le paiement avec Stripe
      const { error, paymentIntent } = await confirmPayment(clientSecret, {
        paymentMethodType: "Card",
        paymentMethodData: {
          billingDetails: {
            email: "user@example.com", // À récupérer depuis le profil utilisateur
          },
        },
      });

      if (error) {
        handlePaymentError(error);
      } else if (paymentIntent) {
        // Créer l'abonnement côté serveur
        await stripeService.createSubscription(
          selectedSubscription,
          paymentIntent.payment_method as string
        );

        handlePaymentSuccess(selectedSubscription);
        onPaymentSuccess();
      }
    } catch (error) {
      console.error("❌ Erreur paiement:", error);
      onPaymentError(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.paymentForm}>
      <Text style={styles.formTitle}>Informations de Paiement</Text>

      <CardField
        postalCodeEnabled={false}
        placeholder={{
          number: "4242 4242 4242 4242",
        }}
        cardStyle={{
          backgroundColor: "#FFFFFF",
          textColor: "#000000",
        }}
        style={styles.cardField}
        onCardChange={(cardDetails) => setCardDetails(cardDetails)}
      />

      <TouchableOpacity
        style={[
          styles.payButton,
          (!cardDetails?.complete || isProcessing) && styles.payButtonDisabled,
        ]}
        onPress={handlePayment}
        disabled={!cardDetails?.complete || isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.payButtonText}>
            Payer{" "}
            {new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "EUR",
            }).format(STRIPE_CONFIG.products[selectedSubscription].price / 100)}
          </Text>
        )}
      </TouchableOpacity>

      <Text style={styles.securityText}>🔒 Paiement sécurisé par Stripe</Text>
    </View>
  );
};

const PremiumPaymentScreen: React.FC = () => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const currentTheme = useCurrentTheme();
  const router = useRouter();
  const { activatePremium } = usePremium();
  const { showToast } = useToast();

  const [selectedSubscription, setSelectedSubscription] =
    useState<SubscriptionType>("monthly");
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const styles = getStyles(colors, currentTheme);

  const handleSubscriptionSelect = (type: SubscriptionType) => {
    setSelectedSubscription(type);
  };

  const handlePaymentSuccess = async () => {
    try {
      // Activer le premium dans l'app
      await activatePremium(selectedSubscription, "stripe_subscription_id");

      showToast({
        type: "success",
        title: "Abonnement Activé !",
        message: "Votre abonnement premium est maintenant actif.",
      });

      // Retourner à l'écran précédent
      router.back();
    } catch (error) {
      console.error("❌ Erreur activation premium:", error);
      showToast({
        type: "error",
        title: "Erreur",
        message: "Impossible d'activer l'abonnement.",
      });
    }
  };

  const handlePaymentError = (error: any) => {
    showToast({
      type: "error",
      title: "Erreur de Paiement",
      message: error.message || "Une erreur est survenue lors du paiement.",
    });
  };

  return (
    <StripeProvider publishableKey={STRIPE_CONFIG.publishableKey}>
      <ThemedImageBackground>
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Choisissez votre Plan Premium</Text>
            <Text style={styles.subtitle}>
              Débloquez toutes les fonctionnalités premium
            </Text>
          </View>

          <View style={styles.subscriptionsContainer}>
            <SubscriptionCard
              type="monthly"
              isSelected={selectedSubscription === "monthly"}
              onSelect={handleSubscriptionSelect}
              styles={styles}
              colors={colors}
            />

            <SubscriptionCard
              type="yearly"
              isSelected={selectedSubscription === "yearly"}
              onSelect={handleSubscriptionSelect}
              styles={styles}
              colors={colors}
            />

            <SubscriptionCard
              type="family"
              isSelected={selectedSubscription === "family"}
              onSelect={handleSubscriptionSelect}
              styles={styles}
              colors={colors}
            />
          </View>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => setShowPaymentForm(true)}
          >
            <Text style={styles.continueButtonText}>Continuer</Text>
          </TouchableOpacity>

          {showPaymentForm && (
            <PaymentForm
              selectedSubscription={selectedSubscription}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
            />
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Vous pouvez annuler votre abonnement à tout moment
            </Text>
          </View>
        </ScrollView>
      </ThemedImageBackground>
    </StripeProvider>
  );
};

const getStyles = (colors: any, currentTheme: "light" | "dark") =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
    },
    header: {
      alignItems: "center",
      marginBottom: 30,
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: colors.text.primary,
      textAlign: "center",
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 16,
      color: colors.text.secondary,
      textAlign: "center",
    },
    subscriptionsContainer: {
      gap: 20,
      marginBottom: 30,
    },
    subscriptionCard: {
      borderRadius: 16,
      overflow: "hidden",
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    selectedCard: {
      elevation: 8,
      shadowOpacity: 0.2,
    },
    cardGradient: {
      padding: 20,
      position: "relative",
    },
    cardHeader: {
      marginBottom: 15,
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: "#FFFFFF",
      marginBottom: 5,
    },
    cardPrice: {
      fontSize: 24,
      fontWeight: "bold",
      color: "#FFFFFF",
    },
    cardInterval: {
      fontSize: 16,
      fontWeight: "normal",
    },
    cardFeatures: {
      gap: 8,
    },
    featureItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    featureText: {
      fontSize: 14,
      color: "#FFFFFF",
      flex: 1,
    },
    savingsBadge: {
      position: "absolute",
      top: 10,
      right: 10,
      backgroundColor: colors.secondary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    savingsText: {
      fontSize: 12,
      fontWeight: "bold",
      color: "#000000",
    },
    selectedIndicator: {
      position: "absolute",
      top: 10,
      left: 10,
    },
    continueButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: "center",
      marginBottom: 20,
    },
    continueButtonText: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#FFFFFF",
    },
    paymentForm: {
      backgroundColor: colors.surface,
      padding: 20,
      borderRadius: 16,
      marginBottom: 20,
    },
    formTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.text.primary,
      marginBottom: 20,
      textAlign: "center",
    },
    cardField: {
      height: 50,
      marginBottom: 20,
    },
    payButton: {
      backgroundColor: colors.success,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: "center",
      marginBottom: 15,
    },
    payButtonDisabled: {
      backgroundColor: colors.text.muted,
    },
    payButtonText: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#FFFFFF",
    },
    securityText: {
      fontSize: 12,
      color: colors.text.secondary,
      textAlign: "center",
    },
    footer: {
      alignItems: "center",
      marginTop: 20,
    },
    footerText: {
      fontSize: 12,
      color: colors.text.secondary,
      textAlign: "center",
    },
  });

export default PremiumPaymentScreen;
