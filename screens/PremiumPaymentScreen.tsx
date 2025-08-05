import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";

import ThemedImageBackground from "../components/ThemedImageBackground";
import { useThemeColors, useCurrentTheme } from "../hooks/useThemeAssets";
import { usePremium } from "../contexts/PremiumContext";
import { useToast } from "../contexts/ToastContext";
import apiClient from "../utils/apiClient";

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: string;
  features: string[];
  popular?: boolean;
}

const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "monthly",
    name: "Premium Mensuel",
    price: 1.99,
    interval: "mois",
    features: [
      "Analyses de prières",
      "Sons d'adhan personnalisés",
      "Thèmes premium",
      "Marque-pages illimités",
      "Sans publicités",
    ],
  },
  {
    id: "yearly",
    name: "Premium Annuel",
    price: 19.99,
    interval: "an",
    features: [
      "Analyses de prières",
      "Sons d'adhan personnalisés",
      "Thèmes premium",
      "Marque-pages illimités",
      "Sans publicités",
      "Support prioritaire",
      "Statistiques mensuelles",
    ],
    popular: true,
  },
  {
    id: "family",
    name: "Premium Familial",
    price: 29.99,
    interval: "an",
    features: [
      "Analyses de prières",
      "Sons d'adhan personnalisés",
      "Thèmes premium",
      "Marque-pages illimités",
      "Sans publicités",
      "Support prioritaire",
      "Statistiques mensuelles",
      "Gestion familiale",
      "Profils enfants",
    ],
  },
];

const PremiumPaymentScreen: React.FC = () => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const currentTheme = useCurrentTheme();
  const router = useRouter();
  const { activatePremium } = usePremium();
  const { showToast } = useToast();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(
    subscriptionPlans[0]
  );
  const [isLoading, setIsLoading] = useState(false);
  const [pendingRegistration, setPendingRegistration] = useState<any>(null);

  const styles = getStyles(colors, currentTheme);

  // Récupérer les données d'inscription en attente
  useEffect(() => {
    const loadPendingRegistration = async () => {
      try {
        const registrationData = await AsyncStorage.getItem(
          "pending_registration"
        );
        if (registrationData) {
          setPendingRegistration(JSON.parse(registrationData));
        }
      } catch (error) {
        console.error("Erreur chargement données inscription:", error);
      }
    };

    loadPendingRegistration();
  }, []);

  const handlePlanSelect = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
  };

  const handlePayment = async () => {
    if (!pendingRegistration) {
      Alert.alert("Erreur", "Aucune donnée d'inscription trouvée.");
      return;
    }

    setIsLoading(true);

    try {
      // Simuler un délai de paiement
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Créer le compte utilisateur avec les données en attente
      const registrationData = {
        ...pendingRegistration,
        premium_status: 1,
        subscription_type: selectedPlan.id,
        subscription_id: `stripe_${selectedPlan.id}_${Date.now()}`,
        premium_expiry: new Date(
          Date.now() +
            (selectedPlan.id === "monthly" ? 30 : 365) * 24 * 60 * 60 * 1000
        ).toISOString(),
      };

      const result = await apiClient.registerWithData(registrationData);

      if (result.success && result.data) {
        const userData = result.data.user || result.data;

        // Activer le premium dans l'app
        await activatePremium(selectedPlan.id as any, userData.subscription_id);

        // Nettoyer les données en attente
        await AsyncStorage.removeItem("pending_registration");

        showToast({
          type: "success",
          title: "Inscription Réussie !",
          message: "Votre compte premium a été créé avec succès.",
        });

        // Retourner à l'écran précédent
        router.back();
      } else {
        throw new Error(
          result.message || "Erreur lors de la création du compte"
        );
      }
    } catch (error) {
      console.error("❌ Erreur paiement:", error);
      showToast({
        type: "error",
        title: "Erreur de Paiement",
        message:
          error instanceof Error
            ? error.message
            : "Une erreur est survenue lors du paiement.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Vérifier si les données d'inscription sont disponibles
  if (!pendingRegistration) {
    return (
      <ThemedImageBackground>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Erreur</Text>
            <Text style={styles.subtitle}>
              Aucune donnée d&apos;inscription trouvée. Veuillez retourner à la
              page d&apos;inscription.
            </Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>Retour</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ThemedImageBackground>
    );
  }

  return (
    <ThemedImageBackground>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Choisissez votre Plan Premium</Text>
          <Text style={styles.subtitle}>
            Débloquez toutes les fonctionnalités premium
          </Text>
        </View>

        <View style={styles.plansContainer}>
          {subscriptionPlans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                selectedPlan.id === plan.id && styles.selectedPlanCard,
                plan.popular && styles.popularPlanCard,
              ]}
              onPress={() => handlePlanSelect(plan)}
            >
              <LinearGradient
                colors={
                  selectedPlan.id === plan.id
                    ? [colors.primary, colors.accent]
                    : [colors.surface, colors.surface]
                }
                style={styles.cardGradient}
              >
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>Populaire</Text>
                  </View>
                )}

                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{plan.name}</Text>
                  <Text style={styles.cardPrice}>
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    }).format(plan.price)}
                    <Text style={styles.cardInterval}>/{plan.interval}</Text>
                  </Text>
                </View>

                <View style={styles.cardFeatures}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={16}
                        color={colors.success}
                      />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                {selectedPlan.id === plan.id && (
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
          ))}
        </View>

        <View style={styles.paymentInfo}>
          <Text style={styles.paymentInfoTitle}>Informations de Paiement</Text>
          <Text style={styles.paymentInfoText}>
            Email: {pendingRegistration.email}
          </Text>
          <Text style={styles.paymentInfoText}>
            Prénom: {pendingRegistration.user_first_name}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.payButton, isLoading && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <MaterialCommunityIcons
                name="credit-card"
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.payButtonText}>
                Payer{" "}
                {new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                }).format(selectedPlan.price)}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.securityText}>🔒 Paiement sécurisé par Stripe</Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Vous pouvez annuler votre abonnement à tout moment
          </Text>
        </View>
      </ScrollView>
    </ThemedImageBackground>
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
    plansContainer: {
      gap: 20,
      marginBottom: 30,
    },
    planCard: {
      borderRadius: 16,
      overflow: "hidden",
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    selectedPlanCard: {
      elevation: 8,
      shadowOpacity: 0.2,
    },
    popularPlanCard: {
      borderWidth: 2,
      borderColor: colors.primary,
    },
    cardGradient: {
      padding: 20,
      position: "relative",
    },
    popularBadge: {
      position: "absolute",
      top: 10,
      right: 10,
      backgroundColor: colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    popularText: {
      fontSize: 12,
      fontWeight: "bold",
      color: "#FFFFFF",
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
    selectedIndicator: {
      position: "absolute",
      top: 10,
      left: 10,
    },
    paymentInfo: {
      backgroundColor: colors.surface,
      padding: 20,
      borderRadius: 16,
      marginBottom: 20,
    },
    paymentInfoTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.text.primary,
      marginBottom: 15,
      textAlign: "center",
    },
    paymentInfoText: {
      fontSize: 14,
      color: colors.text.secondary,
      marginBottom: 5,
    },
    payButton: {
      backgroundColor: colors.success,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: "center",
      marginBottom: 15,
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
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
      marginBottom: 20,
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
    backButton: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      marginTop: 20,
    },
    backButtonText: {
      fontSize: 16,
      fontWeight: "bold",
      color: "#FFFFFF",
    },
  });

export default PremiumPaymentScreen;
