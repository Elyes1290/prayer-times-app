import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import apiClient from "./apiClient";
import { IapService } from "./iapService";
import { isVipUserRecord } from "./isVipUser";
import { hasExplicitAuthSession } from "./userAuth";
import type { UserData } from "./userAuth";
import { safeJsonParse } from "./safeJson";
const VIP_PLACEHOLDER_EXPIRY_YEAR = 2099;

export function isPlaceholderVipExpiry(expiry: string | undefined): boolean {
  if (!expiry) {
    return false;
  }

  const expiryDate = new Date(expiry);
  return (
    !Number.isNaN(expiryDate.getTime()) &&
    expiryDate.getFullYear() >= VIP_PLACEHOLDER_EXPIRY_YEAR
  );
}

/** Délai avant déconnexion si le renouvellement n'est pas confirmé (Stripe / RevenueCat). */
export const PREMIUM_GRACE_PERIOD_DAYS = 3;

export function getDaysPastExpiry(
  expiry: string | Date | null | undefined,
): number {
  if (!expiry) {
    return 0;
  }

  const expiryDate = expiry instanceof Date ? expiry : new Date(expiry);
  if (Number.isNaN(expiryDate.getTime())) {
    return 0;
  }

  const diffMs = Date.now() - expiryDate.getTime();
  if (diffMs <= 0) {
    return 0;
  }

  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

export function isWithinPremiumGracePeriod(
  expiry: string | Date | null | undefined,
): boolean {
  const daysPast = getDaysPastExpiry(expiry);
  return daysPast > 0 && daysPast <= PREMIUM_GRACE_PERIOD_DAYS;
}

export function isNetworkReadyForApi(status: {
  isConnected: boolean;
  isInternetReachable: boolean;
}): boolean {
  return status.isConnected && status.isInternetReachable !== false;
}

export function isPremiumActiveOnServer(
  serverUser: Record<string, unknown> | null | undefined,
): boolean {
  if (!serverUser) {
    return false;
  }

  if (isVipUserRecord(serverUser)) {
    return true;
  }

  if (Number(serverUser.premium_status) !== 1) {
    return false;
  }

  const expiry = serverUser.premium_expiry as string | undefined;
  if (!expiry) {
    return true;
  }

  const expiryDate = new Date(expiry);
  if (!Number.isNaN(expiryDate.getTime()) && expiryDate > new Date()) {
    return true;
  }

  // Période de grâce : le backend peut être en retard (webhook Stripe / RevenueCat)
  return isWithinPremiumGracePeriod(expiryDate);
}

/** Tente de resynchroniser le premium depuis le serveur après expiration locale. */
export async function trySyncPremiumFromServer(
  networkStatus: {
    isConnected: boolean;
    isInternetReachable: boolean;
  },
): Promise<Record<string, unknown> | null> {
  if (
    !isNetworkReadyForApi(networkStatus) ||
    !(await hasExplicitAuthSession())
  ) {
    return null;
  }

  const result = await apiClient.getUser();
  if (!result.success || !result.data) {
    return null;
  }

  const serverUser = result.data as Record<string, unknown>;
  if (!isPremiumActiveOnServer(serverUser)) {
    return null;
  }

  const userDataToUpdate = buildUserDataFromServer(serverUser);
  await AsyncStorage.setItem("user_data", JSON.stringify(userDataToUpdate));
  return serverUser;
}

export function buildUserDataFromServer(
  serverUser: Record<string, unknown>,
): UserData {
  const isVip = isVipUserRecord(serverUser);
  let subscription_platform = serverUser.subscription_platform as
    | string
    | undefined;
  // Ancien marqueur VIP révoqué (is_vip=0 mais platform encore "vip")
  if (!isVip && subscription_platform === "vip") {
    subscription_platform = undefined;
  }

  return {
    id: serverUser.id as number,
    user_id: serverUser.id as number,
    email: serverUser.email as string,
    user_first_name: serverUser.user_first_name as string,
    premium_status: Number(serverUser.premium_status ?? 0),
    subscription_type: serverUser.subscription_type as string | undefined,
    subscription_id: serverUser.subscription_id as string | undefined,
    subscription_platform,
    stripe_customer_id: serverUser.stripe_customer_id as string | undefined,
    premium_expiry: serverUser.premium_expiry as string | undefined,
    premium_activated_at: serverUser.premium_activated_at as string | undefined,
    language: serverUser.language as string,
    last_sync: new Date().toISOString(),
    device_id: serverUser.device_id as string | undefined,
    is_vip: isVip,
    vip_reason: (serverUser.vip_reason as string | null) ?? null,
    vip_granted_by: (serverUser.vip_granted_by as string | null) ?? null,
    vip_granted_at: serverUser.vip_granted_at as string | undefined,
  };
}

/** Nettoie les marqueurs VIP obsolètes restés en cache local. */
export function normalizeStoredUserData(userData: UserData): UserData {
  const hasPaidSubscriptionMarkers =
    userData.subscription_platform === "apple" ||
    userData.subscription_platform === "stripe" ||
    userData.subscription_type === "monthly" ||
    userData.subscription_type === "yearly" ||
    Boolean(userData.stripe_customer_id) ||
    Boolean(userData.subscription_id);

  const looksLikeStaleVip =
    isVipUserRecord(userData) &&
    hasPaidSubscriptionMarkers &&
    userData.subscription_platform !== "vip";

  if (looksLikeStaleVip) {
    let premium_expiry = userData.premium_expiry;
    if (premium_expiry && isPlaceholderVipExpiry(premium_expiry)) {
      premium_expiry = undefined;
    }

    return {
      ...userData,
      is_vip: false,
      premium_expiry,
      subscription_platform:
        userData.subscription_platform === "vip"
          ? "apple"
          : userData.subscription_platform,
    };
  }

  if (isVipUserRecord(userData)) {
    return userData;
  }
  let premium_expiry = userData.premium_expiry;
  if (premium_expiry && isPlaceholderVipExpiry(premium_expiry)) {
    premium_expiry = undefined;
  }

  return {
    ...userData,
    is_vip: false,
    premium_expiry,
    subscription_platform:
      userData.subscription_platform === "vip"
        ? undefined
        : userData.subscription_platform,
  };
}

const PREMIUM_USER_STORAGE_KEY = "@prayer_app_premium_user";

/** Aligne le blob premium local quand le serveur n'est plus VIP (ex. ancien 2099). */
export async function reconcilePremiumUserStorage(
  serverUser: Record<string, unknown>,
): Promise<void> {
  if (isVipUserRecord(serverUser)) {
    return;
  }

  const raw = await AsyncStorage.getItem(PREMIUM_USER_STORAGE_KEY);
  if (!raw) {
    return;
  }

  const parsed = safeJsonParse<Record<string, unknown>>(raw, null);
  if (!parsed) {
    return;
  }

  const hasStaleVipMarkers =
    parsed.isVip === true ||
    isVipUserRecord(parsed) ||
    parsed.premiumType === "VIP Gratuit à Vie" ||
    (typeof parsed.expiryDate === "string" &&
      isPlaceholderVipExpiry(parsed.expiryDate));

  if (!hasStaleVipMarkers) {
    return;
  }

  if (!isPremiumActiveOnServer(serverUser)) {
    await AsyncStorage.removeItem(PREMIUM_USER_STORAGE_KEY);
    return;
  }

  const serverExpiry = serverUser.premium_expiry as string | undefined;
  const platform = serverUser.subscription_platform as string | undefined;

  await AsyncStorage.setItem(
    PREMIUM_USER_STORAGE_KEY,
    JSON.stringify({
      ...parsed,
      isPremium: true,
      isVip: false,
      expiryDate: serverExpiry ? new Date(serverExpiry) : parsed.expiryDate,
      premiumType:
        platform === "apple" ? "Apple In-App Purchase" : "Premium Payant",
      subscriptionType:
        serverUser.subscription_type ?? parsed.subscriptionType ?? "monthly",
    }),
  );
}

/** iOS : corrige l'affichage si le serveur a encore une expiry VIP (2099) ou platform "vip" obsolète. */
export async function enrichUserDataWithIosSubscription(
  userData: UserData,
): Promise<UserData> {
  if (Platform.OS !== "ios") {
    return userData;
  }

  if (
    isVipUserRecord(userData) &&
    !(userData.premium_expiry && isPlaceholderVipExpiry(userData.premium_expiry))
  ) {
    return userData;
  }

  if (
    isPlaceholderVipExpiry(userData.premium_expiry) &&
    !isVipUserRecord(userData)
  ) {
    userData = normalizeStoredUserData(userData);
  }

  try {
    const iapService = IapService.getInstance();
    await iapService.init();
    const snap = await iapService.getActiveEntitlementSnapshot();
    if (!snap) {
      return userData;
    }

    const rcExpiry = new Date(snap.expirationAtMs).toISOString();
    const subType = snap.productId.includes("yearly") ? "yearly" : "monthly";
    const shouldOverrideExpiry =
      !userData.premium_expiry ||
      isPlaceholderVipExpiry(userData.premium_expiry) ||
      userData.subscription_platform === "vip";

    return {
      ...userData,
      subscription_platform: "apple",
      subscription_type: subType,
      ...(shouldOverrideExpiry ? { premium_expiry: rcExpiry } : {}),
    };
  } catch {
    return userData;
  }
}

/** Récupère user_data depuis l'API et met à jour AsyncStorage. */
export async function refreshUserDataFromServer(): Promise<UserData | null> {
  try {
    if (!(await hasExplicitAuthSession())) {
      return null;
    }

    const result = await apiClient.getUser();
    if (!result.success || !result.data) {
      return null;
    }

    let userDataToStore = buildUserDataFromServer(
      result.data as Record<string, unknown>,
    );
    userDataToStore = normalizeStoredUserData(userDataToStore);
    userDataToStore = await enrichUserDataWithIosSubscription(userDataToStore);
    await AsyncStorage.setItem("user_data", JSON.stringify(userDataToStore));
    await reconcilePremiumUserStorage(result.data as Record<string, unknown>);
    return userDataToStore;
  } catch (error) {
    console.error("❌ Erreur refreshUserDataFromServer:", error);
    return null;
  }
}
