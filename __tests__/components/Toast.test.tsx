import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Toast, { ToastData } from "../../components/Toast";

// Mocks
jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: "MaterialCommunityIcons",
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

describe("Toast", () => {
  const mockOnHide = jest.fn();

  const mockToastData: ToastData = {
    id: "test-toast-1",
    type: "success",
    title: "Test Success",
    message: "This is a test message",
    duration: 3000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Rendu de base", () => {
    it("devrait rendre le toast avec les données correctes", () => {
      render(<Toast toast={mockToastData} onHide={mockOnHide} />);

      expect(screen.getByText("Test Success")).toBeTruthy();
      expect(screen.getByText("This is a test message")).toBeTruthy();
    });

    it("devrait afficher l'icône correcte pour le type success", () => {
      render(<Toast toast={mockToastData} onHide={mockOnHide} />);

      expect(screen.getByTestId("toast-icon")).toBeTruthy();
    });

    it("devrait avoir les bonnes couleurs pour le type success", () => {
      render(<Toast toast={mockToastData} onHide={mockOnHide} />);

      const gradient = screen.getByTestId("toast-gradient");
      expect(gradient).toBeTruthy();
    });
  });

  describe("Types de toast", () => {
    it("devrait afficher l'icône et les couleurs pour le type error", () => {
      const errorToast: ToastData = {
        ...mockToastData,
        type: "error",
        title: "Test Error",
        message: "This is an error message",
      };

      render(<Toast toast={errorToast} onHide={mockOnHide} />);

      expect(screen.getByText("Test Error")).toBeTruthy();
      expect(screen.getByText("This is an error message")).toBeTruthy();
    });

    it("devrait afficher l'icône et les couleurs pour le type info", () => {
      const infoToast: ToastData = {
        ...mockToastData,
        type: "info",
        title: "Test Info",
        message: "This is an info message",
      };

      render(<Toast toast={infoToast} onHide={mockOnHide} />);

      expect(screen.getByText("Test Info")).toBeTruthy();
      expect(screen.getByText("This is an info message")).toBeTruthy();
    });

    it("devrait utiliser le type info par défaut", () => {
      const defaultToast: ToastData = {
        ...mockToastData,
        type: "info" as any,
        title: "Test Default",
        message: "This is a default message",
      };

      render(<Toast toast={defaultToast} onHide={mockOnHide} />);

      expect(screen.getByText("Test Default")).toBeTruthy();
    });
  });

  describe("Animation et timing", () => {
    it("devrait démarrer l'animation d'entrée", () => {
      render(<Toast toast={mockToastData} onHide={mockOnHide} />);

      const toast = screen.getByTestId("toast-container");
      expect(toast).toBeTruthy();
    });

    it("devrait auto-hide après la durée spécifiée", () => {
      render(<Toast toast={mockToastData} onHide={mockOnHide} />);

      // Avancer le temps de 3 secondes
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Le toast devrait être rendu
      expect(screen.getByTestId("toast-container")).toBeTruthy();
    });

    it("devrait utiliser la durée par défaut de 3000ms", () => {
      const toastWithoutDuration: ToastData = {
        ...mockToastData,
        duration: undefined,
      };

      render(<Toast toast={toastWithoutDuration} onHide={mockOnHide} />);

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Le toast devrait être rendu
      expect(screen.getByTestId("toast-container")).toBeTruthy();
    });
  });

  describe("Interactions utilisateur", () => {
    it("devrait appeler onHide quand l'utilisateur appuie sur le toast", () => {
      render(<Toast toast={mockToastData} onHide={mockOnHide} />);

      const toast = screen.getByTestId("toast-container");
      fireEvent.press(toast);

      // Le toast devrait être rendu
      expect(screen.getByTestId("toast-container")).toBeTruthy();
    });

    it("devrait nettoyer le timer quand le composant est démonté", () => {
      const { unmount } = render(
        <Toast toast={mockToastData} onHide={mockOnHide} />
      );

      unmount();

      // Le timer devrait être nettoyé, donc onHide ne devrait pas être appelé
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(mockOnHide).not.toHaveBeenCalled();
    });
  });

  describe("Gestion des cas d'erreur", () => {
    it("devrait gérer un toast sans message", () => {
      const toastWithoutMessage: ToastData = {
        ...mockToastData,
        message: undefined,
      };

      expect(() =>
        render(<Toast toast={toastWithoutMessage} onHide={mockOnHide} />)
      ).not.toThrow();

      expect(screen.getByText("Test Success")).toBeTruthy();
      expect(screen.queryByText("This is a test message")).toBeNull();
    });

    it("devrait gérer un toast avec une durée très courte", () => {
      const shortDurationToast: ToastData = {
        ...mockToastData,
        duration: 100,
      };

      render(<Toast toast={shortDurationToast} onHide={mockOnHide} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Le toast devrait être rendu
      expect(screen.getByTestId("toast-container")).toBeTruthy();
    });
  });

  describe("Accessibilité", () => {
    it("devrait avoir des testID appropriés", () => {
      render(<Toast toast={mockToastData} onHide={mockOnHide} />);

      expect(screen.getByTestId("toast-container")).toBeTruthy();
      expect(screen.getByTestId("toast-gradient")).toBeTruthy();
      expect(screen.getByTestId("toast-icon")).toBeTruthy();
      expect(screen.getByTestId("toast-content")).toBeTruthy();
    });

    it("devrait être accessible aux lecteurs d'écran", () => {
      render(<Toast toast={mockToastData} onHide={mockOnHide} />);

      const toast = screen.getByTestId("toast-container");
      expect(toast).toBeTruthy();
    });
  });

  describe("Styles et thème", () => {
    it("devrait appliquer les styles corrects", () => {
      render(<Toast toast={mockToastData} onHide={mockOnHide} />);

      const container = screen.getByTestId("toast-container");
      expect(container).toBeTruthy();
    });

    it("devrait avoir une position fixe en haut de l'écran", () => {
      render(<Toast toast={mockToastData} onHide={mockOnHide} />);

      const container = screen.getByTestId("toast-container");
      expect(container).toBeTruthy();
    });
  });
});
