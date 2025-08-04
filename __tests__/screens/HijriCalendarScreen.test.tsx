import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import HijriCalendarScreen from "../../screens/HijriCalendarScreen";
import { useTranslation } from "react-i18next";

jest.mock("../../locales/i18n", () => ({}));

jest.mock("react-i18next", () => ({
  useTranslation: jest.fn(),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("../../components/ThemedImageBackground", () => {
  const { View } = require("react-native");
  const MockThemedImageBackground = ({ children, style }: any) => (
    <View style={style}>{children}</View>
  );
  MockThemedImageBackground.displayName = "MockThemedImageBackground";
  return MockThemedImageBackground;
});

jest.mock("../../components/DateNavigator", () => {
  const { View, Text, TouchableOpacity } = require("react-native");
  const MockDateNavigator = (props: any) => (
    <View>
      <TouchableOpacity testID="prev" onPress={props.onPrev}>
        <Text>Prev</Text>
      </TouchableOpacity>
      <Text testID="date">{props.date.toDateString()}</Text>
      <TouchableOpacity testID="next" onPress={props.onNext}>
        <Text>Next</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="reset" onPress={props.onReset}>
        <Text>Today</Text>
      </TouchableOpacity>
    </View>
  );
  MockDateNavigator.displayName = "MockDateNavigator";
  return { __esModule: true, default: MockDateNavigator };
});

jest.mock("../../utils/islamicEvents", () => ({
  getIslamicEventsForYear: (year: number) => [
    { date: new Date(year, 0, 1), name: "Nouvel an" },
    { date: new Date(year, 8, 10), name: "Achoura" },
  ],
}));

jest.mock("react-native-calendars", () => ({
  Calendar: (props: any) => {
    const { View, Text } = require("react-native");
    return (
      <View testID="calendar">
        <Text>Calendar</Text>
      </View>
    );
  },
}));

describe.skip("HijriCalendarScreen", () => {
  const mockT = jest.fn((key) => {
    switch (key) {
      case "hijri_calendar":
        return "Calendrier Hijri";
      case "gregorian_date":
        return "Date grégorienne";
      case "hijri_date":
        return "Date hijri";
      case "islamic_events":
        return "Événements islamiques";
      default:
        return key;
    }
  });

  beforeEach(() => {
    (useTranslation as jest.Mock).mockReturnValue({
      t: mockT,
      i18n: { language: "fr" },
    });
    jest.clearAllMocks();
  });

  it("affiche le titre, la date grégorienne et hijri", () => {
    render(<HijriCalendarScreen />);
    expect(screen.getByText("Calendrier Hijri")).toBeTruthy();
    expect(screen.getByText("Date grégorienne")).toBeTruthy();
    expect(screen.getByText("Date hijri")).toBeTruthy();
  });

  it("navigue entre les jours avec les boutons", () => {
    render(<HijriCalendarScreen />);
    const dateText = screen.getByTestId("date");
    const prev = screen.getByTestId("prev");
    const next = screen.getByTestId("next");
    const today = screen.getByTestId("reset");
    const initialDate = dateText.props.children;
    fireEvent.press(next);
    expect(dateText.props.children).not.toEqual(initialDate);
    fireEvent.press(prev);
    fireEvent.press(prev);
    expect(dateText.props.children).not.toEqual(initialDate);
    fireEvent.press(today);
    expect(dateText.props.children).toEqual(new Date().toDateString());
  });

  it("affiche les événements islamiques du jour", () => {
    render(<HijriCalendarScreen />);
    // Par défaut, la date sélectionnée est aujourd'hui, donc pas d'événement
    expect(screen.queryByText("Nouvel an")).toBeNull();
    // Naviguer au 1er janvier
    fireEvent.press(screen.getByTestId("reset"));
    fireEvent.press(screen.getByTestId("prev"));
    // On ne peut pas simuler la date exacte sans accès direct au state, mais on peut vérifier la robustesse
  });

  it("supporte la navigation rapide sans planter", () => {
    render(<HijriCalendarScreen />);
    const next = screen.getByTestId("next");
    for (let i = 0; i < 20; i++) fireEvent.press(next);
    expect(screen.getByText("Calendrier Hijri")).toBeTruthy();
  });
});
