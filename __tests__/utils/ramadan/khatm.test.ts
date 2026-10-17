import {
  clampKhatmDays,
  clampKhatmGoal,
  computeKhatmDay,
  createKhatmPlan,
  getCompletedJuz,
  getJuzEnd,
  getJuzStart,
  getTotalJuz,
  JUZ_STARTS,
  setKhatmDayProgress,
  SURAH_VERSE_COUNTS,
  type KhatmLog,
} from "../../../utils/ramadan/khatm";

describe("ramadan/khatm — données du Coran", () => {
  it("114 sourates et 6236 versets au total", () => {
    expect(SURAH_VERSE_COUNTS).toHaveLength(114);
    expect(SURAH_VERSE_COUNTS.reduce((a, b) => a + b, 0)).toBe(6236);
  });

  it("30 juz, chacun commençant à un verset valide et dans l'ordre", () => {
    expect(JUZ_STARTS).toHaveLength(30);
    let previous = 0;
    for (const start of JUZ_STARTS) {
      expect(start.surah).toBeGreaterThanOrEqual(1);
      expect(start.surah).toBeLessThanOrEqual(114);
      expect(start.ayah).toBeGreaterThanOrEqual(1);
      expect(start.ayah).toBeLessThanOrEqual(SURAH_VERSE_COUNTS[start.surah - 1]);
      const absolute = start.surah * 1000 + start.ayah;
      expect(absolute).toBeGreaterThan(previous);
      previous = absolute;
    }
  });

  it("bornes connues des juz", () => {
    expect(getJuzStart(1)).toEqual({ surah: 1, ayah: 1 });
    expect(getJuzEnd(1)).toEqual({ surah: 2, ayah: 141 });
    expect(getJuzStart(2)).toEqual({ surah: 2, ayah: 142 });
    expect(getJuzStart(30)).toEqual({ surah: 78, ayah: 1 });
    expect(getJuzEnd(30)).toEqual({ surah: 114, ayah: 6 });
  });
});

describe("ramadan/khatm — plan", () => {
  it("borne l'objectif (1-3) et la durée (5-30)", () => {
    expect(clampKhatmGoal(0)).toBe(1);
    expect(clampKhatmGoal(9)).toBe(3);
    expect(clampKhatmGoal(Number.NaN)).toBe(1);
    expect(clampKhatmDays(1)).toBe(5);
    expect(clampKhatmDays(99)).toBe(30);
    expect(clampKhatmDays(Number.NaN)).toBe(30);
  });

  it("calcule le total de juz", () => {
    expect(getTotalJuz(createKhatmPlan(1, 30, "2027-02-08"))).toBe(30);
    expect(getTotalJuz(createKhatmPlan(3, 30, "2027-02-08"))).toBe(90);
  });
});

describe("ramadan/khatm — portion du jour", () => {
  const plan = createKhatmPlan(1, 30, "2027-02-08");

  it("1 juz par jour pour 1 khatm en 30 jours", () => {
    const info = computeKhatmDay(plan, {}, "2027-02-08", 0);
    expect(info.target).toBe(1);
    expect(info.juzList).toEqual([1]);
    expect(info.from).toEqual({ surah: 1, ayah: 1 });
    expect(info.to).toEqual({ surah: 2, ayah: 141 });
    expect(info.behindBy).toBe(0);
    expect(info.isDoneToday).toBe(false);
  });

  it("2 khatms en 30 jours : 2 juz par jour, qui reboucle après le juz 30", () => {
    const double = createKhatmPlan(2, 30, "2027-02-08");
    expect(computeKhatmDay(double, {}, "2027-02-08", 0).juzList).toEqual([1, 2]);

    const log: KhatmLog = { "2027-02-08": { juz: 30, updatedAt: 1 } };
    // 30 juz lus avant aujourd'hui → on repart du juz 1 pour le 2e khatm
    const info = computeKhatmDay(double, log, "2027-02-23", 15);
    expect(info.juzList[0]).toBe(1);
    expect(info.currentKhatm).toBe(2);
  });

  it("s'adapte au retard : la portion augmente, jamais d'échec", () => {
    const info = computeKhatmDay(plan, {}, "2027-02-13", 5); // 6e jour, rien lu
    expect(info.target).toBe(2); // ceil(30 / 25)
    expect(info.behindBy).toBe(5);
    expect(info.daysLeft).toBe(25);
  });

  it("s'adapte à l'avance : la portion diminue puis le plan se termine", () => {
    const ahead: KhatmLog = { "2027-02-08": { juz: 10, updatedAt: 1 } };
    const info = computeKhatmDay(plan, ahead, "2027-02-09", 1);
    expect(info.target).toBe(1); // ceil(20 / 29)
    expect(info.behindBy).toBe(0);

    const done: KhatmLog = { "2027-02-08": { juz: 30, updatedAt: 1 } };
    const finished = computeKhatmDay(plan, done, "2027-02-09", 1);
    expect(finished.planDone).toBe(true);
    expect(finished.target).toBe(0);
    expect(finished.juzList).toEqual([]);
    expect(finished.from).toBeNull();
  });

  it("la portion du jour reste stable une fois validée", () => {
    const before = computeKhatmDay(plan, {}, "2027-02-10", 2);
    const log = setKhatmDayProgress(plan, {}, "2027-02-10", before.target);
    const after = computeKhatmDay(plan, log, "2027-02-10", 2);
    expect(after.target).toBe(before.target);
    expect(after.isDoneToday).toBe(true);
    expect(after.doneToday).toBe(before.target);
  });

  it("après la fin du plan, tout le reste est à rattraper aujourd'hui", () => {
    const info = computeKhatmDay(plan, {}, "2027-03-20", 41);
    expect(info.daysLeft).toBe(1);
    expect(info.target).toBe(30);
  });
});

describe("ramadan/khatm — setKhatmDayProgress", () => {
  const plan = createKhatmPlan(1, 30, "2027-02-08");

  it("est immuable et remplace la valeur du jour", () => {
    const log: KhatmLog = {};
    const next = setKhatmDayProgress(plan, log, "2027-02-08", 2, 100);
    expect(log).toEqual({});
    expect(next["2027-02-08"]).toEqual({ juz: 2, updatedAt: 100 });
    const again = setKhatmDayProgress(plan, next, "2027-02-08", 1, 200);
    expect(again["2027-02-08"]).toEqual({ juz: 1, updatedAt: 200 });
  });

  it("ne dépasse jamais le total du plan et ignore les valeurs négatives", () => {
    const base: KhatmLog = { "2027-02-08": { juz: 29, updatedAt: 1 } };
    const capped = setKhatmDayProgress(plan, base, "2027-02-09", 10);
    expect(getCompletedJuz(capped)).toBe(30);
    const negative = setKhatmDayProgress(plan, base, "2027-02-09", -5);
    expect(negative["2027-02-09"].juz).toBe(0);
  });
});
