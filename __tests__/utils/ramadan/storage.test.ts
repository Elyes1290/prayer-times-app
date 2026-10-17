import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  computeFastingStats,
  createEmptyRamadanData,
  DEFAULT_RAMADAN_SETTINGS,
  getKhatmDayIndex,
  loadRamadanData,
  loadRamadanSettings,
  mergeRamadanData,
  normalizeData,
  normalizeSettings,
  saveRamadanData,
  saveRamadanSettings,
  subscribeRamadanSettings,
  type RamadanData,
} from "../../../utils/ramadan/storage";
import { createKhatmPlan } from "../../../utils/ramadan/khatm";

const YEAR = 1448;

function data(overrides: Partial<RamadanData> = {}): RamadanData {
  return { ...createEmptyRamadanData(YEAR), ...overrides };
}

describe("ramadan/storage — normalisation", () => {
  it("retourne les valeurs par défaut pour des données invalides", () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_RAMADAN_SETTINGS);
    expect(normalizeSettings("n'importe quoi")).toEqual(DEFAULT_RAMADAN_SETTINGS);
    expect(normalizeData(undefined, YEAR)).toEqual(createEmptyRamadanData(YEAR));
  });

  it("borne les réglages hors limites", () => {
    const settings = normalizeSettings({
      startOffsetDays: 9,
      suhoorReminderMin: 9999,
      iftarReminderMin: -4,
      khatmReminderHour: 30,
      khatmReminderMinute: 99,
      suhoorEnabled: "oui",
    });
    expect(settings.startOffsetDays).toBe(2);
    expect(settings.suhoorReminderMin).toBe(120);
    expect(settings.iftarReminderMin).toBe(0);
    expect(settings.khatmReminderHour).toBe(23);
    expect(settings.khatmReminderMinute).toBe(59);
    expect(settings.suhoorEnabled).toBe(DEFAULT_RAMADAN_SETTINGS.suhoorEnabled);
  });

  it("ne garde que les entrées valides et ignore tout champ inconnu (ex. motif de dispense)", () => {
    const normalized = normalizeData(
      {
        fasting: {
          "2027-02-08": { status: "exempt", updatedAt: 5, reason: "médical" },
          "pas-une-date": { status: "fasted", updatedAt: 5 },
          "2027-02-09": { status: "inconnu", updatedAt: 5 },
        },
        evil: "<script>",
      },
      YEAR,
    );
    expect(Object.keys(normalized.fasting)).toEqual(["2027-02-08"]);
    expect(normalized.fasting["2027-02-08"]).toEqual({ status: "exempt", updatedAt: 5 });
    expect(JSON.stringify(normalized)).not.toContain("médical");
    expect(JSON.stringify(normalized)).not.toContain("script");
  });
});

describe("ramadan/storage — fusion multi-appareils", () => {
  it("conserve les jours cochés sur chacun des appareils", () => {
    const a = data({ fasting: { "2027-02-08": { status: "fasted", updatedAt: 10 } } });
    const b = data({ fasting: { "2027-02-09": { status: "fasted", updatedAt: 20 } } });
    const merged = mergeRamadanData(a, b);
    expect(Object.keys(merged.fasting).sort()).toEqual(["2027-02-08", "2027-02-09"]);
  });

  it("la version la plus récente gagne pour un même jour (y compris l'effacement)", () => {
    const a = data({ fasting: { "2027-02-08": { status: "fasted", updatedAt: 10 } } });
    const b = data({ fasting: { "2027-02-08": { status: "none", updatedAt: 20 } } });
    expect(mergeRamadanData(a, b).fasting["2027-02-08"].status).toBe("none");
    expect(mergeRamadanData(b, a).fasting["2027-02-08"].status).toBe("none");
  });

  it("est idempotente et commutative", () => {
    const a = data({
      fasting: { "2027-02-08": { status: "missed", updatedAt: 10 } },
      qadaDone: { count: 1, updatedAt: 30 },
    });
    const b = data({
      fasting: { "2027-02-09": { status: "fasted", updatedAt: 20 } },
      qadaDone: { count: 2, updatedAt: 40 },
    });
    const ab = mergeRamadanData(a, b);
    expect(mergeRamadanData(ab, b)).toEqual(ab);
    expect(mergeRamadanData(b, a)).toEqual(ab);
    expect(ab.qadaDone.count).toBe(2);
  });

  it("un plan supprimé plus récemment qu'il n'a été créé reste supprimé", () => {
    const plan = createKhatmPlan(1, 30, "2027-02-08", 100);
    const withPlan = data({ khatmPlan: plan });
    const deleted = data({ khatmPlanDeletedAt: 200 });
    expect(mergeRamadanData(withPlan, deleted).khatmPlan).toBeNull();
    expect(mergeRamadanData(deleted, withPlan).khatmPlan).toBeNull();
  });

  it("un plan recréé après suppression ne ressuscite pas l'ancien journal de lecture", () => {
    const oldLog = { "2027-02-08": { juz: 5, updatedAt: 150 } };
    const staleDevice = data({
      khatmPlan: createKhatmPlan(1, 30, "2027-02-08", 100),
      khatmLog: oldLog,
    });
    const newPlan = createKhatmPlan(2, 20, "2027-02-10", 300);
    const recreated = data({
      khatmPlan: newPlan,
      khatmPlanDeletedAt: 250,
      khatmLog: { "2027-02-10": { juz: 2, updatedAt: 310 } },
    });
    const merged = mergeRamadanData(staleDevice, recreated);
    expect(merged.khatmPlan).toEqual(newPlan);
    expect(merged.khatmLog).toEqual({ "2027-02-10": { juz: 2, updatedAt: 310 } });
  });
});

