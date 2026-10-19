// hooks/useRamadan.ts
//
// État et actions de la fonctionnalité « Mon Ramadan » (hors ligne d'abord).
// - Réglages et progression sont enregistrés immédiatement dans AsyncStorage.
// - Abonnés connectés : synchronisation serveur différée (anti-rebond) ; la fusion est
//   faite par le serveur, et on re-fusionne avec les éventuelles saisies faites entre-temps.
// - Les rappels (suhoor, iftar, lecture, Laylat) sont reprogrammés via le mécanisme
//   existant `saveAndReprogramAll` — jamais en parallèle d'un autre système.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { usePremium } from "../contexts/PremiumContext";
import { useSettings } from "../contexts/SettingsContext";
import { hasExplicitAuthSession } from "../utils/userAuth";
import {
  createKhatmPlan as buildKhatmPlan,
  setKhatmDayProgress,
} from "../utils/ramadan/khatm";
import {
  clampStartOffset,
  getRamadanSeason,
  parseLocalDateKey,
  startOfLocalDay,
  toLocalDateKey,
  type RamadanSeason,
} from "../utils/ramadan/season";
import {
  computeFastingStats,
  createEmptyRamadanData,
  DEFAULT_RAMADAN_SETTINGS,
  loadRamadanData,
  loadRamadanSettings,
  mergeRamadanData,
  saveRamadanData,
  saveRamadanSettings,
  type FastingStats,
  type FastStatus,
  type RamadanData,
  type RamadanSettings,
} from "../utils/ramadan/storage";
import { syncRamadanData } from "../utils/ramadan/sync";
import { computeRamadanBadges, type RamadanBadge } from "../utils/ramadan/badges";
import { computeRamadanRecap, type RamadanRecap } from "../utils/ramadan/recap";
import { computeWorshipStats, type WorshipStats } from "../utils/ramadan/worship";

const SYNC_DEBOUNCE_MS = 2500;
const REPROGRAM_DEBOUNCE_MS = 1500;
const CLOCK_TICK_MS = 60_000;

export interface UseRamadanResult {
  /** Réglages et données chargés depuis le stockage. */
  ready: boolean;
  isPremium: boolean;
  now: Date;
  todayKey: string;
  season: RamadanSeason;
  settings: RamadanSettings;
  data: RamadanData;
  stats: FastingStats;
  worship: WorshipStats;
  badges: RamadanBadge[];
  recap: RamadanRecap;
  updateSettings: (patch: Partial<RamadanSettings>) => void;
  setFastStatus: (dateKey: string, status: FastStatus) => void;
  /** Coche / décoche la prière de nuit du soir `dateKey`. */
  setTarawih: (dateKey: string, done: boolean) => void;
  /** Coche / décoche la sadaqa du jour `dateKey`. */
  setSadaqa: (dateKey: string, done: boolean) => void;
  setQadaDoneCount: (count: number) => void;
  createKhatmPlan: (goalKhatms: number, days: number) => void;
  deleteKhatmPlan: () => void;
  setKhatmProgress: (dateKey: string, juz: number) => void;
}

