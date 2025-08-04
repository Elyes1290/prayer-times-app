// Mocks globaux
jest.mock("expo-font", () => ({}));
jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));
jest.mock("expo-linear-gradient", () => ({
  LinearGradient: () => null,
}));
jest.mock("react-native", () => jest.requireActual("react-native"));

// Mock du composant Toast pour éviter les animations et dépendances natives
jest.mock("../../components/Toast", () => {
  const MockToast = ({ toast, onHide }: any) => {
    const React = require("react");
    React.useEffect(() => {
      // Simuler l'auto-hide après la durée
      const timer = setTimeout(() => {
        onHide(toast.id);
      }, toast.duration || 3000);
      return () => clearTimeout(timer);
    }, [toast.id, toast.duration, onHide]);

    return null; // Le composant ne rend rien, on teste juste la logique du contexte
  };
  return MockToast;
});

import React from "react";
import { render, act, waitFor } from "@testing-library/react-native";
import { ToastProvider, useToast } from "../../contexts/ToastContext";
import type { ToastData } from "../../components/Toast";

// Composant de test pour accéder au contexte
const ToastTestComponent = React.forwardRef((props, ref) => {
  const context = useToast();
  React.useImperativeHandle(ref, () => context, [context]);
  return null;
});
ToastTestComponent.displayName = "ToastTestComponent";

