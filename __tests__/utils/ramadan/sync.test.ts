jest.mock("../../../utils/apiClient", () => ({
  __esModule: true,
  default: {
    saveRamadanProgress: jest.fn(),
  },
}));

import ApiClient from "../../../utils/apiClient";
import {
  __resetRamadanSyncForTests,
  RAMADAN_SYNC_MIN_INTERVAL_MS,
  syncRamadanData,
} from "../../../utils/ramadan/sync";
import {
  createEmptyRamadanData,
  type RamadanData,
} from "../../../utils/ramadan/storage";

const YEAR = 1448;
const saveProgress = ApiClient.saveRamadanProgress as unknown as jest.Mock;

function local(): RamadanData {
  return {
    ...createEmptyRamadanData(YEAR),
    fasting: { "2027-02-08": { status: "fasted", updatedAt: 10 } },
  };
}

function remoteResponse(): unknown {
  return {
    success: true,
    data: {
      data: {
        ...createEmptyRamadanData(YEAR),
        fasting: { "2027-02-09": { status: "missed", updatedAt: 20 } },
      },
    },
  };
}

describe("ramadan/sync", () => {
  beforeEach(() => {
    __resetRamadanSyncForTests();
    saveProgress.mockReset();
  });

  it("fusionne la réponse du serveur avec les données locales", async () => {
    saveProgress.mockResolvedValue(remoteResponse());
    const merged = await syncRamadanData(local(), { force: true });
    expect(saveProgress).toHaveBeenCalledWith(YEAR, expect.any(Object));
    expect(Object.keys(merged?.fasting ?? {}).sort()).toEqual(["2027-02-08", "2027-02-09"]);
  });

  it("retourne null sans lever d'erreur si le réseau échoue", async () => {
    saveProgress.mockRejectedValue(new Error("offline"));
    const log = jest.spyOn(console, "log").mockImplementation(() => undefined);
    await expect(syncRamadanData(local(), { force: true })).resolves.toBeNull();
    log.mockRestore();
  });

  it("retourne null si la réponse est vide", async () => {
    saveProgress.mockResolvedValue({ success: false });
    expect(await syncRamadanData(local(), { force: true })).toBeNull();
  });

  it("respecte l'intervalle minimal sauf si force", async () => {
    saveProgress.mockResolvedValue(remoteResponse());
    await syncRamadanData(local(), { force: true });
    expect(saveProgress).toHaveBeenCalledTimes(1);

    expect(await syncRamadanData(local())).toBeNull();
    expect(saveProgress).toHaveBeenCalledTimes(1);

    await syncRamadanData(local(), { force: true });
    expect(saveProgress).toHaveBeenCalledTimes(2);
    expect(RAMADAN_SYNC_MIN_INTERVAL_MS).toBeGreaterThan(0);
  });

  it("déduplique les synchronisations simultanées", async () => {
    let resolve: (value: unknown) => void = () => undefined;
    saveProgress.mockImplementation(
      () => new Promise((r) => {
        resolve = r;
      }),
    );
    const first = syncRamadanData(local(), { force: true });
    const second = syncRamadanData(local(), { force: true });
    resolve(remoteResponse());
    await Promise.all([first, second]);
    expect(saveProgress).toHaveBeenCalledTimes(1);
  });

  it("ne synchronise pas sans année hijri valide", async () => {
    expect(await syncRamadanData(createEmptyRamadanData(0), { force: true })).toBeNull();
    expect(saveProgress).not.toHaveBeenCalled();
  });
});
