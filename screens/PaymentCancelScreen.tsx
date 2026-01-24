import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppConfig } from "../utils/config";

const PaymentCancelScreen: React.FC = () => {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = React.useState(false);

  // 🚀 NOUVEAU : Nettoyer les données et supprimer le compte préemptif si nécessaire
  useEffect(() => {
    const handleCancellation = async () => {
      try {
        const registrationData = await AsyncStorage.getItem("pending_registration");
        
        if (registrationData) {
          const parsedData = JSON.parse(registrationData);
          const email = parsedData.email;

          if (email) {
            console.log("🗑️ Demande de suppression du compte annulé pour:", email);
            setIsDeleting(true);
            
            // Appeler l'API pour supprimer l'utilisateur préemptif
            const response = await fetch(`${AppConfig.API_BASE_URL}/stripe.php/handle-payment-cancellation`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email }),
            });

            const result = await response.json();
            console.log("✅ Résultat suppression:", result);
          }
        }

        // Nettoyer le stockage local quoi qu'il arrive
        await AsyncStorage.removeItem("pending_registration");
        console.log("🧹 Données d'inscription nettoyées - PaymentCancelScreen");
      } catch (error) {
        console.error("❌ Erreur lors de l'annulation:", error);
      } finally {
        setIsDeleting(false);
      }
    };

    handleCancellation();
  }, []);

  const handleRetry = () => {
    // Retourner aux paramètres où se trouve l'inscription
    router.replace("/settings");
  };

  const handleGoHome = () => {
    router.replace("/");
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>❌ Paiement Annulé</Text>
        <Text style={styles.message}>
          {isDeleting 
            ? "Annulation en cours et nettoyage de vos données..." 
            : "Aucun montant n'a été débité de votre compte."}
        </Text>
        
        {isDeleting ? (
          <ActivityIndicator size="large" color="#FF6B6B" style={{ marginBottom: 20 }} />
        ) : (
          <View style={styles.buttonsContainer}>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.homeButton} onPress={handleGoHome}>
              <Text style={styles.homeButtonText}>Accueil</Text>
            </TouchableOpacity>
          </View>
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
  buttonsContainer: {
    width: "100%",
    gap: 15,
  },
  retryButton: {
    backgroundColor: "#FF6B6B",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  homeButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4CAF50",
  },
});

export default PaymentCancelScreen;
