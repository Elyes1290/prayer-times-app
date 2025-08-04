import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import MosqueScreen from "../../screens/MosqueScreen";
import { useTranslation } from "react-i18next";

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

jest.mock("../../hooks/useLocation", () => ({
  useLocation: () => ({
    location: {
      coords: { latitude: 46.8182, longitude: 8.2275 },
      timestamp: Date.now(),
    },
    loading: false,
    error: null,
    requestLocation: jest.fn(),
    hasLocation: true,
  }),
}));

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useContext: jest.fn((context) => {
    if (context === require("../../contexts/SettingsContext").SettingsContext) {
      return {
        locationMode: "auto",
        manualLocation: null,
        language: "fr",
        theme: "light",
      };
    }
    return {};
  }),
}));

jest.mock("../../hooks/useThemeColor", () => ({
  useThemeColors: () => ({ primary: "#000", background: "#fff" }),
  useOverlayTextColor: () => "#000",
  useOverlayIconColor: () => "#000",
  useCurrentTheme: () => "light",
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: (props: any) => {
    const { View } = require("react-native");
    return <View testID="icon" {...props} />;
  },
}));

// Mock fetch pour éviter les appels réseau
beforeAll(() => {
  (global.fetch as any) = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          elements: [
            {
              id: "1",
              lat: 46.8182,
              lon: 8.2275,
              tags: {
                name: "Mosquée Centrale",
                "addr:street": "Rue de la Paix",
                "addr:city": "Lucerne",
              },
            },
            {
              id: "2",
              lat: 46.8183,
              lon: 8.2276,
              tags: {
                name: "Grande Mosquée",
                "addr:street": "Avenue de l'Islam",
                "addr:city": "Lucerne",
              },
            },
          ],
        }),
    })
  );
});

afterAll(() => {
  // @ts-ignore
  global.fetch.mockRestore && global.fetch.mockRestore();
});

describe("MosqueScreen", () => {
  const mockT = jest.fn((key) => {
    switch (key) {
      case "mosque_screen.title":
        return "Mosquées";
      case "mosque_screen.searching":
        return "Recherche en cours...";
      case "mosque_screen.searching_mosques":
        return "Recherche en cours...";
      case "mosque_screen.no_mosques":
        return "Aucune mosquée trouvée";
      case "mosque_screen.address_not_available":
        return "Adresse non disponible";
      case "mosque_screen.location_not_available":
        return "Localisation non disponible";
      case "mosque_screen.retry":
        return "Réessayer";
      case "mosque_screen.mosques_nearby":
        return "Mosquées à proximité";
      case "mosque_screen.mosque_found":
        return "mosquée trouvée";
      case "mosque_screen.directions":
        return "Itinéraire";
      case "mosque_screen.mosque_search_error":
        return "Erreur lors de la recherche de mosquées";
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

  it("affiche le titre et commence la recherche", async () => {
    render(<MosqueScreen />);
    await waitFor(() => {
      expect(screen.getByText("Recherche en cours...")).toBeTruthy();
    });
  });

  it("affiche la liste des mosquées après chargement", async () => {
    render(<MosqueScreen />);
    await waitFor(() => {
      expect(screen.getByText("Mosquée Centrale")).toBeTruthy();
      expect(screen.getByText("Grande Mosquée")).toBeTruthy();
    });
  });

  it("affiche les adresses des mosquées", async () => {
    render(<MosqueScreen />);
    await waitFor(() => {
      expect(screen.getByText(/Rue de la Paix/)).toBeTruthy();
      expect(screen.getByText(/Avenue de l'Islam/)).toBeTruthy();
    });
  });

  it("affiche les icônes pour les actions", async () => {
    render(<MosqueScreen />);
    await waitFor(() => {
      expect(screen.getAllByTestId("icon").length).toBeGreaterThan(0);
    });
  });
});
