import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

jest.mock("../../../hooks/useThemeColor", () => ({
  useThemeColors: () => ({
    cardBG: "#fff",
    background: "#fff",
    surface: "#fff",
    primary: "#2E8B57",
    accent: "#D4AF37",
    text: "#000",
    textSecondary: "#555",
    textOnPrimary: "#fff",
    border: "#ccc",
    error: "#d00",
    warning: "#e90",
  }),
}));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
}));

import FastingCard from "../../../components/ramadan/FastingCard";
import KhatmCard from "../../../components/ramadan/KhatmCard";
import RemindersCard from "../../../components/ramadan/RemindersCard";
import { ramadanTranslate } from "../../../utils/ramadan/i18n";
import { createKhatmPlan } from "../../../utils/ramadan/khatm";
import {
  addLocalDays,
  getRamadanSeason,
  toLocalDateKey,
} from "../../../utils/ramadan/season";
import {
  computeFastingStats,
  createEmptyRamadanData,
  DEFAULT_RAMADAN_SETTINGS,
  type RamadanData,
} from "../../../utils/ramadan/storage";

const t = (key: string, vars?: Record<string, string | number>) =>
  ramadanTranslate("fr", key, vars);

const now = new Date(2027, 1, 14, 12);
const season = getRamadanSeason(now);
const todayKey = toLocalDateKey(now);

function emptyData(): RamadanData {
  return createEmptyRamadanData(season.hijriYear);
}

describe("FastingCard", () => {
  const baseProps = {
    season,
    todayKey,
    t,
    language: "fr",
    onSetStatus: jest.fn(),
    onSetQadaDone: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it("gratuit : coche aujourd'hui, mais les autres jours sont verrouillés (message Premium)", () => {
    const data = emptyData();
    const { getByText, getByLabelText, queryByText } = render(
      <FastingCard
        {...baseProps}
        data={data}
        stats={computeFastingStats(data, now)}
        isPremium={false}
      />,
    );

    fireEvent.press(getByText("J'ai jeûné aujourd'hui"));
    expect(baseProps.onSetStatus).toHaveBeenCalledWith(todayKey, "fasted");

    // Un jour passé : aucune modification, message Premium
    const pastLabel = new RegExp(`^Jour 2,`);
    fireEvent.press(getByLabelText(pastLabel));
    expect(baseProps.onSetStatus).toHaveBeenCalledTimes(1);
    expect(getByText(t("fasting.lockedPast"))).toBeTruthy();
    // La section qada est réservée aux abonnés
    expect(queryByText(t("fasting.qadaTitle"))).toBeNull();
  });

  it("premium : affiche le qada et permet de choisir un statut pour un jour passé", () => {
    const pastKey = toLocalDateKey(addLocalDays(season.startDate, 1));
    const data: RamadanData = {
      ...emptyData(),
      fasting: { [pastKey]: { status: "missed", updatedAt: 1 } },
    };
    const { getByText, getAllByText, getByLabelText } = render(
      <FastingCard
        {...baseProps}
        data={data}
        stats={computeFastingStats(data, now)}
        isPremium
      />,
    );

    expect(getByText(t("fasting.qadaTitle"))).toBeTruthy();
    fireEvent.press(getByText(t("fasting.qadaAdd")));
    expect(baseProps.onSetQadaDone).toHaveBeenCalledWith(1);

    fireEvent.press(getByLabelText(/^Jour 2,/));
    fireEvent.press(getAllByText("Jeûné").pop() as never);
    expect(baseProps.onSetStatus).toHaveBeenCalledWith(pastKey, "fasted");
  });
});

describe("KhatmCard", () => {
  const baseProps = {
    season,
    todayKey,
    now,
    t,
    language: "fr",
    onCreatePlan: jest.fn(),
    onDeletePlan: jest.fn(),
    onSetProgress: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it("sans plan : crée un plan avec l'objectif et la durée choisis", () => {
    const { getByText } = render(<KhatmCard {...baseProps} data={emptyData()} />);
    fireEvent.press(getByText(t("khatm.goalOption", { n: 2 })));
    fireEvent.press(getByText(t("khatm.create")));
    expect(baseProps.onCreatePlan).toHaveBeenCalledTimes(1);
    const [goal, days] = baseProps.onCreatePlan.mock.calls[0];
    expect(goal).toBe(2);
    expect(days).toBeGreaterThanOrEqual(5);
    expect(days).toBeLessThanOrEqual(30);
  });

  it("avec un plan : affiche la portion du jour, valide et ouvre la lecture", () => {
    const plan = createKhatmPlan(1, 30, toLocalDateKey(season.startDate));
    const data: RamadanData = { ...emptyData(), khatmPlan: plan };
    const { getByText } = render(<KhatmCard {...baseProps} data={data} />);

    expect(getByText(t("khatm.progress", { done: 0, total: 30 }))).toBeTruthy();
    fireEvent.press(getByText(t("khatm.markDone")));
    expect(baseProps.onSetProgress).toHaveBeenCalledWith(todayKey, expect.any(Number));
    expect(baseProps.onSetProgress.mock.calls[0][1]).toBeGreaterThan(0);

    fireEvent.press(getByText(t("khatm.open")));
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: "/quran",
        params: expect.objectContaining({ surah: expect.any(String) }),
      }),
    );
  });
});

describe("RemindersCard", () => {
  it("avertit si les notifications sont désactivées et propage les changements", () => {
    const onChange = jest.fn();
    const { getByText, getAllByLabelText } = render(
      <RemindersCard
        settings={DEFAULT_RAMADAN_SETTINGS}
        notificationsEnabled={false}
        t={t}
        onChange={onChange}
      />,
    );
    expect(getByText(t("reminders.needNotifications"))).toBeTruthy();

    fireEvent.press(getAllByLabelText(t("reminders.plus"))[0]);
    expect(onChange).toHaveBeenCalledWith({
      suhoorReminderMin: DEFAULT_RAMADAN_SETTINGS.suhoorReminderMin + 5,
    });
  });
});
