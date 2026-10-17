import {
  createScrollToIndexFailedHandler,
  findVerseIndex,
} from "../../utils/quranListScroll";

function makeList() {
  const scrollToOffset = jest.fn();
  const scrollToIndex = jest.fn();
  const listRef = { current: { scrollToOffset, scrollToIndex } } as any;
  return { listRef, scrollToOffset, scrollToIndex };
}

const info = (index: number) => ({
  index,
  averageItemLength: 100,
  highestMeasuredFrameIndex: 5,
});

describe("createScrollToIndexFailedHandler", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("se rapproche par estimation puis réessaie", () => {
    const { listRef, scrollToOffset, scrollToIndex } = makeList();
    const handler = createScrollToIndexFailedHandler(listRef);
    handler(info(59));
    expect(scrollToOffset).toHaveBeenCalledWith({ offset: 5900, animated: false });
    jest.advanceTimersByTime(200);
    expect(scrollToIndex).toHaveBeenCalledWith({ index: 59, animated: false });
  });

  it("s'arrête après un nombre borné d'échecs consécutifs", () => {
    const { listRef, scrollToOffset, scrollToIndex } = makeList();
    const handler = createScrollToIndexFailedHandler(listRef);
    // Chaque nouvel essai échoue de nouveau (verset jamais mesuré).
    scrollToIndex.mockImplementation(() => handler(info(59)));
    handler(info(59));
    jest.advanceTimersByTime(60_000);
    expect(scrollToOffset.mock.calls.length).toBeGreaterThan(4);
    expect(scrollToOffset.mock.calls.length).toBeLessThanOrEqual(12);
  });

  it("se re-cale une dernière fois quand le verset est atteint", () => {
    const { listRef, scrollToIndex } = makeList();
    const handler = createScrollToIndexFailedHandler(listRef);
    handler(info(59));
    jest.advanceTimersByTime(150); // essai réussi (aucun nouvel échec)
    expect(scrollToIndex).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(400);
    expect(scrollToIndex).toHaveBeenCalledTimes(2);
  });

  it("repart avec un compteur neuf pour une demande ultérieure du même verset", () => {
    const { listRef, scrollToOffset, scrollToIndex } = makeList();
    const handler = createScrollToIndexFailedHandler(listRef);
    scrollToIndex.mockImplementation(() => handler(info(59)));
    handler(info(59));
    jest.advanceTimersByTime(60_000);
    const first = scrollToOffset.mock.calls.length;

    scrollToOffset.mockClear();
    scrollToIndex.mockReset();
    handler(info(59));
    expect(scrollToOffset).toHaveBeenCalledTimes(1);
    expect(first).toBeGreaterThan(0);
  });
});

describe("findVerseIndex", () => {
  it("retrouve un verset et renvoie -1 sinon", () => {
    const verses = [{ verse_key: "9:1" }, { verse_key: "9:2" }];
    expect(findVerseIndex(verses, "9:2")).toBe(1);
    expect(findVerseIndex(verses, "9:9")).toBe(-1);
  });
});
