import {
  addLocalDays,
  clampStartOffset,
  diffLocalDays,
  EID_GRACE_DAYS,
  getHijriParts,
  getNightEveDate,
  getRamadanDate,
  getRamadanDayNumber,
  getRamadanSeason,
  parseLocalDateKey,
  toLocalDateKey,
} from "../../../utils/ramadan/season";

// Midi local : évite toute ambiguïté liée aux changements d'heure.
const noon = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12, 0, 0);

describe("ramadan/season — dates locales", () => {
  it("toLocalDateKey utilise la date LOCALE (pas UTC)", () => {
    expect(toLocalDateKey(new Date(2027, 1, 8, 0, 30))).toBe("2027-02-08");
    expect(toLocalDateKey(new Date(2027, 1, 8, 23, 59))).toBe("2027-02-08");
  });

  it("parseLocalDateKey est l'inverse de toLocalDateKey et refuse les clés invalides", () => {
    const parsed = parseLocalDateKey("2027-02-08");
    expect(parsed).not.toBeNull();
    expect(toLocalDateKey(parsed as Date)).toBe("2027-02-08");
    expect(parseLocalDateKey("2027-13-40")).toBeNull();
    expect(parseLocalDateKey("n'importe quoi")).toBeNull();
  });

  it("addLocalDays traverse un changement d'heure sans décaler la date", () => {
    // Passage à l'heure d'été européen : 28 mars 2027
    const start = new Date(2027, 2, 27);
    expect(toLocalDateKey(addLocalDays(start, 1))).toBe("2027-03-28");
    expect(toLocalDateKey(addLocalDays(start, 2))).toBe("2027-03-29");
    expect(diffLocalDays(start, addLocalDays(start, 2))).toBe(2);
  });

  it("clampStartOffset borne le décalage à -2..+2", () => {
    expect(clampStartOffset(5)).toBe(2);
    expect(clampStartOffset(-9)).toBe(-2);
    expect(clampStartOffset(1)).toBe(1);
  });
});

describe("ramadan/season — saison", () => {
  const reference = getRamadanSeason(noon(2027, 2, 20));

  it("calendrier hijri disponible : le 20 février 2027 est en Ramadan 1448", () => {
    const parts = getHijriParts(noon(2027, 2, 20));
    expect(parts?.month).toBe(9);
    expect(reference.phase).toBe("ramadan");
    expect(reference.hijriYear).toBe(1448);
  });

  it("le Ramadan 2027 commence autour du 8 février, sur 29 ou 30 jours", () => {
    const key = toLocalDateKey(reference.startDate);
    expect(["2027-02-07", "2027-02-08", "2027-02-09"]).toContain(key);
    expect([29, 30]).toContain(reference.lengthDays);
    expect(diffLocalDays(reference.startDate, reference.endDate)).toBe(
      reference.lengthDays - 1,
    );
  });

  it("phase off bien avant le Ramadan (octobre 2026)", () => {
    const season = getRamadanSeason(noon(2026, 10, 16));
    expect(season.phase).toBe("off");
    expect(season.hijriYear).toBe(1448);
    expect(season.daysUntilStart).toBeGreaterThan(30);
  });

  it("phase countdown à J-30 puis J-1", () => {
    const start = reference.startDate;
    const j30 = getRamadanSeason(addLocalDays(start, -30));
    expect(j30.phase).toBe("countdown");
    expect(j30.daysUntilStart).toBe(30);

    const j31 = getRamadanSeason(addLocalDays(start, -31));
    expect(j31.phase).toBe("off");

    const j1 = getRamadanSeason(addLocalDays(start, -1));
    expect(j1.phase).toBe("countdown");
    expect(j1.daysUntilStart).toBe(1);
  });

  it("phase ramadan : numéro du jour et jours restants", () => {
    const first = getRamadanSeason(addLocalDays(reference.startDate, 0));
    expect(first.phase).toBe("ramadan");
    expect(first.dayNumber).toBe(1);
    expect(first.daysRemaining).toBe(reference.lengthDays);

    const last = getRamadanSeason(reference.endDate);
    expect(last.phase).toBe("ramadan");
    expect(last.dayNumber).toBe(reference.lengthDays);
    expect(last.daysRemaining).toBe(1);
  });

  it("phase eid pendant EID_GRACE_DAYS puis saison suivante", () => {
    const afterEnd = (n: number) => getRamadanSeason(addLocalDays(reference.endDate, n));
    expect(afterEnd(1).phase).toBe("eid");
    expect(afterEnd(EID_GRACE_DAYS).phase).toBe("eid");
    const next = afterEnd(EID_GRACE_DAYS + 1);
    expect(next.phase).toBe("off");
    expect(next.hijriYear).toBe(1449);
  });

  it("le décalage utilisateur déplace le début (et borne à ±2)", () => {
    const base = getRamadanSeason(noon(2027, 2, 20), 0);
    const later = getRamadanSeason(noon(2027, 2, 20), 1);
    const tooMuch = getRamadanSeason(noon(2027, 2, 20), 10);
    expect(diffLocalDays(base.startDate, later.startDate)).toBe(1);
    expect(diffLocalDays(base.startDate, tooMuch.startDate)).toBe(2);
    expect(later.dayNumber).toBe(base.dayNumber - 1);
  });

  it("getRamadanDayNumber / getRamadanDate sont cohérents", () => {
    const day10 = getRamadanDate(reference, 10);
    expect(getRamadanDayNumber(reference, day10)).toBe(10);
    expect(getRamadanDayNumber(reference, addLocalDays(reference.startDate, -1))).toBe(0);
    expect(getRamadanDayNumber(reference, addLocalDays(reference.endDate, 1))).toBe(0);
  });

  it("la nuit 27 commence le soir du 26e jour (veille calendaire)", () => {
    const eve = getNightEveDate(reference, 27);
    expect(diffLocalDays(reference.startDate, eve)).toBe(25);
    expect(getRamadanDayNumber(reference, eve)).toBe(26);
  });
});
