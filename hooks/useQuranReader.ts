// hooks/useQuranReader.ts
//
// État de lecture du Coran : mode d'affichage, marque-page, plein écran.
// Tout est enregistré immédiatement sur le téléphone (voir utils/quranReaderPrefs.ts).

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createBookmark,
  DEFAULT_QURAN_DISPLAY_MODE,
  loadQuranBookmark,
  loadQuranDisplayMode,
  saveQuranBookmark,
  saveQuranDisplayMode,
  type QuranBookmark,
  type QuranDisplayMode,
} from "../utils/quranReaderPrefs";

export interface UseQuranReaderResult {
  displayMode: QuranDisplayMode;
  toggleDisplayMode: () => QuranDisplayMode;
  bookmark: QuranBookmark | null;
  /** Pose le marque-page sur ce verset, ou le retire s'il y est déjà. Retourne le nouvel état. */
  toggleBookmark: (verseKey: string | undefined, surahLabel: string) => QuranBookmark | null;
  clearBookmark: () => void;
  fullscreen: boolean;
  openFullscreen: () => void;
  closeFullscreen: () => void;
}

export function useQuranReader(): UseQuranReaderResult {
  const [displayMode, setDisplayMode] = useState<QuranDisplayMode>(
    DEFAULT_QURAN_DISPLAY_MODE,
  );
  const [bookmark, setBookmark] = useState<QuranBookmark | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const displayModeRef = useRef(displayMode);
  const bookmarkRef = useRef<QuranBookmark | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([loadQuranDisplayMode(), loadQuranBookmark()]).then(
      ([mode, saved]) => {
        if (cancelled) return;
        displayModeRef.current = mode;
        bookmarkRef.current = saved;
        setDisplayMode(mode);
        setBookmark(saved);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleDisplayMode = useCallback((): QuranDisplayMode => {
    const next: QuranDisplayMode = displayModeRef.current === "full" ? "arabic" : "full";
    displayModeRef.current = next;
    setDisplayMode(next);
    void saveQuranDisplayMode(next);
    return next;
  }, []);

  const toggleBookmark = useCallback(
    (verseKey: string | undefined, surahLabel: string): QuranBookmark | null => {
      const candidate = createBookmark(verseKey, surahLabel);
      if (!candidate) return bookmarkRef.current;
      const current = bookmarkRef.current;
      const next = current?.verseKey === candidate.verseKey ? null : candidate;
      bookmarkRef.current = next;
      setBookmark(next);
      void saveQuranBookmark(next);
      return next;
    },
    [],
  );

  const clearBookmark = useCallback(() => {
    bookmarkRef.current = null;
    setBookmark(null);
    void saveQuranBookmark(null);
  }, []);

  const openFullscreen = useCallback(() => setFullscreen(true), []);
  const closeFullscreen = useCallback(() => setFullscreen(false), []);

  return {
    displayMode,
    toggleDisplayMode,
    bookmark,
    toggleBookmark,
    clearBookmark,
    fullscreen,
    openFullscreen,
    closeFullscreen,
  };
}
