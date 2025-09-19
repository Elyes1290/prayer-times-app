import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { safeJsonParse } from "../utils/safeJson";
// 🚀 NOUVEAU : Import apiClient pour vérifier la connexion Infomaniak
import apiClient from "../utils/apiClient";
// 🚀 NOUVEAU : Import du gestionnaire de synchronisation
import SyncManager from "../utils/syncManager";
import { useToast } from "../contexts/ToastContext";
import { useTranslation } from "react-i18next";

// Types de base
export interface PremiumUser {
  isPremium: boolean;
  subscriptionType: "monthly" | "yearly" | "family" | null;
  subscriptionId: string | null;
  expiryDate: Date | null;
  features: string[];
  hasPurchasedPremium?: boolean;
  premiumActivatedAt: Date | null;
  // 🎯 VIP SYSTEM : Nouvelles propriétés VIP
  isVip?: boolean;
  vipReason?: string | null;
  vipGrantedBy?: string | null;
  vipGrantedAt?: Date | null;
  premiumType?: string; // 'VIP Gratuit à Vie', 'Premium Payant', 'Gratuit'
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

  // 🚀 NOUVEAU : Fonction pour forcer la vérification de connexion
  forceCheckConnection: () => Promise<boolean>;

  // 🚀 NOUVEAU : Fonction pour forcer la déconnexion complète
  forceLogout: () => Promise<void>;

  // 🚀 NOUVEAU : Fonction pour activer le premium après connexion
  activatePremiumAfterLogin: () => Promise<void>;

  // 🚀 NOUVEAU : Fonction pour vérifier si l'utilisateur a déjà un abonnement premium actif
  checkExistingPremium: () => Promise<{
    hasActivePremium: boolean;
    subscriptionType?: string;
    expiryDate?: Date;
    shouldRedirectToLogin: boolean;
  }>;
}

// Valeurs par défaut (utilisateur gratuit)
const defaultUser: PremiumUser = {
  isPremium: false,
  subscriptionType: null,
  subscriptionId: null,
  expiryDate: null,
  features: [],
  hasPurchasedPremium: false,
  premiumActivatedAt: null,
};

