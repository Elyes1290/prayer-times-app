import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Types de base
export interface PremiumUser {
  isPremium: boolean;
  subscriptionType: "monthly" | "yearly" | "family" | null;
  subscriptionId: string | null;
  expiryDate: Date | null;
  features: string[];
}

export interface PremiumContextType {
  user: PremiumUser;
  loading: boolean;

  // Actions
  checkPremiumStatus: () => Promise<void>;
  activatePremium: (
    type: "monthly" | "yearly" | "family",
    subscriptionId: string
  ) => Promise<void>;
  deactivatePremium: () => Promise<void>;

  // Vérifications
  hasFeature: (feature: string) => boolean;
  canUseFeature: (feature: string) => boolean;
}

// Valeurs par défaut (utilisateur gratuit)
const defaultUser: PremiumUser = {
  isPremium: false,
  subscriptionType: null,
  subscriptionId: null,
  expiryDate: null,
  features: [],
};

const defaultContext: PremiumContextType = {
  user: defaultUser,
  loading: false,
  checkPremiumStatus: async () => {},
  activatePremium: async () => {},
  deactivatePremium: async () => {},
  hasFeature: () => false,
  canUseFeature: () => true, // Par défaut, tout est autorisé (mode gratuit)
};

// Contexte
const PremiumContext = createContext<PremiumContextType>(defaultContext);

// Clés de stockage
const STORAGE_KEYS = {
  PREMIUM_USER: "@prayer_app_premium_user",
  PREMIUM_FEATURES: "@prayer_app_premium_features",
} as const;

// Provider
interface PremiumProviderProps {
  children: ReactNode;
}

export const PremiumProvider: React.FC<PremiumProviderProps> = ({
  children,
}) => {
  const [user, setUser] = useState<PremiumUser>(defaultUser);
  const [loading, setLoading] = useState(true);

  // Charger les données premium au démarrage
  useEffect(() => {
    loadPremiumData();
  }, []);

  const loadPremiumData = async () => {
    try {
      setLoading(true);

      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.PREMIUM_USER);
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);

        // Vérifier si l'abonnement n'a pas expiré
        if (parsedUser.expiryDate) {
          const expiryDate = new Date(parsedUser.expiryDate);
          const now = new Date();

          if (now > expiryDate) {
            // Abonnement expiré
            await deactivatePremium();
            return;
          }
        }

        setUser({
          ...parsedUser,
          expiryDate: parsedUser.expiryDate
            ? new Date(parsedUser.expiryDate)
            : null,
        });
      }
    } catch (error) {
      console.log("Erreur chargement données premium:", error);
      // En cas d'erreur, rester en mode gratuit
      setUser(defaultUser);
    } finally {
      setLoading(false);
    }
  };

  const checkPremiumStatus = async () => {
    await loadPremiumData();
  };

  const activatePremium = async (
    type: "monthly" | "yearly" | "family",
    subscriptionId: string
  ) => {
    try {
      // Calculer la date d'expiration
      const now = new Date();
      const expiryDate = new Date(now);

      if (type === "monthly") {
        expiryDate.setMonth(now.getMonth() + 1);
      } else if (type === "yearly" || type === "family") {
        expiryDate.setFullYear(now.getFullYear() + 1);
      }

      // Définir les fonctionnalités premium
      const premiumFeatures = [
        "custom_adhan_sounds",
        "premium_themes",
        "unlimited_bookmarks",
        "prayer_analytics",
        "monthly_stats",
        "prayer_goals",
        "premium_duas",
        "audio_lessons",
        "exclusive_hadiths",
        "ad_free",
        "priority_support",
      ];

      const newUser: PremiumUser = {
        isPremium: true,
        subscriptionType: type,
        subscriptionId,
        expiryDate,
        features: premiumFeatures,
      };

      // Sauvegarder
      await AsyncStorage.setItem(
        STORAGE_KEYS.PREMIUM_USER,
        JSON.stringify(newUser)
      );
      setUser(newUser);

      console.log(
        "✅ Premium activé:",
        type,
        "jusqu'au",
        expiryDate.toLocaleDateString()
      );
    } catch (error) {
      console.error("❌ Erreur activation premium:", error);
      throw error;
    }
  };

  const deactivatePremium = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.PREMIUM_USER);
      await AsyncStorage.removeItem(STORAGE_KEYS.PREMIUM_FEATURES);
      setUser(defaultUser);
      console.log("🔓 Premium désactivé");
    } catch (error) {
      console.error("❌ Erreur désactivation premium:", error);
    }
  };

  const hasFeature = (feature: string): boolean => {
    return user.isPremium && user.features.includes(feature);
  };

  const canUseFeature = (feature: string): boolean => {
    // Pour l'instant, autoriser tout (mode gratuit avec limitations douces)
    // Plus tard, on pourra ajouter des restrictions
    return true;
  };

  const contextValue: PremiumContextType = {
    user,
    loading,
    checkPremiumStatus,
    activatePremium,
    deactivatePremium,
    hasFeature,
    canUseFeature,
  };

  return (
    <PremiumContext.Provider value={contextValue}>
      {children}
    </PremiumContext.Provider>
  );
};

// Hook pour utiliser le contexte
export const usePremium = (): PremiumContextType => {
  const context = useContext(PremiumContext);
  if (!context) {
    throw new Error("usePremium doit être utilisé dans un PremiumProvider");
  }
  return context;
};

// Hook pour vérifier le statut premium
export const useIsPremium = (): boolean => {
  const { user } = usePremium();
  return user.isPremium;
};

// Hook pour vérifier une fonctionnalité
export const useHasFeature = (feature: string): boolean => {
  const { hasFeature } = usePremium();
  return hasFeature(feature);
};
