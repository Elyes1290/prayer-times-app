// utils/quranListScroll.ts
// Défilement fiable vers un verset d'une FlatList à hauteurs variables (sans getItemLayout).

import type { FlatList } from "react-native";
import type { RefObject } from "react";

// Une longue sourate (ex. verset 60 de la sourate 9) demande plusieurs étapes : la liste ne
// connaît pas la hauteur des versets non affichés et se rapproche par paliers.
const MAX_RETRIES = 12;
const RETRY_DELAY_MS = 150;
/** Au-delà de ce délai sans échec, une nouvelle demande repart avec un compteur neuf. */
const RESET_AFTER_MS = 3000;
/** Dernier re-calage une fois les hauteurs mesurées (les versets du dessus ont changé la position). */
const SETTLE_DELAY_MS = 350;

/**
 * Garde le premier élément visible à la même place quand la hauteur des éléments situés au-dessus
 * change (ex. les versets se re-mesurent en remontant) : évite que la liste « saute ».
 */
export const MAINTAIN_VISIBLE_POSITION = { minIndexForVisible: 0 } as const;

type ScrollFailedInfo = {
  index: number;
  averageItemLength: number;
  highestMeasuredFrameIndex: number;
};

/**
 * Gestionnaire `onScrollToIndexFailed` : se rapproche de la position par une estimation
 * (index × hauteur moyenne) puis réessaie, au plus MAX_RETRIES fois (pas de boucle infinie).
 * Le compteur repart à zéro pour une nouvelle demande (autre verset ou après RESET_AFTER_MS),
 * et une fois le verset atteint on se re-cale une dernière fois quand les hauteurs ont été mesurées.
 */
export function createScrollToIndexFailedHandler(
  listRef: RefObject<FlatList | null>,
): (info: ScrollFailedInfo) => void {
  let retries = 0;
  let lastIndex = -1;
  let lastFailureAt = 0;
  let failedDuringRetry = false;
  let settled = false;

  return (info) => {
    const now = Date.now();
    if (info.index !== lastIndex || now - lastFailureAt > RESET_AFTER_MS) {
      lastIndex = info.index;
      retries = 0;
      settled = false;
    }
    lastFailureAt = now;
    failedDuringRetry = true;

    if (retries >= MAX_RETRIES) return;
    retries += 1;

    listRef.current?.scrollToOffset({
      offset: Math.max(0, info.averageItemLength * info.index),
      animated: false,
    });
    setTimeout(() => {
      // `onScrollToIndexFailed` est rappelé de façon synchrone si le verset n'est pas encore mesuré.
      failedDuringRetry = false;
      listRef.current?.scrollToIndex({ index: info.index, animated: false });
      if (failedDuringRetry || settled) return;
      settled = true;
      setTimeout(() => {
        listRef.current?.scrollToIndex({ index: info.index, animated: false });
      }, SETTLE_DELAY_MS);
    }, RETRY_DELAY_MS);
  };
}

/** Index du verset `verseKey` dans la liste (-1 si absent). */
export function findVerseIndex(
  verses: ReadonlyArray<{ verse_key?: string }>,
  verseKey: string,
): number {
  return verses.findIndex((verse) => verse.verse_key === verseKey);
}
