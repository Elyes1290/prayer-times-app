// hooks/useKeepVersePosition.ts
//
// Quand on affiche / masque la traduction et la phonétique, la hauteur de chaque verset change
// beaucoup. Sans correction, la liste garde le même décalage en pixels et « saute » vers un
// autre verset (puis continue de bouger quand on remonte, car les hauteurs sont recalculées
// au fur et à mesure). On mémorise donc le premier verset visible et on s'y replace une fois
// la liste re-mesurée.

import { useEffect, useRef, type RefObject } from "react";
import type { FlatList } from "react-native";

/** Le re-calage est fait deux fois : juste après la mise en page, puis une fois les hauteurs stabilisées. */
export const REANCHOR_DELAYS_MS = [80, 350] as const;

export function useKeepVersePosition(
  listRef: RefObject<FlatList | null>,
  firstVisibleIndexRef: RefObject<number>,
  displayMode: string,
): void {
  const previousModeRef = useRef(displayMode);

  useEffect(() => {
    if (previousModeRef.current === displayMode) return;
    previousModeRef.current = displayMode;

    // Lu ici (juste après le rendu, avant la nouvelle mise en page) : c'est encore le verset
    // que l'utilisateur lisait au moment du changement.
    const anchorIndex = firstVisibleIndexRef.current;
    if (typeof anchorIndex !== "number" || anchorIndex <= 0) return;

    const timers = REANCHOR_DELAYS_MS.map((delay) =>
      setTimeout(() => {
        try {
          listRef.current?.scrollToIndex({ index: anchorIndex, animated: false });
        } catch {
          // Index pas encore mesuré : `onScrollToIndexFailed` prend le relais.
        }
      }, delay),
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [displayMode, listRef, firstVisibleIndexRef]);
}
