import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../utils/apiClient";
import { usePremium } from "../contexts/PremiumContext";

const PaymentSuccessScreen: React.FC = () => {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const { activatePremium, checkPremiumStatus } = usePremium();

  // 🚀 NOUVEAU : Traitement du succès de paiement et nettoyage
  useEffect(() => {
    const processPaymentSuccess = async () => {
      try {
        setIsProcessing(true);

        // Récupérer les données d'inscription en attente
        const pendingRegistration = await AsyncStorage.getItem(
          "pending_registration"
        );

        if (pendingRegistration) {
          const registrationData = JSON.parse(pendingRegistration);
          // 🚀 NOUVEAU : Auto-login après paiement

          // ⏱️ Attendre un peu que le webhook soit traité
          await new Promise((resolve) => setTimeout(resolve, 2000));

          try {
            const loginResult = await apiClient.loginWithCredentials({
              email: registrationData.email,
              password: registrationData.password,
            });

            if (loginResult.success && loginResult.data) {
              setLoginSuccess(true);

              // Synchroniser les données utilisateur avec la même structure que le login normal
              const userData = loginResult.data.user || loginResult.data;
              const userDataToStore = {
                id: userData.id,
                user_id: userData.id,
                email: userData.email,
                user_first_name: userData.user_first_name,
                premium_status: userData.premium_status,
                subscription_type: userData.subscription_type,
                subscription_id: userData.subscription_id,
                premium_expiry: userData.premium_expiry,
                premium_activated_at: userData.premium_activated_at, // 🔑 AJOUT MANQUANT !
                language: userData.language,
                last_sync: new Date().toISOString(),
                device_id: userData.device_id,
              };

              // Stocker les données utilisateur structurées
              await AsyncStorage.setItem(
                "user_data",
                JSON.stringify(userDataToStore)
              );
              await AsyncStorage.setItem("is_logged_in", "true");

              // 🔑 CRITIQUE : Marquer comme connexion explicite pour que l'app reconnaisse l'utilisateur
              await AsyncStorage.setItem("explicit_connection", "true");

              // 🎯 CRITIQUE : Synchroniser avec le contexte Premium
              const subscriptionType = userData.subscription_type || "yearly";

              // Déterminer les features selon le type d'abonnement
              let features = [
                "prayer_analytics",
                "custom_adhan_sounds",
                "premium_themes",
                "unlimited_bookmarks",
                "ad_free",
              ];
              if (subscriptionType === "yearly") {
                features.push("priority_support", "monthly_stats");
              } else if (subscriptionType === "family") {
                features.push(
                  "priority_support",
                  "monthly_stats",
                  "family_management",
                  "child_profiles"
                );
              }

              const premiumUser = {
                isPremium: true,
                subscriptionType: subscriptionType,
                subscriptionId: userData.subscription_id,
                expiryDate: userData.premium_expiry
                  ? new Date(userData.premium_expiry)
                  : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                features: features,
                hasPurchasedPremium: true,
                premiumActivatedAt: new Date(),
              };

              await AsyncStorage.setItem(
                "@prayer_app_premium_user",
                JSON.stringify(premiumUser)
              );

              // 🚀 CRITIQUE : Activer le premium dans le contexte (comme fait l'inscription normale)
              await activatePremium(
                subscriptionType as "monthly" | "yearly" | "family",
                userData.subscription_id || `stripe-${userData.id}`
              );

              // 🔄 FORCER le refresh du contexte Premium pour que l'UI se mette à jour
              await checkPremiumStatus();

              // ⏱️ Petit délai pour laisser tous les contextes se synchroniser
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          } catch (loginError) {
            // En cas d'échec silencieux, l'utilisateur pourra se connecter manuellement
          }
        }

        // Nettoyer les données d'inscription
        await AsyncStorage.removeItem("pending_registration");
      } catch (error) {
        // En cas d'erreur, continuer silencieusement
      } finally {
        setIsProcessing(false);
      }
    };

    processPaymentSuccess();
  }, []);

  const handleContinue = () => {
    // Rediriger vers Settings de manière stable sans refresh
    setTimeout(() => {
      router.push("/settings");
    }, 100);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>✅ Paiement Réussi !</Text>
        <Text style={styles.message}>
          {isProcessing
            ? "Création de votre compte en cours..."
            : loginSuccess
            ? "Votre compte a été créé et vous êtes maintenant connecté !"
            : "Votre compte a été créé avec succès !"}
        </Text>
        <TouchableOpacity
          style={[styles.button, isProcessing && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={isProcessing}
        >
          <Text style={styles.buttonText}>
            {isProcessing ? "Traitement..." : "Voir mon compte"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  content: {
    backgroundColor: "#333333",
    borderRadius: 15,
    padding: 30,
    alignItems: "center",
    maxWidth: 300,
    width: "100%",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 30,
  },
  button: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonDisabled: {
    backgroundColor: "#666666",
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
});

export default PaymentSuccessScreen;
