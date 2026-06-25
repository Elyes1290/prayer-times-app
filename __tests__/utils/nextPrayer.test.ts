import {
  computeTomorrowPrayerTimes,
  formatCountdown,
  getNextPrayerInfo,
  getPrayerProgressPercentage,
} from "../../utils/nextPrayer";

function makePrayerTimes(
  date: Date,
  hours: Record<string, number>,
): {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
} {
  const at = (hour: number, minute = 0) => {
    const value = new Date(date);
    value.setHours(hour, minute, 0, 0);
    return value;
  };

  return {
    fajr: at(hours.fajr ?? 5),
    sunrise: at(hours.sunrise ?? 6, 30),
    dhuhr: at(hours.dhuhr ?? 12, 30),
    asr: at(hours.asr ?? 15, 30),
    maghrib: at(hours.maghrib ?? 18, 30),
    isha: at(hours.isha ?? 20, 30),
  };
}

describe("nextPrayer", () => {
  it("retourne la prochaine prière du jour", () => {
    const day = new Date(2026, 0, 15);
    const times = makePrayerTimes(day, {});
    const now = new Date(day);
    now.setHours(10, 0, 0, 0);

    const next = getNextPrayerInfo(times, now);
    expect(next?.name).toBe("Dhuhr");
    expect(next?.countdown).toBe("2h 30min");
  });

  it("retourne le Fajr du lendemain après Isha", () => {
    const day = new Date(2026, 0, 15);
    const times = makePrayerTimes(day, { isha: 20 });
    times.isha.setMinutes(30);
    const tomorrow = new Date(2026, 0, 16);
    const tomorrowTimes = makePrayerTimes(tomorrow, { fajr: 5 });
    tomorrowTimes.fajr.setMinutes(30);

    const now = new Date(day);
    now.setHours(21, 0, 0, 0);

    const next = getNextPrayerInfo(times, now, {
      tomorrowPrayerTimes: tomorrowTimes,
    });

    expect(next?.name).toBe("Fajr");
    expect(next?.countdown).toBe("8h 30min");
  });

  it("ne confond pas le Fajr du lendemain avec Dhuhr", () => {
    const day = new Date(2026, 0, 15);
    const times = makePrayerTimes(day, { isha: 20 });
    times.isha.setMinutes(30);
    const tomorrow = new Date(2026, 0, 16);
    const tomorrowTimes = makePrayerTimes(tomorrow, { fajr: 5 });
    tomorrowTimes.fajr.setMinutes(30);

    const now = new Date(day);
    now.setHours(21, 0, 0, 0);

    const next = getNextPrayerInfo(times, now, {
      tomorrowPrayerTimes: tomorrowTimes,
    });

    expect(next?.name).toBe("Fajr");
    expect(next?.diff).toBeLessThan(10 * 60 * 60 * 1000);
  });

  it("calcule la progression entre Isha et le Fajr suivant", () => {
    const day = new Date(2026, 0, 15);
    const times = makePrayerTimes(day, { isha: 20 });
    const tomorrow = new Date(2026, 0, 16);
    const tomorrowTimes = makePrayerTimes(tomorrow, { fajr: 4 });

    const now = new Date(day);
    now.setHours(22, 0, 0, 0);

    const progress = getPrayerProgressPercentage(times, now, tomorrowTimes);
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThan(100);
  });

  it("calcule les horaires de demain pour le fallback Fajr", () => {
    const today = new Date(2026, 0, 15, 21, 0, 0, 0);
    const tomorrowTimes = computeTomorrowPrayerTimes(
      today,
      { latitude: 48.8566, longitude: 2.3522 },
      "MuslimWorldLeague",
    );

    expect(tomorrowTimes?.fajr.getDate()).toBe(16);
    expect(tomorrowTimes?.fajr.getTime()).toBeGreaterThan(today.getTime());
  });

  it("formate correctement le compte à rebours", () => {
    expect(formatCountdown(90 * 60 * 1000)).toBe("1h 30min");
    expect(formatCountdown(45 * 60 * 1000)).toBe("45min");
  });
});
