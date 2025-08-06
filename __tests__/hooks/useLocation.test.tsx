import { renderHook } from "@testing-library/react-native";
import { useLocation } from "../../hooks/useLocation";
import * as Location from "expo-location";
import { SettingsProvider } from "../../contexts/SettingsContext";

// Mock expo-location
jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
}));

jest.mock("../../utils/logger", () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
}));

describe("useLocation", () => {
  const mockLocation = {
    coords: {
      latitude: 48.8566,
      longitude: 2.3522,
      altitude: null,
      accuracy: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithProvider = () => {
    return renderHook(() => useLocation(), {
      wrapper: ({ children }) => (
        <SettingsProvider>{children}</SettingsProvider>
      ),
    });
  };

  describe("Rendu initial", () => {
    it("devrait retourner la location automatique quand disponible", () => {
      const { result } = renderWithProvider();

      expect(result.current.location).toBeDefined();
      expect(result.current.isLoading).toBeDefined();
      expect(result.current.error).toBeDefined();
      expect(result.current.reverseGeocode).toBeDefined();
    });
  });

  describe("Géocodage inverse", () => {
    it("devrait effectuer un géocodage inverse avec succès", async () => {
      const mockGetPermissions =
        Location.getForegroundPermissionsAsync as jest.Mock;
      const mockReverseGeocode = Location.reverseGeocodeAsync as jest.Mock;

      mockGetPermissions.mockResolvedValue({ status: "granted" });
      mockReverseGeocode.mockResolvedValue([
        {
          city: "Paris",
          country: "France",
          region: "Île-de-France",
          street: "Champs-Élysées",
          postalCode: "75008",
        },
      ]);

      const { result } = renderWithProvider();

      const coords = {
        latitude: 48.8566,
        longitude: 2.3522,
        altitude: null,
        accuracy: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      };
      const address = await result.current.reverseGeocode(coords);

      expect(mockGetPermissions).toHaveBeenCalled();
      expect(mockReverseGeocode).toHaveBeenCalledWith(coords);
      expect(address).toEqual({
        city: "Paris",
        country: "France",
        region: "Île-de-France",
        street: "Champs-Élysées",
        postalCode: "75008",
      });
    });

    it("devrait retourner null quand les permissions ne sont pas accordées", async () => {
      const mockGetPermissions =
        Location.getForegroundPermissionsAsync as jest.Mock;
      mockGetPermissions.mockResolvedValue({ status: "denied" });

      const { result } = renderWithProvider();

      const coords = {
        latitude: 48.8566,
        longitude: 2.3522,
        altitude: null,
        accuracy: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      };
      const address = await result.current.reverseGeocode(coords);

      expect(mockGetPermissions).toHaveBeenCalled();
      expect(address).toBeNull();
    });

    it("devrait retourner null quand aucun résultat de géocodage", async () => {
      const mockGetPermissions =
        Location.getForegroundPermissionsAsync as jest.Mock;
      const mockReverseGeocode = Location.reverseGeocodeAsync as jest.Mock;

      mockGetPermissions.mockResolvedValue({ status: "granted" });
      mockReverseGeocode.mockResolvedValue([]);

      const { result } = renderWithProvider();

      const coords = {
        latitude: 48.8566,
        longitude: 2.3522,
        altitude: null,
        accuracy: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      };
      const address = await result.current.reverseGeocode(coords);

      expect(address).toBeNull();
    });

    it("devrait gérer les erreurs de géocodage", async () => {
      const mockGetPermissions =
        Location.getForegroundPermissionsAsync as jest.Mock;
      const mockReverseGeocode = Location.reverseGeocodeAsync as jest.Mock;

      mockGetPermissions.mockResolvedValue({ status: "granted" });
      mockReverseGeocode.mockRejectedValue(new Error("Erreur de géocodage"));

      const { result } = renderWithProvider();

      const coords = {
        latitude: 48.8566,
        longitude: 2.3522,
        altitude: null,
        accuracy: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      };
      const address = await result.current.reverseGeocode(coords);

      expect(address).toBeNull();
    });
  });
});
