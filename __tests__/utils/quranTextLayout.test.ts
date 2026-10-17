import {
  computeRequiredTextHeight,
  NEARLY_FULL_LINE_MARGIN,
} from "../../utils/quranTextLayout";

const WIDTH = 300;
const LINE_HEIGHT = 60;
const line = (width: number, height = LINE_HEIGHT) => ({ width, height });

describe("computeRequiredTextHeight", () => {
  it("retourne 0 sans ligne", () => {
    expect(computeRequiredTextHeight([], WIDTH, LINE_HEIGHT)).toBe(0);
  });

  it("additionne les lignes quand la dernière est courte", () => {
    expect(
      computeRequiredTextHeight([line(300), line(290), line(80)], WIDTH, LINE_HEIGHT),
    ).toBe(180);
  });

  it("utilise nombre de lignes × interligne si la hauteur rapportée est trop faible", () => {
    expect(
      computeRequiredTextHeight([line(300, 40), line(100, 40)], WIDTH, LINE_HEIGHT),
    ).toBe(120);
  });

  it("réserve une ligne de plus quand la dernière ligne est presque pleine", () => {
    expect(
      computeRequiredTextHeight(
        [line(300), line(WIDTH - NEARLY_FULL_LINE_MARGIN)],
        WIDTH,
        LINE_HEIGHT,
      ),
    ).toBe(180);
  });

  it("ne réserve rien de plus juste en dessous de la marge", () => {
    expect(
      computeRequiredTextHeight(
        [line(300), line(WIDTH - NEARLY_FULL_LINE_MARGIN - 1)],
        WIDTH,
        LINE_HEIGHT,
      ),
    ).toBe(120);
  });

  it("réserve une ligne de plus si une ligne dépasse la largeur affichée (cas réel 67:28)", () => {
    expect(
      computeRequiredTextHeight(
        [line(265), line(313), line(254)],
        306,
        LINE_HEIGHT,
      ),
    ).toBe(240);
  });

  it("ignore le risque si la largeur du conteneur est inconnue", () => {
    expect(computeRequiredTextHeight([line(300)], 0, LINE_HEIGHT)).toBe(60);
  });
});
