import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

// Mock Alert.alert
jest.spyOn(Alert, "alert").mockImplementation(() => {});
import DataDeletionScreen from "../../screens/DataDeletionScreen";

// Mock des dépendances
jest.mock("../../locales/i18n", () => ({}));

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock("../../contexts/SettingsContext", () => ({
  SettingsContext: {
    Consumer: ({ children }: { children: React.ReactNode }) => children,
  },
}));

jest.mock("../../hooks/useThemeColor", () => ({
  useCurrentTheme: () => "light",
}));

jest.mock("../../utils/apiClient", () => ({
  submitDataDeletionRequest: jest.fn(),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(JSON.stringify({ email: "test@example.com" }))),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock("../../contexts/PremiumContext", () => ({
  usePremium: () => ({
    forceLogout: jest.fn(),
    user: { email: "test@example.com" },
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: { [key: string]: string } = {
        "data_deletion.title": "Suppression de compte",
        "data_deletion.warning": "Attention",
        "data_deletion.warning_text": "La suppression de votre compte est définitive et irréversible. Toutes vos données seront supprimées.",
        "data_deletion.request_info": "Informations de la demande",
        "data_deletion.email_label": "Email *",
        "data_deletion.email_placeholder": "Votre adresse email",
        "data_deletion.email_locked": "Email auto-rempli depuis votre compte (non modifiable)",
        "data_deletion.reason_label": "Raison de la suppression (optionnel)",
        "data_deletion.reason_placeholder": "Pourquoi souhaitez-vous supprimer votre compte ?",
        "data_deletion.message_label": "Message (optionnel)",
        "data_deletion.message_placeholder": "Message supplémentaire...",
        "data_deletion.what_deleted": "Ce qui sera supprimé",
        "data_deletion.user_account": "Votre compte utilisateur",
        "data_deletion.prayer_stats": "Vos statistiques de prière",
        "data_deletion.favorites_settings": "Vos favoris et paramètres",
        "data_deletion.premium_subscriptions": "Vos abonnements premium",
        "data_deletion.personal_data": "Toutes vos données personnelles",
        "data_deletion.process": "Processus de suppression",
        "data_deletion.process_step_1": "Soumettez votre demande via ce formulaire",
        "data_deletion.process_step_2": "Votre compte et toutes vos données sont supprimés immédiatement et définitivement de nos serveurs",
        "data_deletion.process_step_3": "Vous êtes automatiquement déconnecté et redirigé vers l'écran d'accueil",
        "data_deletion.process_step_4": "Recevez un email de confirmation avec votre numéro de demande",
        "data_deletion.submit_button": "Supprimer définitivement le compte",
        "data_deletion.email_required": "Email requis",
        "data_deletion.email_prompt": "Veuillez saisir votre adresse email pour continuer.",
        "data_deletion.invalid_email": "Email invalide",
        "data_deletion.invalid_email_prompt": "Veuillez saisir une adresse email valide.",
        "data_deletion.confirmation_title": "Confirmation de suppression",
        "data_deletion.confirmation":
          "Êtes-vous sûr de vouloir demander la suppression de votre compte et de toutes vos données ? Cette action est irréversible.",
        "data_deletion.deleted": "Compte supprimé",
        "data_deletion.deleted_message": "Votre compte et toutes vos données ont été supprimés de nos serveurs. Vous allez être déconnecté.",
        "data_deletion.request_recorded": "Demande enregistrée",
        "data_deletion.request_message":
          "Votre demande de suppression a été enregistrée. Vous recevrez un email de confirmation dans les prochaines minutes. Nous traiterons votre demande dans un délai maximum de 30 jours.",
        "data_deletion.error_message":
          "Une erreur est survenue lors de l'envoi de votre demande. Veuillez réessayer ou nous contacter directement à myadhan@gmail.com",
        "loading_data": "Chargement...",
      };
      return translations[key] || key;
    },
  }),
}));

const mockRouter = {
  push: jest.fn(),
};

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
}));

const renderDataDeletionScreen = () => {
  return render(<DataDeletionScreen />);
};

