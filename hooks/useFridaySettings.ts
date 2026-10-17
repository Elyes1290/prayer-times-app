// hooks/useFridaySettings.ts
//
// Réglages du rappel du vendredi : enregistrés tout de suite, puis les notifications sont
// reprogrammées (anti-rebond) via le mécanisme existant `saveAndReprogramAll`.

import { useCallback, useEffect, useRef, useState } from "react";
import { useSettings } from "../contexts/SettingsContext";
import {
  DEFAULT_FRIDAY_SETTINGS,
  loadFridaySettings,
  saveFridaySettings,
  type FridaySettings,
} from "../utils/friday/storage";

const REPROGRAM_DEBOUNCE_MS = 1500;

export function useFridaySettings() {
  const { saveAndReprogramAll } = useSettings();
  const [settings, setSettings] = useState<FridaySettings>(DEFAULT_FRIDAY_SETTINGS);
  const [ready, setReady] = useState(false);

  const settingsRef = useRef<FridaySettings>(DEFAULT_FRIDAY_SETTINGS);
  const reprogramRef = useRef(saveAndReprogramAll);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    reprogramRef.current = saveAndReprogramAll;
  }, [saveAndReprogramAll]);

  useEffect(() => {
    let cancelled = false;
    void loadFridaySettings().then((loaded) => {
      if (cancelled) return;
      settingsRef.current = loaded;
      setSettings(loaded);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const updateSettings = useCallback((patch: Partial<FridaySettings>) => {
    const next: FridaySettings = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    void saveFridaySettings(next);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void reprogramRef.current().catch((error: unknown) => {
        console.warn("⚠️ [Vendredi] Reprogrammation du rappel impossible:", error);
      });
    }, REPROGRAM_DEBOUNCE_MS);
  }, []);

  return { settings, ready, updateSettings };
}
