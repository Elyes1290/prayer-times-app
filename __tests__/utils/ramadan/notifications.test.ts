jest.mock("../../../locales/i18n", () => ({
  __esModule: true,
  default: { language: "fr" },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  buildRamadanReminders,
  getRamadanNativeConfig,
  getRamadanRemindersForScheduling,
  RAMADAN_REMINDER_LABELS,
} from "../../../utils/ramadan/notifications";
import { createKhatmPlan } from "../../../utils/ramadan/khatm";
import {
  addLocalDays,
  getNightEveDate,
  getRamadanSeason,
  toLocalDateKey,
} from "../../../utils/ramadan/season";
import {
  DEFAULT_RAMADAN_SETTINGS,
  type RamadanSettings,
} from "../../../utils/ramadan/storage";

const PARIS = { latitude: 48.8566, longitude: 2.3522 };
const METHOD = "MuslimWorldLeague";
const noon = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);

const season = getRamadanSeason(new Date(2027, 1, 20, 12));
const dayOf = (n: number) => noon(addLocalDays(season.startDate, n - 1));

function build(
  now: Date,
  overrides: {
    settings?: Partial<RamadanSettings>;
    windowDays?: number;
    maxCount?: number;
    khatm?: Parameters<typeof buildRamadanReminders>[0]["khatm"];
    language?: string;
  } = {},
) {
  return buildRamadanReminders({
    now,
    userLocation: PARIS,
    calcMethod: METHOD,
    season: getRamadanSeason(now),
    settings: { ...DEFAULT_RAMADAN_SETTINGS, ...overrides.settings },
    language: overrides.language ?? "fr",
    windowDays: overrides.windowDays ?? 3,
    maxCount: overrides.maxCount ?? 50,
    khatm: overrides.khatm ?? null,
  });
}

describe("ramadan/notifications — buildRamadanReminders", () => {
  it("ne programme rien hors saison", () => {
    expect(build(new Date(2026, 9, 16, 12))).toEqual([]);
  });

  it("programme suhoor + iftar chaque jour, triés, avec des libellés dédiés", () => {
    const reminders = build(dayOf(5), { windowDays: 3 });
    const keys = reminders.map((r) => r.key);

    for (let n = 6; n <= 7; n += 1) {
      const key = toLocalDateKey(dayOf(n));
      expect(keys).toContain(`ramadan_suhoor_${key}`);
      expect(keys).toContain(`ramadan_iftar_${key}`);
    }
    const sorted = [...reminders].sort((a, b) => a.triggerMillis - b.triggerMillis);
    expect(reminders).toEqual(sorted);

    for (const reminder of reminders) {
      expect(reminder.prayer.startsWith("Ramadan")).toBe(true);
      expect(Object.values(RAMADAN_REMINDER_LABELS)).toContain(reminder.prayer);
      expect(reminder.triggerAtMillis).toBe(reminder.triggerMillis);
      expect(reminder.isToday).toBe(false);
    }
  });

  it("n'utilise jamais le mot « minutes » (le service Android le réécrit)", () => {
    for (const language of ["fr", "en", "ar"]) {
      const reminders = build(dayOf(5), { language, windowDays: 2 });
      expect(reminders.length).toBeGreaterThan(0);
      for (const { title, body } of reminders) {
        expect(`${title} ${body}`).not.toMatch(/minutes/i);
      }
    }
  });

  it("ignore les rappels déjà passés", () => {
    // 23 h : plus aucun rappel de la journée en cours
    const late = new Date(dayOf(5).getFullYear(), dayOf(5).getMonth(), dayOf(5).getDate(), 23, 30);
    const reminders = build(late, { windowDays: 1 });
    expect(reminders.every((r) => r.triggerMillis > late.getTime())).toBe(true);
    expect(reminders).toEqual([]);
  });

  it("respecte la fenêtre et le plafond", () => {
    const two = build(dayOf(5), { windowDays: 2 });
    const days = new Set(two.map((r) => r.key.split("_").pop()));
    expect(days.size).toBeLessThanOrEqual(2);

    const capped = build(dayOf(5), { windowDays: 10, maxCount: 4 });
    expect(capped).toHaveLength(4);
    expect(build(dayOf(5), { maxCount: 0 })).toEqual([]);
  });

  it("respecte les réglages désactivés", () => {
    const none = build(dayOf(5), {
      settings: { suhoorEnabled: false, iftarEnabled: false, laylatEnabled: false },
    });
    expect(none).toEqual([]);

    const onlyIftar = build(dayOf(5), { settings: { suhoorEnabled: false } });
    expect(onlyIftar.every((r) => r.prayer === RAMADAN_REMINDER_LABELS.iftar)).toBe(true);
  });

  it("le rappel de suhoor tombe avant Fajr et celui d'iftar avant Maghrib du délai choisi", () => {
    // À midi : l'iftar du soir (aujourd'hui) puis le suhoor de l'aube (demain)
    const [suhoor] = build(dayOf(8), {
      settings: { iftarEnabled: false, suhoorReminderMin: 30 },
      windowDays: 2,
    });
    const [iftar] = build(dayOf(8), {
      settings: { suhoorEnabled: false, iftarReminderMin: 15 },
      windowDays: 2,
    });
    expect(suhoor.body).toContain("30 min");
    expect(iftar.body).toContain("15 min");
    expect(iftar.triggerMillis).toBeLessThan(suhoor.triggerMillis);
    expect(iftar.triggerMillis).toBeGreaterThan(dayOf(8).getTime());
  });

  it("programme la nuit 27 le soir du 26e jour, après l'Isha", () => {
    const eve = noon(getNightEveDate(season, 27));
    const reminders = build(eve, { windowDays: 2 });
    const laylat = reminders.find((r) => r.key === "ramadan_laylat_27");
    expect(laylat).toBeDefined();
    expect(laylat?.prayer).toBe(RAMADAN_REMINDER_LABELS.laylat);
    expect(laylat?.title).toContain("27");
    // Le soir, pas à midi
    expect(laylat!.triggerMillis).toBeGreaterThan(eve.getTime() + 6 * 3_600_000);
    // Pas de nuit 25 ni 29 dans cette fenêtre
    expect(reminders.find((r) => r.key === "ramadan_laylat_25")).toBeUndefined();
    expect(reminders.find((r) => r.key === "ramadan_laylat_29")).toBeUndefined();
  });

  it("rappel de lecture : seulement si un plan est actif et la portion du jour non lue", () => {
    const plan = createKhatmPlan(1, 30, toLocalDateKey(season.startDate));
    const now = new Date(dayOf(5).getFullYear(), dayOf(5).getMonth(), dayOf(5).getDate(), 8, 0);
    const todayKey = toLocalDateKey(now);

    const noPlan = build(now, { windowDays: 2 });
    expect(noPlan.some((r) => r.prayer === RAMADAN_REMINDER_LABELS.khatm)).toBe(false);

    const withPlan = build(now, { windowDays: 2, khatm: { plan, log: {} } });
    expect(withPlan.some((r) => r.key === `ramadan_khatm_${todayKey}`)).toBe(true);

    const doneToday = build(now, {
      windowDays: 2,
      khatm: { plan, log: { [todayKey]: { juz: 30, updatedAt: 1 } } },
    });
    expect(doneToday.some((r) => r.prayer === RAMADAN_REMINDER_LABELS.khatm)).toBe(false);
  });
});

describe("ramadan/notifications — getRamadanRemindersForScheduling", () => {
  const mocked = AsyncStorage as unknown as { getItem: jest.Mock };

  afterEach(() => {
    mocked.getItem.mockImplementation(() => Promise.resolve(null));
  });

  const ctx = (platform: string, now: Date) => ({
    userLocation: PARIS,
    calcMethod: METHOD,
    platform,
    now,
  });

  it("retourne [] pour un utilisateur non premium", async () => {
    mocked.getItem.mockImplementation(() => Promise.resolve(null));
    expect(await getRamadanRemindersForScheduling(ctx("android", dayOf(5)))).toEqual([]);
  });

  it("retourne [] hors saison même pour un premium", async () => {
    mocked.getItem.mockImplementation((key: string) =>
      Promise.resolve(key === "@prayer_app_premium_user" ? JSON.stringify({ isPremium: true }) : null),
    );
    expect(
      await getRamadanRemindersForScheduling(ctx("android", new Date(2026, 9, 16, 12))),
    ).toEqual([]);
  });

  it("premium : fenêtre courte et plafond bas sur iOS, fenêtre longue sur Android", async () => {
    mocked.getItem.mockImplementation((key: string) =>
      Promise.resolve(key === "@prayer_app_premium_user" ? JSON.stringify({ isPremium: true }) : null),
    );
    const now = new Date(dayOf(5).getFullYear(), dayOf(5).getMonth(), dayOf(5).getDate(), 1, 0);
    const ios = await getRamadanRemindersForScheduling(ctx("ios", now));
    const android = await getRamadanRemindersForScheduling(ctx("android", now));
    expect(ios.length).toBeGreaterThan(0);
    expect(ios.length).toBeLessThanOrEqual(6);
    expect(android.length).toBeGreaterThan(ios.length);
  });

  it("ne lève jamais d'exception (stockage défaillant)", async () => {
    mocked.getItem.mockImplementation(() => Promise.reject(new Error("boom")));
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(getRamadanRemindersForScheduling(ctx("android", dayOf(5)))).resolves.toEqual([]);
    warn.mockRestore();
  });
});

describe("ramadan/notifications — getRamadanNativeConfig", () => {
  const mocked = AsyncStorage as unknown as { getItem: jest.Mock };

  afterEach(() => {
    mocked.getItem.mockImplementation(() => Promise.resolve(null));
  });

  it("premium : réglages par défaut + textes traduits, avec un titre par nuit impaire", async () => {
    mocked.getItem.mockImplementation((key: string) =>
      Promise.resolve(key === "@prayer_app_premium_user" ? JSON.stringify({ isPremium: true }) : null),
    );
    const config = await getRamadanNativeConfig();
    expect(config).toMatchObject({
      premium: true,
      startOffsetDays: DEFAULT_RAMADAN_SETTINGS.startOffsetDays,
      suhoorEnabled: DEFAULT_RAMADAN_SETTINGS.suhoorEnabled,
      suhoorMin: DEFAULT_RAMADAN_SETTINGS.suhoorReminderMin,
      iftarEnabled: DEFAULT_RAMADAN_SETTINGS.iftarEnabled,
      iftarMin: DEFAULT_RAMADAN_SETTINGS.iftarReminderMin,
      laylatEnabled: DEFAULT_RAMADAN_SETTINGS.laylatEnabled,
    });
    expect(Object.keys(config!.laylatTitles).sort()).toEqual(["21", "23", "25", "27", "29"]);
    expect(config!.laylatTitles["27"]).toContain("27");
    expect(config!.suhoorTitle.length).toBeGreaterThan(0);
    expect(config!.iftarBody.length).toBeGreaterThan(0);
    // Le mot « minutes » est réécrit par le service Android : ne jamais l'utiliser.
    expect(config!.suhoorBody).not.toMatch(/minutes/i);
    expect(config!.iftarBody).not.toMatch(/minutes/i);
  });

  it("non premium : premium=false (le natif n'arme alors rien)", async () => {
    mocked.getItem.mockImplementation(() => Promise.resolve(null));
    const config = await getRamadanNativeConfig();
    expect(config?.premium).toBe(false);
  });
});
