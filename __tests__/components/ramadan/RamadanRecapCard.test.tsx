import React from "react";
import { Share } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

jest.mock("../../../hooks/useThemeColor", () => ({
  useThemeColors: () => ({
    cardBG: "#fff",
    background: "#fff",
    primary: "#2E8B57",
    text: "#000",
    textSecondary: "#555",
    textOnPrimary: "#fff",
    border: "#ccc",
    error: "#d00",
  }),
}));

jest.mock("react-native-view-shot", () => ({
  captureRef: jest.fn(),
}));
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import RamadanRecapCard, {
  buildRecapMessage,
  buildRecapStats,
} from "../../../components/ramadan/RamadanRecapCard";
import type { RamadanRecap } from "../../../utils/ramadan/recap";
import { ramadanTranslate } from "../../../utils/ramadan/i18n";

const t = (key: string, vars?: Record<string, string | number>) =>
  ramadanTranslate("fr", key, vars);

const recap: RamadanRecap = {
  hijriYear: 1448,
  totalDays: 30,
  fastedDays: 28,
  bestStreak: 12,
  tarawihNights: 20,
  sadaqaDays: 5,
  khatmJuzDone: 30,
  khatmJuzTotal: 30,
  unlockedBadges: [
    { code: "firstFast", icon: "star-circle", color: "#2E8B57", current: 1, target: 1, unlocked: true },
  ],
};

const mockCapture = captureRef as jest.Mock;
const mockAvailable = Sharing.isAvailableAsync as jest.Mock;
const mockShare = Sharing.shareAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockCapture.mockResolvedValue("file:///tmp/recap.png");
  mockAvailable.mockResolvedValue(true);
  mockShare.mockResolvedValue(undefined);
});

describe("buildRecapStats / buildRecapMessage", () => {
  it("n'affiche que les statistiques non nulles", () => {
    const stats = buildRecapStats(
      { ...recap, bestStreak: 0, tarawihNights: 0, sadaqaDays: 0, khatmJuzDone: 0 },
      t,
    );
    expect(stats.map((stat) => stat.key)).toEqual(["fasted"]);
  });

  it("inclut toutes les statistiques d'un mois complet", () => {
    expect(buildRecapStats(recap, t).map((stat) => stat.key)).toEqual([
      "fasted",
      "streak",
      "tarawih",
      "sadaqa",
      "khatm",
    ]);
  });

  it("compose le message texte de secours", () => {
    expect(buildRecapMessage(recap, t)).toContain("28/30 jours jeûnés");
  });
});

describe("RamadanRecapCard", () => {
  it("sans contenu : pas de bouton de partage", () => {
    const empty: RamadanRecap = {
      ...recap,
      fastedDays: 0,
      bestStreak: 0,
      tarawihNights: 0,
      sadaqaDays: 0,
      khatmJuzDone: 0,
      unlockedBadges: [],
    };
    const { queryByText, getByText } = render(<RamadanRecapCard recap={empty} t={t} />);
    expect(queryByText("Partager mon bilan")).toBeNull();
    expect(getByText(/Cochez vos jours de jeûne/)).toBeTruthy();
  });

  it("capture l'image puis ouvre le partage de fichier", async () => {
    const { getByText } = render(<RamadanRecapCard recap={recap} t={t} />);
    fireEvent.press(getByText("Partager mon bilan"));
    expect(getByText("Mon Ramadan 1448")).toBeTruthy();
    expect(getByText("28/30")).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByText("Partager"));
    });

    await waitFor(() => expect(mockShare).toHaveBeenCalled());
    expect(mockCapture).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ format: "png", result: "tmpfile" }),
    );
    expect(mockShare).toHaveBeenCalledWith(
      "file:///tmp/recap.png",
      expect.objectContaining({ mimeType: "image/png" }),
    );
  });

  it("partage le texte si le partage de fichier est indisponible", async () => {
    mockAvailable.mockResolvedValue(false);
    const shareSpy = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" });
    const { getByText } = render(<RamadanRecapCard recap={recap} t={t} />);
    fireEvent.press(getByText("Partager mon bilan"));
    await act(async () => {
      fireEvent.press(getByText("Partager"));
    });
    await waitFor(() => expect(shareSpy).toHaveBeenCalled());
    expect(mockShare).not.toHaveBeenCalled();
    shareSpy.mockRestore();
  });

  it("affiche une erreur si la capture échoue", async () => {
    mockCapture.mockRejectedValue(new Error("boom"));
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const { getByText } = render(<RamadanRecapCard recap={recap} t={t} />);
    fireEvent.press(getByText("Partager mon bilan"));
    await act(async () => {
      fireEvent.press(getByText("Partager"));
    });
    await waitFor(() =>
      expect(getByText("Impossible de partager le bilan pour le moment.")).toBeTruthy(),
    );
    warn.mockRestore();
  });
});
