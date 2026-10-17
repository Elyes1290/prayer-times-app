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

import BadgesCard from "../../../components/ramadan/BadgesCard";
import LastTenNightsCard from "../../../components/ramadan/LastTenNightsCard";
import WorshipCard from "../../../components/ramadan/WorshipCard";
import { computeRamadanBadges } from "../../../utils/ramadan/badges";
import { ramadanTranslate } from "../../../utils/ramadan/i18n";
import { addLocalDays, getRamadanSeason, toLocalDateKey } from "../../../utils/ramadan/season";
import {
  computeFastingStats,
  createEmptyRamadanData,
  type RamadanData,
} from "../../../utils/ramadan/storage";
import {
  computeWorshipStats,
  getDayKey,
  getNightKey,
} from "../../../utils/ramadan/worship";

const t = (key: string, vars?: Record<string, string | number>) =>
  ramadanTranslate("fr", key, vars);

const baseSeason = getRamadanSeason(new Date(2027, 1, 14, 12));

function setup(now: Date) {
  const season = getRamadanSeason(now);
  const data: RamadanData = createEmptyRamadanData(season.hijriYear);
  return { season, data, todayKey: toLocalDateKey(now) };
}

describe("WorshipCard", () => {
  const onSetTarawih = jest.fn();
  const onSetSadaqa = jest.fn();
  beforeEach(() => jest.clearAllMocks());

  function renderCard(now: Date, data?: RamadanData) {
    const { season, data: empty, todayKey } = setup(now);
    const used = data ?? empty;
    return {
      season,
      todayKey,
      ...render(
        <WorshipCard
          season={season}
          data={used}
          todayKey={todayKey}
          worship={computeWorshipStats(used, season)}
          t={t}
          onSetTarawih={onSetTarawih}
          onSetSadaqa={onSetSadaqa}
        />,
      ),
    };
  }

  it("coche la prière de ce soir (nuit d + 1, enregistrée à la date du soir)", () => {
    const now = new Date(2027, 1, 14, 12); // jour 7
    const { getByText, todayKey } = renderCard(now);
    fireEvent.press(getByText("J'ai prié ce soir"));
    expect(onSetTarawih).toHaveBeenCalledWith(todayKey, true);
  });

  it("propose d'annuler quand ce soir est déjà coché", () => {
    const now = new Date(2027, 1, 14, 12);
    const { season, data, todayKey } = setup(now);
    data.tarawih[getNightKey(season, 8)] = { done: true, updatedAt: 1 };
    const { getByText } = renderCard(now, data);
    fireEvent.press(getByText("Annuler"));
    expect(onSetTarawih).toHaveBeenCalledWith(todayKey, false);
  });

  it("onglet sadaqa : coche aujourd'hui", () => {
    const now = new Date(2027, 1, 14, 12);
    const { getByText, todayKey } = renderCard(now);
    fireEvent.press(getByText("Sadaqa"));
    fireEvent.press(getByText("J'ai donné la sadaqa aujourd'hui"));
    expect(onSetSadaqa).toHaveBeenCalledWith(todayKey, true);
    expect(onSetTarawih).not.toHaveBeenCalled();
  });

  it("une nuit passée est modifiable, une nuit future ne l'est pas", () => {
    const now = new Date(2027, 1, 14, 12);
    const { getByLabelText, season } = renderCard(now);

    fireEvent.press(getByLabelText("Nuit 3"));
    expect(onSetTarawih).toHaveBeenCalledWith(getNightKey(season, 3), true);

    onSetTarawih.mockClear();
    fireEvent.press(getByLabelText("Nuit 20"));
    expect(onSetTarawih).not.toHaveBeenCalled();
  });

  it("sadaqa : un jour passé est modifiable", () => {
    const now = new Date(2027, 1, 14, 12);
    const { getByText, getByLabelText, season } = renderCard(now);
    fireEvent.press(getByText("Sadaqa"));
    fireEvent.press(getByLabelText("Jour 2"));
    expect(onSetSadaqa).toHaveBeenCalledWith(getDayKey(season, 2), true);
  });

  it("la veille du premier jeûne, la nuit 1 se coche ce soir", () => {
    const now = addLocalDays(baseSeason.startDate, -1);
    const { getByText, todayKey } = renderCard(now);
    fireEvent.press(getByText("J'ai prié ce soir"));
    expect(onSetTarawih).toHaveBeenCalledWith(todayKey, true);
  });

  it("affiche le total de nuits cochées", () => {
    const now = new Date(2027, 1, 14, 12);
    const { season, data } = setup(now);
    data.tarawih[getNightKey(season, 1)] = { done: true, updatedAt: 1 };
    data.tarawih[getNightKey(season, 2)] = { done: true, updatedAt: 1 };
    const { getByText } = renderCard(now, data);
    expect(getByText(`2 nuits sur ${season.lengthDays}`)).toBeTruthy();
  });
});

