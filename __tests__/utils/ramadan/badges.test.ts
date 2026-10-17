import { computeRamadanBadges, type RamadanBadgeCode } from "../../../utils/ramadan/badges";
import { createKhatmPlan } from "../../../utils/ramadan/khatm";
import { getRamadanSeason } from "../../../utils/ramadan/season";
import {
  computeFastingStats,
  createEmptyRamadanData,
  type RamadanData,
} from "../../../utils/ramadan/storage";
import { getDayKey, getNightKey } from "../../../utils/ramadan/worship";

const season = getRamadanSeason(new Date(2027, 1, 14, 12));

function emptyData(): RamadanData {
  return createEmptyRamadanData(season.hijriYear);
}

function badgesFor(data: RamadanData) {
  const stats = computeFastingStats(data, new Date(2027, 1, 14, 12));
  const byCode = new Map(computeRamadanBadges(data, season, stats).map((b) => [b.code, b]));
  return (code: RamadanBadgeCode) => byCode.get(code)!;
}

describe("ramadan/badges", () => {
  it("expose les 10 badges, tous verrouillés sans donnée", () => {
    const badges = computeRamadanBadges(emptyData(), season, computeFastingStats(emptyData()));
    expect(badges).toHaveLength(10);
    expect(new Set(badges.map((b) => b.code)).size).toBe(10);
    expect(badges.every((b) => !b.unlocked)).toBe(true);
    expect(badges.every((b) => b.current === 0 && b.target >= 1)).toBe(true);
  });

  it("jeûne : premier jeûne, semaine d'affilée et mois complet", () => {
    const data = emptyData();
    for (let day = 1; day <= 7; day += 1) {
      data.fasting[getDayKey(season, day)] = { status: "fasted", updatedAt: 1 };
    }
    let get = badgesFor(data);
    expect(get("firstFast").unlocked).toBe(true);
    expect(get("weekStreak").unlocked).toBe(true);
    expect(get("fullMonth").unlocked).toBe(false);
    expect(get("fullMonth").current).toBe(7);
    expect(get("fullMonth").target).toBe(season.lengthDays);

    for (let day = 8; day <= season.lengthDays; day += 1) {
      data.fasting[getDayKey(season, day)] = { status: "fasted", updatedAt: 1 };
    }
    get = badgesFor(data);
    expect(get("fullMonth").unlocked).toBe(true);
  });

  it("une série interrompue ne débloque pas « une semaine »", () => {
    const data = emptyData();
    for (const day of [1, 2, 3, 5, 6, 7, 8]) {
      data.fasting[getDayKey(season, day)] = { status: "fasted", updatedAt: 1 };
    }
    expect(badgesFor(data)("weekStreak").unlocked).toBe(false);
    expect(badgesFor(data)("weekStreak").current).toBe(4);
  });

  it("tarawih : 10 nuits, puis toutes les nuits", () => {
    const data = emptyData();
    for (let night = 1; night <= 10; night += 1) {
      data.tarawih[getNightKey(season, night)] = { done: true, updatedAt: 1 };
    }
    expect(badgesFor(data)("tarawih10").unlocked).toBe(true);
    expect(badgesFor(data)("tarawihAll").unlocked).toBe(false);

    for (let night = 11; night <= season.lengthDays; night += 1) {
      data.tarawih[getNightKey(season, night)] = { done: true, updatedAt: 1 };
    }
    expect(badgesFor(data)("tarawihAll").unlocked).toBe(true);
  });

  it("Laylat al-Qadr : exige les 5 nuits impaires", () => {
    const data = emptyData();
    for (const night of [21, 23, 25, 27]) {
      data.tarawih[getNightKey(season, night)] = { done: true, updatedAt: 1 };
    }
    expect(badgesFor(data)("laylat").unlocked).toBe(false);
    expect(badgesFor(data)("laylat").current).toBe(4);

    data.tarawih[getNightKey(season, 29)] = { done: true, updatedAt: 1 };
    expect(badgesFor(data)("laylat").unlocked).toBe(true);
  });

  it("sadaqa : 7 jours, puis tout le mois", () => {
    const data = emptyData();
    for (let day = 1; day <= 7; day += 1) {
      data.sadaqa[getDayKey(season, day)] = { done: true, updatedAt: 1 };
    }
    expect(badgesFor(data)("sadaqa7").unlocked).toBe(true);
    expect(badgesFor(data)("sadaqaAll").unlocked).toBe(false);
  });

  it("khatm : débloqué seulement quand tout le plan est lu", () => {
    const data = emptyData();
    expect(badgesFor(data)("khatm").unlocked).toBe(false);

    data.khatmPlan = createKhatmPlan(1, 30, "2027-02-08", 1);
    data.khatmLog = { "2027-02-08": { juz: 29, updatedAt: 2 } };
    expect(badgesFor(data)("khatm").unlocked).toBe(false);
    expect(badgesFor(data)("khatm").current).toBe(29);

    data.khatmLog = { "2027-02-08": { juz: 29, updatedAt: 2 }, "2027-02-09": { juz: 1, updatedAt: 3 } };
    expect(badgesFor(data)("khatm").unlocked).toBe(true);
  });

  it("qada : débloqué quand tous les jours à rattraper le sont, pas avant", () => {
    const data = emptyData();
    expect(badgesFor(data)("qada").unlocked).toBe(false); // rien à rattraper

    data.fasting[getDayKey(season, 1)] = { status: "missed", updatedAt: 1 };
    data.fasting[getDayKey(season, 2)] = { status: "exempt", updatedAt: 1 };
    expect(badgesFor(data)("qada").unlocked).toBe(false);

    data.qadaDone = { count: 1, updatedAt: 2 };
    expect(badgesFor(data)("qada").unlocked).toBe(false);
    expect(badgesFor(data)("qada").current).toBe(1);

    data.qadaDone = { count: 2, updatedAt: 3 };
    expect(badgesFor(data)("qada").unlocked).toBe(true);
  });

  it("décocher une case retire le badge correspondant (calcul toujours à jour)", () => {
    const data = emptyData();
    data.fasting[getDayKey(season, 1)] = { status: "fasted", updatedAt: 1 };
    expect(badgesFor(data)("firstFast").unlocked).toBe(true);
    data.fasting[getDayKey(season, 1)] = { status: "none", updatedAt: 2 };
    expect(badgesFor(data)("firstFast").unlocked).toBe(false);
  });
});
