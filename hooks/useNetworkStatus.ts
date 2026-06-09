import { useState, useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string | null;
  isWifi: boolean;
  isCellular: boolean;
  isEthernet: boolean;
}

/**
 * 🌐 Hook pour gérer l'état de la connexion réseau
 * Utilise NetInfo pour détecter les changements de connectivité
 */
export const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true, // Par défaut, on assume une connexion
    isInternetReachable: true,
    type: null,
    isWifi: false,
    isCellular: false,
    isEthernet: false,
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const newStatus: NetworkStatus = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false,
        type: state.type,
        isWifi: state.type === "wifi",
        isCellular: state.type === "cellular",
        isEthernet: state.type === "ethernet",
      };

      setNetworkStatus(newStatus);
      setIsLoading(false);

      // Log pour debug
      console.log("🌐 [NetworkStatus] État réseau:", {
        connected: newStatus.isConnected,
        internet: newStatus.isInternetReachable,
        type: newStatus.type,
      });
    });

    // Vérifier l'état initial
    NetInfo.fetch().then((state) => {
      const initialStatus: NetworkStatus = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false,
        type: state.type,
        isWifi: state.type === "wifi",
        isCellular: state.type === "cellular",
        isEthernet: state.type === "ethernet",
      };

      setNetworkStatus(initialStatus);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    ...networkStatus,
    isLoading,
  };
};

/**
 * 🎯 Hook spécialisé pour la logique offline des fonctionnalités Premium
 */
export const useOfflineAccess = (isPremium: boolean) => {
  const networkStatus = useNetworkStatus();

  // Calculer l'accès offline
  const canAccessOffline = isPremium; // Premium = accès offline complet
  const requiresConnection = !isPremium; // Gratuit = connexion requise
  const isOfflineMode =
    !networkStatus.isConnected || !networkStatus.isInternetReachable;
  const shouldShowOfflineMessage = requiresConnection && isOfflineMode;

  return {
    ...networkStatus,
    canAccessOffline,
    requiresConnection,
    isOfflineMode,
    shouldShowOfflineMessage,
  };
};
