import React, {
  createContext,
  use,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { safeJsonParse } from "../utils/safeJson";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
// 🚀 NOUVEAU : Import apiClient pour vérifier la connexion Infomaniak
import apiClient from "../utils/apiClient";
// 🚀 NOUVEAU : Import du gestionnaire de synchronisation
import SyncManager from "../utils/syncManager";
import { useToast } from "../contexts/ToastContext";
import { useTranslation } from "react-i18next";
// 🔧 NOUVEAU : Import pour synchronisation fichiers premium
import PremiumContentManager from "../utils/premiumContent";
import { IapService } from "../utils/iapService";
import {
  buildUserDataFromServer,
  getDaysPastExpiry,
  isNetworkReadyForApi,
  isPremiumActiveOnServer,
  normalizeStoredUserData,
  PREMIUM_GRACE_PERIOD_DAYS,
  refreshUserDataFromServer,
  trySyncPremiumFromServer,
} from "../utils/userDataSync";
import { isVipUserRecord } from "../utils/isVipUser";
import {
  ensureVipSessionPersistence,
  isStoredUserVip,
} from "../utils/vipSession";
import {
  clearAndroidAuthTokenSyncCache,
  syncAndroidAuthTokenIfNeeded,
} from "../utils/syncAndroidAuthToken";
import {
  clearLocalAuthSession,
  hasExplicitAuthSession,
  isAccountLogoutLocked,
  setAccountLogoutLock,
} from "../utils/userAuth";
import {
  DEFAULT_ADHAN_SOUND,
  persistFreeAppearanceSettings,
  resolveFreeAdhanSound,
  resolveFreeBackgroundImageType,
  resolveFreeThemeMode,
  type ThemeMode,
} from "../utils/resetPremiumAppearance";
import {
  runBackupSignOut,
  runPremiumAppearanceReset,
} from "../utils/premiumAppearanceSync";
import { LocalStorageManager } from "../utils/localStorageManager";
import type { BackgroundImageType } from "./SettingsContext";

// Types de base
interface PremiumUser {
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
    subscriptionId: string,
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
  LAST_EXPIRY_NOTIFICATION: "@prayer_app_last_expiry_notification", // 🆕 Dernière notification d'expiration
} as const;

let loadPremiumDataInFlight: Promise<void> | null = null;

async function resolveStoredPremiumActive(
  parsedUser: Record<string, unknown>,
): Promise<boolean> {
  if (await isAccountLogoutLocked()) {
    return false;
  }

  if (isVipUserRecord(parsedUser)) {
    return true;
  }

  if (!parsedUser.isPremium) {
    return false;
  }

  return hasExplicitAuthSession();
}

async function getStoredAccountEmail(): Promise<string | null> {
  const userData = await AsyncStorage.getItem("user_data");
  if (userData) {
    const parsed = safeJsonParse<{ email?: string }>(userData, null);
    if (parsed?.email) {
      return String(parsed.email).trim();
    }
  }

  const pendingRegistration = await AsyncStorage.getItem("pending_registration");
  if (pendingRegistration) {
    const parsed = safeJsonParse<{ email?: string }>(pendingRegistration, null);
    if (parsed?.email) {
      return String(parsed.email).trim();
    }
  }

  return null;
}

const PREMIUM_FEATURES = [
  "prayer_analytics",
  "custom_adhan_sounds",
  "premium_themes",
  "unlimited_bookmarks",
  "ad_free",
] as const;

function createPremiumUserFromServer(
  serverUser: Record<string, unknown>,
): PremiumUser {
  const normalized = normalizeStoredUserData(buildUserDataFromServer(serverUser));
  const isVip = isVipUserRecord(normalized);
  const isApple =
    normalized.subscription_platform === "apple" && Platform.OS === "ios";

  return {
    isPremium: true,
    subscriptionType:
      (normalized.subscription_type as PremiumUser["subscriptionType"]) ||
      "yearly",
    subscriptionId: normalized.subscription_id || null,
    expiryDate: isVip
      ? new Date(2099, 11, 31)
      : normalized.premium_expiry
        ? new Date(normalized.premium_expiry)
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    features: [
      ...PREMIUM_FEATURES,
      ...(isVip ? ["vip_exclusive", "lifetime_access"] : []),
    ],
    hasPurchasedPremium: true,
    premiumActivatedAt: normalized.premium_activated_at
      ? new Date(normalized.premium_activated_at)
      : new Date(),
    isVip,
    vipReason: normalized.vip_reason || null,
    vipGrantedBy: normalized.vip_granted_by || null,
    vipGrantedAt: normalized.vip_granted_at
      ? new Date(normalized.vip_granted_at)
      : null,
    premiumType: isVip
      ? "VIP Gratuit à Vie"
      : isApple
        ? "Apple In-App Purchase"
        : "Premium Payant",
  };
}

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

  // 🌐 NOUVEAU : Hook pour vérifier la connectivité réseau
  const networkStatus = useNetworkStatus();
  const networkStatusRef = React.useRef(networkStatus);
  networkStatusRef.current = networkStatus;
  const lastLoadPremiumAtRef = React.useRef(0);
  const checkLocalPremiumExpirationRef = React.useRef<
    () => Promise<boolean>
  >(() => Promise.resolve(false));
  const LOAD_PREMIUM_MIN_INTERVAL_MS = 1500;

  // 🕐 NOUVEAU : Vérifier l'expiration des abonnements localement
  const checkLocalPremiumExpiration = React.useCallback(async () => {
    try {
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.PREMIUM_USER);
      if (!storedUser) return false;

      const parsedUser = safeJsonParse<any>(storedUser, null);
      if (!parsedUser) return false;

      // Les VIP n'expirent jamais
      if (isVipUserRecord(parsedUser)) {
        console.log("👑 Utilisateur VIP - pas de vérification d'expiration");
        return false;
      }

      // Vérifier l'expiration pour les premium payants
      if (parsedUser.isPremium && parsedUser.expiryDate) {
        const expiryDate = new Date(parsedUser.expiryDate);
        const now = new Date();

        if (expiryDate <= now) {
          const daysPastExpiry = getDaysPastExpiry(expiryDate);
          console.log(
            `⏰ Date d'expiration locale atteinte (${daysPastExpiry} jour(s)) — vérification renouvellement...`,
          );

          const applyRenewedPremium = async (
            serverUser: Record<string, unknown>,
            source: string,
          ) => {
            const serverExpiryDate = serverUser.premium_expiry
              ? new Date(serverUser.premium_expiry as string)
              : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

            const userDataToUpdate = buildUserDataFromServer(serverUser);
            await AsyncStorage.setItem(
              "user_data",
              JSON.stringify(userDataToUpdate),
            );

            const updatedUser = createPremiumUserFromServer(serverUser);
            await AsyncStorage.setItem(
              STORAGE_KEYS.PREMIUM_USER,
              JSON.stringify(updatedUser),
            );
            setUser(updatedUser);

            if (serverExpiryDate > now) {
              showToast?.({
                type: "success",
                title: t("premium.renewed_title", "Abonnement renouvelé"),
                message: t(
                  "premium.renewed_message",
                  `Votre abonnement premium a été renouvelé automatiquement jusqu'au ${serverExpiryDate.toLocaleDateString()}`,
                ),
              });
            } else {
              console.log(
                `✅ Premium maintenu via ${source} (période de grâce / sync en cours)`,
              );
            }
          };

          try {
            const serverUser = await trySyncPremiumFromServer(
              networkStatusRef.current,
            );
            if (serverUser) {
              console.log("✅ Renouvellement confirmé côté serveur");
              await applyRenewedPremium(serverUser, "serveur");
              return false;
            }

            if (Platform.OS === "ios") {
              const token = await AsyncStorage.getItem("auth_token");
              const iapService = IapService.getInstance();
              await iapService.init();

              const storedEmail = await getStoredAccountEmail();
              if (storedEmail && token) {
                await iapService.linkAccount(storedEmail);
              }

              const isIapPremium = await iapService.checkPremiumStatus();
              if (
                isIapPremium &&
                token &&
                isNetworkReadyForApi(networkStatusRef.current)
              ) {
                const snap = await iapService.getActiveEntitlementSnapshot();
                if (snap) {
                  try {
                    await apiClient.syncIosPremiumRenewal({
                      expiration_at_ms: snap.expirationAtMs,
                      product_id: snap.productId,
                      original_transaction_id: snap.originalTransactionId,
                    });
                  } catch (syncErr) {
                    console.warn(
                      "⚠️ [PremiumContext] sync-ios-premium (expiration):",
                      syncErr,
                    );
                  }
                }

                const refreshedUser = await refreshUserDataFromServer();
                if (
                  refreshedUser &&
                  isPremiumActiveOnServer(
                    refreshedUser as unknown as Record<string, unknown>,
                  )
                ) {
                  console.log("✅ Renouvellement confirmé via RevenueCat");
                  await applyRenewedPremium(
                    refreshedUser as unknown as Record<string, unknown>,
                    "RevenueCat",
                  );
                  return false;
                }
              } else if (isIapPremium) {
                console.log(
                  "🍎 Premium actif sur RevenueCat — maintien local (sync serveur différée)",
                );
                return false;
              }
            }
          } catch (syncError) {
            console.log("⚠️ Erreur synchronisation renouvellement:", syncError);
          }

          if (daysPastExpiry <= PREMIUM_GRACE_PERIOD_DAYS) {
            console.log(
              `⏳ Période de grâce (${daysPastExpiry}/${PREMIUM_GRACE_PERIOD_DAYS} jours) — premium maintenu`,
            );
            return false;
          }

          console.log(
            "❌ Abonnement expiré au-delà de la période de grâce — désactivation",
          );

          // Désactiver le premium localement
          await AsyncStorage.setItem(
            STORAGE_KEYS.PREMIUM_USER,
            JSON.stringify({
              ...defaultUser,
              hasPurchasedPremium: parsedUser.hasPurchasedPremium || false,
            }),
          );
          setUser({
            ...defaultUser,
            hasPurchasedPremium: parsedUser.hasPurchasedPremium || false,
          });

          // 🚀 CORRECTION : Ne montrer la notification d'expiration qu'une fois par jour
          const lastExpiredNotificationDate = await AsyncStorage.getItem(
            `${STORAGE_KEYS.LAST_EXPIRY_NOTIFICATION}_expired`,
          );
          const today = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD

          // Vérifier si on a déjà montré la notification d'expiration complète aujourd'hui
          if (lastExpiredNotificationDate !== today) {
            // Informer l'utilisateur
            showToast?.({
              type: "error",
              title: t("premium.expired_title", "Abonnement expiré"),
              message: t(
                "premium.expired_message",
                "Votre abonnement premium a expiré. Renouvelez pour continuer à profiter des fonctionnalités premium.",
              ),
            });

            // Sauvegarder qu'on a montré la notification d'expiration complète aujourd'hui
            await AsyncStorage.setItem(
              `${STORAGE_KEYS.LAST_EXPIRY_NOTIFICATION}_expired`,
              today,
            );
            console.log(
              `✅ Notification d'expiration complète affichée pour le ${today}`,
            );
          } else {
            console.log(
              `ℹ️ Notification d'expiration complète déjà affichée aujourd'hui (${today})`,
            );
          }

          return true; // Expiration détectée
        }

        // Avertir si expiration dans moins de 7 jours
        const daysRemaining = Math.ceil(
          (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysRemaining <= 7 && daysRemaining > 0) {
          console.log(`⚠️ Premium expire dans ${daysRemaining} jour(s)`);

          // 🚀 CORRECTION : Ne montrer la notification qu'une fois par jour
          const lastNotificationDate = await AsyncStorage.getItem(
            STORAGE_KEYS.LAST_EXPIRY_NOTIFICATION,
          );
          const today = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD

          // Vérifier si on a déjà montré la notification aujourd'hui
          if (lastNotificationDate !== today) {
            showToast?.({
              type: "info",
              title: t(
                "premium.expiring_soon_title",
                "Abonnement bientôt expiré",
              ),
              message: t(
                "premium.expiring_soon_message",
                `Votre abonnement expire dans ${daysRemaining} jour(s). Pensez à le renouveler !`,
              ),
            });

            // Sauvegarder qu'on a montré la notification aujourd'hui
            await AsyncStorage.setItem(
              STORAGE_KEYS.LAST_EXPIRY_NOTIFICATION,
              today,
            );
            console.log(
              `✅ Notification d'expiration affichée pour le ${today}`,
            );
          } else {
            console.log(
              `ℹ️ Notification d'expiration déjà affichée aujourd'hui (${today})`,
            );
          }
        }
      }

      return false; // Pas d'expiration
    } catch (error) {
      console.error("❌ Erreur vérification expiration locale:", error);
      return false;
    }
  }, [showToast, t]);

  checkLocalPremiumExpirationRef.current = checkLocalPremiumExpiration;

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

      const [themeRaw, backgroundRaw, adhanRaw] = await Promise.all([
        LocalStorageManager.getEssential("THEME_MODE"),
        LocalStorageManager.getEssential("BACKGROUND_IMAGE_TYPE"),
        LocalStorageManager.getEssential("ADHAN_SOUND"),
      ]);
      const nextTheme = resolveFreeThemeMode(
        (themeRaw as ThemeMode) || "auto",
      );
      const nextBackground = resolveFreeBackgroundImageType(
        (backgroundRaw as BackgroundImageType) || "prophet",
      );
      const nextAdhan = resolveFreeAdhanSound(adhanRaw || DEFAULT_ADHAN_SOUND);
      await persistFreeAppearanceSettings(nextTheme, nextBackground, nextAdhan);

      await AsyncStorage.setItem(
        STORAGE_KEYS.PREMIUM_USER,
        JSON.stringify({ ...defaultUser, hasPurchasedPremium }),
      );
      setUser({ ...defaultUser, hasPurchasedPremium });
      await runPremiumAppearanceReset({ force: true });
    } catch (error) {
      // noop
    }
  }, []);

  // Chargement initial une seule fois (évite boucle si checkLocalPremiumExpiration change)
  useEffect(() => {
    void loadPremiumData();
  }, []);

  // 🕐 Vérifier l'expiration toutes les heures quand l'app est active
  useEffect(() => {
    const initialCheck = setTimeout(() => {
      void checkLocalPremiumExpirationRef.current();
    }, 10000);

    const hourlyCheck = setInterval(() => {
      void checkLocalPremiumExpirationRef.current();
    }, 60 * 60 * 1000);

    return () => {
      clearTimeout(initialCheck);
      clearInterval(hourlyCheck);
    };
  }, []);

  // 🔐 Vérification périodique du token côté serveur (toutes les 6h)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const verifyAuth = async () => {
      try {
        // 🚨 CORRECTION : Éviter la vérification si l'utilisateur choisit un abonnement
        const pendingRegistration = await AsyncStorage.getItem(
          "pending_registration",
        );
        if (pendingRegistration) {
          console.log(
            "⏸️ Vérification token différée - processus d'abonnement en cours",
          );
          return; // Ne pas vérifier le token pendant la sélection d'abonnement
        }

        // 🚀 CORRECTION : Vérifier la connexion explicite ET user_data avant d'appeler l'API
        const explicitConnection = await AsyncStorage.getItem(
          "explicit_connection",
        );
        if (explicitConnection !== "true") {
          console.log(
            "🔍 [DEBUG] Pas de connexion explicite - pas de vérification API",
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

        // 🌐 NOUVEAU : Vérifier la connectivité avant d'appeler l'API
        if (!isNetworkReadyForApi(networkStatusRef.current)) {
          console.log(
            "🌐 [OFFLINE] Pas de connexion réseau - token considéré comme valide en mode offline",
          );
          return; // Ne pas vérifier le token en mode offline
        }

        console.log(
          "🔐 Vérification périodique du token - utilisateur connecté",
        );
        if (await isStoredUserVip()) {
          await ensureVipSessionPersistence();
          console.log("👑 [VIP] Vérification token ignorée — session locale VIP");
          return;
        }

        const result = await apiClient.verifyAuth();
        if (!result?.success) {
          const refreshed = await apiClient.refreshSession();
          if (refreshed) {
            const retry = await apiClient.verifyAuth();
            if (retry?.success) {
              console.log("✅ Session rafraîchie après expiration token");
              return;
            }
          }

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
  }, [
    showToast,
    deactivatePremium,
    networkStatus.isConnected,
    networkStatus.isInternetReachable,
  ]);

  // 🚀 NOUVEAU : Vérifier la connexion explicite et maintenir le premium si connecté
  useEffect(() => {
    const checkExplicitConnection = async () => {
      try {
        if (await isAccountLogoutLocked()) {
          await deactivatePremium();
          return;
        }

        // 🎯 VIP PROTECTION : Vérifier d'abord si l'utilisateur est VIP
        if (await isStoredUserVip()) {
          await ensureVipSessionPersistence();
          console.log(
            "👑 [VIP PROTECTION] Utilisateur VIP détecté - pas de déconnexion automatique",
          );
          return;
        }

        const storedUser = await AsyncStorage.getItem(
          STORAGE_KEYS.PREMIUM_USER,
        );
        if (storedUser) {
          const parsedUser = safeJsonParse<any>(storedUser, null);
          if (isVipUserRecord(parsedUser)) {
            console.log(
              "👑 [VIP PROTECTION] Utilisateur VIP détecté - pas de déconnexion automatique",
            );
            return; // NE JAMAIS déconnecter les VIP
          }
        }

        // Vérifier aussi dans user_data
        const userData = await AsyncStorage.getItem("user_data");
        if (userData) {
          const parsedUserData = safeJsonParse<any>(userData, null);
          if (isVipUserRecord(parsedUserData)) {
            console.log(
              "👑 [VIP PROTECTION] Utilisateur VIP détecté dans user_data - pas de déconnexion automatique",
            );
            return; // NE JAMAIS déconnecter les VIP
          }
        }

        // Vérifier si l'utilisateur est connecté explicitement
        const isExplicitConnection = await AsyncStorage.getItem(
          "explicit_connection",
        );

        if (isExplicitConnection === "true" && userData) {
          // Connexion explicite détectée - maintenir le premium
          console.log(
            "🔍 [DEBUG] Mode professionnel - connexion explicite détectée, maintien du premium",
          );
          // Ne pas désactiver le premium
          return;
        } else {
          // Pas de connexion explicite - désactiver le premium (sauf VIP déjà vérifié ci-dessus)
          console.log(
            "🔍 [DEBUG] Mode professionnel - aucune connexion explicite, désactivation du premium",
          );
          await deactivatePremium();
        }
      } catch (error) {
        console.log(
          "❌ [DEBUG] Erreur vérification connexion explicite:",
          error,
        );
        // 🎯 VIP PROTECTION : Ne pas désactiver en cas d'erreur (pourrait être un VIP)
        console.log(
          "⚠️ [SECURITY] Erreur détectée - pas de désactivation automatique pour éviter de déconnecter les VIP",
        );
      }
    };

    // Vérifier la connexion toutes les 5 minutes
    const interval = setInterval(checkExplicitConnection, 5 * 60 * 1000);

    // Vérifier après un délai pour laisser le temps au loadPremiumData de s'exécuter
    const timeout = setTimeout(checkExplicitConnection, 3000); // 3 secondes au lieu de 1

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [deactivatePremium]);

  const loadPremiumData = async (options?: { force?: boolean }) => {
    if (loadPremiumDataInFlight) {
      return loadPremiumDataInFlight;
    }

    const now = Date.now();
    if (
      !options?.force &&
      now - lastLoadPremiumAtRef.current < LOAD_PREMIUM_MIN_INTERVAL_MS
    ) {
      return;
    }

    lastLoadPremiumAtRef.current = now;

    loadPremiumDataInFlight = (async () => {
    try {
      setLoading(true);

      if (await isAccountLogoutLocked()) {
        if (!(await hasExplicitAuthSession())) {
          const hasPurchasedPremium = user.hasPurchasedPremium === true;
          setUser({ ...defaultUser, hasPurchasedPremium });
          setLoading(false);
          return;
        }
      }

      // 🚀 PRIORITÉ : synchroniser le serveur AVANT toute vérification d'expiration locale
      try {
        const token = await AsyncStorage.getItem("auth_token");
        if (
          token &&
          (await hasExplicitAuthSession()) &&
          isNetworkReadyForApi(networkStatusRef.current)
        ) {
          console.log(
            "🔄 [SYNC] Chargement premium — source serveur en premier",
          );

          const refreshed = await refreshUserDataFromServer();
          if (
            refreshed &&
            isPremiumActiveOnServer(
              refreshed as unknown as Record<string, unknown>,
            )
          ) {
            const premiumUser = createPremiumUserFromServer(
              refreshed as unknown as Record<string, unknown>,
            );
            await AsyncStorage.setItem(
              STORAGE_KEYS.PREMIUM_USER,
              JSON.stringify(premiumUser),
            );
            setUser(premiumUser);
            console.log(
              "✅ [SYNC] Premium restauré depuis le serveur avant vérif locale",
            );
            syncAndroidAuthTokenIfNeeded(token);
            return;
          }
        }
      } catch (syncError) {
        console.log("⚠️ [SYNC] Erreur sync serveur prioritaire:", syncError);
      }

      // 🍎 iOS : lier RevenueCat à l'email de session + sync expiration vers le backend
      if (Platform.OS === "ios") {
        try {
          const iapService = IapService.getInstance();
          await iapService.init();

          const [token, storedEmail] = await Promise.all([
            AsyncStorage.getItem("auth_token"),
            getStoredAccountEmail(),
          ]);
          // Liaison RC seulement si session connectée (évite course à l'inscription)
          if (storedEmail && token) {
            await iapService.linkAccount(storedEmail);
          }

          const isIapPremium = await iapService.checkPremiumStatus();

          if (
            isIapPremium &&
            token &&
            isNetworkReadyForApi(networkStatusRef.current)
          ) {
            const snap = await iapService.getActiveEntitlementSnapshot();
            if (snap) {
              try {
                await apiClient.syncIosPremiumRenewal({
                  expiration_at_ms: snap.expirationAtMs,
                  product_id: snap.productId,
                  original_transaction_id: snap.originalTransactionId,
                });
              } catch (syncErr) {
                console.warn("⚠️ [PremiumContext] sync-ios-premium:", syncErr);
              }
            }
          }

          if (isIapPremium && (await hasExplicitAuthSession()) && !(await isAccountLogoutLocked())) {
            console.log("🍎 [PremiumContext] Premium détecté via RevenueCat");

            const serverUserData = await refreshUserDataFromServer();
            if (
              serverUserData &&
              isPremiumActiveOnServer(
                serverUserData as unknown as Record<string, unknown>,
              )
            ) {
              const iapUser = createPremiumUserFromServer(
                serverUserData as unknown as Record<string, unknown>,
              );
              await AsyncStorage.setItem(
                STORAGE_KEYS.PREMIUM_USER,
                JSON.stringify(iapUser),
              );
              setUser(iapUser);
            } else {
              const snap = await iapService.getActiveEntitlementSnapshot();
              const iapUser: PremiumUser = {
                isPremium: true,
                isVip: false,
                subscriptionType: snap?.productId?.includes("yearly")
                  ? "yearly"
                  : snap?.productId?.includes("monthly")
                    ? "monthly"
                    : null,
                subscriptionId: snap?.originalTransactionId ?? null,
                expiryDate: snap ? new Date(snap.expirationAtMs) : null,
                features: [...PREMIUM_FEATURES],
                hasPurchasedPremium: true,
                premiumActivatedAt: new Date(),
                premiumType: "Apple In-App Purchase",
                vipReason: null,
                vipGrantedBy: null,
                vipGrantedAt: null,
              };
              await AsyncStorage.setItem(
                STORAGE_KEYS.PREMIUM_USER,
                JSON.stringify(iapUser),
              );
              setUser(iapUser);
            }

            setLoading(false);
            return;
          }
        } catch (iapError) {
          console.error(
            "❌ [PremiumContext] Erreur vérification IAP:",
            iapError,
          );
        }
      }

      // 🕐 NOUVEAU : Vérifier l'expiration locale AVANT tout
      await checkLocalPremiumExpiration();

      // 🔧 NOUVEAU : Synchroniser les fichiers premium avec le JSON
      try {
        const premiumManager = PremiumContentManager.getInstance();
        const syncResult =
          await premiumManager.syncDownloadedContentWithFiles();
        if (syncResult.fixed > 0) {
          console.log(
            `✅ [PremiumContext] ${syncResult.fixed} fichiers premium synchronisés`,
          );
        }
        if (syncResult.errors.length > 0) {
          console.log(
            "⚠️ [PremiumContext] Erreurs synchronisation:",
            syncResult.errors,
          );
        }
      } catch (syncError) {
        console.error(
          "❌ [PremiumContext] Erreur synchronisation fichiers premium:",
          syncError,
        );
      }

      // 🔗 Android : sync token natif (debounced — évite boucle après connexion)
      try {
        const token = await AsyncStorage.getItem("auth_token");
        syncAndroidAuthTokenIfNeeded(token);
      } catch (tokenError) {
        console.error(
          "❌ [PremiumContext] Erreur synchronisation token:",
          tokenError,
        );
      }

      // 🔧 Synchroniser avec user_data (déjà rafraîchi depuis le serveur en début de flux)
      const userData = await AsyncStorage.getItem("user_data");
      if (userData && (await hasExplicitAuthSession())) {
        let parsedUserData: any = null;
        try {
          parsedUserData = JSON.parse(userData);
        } catch {
          parsedUserData = null;
        }
        if (!parsedUserData) return;

        const normalizedUserData = normalizeStoredUserData(parsedUserData);

        if (isPremiumActiveOnServer(normalizedUserData)) {
          const premiumUser = createPremiumUserFromServer(normalizedUserData);
          await AsyncStorage.setItem(
            STORAGE_KEYS.PREMIUM_USER,
            JSON.stringify(premiumUser),
          );
          setUser(premiumUser);
          console.log(`✅ [SYNC] ${premiumUser.premiumType} Context synchronisé !`);
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

        const isPremium = await resolveStoredPremiumActive(parsedUser);

        const newUser = {
          ...parsedUser,
          expiryDate: parsedUser.expiryDate
            ? new Date(parsedUser.expiryDate)
            : null,
          isPremium,
          hasPurchasedPremium: !!parsedUser.hasPurchasedPremium,
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
    })().finally(() => {
      loadPremiumDataInFlight = null;
    });

    return loadPremiumDataInFlight;
  };

  const checkPremiumStatus = async () => {
    await loadPremiumData({ force: true });
  };

  const activatePremium = async (
    type: "monthly" | "yearly" | "family",
    subscriptionId: string,
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
        JSON.stringify(newUser),
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
        "🔍 [DEBUG] Mode professionnel - aucune vérification automatique des données utilisateur",
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
      await setAccountLogoutLock();
      clearAndroidAuthTokenSyncCache();
      if (Platform.OS === "ios") {
        try {
          await IapService.getInstance().logout();
        } catch (iapLogoutErr) {
          console.warn("⚠️ [PremiumContext] RevenueCat logOut:", iapLogoutErr);
        }
      }
      await runBackupSignOut();
      const hasPurchasedPremium = user.hasPurchasedPremium === true;
      setUser({ ...defaultUser, hasPurchasedPremium });
      await Promise.all([
        runPremiumAppearanceReset({ force: true }),
        clearLocalAuthSession(),
      ]);
      await deactivatePremium();
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
          JSON.stringify(activatedUser),
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
                "Aucun compte premium n'est associé à cet appareil. Créez un compte ou achetez le premium.",
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
  const context = use(PremiumContext);
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
