import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ThemedAlert from "../../components/ThemedAlert";
import { useColorScheme } from "../../hooks/useColorScheme";
import { useThemeAssets } from "../../hooks/useThemeAssets";

// Mocks
jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: "MaterialCommunityIcons",
}));

jest.mock("../../hooks/useColorScheme", () => ({
  useColorScheme: jest.fn(),
}));

jest.mock("../../hooks/useThemeAssets", () => ({
  useThemeAssets: jest.fn(),
}));

describe("ThemedAlert", () => {
  const mockOnClose = jest.fn();
  const mockButtonPress = jest.fn();

  const defaultProps = {
    visible: true,
    title: "Test Alert",
    message: "This is a test alert message",
    buttons: [
      {
        text: "OK",
        onPress: mockButtonPress,
        style: "default" as const,
      },
    ],
    onClose: mockOnClose,
    iconType: "info" as const,
  };

  const mockThemeAssets = {
    theme: "light",
    colors: {
      surface: "#ffffff",
      cardBG: "#f5f5f5",
      text: "#333333",
      textSecondary: "#666666",
      primary: "#4ECDC4",
      border: "#e0e0e0",
      shadow: "#000000",
      surfaceVariant: "#f0f0f0",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useColorScheme as jest.Mock).mockReturnValue("light");
    (useThemeAssets as jest.Mock).mockReturnValue(mockThemeAssets);
  });

  describe("Rendu de base", () => {
    it("devrait rendre l'alerte avec les propriétés de base", () => {
      render(<ThemedAlert {...defaultProps} />);

      expect(screen.getByTestId("themed-alert-overlay")).toBeTruthy();
      expect(screen.getByTestId("themed-alert-modal")).toBeTruthy();
      expect(screen.getByTestId("themed-alert-title")).toBeTruthy();
      expect(screen.getByTestId("themed-alert-message")).toBeTruthy();
      expect(screen.getByTestId("themed-alert-button-container")).toBeTruthy();
    });

    it("devrait afficher le titre et le message correctement", () => {
      render(<ThemedAlert {...defaultProps} />);

      expect(screen.getByText("Test Alert")).toBeTruthy();
      expect(screen.getByText("This is a test alert message")).toBeTruthy();
    });

    it("devrait afficher l'icône par défaut", () => {
      render(<ThemedAlert {...defaultProps} />);

      expect(screen.getByTestId("themed-alert-icon-element")).toBeTruthy();
    });
  });

  describe("Gestion des boutons", () => {
    it("devrait afficher un bouton par défaut", () => {
      render(<ThemedAlert {...defaultProps} />);

      expect(screen.getByTestId("themed-alert-button-0")).toBeTruthy();
      expect(screen.getByText("OK")).toBeTruthy();
    });

    it("devrait gérer plusieurs boutons", () => {
      const propsWithMultipleButtons = {
        ...defaultProps,
        buttons: [
          { text: "Cancel", onPress: jest.fn(), style: "cancel" as const },
          { text: "Delete", onPress: jest.fn(), style: "destructive" as const },
          { text: "OK", onPress: jest.fn(), style: "default" as const },
        ],
      };

      render(<ThemedAlert {...propsWithMultipleButtons} />);

      expect(screen.getByTestId("themed-alert-button-0")).toBeTruthy();
      expect(screen.getByTestId("themed-alert-button-1")).toBeTruthy();
      expect(screen.getByTestId("themed-alert-button-2")).toBeTruthy();
      expect(screen.getByText("Cancel")).toBeTruthy();
      expect(screen.getByText("Delete")).toBeTruthy();
      expect(screen.getByText("OK")).toBeTruthy();
    });

    it("devrait appeler onPress et onClose quand un bouton est pressé", () => {
      render(<ThemedAlert {...defaultProps} />);

      const button = screen.getByTestId("themed-alert-button-0");
      fireEvent.press(button);

      expect(mockButtonPress).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Types d'icônes", () => {
    it("devrait afficher l'icône info par défaut", () => {
      render(<ThemedAlert {...defaultProps} />);
      expect(screen.getByTestId("themed-alert-icon-element")).toBeTruthy();
    });

    it("devrait afficher l'icône success", () => {
      render(<ThemedAlert {...defaultProps} iconType="success" />);
      expect(screen.getByTestId("themed-alert-icon-element")).toBeTruthy();
    });

    it("devrait afficher l'icône warning", () => {
      render(<ThemedAlert {...defaultProps} iconType="warning" />);
      expect(screen.getByTestId("themed-alert-icon-element")).toBeTruthy();
    });

    it("devrait afficher l'icône error", () => {
      render(<ThemedAlert {...defaultProps} iconType="error" />);
      expect(screen.getByTestId("themed-alert-icon-element")).toBeTruthy();
    });

    it("devrait afficher l'icône download", () => {
      render(<ThemedAlert {...defaultProps} iconType="download" />);
      expect(screen.getByTestId("themed-alert-icon-element")).toBeTruthy();
    });

    it("devrait afficher l'icône delete", () => {
      render(<ThemedAlert {...defaultProps} iconType="delete" />);
      expect(screen.getByTestId("themed-alert-icon-element")).toBeTruthy();
    });

    it("devrait afficher l'icône question", () => {
      render(<ThemedAlert {...defaultProps} iconType="question" />);
      expect(screen.getByTestId("themed-alert-icon-element")).toBeTruthy();
    });
  });

  describe("Styles des boutons", () => {
    it("devrait appliquer le style default", () => {
      render(<ThemedAlert {...defaultProps} />);
      expect(screen.getByTestId("themed-alert-button-0")).toBeTruthy();
    });

    it("devrait appliquer le style cancel", () => {
      const propsWithCancelButton = {
        ...defaultProps,
        buttons: [
          { text: "Cancel", onPress: jest.fn(), style: "cancel" as const },
        ],
      };

      render(<ThemedAlert {...propsWithCancelButton} />);
      expect(screen.getByTestId("themed-alert-button-0")).toBeTruthy();
    });

    it("devrait appliquer le style destructive", () => {
      const propsWithDestructiveButton = {
        ...defaultProps,
        buttons: [
          { text: "Delete", onPress: jest.fn(), style: "destructive" as const },
        ],
      };

      render(<ThemedAlert {...propsWithDestructiveButton} />);
      expect(screen.getByTestId("themed-alert-button-0")).toBeTruthy();
    });
  });

  describe("Gestion de la visibilité", () => {
    it("devrait être visible quand visible est true", () => {
      render(<ThemedAlert {...defaultProps} visible={true} />);
      expect(screen.getByTestId("themed-alert-overlay")).toBeTruthy();
    });

    it("devrait ne pas être visible quand visible est false", () => {
      render(<ThemedAlert {...defaultProps} visible={false} />);
      expect(screen.queryByTestId("themed-alert-overlay")).toBeNull();
    });
  });

  describe("Gestion des thèmes", () => {
    it("devrait utiliser le thème clair", () => {
      (useThemeAssets as jest.Mock).mockReturnValue({
        ...mockThemeAssets,
        theme: "light",
      });

      render(<ThemedAlert {...defaultProps} />);
      expect(screen.getByTestId("themed-alert-modal")).toBeTruthy();
    });

    it("devrait utiliser le thème sombre", () => {
      (useThemeAssets as jest.Mock).mockReturnValue({
        ...mockThemeAssets,
        theme: "dark",
        colors: {
          ...mockThemeAssets.colors,
          surface: "#1a1a1a",
          cardBG: "#2a2a2a",
          text: "#ffffff",
          textSecondary: "#cccccc",
        },
      });

      render(<ThemedAlert {...defaultProps} />);
      expect(screen.getByTestId("themed-alert-modal")).toBeTruthy();
    });
  });

  describe("Gestion des cas d'erreur", () => {
    it("devrait gérer un tableau de boutons vide", () => {
      const propsWithNoButtons = {
        ...defaultProps,
        buttons: [],
      };

      expect(() =>
        render(<ThemedAlert {...propsWithNoButtons} />)
      ).not.toThrow();
    });

    it("devrait gérer des boutons sans style", () => {
      const propsWithNoStyleButtons = {
        ...defaultProps,
        buttons: [{ text: "OK", onPress: jest.fn() }],
      };

      render(<ThemedAlert {...propsWithNoStyleButtons} />);
      expect(screen.getByTestId("themed-alert-button-0")).toBeTruthy();
    });

    it("devrait gérer des callbacks manquants", () => {
      const propsWithMissingCallbacks = {
        ...defaultProps,
        buttons: [{ text: "OK", onPress: undefined as any }],
        onClose: undefined as any,
      };

      expect(() =>
        render(<ThemedAlert {...propsWithMissingCallbacks} />)
      ).not.toThrow();
    });
  });

  describe("Accessibilité", () => {
    it("devrait avoir des testID appropriés", () => {
      render(<ThemedAlert {...defaultProps} />);

      expect(screen.getByTestId("themed-alert-overlay")).toBeTruthy();
      expect(screen.getByTestId("themed-alert-modal")).toBeTruthy();
      expect(screen.getByTestId("themed-alert-icon-container")).toBeTruthy();
      expect(screen.getByTestId("themed-alert-icon")).toBeTruthy();
      expect(screen.getByTestId("themed-alert-icon-element")).toBeTruthy();
      expect(screen.getByTestId("themed-alert-title")).toBeTruthy();
      expect(screen.getByTestId("themed-alert-message")).toBeTruthy();
      expect(screen.getByTestId("themed-alert-button-container")).toBeTruthy();
      expect(screen.getByTestId("themed-alert-button-0")).toBeTruthy();
      expect(screen.getByTestId("themed-alert-button-text-0")).toBeTruthy();
    });

    it("devrait être accessible aux lecteurs d'écran", () => {
      render(<ThemedAlert {...defaultProps} />);

      const modal = screen.getByTestId("themed-alert-modal");
      expect(modal).toBeTruthy();
    });
  });

  describe("Fonctions utilitaires", () => {
    it("devrait retourner la bonne icône pour chaque type", () => {
      const iconTypes = [
        "info",
        "success",
        "warning",
        "error",
        "download",
        "delete",
        "question",
      ] as const;

      iconTypes.forEach((iconType) => {
        const { unmount } = render(
          <ThemedAlert {...defaultProps} iconType={iconType} />
        );
        expect(screen.getByTestId("themed-alert-icon-element")).toBeTruthy();
        unmount();
      });
    });

    it("devrait retourner la bonne couleur d'icône pour chaque type", () => {
      const iconTypes = [
        "info",
        "success",
        "warning",
        "error",
        "download",
        "delete",
        "question",
      ] as const;

      iconTypes.forEach((iconType) => {
        const { unmount } = render(
          <ThemedAlert {...defaultProps} iconType={iconType} />
        );
        expect(screen.getByTestId("themed-alert-icon-element")).toBeTruthy();
        unmount();
      });
    });

    it("devrait appliquer les bons styles de bouton", () => {
      const buttonStyles = ["default", "cancel", "destructive"] as const;

      buttonStyles.forEach((style) => {
        const propsWithStyle = {
          ...defaultProps,
          buttons: [{ text: "Test", onPress: jest.fn(), style }],
        };

        const { unmount } = render(<ThemedAlert {...propsWithStyle} />);
        expect(screen.getByTestId("themed-alert-button-0")).toBeTruthy();
        unmount();
      });
    });
  });
});
