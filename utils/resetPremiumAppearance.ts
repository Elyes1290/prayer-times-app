import type {
  AdhanSoundKey,
  BackgroundImageType,
} from "../contexts/SettingsContext";
import { BUILTIN_ADHAN_SOUND_KEYS } from "./adhanSoundList";
import LocalStorageManager from "./localStorageManager";

export type ThemeMode = "auto" | "light" | "dark" | "morning" | "sunset";

const PREMIUM_THEME_MODES = new Set<ThemeMode>(["morning", "sunset"]);
const PREMIUM_BACKGROUND_TYPES = new Set<BackgroundImageType>(["makka", "alquds"]);
const FREE_BACKGROUND: BackgroundImageType = "prophet";
export const DEFAULT_ADHAN_SOUND: AdhanSoundKey = "misharyrachid";

const BUILTIN_ADHAN_SET = new Set<string>(BUILTIN_ADHAN_SOUND_KEYS);

export function resolveFreeThemeMode(themeMode: ThemeMode): ThemeMode {
  if (!PREMIUM_THEME_MODES.has(themeMode)) {
    return themeMode;
  }

  return themeMode === "sunset" ? "dark" : "light";
}

export function resolveFreeBackgroundImageType(
  backgroundImageType: BackgroundImageType,
): BackgroundImageType {
  return PREMIUM_BACKGROUND_TYPES.has(backgroundImageType)
    ? FREE_BACKGROUND
    : backgroundImageType;
}

export function isPremiumAdhanSound(adhanSound: string): boolean {
  return !BUILTIN_ADHAN_SET.has(adhanSound);
}

export function resolveFreeAdhanSound(adhanSound: string): AdhanSoundKey {
  return isPremiumAdhanSound(adhanSound)
    ? DEFAULT_ADHAN_SOUND
    : (adhanSound as AdhanSoundKey);
}

function needsPremiumAdhanReset(adhanSound: string): boolean {
  return isPremiumAdhanSound(adhanSound);
}

export function needsPremiumAppearanceReset(
  themeMode: ThemeMode,
  backgroundImageType: BackgroundImageType,
  adhanSound?: string,
): boolean {
  return (
    PREMIUM_THEME_MODES.has(themeMode) ||
    PREMIUM_BACKGROUND_TYPES.has(backgroundImageType) ||
    (adhanSound != null && needsPremiumAdhanReset(adhanSound))
  );
}

export async function persistFreeAppearanceSettings(
  themeMode: ThemeMode,
  backgroundImageType: BackgroundImageType,
  adhanSound?: AdhanSoundKey,
): Promise<void> {
  const tasks = [
    LocalStorageManager.saveEssential("THEME_MODE", themeMode),
    LocalStorageManager.saveEssential(
      "BACKGROUND_IMAGE_TYPE",
      backgroundImageType,
    ),
  ];

  if (adhanSound != null) {
    tasks.push(LocalStorageManager.saveEssential("ADHAN_SOUND", adhanSound));
  }

  await Promise.all(tasks);
}
