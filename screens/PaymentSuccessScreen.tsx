import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { usePremium } from "../contexts/PremiumContext";
import {
  syncUserAfterPayment,
  checkUserSyncStatus,
  retryUserSync,
  PaymentSyncResult,
} from "../utils/paymentSync";

const PaymentSuccessScreen: React.FC = () => {
  const { push } = useRouter();
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(true);
  const [syncResult, setSyncResult] = useState<PaymentSyncResult | null>(null);
  const { activatePremium, checkPremiumStatus } = usePremium();

  const processPaymentSuccess = useCallback(async () => {
    try {
      console.log("🔄 Début traitement succès paiement...");

      const result = await syncUserAfterPayment();
      setSyncResult(result);

      if (result.success && result.userData) {
        console.log("✅ Synchronisation réussie !");

        const currentStatus = await checkUserSyncStatus();
        console.log("🔍 Statut de synchronisation APRÈS sync:", currentStatus);

        try {
          const subscriptionType =
            result.userData.subscription_type || "yearly";
          console.log("🚀 Activation du premium:", subscriptionType);

          await activatePremium(
            subscriptionType as "monthly" | "yearly" | "family",
            result.userData.subscription_id || `stripe-${result.userData.id}`
          );

          console.log("🔄 Vérification du statut premium...");
          await checkPremiumStatus();

          await new Promise<void>((resolve) => {
            setTimeout(resolve, 1000);
          });
          console.log("✅ Premium activé avec succès !");

          await AsyncStorage.removeItem("pending_registration");
          console.log(
            "🧹 Données d'inscription nettoyées après synchronisation complète"
          );

          const finalStatus = await checkUserSyncStatus();
          console.log("🔍 Statut final après activation premium:", finalStatus);
        } catch (premiumError) {
          console.error(
            "⚠️ Erreur lors de l'activation du premium:",
            premiumError
          );
        }
      } else {
        console.log("⚠️ Synchronisation échouée:", result.message);

        if (result.requiresManualLogin) {
          console.log("🔄 Tentative de retry...");
          const retryResult = await retryUserSync(2);
          if (retryResult.success) {
            setSyncResult(retryResult);
            console.log("✅ Retry réussi !");

            const retryStatus = await checkUserSyncStatus();
            console.log("🔍 Statut après retry réussi:", retryStatus);
          }
        }
      }
    } catch (error) {
      console.error(
        "❌ Erreur lors du traitement du succès de paiement:",
        error
      );
      setSyncResult({
        success: false,
        message: "Erreur de traitement",
        requiresManualLogin: true,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [activatePremium, checkPremiumStatus]);

  useEffect(() => {
    void processPaymentSuccess();
  }, [processPaymentSuccess]);

  const handleContinue = () => {
    // Rediriger vers Settings de manière stable
    setTimeout(() => {
      push("/settings");
    }, 100);
  };

  const handleManualLogin = () => {
    // Rediriger vers la section de connexion
    push("/settings");
  };

  const getMessage = () => {
    if (isProcessing) {
      return t("processing_payment", "Création de votre compte en cours...");
    }

    if (syncResult?.success) {
      return t(
        "account_created_connected",
        "Votre compte a été créé et vous êtes maintenant connecté !"
      );
    }

    if (syncResult?.requiresManualLogin) {
      return t("account_created_manual_login");
    }

    return t("account_created_success");
  };

  const getButtonText = () => {
    if (isProcessing) {
      return t("processing");
    }

    if (syncResult?.success) {
      return t("view_my_account");
    }

    if (syncResult?.requiresManualLogin) {
      return t("auth_modal.login_button");
    }

    return t("continue");
  };

  const handleButtonPress = () => {
    if (isProcessing) return;

    if (syncResult?.requiresManualLogin) {
      handleManualLogin();
    } else {
      handleContinue();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>✅ Paiement Réussi !</Text>
        <Text style={styles.message}>{getMessage()}</Text>

        {syncResult && !syncResult.success && (
          <Text style={styles.errorMessage}>{syncResult.message}</Text>
        )}

        <Pressable
          style={[styles.button, isProcessing && styles.buttonDisabled]}
          onPress={handleButtonPress}
          disabled={isProcessing}
        >
          <Text style={styles.buttonText}>{getButtonText()}</Text>
        </Pressable>

        {syncResult?.requiresManualLogin && (
          <Pressable
            style={styles.secondaryButton}
            onPress={handleContinue}
          >
            <Text style={styles.secondaryButtonText}>
              Continuer sans connexion
            </Text>
          </Pressable>
        )}
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
  errorMessage: {
    color: "#FF6B6B",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  secondaryButton: {
    backgroundColor: "#555555",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#666666",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
});

export default PaymentSuccessScreen;
