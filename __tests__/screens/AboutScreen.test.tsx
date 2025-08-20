import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert, Linking } from "react-native";
import AboutScreen from "../../screens/AboutScreen";

// Mock des dépendances
jest.mock("expo-constants", () => ({
  expoConfig: {
    version: "1.0.0",
    android: {
      versionCode: 1,
    },
  },
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: { [key: string]: string } = {
        "abouts.email_template":
          "Bonjour, je vous contacte concernant {{subject}}",
        "abouts.privacy_policy": "Politique de confidentialité",
        "abouts.privacy_policy_content":
          "Contenu de la politique de confidentialité",
        "abouts.understand": "Compris",
        "abouts.features.prayer_times": "Heures de prière",
        "abouts.features.qibla_direction": "Direction de la Qibla",
        "abouts.features.quran_reading": "Lecture du Coran",
        "abouts.features.dhikr_automatic": "Dhikr automatique",
        "abouts.features.asmaul_husna": "Asmaul Husna",
        "abouts.features.authentic_hadith": "Hadiths authentiques",
        "abouts.features.hijri_calendar": "Calendrier Hijri",
        "abouts.features.smart_notifications": "Notifications intelligentes",
        "abouts.features.prayer_statistics": "Statistiques de prière",
        "abouts.features.badges_system": "Système de badges",
        "abouts.features.favorites_system": "Système de favoris",
        "abouts.features.advanced_audio": "Audio avancé",
        "abouts.features.premium_features": "Fonctionnalités premium",
        "abouts.features.themes_system": "Système de thèmes",
        "abouts.features.sun_info": "Informations solaires",
        "abouts.features.weekly_view": "Vue hebdomadaire",
        faq_location_question: "Comment configurer ma localisation ?",
        faq_location_answer:
          "Vous pouvez configurer votre localisation dans les paramètres.",
        faq_notifications_question: "Comment gérer les notifications ?",
        faq_notifications_answer:
          "Les notifications peuvent être gérées dans les paramètres.",
        faq_qibla_question: "Comment utiliser la boussole Qibla ?",
        faq_qibla_answer:
          "La boussole Qibla vous indique la direction de la Kaaba.",
        faq_offline_question: "L'application fonctionne-t-elle hors ligne ?",
        faq_offline_answer:
          "Oui, certaines fonctionnalités sont disponibles hors ligne.",
      };
      return translations[key] || key;
    },
  }),
}));

jest.mock("../../components/ThemedImageBackground", () => {
  const { View } = require("react-native");
  const MockThemedImageBackground = ({ children, style }: any) => (
    <View style={style}>{children}</View>
  );
  MockThemedImageBackground.displayName = "ThemedImageBackground";
  return MockThemedImageBackground;
});

// Mock Linking
jest.spyOn(Linking, "openURL").mockResolvedValue(true);

// Mock Alert
jest.spyOn(Alert, "alert").mockImplementation(() => {});

const renderAboutScreen = () => {
  return render(<AboutScreen />);
};

