import AsyncStorage from "@react-native-async-storage/async-storage";
import { safeJsonParse } from "./safeJson";

const PREMIUM_USER_KEY = "@prayer_app_premium_user";

function isVipFromParsedUser(parsed: Record<string, unknown> | null): boolean {
  if (!parsed) {
    return false;
  }

  return (
    parsed.isVip === true ||
    parsed.is_vip === true ||
    Number(parsed.is_vip) === 1 ||
    parsed.subscription_platform === "vip" ||
    parsed.premiumType === "VIP Gratuit à Vie"
  );
}

/** Détecte un compte VIP depuis le stockage local (premium_user ou user_data). */
export async function isStoredUserVip(): Promise<boolean> {
  const [premiumUserRaw, userDataRaw] = await Promise.all([
    AsyncStorage.getItem(PREMIUM_USER_KEY),
    AsyncStorage.getItem("user_data"),
  ]);

  if (premiumUserRaw) {
    const parsed = safeJsonParse<Record<string, unknown>>(premiumUserRaw, null);
    if (isVipFromParsedUser(parsed)) {
      return true;
    }
  }

  if (userDataRaw) {
    const parsed = safeJsonParse<Record<string, unknown>>(userDataRaw, null);
    if (isVipFromParsedUser(parsed)) {
      return true;
    }
  }

  return false;
}

/** Rétablit explicit_connection pour les VIP (session locale persistante). */
export async function ensureVipSessionPersistence(): Promise<void> {
  if (!(await isStoredUserVip())) {
    return;
  }

  await AsyncStorage.setItem("explicit_connection", "true");
  console.log("👑 [VIP] explicit_connection restauré pour session locale");
}
