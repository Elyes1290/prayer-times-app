import { useCallback, useEffect, useRef } from "react";
import { Platform, NativeModules } from "react-native";
import type { AdhanSoundKey, BackgroundImageType } from "../contexts/SettingsContext";
import { errorLog } from "../utils/logger";
import LocalStorageManager from "../utils/localStorageManager";
import {
  persistFreeAppearanceSettings,
  resolveFreeAdhanSound,
  resolveFreeBackgroundImageType,
  resolveFreeThemeMode,
  type ThemeMode,
} from "../utils/resetPremiumAppearance";
import {
  registerPremiumAppearanceReset,
  type PremiumAppearanceResetOptions,
} from "../utils/premiumAppearanceSync";

const { AdhanModule } = NativeModules;

type AppearanceSnapshot = {
  themeMode: ThemeMode;
  backgroundImageType: BackgroundImageType;
  adhanSound: AdhanSoundKey;
};

type AppearanceSetters = {
  setThemeModeState: (mode: ThemeMode) => void;
  setBackgroundImageTypeState: (type: BackgroundImageType) => void;
  setAdhanSound: (sound: AdhanSoundKey) => void;
};

export function useRegisterPremiumAppearanceReset(
  snapshot: AppearanceSnapshot,
  setters: AppearanceSetters,
): void {
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const settersRef = useRef(setters);
  settersRef.current = setters;
  const isApplyingRef = useRef(false);

  const applyFreePremiumAppearance = useCallback(
    async (_options?: PremiumAppearanceResetOptions) => {
      const current = snapshotRef.current;
      const { setThemeModeState, setBackgroundImageTypeState, setAdhanSound } =
        settersRef.current;

      const nextTheme = resolveFreeThemeMode(current.themeMode);
      const nextBackground = resolveFreeBackgroundImageType(
        current.backgroundImageType,
      );
      const nextAdhan = resolveFreeAdhanSound(current.adhanSound);

      const themeChanged = nextTheme !== current.themeMode;
      const backgroundChanged = nextBackground !== current.backgroundImageType;
      const adhanChanged = nextAdhan !== current.adhanSound;

      if (!themeChanged && !backgroundChanged && !adhanChanged) {
        return;
      }

      if (isApplyingRef.current) {
        return;
      }

      isApplyingRef.current = true;

      try {
        await persistFreeAppearanceSettings(
          nextTheme,
          nextBackground,
          nextAdhan,
        );

        if (themeChanged) {
          setThemeModeState(nextTheme);
        }
        if (backgroundChanged) {
          setBackgroundImageTypeState(nextBackground);
        }
        if (adhanChanged) {
          setAdhanSound(nextAdhan);
          await LocalStorageManager.saveEssential("ADHAN_SOUND", nextAdhan);
          if (Platform.OS === "android" && AdhanModule) {
            try {
              AdhanModule.setAdhanSound(nextAdhan);
            } catch (error) {
              errorLog(
                "SettingsContext",
                `❌ Erreur sauvegarde son Android: ${error}`,
              );
            }
          }
        }

        console.log(
          `🎨 [Settings] Apparence gratuite → thème ${nextTheme}, fond ${nextBackground}, adhan ${nextAdhan}`,
        );
      } finally {
        isApplyingRef.current = false;
      }
    },
    [],
  );

  useEffect(() => {
    registerPremiumAppearanceReset(applyFreePremiumAppearance);
    return () => registerPremiumAppearanceReset(null);
  }, [applyFreePremiumAppearance]);
}