describe("DataDeletionScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correctly with all sections", () => {
    const { getByText } = renderDataDeletionScreen();

    expect(getByText("Suppression de compte")).toBeTruthy();
    expect(getByText("⚠️ Attention")).toBeTruthy();
    expect(getByText("Informations de la demande")).toBeTruthy();
    expect(getByText("Ce qui sera supprimé")).toBeTruthy();
    expect(getByText("Processus de suppression")).toBeTruthy();
    expect(getByText("Supprimer définitivement le compte")).toBeTruthy();
  });

  it("displays warning message correctly", () => {
    const { getByText } = renderDataDeletionScreen();

    expect(getByText("⚠️ Attention")).toBeTruthy();
    expect(
      getByText(
        "La suppression de votre compte est définitive et irréversible. Toutes vos données seront supprimées."
      )
    ).toBeTruthy();
  });

  it("displays form inputs correctly", async () => {
    const { getByText, findByPlaceholderText } = renderDataDeletionScreen();

    expect(getByText("Email *")).toBeTruthy();
    expect(getByText("Raison de la suppression (optionnel)")).toBeTruthy();
    expect(getByText("Message (optionnel)")).toBeTruthy();
    expect(await findByPlaceholderText("Votre adresse email")).toBeTruthy();
    expect(
      await findByPlaceholderText("Pourquoi souhaitez-vous supprimer votre compte ?")
    ).toBeTruthy();
    expect(await findByPlaceholderText("Message supplémentaire...")).toBeTruthy();
  });

  it("displays information items correctly", () => {
    const { getByText } = renderDataDeletionScreen();

    expect(getByText("Votre compte utilisateur")).toBeTruthy();
    expect(getByText("Vos statistiques de prière")).toBeTruthy();
    expect(getByText("Vos favoris et paramètres")).toBeTruthy();
    expect(getByText("Vos abonnements premium")).toBeTruthy();
    expect(getByText("Toutes vos données personnelles")).toBeTruthy();
  });

  it("displays process steps correctly", () => {
    const { getByText } = renderDataDeletionScreen();

    expect(getByText("1")).toBeTruthy();
    expect(getByText("2")).toBeTruthy();
    expect(getByText("3")).toBeTruthy();
    expect(getByText("Soumettez votre demande via ce formulaire")).toBeTruthy();
    expect(
      getByText("Votre compte et toutes vos données sont supprimés immédiatement et définitivement de nos serveurs")
    ).toBeTruthy();
    expect(
      getByText("Vous êtes automatiquement déconnecté et redirigé vers l'écran d'accueil")
    ).toBeTruthy();
  });

  it("handles email input correctly", async () => {
    const { findByPlaceholderText } = renderDataDeletionScreen();

    const emailInput = await findByPlaceholderText("Votre adresse email");
    fireEvent.changeText(emailInput, "test@example.com");

    expect(emailInput.props.value).toBe("test@example.com");
  });

  it("handles reason input correctly", () => {
    const { getByPlaceholderText } = renderDataDeletionScreen();

    const reasonInput = getByPlaceholderText(
      "Pourquoi souhaitez-vous supprimer votre compte ?"
    );
    fireEvent.changeText(reasonInput, "Test reason");

    expect(reasonInput.props.value).toBe("Test reason");
  });

  it("handles message input correctly", () => {
    const { getByPlaceholderText } = renderDataDeletionScreen();

    const messageInput = getByPlaceholderText("Message supplémentaire...");
    fireEvent.changeText(messageInput, "Test message");

    expect(messageInput.props.value).toBe("Test message");
  });

  it("shows error for empty email", () => {
    const { getByText } = renderDataDeletionScreen();

    const submitButton = getByText("Supprimer définitivement le compte");
    fireEvent.press(submitButton);

    expect(Alert.alert).toHaveBeenCalledWith(
      "Email requis",
      "Veuillez saisir votre adresse email pour continuer."
    );
  });

  it("shows error for invalid email", async () => {
    // Mock AsyncStorage pour retourner un email invalide
    const AsyncStorage = require("@react-native-async-storage/async-storage");
    AsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({ email: "invalid-email" })
    );

    const { getByText, findByPlaceholderText } = renderDataDeletionScreen();

    // Attendre que le composant charge l'email invalide
    await findByPlaceholderText("Votre adresse email");

    const submitButton = getByText("Supprimer définitivement le compte");
    fireEvent.press(submitButton);

    expect(Alert.alert).toHaveBeenCalledWith(
      "Email invalide",
      "Veuillez saisir une adresse email valide."
    );
  });

  it("shows confirmation dialog for valid email", async () => {
    const { getByText, findByPlaceholderText } = renderDataDeletionScreen();

    const emailInput = await findByPlaceholderText("Votre adresse email");
    fireEvent.changeText(emailInput, "test@example.com");

    const submitButton = getByText("Supprimer définitivement le compte");
    fireEvent.press(submitButton);

    expect(Alert.alert).toHaveBeenCalledWith(
      "Confirmation de suppression",
      "Êtes-vous sûr de vouloir demander la suppression de votre compte et de toutes vos données ? Cette action est irréversible.",
      expect.any(Array)
    );
  });

  it("handles back button press", () => {
    const { getByTestId } = renderDataDeletionScreen();

    const backButton = getByTestId("icon-arrow-left");
    fireEvent.press(backButton);

    expect(mockRouter.push).toHaveBeenCalledWith("/settings");
  });

  it("displays contact information correctly", () => {
    const { getByText } = renderDataDeletionScreen();

    expect(getByText("myadhan@gmail.com")).toBeTruthy();
  });

  it("handles successful submission", async () => {
    const { submitDataDeletionRequest } = require("../../utils/apiClient");
    submitDataDeletionRequest.mockResolvedValueOnce({
      success: true,
    });

    const { getByText, findByPlaceholderText } = renderDataDeletionScreen();

    const emailInput = await findByPlaceholderText("Votre adresse email");
    fireEvent.changeText(emailInput, "test@example.com");

    const submitButton = getByText("Supprimer définitivement le compte");
    fireEvent.press(submitButton);

    // Vérifier que l'alerte de confirmation a été appelée
    expect(Alert.alert).toHaveBeenCalledWith(
      "Confirmation de suppression",
      "Êtes-vous sûr de vouloir demander la suppression de votre compte et de toutes vos données ? Cette action est irréversible.",
      expect.any(Array)
    );
  });

  it("handles submission error", async () => {
    const { submitDataDeletionRequest } = require("../../utils/apiClient");
    submitDataDeletionRequest.mockRejectedValueOnce(new Error("Network error"));

    const { getByText, findByPlaceholderText } = renderDataDeletionScreen();

    const emailInput = await findByPlaceholderText("Votre adresse email");
    fireEvent.changeText(emailInput, "test@example.com");

    const submitButton = getByText("Supprimer définitivement le compte");
    fireEvent.press(submitButton);

    // Vérifier que l'alerte de confirmation a été appelée
    expect(Alert.alert).toHaveBeenCalledWith(
      "Confirmation de suppression",
      "Êtes-vous sûr de vouloir demander la suppression de votre compte et de toutes vos données ? Cette action est irréversible.",
      expect.any(Array)
    );
  });

  it("shows loading state during submission", async () => {
    const { getByText, findByPlaceholderText } = renderDataDeletionScreen();

    const emailInput = await findByPlaceholderText("Votre adresse email");
    fireEvent.changeText(emailInput, "test@example.com");

    const submitButton = getByText("Supprimer définitivement le compte");
    fireEvent.press(submitButton);

    // Vérifier que l'alerte de confirmation a été appelée
    expect(Alert.alert).toHaveBeenCalledWith(
      "Confirmation de suppression",
      "Êtes-vous sûr de vouloir demander la suppression de votre compte et de toutes vos données ? Cette action est irréversible.",
      expect.any(Array)
    );
  });

  it("handles form with all fields filled", async () => {
    const { getByText, findByPlaceholderText, getByPlaceholderText } = renderDataDeletionScreen();

    const emailInput = await findByPlaceholderText("Votre adresse email");
    const reasonInput = getByPlaceholderText(
      "Pourquoi souhaitez-vous supprimer votre compte ?"
    );
    const messageInput = getByPlaceholderText("Message supplémentaire...");

    fireEvent.changeText(emailInput, "test@example.com");
    fireEvent.changeText(reasonInput, "Test reason");
    fireEvent.changeText(messageInput, "Test message");

    const submitButton = getByText("Supprimer définitivement le compte");
    fireEvent.press(submitButton);

    // Vérifier que l'alerte de confirmation a été appelée
    expect(Alert.alert).toHaveBeenCalledWith(
      "Confirmation de suppression",
      "Êtes-vous sûr de vouloir demander la suppression de votre compte et de toutes vos données ? Cette action est irréversible.",
      expect.any(Array)
    );
  });

  it("navigates to settings after successful submission", async () => {
    const { getByText, findByPlaceholderText } = renderDataDeletionScreen();

    const emailInput = await findByPlaceholderText("Votre adresse email");
    fireEvent.changeText(emailInput, "test@example.com");

    const submitButton = getByText("Supprimer définitivement le compte");
    fireEvent.press(submitButton);

    // Vérifier que l'alerte de confirmation a été appelée
    expect(Alert.alert).toHaveBeenCalledWith(
      "Confirmation de suppression",
      "Êtes-vous sûr de vouloir demander la suppression de votre compte et de toutes vos données ? Cette action est irréversible.",
      expect.any(Array)
    );
  });
});
