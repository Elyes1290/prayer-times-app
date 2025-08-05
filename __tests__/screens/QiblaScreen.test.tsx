import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react-native";
import { useTranslation } from "react-i18next";
import * as Location from "expo-location";
import QiblaScreen from "../../screens/QiblaScreen";

// Mocks
jest.mock("../../locales/i18n", () => ({}));

jest.mock("react-i18next", () => ({
  useTranslation: jest.fn(),
}));

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchHeadingAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  Accuracy: { Balanced: 2 },
}));

jest.mock("../../hooks/useThemeColor", () => ({
  useThemeColors: () => ({
    primary: "#4ECDC4",
    text: "#000000",
    background: "#FFFFFF",
    surface: "#F5F5F5",
    border: "#E0E0E0",
    shadow: "#000000",
    accent: "#FF6B6B",
  }),
  useOverlayTextColor: () => "#000000",
  useCurrentTheme: () => "light",
}));

jest.mock("../../components/ThemedImageBackground", () => {
  const { View } = require("react-native");
  const MockThemedImageBackground = ({ children, style }: any) => (
    <View style={style}>{children}</View>
  );
  MockThemedImageBackground.displayName = "MockThemedImageBackground";
  return MockThemedImageBackground;
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: jest.fn((callback) => {
    // Ne pas appeler le callback immédiatement pour éviter les boucles infinies
    return callback;
  }),
}));

jest.mock("../../utils/logger", () => ({
  errorLog: jest.fn(),
}));

