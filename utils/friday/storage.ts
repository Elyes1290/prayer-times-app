// utils/friday/storage.ts
//
// Réglages du rappel du vendredi (gratuit). Enregistrés localement uniquement.
// Valeurs par défaut : activé, 08:00 (réglable dans l'écran « Vendredi »).

import AsyncStorage from "@react-native-async-storage/async-storage";
import { safeJsonParse } from "../safeJson";

export const FRIDAY_SETTINGS_KEY = "@friday/settings";

export interface FridaySettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

export const DEFAULT_FRIDAY_SETTINGS: FridaySettings = {
  enabled: true,
  hour: 8,
  minute: 0,
};

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

export function normalizeFridaySettings(raw: unknown): FridaySettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_FRIDAY_SETTINGS };
  const source = raw as Record<string, unknown>;
  return {
    enabled:
      typeof source.enabled === "boolean"
        ? source.enabled
        : DEFAULT_FRIDAY_SETTINGS.enabled,
    hour: clampInt(source.hour, 0, 23, DEFAULT_FRIDAY_SETTINGS.hour),
    minute: clampInt(source.minute, 0, 59, DEFAULT_FRIDAY_SETTINGS.minute),
  };
}

export async function loadFridaySettings(): Promise<FridaySettings> {
  try {
    const raw = await AsyncStorage.getItem(FRIDAY_SETTINGS_KEY);
    return normalizeFridaySettings(safeJsonParse<unknown>(raw, null));
  } catch {
    return { ...DEFAULT_FRIDAY_SETTINGS };
  }
}

/** Ne lève jamais : un échec d'écriture ne doit pas casser l'écran. */
export async function saveFridaySettings(settings: FridaySettings): Promise<void> {
  try {
    await AsyncStorage.setItem(
      FRIDAY_SETTINGS_KEY,
      JSON.stringify(normalizeFridaySettings(settings)),
    );
  } catch (error) {
    console.warn("⚠️ [Vendredi] Réglages non enregistrés:", error);
  }
}
