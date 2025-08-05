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
import AsyncStorage from "@react-native-async-storage/async-storage";

import ThemedImageBackground from "../components/ThemedImageBackground";
import { useThemeColors, useCurrentTheme } from "../hooks/useThemeAssets";
import { STRIPE_CONFIG } from "../utils/stripeConfig";

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: string;
  features: string[];
  popular?: boolean;
  comingSoon?: boolean;
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
    comingSoon: true,
  },
];

const PremiumPaymentScreen: React.FC = () => {
  const colors = useThemeColors();
  const currentTheme = useCurrentTheme();
  const router = useRouter();

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
        console.log("🔍 Données d'inscription trouvées:", registrationData);
        if (registrationData) {
          const parsedData = JSON.parse(registrationData);
          console.log("✅ Données parsées:", parsedData);
          setPendingRegistration(parsedData);
        } else {
          console.log("❌ Aucune donnée d'inscription trouvée");
        }
      } catch {
        console.error("❌ Erreur chargement données inscription");
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

    if (selectedPlan.comingSoon) {
      Alert.alert("Plan non disponible", "Ce plan sera bientôt disponible.");
      return;
    }

    setIsLoading(true);

    try {
      // Préparer les données pour la session de paiement

      // Créer une session de paiement Stripe Checkout
      const response = await fetch(
        `${STRIPE_CONFIG.apiUrl}/create-checkout-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subscriptionType: selectedPlan.id,
            customerEmail: pendingRegistration.email,
            customerName: pendingRegistration.user_first_name,
            customerLanguage: pendingRegistration.language || "fr",
            customerPassword: pendingRegistration.password, // 🔑 AJOUT du mot de passe
            successUrl: "prayertimesapp://payment-success",
            cancelUrl: "prayertimesapp://payment-cancel",
          }),
        }
      );

      // Vérifier le statut de la réponse

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }

      const responseText = await response.text();

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        throw new Error("Réponse invalide du serveur");
      }

      const { sessionUrl } = responseData;

      // Stocker les données d'inscription pour la récupération après paiement
      await AsyncStorage.setItem(
        "pending_registration",
        JSON.stringify({
          ...pendingRegistration,
          subscription_type: selectedPlan.id,
          plan_price: selectedPlan.price,
        })
      );

      // Ouvrir Stripe Checkout dans le navigateur
      try {
        const { Linking } = await import("react-native");
        await Linking.openURL(sessionUrl);
      } catch {
        Alert.alert("Erreur", "Impossible d'ouvrir la page de paiement");
      }
    } catch {
      Alert.alert(
        "Erreur",
        "Impossible d'initialiser le paiement. Veuillez réessayer."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Vérifier si les données d'inscription sont disponibles
  console.log("🔍 État pendingRegistration:", pendingRegistration);

  if (!pendingRegistration) {
    console.log("❌ Affichage de l'erreur - pas de données d'inscription");
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

  console.log(
    "✅ Affichage de la page de paiement avec données:",
    pendingRegistration
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
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
                plan.comingSoon && styles.comingSoonCard,
              ]}
              onPress={() => !plan.comingSoon && handlePlanSelect(plan)}
              disabled={plan.comingSoon}
            >
              <LinearGradient
                colors={
                  selectedPlan.id === plan.id
                    ? [colors.primary, colors.accent]
                    : plan.comingSoon
                    ? [colors.surfaceVariant, colors.surfaceVariant]
                    : [colors.surface, colors.surface]
                }
                style={styles.cardGradient}
              >
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>Populaire</Text>
                  </View>
                )}
                {plan.comingSoon && (
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>
                      Bientôt disponible
                    </Text>
                  </View>
                )}

                <View style={styles.cardHeader}>
                  <Text
                    style={[
                      styles.cardTitle,
                      plan.comingSoon && styles.comingSoonText,
                    ]}
                  >
                    {plan.name}
                  </Text>
                  <Text
                    style={[
                      styles.cardPrice,
                      plan.comingSoon && styles.comingSoonText,
                    ]}
                  >
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
                        color={
                          plan.comingSoon ? colors.textTertiary : colors.success
                        }
                      />
                      <Text
                        style={[
                          styles.featureText,
                          plan.comingSoon && styles.comingSoonText,
                        ]}
                      >
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>

                {selectedPlan.id === plan.id && !plan.comingSoon && (
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
            <ActivityIndicator color={colors.text} />
          ) : (
            <>
              <MaterialCommunityIcons
                name="credit-card"
                size={20}
                color={colors.text}
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

        {/* Espace pour éviter que le bouton soit caché par le menu */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const getStyles = (colors: any, currentTheme: "light" | "dark") =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      paddingBottom: 100, // Espace pour éviter que le bouton soit caché par le menu
    },
    header: {
      alignItems: "center",
      marginBottom: 30,
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: colors.text,
      textAlign: "center",
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
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
    comingSoonCard: {
      opacity: 0.6,
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
      color: colors.text,
    },
    comingSoonBadge: {
      position: "absolute",
      top: 10,
      right: 10,
      backgroundColor: colors.warning,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    comingSoonText: {
      fontSize: 12,
      fontWeight: "bold",
      color: colors.text,
    },
    cardHeader: {
      marginBottom: 15,
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 5,
    },
    cardPrice: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
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
      color: colors.text,
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
      color: colors.text,
      marginBottom: 15,
      textAlign: "center",
    },
    paymentInfoText: {
      fontSize: 14,
      color: colors.text,
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
      color: colors.text,
    },
    securityText: {
      fontSize: 12,
      color: colors.text,
      textAlign: "center",
      marginBottom: 20,
    },
    footer: {
      alignItems: "center",
      marginTop: 20,
    },
    footerText: {
      fontSize: 12,
      color: colors.text,
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
      color: colors.text,
    },
    bottomSpacer: {
      height: 120, // Espace suffisant pour éviter que le bouton soit caché par le menu
    },
  });

export default PremiumPaymentScreen;
