import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { LinearGradient } from "@/components/ui/LinearGradientView";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PurchasesPackage } from "react-native-purchases";

import ThemedImageBackground from "../components/ThemedImageBackground";
import { useThemeColors } from "../hooks/useThemeAssets";
import { useCurrentTheme } from "../hooks/useThemeColor"; // 🔧 Import unifié
import { STRIPE_CONFIG } from "../utils/stripeConfig";
import { IapService } from "../utils/iapService";
import { IAP_CONFIG } from "../utils/iapConfig";
import { formatPrice } from "../utils/monetization";

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
  const { push, back } = useRouter();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(
    subscriptionPlans[0]
  );
  const [isLoading, setIsLoading] = useState(false);
  const [pendingRegistration, setPendingRegistration] = useState<any>(null);
  const [iapPackages, setIapPackages] = useState<PurchasesPackage[]>([]);

  const styles = getStyles(colors, currentTheme);

  // Récupérer les données d'inscription en attente + offres IAP (iOS)
  useFocusEffect(
    useCallback(() => {
      const loadScreenData = async () => {
        try {
          const registrationData = await AsyncStorage.getItem(
            "pending_registration"
          );
          console.log("🔍 Données d'inscription trouvées (focus):", registrationData);
          if (registrationData) {
            const parsedData = JSON.parse(registrationData);
            console.log("✅ Données parsées (focus):", parsedData);
            setPendingRegistration(parsedData);
            if (Platform.OS === "ios" && parsedData.email) {
              try {
                const iap = IapService.getInstance();
                await iap.login(String(parsedData.email).trim());
              } catch (e) {
                console.warn("🍎 [IAP] RevenueCat logIn (écran paiement):", e);
              }
            }
          } else {
            console.log("❌ Aucune donnée d'inscription trouvée (focus)");
          }

          if (Platform.OS === "ios") {
            try {
              const iapService = IapService.getInstance();
              const offerings = await iapService.getOfferings();
              if (offerings?.availablePackages) {
                setIapPackages(offerings.availablePackages);
                console.log(
                  "🍎 [IAP] Offres chargées:",
                  offerings.availablePackages.length
                );
              }
            } catch (error) {
              console.error("❌ [IAP] Erreur chargement offres:", error);
            }
          }
        } catch {
          console.error("❌ Erreur chargement données inscription (focus)");
        }
      };

      void loadScreenData();
    }, [])
  );

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
      // --- MODE IOS (REVENUECAT) ---
      if (Platform.OS === "ios") {
        const iapService = IapService.getInstance();

        // Trouver le package correspondant au plan sélectionné
        const productId =
          IAP_CONFIG.products[
            selectedPlan.id as keyof typeof IAP_CONFIG.products
          ]?.id;
        const pack = iapPackages.find(
          (p) => p.product.identifier === productId
        );

        if (!pack) {
          throw new Error("Produit non trouvé sur l'App Store.");
        }

        const success = await iapService.purchasePackage(pack);

        if (success) {
          console.log("🍎 [IAP] Achat réussi via Apple");

          try {
            await iapService.login(String(pendingRegistration.email).trim());
          } catch (loginErr) {
            console.warn("🍎 [IAP] RevenueCat logIn après achat:", loginErr);
          }

          // 🚀 SYNCHRONISATION BACKEND (Modèle Stripe)
          // On informe notre backend de l'achat pour créer/mettre à jour le compte
          try {
            const registerResponse = await fetch(
              "https://myadhanapp.com/api/register-iap.php",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: pendingRegistration.email,
                  password: pendingRegistration.password,
                  subscriptionType: selectedPlan.id,
                  name: pendingRegistration.user_first_name,
                  language: pendingRegistration.language || "fr",
                  transactionId: pack.product.identifier, // Ou un ID de transaction réel de RevenueCat
                }),
              }
            );

            if (!registerResponse.ok) {
              console.error("❌ Erreur sync backend Apple IAP");
            }
          } catch (syncError) {
            console.error(
              "❌ Erreur réseau sync backend Apple IAP:",
              syncError
            );
          }

          // Stocker les données d'inscription pour la récupération
          await AsyncStorage.setItem(
            "pending_registration",
            JSON.stringify({
              ...pendingRegistration,
              subscription_type: selectedPlan.id,
              plan_price: selectedPlan.price,
              payment_method: "apple_iap",
            })
          );
          // Rediriger vers le succès
          push("/payment-success");
        } else {
          setIsLoading(false);
        }
        return;
      }

      // --- MODE ANDROID (STRIPE) ---
      // Préparer les données pour la session de paiement
      console.log("🔍 Plan sélectionné:", selectedPlan);
      console.log("🔍 ID du plan:", selectedPlan.id);
      console.log("🔍 Données d'inscription:", pendingRegistration);

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

      console.log("🔍 Données envoyées à l'API:", {
        subscriptionType: selectedPlan.id,
        customerEmail: pendingRegistration.email,
        customerName: pendingRegistration.user_first_name,
        customerLanguage: pendingRegistration.language || "fr",
        customerPassword: "***HIDDEN***",
        successUrl: "prayertimesapp://payment-success",
        cancelUrl: "prayertimesapp://payment-cancel",
      });

      // 🚀 DEBUG : Mode de l'application
      console.log("🔧 Mode debug:", __DEV__);
      console.log("🔧 Platform:", Platform.OS);

      // Vérifier le statut de la réponse

      // Vérifier le statut de la réponse

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }

      const responseText = await response.text();

      let responseData;
      try {
        // 🚀 DEBUG : Gestion des réponses multiples JSON
        console.log("🔍 Réponse brute du serveur:", responseText);

        // Essayer de parser la réponse complète
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.log("❌ Erreur parsing JSON:", parseError);

        // Essayer de trouver le dernier JSON valide dans la réponse
        const jsonMatches = responseText.match(/\{[^{}]*"sessionUrl"[^{}]*\}/g);
        if (jsonMatches && jsonMatches.length > 0) {
          const lastJson = jsonMatches[jsonMatches.length - 1];
          console.log("🔍 Dernier JSON trouvé:", lastJson);
          try {
            responseData = JSON.parse(lastJson);
          } catch (secondError) {
            console.log("❌ Erreur parsing dernier JSON:", secondError);
            throw new Error(
              "Réponse invalide du serveur - impossible de parser JSON"
            );
          }
        } else {
          // Essayer de trouver n'importe quel JSON avec sessionUrl
          const allJsonMatches = responseText.match(/\{[^{}]*\}/g);
          if (allJsonMatches) {
            for (let i = allJsonMatches.length - 1; i >= 0; i--) {
              try {
                const testJson = JSON.parse(allJsonMatches[i]);
                if (testJson.sessionUrl) {
                  console.log(
                    "🔍 JSON avec sessionUrl trouvé:",
                    allJsonMatches[i]
                  );
                  responseData = testJson;
                  break;
                }
              } catch {
                // Continuer avec le prochain JSON
              }
            }
          }

          if (!responseData) {
            throw new Error(
              "Réponse invalide du serveur - aucun JSON valide trouvé"
            );
          }
        }
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
        // 🚀 DEBUG : Vérifier l'URL avant de l'ouvrir
        console.log("🔗 URL Stripe à ouvrir:", sessionUrl);

        // Vérifier si l'URL est valide
        if (!sessionUrl || !sessionUrl.startsWith("https://")) {
          throw new Error("URL de paiement invalide");
        }

        // Vérifier si l'app peut ouvrir l'URL
        const canOpen = await Linking.canOpenURL(sessionUrl);
        console.log("🔗 Peut ouvrir l'URL:", canOpen);

        if (!canOpen) {
          throw new Error("Impossible d'ouvrir l'URL de paiement");
        }

        await Linking.openURL(sessionUrl);
        console.log("✅ URL ouverte avec succès");
      } catch (error) {
        console.error("❌ Erreur ouverture URL:", error);
        // En mode debug, proposer de copier l'URL
        if (__DEV__) {
          Alert.alert(
            "Mode Debug - Erreur ouverture URL",
            `Impossible d'ouvrir la page de paiement: ${
              error instanceof Error ? error.message : "Erreur inconnue"
            }\n\nVoulez-vous copier l'URL dans le presse-papiers ?`,
            [
              {
                text: "Annuler",
                style: "cancel",
              },
              {
                text: "Copier URL",
                onPress: async () => {
                  try {
                    const { Clipboard } = await import("react-native");
                    await Clipboard.setString(sessionUrl);
                    Alert.alert("Succès", "URL copiée dans le presse-papiers");
                  } catch (clipboardError) {
                    console.error(
                      "❌ Erreur copie presse-papiers:",
                      clipboardError
                    );
                    Alert.alert("Erreur", "Impossible de copier l'URL");
                  }
                },
              },
            ]
          );
        } else {
          Alert.alert(
            "Erreur",
            `Impossible d'ouvrir la page de paiement: ${
              error instanceof Error ? error.message : "Erreur inconnue"
            }`
          );
        }
      }
    } catch (error) {
      console.error("❌ Erreur détaillée paiement:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erreur inconnue";
      Alert.alert(
        "Erreur",
        `Impossible d'initialiser le paiement: ${errorMessage}. Veuillez réessayer.`
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
            <Pressable
              style={styles.backButton}
              onPress={() => back()}
            >
              <Text style={styles.backButtonText}>Retour</Text>
            </Pressable>
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
            <Pressable
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
                    {formatPrice(plan.price, "EUR")}
                    <Text style={styles.cardInterval}>/{plan.interval}</Text>
                  </Text>
                </View>

                <View style={styles.cardFeatures}>
                  {plan.features.map((feature) => (
                    <View key={feature} style={styles.featureItem}>
                      <MCIcon
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
                    <MCIcon
                      name="check-circle"
                      size={24}
                      color={colors.secondary}
                    />
                  </View>
                )}
              </LinearGradient>
            </Pressable>
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

        <Pressable
          style={[styles.payButton, isLoading && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <>
              <MCIcon
                name="credit-card"
                size={20}
                color={colors.text}
              />
              <Text style={styles.payButtonText}>
                Payer{" "}
                {formatPrice(selectedPlan.price, "EUR")}
              </Text>
            </>
          )}
        </Pressable>

        <Text style={styles.securityText}>
          {Platform.OS === "ios"
            ? "🔒 Paiement sécurisé par Apple App Store"
            : "🔒 Paiement sécurisé par Stripe"}
        </Text>

        {/* 🆕 NOUVEAU : Liens CGU et Politique de Confidentialité (requis par Apple) */}
        <View style={styles.legalLinks}>
          <Text style={styles.legalText}>
            En continuant, vous acceptez nos{" "}
            <Text
              style={styles.legalLink}
              onPress={() =>
                Linking.openURL("https://www.myadhanapp.com/public/terms-of-service.html")
              }
            >
              Conditions d&apos;Utilisation
            </Text>{" "}
            et notre{" "}
            <Text
              style={styles.legalLink}
              onPress={() =>
                Linking.openURL(
                  "https://www.myadhanapp.com/public/privacy-policy.html"
                )
              }
            >
              Politique de Confidentialité
            </Text>
            .
          </Text>
        </View>

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

const getStyles = (colors: any, currentTheme: "light" | "dark" | "morning" | "sunset") => {
  const isLightTheme = currentTheme === "light" || currentTheme === "morning";
  return StyleSheet.create({
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
      boxShadow: "0px 2px 4px rgba(0,0,0,0.1)",
    },
    selectedPlanCard: {
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
    legalLinks: {
      paddingHorizontal: 20,
      marginBottom: 15,
    },
    legalText: {
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 16,
    },
    legalLink: {
      color: "#667eea",
      textDecorationLine: "underline",
      fontWeight: "600",
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
};

export default PremiumPaymentScreen;
