import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import ChangePasswordModal from "../../../components/settings/ChangePasswordModal";

// Mock des dépendances
jest.mock("../../../locales/i18n", () => ({}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: { [key: string]: string } = {
        "password.change_password": "Changer le mot de passe",
        "password.current_password": "Mot de passe actuel",
        "password.current_password_placeholder": "Saisissez votre mot de passe actuel",
        "password.new_password": "Nouveau mot de passe",
        "password.new_password_placeholder": "Saisissez votre nouveau mot de passe",
        "password.confirm_password": "Confirmer le mot de passe",
        "password.confirm_password_placeholder": "Confirmez votre nouveau mot de passe",
        "password.save": "Enregistrer",
        "password.cancel": "Annuler",
        "password.password_strength": "Force",
        "password.password_strength_weak": "Faible",
        "password.password_strength_medium": "Moyen",
        "password.password_strength_good": "Bon",
        "password.password_strength_excellent": "Excellent",
        "password.password_min_length_8": "Au moins 8 caractères",
        "password.password_uppercase": "Au moins une majuscule",
        "password.password_lowercase": "Au moins une minuscule",
        "password.password_number": "Au moins un chiffre",
        "password.password_special_char": "Au moins un caractère spécial",
        "password.password_mismatch": "Les mots de passe ne correspondent pas",
        "password.password_changed_success": "Mot de passe modifié avec succès",
      };
      return translations[key] || key;
    },
  }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: "MaterialCommunityIcons",
}));

jest.mock("../../../utils/apiClient", () => ({
  __esModule: true,
  default: {
    changePassword: jest.fn(),
  },
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock("../../../contexts/SettingsContext", () => ({
  useSettings: () => ({
    currentTheme: "light",
    userFirstName: "Test User",
    setUserFirstName: jest.fn(),
  }),
}));

jest.mock("../../../contexts/PremiumContext", () => ({
  usePremium: () => ({
    user: {
      id: 1,
      email: "test@example.com",
      premium_status: 1,
    },
    isPremium: true,
    activatePremium: jest.fn(),
    deactivatePremium: jest.fn(),
  }),
}));

jest.mock("../../../contexts/ToastContext", () => ({
  useToast: () => ({
    showToast: jest.fn(),
    hideToast: jest.fn(),
  }),
}));

describe("ChangePasswordModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    require("@react-native-async-storage/async-storage").getItem.mockResolvedValue(
      JSON.stringify({ email: "test@example.com" })
    );
  });

  it("should render correctly when visible", () => {
    const { getByText, getByPlaceholderText } = render(
      <ChangePasswordModal visible={true} onClose={jest.fn()} />
    );

    expect(getByText("Changer le mot de passe")).toBeTruthy();
    expect(
      getByPlaceholderText("Saisissez votre mot de passe actuel")
    ).toBeTruthy();
    expect(
      getByPlaceholderText("Saisissez votre nouveau mot de passe")
    ).toBeTruthy();
    expect(
      getByPlaceholderText("Confirmez votre nouveau mot de passe")
    ).toBeTruthy();
  });

  it("should not render when not visible", () => {
    const { queryByText } = render(
      <ChangePasswordModal visible={false} onClose={jest.fn()} />
    );

    expect(queryByText("Changer le mot de passe")).toBeNull();
  });

  it("should show password strength indicator", () => {
    const { getByPlaceholderText, getByText } = render(
      <ChangePasswordModal visible={true} onClose={jest.fn()} />
    );

    const newPasswordInput = getByPlaceholderText(
      "Saisissez votre nouveau mot de passe"
    );
    fireEvent.changeText(newPasswordInput, "weak");

    expect(getByText("Force : Faible")).toBeTruthy();
  });

  it("should show password requirements", () => {
    const { getByPlaceholderText, getByText } = render(
      <ChangePasswordModal visible={true} onClose={jest.fn()} />
    );

    const newPasswordInput = getByPlaceholderText(
      "Saisissez votre nouveau mot de passe"
    );
    fireEvent.changeText(newPasswordInput, "test");

    expect(getByText("Au moins 8 caractères")).toBeTruthy();
    expect(getByText("Au moins une majuscule")).toBeTruthy();
    expect(getByText("Au moins un chiffre")).toBeTruthy();
    expect(getByText("Au moins un caractère spécial")).toBeTruthy();
  });

  it("should validate password confirmation", () => {
    const { getByPlaceholderText, getByText } = render(
      <ChangePasswordModal visible={true} onClose={jest.fn()} />
    );

    const newPasswordInput = getByPlaceholderText(
      "Saisissez votre nouveau mot de passe"
    );
    const confirmPasswordInput = getByPlaceholderText(
      "Confirmez votre nouveau mot de passe"
    );

    fireEvent.changeText(newPasswordInput, "NewPassword123");
    fireEvent.changeText(confirmPasswordInput, "DifferentPassword123");

    expect(getByText("Les mots de passe ne correspondent pas")).toBeTruthy();
  });
});
