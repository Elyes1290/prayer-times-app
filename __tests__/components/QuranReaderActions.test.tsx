import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { QuranReaderActions } from "../../components/quran/QuranReaderActions";
import { QuranVerseListItem } from "../../components/quran/QuranListItems";

jest.mock("@/components/icons/AppVectorIcons", () => ({
  MCIcon: () => null,
}));
jest.mock("@/components/FavoriteButton", () => () => null);
jest.mock("expo-image", () => ({ Image: () => null }));

describe("QuranReaderActions", () => {
  const baseProps = {
    displayMode: "full" as const,
    hasBookmark: false,
    onToggleDisplayMode: jest.fn(),
    onOpenFullscreen: jest.fn(),
    onResumeBookmark: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it("affiche le mode d'affichage et le plein écran, sans marque-page par défaut", () => {
    render(<QuranReaderActions {...baseProps} />);
    expect(screen.getByLabelText("quran_show_arabic_only")).toBeTruthy();
    expect(screen.getByLabelText("quran_fullscreen")).toBeTruthy();
    expect(screen.queryByLabelText("quran_resume_bookmark")).toBeNull();
  });

  it("déclenche les actions", () => {
    render(<QuranReaderActions {...baseProps} hasBookmark />);
    fireEvent.press(screen.getByLabelText("quran_resume_bookmark"));
    fireEvent.press(screen.getByLabelText("quran_show_arabic_only"));
    fireEvent.press(screen.getByLabelText("quran_fullscreen"));
    expect(baseProps.onResumeBookmark).toHaveBeenCalledTimes(1);
    expect(baseProps.onToggleDisplayMode).toHaveBeenCalledTimes(1);
    expect(baseProps.onOpenFullscreen).toHaveBeenCalledTimes(1);
  });

  it("en mode arabe seul, le bouton propose de réafficher la traduction", () => {
    render(<QuranReaderActions {...baseProps} displayMode="arabic" />);
    expect(screen.getByLabelText("quran_show_translation")).toBeTruthy();
  });

  it("n'affiche les flèches de sourate que si les deux callbacks sont fournis", () => {
    const { rerender } = render(<QuranReaderActions {...baseProps} />);
    expect(screen.queryByLabelText("quran_next_surah")).toBeNull();

    const onPrevious = jest.fn();
    const onNext = jest.fn();
    rerender(
      <QuranReaderActions {...baseProps} onPreviousSurah={onPrevious} onNextSurah={onNext} />,
    );
    fireEvent.press(screen.getByLabelText("quran_previous_surah"));
    fireEvent.press(screen.getByLabelText("quran_next_surah"));
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("désactive la flèche précédente sur la première sourate", () => {
    const onPrevious = jest.fn();
    render(
      <QuranReaderActions
        {...baseProps}
        onPreviousSurah={onPrevious}
        onNextSurah={jest.fn()}
        canGoPrevious={false}
      />,
    );
    fireEvent.press(screen.getByLabelText("quran_previous_surah"));
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it("en plein écran (sans onOpenFullscreen), le bouton plein écran est absent", () => {
    render(
      <QuranReaderActions
        displayMode="full"
        hasBookmark={false}
        onToggleDisplayMode={jest.fn()}
      />,
    );
    expect(screen.queryByLabelText("quran_fullscreen")).toBeNull();
  });
});

describe("QuranVerseListItem — marque-page", () => {
  const favoriteData = {} as never;
  const base = {
    arabicText: "ٱلْحَمْدُ",
    verseNumber: "1",
    phoneticText: "",
    translationText: "",
    favoriteData,
    showTranslation: false,
    showSeparator: false,
    styles: {},
  };

  it("n'affiche pas de bouton marque-page sans callback", () => {
    render(<QuranVerseListItem {...base} verseKey="1:1" />);
    expect(screen.queryByLabelText("quran_bookmark")).toBeNull();
  });

  it("transmet la clé du verset au callback", () => {
    const onToggle = jest.fn();
    render(<QuranVerseListItem {...base} verseKey="1:1" onToggleBookmark={onToggle} />);
    fireEvent.press(screen.getByLabelText("quran_bookmark"));
    expect(onToggle).toHaveBeenCalledWith("1:1");
  });
});
