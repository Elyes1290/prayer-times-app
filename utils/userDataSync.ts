import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "./apiClient";
import type { UserData } from "./userAuth";

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
  return !Number.isNaN(expiryDate.getTime()) && expiryDate > new Date();
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
    const token = await AsyncStorage.getItem("auth_token");
    if (!token) {
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