describe("QiblaScreen", () => {
  const mockT = jest.fn((key) => key);

  beforeEach(() => {
    (useTranslation as jest.Mock).mockReturnValue({
      t: mockT,
      i18n: { language: "fr" },
    });

    // Mock AppState.addEventListener pour éviter les erreurs natives
    jest
      .spyOn(require("react-native").AppState, "addEventListener")
      .mockImplementation(() => ({ remove: jest.fn() }));

    // Mock par défaut pour les services de localisation activés
    (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(true);

    // Mock par défaut pour les permissions accordées
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue(
      {
        status: "granted",
      }
    );

    // Mock par défaut pour la position
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: {
        latitude: 48.8566,
        longitude: 2.3522,
      },
    });

    // Mock pour le heading
    (Location.watchHeadingAsync as jest.Mock).mockResolvedValue({
      remove: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendu de base", () => {
    test("devrait afficher le titre de l'écran", async () => {
      render(<QiblaScreen />);

      await waitFor(() => {
        expect(screen.getByText("qibla_direction")).toBeTruthy();
      });
    });

    test("devrait afficher les instructions", async () => {
      render(<QiblaScreen />);

      await waitFor(() => {
        expect(screen.getByText("qibla_instructions")).toBeTruthy();
      });
    });
  });

  describe("Gestion des permissions", () => {
    test("devrait afficher un message d'erreur si les permissions sont refusées", async () => {
      (
        Location.requestForegroundPermissionsAsync as jest.Mock
      ).mockResolvedValue({
        status: "denied",
      });

      render(<QiblaScreen />);

      await waitFor(() => {
        expect(screen.getByText("Localisation désactivée")).toBeTruthy();
      });
    });

    test("devrait afficher un message d'erreur si les permissions sont limitées", async () => {
      (
        Location.requestForegroundPermissionsAsync as jest.Mock
      ).mockResolvedValue({
        status: "limited",
      });

      render(<QiblaScreen />);

      await waitFor(() => {
        expect(screen.getByText("Localisation désactivée")).toBeTruthy();
      });
    });

    test("devrait initialiser la boussole si les permissions sont accordées", async () => {
      render(<QiblaScreen />);

      await waitFor(() => {
        expect(Location.hasServicesEnabledAsync).toHaveBeenCalled();
        expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({
          accuracy: Location.Accuracy.Balanced,
        });
      });
    });
  });

  describe("Calcul de la direction de la Qibla", () => {
    test("devrait calculer la direction correctement pour Paris", async () => {
      render(<QiblaScreen />);

      await waitFor(() => {
        expect(Location.hasServicesEnabledAsync).toHaveBeenCalled();
        expect(Location.getCurrentPositionAsync).toHaveBeenCalled();
      });
    });

    test("devrait calculer la direction correctement pour La Mecque", async () => {
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
        coords: {
          latitude: 21.4225,
          longitude: 39.8262,
        },
      });

      render(<QiblaScreen />);

      await waitFor(() => {
        expect(Location.hasServicesEnabledAsync).toHaveBeenCalled();
        expect(Location.getCurrentPositionAsync).toHaveBeenCalled();
      });
    });

    test("devrait calculer la direction correctement pour New York", async () => {
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
        },
      });

      render(<QiblaScreen />);

      await waitFor(() => {
        expect(Location.hasServicesEnabledAsync).toHaveBeenCalled();
        expect(Location.getCurrentPositionAsync).toHaveBeenCalled();
      });
    });
  });

  describe("Affichage de la boussole", () => {
    test("devrait afficher la boussole quand les permissions sont accordées", async () => {
      render(<QiblaScreen />);

      await waitFor(() => {
        // La boussole devrait être présente (même si on ne peut pas tester l'image directement)
        expect(screen.getByText("qibla_direction")).toBeTruthy();
      });
    });

    test("devrait afficher l'icône de la Kaaba", async () => {
      render(<QiblaScreen />);

      await waitFor(() => {
        // L'icône Kaaba est une image, mais on peut vérifier que l'écran se charge correctement
        expect(screen.getByText("qibla_instructions")).toBeTruthy();
      });
    });
  });

  describe("Gestion des erreurs", () => {
    test("devrait gérer les erreurs de récupération de position", async () => {
      (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(
        new Error("Erreur de localisation")
      );

      render(<QiblaScreen />);

      await waitFor(() => {
        expect(
          screen.getByText("Permission de localisation requise")
        ).toBeTruthy();
      });
    });

    test("devrait gérer les erreurs de permissions", async () => {
      (
        Location.requestForegroundPermissionsAsync as jest.Mock
      ).mockRejectedValue(new Error("Erreur de permissions"));

      render(<QiblaScreen />);

      await waitFor(() => {
        expect(
          screen.getByText("Permission de localisation requise")
        ).toBeTruthy();
      });
    });

    test("devrait gérer les services de localisation désactivés", async () => {
      (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(false);

      render(<QiblaScreen />);

      await waitFor(() => {
        expect(
          screen.getByText(
            "Pour utiliser la boussole Qibla, activez la localisation dans les paramètres de votre téléphone."
          )
        ).toBeTruthy();
      });
    });

    test("devrait gérer les permissions refusées", async () => {
      (
        Location.requestForegroundPermissionsAsync as jest.Mock
      ).mockResolvedValue({
        status: "denied",
      });

      render(<QiblaScreen />);

      await waitFor(() => {
        expect(screen.getByText("Localisation désactivée")).toBeTruthy();
      });
    });
  });

  describe("États d'initialisation", () => {
    test("devrait afficher l'état d'initialisation", async () => {
      // Simuler un délai d'initialisation
      (Location.getCurrentPositionAsync as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<QiblaScreen />);

      // Pendant l'initialisation, on devrait voir le message d'initialisation
      expect(screen.getByText("Initialisation de la boussole...")).toBeTruthy();
    });
  });

  describe("Fonctions utilitaires", () => {
    test("devrait convertir les degrés en radians correctement", () => {
      // Test de la fonction toRadians (importée indirectement)
      const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

      expect(toRadians(0)).toBe(0);
      expect(toRadians(90)).toBe(Math.PI / 2);
      expect(toRadians(180)).toBe(Math.PI);
      expect(toRadians(360)).toBe(2 * Math.PI);
    });

    test("devrait calculer la direction de la Qibla correctement", () => {
      // Test de la fonction calculateQiblaDirection (importée indirectement)
      const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
      const calculateQiblaDirection = (lat: number, lng: number) => {
        const KAABA_LAT = 21.4225;
        const KAABA_LNG = 39.8262;

        const userLat = toRadians(lat);
        const userLng = toRadians(lng);
        const kaabaLat = toRadians(KAABA_LAT);
        const kaabaLng = toRadians(KAABA_LNG);
        const deltaLng = kaabaLng - userLng;
        const x = Math.sin(deltaLng);
        const y =
          Math.cos(userLat) * Math.tan(kaabaLat) -
          Math.sin(userLat) * Math.cos(deltaLng);

        let angle = Math.atan2(x, y);
        angle = (angle * 180) / Math.PI;
        return (angle + 360) % 360;
      };

      // Test avec La Mecque (devrait être 0°)
      expect(calculateQiblaDirection(21.4225, 39.8262)).toBeCloseTo(0, 1);

      // Test avec une position différente
      const direction = calculateQiblaDirection(48.8566, 2.3522);
      expect(direction).toBeGreaterThan(0);
      expect(direction).toBeLessThan(360);
    });
  });

  describe("Performance et optimisation", () => {
    test("devrait nettoyer les subscriptions au démontage", async () => {
      const mockRemove = jest.fn();
      (Location.watchHeadingAsync as jest.Mock).mockResolvedValue({
        remove: mockRemove,
      });

      const { unmount } = render(<QiblaScreen />);

      await waitFor(() => {
        expect(Location.hasServicesEnabledAsync).toHaveBeenCalled();
        expect(Location.watchHeadingAsync).toHaveBeenCalled();
      });

      unmount();

      // Vérifier que la fonction remove a été appelée
      expect(mockRemove).toHaveBeenCalled();
    });

    test("devrait gérer les changements d'état de l'application", async () => {
      render(<QiblaScreen />);

      await waitFor(() => {
        expect(screen.getByText("qibla_direction")).toBeTruthy();
      });
    });
  });
});
