/**
 * Tests de robustesse de la session : un refresh de token qui échoue pour une
 * raison passagère (réseau, timeout, 5xx) ne doit JAMAIS être interprété comme une
 * session invalide, alors qu'un refus explicite du serveur (401/403) doit l'être.
 */
const mockStore: Record<string, string> = {};

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStore[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStore[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete mockStore[key];
    }),
  },
}));

jest.mock("../../utils/userAuth", () => ({
  __esModule: true,
  getCurrentUserId: jest.fn(() => Promise.resolve(1)),
}));

jest.mock("../../utils/config", () => ({
  __esModule: true,
  AppConfig: { API_BASE_URL: "https://api.test" },
}));

jest.mock("../../locales/i18n", () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

jest.mock("../../utils/globalToastBridge", () => ({
  __esModule: true,
  showGlobalToast: jest.fn(),
}));

jest.mock("../../utils/syncAndroidAuthToken", () => ({
  __esModule: true,
  syncAndroidAuthTokenIfNeeded: jest.fn(),
}));

import ApiClient, {
  SESSION_REFRESH_UNAVAILABLE,
  verifyAuth,
} from "../../utils/apiClient";
import { showGlobalToast } from "../../utils/globalToastBridge";
import { syncAndroidAuthTokenIfNeeded } from "../../utils/syncAndroidAuthToken";

// Horloge simulée : chaque test avance de 60 s, ce qui réinitialise l'anti-doublon
// des toasts « session expirée » (15 s) entre deux tests.
let mockNow = 1_000_000;

const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

const jsonResponse = (status: number, body: any = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const isRefreshCall = (url: string, init?: RequestInit) =>
  url.endsWith("/auth.php") && init?.method === "POST";

/** Simule un serveur : l'endpoint protégé répond 401 tant que le token est périmé. */
function mockServer(options: {
  refresh: () => any | Promise<any>;
  protectedAfterRefresh?: () => any;
}) {
  mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
    if (isRefreshCall(url, init)) {
      return options.refresh();
    }
    const auth = (init?.headers as Record<string, string> | undefined)
      ?.Authorization;
    if (auth === "Bearer new-access") {
      return (
        options.protectedAfterRefresh?.() ??
        jsonResponse(200, { success: true, data: { id: 1 } })
      );
    }
    return jsonResponse(401, { message: "Token invalide ou expiré" });
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockNow += 60_000;
  jest.spyOn(Date, "now").mockImplementation(() => mockNow);
  mockFetch.mockReset();
  for (const key of Object.keys(mockStore)) delete mockStore[key];
  mockStore.auth_token = "old-access";
  mockStore.refresh_token = "old-refresh";
});

describe("refresh de session — indisponibilité passagère", () => {
  test("réseau coupé pendant le refresh : pas de 401, pas de toast, tokens conservés", async () => {
    mockServer({
      refresh: () => {
        throw new TypeError("Network request failed");
      },
    });

    const error: any = await ApiClient.getUser().catch((e) => e);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain(SESSION_REFRESH_UNAVAILABLE);
    // Les appelants déconnectent sur "HTTP 401/403/404" : ce message ne doit pas y ressembler.
    expect(error.message).not.toMatch(/HTTP (401|403|404)/);
    expect(showGlobalToast).not.toHaveBeenCalled();
    expect(mockStore.refresh_token).toBe("old-refresh");
    expect(mockStore.auth_token).toBe("old-access");
  });

  test("erreur serveur 500 pendant le refresh : traité comme indisponible", async () => {
    mockServer({ refresh: () => jsonResponse(500, { message: "DB down" }) });

    const error: any = await ApiClient.getUser().catch((e) => e);

    expect(error.message).toContain(SESSION_REFRESH_UNAVAILABLE);
    expect(showGlobalToast).not.toHaveBeenCalled();
    expect(mockStore.refresh_token).toBe("old-refresh");
  });

  test("429 pendant le refresh : traité comme indisponible", async () => {
    mockServer({ refresh: () => jsonResponse(429, {}) });

    const error: any = await ApiClient.getUser().catch((e) => e);

    expect(error.message).toContain(SESSION_REFRESH_UNAVAILABLE);
    expect(showGlobalToast).not.toHaveBeenCalled();
  });
});

describe("refresh de session — refus explicite du serveur", () => {
  test("refresh token refusé (401) : HTTP 401 + toast de session expirée", async () => {
    mockServer({
      refresh: () =>
        jsonResponse(401, { message: "Refresh token invalide ou expiré" }),
    });

    const error: any = await ApiClient.getUser().catch((e) => e);

    expect(error.message).toContain("HTTP 401");
    expect(showGlobalToast).toHaveBeenCalledTimes(1);
  });

  test("compte inactif (403) : traité comme un refus", async () => {
    mockServer({ refresh: () => jsonResponse(403, {}) });

    const error: any = await ApiClient.getUser().catch((e) => e);

    expect(error.message).toContain("HTTP 401");
    expect(showGlobalToast).toHaveBeenCalledTimes(1);
  });

  test("requêtes parallèles perdant la session : un seul toast", async () => {
    mockServer({ refresh: () => jsonResponse(401, {}) });

    const results = await Promise.allSettled([
      ApiClient.getUser(),
      ApiClient.getUser(),
      ApiClient.getUser(),
    ]);

    expect(results.every((r) => r.status === "rejected")).toBe(true);
    expect(showGlobalToast).toHaveBeenCalledTimes(1);
  });

  test("plus aucun refresh token local : session perdue", async () => {
    delete mockStore.refresh_token;
    mockServer({ refresh: () => jsonResponse(200, {}) });

    const error: any = await ApiClient.getUser().catch((e) => e);

    expect(error.message).toContain("HTTP 401");
    expect(showGlobalToast).toHaveBeenCalledTimes(1);
  });
});

describe("refresh de session — succès", () => {
  test("renouvelle les tokens, rejoue la requête et ne notifie rien", async () => {
    mockServer({
      refresh: () =>
        jsonResponse(200, {
          success: true,
          data: { token: "new-access", refresh_token: "new-refresh" },
        }),
    });

    const result: any = await ApiClient.getUser();

    expect(result.success).toBe(true);
    expect(mockStore.auth_token).toBe("new-access");
    expect(mockStore.refresh_token).toBe("new-refresh");
    expect(showGlobalToast).not.toHaveBeenCalled();
  });

  test("synchronise le nouveau token vers le service audio natif Android", async () => {
    mockServer({
      refresh: () =>
        jsonResponse(200, {
          success: true,
          data: { token: "new-access", refresh_token: "new-refresh" },
        }),
    });

    await ApiClient.getUser();

    expect(syncAndroidAuthTokenIfNeeded).toHaveBeenCalledWith("new-access");
  });

  test("aucune synchronisation native quand le refresh échoue", async () => {
    mockServer({ refresh: () => jsonResponse(500, {}) });

    await ApiClient.getUser().catch(() => undefined);

    expect(syncAndroidAuthTokenIfNeeded).not.toHaveBeenCalled();
  });

  test("le token fraîchement renouvelé reste refusé (401) : toast de session expirée", async () => {
    mockServer({
      refresh: () =>
        jsonResponse(200, {
          success: true,
          data: { token: "new-access", refresh_token: "new-refresh" },
        }),
      protectedAfterRefresh: () => jsonResponse(401, { message: "Refusé" }),
    });

    const error: any = await ApiClient.getUser().catch((e) => e);

    expect(error.message).toContain("HTTP 401");
    expect(showGlobalToast).toHaveBeenCalledTimes(1);
  });

  test("le rejeu échoue en 500 : aucun faux toast de session expirée", async () => {
    mockServer({
      refresh: () =>
        jsonResponse(200, {
          success: true,
          data: { token: "new-access", refresh_token: "new-refresh" },
        }),
      protectedAfterRefresh: () => jsonResponse(500, { message: "Oups" }),
    });

    const error: any = await ApiClient.getUser().catch((e) => e);

    expect(error.message).toContain("HTTP 500");
    expect(showGlobalToast).not.toHaveBeenCalled();
  });
});

describe("retry réseau (React Native : « Network request failed »)", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test("un GET est rejoué après un échec réseau puis réussit", async () => {
    jest.useFakeTimers();
    mockStore.auth_token = "new-access";
    mockFetch
      .mockRejectedValueOnce(new TypeError("Network request failed"))
      .mockResolvedValueOnce(jsonResponse(200, { success: true }));

    const promise = ApiClient.getUser();
    await jest.advanceTimersByTimeAsync(2000);

    await expect(promise).resolves.toMatchObject({ success: true });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test("un POST n'est jamais rejoué après un échec réseau (pas de doublon d'écriture)", async () => {
    mockFetch.mockRejectedValue(new TypeError("Network request failed"));

    await expect(
      ApiClient.createUser({ email: "a@b.c" })
    ).rejects.toThrow("Network request failed");

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe("verifyAuth() — tolérance aux indisponibilités", () => {
  test("erreur réseau React Native : session considérée valide", async () => {
    mockFetch.mockRejectedValue(new TypeError("Network request failed"));
    jest.useFakeTimers();

    const promise = verifyAuth();
    await jest.advanceTimersByTimeAsync(10000);

    await expect(promise).resolves.toBe(true);
    jest.useRealTimers();
  });

  test("erreur serveur 503 : session considérée valide", async () => {
    mockFetch.mockResolvedValue(jsonResponse(503, { message: "Maintenance" }));

    await expect(verifyAuth()).resolves.toBe(true);
  });

  test("refresh indisponible : session considérée valide", async () => {
    mockServer({
      refresh: () => {
        throw new TypeError("Network request failed");
      },
    });

    await expect(verifyAuth()).resolves.toBe(true);
  });

  test("refus explicite du serveur : session invalide", async () => {
    mockServer({ refresh: () => jsonResponse(401, {}) });

    await expect(verifyAuth()).resolves.toBe(false);
  });
});
