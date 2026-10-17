// utils/ramadan/storage.ts
//
// Stockage local (AsyncStorage) des données Ramadan, « hors ligne d'abord ».
// - Réglages : par appareil (jamais synchronisés).
// - Données de l'année (jeûne, khatm) : synchronisées avec le serveur pour les
//   abonnés (cf. sync.ts) ; la fusion se fait clé par clé selon `updatedAt`.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { safeJsonParse } from "../safeJson";
import {
  clampStartOffset,
  diffLocalDays,
  parseLocalDateKey,
  toLocalDateKey,
  addLocalDays,
} from "./season";
import type { KhatmLog, KhatmPlan } from "./khatm";

export const RAMADAN_SETTINGS_KEY = "@ramadan/settings";
export const RAMADAN_DATA_KEY_PREFIX = "@ramadan/data/";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** "none" = jour effacé (tombstone : permet de propager l'effacement à la synchro). */
export type FastStatus = "fasted" | "missed" | "exempt" | "none";

export interface FastEntry {
  status: FastStatus;
  updatedAt: number;
}

/**
 * Case cochée d'un jour/d'une nuit (tarawih, sadaqa). `done: false` est un « tombstone » :
 * il permet de propager une décoche à la synchronisation.
 */
export interface DayFlag {
  done: boolean;
  updatedAt: number;
}

export interface RamadanSettings {
  /** Décalage du début du Ramadan (-2..+2 jours). */
  startOffsetDays: number;
  suhoorEnabled: boolean;
  /** Minutes avant Fajr. */
  suhoorReminderMin: number;
  iftarEnabled: boolean;
  /** Minutes avant Maghrib. */
  iftarReminderMin: number;
  khatmReminderEnabled: boolean;
  khatmReminderHour: number;
  khatmReminderMinute: number;
  laylatEnabled: boolean;
}

export interface RamadanData {
  version: 1;
  hijriYear: number;
  fasting: Record<string, FastEntry>;
  /** Jours de jeûne déjà rattrapés (qada). */
  qadaDone: { count: number; updatedAt: number };
  khatmPlan: KhatmPlan | null;
  /** `updatedAt` de la suppression du plan (tombstone), 0 si jamais supprimé. */
  khatmPlanDeletedAt: number;
  khatmLog: KhatmLog;
  /** Prière de nuit (tarawih / qiyam), clé = date du SOIR (cf. worship.ts). */
  tarawih: Record<string, DayFlag>;
  /** Sadaqa donnée, clé = date du jour de jeûne. */
  sadaqa: Record<string, DayFlag>;
}

export const DEFAULT_RAMADAN_SETTINGS: RamadanSettings = {
  startOffsetDays: 0,
  suhoorEnabled: true,
  suhoorReminderMin: 45,
  iftarEnabled: true,
  iftarReminderMin: 10,
  khatmReminderEnabled: true,
  khatmReminderHour: 21,
  khatmReminderMinute: 0,
  laylatEnabled: true,
};

export function createEmptyRamadanData(hijriYear: number): RamadanData {
  return {
    version: 1,
    hijriYear,
    fasting: {},
    qadaDone: { count: 0, updatedAt: 0 },
    khatmPlan: null,
    khatmPlanDeletedAt: 0,
    khatmLog: {},
    tarawih: {},
    sadaqa: {},
  };
}

// ---------------------------------------------------------------------------
// Normalisation (données lues du disque ou du réseau = non fiables)
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toBoundedInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function toBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function normalizeSettings(raw: unknown): RamadanSettings {
  const d = DEFAULT_RAMADAN_SETTINGS;
  const r = isRecord(raw) ? raw : {};
  return {
    startOffsetDays: clampStartOffset(Number(r.startOffsetDays ?? d.startOffsetDays)),
    suhoorEnabled: toBool(r.suhoorEnabled, d.suhoorEnabled),
    suhoorReminderMin: toBoundedInt(r.suhoorReminderMin, 5, 120, d.suhoorReminderMin),
    iftarEnabled: toBool(r.iftarEnabled, d.iftarEnabled),
    iftarReminderMin: toBoundedInt(r.iftarReminderMin, 0, 60, d.iftarReminderMin),
    khatmReminderEnabled: toBool(r.khatmReminderEnabled, d.khatmReminderEnabled),
    khatmReminderHour: toBoundedInt(r.khatmReminderHour, 0, 23, d.khatmReminderHour),
    khatmReminderMinute: toBoundedInt(r.khatmReminderMinute, 0, 59, d.khatmReminderMinute),
    laylatEnabled: toBool(r.laylatEnabled, d.laylatEnabled),
  };
}

function normalizeDayFlags(raw: unknown): Record<string, DayFlag> {
  const result: Record<string, DayFlag> = {};
  if (!isRecord(raw)) return result;
  for (const [key, value] of Object.entries(raw)) {
    if (!parseLocalDateKey(key) || !isRecord(value) || typeof value.done !== "boolean") continue;
    result[key] = {
      done: value.done,
      updatedAt: toBoundedInt(value.updatedAt, 0, Number.MAX_SAFE_INTEGER, 0),
    };
  }
  return result;
}

const VALID_STATUS: ReadonlySet<string> = new Set(["fasted", "missed", "exempt", "none"]);

export function normalizeData(raw: unknown, hijriYear: number): RamadanData {
  const result = createEmptyRamadanData(hijriYear);
  if (!isRecord(raw)) return result;

  if (isRecord(raw.fasting)) {
    for (const [key, value] of Object.entries(raw.fasting)) {
      if (!parseLocalDateKey(key) || !isRecord(value)) continue;
      const status = String(value.status);
      if (!VALID_STATUS.has(status)) continue;
      result.fasting[key] = {
        status: status as FastStatus,
        updatedAt: toBoundedInt(value.updatedAt, 0, Number.MAX_SAFE_INTEGER, 0),
      };
    }
  }

  if (isRecord(raw.qadaDone)) {
    result.qadaDone = {
      count: toBoundedInt(raw.qadaDone.count, 0, 366, 0),
      updatedAt: toBoundedInt(raw.qadaDone.updatedAt, 0, Number.MAX_SAFE_INTEGER, 0),
    };
  }

  if (isRecord(raw.khatmPlan)) {
    const p = raw.khatmPlan;
    if (typeof p.startKey === "string" && parseLocalDateKey(p.startKey)) {
      result.khatmPlan = {
        goalKhatms: toBoundedInt(p.goalKhatms, 1, 3, 1),
        days: toBoundedInt(p.days, 5, 30, 30),
        startKey: p.startKey,
        updatedAt: toBoundedInt(p.updatedAt, 0, Number.MAX_SAFE_INTEGER, 0),
      };
    }
  }

  result.khatmPlanDeletedAt = toBoundedInt(
    raw.khatmPlanDeletedAt,
    0,
    Number.MAX_SAFE_INTEGER,
    0,
  );

  if (isRecord(raw.khatmLog)) {
    for (const [key, value] of Object.entries(raw.khatmLog)) {
      if (!parseLocalDateKey(key) || !isRecord(value)) continue;
      result.khatmLog[key] = {
        juz: toBoundedInt(value.juz, 0, 90, 0),
        updatedAt: toBoundedInt(value.updatedAt, 0, Number.MAX_SAFE_INTEGER, 0),
      };
    }
  }

  result.tarawih = normalizeDayFlags(raw.tarawih);
  result.sadaqa = normalizeDayFlags(raw.sadaqa);

  // Un plan supprimé plus récemment que sa dernière mise à jour n'existe plus.
  if (result.khatmPlan && result.khatmPlanDeletedAt >= result.khatmPlan.updatedAt && result.khatmPlanDeletedAt > 0) {
    result.khatmPlan = null;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Fusion (synchronisation multi-appareils) — fonction pure
// ---------------------------------------------------------------------------

function mergeTimestamped<T extends { updatedAt: number }>(
  a: Record<string, T>,
  b: Record<string, T>,
): Record<string, T> {
  const merged: Record<string, T> = { ...a };
  for (const [key, value] of Object.entries(b)) {
    const existing = merged[key];
    if (!existing || value.updatedAt > existing.updatedAt) {
      merged[key] = value;
    }
  }
  return merged;
}

/**
 * Fusionne les journaux de lecture ; les entrées antérieures à la création du plan
 * appartiennent à un ancien plan (supprimé/recréé) et ne doivent pas ressusciter.
 */
function mergeKhatmLog(a: KhatmLog, b: KhatmLog, plan: KhatmPlan): KhatmLog {
  const merged = mergeTimestamped(a, b);
  const result: KhatmLog = {};
  for (const [key, entry] of Object.entries(merged)) {
    if (entry.updatedAt >= plan.updatedAt) result[key] = entry;
  }
  return result;
}

/**
 * Fusionne deux jeux de données de la même année. Pour chaque clé, la version la
 * plus récente (`updatedAt`) l'emporte : deux appareils qui ont chacun coché des
 * jours différents conservent TOUS les jours (au lieu qu'un appareil écrase l'autre).
 */
export function mergeRamadanData(local: RamadanData, remote: RamadanData): RamadanData {
  const khatmPlanDeletedAt = Math.max(local.khatmPlanDeletedAt, remote.khatmPlanDeletedAt);

  let khatmPlan: KhatmPlan | null = null;
  const candidates = [local.khatmPlan, remote.khatmPlan].filter(
    (p): p is KhatmPlan => p !== null,
  );
  if (candidates.length > 0) {
    khatmPlan = candidates.reduce((best, p) => (p.updatedAt > best.updatedAt ? p : best));
    if (khatmPlanDeletedAt >= khatmPlan.updatedAt) {
      khatmPlan = null;
    }
  }

  const qadaDone =
    remote.qadaDone.updatedAt > local.qadaDone.updatedAt ? remote.qadaDone : local.qadaDone;

  return {
    version: 1,
    hijriYear: local.hijriYear || remote.hijriYear,
    fasting: mergeTimestamped(local.fasting, remote.fasting),
    qadaDone,
    khatmPlan,
    khatmPlanDeletedAt,
    khatmLog: khatmPlan ? mergeKhatmLog(local.khatmLog, remote.khatmLog, khatmPlan) : {},
    tarawih: mergeTimestamped(local.tarawih, remote.tarawih),
    sadaqa: mergeTimestamped(local.sadaqa, remote.sadaqa),
  };
}

// ---------------------------------------------------------------------------
// Statistiques dérivées — fonctions pures
// ---------------------------------------------------------------------------

export interface FastingStats {
  fasted: number;
  missed: number;
  exempt: number;
  /** Jours à rattraper = manqués + dispensés - déjà rattrapés (jamais négatif). */
  qadaOwed: number;
  /** Jours consécutifs jeûnés se terminant aujourd'hui (ou hier si aujourd'hui n'est pas encore saisi). */
  streak: number;
}

export function computeFastingStats(
  data: RamadanData,
  today: Date = new Date(),
): FastingStats {
  let fasted = 0;
  let missed = 0;
  let exempt = 0;
  for (const entry of Object.values(data.fasting)) {
    if (entry.status === "fasted") fasted += 1;
    else if (entry.status === "missed") missed += 1;
    else if (entry.status === "exempt") exempt += 1;
  }

  // Série : on remonte depuis aujourd'hui. Aujourd'hui non encore saisi n'interrompt pas la série.
  let streak = 0;
  let cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayStatus = data.fasting[toLocalDateKey(cursor)]?.status;
  if (todayStatus !== "fasted") {
    cursor = addLocalDays(cursor, -1);
  }
  while (data.fasting[toLocalDateKey(cursor)]?.status === "fasted") {
    streak += 1;
    cursor = addLocalDays(cursor, -1);
    if (streak > 400) break; // garde-fou
  }

  return {
    fasted,
    missed,
    exempt,
    qadaOwed: Math.max(0, missed + exempt - data.qadaDone.count),
    streak,
  };
}

/** Index (0-based) du jour du plan de khatm pour `today`, borné à ≥ 0. */
export function getKhatmDayIndex(plan: KhatmPlan, today: Date = new Date()): number {
  const start = parseLocalDateKey(plan.startKey);
  if (!start) return 0;
  return Math.max(0, diffLocalDays(start, today));
}

// ---------------------------------------------------------------------------
// Entrées / sorties AsyncStorage
// ---------------------------------------------------------------------------

export async function loadRamadanSettings(): Promise<RamadanSettings> {
  try {
    const raw = await AsyncStorage.getItem(RAMADAN_SETTINGS_KEY);
    return normalizeSettings(safeJsonParse<unknown>(raw, null));
  } catch {
    return { ...DEFAULT_RAMADAN_SETTINGS };
  }
}

type SettingsListener = (settings: RamadanSettings) => void;
const settingsListeners = new Set<SettingsListener>();

/** Notifie les écrans (bannière, menu) quand les réglages changent. Retourne le désabonnement. */
export function subscribeRamadanSettings(listener: SettingsListener): () => void {
  settingsListeners.add(listener);
  return () => {
    settingsListeners.delete(listener);
  };
}

/** Ne lève jamais : un échec d'écriture ne doit pas casser l'écran (les valeurs restent en mémoire). */
export async function saveRamadanSettings(settings: RamadanSettings): Promise<void> {
  const normalized = normalizeSettings(settings);
  settingsListeners.forEach((listener) => listener(normalized));
  try {
    await AsyncStorage.setItem(RAMADAN_SETTINGS_KEY, JSON.stringify(normalized));
  } catch (error) {
    console.warn("⚠️ [Ramadan] Réglages non enregistrés:", error);
  }
}

export async function loadRamadanData(hijriYear: number): Promise<RamadanData> {
  try {
    const raw = await AsyncStorage.getItem(`${RAMADAN_DATA_KEY_PREFIX}${hijriYear}`);
    return normalizeData(safeJsonParse<unknown>(raw, null), hijriYear);
  } catch {
    return createEmptyRamadanData(hijriYear);
  }
}

/** Ne lève jamais : un échec d'écriture ne doit pas casser l'écran. */
export async function saveRamadanData(data: RamadanData): Promise<void> {
  try {
    await AsyncStorage.setItem(
      `${RAMADAN_DATA_KEY_PREFIX}${data.hijriYear}`,
      JSON.stringify(data),
    );
  } catch (error) {
    console.warn("⚠️ [Ramadan] Progression non enregistrée:", error);
  }
}
