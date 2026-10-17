import {
  addLocalDays,
  getRamadanSeason,
  toLocalDateKey,
} from "../../../utils/ramadan/season";
import {
  createEmptyRamadanData,
  type DayFlag,
  type RamadanData,
} from "../../../utils/ramadan/storage";
import {
  computeBestFastingStreak,
  computeWorshipStats,
  getDayKey,
  getLastTenNights,
  getNightKey,
  getOddNights,
  getTonightNumber,
  isFlagDone,
  isOddLastNight,
} from "../../../utils/ramadan/worship";

const season = getRamadanSeason(new Date(2027, 1, 14, 12));
const start = season.startDate;

function flag(done: boolean, updatedAt = 1): DayFlag {
  return { done, updatedAt };
}

function emptyData(): RamadanData {
  return createEmptyRamadanData(season.hijriYear);
}

describe("ramadan/worship — correspondance nuits ↔ dates", () => {
  it("la nuit 1 est le soir de la veille du premier jeûne", () => {
    expect(getNightKey(season, 1)).toBe(toLocalDateKey(addLocalDays(start, -1)));
  });

  it("la nuit n est le soir du jour n-1 (nuit 27 = soir du 26e jour)", () => {
    expect(getNightKey(season, 27)).toBe(toLocalDateKey(addLocalDays(start, 25)));
    expect(getDayKey(season, 26)).toBe(getNightKey(season, 27));
  });

  it("ce soir (jour d de jeûne) est la nuit d + 1", () => {
    expect(getTonightNumber(season, addLocalDays(start, -1))).toBe(1);
    expect(getTonightNumber(season, start)).toBe(2);
    expect(getTonightNumber(season, addLocalDays(start, 25))).toBe(27);
  });

  it("pas de nuit de Ramadan trop tôt ni le soir de l'Aïd", () => {
    expect(getTonightNumber(season, addLocalDays(start, -2))).toBe(0);
    // Dernier jour de jeûne : le soir commence le mois suivant.
    expect(getTonightNumber(season, addLocalDays(start, season.lengthDays - 1))).toBe(0);
    // Veille de la fin : la dernière nuit du mois.
    expect(getTonightNumber(season, addLocalDays(start, season.lengthDays - 2))).toBe(
      season.lengthDays,
    );
  });

  it("retourne 0 si le calendrier hijri est indisponible", () => {
    expect(getTonightNumber({ ...season, hijriYear: 0 }, start)).toBe(0);
  });
});

describe("ramadan/worship — 10 dernières nuits", () => {
  it("commence à la nuit 21 et finit à la dernière nuit du mois", () => {
    const nights = getLastTenNights(season);
    expect(nights[0]).toBe(21);
    expect(nights[nights.length - 1]).toBe(season.lengthDays);
    expect(nights).toHaveLength(season.lengthDays - 20);
  });

  it("identifie les nuits impaires 21, 23, 25, 27, 29", () => {
    expect([21, 22, 23, 25, 27, 28, 29, 30].filter(isOddLastNight)).toEqual([21, 23, 25, 27, 29]);
    expect(getOddNights(season)).toEqual([21, 23, 25, 27, 29]);
  });
});

describe("ramadan/worship — statistiques", () => {
  it("compte les nuits de prière et jours de sadaqa du mois", () => {
    const data = emptyData();
    data.tarawih[getNightKey(season, 1)] = flag(true);
    data.tarawih[getNightKey(season, 2)] = flag(true);
    data.tarawih[getNightKey(season, 3)] = flag(false); // décoché
    data.sadaqa[getDayKey(season, 1)] = flag(true);

    const stats = computeWorshipStats(data, season);
    expect(stats.tarawihNights).toBe(2);
    expect(stats.sadaqaDays).toBe(1);
    expect(stats.lastTenDone).toBe(0);
  });

  it("ignore les dates qui ne font pas partie de ce mois", () => {
    const data = emptyData();
    data.tarawih["2000-01-01"] = flag(true);
    expect(computeWorshipStats(data, season).tarawihNights).toBe(0);
  });

  it("compte séparément les 10 dernières nuits et les nuits impaires", () => {
    const data = emptyData();
    for (const night of [21, 22, 23, 27]) {
      data.tarawih[getNightKey(season, night)] = flag(true);
    }
    const stats = computeWorshipStats(data, season);
    expect(stats.lastTenDone).toBe(4);
    expect(stats.lastTenTotal).toBe(season.lengthDays - 20);
    expect(stats.oddNightsDone).toBe(3);
    expect(stats.oddNightsTotal).toBe(5);
  });

  it("isFlagDone : absent ou décoché = non fait", () => {
    expect(isFlagDone({}, "2027-02-08")).toBe(false);
    expect(isFlagDone({ "2027-02-08": flag(false) }, "2027-02-08")).toBe(false);
    expect(isFlagDone({ "2027-02-08": flag(true) }, "2027-02-08")).toBe(true);
  });
});

describe("ramadan/worship — meilleure série de jeûne", () => {
  it("retient la plus longue série consécutive, pas la série en cours", () => {
    const data = emptyData();
    // Jours 1-3 jeûnés, jour 4 manqué, jours 5-9 jeûnés (série de 5), jour 10 jeûné aussi.
    const days = [1, 2, 3, 5, 6, 7, 8, 9, 10];
    for (const day of days) {
      data.fasting[getDayKey(season, day)] = { status: "fasted", updatedAt: 1 };
    }
    data.fasting[getDayKey(season, 4)] = { status: "missed", updatedAt: 1 };
    expect(computeBestFastingStreak(data, season)).toBe(6);
  });

  it("vaut 0 sans jeûne enregistré", () => {
    expect(computeBestFastingStreak(emptyData(), season)).toBe(0);
  });
});
