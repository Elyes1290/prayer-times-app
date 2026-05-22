import {
  estimateDurationMsFromFileSizeMb,
  isStaleOrImplausibleDuration,
  mergeDurationMillis,
  normalizeDurationMillis,
  parseSurahNumberFromServiceTitle,
  resolvePlaybackDurationMs,
} from "../../utils/audioDurationUtils";

describe("audioDurationUtils", () => {
  test("normalizeDurationMillis treats small values as seconds", () => {
    expect(normalizeDurationMillis(5000, 47)).toBe(47000);
    expect(normalizeDurationMillis(0, 99)).toBe(99000);
    expect(normalizeDurationMillis(0, 7200)).toBe(7200000);
  });

  test("normalizeDurationMillis keeps large values as ms", () => {
    expect(normalizeDurationMillis(60000, 3600000)).toBe(3600000);
  });

  test("mergeDurationMillis does not overwrite with zero", () => {
    expect(mergeDurationMillis(47000, 10000, 0)).toBe(47000);
  });

  test("mergeDurationMillis updates when new duration is valid", () => {
    expect(mergeDurationMillis(0, 1000, 99)).toBe(99000);
  });

  test("parseSurahNumberFromServiceTitle extracts surah id", () => {
    expect(
      parseSurahNumberFromServiceTitle("Al-Baqara (002) - AbdelBasset"),
    ).toBe(2);
    expect(parseSurahNumberFromServiceTitle("Al-Fatiha (001)")).toBe(1);
    expect(parseSurahNumberFromServiceTitle(null)).toBeNull();
  });

  test("isStaleOrImplausibleDuration rejects Baqara duration on Fatiha", () => {
    const baqaraMs = (264 * 60 + 9) * 1000;
    expect(isStaleOrImplausibleDuration(1, 1, baqaraMs)).toBe(true);
  });

  test("isStaleOrImplausibleDuration accepts plausible Fatiha duration", () => {
    expect(isStaleOrImplausibleDuration(1, 1, 99000)).toBe(false);
  });

  test("mergeDurationMillis keeps duration when raw is zero", () => {
    expect(mergeDurationMillis(47000, 5000, 0)).toBe(47000);
  });

  test("estimateDurationMsFromFileSizeMb for ~0.42 MB is only a rough guess", () => {
    const ms = estimateDurationMsFromFileSizeMb(0.42);
    expect(ms).toBeLessThan(60000);
  });

  test("resolvePlaybackDurationMs prefers native over file-size estimate", () => {
    const estimated = estimateDurationMsFromFileSizeMb(0.42);
    const resolved = resolvePlaybackDurationMs({
      rawDuration: 99,
      positionMs: 45000,
      previousMs: estimated,
      fileSizeMb: 0.42,
      selectedSurah: 1,
      serviceSurah: 1,
    });
    expect(resolved).toBe(99000);
  });

  test("resolvePlaybackDurationMs uses API duration when native is 0 (streaming)", () => {
    const resolved = resolvePlaybackDurationMs({
      rawDuration: 0,
      positionMs: 5000,
      previousMs: 0,
      fileSizeMb: 0.42,
      catalogDurationMs: 99000,
      selectedSurah: 1,
      serviceSurah: 1,
    });
    expect(resolved).toBe(99000);
  });

  test("resolvePlaybackDurationMs rejects wrong native vs catalog (27s vs 99s)", () => {
    const resolved = resolvePlaybackDurationMs({
      rawDuration: 27,
      positionMs: 45000,
      previousMs: 27000,
      fileSizeMb: 0.42,
      catalogDurationMs: 99000,
      selectedSurah: 1,
      serviceSurah: 1,
    });
    expect(resolved).toBe(99000);
  });

  test("resolvePlaybackDurationMs prefers native when catalog is too short (Sudais Fatiha)", () => {
    const resolved = resolvePlaybackDurationMs({
      rawDuration: 59000,
      positionMs: 30000,
      previousMs: 5000,
      catalogDurationMs: 5000,
      selectedSurah: 1,
      serviceSurah: 1,
    });
    expect(resolved).toBe(59000);
  });

  test("resolvePlaybackDurationMs rejects stale Baqara on Fatiha", () => {
    const baqaraMs = (264 * 60 + 9) * 1000;
    const resolved = resolvePlaybackDurationMs({
      rawDuration: baqaraMs,
      positionMs: 2000,
      previousMs: 0,
      fileSizeMb: 0.42,
      selectedSurah: 1,
      serviceSurah: 2,
    });
    expect(resolved).toBeLessThan(baqaraMs);
  });
});