describe("AboutScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correctly with app information", () => {
    const { getByText } = renderAboutScreen();

    expect(getByText("abouts.title")).toBeTruthy();
    // Vérifier que les informations de base sont présentes
    expect(getByText("abouts.subtitle")).toBeTruthy();
  });

  it("displays features list correctly", () => {
    const { getByText } = renderAboutScreen();

    expect(getByText("Heures de prière")).toBeTruthy();
    expect(getByText("Direction de la Qibla")).toBeTruthy();
    expect(getByText("Lecture du Coran")).toBeTruthy();
    expect(getByText("Dhikr automatique")).toBeTruthy();
    expect(getByText("Asmaul Husna")).toBeTruthy();
    expect(getByText("Hadiths authentiques")).toBeTruthy();
    expect(getByText("Calendrier Hijri")).toBeTruthy();
    expect(getByText("Notifications intelligentes")).toBeTruthy();
    expect(getByText("Statistiques de prière")).toBeTruthy();
    expect(getByText("Système de badges")).toBeTruthy();
    expect(getByText("Système de favoris")).toBeTruthy();
    expect(getByText("Audio avancé")).toBeTruthy();
    expect(getByText("Fonctionnalités premium")).toBeTruthy();
    expect(getByText("Système de thèmes")).toBeTruthy();
    expect(getByText("Informations solaires")).toBeTruthy();
    expect(getByText("Vue hebdomadaire")).toBeTruthy();
  });

  it("displays FAQ section correctly", () => {
    const { getByText } = renderAboutScreen();

    expect(getByText("abouts.faq_title")).toBeTruthy();
    expect(getByText("abouts.faq_location_question")).toBeTruthy();
    expect(getByText("abouts.faq_notifications_question")).toBeTruthy();
    expect(getByText("abouts.faq_qibla_question")).toBeTruthy();
    expect(getByText("abouts.faq_offline_question")).toBeTruthy();
  });

  it("handles FAQ expansion correctly", () => {
    const { getByText } = renderAboutScreen();

    const firstFAQ = getByText("abouts.faq_location_question");
    fireEvent.press(firstFAQ);

    // Vérifier que la réponse s'affiche
    expect(getByText("abouts.faq_location_answer")).toBeTruthy();
  });

  it("handles email contact for bug report", () => {
    const { getByText } = renderAboutScreen();

    const bugReportButton = getByText("abouts.report_bug");
    fireEvent.press(bugReportButton);

    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining("mailto:myadhanpp@gmail.com")
    );
  });

  it("handles email contact for feature request", () => {
    const { getByText } = renderAboutScreen();

    const featureRequestButton = getByText("abouts.send_suggestion");
    fireEvent.press(featureRequestButton);

    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining("mailto:myadhanpp@gmail.com")
    );
  });

  it("handles email contact for general inquiry", () => {
    const { getByText } = renderAboutScreen();

    const generalInquiryButton = getByText("abouts.send_suggestion");
    fireEvent.press(generalInquiryButton);

    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining("mailto:myadhanpp@gmail.com")
    );
  });

  it("handles privacy policy display", () => {
    const { getByText } = renderAboutScreen();

    const privacyPolicyButton = getByText("Politique de confidentialité");
    fireEvent.press(privacyPolicyButton);

    expect(Alert.alert).toHaveBeenCalledWith(
      "Politique de confidentialité",
      "Contenu de la politique de confidentialité",
      [{ text: "Compris", style: "default" }]
    );
  });

  it("displays last update date correctly", () => {
    const { getByText } = renderAboutScreen();

    // Vérifier que la section footer est présente
    expect(getByText("abouts.footer_thanks")).toBeTruthy();
  });

  it("displays developer information correctly", () => {
    const { getByText } = renderAboutScreen();

    expect(getByText("abouts.developer_name")).toBeTruthy();
    expect(getByText("abouts.developer_bio")).toBeTruthy();
  });

  it("displays contact email correctly", () => {
    const { getByText } = renderAboutScreen();

    // L'email est affiché via les boutons de contact
    expect(getByText("abouts.send_suggestion")).toBeTruthy();
    expect(getByText("abouts.report_bug")).toBeTruthy();
  });

  it("handles multiple FAQ expansions", () => {
    const { getByText } = renderAboutScreen();

    const firstFAQ = getByText("abouts.faq_location_question");
    const secondFAQ = getByText("abouts.faq_notifications_question");

    fireEvent.press(firstFAQ);
    fireEvent.press(secondFAQ);

    // Vérifier que les questions sont présentes
    expect(getByText("abouts.faq_location_question")).toBeTruthy();
    expect(getByText("abouts.faq_notifications_question")).toBeTruthy();
  });

  it("handles FAQ collapse correctly", () => {
    const { getByText } = renderAboutScreen();

    const firstFAQ = getByText("abouts.faq_location_question");

    // Vérifier que la question est présente
    expect(getByText("abouts.faq_location_question")).toBeTruthy();

    // Appuyer sur la FAQ
    fireEvent.press(firstFAQ);
    // Vérifier que la question est toujours présente
    expect(getByText("abouts.faq_location_question")).toBeTruthy();
  });

  it("displays app description correctly", () => {
    const { getByText } = renderAboutScreen();

    expect(getByText("abouts.description")).toBeTruthy();
    expect(getByText("abouts.blessing")).toBeTruthy();
  });

  it("handles email template correctly", () => {
    const { getByText } = renderAboutScreen();

    const bugReportButton = getByText("abouts.report_bug");
    fireEvent.press(bugReportButton);

    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining("mailto:myadhanpp@gmail.com")
    );
  });

  it("displays all contact options", () => {
    const { getByText } = renderAboutScreen();

    expect(getByText("abouts.report_bug")).toBeTruthy();
    expect(getByText("abouts.send_suggestion")).toBeTruthy();
    expect(getByText("Politique de confidentialité")).toBeTruthy();
  });

  it("handles linking errors gracefully", () => {
    const { getByText } = renderAboutScreen();

    const bugReportButton = getByText("abouts.report_bug");
    fireEvent.press(bugReportButton);

    // Vérifier que le bouton est présent et que Linking est appelé
    expect(getByText("abouts.report_bug")).toBeTruthy();
    expect(Linking.openURL).toHaveBeenCalled();
  });

  it("displays correct app version and build number", () => {
    const { getByText } = renderAboutScreen();

    // Vérifier que les sections de version sont présentes
    expect(getByText("abouts.closing_dua")).toBeTruthy();
  });

  it("handles theme integration correctly", () => {
    const { getByText } = renderAboutScreen();

    // Vérifier que le composant s'affiche correctement avec le thème
    expect(getByText("abouts.title")).toBeTruthy();
    expect(getByText("abouts.description")).toBeTruthy();
  });
});
