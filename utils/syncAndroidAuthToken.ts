import { NativeModules, Platform } from "react-native";

let lastSyncedToken: string | null = null;
let lastSyncAt = 0;
const MIN_SYNC_INTERVAL_MS = 10_000;

/** Sync auth token vers SharedPreferences natives (Android) — une fois par token / 10 s max. */
export function syncAndroidAuthTokenIfNeeded(
  token: string | null | undefined,
): void {
  if (Platform.OS !== "android") {
    return;
  }

  const normalized = token?.trim() ?? "";
  const now = Date.now();

  if (
    normalized === lastSyncedToken &&
    now - lastSyncAt < MIN_SYNC_INTERVAL_MS
  ) {
    return;
  }

  const module = NativeModules?.QuranAudioServiceModule;
  if (!module?.syncAuthToken) {
    return;
  }

  module.syncAuthToken(normalized || null);
  lastSyncedToken = normalized || null;
  lastSyncAt = now;
}

export function clearAndroidAuthTokenSyncCache(): void {
  lastSyncedToken = null;
  lastSyncAt = 0;

  if (Platform.OS !== "android") {
    return;
  }

  const module = NativeModules?.QuranAudioServiceModule;
  if (module?.syncAuthToken) {
    module.syncAuthToken(null);
  }
}
