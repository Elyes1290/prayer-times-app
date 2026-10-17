// utils/quranReaderPrefs.ts
//
// Préférences de lecture du Coran, enregistrées sur le téléphone :
//  - mode d'affichage : arabe + phonétique + traduction ("full") ou arabe seul ("arabic") ;
//  - marque-page unique « reprendre ma lecture ».

import AsyncStorage from "@react-native-async-storage/async-storage";
import { safeJsonParse } from "./safeJson";

export type QuranDisplayMode = "full" | "arabic";

export const QURAN_DISPLAY_MODE_KEY = "@quran/display_mode";
export const QURAN_BOOKMARK_KEY = "@quran/bookmark";

export const DEFAULT_QURAN_DISPLAY_MODE: QuranDisplayMode = "full";

export interface QuranBookmark {
  /** Numéro de sourate (1..114). */
  surah: number;
  /** Numéro du verset dans la sourate (>= 1). */
  ayah: number;
  /** Clé "sourate:verset", ex. "67:28". */
  verseKey: string;
  /** Nom de la sourate tel qu'affiché à l'enregistrement. */
  surahLabel: string;
  savedAt: number;
}

export function normalizeDisplayMode(raw: unknown): QuranDisplayMode {
  return raw === "arabic" || raw === "full" ? raw : DEFAULT_QURAN_DISPLAY_MODE;
}

/** Construit un marque-page à partir d'une clé "sourate:verset" ; null si invalide. */
export function createBookmark(
  verseKey: string | undefined,
  surahLabel: string,
  now: number = Date.now(),
): QuranBookmark | null {
  const match = /^(\d{1,3}):(\d{1,3})$/.exec(verseKey ?? "");
  if (!match) return null;
  const surah = Number(match[1]);
  const ayah = Number(match[2]);
  if (surah < 1 || surah > 114 || ayah < 1) return null;
  return { surah, ayah, verseKey: `${surah}:${ayah}`, surahLabel, savedAt: now };
}

/** Les données lues du disque ne sont jamais fiables : on revalide tout. */
export function normalizeBookmark(raw: unknown): QuranBookmark | null {
  if (typeof raw !== "object" || raw === null) return null;
  const record = raw as Record<string, unknown>;
  const label = typeof record.surahLabel === "string" ? record.surahLabel : "";
  const savedAt =
    typeof record.savedAt === "number" && Number.isFinite(record.savedAt)
      ? record.savedAt
      : 0;
  const bookmark = createBookmark(
    typeof record.verseKey === "string" ? record.verseKey : undefined,
    label,
    savedAt,
  );
  return bookmark;
}

export async function loadQuranDisplayMode(): Promise<QuranDisplayMode> {
  try {
    return normalizeDisplayMode(await AsyncStorage.getItem(QURAN_DISPLAY_MODE_KEY));
  } catch {
    return DEFAULT_QURAN_DISPLAY_MODE;
  }
}

export async function saveQuranDisplayMode(mode: QuranDisplayMode): Promise<void> {
  try {
    await AsyncStorage.setItem(QURAN_DISPLAY_MODE_KEY, mode);
  } catch (error) {
    console.warn("⚠️ [Quran] Mode d'affichage non enregistré:", error);
  }
}

export async function loadQuranBookmark(): Promise<QuranBookmark | null> {
  try {
    const raw = await AsyncStorage.getItem(QURAN_BOOKMARK_KEY);
    return normalizeBookmark(safeJsonParse<unknown>(raw, null));
  } catch {
    return null;
  }
}

/** `null` supprime le marque-page. */
export async function saveQuranBookmark(bookmark: QuranBookmark | null): Promise<void> {
  try {
    if (bookmark) {
      await AsyncStorage.setItem(QURAN_BOOKMARK_KEY, JSON.stringify(bookmark));
    } else {
      await AsyncStorage.removeItem(QURAN_BOOKMARK_KEY);
    }
  } catch (error) {
    console.warn("⚠️ [Quran] Marque-page non enregistré:", error);
  }
}