export function useRamadan(): UseRamadanResult {
  const { user } = usePremium();
  const isPremium = !!user?.isPremium;
  const { saveAndReprogramAll } = useSettings();

  const [now, setNow] = useState(() => new Date());
  const [settings, setSettingsState] = useState<RamadanSettings>(
    DEFAULT_RAMADAN_SETTINGS,
  );
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [data, setData] = useState<RamadanData | null>(null);

  // Refs : valeurs « les plus récentes » pour les callbacks différés (timers).
  const dataRef = useRef<RamadanData | null>(null);
  const settingsRef = useRef<RamadanSettings>(DEFAULT_RAMADAN_SETTINGS);
  const isPremiumRef = useRef(isPremium);
  const reprogramRef = useRef(saveAndReprogramAll);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reprogramTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isPremiumRef.current = isPremium;
    reprogramRef.current = saveAndReprogramAll;
  }, [isPremium, saveAndReprogramAll]);

  // --- Horloge : minute par minute + retour au premier plan ----------------
  useEffect(() => {
    const tick = () => setNow(new Date());
    const interval = setInterval(tick, CLOCK_TICK_MS);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") tick();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  // --- Réglages -------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    void loadRamadanSettings().then((loaded) => {
      if (cancelled) return;
      settingsRef.current = loaded;
      setSettingsState(loaded);
      setSettingsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Saison (ne change qu'à minuit ou si le décalage change) --------------
  const todayKey = toLocalDateKey(now);
  const startOffsetDays = settings.startOffsetDays;
  const season = useMemo(
    () =>
      getRamadanSeason(parseLocalDateKey(todayKey) ?? new Date(), startOffsetDays),
    [todayKey, startOffsetDays],
  );
  const hijriYear = season.hijriYear;

  // --- Données de l'année -----------------------------------------------------
  useEffect(() => {
    if (!settingsLoaded || hijriYear <= 0) return;
    let cancelled = false;
    void loadRamadanData(hijriYear).then((loaded) => {
      if (cancelled) return;
      dataRef.current = loaded;
      setData(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [settingsLoaded, hijriYear]);

  // --- Synchronisation serveur ----------------------------------------------
  const adoptRemote = useCallback(async (remote: RamadanData | null) => {
    if (!remote || !dataRef.current) return;
    // Re-fusion avec l'état courant : une saisie faite pendant la requête n'est pas perdue.
    const merged = mergeRamadanData(dataRef.current, remote);
    dataRef.current = merged;
    setData(merged);
    await saveRamadanData(merged);
  }, []);

  const runSync = useCallback(
    async (force: boolean) => {
      const current = dataRef.current;
      if (!current || !isPremiumRef.current) return;
      if (!(await hasExplicitAuthSession())) return;
      const merged = await syncRamadanData(current, { force });
      await adoptRemote(merged);
    },
    [adoptRemote],
  );

  const queueSync = useCallback(() => {
    if (!isPremiumRef.current) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      syncTimerRef.current = null;
      void runSync(true);
    }, SYNC_DEBOUNCE_MS);
  }, [runSync]);

  // Synchro à l'ouverture de l'écran (une fois les données chargées).
  const hasData = data !== null;
  useEffect(() => {
    if (hasData && isPremium) {
      void runSync(false);
    }
  }, [hasData, isPremium, runSync]);

  // --- Reprogrammation des rappels ------------------------------------------
  const queueReprogram = useCallback(() => {
    if (!isPremiumRef.current) return;
    if (reprogramTimerRef.current) clearTimeout(reprogramTimerRef.current);
    reprogramTimerRef.current = setTimeout(() => {
      reprogramTimerRef.current = null;
      void reprogramRef.current().catch((error: unknown) => {
        console.warn("⚠️ [Ramadan] Reprogrammation des rappels impossible:", error);
      });
    }, REPROGRAM_DEBOUNCE_MS);
  }, []);

  // Nettoyage des timers au démontage
  useEffect(
    () => () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      if (reprogramTimerRef.current) {
        // Reprogrammation en attente (l'utilisateur a quitté l'écran < 1,5 s après un
        // réglage) : on l'exécute tout de suite au lieu de la perdre.
        clearTimeout(reprogramTimerRef.current);
        reprogramTimerRef.current = null;
        void reprogramRef.current().catch((error: unknown) => {
          console.warn("⚠️ [Ramadan] Reprogrammation des rappels impossible:", error);
        });
      }
    },
    [],
  );

  // --- Mutations ----------------------------------------------------------------
  const mutateData = useCallback(
    (updater: (current: RamadanData) => RamadanData, reprogram: boolean) => {
      const current = dataRef.current;
      if (!current) return;
      const next = updater(current);
      dataRef.current = next;
      setData(next);
      void saveRamadanData(next);
      queueSync();
      if (reprogram) queueReprogram();
    },
    [queueSync, queueReprogram],
  );

  const updateSettings = useCallback(
    (patch: Partial<RamadanSettings>) => {
      const previous = settingsRef.current;
      const next: RamadanSettings = {
        ...previous,
        ...patch,
        startOffsetDays: clampStartOffset(
          patch.startOffsetDays ?? previous.startOffsetDays,
        ),
      };
      settingsRef.current = next;
      setSettingsState(next);
      void saveRamadanSettings(next);
      queueReprogram();
    },
    [queueReprogram],
  );

  const setFastStatus = useCallback(
    (dateKey: string, status: FastStatus) => {
      mutateData(
        (current) => ({
          ...current,
          fasting: {
            ...current.fasting,
            [dateKey]: { status, updatedAt: Date.now() },
          },
        }),
        false,
      );
    },
    [mutateData],
  );

  const setTarawih = useCallback(
    (dateKey: string, done: boolean) => {
      mutateData(
        (current) => ({
          ...current,
          tarawih: { ...current.tarawih, [dateKey]: { done, updatedAt: Date.now() } },
        }),
        false,
      );
    },
    [mutateData],
  );

  const setSadaqa = useCallback(
    (dateKey: string, done: boolean) => {
      mutateData(
        (current) => ({
          ...current,
          sadaqa: { ...current.sadaqa, [dateKey]: { done, updatedAt: Date.now() } },
        }),
        false,
      );
    },
    [mutateData],
  );

  const setQadaDoneCount = useCallback(
    (count: number) => {
      mutateData(
        (current) => ({
          ...current,
          qadaDone: {
            count: Math.max(0, Math.min(366, Math.trunc(count))),
            updatedAt: Date.now(),
          },
        }),
        false,
      );
    },
    [mutateData],
  );

  const createKhatmPlan = useCallback(
    (goalKhatms: number, days: number) => {
      const today = startOfLocalDay(new Date());
      const season = getRamadanSeason(today, startOffsetDays);
      // Le plan démarre au premier jour de Ramadan, ou aujourd'hui si le mois a commencé.
      const start =
        season.phase === "countdown" || season.phase === "off"
          ? season.startDate
          : today;
      const plan = buildKhatmPlan(goalKhatms, days, toLocalDateKey(start));
      mutateData(
        (current) => ({
          ...current,
          khatmPlan: plan,
          khatmLog: {},
        }),
        true,
      );
    },
    [mutateData, startOffsetDays],
  );

  const deleteKhatmPlan = useCallback(() => {
    mutateData(
      (current) => ({
        ...current,
        khatmPlan: null,
        khatmPlanDeletedAt: Date.now(),
        khatmLog: {},
      }),
      true,
    );
  }, [mutateData]);

  const setKhatmProgress = useCallback(
    (dateKey: string, juz: number) => {
      mutateData((current) => {
        if (!current.khatmPlan) return current;
        return {
          ...current,
          khatmLog: setKhatmDayProgress(
            current.khatmPlan,
            current.khatmLog,
            dateKey,
            juz,
          ),
        };
      }, true);
    },
    [mutateData],
  );

  const effectiveData = useMemo(
    () => data ?? createEmptyRamadanData(hijriYear),
    [data, hijriYear],
  );
  const stats = useMemo(
    () => computeFastingStats(effectiveData, parseLocalDateKey(todayKey) ?? new Date()),
    [effectiveData, todayKey],
  );

  const worship = useMemo(
    () => computeWorshipStats(effectiveData, season),
    [effectiveData, season],
  );
  const badges = useMemo(
    () => computeRamadanBadges(effectiveData, season, stats),
    [effectiveData, season, stats],
  );

  const recap = useMemo(
    () => computeRamadanRecap(effectiveData, season, stats, badges),
    [effectiveData, season, stats, badges],
  );

  return {
    // hijriYear <= 0 : calendrier hijri indisponible → rien à charger
    ready: settingsLoaded && (hijriYear <= 0 || data !== null),
    isPremium,
    now,
    todayKey,
    season,
    settings,
    data: effectiveData,
    stats,
    worship,
    badges,
    recap,
    updateSettings,
    setFastStatus,
    setTarawih,
    setSadaqa,
    setQadaDoneCount,
    createKhatmPlan,
    deleteKhatmPlan,
    setKhatmProgress,
  };
}