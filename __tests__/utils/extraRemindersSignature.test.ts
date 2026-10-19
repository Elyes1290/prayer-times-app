import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  EXTRAS_SIGNATURE_KEY,
  SIGNATURE_HORIZON_MS,
  buildSignatureEntries,
  entriesInHorizon,
  isExtrasScheduleStale,
  saveExtrasSignature,
} from "../../utils/extraRemindersSignature";
import { getFridayRemindersForScheduling } from "../../utils/friday/reminders";
import { getRamadanRemindersForScheduling } from "../../utils/ramadan/notifications";

// Stockage en mémoire (le mock global d'AsyncStorage ne conserve rien).
jest.mock("@react-native-async-storage/async-storage", () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => (store.has(key) ? store.get(key)! : null)),
      setItem: jest.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      clear: jest.fn(async () => {
        store.clear();
      }),
    },
  };
});

jest.mock("../../utils/friday/reminders", () => ({
  getFridayRemindersForScheduling: jest.fn(),
}));
jest.mock("../../utils/ramadan/notifications", () => ({
  getRamadanRemindersForScheduling: jest.fn(),
}));

const NOW = new Date("2026-10-19T08:00:00Z");
const DAY = 86_400_000;
const ctx = {
  userLocation: { latitude: 48.85, longitude: 2.35 },
  calcMethod: "MuslimWorldLeague",
  platform: "android",
  now: NOW,
};

const reminder = (prayer: string, daysFromNow: number) => ({
  prayer,
  triggerMillis: NOW.getTime() + daysFromNow * DAY,
});

const mockFriday = getFridayRemindersForScheduling as jest.Mock;
const mockRamadan = getRamadanRemindersForScheduling as jest.Mock;

describe("extraRemindersSignature", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockFriday.mockReset().mockResolvedValue([]);
    mockRamadan.mockReset().mockResolvedValue([]);
  });

  it("construit des entrées triées et ne garde que l'horizon futur pour la comparaison", () => {
    const all = buildSignatureEntries([
      reminder("FridayReminder", 3),
      reminder("FridayReminder", -1),
      reminder("FridayReminder", 30),
    ]);
    const kept = entriesInHorizon(all, NOW.getTime());
    expect(kept).toHaveLength(1);
    expect(SIGNATURE_HORIZON_MS).toBe(14 * DAY);
  });

  it("considère le planning périmé si aucune signature n'a jamais été mémorisée", async () => {
    await expect(isExtrasScheduleStale(ctx)).resolves.toBe(true);
  });

  it("détecte un ancien planning de test (rappel tous les jours) alors qu'on n'attend rien", async () => {
    await saveExtrasSignature([
      reminder("FridayReminder", 1),
      reminder("FridayReminder", 2),
      reminder("RamadanSuhoor", 1),
    ]);
    // Hors vendredi et hors saison : aucun rappel attendu.
    await expect(isExtrasScheduleStale(ctx)).resolves.toBe(true);
  });

  it("n'est pas périmé quand le planning programmé correspond à l'attendu", async () => {
    const friday = [reminder("FridayReminder", 4)];
    mockFriday.mockResolvedValue(friday);
    await saveExtrasSignature(friday);
    await expect(isExtrasScheduleStale(ctx)).resolves.toBe(false);
  });

  it("n'est pas périmé quand rien n'est attendu et rien n'est programmé", async () => {
    await saveExtrasSignature([]);
    await expect(isExtrasScheduleStale(ctx)).resolves.toBe(false);
  });

  it("ignore les rappels déjà passés et ceux au-delà de l'horizon", async () => {
    const friday = [reminder("FridayReminder", 4)];
    mockFriday.mockResolvedValue(friday);
    await saveExtrasSignature([
      reminder("FridayReminder", -3), // déjà passé
      ...friday,
      reminder("FridayReminder", 40), // trop loin pour la comparaison
    ]);
    await expect(isExtrasScheduleStale(ctx)).resolves.toBe(false);
  });

  it("détecte un rappel Ramadan programmé alors que la saison n'est pas en cours", async () => {
    await saveExtrasSignature([reminder("RamadanIftar", 2)]);
    await expect(isExtrasScheduleStale(ctx)).resolves.toBe(true);
  });

  it("traite une signature illisible comme périmée", async () => {
    await AsyncStorage.setItem(EXTRAS_SIGNATURE_KEY, "pas du json");
    await expect(isExtrasScheduleStale(ctx)).resolves.toBe(true);
  });

  it("ne déclenche rien (faux) si le calcul attendu échoue", async () => {
    await saveExtrasSignature([]);
    mockFriday.mockRejectedValue(new Error("boom"));
    await expect(isExtrasScheduleStale(ctx)).resolves.toBe(false);
  });
});
