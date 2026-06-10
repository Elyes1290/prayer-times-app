import React, { useEffect, useRef } from "react";
import { BackHandler, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface AbonnementProtectionProps {
  children: React.ReactNode;
}

/**
 * 🛡️ Composant de protection contre les redirections automatiques
 * pendant la sélection d'abonnement
 */
const AbonnementProtection: React.FC<AbonnementProtectionProps> = ({
  children,
}) => {
  const protectionRef = useRef(false);

  useEffect(() => {
    let activeBackHandler: { remove: () => void } | null = null;

    const checkAbonnementProcess = async () => {
      try {
        const pendingRegistration = await AsyncStorage.getItem(
          "pending_registration"
        );
        if (pendingRegistration) {
          if (!protectionRef.current) {
            protectionRef.current = true;
            console.log("🛡️ Protection d'abonnement activée");

            // 🚨 NOUVEAU : Bloquer le bouton retour pendant l'abonnement
            activeBackHandler = BackHandler.addEventListener(
              "hardwareBackPress",
              () => {
                Alert.alert(
                  "Abonnement en cours",
                  "Veuillez terminer votre abonnement avant de quitter cette page.",
                  [{ text: "OK" }]
                );
                return true; // Bloquer le retour
              }
            );
          }
        } else {
          if (protectionRef.current) {
            protectionRef.current = false;
            console.log("🛡️ Protection d'abonnement désactivée");

            // Désactiver le blocage du bouton retour
            if (activeBackHandler) {
              activeBackHandler.remove();
              activeBackHandler = null;
            }
          }
        }
      } catch (error) {
        console.error("❌ Erreur vérification protection abonnement:", error);
      }
    };

    // Vérifier immédiatement
    checkAbonnementProcess();

    // Vérifier toutes les 2 secondes
    const interval = setInterval(checkAbonnementProcess, 2000);

    return () => {
      clearInterval(interval);
      if (activeBackHandler) {
        activeBackHandler.remove();
        activeBackHandler = null;
      }
    };
  }, []);

  return <>{children}</>;
};

export default AbonnementProtection;