describe("ramadan/storage — statistiques", () => {
  const today = new Date(2027, 1, 12, 12);

  it("compte jeûnés, manqués, dispensés et jours à rattraper", () => {
    const stats = computeFastingStats(
      data({
        fasting: {
          "2027-02-08": { status: "fasted", updatedAt: 1 },
          "2027-02-09": { status: "missed", updatedAt: 1 },
          "2027-02-10": { status: "exempt", updatedAt: 1 },
          "2027-02-11": { status: "none", updatedAt: 1 },
        },
        qadaDone: { count: 1, updatedAt: 1 },
      }),
      today,
    );
    expect(stats).toMatchObject({ fasted: 1, missed: 1, exempt: 1, qadaOwed: 1 });
  });

  it("qadaOwed n'est jamais négatif", () => {
    const stats = computeFastingStats(
      data({ qadaDone: { count: 5, updatedAt: 1 } }),
      today,
    );
    expect(stats.qadaOwed).toBe(0);
  });

  it("la série ne casse pas tant qu'aujourd'hui n'est pas saisi", () => {
    const fasting = {
      "2027-02-09": { status: "fasted" as const, updatedAt: 1 },
      "2027-02-10": { status: "fasted" as const, updatedAt: 1 },
      "2027-02-11": { status: "fasted" as const, updatedAt: 1 },
    };
    expect(computeFastingStats(data({ fasting }), today).streak).toBe(3);
    const withToday = {
      ...fasting,
      "2027-02-12": { status: "fasted" as const, updatedAt: 1 },
    };
    expect(computeFastingStats(data({ fasting: withToday }), today).streak).toBe(4);
    const broken = { ...withToday, "2027-02-10": { status: "missed" as const, updatedAt: 2 } };
    expect(computeFastingStats(data({ fasting: broken }), today).streak).toBe(2);
  });

  it("getKhatmDayIndex ne descend jamais sous 0", () => {
    const plan = createKhatmPlan(1, 30, "2027-02-08");
    expect(getKhatmDayIndex(plan, new Date(2027, 1, 1))).toBe(0);
    expect(getKhatmDayIndex(plan, new Date(2027, 1, 18))).toBe(10);
  });
});

describe("ramadan/storage — persistance", () => {
  const store = new Map<string, string>();
  const mocked = AsyncStorage as unknown as {
    getItem: jest.Mock;
    setItem: jest.Mock;
  };

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

  it("enregistre puis relit les réglages et les données (par année hijri)", async () => {
    await saveRamadanSettings({ ...DEFAULT_RAMADAN_SETTINGS, suhoorReminderMin: 30 });
    expect((await loadRamadanSettings()).suhoorReminderMin).toBe(30);

    const saved = data({ fasting: { "2027-02-08": { status: "fasted", updatedAt: 7 } } });
    await saveRamadanData(saved);
    expect(await loadRamadanData(YEAR)).toEqual(saved);
    expect(await loadRamadanData(YEAR + 1)).toEqual(createEmptyRamadanData(YEAR + 1));
  });

  it("ne lève pas d'exception si le stockage échoue", async () => {
    mocked.setItem.mockRejectedValueOnce(new Error("disque plein"));
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(saveRamadanData(data())).resolves.toBeUndefined();
    warn.mockRestore();

    mocked.getItem.mockRejectedValueOnce(new Error("illisible"));
    expect(await loadRamadanSettings()).toEqual(DEFAULT_RAMADAN_SETTINGS);
  });

  it("notifie les abonnés quand les réglages changent", async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeRamadanSettings(listener);
    await saveRamadanSettings({ ...DEFAULT_RAMADAN_SETTINGS, startOffsetDays: 1 });
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ startOffsetDays: 1 }),
    );
    unsubscribe();
    await saveRamadanSettings({ ...DEFAULT_RAMADAN_SETTINGS, startOffsetDays: 2 });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
