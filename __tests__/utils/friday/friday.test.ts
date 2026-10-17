jest.mock("../../../locales/i18n", () => ({
  __esModule: true,
  default: { language: "fr" },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import ar from "../../../locales/friday/ar.json";
import en from "../../../locales/friday/en.json";
import fr from "../../../locales/friday/fr.json";
import { isFridayTestMode } from "../../../utils/friday/debug";
import { fridayTranslate, resolveFridayLanguage } from "../../../utils/friday/i18n";
import {
  buildFridayReminders,
  FRIDAY_REMINDER_LABEL,
  getFridayRemindersForScheduling,
  isFriday,
} from "../../../utils/friday/reminders";
import {
  DEFAULT_FRIDAY_SETTINGS,
  loadFridaySettings,
  normalizeFridaySettings,
  saveFridaySettings,
} from "../../../utils/friday/storage";

// Vendredi 16 octobre 2026
const FRIDAY = new Date(2026, 9, 16, 6, 0, 0);
const SETTINGS = { enabled: true, hour: 8, minute: 0 };

function build(now: Date, overrides: Partial<Parameters<typeof buildFridayReminders>[0]> = {}) {
  return buildFridayReminders({
    now,
    settings: SETTINGS,
    language: "fr",
    windowDays: 28,
    maxCount: 20,
    ...overrides,
  });
}

describe("friday/debug", () => {
  it("est toujours désactivé pendant les tests Jest", () => {
    expect(isFridayTestMode()).toBe(false);
  });
});

describe("friday/reminders", () => {
  it("reconnaît le vendredi", () => {
    expect(isFriday(new Date(2026, 9, 16, 23, 59))).toBe(true);
    expect(isFriday(new Date(2026, 9, 15, 12))).toBe(false);
    expect(isFriday(new Date(2026, 9, 17, 0, 1))).toBe(false);
  });

  it("programme uniquement les vendredis, à l'heure choisie", () => {
    const reminders = build(FRIDAY);
    expect(reminders).toHaveLength(4);
    for (const reminder of reminders) {
      const date = new Date(reminder.triggerMillis);
      expect(date.getDay()).toBe(5);
      expect(date.getHours()).toBe(8);
      expect(date.getMinutes()).toBe(0);
      expect(reminder.prayer).toBe(FRIDAY_REMINDER_LABEL);
      expect(reminder.triggerAtMillis).toBe(reminder.triggerMillis);
    }
    expect(reminders[0].key).toBe("friday_2026-10-16");
    expect(reminders[1].key).toBe("friday_2026-10-23");
  });

  it("ignore le vendredi du jour si l'heure est déjà passée", () => {
    const afterEight = new Date(2026, 9, 16, 9, 0, 0);
    const reminders = build(afterEight);
    expect(reminders[0].key).toBe("friday_2026-10-23");
  });

  it("ne programme rien si le rappel est désactivé", () => {
    expect(build(FRIDAY, { settings: { ...SETTINGS, enabled: false } })).toEqual([]);
  });

  it("respecte la fenêtre et le plafond", () => {
    expect(build(FRIDAY, { windowDays: 3 })).toHaveLength(1);
    expect(build(FRIDAY, { maxCount: 2 })).toHaveLength(2);
    expect(build(FRIDAY, { maxCount: 0 })).toEqual([]);
  });

  it("n'emploie jamais le mot « minutes » (remplacé par le natif Android)", () => {
    for (const language of ["fr", "en", "ar", "tr"]) {
      const [reminder] = build(FRIDAY, { language });
      expect(reminder.title.length).toBeGreaterThan(0);
      expect(reminder.body.toLowerCase()).not.toContain("minutes");
    }
  });

  it("traduit selon la langue (fallback anglais)", () => {
    expect(build(FRIDAY, { language: "fr" })[0].title).toBe(fr.notif.title);
    expect(build(FRIDAY, { language: "ar" })[0].title).toBe(ar.notif.title);
    expect(build(FRIDAY, { language: "ja" })[0].title).toBe(en.notif.title);
  });

  it("l'heure choisie par l'utilisateur est respectée", () => {
    const [reminder] = build(FRIDAY, { settings: { enabled: true, hour: 13, minute: 30 } });
    const date = new Date(reminder.triggerMillis);
    expect([date.getHours(), date.getMinutes()]).toEqual([13, 30]);
  });
});

describe("friday/storage + planification", () => {
  const store = new Map<string, string>();
  const mocked = AsyncStorage as unknown as { getItem: jest.Mock; setItem: jest.Mock };

  beforeEach(() => {
    store.clear();
    mocked.getItem.mockImplementation((key: string) => Promise.resolve(store.get(key) ?? null));
    mocked.setItem.mockImplementation((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    });
  });

  afterEach(() => {
    mocked.getItem.mockImplementation(() => Promise.resolve(null));
    mocked.setItem.mockImplementation(() => Promise.resolve());
  });

  it("valeurs par défaut : activé à 08:00", () => {
    expect(DEFAULT_FRIDAY_SETTINGS).toEqual({ enabled: true, hour: 8, minute: 0 });
    expect(normalizeFridaySettings(null)).toEqual(DEFAULT_FRIDAY_SETTINGS);
    expect(normalizeFridaySettings("x")).toEqual(DEFAULT_FRIDAY_SETTINGS);
  });

  it("borne et nettoie les réglages", () => {
    expect(normalizeFridaySettings({ enabled: "oui", hour: 99, minute: -5 })).toEqual({
      enabled: true,
      hour: 23,
      minute: 0,
    });
  });

  it("enregistre puis relit les réglages", async () => {
    await saveFridaySettings({ enabled: false, hour: 7, minute: 30 });
    expect(await loadFridaySettings()).toEqual({ enabled: false, hour: 7, minute: 30 });
  });

  it("ne lève jamais si le stockage échoue", async () => {
    mocked.getItem.mockRejectedValueOnce(new Error("illisible"));
    expect(await loadFridaySettings()).toEqual(DEFAULT_FRIDAY_SETTINGS);
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    mocked.setItem.mockRejectedValueOnce(new Error("disque plein"));
    await expect(saveFridaySettings(DEFAULT_FRIDAY_SETTINGS)).resolves.toBeUndefined();
    warn.mockRestore();
  });

  it("Android : plusieurs vendredis ; iOS : un seul rappel dans la fenêtre courte", async () => {
    const android = await getFridayRemindersForScheduling({ platform: "android", now: FRIDAY });
    expect(android.length).toBeGreaterThanOrEqual(10);

    const ios = await getFridayRemindersForScheduling({ platform: "ios", now: FRIDAY });
    expect(ios).toHaveLength(1);
  });

  it("liste vide si l'utilisateur a désactivé le rappel", async () => {
    await saveFridaySettings({ enabled: false, hour: 8, minute: 0 });
    expect(await getFridayRemindersForScheduling({ platform: "android", now: FRIDAY })).toEqual([]);
  });
});

describe("friday/i18n", () => {
  function flatten(node: unknown, prefix = ""): string[] {
    if (typeof node === "string") return [prefix];
    if (node && typeof node === "object") {
      return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
        flatten(value, prefix ? `${prefix}.${key}` : key),
      );
    }
    return [];
  }

  it("résout la langue (région ignorée, fallback anglais)", () => {
    expect(resolveFridayLanguage("fr-FR")).toBe("fr");
    expect(resolveFridayLanguage("AR")).toBe("ar");
    expect(resolveFridayLanguage("ja")).toBe("en");
  });

  it("interpole et retombe sur la clé si elle manque", () => {
    expect(fridayTranslate("fr", "settings.toggleDesc", { time: "08:00" })).toContain("08:00");
    expect(fridayTranslate("fr", "clé.inexistante")).toBe("clé.inexistante");
  });

  it("fr, en et ar exposent exactement les mêmes clés", () => {
    const reference = flatten(fr).sort();
    expect(flatten(en).sort()).toEqual(reference);
    expect(flatten(ar).sort()).toEqual(reference);
  });

  it("les variables {{...}} sont les mêmes dans toutes les langues", () => {
    const vars = (text: string) => (text.match(/\{\{\s*\w+\s*\}\}/g) ?? []).sort().join(",");
    for (const key of flatten(fr)) {
      const get = (bundle: unknown) =>
        key.split(".").reduce<unknown>((n, p) => (n as Record<string, unknown>)[p], bundle) as string;
      expect(vars(get(en))).toBe(vars(get(fr)));
      expect(vars(get(ar))).toBe(vars(get(fr)));
    }
  });
});
