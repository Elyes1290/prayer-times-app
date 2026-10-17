import { renderHook } from "@testing-library/react-native";
import {
  REANCHOR_DELAYS_MS,
  useKeepVersePosition,
} from "../../hooks/useKeepVersePosition";

function setup(initialMode: string, firstVisible: number) {
  const scrollToIndex = jest.fn();
  const listRef = { current: { scrollToIndex } } as any;
  const firstVisibleIndexRef = { current: firstVisible };
  const hook = renderHook(
    ({ mode }: { mode: string }) =>
      useKeepVersePosition(listRef, firstVisibleIndexRef, mode),
    { initialProps: { mode: initialMode } },
  );
  return { scrollToIndex, firstVisibleIndexRef, ...hook };
}

describe("useKeepVersePosition", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("ne fait rien au premier rendu", () => {
    const { scrollToIndex } = setup("full", 155);
    jest.advanceTimersByTime(1000);
    expect(scrollToIndex).not.toHaveBeenCalled();
  });

  it("se replace sur le verset lu après un changement d'affichage", () => {
    const { scrollToIndex, rerender, firstVisibleIndexRef } = setup("arabic", 155);
    rerender({ mode: "full" });
    // Pendant la re-mesure, le verset « visible » dérive : on doit garder celui du changement.
    firstVisibleIndexRef.current = 40;
    jest.advanceTimersByTime(REANCHOR_DELAYS_MS[REANCHOR_DELAYS_MS.length - 1] + 10);
    expect(scrollToIndex).toHaveBeenCalledTimes(REANCHOR_DELAYS_MS.length);
    for (const call of scrollToIndex.mock.calls) {
      expect(call[0]).toEqual({ index: 155, animated: false });
    }
  });

  it("ne défile pas si on est tout en haut", () => {
    const { scrollToIndex, rerender } = setup("full", 0);
    rerender({ mode: "arabic" });
    jest.advanceTimersByTime(1000);
    expect(scrollToIndex).not.toHaveBeenCalled();
  });

  it("annule les re-calages en attente au démontage", () => {
    const { scrollToIndex, rerender, unmount } = setup("full", 12);
    rerender({ mode: "arabic" });
    unmount();
    jest.advanceTimersByTime(1000);
    expect(scrollToIndex).not.toHaveBeenCalled();
  });

  it("ne plante pas si scrollToIndex lève une erreur", () => {
    const { scrollToIndex, rerender } = setup("full", 12);
    scrollToIndex.mockImplementation(() => {
      throw new Error("not measured");
    });
    rerender({ mode: "arabic" });
    expect(() => jest.advanceTimersByTime(1000)).not.toThrow();
  });
});
