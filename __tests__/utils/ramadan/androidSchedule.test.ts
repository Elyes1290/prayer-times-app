import {
  ANDROID_IMMEDIATE_WINDOW_DAYS,
  scheduleRamadanAndroid,
  scheduleRamadanRemindersAndroid,
  serializeRamadanSchedule,
} from "../../../utils/ramadan/androidSchedule";
import type {
  RamadanNativeConfig,
  RamadanReminder,
} from "../../../utils/ramadan/notifications";

const DAY = 86_400_000;
const NOW = Date.UTC(2027, 1, 10, 12);

function reminder(daysFromNow: number, prayer = "RamadanIftar"): RamadanReminder {
  const at = NOW + daysFromNow * DAY;
  return {
    key: `${prayer}_${daysFromNow}`,
    prayer,
    triggerMillis: at,
    triggerAtMillis: at,
    title: "Titre",
    body: "Corps",
    isToday: false,
  };
}

describe("ramadan/androidSchedule", () => {
  it("arme les 10 prochains jours et enregistre TOUTE la saison côté natif", () => {
    const module = { schedulePrayerReminders: jest.fn(), saveRamadanSchedule: jest.fn() };
    const all = [reminder(1), reminder(9), reminder(11), reminder(25)];

    const scheduled = scheduleRamadanRemindersAndroid(all, module, NOW);

    expect(scheduled).toBe(2);
    expect(module.schedulePrayerReminders).toHaveBeenCalledWith([all[0], all[1]]);
    const saved = JSON.parse(module.saveRamadanSchedule.mock.calls[0][0]);
    expect(saved).toHaveLength(4);
    expect(saved[3]).toEqual({
      p: "RamadanIftar",
      t: all[3].triggerMillis,
      title: "Titre",
      body: "Corps",
    });
    expect(ANDROID_IMMEDIATE_WINDOW_DAYS).toBe(10);
  });

  it("envoie un planning vide pour effacer un planning périmé (hors saison / non premium)", () => {
    const module = { schedulePrayerReminders: jest.fn(), saveRamadanSchedule: jest.fn() };
    expect(scheduleRamadanRemindersAndroid([], module, NOW)).toBe(0);
    expect(module.schedulePrayerReminders).not.toHaveBeenCalled();
    expect(module.saveRamadanSchedule).toHaveBeenCalledWith("[]");
  });

  it("reste utilisable avec une ancienne version native (sans saveRamadanSchedule)", () => {
    const module = { schedulePrayerReminders: jest.fn() };
    expect(scheduleRamadanRemindersAndroid([reminder(1)], module, NOW)).toBe(1);
    expect(scheduleRamadanRemindersAndroid([reminder(1)], undefined, NOW)).toBe(0);
  });

  it("ne lève jamais d'exception si le module natif échoue", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const module = {
      schedulePrayerReminders: jest.fn(() => {
        throw new Error("natif");
      }),
      saveRamadanSchedule: jest.fn(() => {
        throw new Error("natif");
      }),
    };
    expect(() => scheduleRamadanRemindersAndroid([reminder(1)], module, NOW)).not.toThrow();
    warn.mockRestore();
  });

  it("sérialise sous forme compacte", () => {
    expect(serializeRamadanSchedule([])).toBe("[]");
  });
});

describe("ramadan/androidSchedule — scheduleRamadanAndroid (suhoor/iftar/Laylat natifs)", () => {
  const config: RamadanNativeConfig = {
    premium: true,
    startOffsetDays: 0,
    suhoorEnabled: true,
    suhoorMin: 45,
    iftarEnabled: true,
    iftarMin: 10,
    laylatEnabled: true,
    suhoorTitle: "S",
    suhoorBody: "sb",
    iftarTitle: "I",
    iftarBody: "ib",
    laylatBody: "lb",
    laylatTitles: { "27": "Nuit 27" },
  };

  it("n'arme et ne stocke côté JS que le rappel de lecture (pas de doublon avec le natif)", () => {
    const module = {
      schedulePrayerReminders: jest.fn(),
      saveRamadanSchedule: jest.fn(),
      saveRamadanConfig: jest.fn(),
    };
    const all = [
      reminder(1, "RamadanSuhoor"),
      reminder(1, "RamadanIftar"),
      reminder(2, "RamadanLaylat"),
      reminder(1, "RamadanKhatm"),
    ];

    const scheduled = scheduleRamadanAndroid(all, config, module, NOW);

    expect(scheduled).toBe(1);
    expect(module.schedulePrayerReminders).toHaveBeenCalledWith([all[3]]);
    const saved = JSON.parse(module.saveRamadanSchedule.mock.calls[0][0]);
    expect(saved.map((r: { p: string }) => r.p)).toEqual(["RamadanKhatm"]);
  });

  it("envoie la config au natif", () => {
    const module = { saveRamadanSchedule: jest.fn(), saveRamadanConfig: jest.fn() };
    scheduleRamadanAndroid([], config, module, NOW);
    expect(JSON.parse(module.saveRamadanConfig.mock.calls[0][0])).toEqual(config);
    expect(module.saveRamadanSchedule).toHaveBeenCalledWith("[]");
  });

  it("config illisible (null) : le natif garde la précédente", () => {
    const module = { saveRamadanSchedule: jest.fn(), saveRamadanConfig: jest.fn() };
    scheduleRamadanAndroid([], null, module, NOW);
    expect(module.saveRamadanConfig).not.toHaveBeenCalled();
  });

  it("ne lève jamais (ancien natif sans saveRamadanConfig, ou natif en erreur)", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(() => scheduleRamadanAndroid([], config, {}, NOW)).not.toThrow();
    expect(() => scheduleRamadanAndroid([], config, undefined, NOW)).not.toThrow();
    const failing = {
      saveRamadanConfig: jest.fn(() => {
        throw new Error("natif");
      }),
    };
    expect(() => scheduleRamadanAndroid([], config, failing, NOW)).not.toThrow();
    warn.mockRestore();
  });
});
