// hooks/useRamadanSeason.ts
//
// Version LÉGÈRE de useRamadan : uniquement la saison en cours (phase, jour…) pour les
// points d'entrée (bannière d'accueil, menu « Plus »). Aucun chargement de progression,
// aucune synchro, aucune reprogrammation de notification.

import { useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import {
  getRamadanSeason,
  parseLocalDateKey,
  toLocalDateKey,
  type RamadanSeason,
} from "../utils/ramadan/season";
import {
  loadRamadanSettings,
  subscribeRamadanSettings,
} from "../utils/ramadan/storage";

export function useRamadanSeason(): RamadanSeason {
  const [dayKey, setDayKey] = useState(() => toLocalDateKey(new Date()));
  const [offset, setOffset] = useState(0);

  // Retour au premier plan : le jour a peut-être changé.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setDayKey(toLocalDateKey(new Date()));
    });
    return () => subscription.remove();
  }, []);

  // Décalage de début : lecture initiale + mises à jour depuis « Mon Ramadan ».
  useEffect(() => {
    let cancelled = false;
    void loadRamadanSettings().then((settings) => {
      if (!cancelled) setOffset(settings.startOffsetDays);
    });
    const unsubscribe = subscribeRamadanSettings((settings) => {
      setOffset(settings.startOffsetDays);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return useMemo(
    () => getRamadanSeason(parseLocalDateKey(dayKey) ?? new Date(), offset),
    [dayKey, offset],
  );
}
