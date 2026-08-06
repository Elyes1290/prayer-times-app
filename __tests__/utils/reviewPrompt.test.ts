import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";
import {
  maybeRequestAppReview,
  resetReviewPromptState,
} from "../../utils/reviewPrompt";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock("expo-store-review", () => ({
  isAvailableAsync: jest.fn(),
  requestReview: jest.fn(),
}));

jest.mock("../../contexts/SettingsContext", () => ({
  FIRST_LAUNCH_FLAG: "app_first_launch_done",
}));

const FIRST_OPEN_DATE_KEY = "review_prompt_first_open_date";
const LAST_PROMPT_DATE_KEY = "review_prompt_last_shown_date";
const FIRST_LAUNCH_FLAG = "app_first_launch_done";
const DAY_MS = 24 * 60 * 60 * 1000;

describe("reviewPrompt", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("enregistre la date de première ouverture sans demander d'avis immédiatement", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (StoreReview.isAvailableAsync as jest.Mock).mockResolvedValue(true);

    await maybeRequestAppReview();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      FIRST_OPEN_DATE_KEY,
      expect.any(String),
    );
    expect(StoreReview.requestReview).not.toHaveBeenCalled();
  });

  it("rend un utilisateur existant (mise à jour) éligible dès la prochaine ouverture", async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === FIRST_OPEN_DATE_KEY) {
        return Promise.resolve(null);
      }
      if (key === FIRST_LAUNCH_FLAG) {
        return Promise.resolve("true");
      }
      return Promise.resolve(null);
    });
    (StoreReview.isAvailableAsync as jest.Mock).mockResolvedValue(true);

    await maybeRequestAppReview();

    expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
  });

  it("ne demande pas d'avis avant 7 jours", async () => {
    const threeDaysAgo = Date.now() - 3 * DAY_MS;
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === FIRST_OPEN_DATE_KEY) {
        return Promise.resolve(threeDaysAgo.toString());
      }
      return Promise.resolve(null);
    });

    await maybeRequestAppReview();

    expect(StoreReview.requestReview).not.toHaveBeenCalled();
  });

  it("demande un avis après 7 jours si l'API est disponible", async () => {
    const eightDaysAgo = Date.now() - 8 * DAY_MS;
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === FIRST_OPEN_DATE_KEY) {
        return Promise.resolve(eightDaysAgo.toString());
      }
      return Promise.resolve(null);
    });
    (StoreReview.isAvailableAsync as jest.Mock).mockResolvedValue(true);

    await maybeRequestAppReview();

    expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      LAST_PROMPT_DATE_KEY,
      expect.any(String),
    );
  });

  it("ne redemande pas avant le cooldown de 90 jours", async () => {
    const eightDaysAgo = Date.now() - 8 * DAY_MS;
    const tenDaysAgo = Date.now() - 10 * DAY_MS;
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === FIRST_OPEN_DATE_KEY) {
        return Promise.resolve(eightDaysAgo.toString());
      }
      if (key === LAST_PROMPT_DATE_KEY) {
        return Promise.resolve(tenDaysAgo.toString());
      }
      return Promise.resolve(null);
    });

    await maybeRequestAppReview();

    expect(StoreReview.requestReview).not.toHaveBeenCalled();
  });

  it("ne plante pas si l'API native n'est pas disponible", async () => {
    const eightDaysAgo = Date.now() - 8 * DAY_MS;
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === FIRST_OPEN_DATE_KEY) {
        return Promise.resolve(eightDaysAgo.toString());
      }
      return Promise.resolve(null);
    });
    (StoreReview.isAvailableAsync as jest.Mock).mockResolvedValue(false);

    await expect(maybeRequestAppReview()).resolves.not.toThrow();
    expect(StoreReview.requestReview).not.toHaveBeenCalled();
  });

  it("resetReviewPromptState efface les clés de suivi", async () => {
    await resetReviewPromptState();
    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
      FIRST_OPEN_DATE_KEY,
      LAST_PROMPT_DATE_KEY,
    ]);
  });
});
