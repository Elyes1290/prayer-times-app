import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import AboutScreen from "../../screens/AboutScreen";
import { useTranslation } from "react-i18next";
import { Linking, Alert } from "react-native";

jest.mock("../../locales/i18n", () => ({}));

jest.mock("react-i18next", () => ({
  useTranslation: jest.fn(),
}));

jest.mock("../../components/ThemedImageBackground", () => {
  const { View } = require("react-native");
  const MockThemedImageBackground = ({ children, style }: any) => (
    <View style={style}>{children}</View>
  );
  MockThemedImageBackground.displayName = "MockThemedImageBackground";
  return MockThemedImageBackground;
});

jest.spyOn(Linking, "openURL").mockImplementation(() => Promise.resolve());

describe("AboutScreen", () => {
  const mockT = jest.fn((key) => {
    if (key.startsWith("abouts.features."))
      return key.replace("abouts.features.", "Feature: ");
    if (key.startsWith("abouts.")) return key.replace("abouts.", "");
    return key;
  });

  beforeEach(() => {
    (useTranslation as jest.Mock).mockReturnValue({
      t: mockT,
      i18n: { language: "fr" },
    });
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  it("affiche le titre, la description, les features et la FAQ", () => {
    render(<AboutScreen />);
    expect(screen.getByText("title")).toBeTruthy();
    expect(screen.getByText("subtitle")).toBeTruthy();
    expect(screen.getByText("welcome")).toBeTruthy();
    expect(screen.getByText("description")).toBeTruthy();
    expect(screen.getByText("blessing")).toBeTruthy();
    expect(screen.getByText("features_title")).toBeTruthy();
    expect(screen.getByText("features_subtitle")).toBeTruthy();
    expect(screen.getByText("Feature: prayer_times")).toBeTruthy();
    expect(screen.getByText("Feature: qibla_direction")).toBeTruthy();
    expect(screen.getByText("faq_title")).toBeTruthy();
    expect(screen.getByText("faq_location_question")).toBeTruthy();
    expect(screen.getByText("faq_notifications_question")).toBeTruthy();
  });

  it("permet d’ouvrir et fermer une question de la FAQ", () => {
    render(<AboutScreen />);
    const faq = screen.getByText("faq_location_question");
    fireEvent.press(faq.parent.parent); // TouchableOpacity
    expect(screen.getByText("faq_location_answer")).toBeTruthy();
    fireEvent.press(faq.parent.parent);
    expect(screen.queryByText("faq_location_answer")).toBeNull();
  });

  it("bouton suggestion ouvre le mail", () => {
    render(<AboutScreen />);
    const btn = screen.getByText("send_suggestion").parent;
    fireEvent.press(btn);
    expect(Linking.openURL).toHaveBeenCalled();
  });

  it("bouton bug ouvre le mail", () => {
    render(<AboutScreen />);
    const btn = screen.getByText("report_bug").parent;
    fireEvent.press(btn);
    expect(Linking.openURL).toHaveBeenCalled();
  });

  it("bouton note ouvre le market", () => {
    render(<AboutScreen />);
    const btn = screen.getByText("rate_app").parent;
    fireEvent.press(btn);
    expect(Linking.openURL).toHaveBeenCalledWith(
      "market://details?id=com.drogbinho.prayertimesapp2"
    );
  });

  it("bouton politique de confidentialité affiche une alerte", () => {
    render(<AboutScreen />);
    fireEvent.press(screen.getByText("privacy_policy"));
    expect(Alert.alert).toHaveBeenCalled();
  });

  it("affiche les sections développeur, technique et sources", () => {
    render(<AboutScreen />);
    expect(screen.getByText("developer_title")).toBeTruthy();
    expect(screen.getByText("developer_name")).toBeTruthy();
    expect(screen.getByText("developer_bio")).toBeTruthy();
    expect(screen.getByText("technical_title")).toBeTruthy();
    expect(screen.getByText("tech_react_native")).toBeTruthy();
    expect(screen.getByText("tech_adhan_lib")).toBeTruthy();
    expect(screen.getByText("tech_expo")).toBeTruthy();
    expect(screen.getByText("tech_permissions")).toBeTruthy();
    expect(screen.getByText("sources_title")).toBeTruthy();
    expect(screen.getByText("source_quran")).toBeTruthy();
    expect(screen.getByText("source_hadith")).toBeTruthy();
    expect(screen.getByText("source_prayer_calculation")).toBeTruthy();
  });
});
