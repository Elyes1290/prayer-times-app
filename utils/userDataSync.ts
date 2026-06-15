import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "./apiClient";
import { hasExplicitAuthSession } from "./userAuth";
import type { UserData } from "./userAuth";

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

  if (serverUser.is_vip === true || Number(serverUser.is_vip) === 1) {
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
  return {
    id: serverUser.id as number,
    user_id: serverUser.id as number,
    email: serverUser.email as string,
    user_first_name: serverUser.user_first_name as string,
    premium_status: Number(serverUser.premium_status ?? 0),
    subscription_type: serverUser.subscription_type as string | undefined,
    subscription_id: serverUser.subscription_id as string | undefined,
    subscription_platform: serverUser.subscription_platform as
      | string
      | undefined,
    stripe_customer_id: serverUser.stripe_customer_id as string | undefined,
    premium_expiry: serverUser.premium_expiry as string | undefined,
    premium_activated_at: serverUser.premium_activated_at as string | undefined,
    language: serverUser.language as string,
    last_sync: new Date().toISOString(),
    device_id: serverUser.device_id as string | undefined,
    is_vip: serverUser.is_vip as boolean | undefined,
    vip_reason: (serverUser.vip_reason as string | null) ?? null,
    vip_granted_by: (serverUser.vip_granted_by as string | null) ?? null,
    vip_granted_at: serverUser.vip_granted_at as string | undefined,
  };
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

    const userDataToStore = buildUserDataFromServer(
      result.data as Record<string, unknown>,
    );
    await AsyncStorage.setItem("user_data", JSON.stringify(userDataToStore));
    return userDataToStore;
  } catch (error) {
    console.error("❌ Erreur refreshUserDataFromServer:", error);
    return null;
  }
}
