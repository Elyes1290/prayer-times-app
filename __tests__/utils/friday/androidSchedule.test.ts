jest.mock("../../../locales/i18n", () => ({
  __esModule: true,
  default: { language: "fr" },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  FRIDAY_IMMEDIATE_WINDOW_DAYS,
  scheduleFridayRemindersAndroid,
  serializeFridayConfig,
} from "../../../utils/friday/androidSchedule";
import { getFridayNativeConfig } from "../../../utils/friday/reminders";
import type { RamadanReminder } from "../../../utils/ramadan/notifications";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 14, 12);

function reminder(daysFromNow: number): RamadanReminder {
  const at = NOW + daysFromNow * DAY;
  return {
    key: `friday_${daysFromNow}`,
    prayer: "FridayReminder",
    triggerMillis: at,
    triggerAtMillis: at,
    title: "Titre",
    body: "Corps",
    isToday: false,
  };
}

const CONFIG = { enabled: true, hour: 8, minute: 30, title: "Jumu'ah", body: "Bon vendredi" };

describe("friday/androidSchedule", () => {
  it("arme les jours proches et envoie la config au natif", () => {
    const module = { schedulePrayerReminders: jest.fn(), saveFridayConfig: jest.fn() };
    const reminders = [reminder(2), reminder(9), reminder(12)];

    const scheduled = scheduleFridayRemindersAndroid(reminders, CONFIG, module, NOW);

    expect(scheduled).toBe(2);
    expect(module.schedulePrayerReminders).toHaveBeenCalledWith([reminders[0], reminders[1]]);
    expect(JSON.parse(module.saveFridayConfig.mock.calls[0][0])).toEqual(CONFIG);
    expect(FRIDAY_IMMEDIATE_WINDOW_DAYS).toBe(10);
  });

  it("envoie la config même désactivée, pour que le natif n'arme plus rien", () => {
    const module = { schedulePrayerReminders: jest.fn(), saveFridayConfig: jest.fn() };
    const disabled = { ...CONFIG, enabled: false };

    expect(scheduleFridayRemindersAndroid([], disabled, module, NOW)).toBe(0);
    expect(module.schedulePrayerReminders).not.toHaveBeenCalled();
    expect(JSON.parse(module.saveFridayConfig.mock.calls[0][0]).enabled).toBe(false);
  });

  it("ne touche pas à la config native si elle n'a pas pu être lue (null)", () => {
    const module = { schedulePrayerReminders: jest.fn(), saveFridayConfig: jest.fn() };
    scheduleFridayRemindersAndroid([reminder(1)], null, module, NOW);
    expect(module.saveFridayConfig).not.toHaveBeenCalled();
  });

  it("reste utilisable avec une ancienne version native (sans saveFridayConfig)", () => {
    const module = { schedulePrayerReminders: jest.fn() };
    expect(scheduleFridayRemindersAndroid([reminder(1)], CONFIG, module, NOW)).toBe(1);
    expect(scheduleFridayRemindersAndroid([reminder(1)], CONFIG, undefined, NOW)).toBe(0);
  });

  it("ne lève jamais d'exception si le module natif échoue", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const boom = () => {
      throw new Error("natif");
    };
    const module = { schedulePrayerReminders: jest.fn(boom), saveFridayConfig: jest.fn(boom) };
    expect(() => scheduleFridayRemindersAndroid([reminder(1)], CONFIG, module, NOW)).not.toThrow();
    warn.mockRestore();
  });

  it("sérialise la config sans champ superflu", () => {
    expect(JSON.parse(serializeFridayConfig({ ...CONFIG }))).toEqual(CONFIG);
  });
});

describe("friday/getFridayNativeConfig", () => {
  const mocked = AsyncStorage as unknown as { getItem: jest.Mock };

  it("renvoie les réglages (activé, heure) avec les textes traduits", async () => {
    mocked.getItem.mockResolvedValueOnce(JSON.stringify({ enabled: true, hour: 9, minute: 15 }));
    const config = await getFridayNativeConfig();
    expect(config).toMatchObject({ enabled: true, hour: 9, minute: 15 });
    expect(config?.title.length).toBeGreaterThan(0);
    expect(config?.body.length).toBeGreaterThan(0);
    expect(config?.body).not.toMatch(/minutes/i);
  });

  it("reflète le rappel désactivé", async () => {
    mocked.getItem.mockResolvedValueOnce(JSON.stringify({ enabled: false, hour: 8, minute: 0 }));
    expect(await getFridayNativeConfig()).toMatchObject({ enabled: false });
  });
});