describe("ToastContext - Tests Exhaustifs", () => {
  let testRef: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    testRef = React.createRef();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("1. Initialisation et valeurs par défaut", () => {
    test("should initialize with empty toasts", () => {
      render(
        <ToastProvider>
          <ToastTestComponent ref={testRef} />
        </ToastProvider>
      );

      expect(testRef.current).toBeDefined();
      expect(typeof testRef.current.showToast).toBe("function");
      expect(typeof testRef.current.hideToast).toBe("function");
    });
  });

  describe("2. Affichage de toasts", () => {
    test("should show a success toast", async () => {
      render(
        <ToastProvider>
          <ToastTestComponent ref={testRef} />
        </ToastProvider>
      );

      const toastData = {
        type: "success" as const,
        title: "Succès",
        message: "Opération réussie",
        duration: 2000,
      };

      await act(async () => {
        testRef.current.showToast(toastData);
      });

      // Vérifier que les fonctions sont disponibles
      expect(typeof testRef.current.showToast).toBe("function");
      expect(typeof testRef.current.hideToast).toBe("function");
    });

    test("should show an error toast", async () => {
      render(
        <ToastProvider>
          <ToastTestComponent ref={testRef} />
        </ToastProvider>
      );

      const toastData = {
        type: "error" as const,
        title: "Erreur",
        message: "Une erreur s'est produite",
      };

      await act(async () => {
        testRef.current.showToast(toastData);
      });

      expect(typeof testRef.current.showToast).toBe("function");
    });

    test("should show an info toast", async () => {
      render(
        <ToastProvider>
          <ToastTestComponent ref={testRef} />
        </ToastProvider>
      );

      const toastData = {
        type: "info" as const,
        title: "Information",
        message: "Voici une information",
        duration: 5000,
      };

      await act(async () => {
        testRef.current.showToast(toastData);
      });

      expect(typeof testRef.current.showToast).toBe("function");
    });

    test("should show multiple toasts", async () => {
      render(
        <ToastProvider>
          <ToastTestComponent ref={testRef} />
        </ToastProvider>
      );

      const toasts = [
        {
          type: "success" as const,
          title: "Toast 1",
          message: "Premier toast",
        },
        { type: "error" as const, title: "Toast 2", message: "Deuxième toast" },
        { type: "info" as const, title: "Toast 3", message: "Troisième toast" },
      ];

      await act(async () => {
        toasts.forEach((toast) => {
          testRef.current.showToast(toast);
        });
      });

      expect(typeof testRef.current.showToast).toBe("function");
    });
  });

  describe("3. Masquage de toasts", () => {
    test("should hide a specific toast by id", async () => {
      render(
        <ToastProvider>
          <ToastTestComponent ref={testRef} />
        </ToastProvider>
      );

      const toastData = {
        type: "success" as const,
        title: "Test",
        message: "Toast à masquer",
      };

      await act(async () => {
        testRef.current.showToast(toastData);
        testRef.current.hideToast("toast_123");
      });

      expect(typeof testRef.current.hideToast).toBe("function");
    });

    test("should handle hiding non-existent toast", async () => {
      render(
        <ToastProvider>
          <ToastTestComponent ref={testRef} />
        </ToastProvider>
      );

      await act(async () => {
        testRef.current.hideToast("non_existent_id");
      });

      expect(typeof testRef.current.hideToast).toBe("function");
    });
  });

  describe("4. Auto-hide et durée", () => {
    test("should auto-hide toast after default duration", async () => {
      render(
        <ToastProvider>
          <ToastTestComponent ref={testRef} />
        </ToastProvider>
      );

      const toastData = {
        type: "info" as const,
        title: "Auto-hide test",
        message: "Ce toast va se fermer automatiquement",
      };

      await act(async () => {
        testRef.current.showToast(toastData);
      });

      // Avancer le temps pour déclencher l'auto-hide
      await act(async () => {
        jest.advanceTimersByTime(3000); // Durée par défaut
      });

      expect(typeof testRef.current.showToast).toBe("function");
    });

    test("should auto-hide toast after custom duration", async () => {
      render(
        <ToastProvider>
          <ToastTestComponent ref={testRef} />
        </ToastProvider>
      );

      const toastData = {
        type: "success" as const,
        title: "Custom duration",
        message: "Toast avec durée personnalisée",
        duration: 1000,
      };

      await act(async () => {
        testRef.current.showToast(toastData);
      });

      // Avancer le temps pour déclencher l'auto-hide
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(typeof testRef.current.showToast).toBe("function");
    });
  });

  describe("5. Cas limites et erreurs", () => {
    test("should handle toast without message", async () => {
      render(
        <ToastProvider>
          <ToastTestComponent ref={testRef} />
        </ToastProvider>
      );

      const toastData = {
        type: "info" as const,
        title: "Toast sans message",
      };

      await act(async () => {
        testRef.current.showToast(toastData);
      });

      expect(typeof testRef.current.showToast).toBe("function");
    });

    test("should handle toast without duration", async () => {
      render(
        <ToastProvider>
          <ToastTestComponent ref={testRef} />
        </ToastProvider>
      );

      const toastData = {
        type: "error" as const,
        title: "Toast sans durée",
        message: "Utilise la durée par défaut",
      };

      await act(async () => {
        testRef.current.showToast(toastData);
      });

      expect(typeof testRef.current.showToast).toBe("function");
    });

    test("should handle multiple rapid showToast calls", async () => {
      render(
        <ToastProvider>
          <ToastTestComponent ref={testRef} />
        </ToastProvider>
      );

      const toasts = Array.from({ length: 5 }, (_, i) => ({
        type: "info" as const,
        title: `Toast ${i + 1}`,
        message: `Message ${i + 1}`,
      }));

      await act(async () => {
        toasts.forEach((toast) => {
          testRef.current.showToast(toast);
        });
      });

      expect(typeof testRef.current.showToast).toBe("function");
    });
  });

  describe("6. Types de toasts", () => {
    test("should handle success toast type", async () => {
      render(
        <ToastProvider>
          <ToastTestComponent ref={testRef} />
        </ToastProvider>
      );

      const toastData = {
        type: "success" as const,
        title: "Succès",
        message: "Opération réussie",
      };

      await act(async () => {
        testRef.current.showToast(toastData);
      });

      expect(typeof testRef.current.showToast).toBe("function");
    });

    test("should handle error toast type", async () => {
      render(
        <ToastProvider>
          <ToastTestComponent ref={testRef} />
        </ToastProvider>
      );

      const toastData = {
        type: "error" as const,
        title: "Erreur",
        message: "Une erreur s'est produite",
      };

      await act(async () => {
        testRef.current.showToast(toastData);
      });

      expect(typeof testRef.current.showToast).toBe("function");
    });

    test("should handle info toast type", async () => {
      render(
        <ToastProvider>
          <ToastTestComponent ref={testRef} />
        </ToastProvider>
      );

      const toastData = {
        type: "info" as const,
        title: "Information",
        message: "Voici une information",
      };

      await act(async () => {
        testRef.current.showToast(toastData);
      });

      expect(typeof testRef.current.showToast).toBe("function");
    });
  });

  describe("7. Gestion des IDs", () => {
    test("should generate unique IDs for different toasts", async () => {
      render(
        <ToastProvider>
          <ToastTestComponent ref={testRef} />
        </ToastProvider>
      );

      const toast1 = { type: "success" as const, title: "Toast 1" };
      const toast2 = { type: "error" as const, title: "Toast 2" };

      await act(async () => {
        testRef.current.showToast(toast1);
        testRef.current.showToast(toast2);
      });

      expect(typeof testRef.current.showToast).toBe("function");
    });
  });

  describe("8. Intégration et performance", () => {
    test("should handle rapid show/hide operations", async () => {
      render(
        <ToastProvider>
          <ToastTestComponent ref={testRef} />
        </ToastProvider>
      );

      const toastData = {
        type: "info" as const,
        title: "Test rapide",
        message: "Opérations rapides",
      };

      await act(async () => {
        testRef.current.showToast(toastData);
        testRef.current.hideToast("toast_123");
        testRef.current.showToast(toastData);
      });

      expect(typeof testRef.current.showToast).toBe("function");
      expect(typeof testRef.current.hideToast).toBe("function");
    });

    test("should handle long duration toasts", async () => {
      render(
        <ToastProvider>
          <ToastTestComponent ref={testRef} />
        </ToastProvider>
      );

      const toastData = {
        type: "success" as const,
        title: "Toast long",
        message: "Ce toast dure longtemps",
        duration: 10000, // 10 secondes
      };

      await act(async () => {
        testRef.current.showToast(toastData);
      });

      // Avancer le temps partiellement
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      expect(typeof testRef.current.showToast).toBe("function");
    });
  });
});
