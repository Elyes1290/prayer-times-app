import {
  createEmptyRamadanData,
  mergeRamadanData,
  normalizeData,
  type RamadanData,
} from "../../../utils/ramadan/storage";

const YEAR = 1448;

function data(overrides: Partial<RamadanData> = {}): RamadanData {
  return { ...createEmptyRamadanData(YEAR), ...overrides };
}

describe("ramadan/storage — tarawih et sadaqa", () => {
  it("les données vides contiennent les deux dictionnaires", () => {
    const empty = createEmptyRamadanData(YEAR);
    expect(empty.tarawih).toEqual({});
    expect(empty.sadaqa).toEqual({});
  });

  it("anciennes données (sans tarawih/sadaqa) : normalisées en dictionnaires vides", () => {
    const normalized = normalizeData({ version: 1, hijriYear: YEAR, fasting: {} }, YEAR);
    expect(normalized.tarawih).toEqual({});
    expect(normalized.sadaqa).toEqual({});
  });

  it("ignore les entrées invalides (clé, type de `done`)", () => {
    const normalized = normalizeData(
      {
        tarawih: {
          "2027-02-08": { done: true, updatedAt: 5 },
          "2027-02-09": { done: "oui", updatedAt: 5 },
          "pas-une-date": { done: true, updatedAt: 5 },
          "2027-13-40": { done: true, updatedAt: 5 },
        },
        sadaqa: "n'importe quoi",
      },
      YEAR,
    );
    expect(Object.keys(normalized.tarawih)).toEqual(["2027-02-08"]);
    expect(normalized.sadaqa).toEqual({});
  });

  it("conserve une décoche (tombstone) pour la propager à la synchro", () => {
    const normalized = normalizeData(
      { tarawih: { "2027-02-08": { done: false, updatedAt: 9 } } },
      YEAR,
    );
    expect(normalized.tarawih["2027-02-08"]).toEqual({ done: false, updatedAt: 9 });
  });

  it("fusion : deux appareils qui cochent des jours différents gardent tout", () => {
    const merged = mergeRamadanData(
      data({ tarawih: { "2027-02-08": { done: true, updatedAt: 1 } } }),
      data({ tarawih: { "2027-02-09": { done: true, updatedAt: 2 } } }),
    );
    expect(Object.keys(merged.tarawih).sort()).toEqual(["2027-02-08", "2027-02-09"]);
  });

  it("fusion : la modification la plus récente gagne, y compris une décoche", () => {
    const merged = mergeRamadanData(
      data({ sadaqa: { "2027-02-08": { done: true, updatedAt: 1 } } }),
      data({ sadaqa: { "2027-02-08": { done: false, updatedAt: 2 } } }),
    );
    expect(merged.sadaqa["2027-02-08"]).toEqual({ done: false, updatedAt: 2 });

    const reverse = mergeRamadanData(
      data({ sadaqa: { "2027-02-08": { done: false, updatedAt: 2 } } }),
      data({ sadaqa: { "2027-02-08": { done: true, updatedAt: 1 } } }),
    );
    expect(reverse.sadaqa["2027-02-08"].done).toBe(false);
  });

  it("fusion : idempotente", () => {
    const a = data({ tarawih: { "2027-02-08": { done: true, updatedAt: 1 } } });
    const once = mergeRamadanData(a, a);
    expect(mergeRamadanData(once, a)).toEqual(once);
  });
});