const defaultContext: PremiumContextType = {
  user: defaultUser,
  loading: false,
  checkPremiumStatus: async () => {},
  activatePremium: async () => {},
  deactivatePremium: async () => {},
  hasFeature: () => false,
  canUseFeature: () => true, // Par défaut, tout est autorisé (mode gratuit)
  forceCheckConnection: async () => false,
  forceLogout: async () => {},
  activatePremiumAfterLogin: async () => {},
  checkExistingPremium: async () => ({
    hasActivePremium: false,
    shouldRedirectToLogin: false,
  }),
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
  const { showToast } = useToast();
  const { t } = useTranslation();

  // 🕐 NOUVEAU : Vérifier l'expiration des abonnements localement
  const checkLocalPremiumExpiration = React.useCallback(async () => {
    try {
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.PREMIUM_USER);
      if (!storedUser) return false;

      const parsedUser = safeJsonParse<any>(storedUser, null);
      if (!parsedUser) return false;

      // Les VIP n'expirent jamais
      if (parsedUser.isVip) {
        console.log("👑 Utilisateur VIP - pas de vérification d'expiration");
        return false;
      }

      // Vérifier l'expiration pour les premium payants
      if (parsedUser.isPremium && parsedUser.expiryDate) {
        const expiryDate = new Date(parsedUser.expiryDate);
        const now = new Date();

        if (expiryDate <= now) {
          console.log(
            "⏰ Abonnement premium expiré - désactivation automatique"
          );

          // Désactiver le premium localement
          await AsyncStorage.setItem(
            STORAGE_KEYS.PREMIUM_USER,
            JSON.stringify({
              ...defaultUser,
              hasPurchasedPremium: parsedUser.hasPurchasedPremium || false,
            })
          );
          setUser({
            ...defaultUser,
            hasPurchasedPremium: parsedUser.hasPurchasedPremium || false,
          });

          // Informer l'utilisateur
          showToast?.({
            type: "error",
            title: t("premium.expired_title", "Abonnement expiré"),
            message: t(
              "premium.expired_message",
              "Votre abonnement premium a expiré. Renouvelez pour continuer à profiter des fonctionnalités premium."
            ),
          });

          return true; // Expiration détectée
        }

        // Avertir si expiration dans moins de 7 jours
        const daysRemaining = Math.ceil(
          (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysRemaining <= 7 && daysRemaining > 0) {
          console.log(`⚠️ Premium expire dans ${daysRemaining} jour(s)`);

          showToast?.({
            type: "info",
            title: t(
              "premium.expiring_soon_title",
              "Abonnement bientôt expiré"
            ),
            message: t(
              "premium.expiring_soon_message",
              `Votre abonnement expire dans ${daysRemaining} jour(s). Pensez à le renouveler !`
            ),
          });
        }
      }

      return false; // Pas d'expiration
    } catch (error) {
      console.error("❌ Erreur vérification expiration locale:", error);
      return false;
    }
  }, [showToast, t]); // Retirer deactivatePremium des deps pour éviter la circularité

  // --- Actions disponibles pour les effets ---
  const deactivatePremium = React.useCallback(async () => {
    try {
      // On ne supprime pas l'info d'achat premium, juste l'activation
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.PREMIUM_USER);
      let hasPurchasedPremium = false;
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          hasPurchasedPremium = !!parsedUser.hasPurchasedPremium;
        } catch {
          hasPurchasedPremium = false;
        }
      }
      await AsyncStorage.setItem(
        STORAGE_KEYS.PREMIUM_USER,
        JSON.stringify({ ...defaultUser, hasPurchasedPremium })
      );
      setUser({ ...defaultUser, hasPurchasedPremium });
    } catch (error) {
      // noop
    }
  }, []);

  // Charger les données premium au démarrage
  useEffect(() => {
    loadPremiumData();
  }, []);

  // 🕐 NOUVEAU : Vérifier l'expiration toutes les heures quand l'app est active
  useEffect(() => {
    // Vérification initiale après 10 secondes
    const initialCheck = setTimeout(() => {
      checkLocalPremiumExpiration();
    }, 10000);

    // Vérification périodique toutes les heures
    const hourlyCheck = setInterval(() => {
      checkLocalPremiumExpiration();
    }, 60 * 60 * 1000); // 1 heure

    return () => {
      clearTimeout(initialCheck);
      clearInterval(hourlyCheck);
    };
  }, [checkLocalPremiumExpiration]);

  // 🔐 Vérification périodique du token côté serveur (toutes les 6h)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const verifyAuth = async () => {
      try {
        // 🚨 CORRECTION : Éviter la vérification si l'utilisateur choisit un abonnement
        const pendingRegistration = await AsyncStorage.getItem(
          "pending_registration"
        );
        if (pendingRegistration) {
          console.log(
            "⏸️ Vérification token différée - processus d'abonnement en cours"
          );
          return; // Ne pas vérifier le token pendant la sélection d'abonnement
        }

        // 🚀 CORRECTION : Vérifier la connexion explicite ET user_data avant d'appeler l'API
        const explicitConnection = await AsyncStorage.getItem(
          "explicit_connection"
        );
        if (explicitConnection !== "true") {
          console.log(
            "🔍 [DEBUG] Pas de connexion explicite - pas de vérification API"
          );
          return; // Ne pas appeler l'API si l'utilisateur n'est pas connecté
        }

        // Vérifier aussi que user_data existe
        const userData = await AsyncStorage.getItem("user_data");
        if (!userData) {
          console.log("🔍 [DEBUG] Pas de user_data - pas de vérification API");
          return; // Ne pas appeler l'API si pas de données utilisateur
        }

        const token = await AsyncStorage.getItem("auth_token");
        if (!token) {
          console.log("🔍 [DEBUG] Aucun token - pas de vérification API");
          return;
        }

        console.log(
          "🔐 Vérification périodique du token - utilisateur connecté"
        );
        const result = await apiClient.verifyAuth();
        if (!result?.success) {
          // Token invalide: désactiver premium et nettoyer les tokens
          await AsyncStorage.multiRemove(["auth_token", "refresh_token"]);
          await deactivatePremium();
          showToast?.({
            type: "error",
            title: t("premium.session_expired", "Session expirée"),
            message: "Veuillez vous reconnecter pour continuer",
          });
        }
      } catch (error) {
        // 🚀 CORRECTION : Logger l'erreur pour debug mais ne pas spammer
        console.log("⚠️ [DEBUG] Erreur vérification token périodique:", error);
      }
    };

    const timeout = setTimeout(verifyAuth, 5000);
    interval = setInterval(verifyAuth, 6 * 60 * 60 * 1000);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [showToast, deactivatePremium]);

  // 🚀 NOUVEAU : Vérifier la connexion explicite et maintenir le premium si connecté
  useEffect(() => {
    const checkExplicitConnection = async () => {
      try {
        // Vérifier si l'utilisateur est connecté explicitement
        const isExplicitConnection = await AsyncStorage.getItem(
          "explicit_connection"
        );
        const userData = await AsyncStorage.getItem("user_data");

        if (isExplicitConnection === "true" && userData) {
          // Connexion explicite détectée - maintenir le premium
          console.log(
            "🔍 [DEBUG] Mode professionnel - connexion explicite détectée, maintien du premium"
          );
          // Ne pas désactiver le premium
          return;
        } else {
          // Pas de connexion explicite - désactiver le premium
          console.log(
            "🔍 [DEBUG] Mode professionnel - aucune connexion explicite, désactivation du premium"
          );
          await deactivatePremium();
        }
      } catch (error) {
        console.log(
          "❌ [DEBUG] Erreur vérification connexion explicite:",
          error
        );
        // En cas d'erreur, désactiver le premium par sécurité
        await deactivatePremium();
      }
    };

    // Vérifier la connexion toutes les 5 minutes
    const interval = setInterval(checkExplicitConnection, 5 * 60 * 1000);

    // Vérifier après un délai pour laisser le temps au loadPremiumData de s'exécuter
    const timeout = setTimeout(checkExplicitConnection, 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [deactivatePremium]);

  const loadPremiumData = async () => {
    try {
      setLoading(true);

      // 🕐 NOUVEAU : Vérifier l'expiration locale AVANT tout
      await checkLocalPremiumExpiration();

      // 🔗 NOUVEAU : Synchroniser le token d'authentification vers les services natifs
      try {
        const token = await AsyncStorage.getItem("auth_token");
        if (token) {
          console.log(
            "🔗 [PremiumContext] Synchronisation token vers services natifs:",
            token.substring(0, 10) + "..."
          );
          // Importer le module natif dynamiquement pour éviter les erreurs
          const { NativeModules } = await import("react-native");
          if (NativeModules?.QuranAudioServiceModule?.syncAuthToken) {
            NativeModules.QuranAudioServiceModule.syncAuthToken(token);
            console.log("✅ [PremiumContext] Token synchronisé avec succès");
          } else {
            console.log(
              "⚠️ [PremiumContext] Module QuranAudioServiceModule non disponible"
            );
          }
        } else {
          console.log("⚠️ [PremiumContext] Aucun token auth_token trouvé");
        }
      } catch (tokenError) {
        console.error(
          "❌ [PremiumContext] Erreur synchronisation token:",
          tokenError
        );
      }

      // 🔧 NOUVEAU : Synchroniser avec user_data en priorité
      const userData = await AsyncStorage.getItem("user_data");
      if (userData) {
        let parsedUserData: any = null;
        try {
          parsedUserData = JSON.parse(userData);
        } catch {
          parsedUserData = null;
        }
        if (!parsedUserData) return;

        // 🎯 VIP SYSTEM : Si l'utilisateur est premium OU VIP dans user_data
        if (
          parsedUserData.premium_status === 1 ||
          parsedUserData.is_vip === true
        ) {
          console.log(
            "🔄 [SYNC] Synchronisation Premium Context depuis user_data"
          );

          // 🎯 VIP SYSTEM : Déterminer le type de premium
          const isVip = parsedUserData.is_vip === true;
          const premiumType = isVip
            ? "VIP Gratuit à Vie"
            : parsedUserData.premium_status === 1
            ? "Premium Payant"
            : "Gratuit";

          const premiumUser = {
            isPremium: true,
            subscriptionType: parsedUserData.subscription_type || "yearly",
            subscriptionId: parsedUserData.subscription_id,
            expiryDate: isVip
              ? new Date(2099, 11, 31) // VIP = date très lointaine (2099)
              : parsedUserData.premium_expiry
              ? new Date(parsedUserData.premium_expiry)
              : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            features: [
              "prayer_analytics",
              "custom_adhan_sounds",
              "premium_themes",
              "unlimited_bookmarks",
              "ad_free",
              ...(isVip ? ["vip_exclusive", "lifetime_access"] : []),
            ],
            hasPurchasedPremium: true,
            premiumActivatedAt: parsedUserData.premium_activated_at
              ? new Date(parsedUserData.premium_activated_at)
              : new Date(),
            // 🎯 VIP SYSTEM : Propriétés VIP
            isVip: isVip,
            vipReason: parsedUserData.vip_reason || null,
            vipGrantedBy: parsedUserData.vip_granted_by || null,
            vipGrantedAt: parsedUserData.vip_granted_at
              ? new Date(parsedUserData.vip_granted_at)
              : null,
            premiumType: premiumType,
          };

          // Sauvegarder et utiliser ces données
          await AsyncStorage.setItem(
            STORAGE_KEYS.PREMIUM_USER,
            JSON.stringify(premiumUser)
          );
          setUser(premiumUser);
          console.log(`✅ [SYNC] ${premiumType} Context synchronisé !`);
          setLoading(false);
          return;
        }
      }

      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.PREMIUM_USER);
      if (storedUser) {
        // 🔧 CORRECTION : Utiliser safeJsonParse
        const parsedUser = safeJsonParse<any>(storedUser, null);
        if (!parsedUser) {
          setUser(defaultUser);
          setLoading(false);
          return;
        }

        // 🚀 SIMPLIFICATION : Si on a des données premium, on est premium
        const isPremium =
          parsedUser.isPremium || parsedUser.hasPurchasedPremium || false;

        const newUser = {
          ...parsedUser,
          expiryDate: parsedUser.expiryDate
            ? new Date(parsedUser.expiryDate)
            : null,
          isPremium,
          hasPurchasedPremium: parsedUser.hasPurchasedPremium || isPremium,
        };

        // 🚀 DEBUG : Log pour vérifier l'état premium
        // console.log(`🔍 [DEBUG] loadPremiumData - isPremium: ${isPremium}`);
        // console.log(
        //   `🔍 [DEBUG] loadPremiumData - parsedUser:`,
        //   JSON.stringify(parsedUser, null, 2)
        // );
        // console.log(
        //   `🔍 [DEBUG] loadPremiumData - newUser:`,
        //   JSON.stringify(newUser, null, 2)
        // );

        setUser(newUser);
      } else {
        // console.log(
        //   `🔍 [DEBUG] loadPremiumData - Aucune donnée premium trouvée`
        // );
      }
    } catch (error) {
      // console.log("Erreur chargement données premium:", error);
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
  ): Promise<void> => {
    try {
      setLoading(true);

      // Calculer la date d'expiration
      const now = new Date();
      let expiryDate: Date;

      switch (type) {
        case "monthly":
          expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          break;
        case "yearly":
          expiryDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
          break;
        case "family":
          expiryDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          throw new Error("Type d'abonnement invalide");
      }

      // 🚀 SIMPLIFICATION : Activer directement le premium
      const newUser = {
        ...user,
        isPremium: true,
        subscriptionType: type,
        subscriptionId: subscriptionId,
        expiryDate: expiryDate,
        premiumActivatedAt: new Date(),
        hasPurchasedPremium: true, // Marquer comme acheté
      };

      setUser(newUser);

      // Sauvegarder localement
      await AsyncStorage.setItem(
        STORAGE_KEYS.PREMIUM_USER,
        JSON.stringify(newUser)
      );

      // console.log(
      //   `✅ Premium activé: ${type} jusqu'au ${expiryDate.toLocaleDateString()}`
      // );
    } catch (error) {
      // console.error("❌ Erreur activation premium:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // (déjà défini plus haut)

  const hasFeature = (feature: string): boolean => {
    return user.isPremium && user.features.includes(feature);
  };

  const canUseFeature = (feature: string): boolean => {
    // 🚀 NOUVEAU : Restrictions pour la version gratuite
    if (user.isPremium) {
      return true; // Utilisateur premium a accès à tout
    }

    // Restrictions pour la version gratuite
    const freeLimits = {
      favorites: {
        quran_verse: 3,
        hadith: 3,
        dhikr: 3,
        asmaul_husna: 3,
        prophet_story: 3, // 🚀 NOUVEAU : 3 histoires du Prophète en favori
      },
      daily_prayers_tracking: 7, // 7 jours d'historique
      dhikr_categories: 2, // Accès à seulement 2 catégories de dhikr
    };

    // Fonctionnalités complètement bloquées en version gratuite
    const premiumOnlyFeatures = [
      "prayer_analytics",
      "custom_adhan_sounds",
      "premium_themes",
      "unlimited_bookmarks",
      "monthly_stats",
      "prayer_goals",
      "premium_duas",
      "audio_lessons",
      "exclusive_hadiths",
      "ad_free",
      "priority_support",
      "family_management",
      "child_profiles",
    ];

    if (premiumOnlyFeatures.includes(feature)) {
      return false; // Fonctionnalité premium uniquement
    }

    // Pour l'instant, autoriser les autres fonctionnalités (limitations douces)
    return true;
  };

  // 🚀 NOUVEAU : Fonction pour forcer la vérification de connexion
  const forceCheckConnection = async (): Promise<boolean> => {
    try {
      // 🚀 NOUVEAU : Mode professionnel - pas de vérification automatique des données utilisateur
      // L'utilisateur doit être explicitement connecté pour maintenir le premium
      console.log(
        "🔍 [DEBUG] Mode professionnel - aucune vérification automatique des données utilisateur"
      );
      await deactivatePremium();
      return false;

      // 🚀 ANCIEN CODE COMMENTÉ : Vérification automatique des données
      // const userData = await AsyncStorage.getItem("user_data");
      // if (!userData) {
      //   await deactivatePremium();
      //   return false;
      // }
      // const parsedUserData = JSON.parse(userData);
      // if (!parsedUserData) {
      //   await deactivatePremium();
      //   return false;
      // }
      // try {
      //   const result = await apiClient.getUser();
      //   if (!result.success) {
      //     await deactivatePremium();
      //     return false;
      //   }
      // } catch (error) {
      //   // En cas d'erreur réseau, on garde le premium si les données locales sont valides
      // }
      // return true;
    } catch (error) {
      console.log(`❌ [SECURITY] Erreur vérification forcée:`, error);
      await deactivatePremium();
      return false;
    }
  };

  // 🚀 NOUVEAU : Fonction pour forcer la déconnexion complète
  const forceLogout = async (): Promise<void> => {
    try {
      // console.log(
      //   `🔓 [SECURITY] Force logout - Suppression de toutes les données`
      // );

      // Supprimer toutes les données utilisateur et premium
      await AsyncStorage.removeItem("user_data");
      await AsyncStorage.removeItem("premium_user_data");
      await AsyncStorage.removeItem("premium_catalog_cache");

      // 🚀 NOUVEAU : Nettoyer le cache des statistiques immédiatement
      await AsyncStorage.removeItem("user_stats_cache");

      // Désactiver le premium
      await deactivatePremium();

      // console.log(`✅ [SECURITY] Force logout - Déconnexion complète réussie`);
    } catch (error) {
      console.error(`❌ [SECURITY] Erreur force logout:`, error);
    }
  };

  // 🚀 NOUVEAU : Fonction pour activer le premium après connexion
  const activatePremiumAfterLogin = async (): Promise<void> => {
    try {
      // Vérifier si l'utilisateur a acheté le premium
      if (!user.hasPurchasedPremium) {
        // console.log("ℹ️ Aucun achat premium à activer");
        return;
      }

      // console.log("🔄 Activation du premium après connexion...");

      // Synchroniser avec la base de données
      try {
        const syncManager = SyncManager.getInstance();
        await syncManager.syncPremiumPurchase({
          subscription_type: user.subscriptionType || "yearly",
          subscription_id: user.subscriptionId || "unknown",
          premium_expiry:
            user.expiryDate?.toISOString() ||
            new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        });

        // Activer le premium localement
        const activatedUser = {
          ...user,
          isPremium: true,
          premiumActivatedAt: new Date(),
        };

        setUser(activatedUser);

        // Sauvegarder localement
        await AsyncStorage.setItem(
          STORAGE_KEYS.PREMIUM_USER,
          JSON.stringify(activatedUser)
        );

        // 🚀 NOUVEAU : Nettoyer le cache des statistiques pour forcer un refresh
        await AsyncStorage.removeItem("user_stats_cache");

        // console.log("✅ Premium activé avec succès après connexion");
      } catch (error) {
        // console.log("❌ Erreur synchronisation achat premium:", error);
        // En cas d'erreur, on garde l'achat local mais pas l'activation
      }
    } catch (error) {
      console.error("❌ Erreur activation premium après connexion:", error);
    }
  };

  // 🚀 NOUVEAU : Fonction pour vérifier si l'utilisateur a déjà un abonnement premium actif
  const checkExistingPremium = async (): Promise<{
    hasActivePremium: boolean;
    subscriptionType?: string;
    expiryDate?: Date;
    shouldRedirectToLogin: boolean;
  }> => {
    try {
      // console.log("🔍 Vérification abonnement premium existant...");

      // 1. Vérifier les données locales
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.PREMIUM_USER);
      if (storedUser) {
        let parsedUser: any = null;
        try {
          parsedUser = JSON.parse(storedUser);
        } catch {
          parsedUser = null;
        }
        if (!parsedUser) {
          return {
            hasActivePremium: false,
            shouldRedirectToLogin: false,
          };
        }
        if (parsedUser.isPremium && parsedUser.expiryDate) {
          const expiryDate = new Date(parsedUser.expiryDate);
          const now = new Date();

          if (expiryDate > now) {
            // console.log("✅ Abonnement premium actif trouvé localement");
            return {
              hasActivePremium: true,
              subscriptionType: parsedUser.subscriptionType,
              expiryDate: expiryDate,
              shouldRedirectToLogin: false, // Déjà actif localement
            };
          } else {
            // console.log("⚠️ Abonnement premium expiré localement");
          }
        }
      }

      // 2. Vérifier avec l'API (si connecté)
      try {
        const result = await apiClient.getUser();
        if (result.success && result.data) {
          const userData = result.data;
          if (userData.premium_status === 1 && userData.premium_expiry) {
            const expiryDate = new Date(userData.premium_expiry);
            const now = new Date();

            if (expiryDate > now) {
              // console.log("✅ Abonnement premium actif trouvé sur le serveur");
              return {
                hasActivePremium: true,
                subscriptionType: userData.subscription_type,
                expiryDate: expiryDate,
                shouldRedirectToLogin: false, // Déjà connecté et actif
              };
            } else {
              // console.log("⚠️ Abonnement premium expiré sur le serveur");
            }
          }
        }
      } catch (error: any) {
        if (error?.message?.includes("404")) {
          // console.log("ℹ️ Utilisateur non trouvé - pas d'abonnement actif");

          if (showToast) {
            showToast({
              type: "info",
              title: "Aucun compte premium",
              message: t(
                "premium.no_account_associated",
                "Aucun compte premium n'est associé à cet appareil. Créez un compte ou achetez le premium."
              ),
            });
          }
        } else {
          // console.log("⚠️ Erreur vérification serveur:", error);
        }
      }

      // 3. Vérifier dans la table premium_purchases (si accessible)
      try {
        const result = await apiClient.getPremiumPurchases();

        if (
          result.success &&
          result.data &&
          Array.isArray(result.data) &&
          result.data.length > 0
        ) {
          const latestPurchase = result.data[0]; // Le plus récent
          if (
            latestPurchase.status === "active" &&
            latestPurchase.premium_expiry
          ) {
            const expiryDate = new Date(latestPurchase.premium_expiry);
            const now = new Date();

            if (expiryDate > now) {
              // console.log("✅ Abonnement premium actif trouvé dans les achats");
              return {
                hasActivePremium: true,
                subscriptionType: latestPurchase.subscription_type,
                expiryDate: expiryDate,
                shouldRedirectToLogin: true, // Besoin de se connecter
              };
            } else {
              // console.log("⚠️ Abonnement premium expiré dans les achats");
            }
          }
        }
      } catch (error) {
        // console.log("⚠️ Erreur vérification achats:", error);
      }

      // console.log("❌ Aucun abonnement premium actif trouvé");
      return {
        hasActivePremium: false,
        shouldRedirectToLogin: false,
      };
    } catch (error) {
      console.error("❌ Erreur vérification abonnement existant:", error);
      return {
        hasActivePremium: false,
        shouldRedirectToLogin: false,
      };
    }
  };

  const contextValue: PremiumContextType = {
    user,
    loading,
    checkPremiumStatus,
    activatePremium,
    deactivatePremium,
    hasFeature,
    canUseFeature,
    forceCheckConnection,
    forceLogout,
    activatePremiumAfterLogin,
    checkExistingPremium,
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
