import NetInfo from "@react-native-community/netinfo";

/**
 * 🌐 Utilitaires pour la gestion de la connectivité réseau
 * Utilisable dans les composants React et les fonctions utilitaires
 */

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string | null;
}

/**
 * Vérifier la connectivité réseau de manière synchrone
 * @returns Promise<NetworkStatus>
 */
const checkNetworkStatus = async (): Promise<NetworkStatus> => {
  try {
    const state = await NetInfo.fetch();
    return {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? false,
      type: state.type,
    };
  } catch (error) {
    console.error("❌ Erreur vérification réseau:", error);
    // En cas d'erreur, assumer une connexion pour éviter les blocages
    return {
      isConnected: true,
      isInternetReachable: true,
      type: "unknown",
    };
  }
};

/**
 * Vérifier si l'utilisateur est en mode offline
 * @returns Promise<boolean>
 */
export const isOfflineMode = async (): Promise<boolean> => {
  const status = await checkNetworkStatus();
  return !status.isConnected || !status.isInternetReachable;
};