describe("LastTenNightsCard", () => {
  const onSetTarawih = jest.fn();
  beforeEach(() => jest.clearAllMocks());

  function renderCard(now: Date, data?: RamadanData) {
    const { season, data: empty, todayKey } = setup(now);
    const used = data ?? empty;
    return {
      season,
      todayKey,
      ...render(
        <LastTenNightsCard
          season={season}
          data={used}
          todayKey={todayKey}
          worship={computeWorshipStats(used, season)}
          t={t}
          onSetTarawih={onSetTarawih}
        />,
      ),
    };
  }

  // Jour 22 : ce soir commence la nuit 23 (impaire).
  const day22 = addLocalDays(baseSeason.startDate, 21);

  it("signale une nuit impaire ce soir", () => {
    const { getByText } = renderCard(day22);
    expect(getByText(/nuit 23, une nuit impaire/)).toBeTruthy();
  });

  it("signale une nuit paire sans la mettre en avant comme impaire", () => {
    const day23 = addLocalDays(baseSeason.startDate, 22); // ce soir : nuit 24
    const { getByText, queryByText } = renderCard(day23);
    expect(getByText("Cette nuit est la nuit 24 de Ramadan.")).toBeTruthy();
    expect(queryByText(/une nuit impaire/)).toBeNull();
  });

  it("coche une nuit passée, refuse une nuit à venir", () => {
    const { getByLabelText, season } = renderCard(day22);
    fireEvent.press(getByLabelText("Nuit 21, nuit impaire"));
    expect(onSetTarawih).toHaveBeenCalledWith(getNightKey(season, 21), true);

    onSetTarawih.mockClear();
    fireEvent.press(getByLabelText("Nuit 27, nuit impaire"));
    expect(onSetTarawih).not.toHaveBeenCalled();
  });

  it("affiche l'invocation de Laylat al-Qadr et la progression des nuits impaires", () => {
    const { season, data } = setup(day22);
    data.tarawih[getNightKey(season, 21)] = { done: true, updatedAt: 1 };
    const { getByText } = renderCard(day22, data);
    expect(getByText("اللَّهُمَّ إِنَّكَ عُفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي")).toBeTruthy();
    expect(getByText(/1\/5 nuits impaires/)).toBeTruthy();
  });

  it("le soir de l'Aïd, affiche le message de fin de Ramadan", () => {
    const lastFastDay = addLocalDays(baseSeason.startDate, baseSeason.lengthDays - 1);
    const { getByText } = renderCard(lastFastDay);
    expect(getByText("Le Ramadan s'achève. Que Allah accepte vos œuvres.")).toBeTruthy();
  });
});

describe("BadgesCard", () => {
  it("affiche les badges débloqués et la progression des autres", () => {
    const now = new Date(2027, 1, 14, 12);
    const { season, data } = setup(now);
    data.fasting[getDayKey(season, 1)] = { status: "fasted", updatedAt: 1 };
    const stats = computeFastingStats(data, now);
    const badges = computeRamadanBadges(data, season, stats);

    const { getByText, getAllByText } = render(<BadgesCard badges={badges} t={t} />);
    expect(getByText("Premier jeûne")).toBeTruthy();
    expect(getByText("1 badges débloqués sur 10")).toBeTruthy();
    expect(getAllByText("Débloqué ✓")).toHaveLength(1);
    expect(getByText("1 / 7")).toBeTruthy(); // série d'une semaine : 1 jour sur 7
  });
});
