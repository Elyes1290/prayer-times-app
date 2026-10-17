import { computeRamadanBadges } from "../../../utils/ramadan/badges";
import {
  computeRamadanRecap,
  hasRecapContent,
  isRecapAvailable,
} from "../../../utils/ramadan/recap";
import { addLocalDays, getRamadanSeason } from "../../../utils/ramadan/season";
import {
  computeFastingStats,
  createEmptyRamadanData,
} from "../../../utils/ramadan/storage";
import { getDayKey, getNightKey } from "../../../utils/ramadan/worship";

const baseSeason = getRamadanSeason(new Date(2027, 1, 14, 12));

describe("ramadan/recap — disponibilité", () => {
  it("indisponible avant le dernier jour", () => {
    expect(isRecapAvailable(getRamadanSeason(new Date(2027, 1, 14, 12)))).toBe(false);
    expect(isRecapAvailable(getRamadanSeason(addLocalDays(baseSeason.startDate, -5)))).toBe(false);
  });

  it("disponible le dernier jour de Ramadan", () => {
    const last = addLocalDays(baseSeason.startDate, baseSeason.lengthDays - 1);
    expect(isRecapAvailable(getRamadanSeason(last))).toBe(true);
  });

  it("disponible pendant la phase de l'Aïd", () => {
    const eid = addLocalDays(baseSeason.startDate, baseSeason.lengthDays);
    expect(isRecapAvailable(getRamadanSeason(eid))).toBe(true);
  });
});

describe("ramadan/recap — calcul", () => {
  const now = new Date(2027, 1, 14, 12);
  const season = getRamadanSeason(now);

  it("bilan vide sans contenu", () => {
    const data = createEmptyRamadanData(season.hijriYear);
    const stats = computeFastingStats(data, now);
    const recap = computeRamadanRecap(data, season, stats, computeRamadanBadges(data, season, stats));
    expect(recap.fastedDays).toBe(0);
    expect(recap.khatmJuzTotal).toBe(0);
    expect(hasRecapContent(recap)).toBe(false);
  });

  it("agrège jeûne, série, taraouih, sadaqa et badges débloqués", () => {
    const data = createEmptyRamadanData(season.hijriYear);
    for (let day = 1; day <= 8; day++) {
      data.fasting[getDayKey(season, day)] = { status: "fasted", updatedAt: 1 };
    }
    data.fasting[getDayKey(season, 9)] = { status: "missed", updatedAt: 1 };
    for (let night = 1; night <= 3; night++) {
      data.tarawih[getNightKey(season, night)] = { done: true, updatedAt: 1 };
    }
    data.sadaqa[getDayKey(season, 1)] = { done: true, updatedAt: 1 };

    const stats = computeFastingStats(data, now);
    const badges = computeRamadanBadges(data, season, stats);
    const recap = computeRamadanRecap(data, season, stats, badges);

    expect(recap.fastedDays).toBe(8);
    expect(recap.bestStreak).toBe(8);
    expect(recap.tarawihNights).toBe(3);
    expect(recap.sadaqaDays).toBe(1);
    expect(recap.totalDays).toBe(season.lengthDays);
    expect(recap.unlockedBadges.map((badge) => badge.code)).toEqual(
      expect.arrayContaining(["firstFast", "weekStreak"]),
    );
    expect(recap.unlockedBadges.every((badge) => badge.unlocked)).toBe(true);
    expect(hasRecapContent(recap)).toBe(true);
  });

  it("n'expose jamais les jours manqués ou dispensés", () => {
    const data = createEmptyRamadanData(season.hijriYear);
    data.fasting[getDayKey(season, 1)] = { status: "exempt", updatedAt: 1 };
    data.fasting[getDayKey(season, 2)] = { status: "missed", updatedAt: 1 };
    const stats = computeFastingStats(data, now);
    const recap = computeRamadanRecap(data, season, stats, computeRamadanBadges(data, season, stats));
    expect(Object.keys(recap)).not.toEqual(
      expect.arrayContaining(["missed", "exempt", "missedDays", "exemptDays"]),
    );
    expect(hasRecapContent(recap)).toBe(false);
  });
});
