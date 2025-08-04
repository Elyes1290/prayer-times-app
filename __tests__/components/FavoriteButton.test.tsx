import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import FavoriteButton from "../../components/FavoriteButton";
import { FavoritesProvider } from "../../contexts/FavoritesContext";

// Mocks
const mockAddFavorite = jest.fn();
const mockRemoveFavorite = jest.fn();
const mockIsFavorite = jest.fn();
const mockCanAddFavorite = jest.fn();

jest.mock("../../contexts/FavoritesContext", () => ({
  FavoritesProvider: ({ children }: any) => children,
  useFavorites: () => ({
    addFavorite: mockAddFavorite,
    removeFavorite: mockRemoveFavorite,
    isFavorite: mockIsFavorite,
    canAddFavorite: mockCanAddFavorite,
    favorites: [],
  }),
}));

jest.mock("../../contexts/PremiumContext", () => ({
  usePremium: () => ({
    user: { isPremium: true },
  }),
}));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
}));

describe("FavoriteButton", () => {
  const mockFavorite = {
    type: "quran_verse" as const,
    chapterNumber: 1,
    verseNumber: 1,
    arabicText: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
    translation:
      "Au nom d'Allah, le Tout Miséricordieux, le Très Miséricordieux",
    transliteration: "Bismillahi ar-rahmani ar-rahim",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCanAddFavorite.mockReturnValue({ canAdd: true, reason: null });
  });

  describe("Rendu de base", () => {
    test("devrait afficher un bouton favori", () => {
      render(
        <FavoritesProvider>
          <FavoriteButton favoriteData={mockFavorite} />
        </FavoritesProvider>
      );

      expect(screen.getByTestId("favorite-button")).toBeTruthy();
    });

    test("devrait afficher l'icône de cœur vide par défaut", () => {
      render(
        <FavoritesProvider>
          <FavoriteButton favoriteData={mockFavorite} />
        </FavoritesProvider>
      );

      const heartIcon = screen.getByTestId("heart-icon");
      expect(heartIcon).toBeTruthy();
    });
  });

  describe("Interactions", () => {
    test("devrait ajouter aux favoris quand on clique sur le bouton", async () => {
      mockIsFavorite.mockReturnValue(false);
      mockAddFavorite.mockResolvedValue(true);

      render(
        <FavoritesProvider>
          <FavoriteButton favoriteData={mockFavorite} />
        </FavoritesProvider>
      );

      const button = screen.getByTestId("favorite-button");
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockAddFavorite).toHaveBeenCalledWith(mockFavorite);
      });
    });

    test("devrait retirer des favoris si déjà favori", async () => {
      mockIsFavorite.mockReturnValue(true);
      mockRemoveFavorite.mockResolvedValue(true);

      render(
        <FavoritesProvider>
          <FavoriteButton favoriteData={mockFavorite} />
        </FavoritesProvider>
      );

      const button = screen.getByTestId("favorite-button");
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockRemoveFavorite).toHaveBeenCalled();
      });
    });
  });

  describe("États visuels", () => {
    test("devrait afficher l'icône de cœur plein si favori", () => {
      mockIsFavorite.mockReturnValue(true);

      render(
        <FavoritesProvider>
          <FavoriteButton favoriteData={mockFavorite} />
        </FavoritesProvider>
      );

      const heartIcon = screen.getByTestId("heart-icon");
      expect(heartIcon).toBeTruthy();
    });

    test("devrait afficher l'icône de cœur vide si pas favori", () => {
      mockIsFavorite.mockReturnValue(false);

      render(
        <FavoritesProvider>
          <FavoriteButton favoriteData={mockFavorite} />
        </FavoritesProvider>
      );

      const heartIcon = screen.getByTestId("heart-icon");
      expect(heartIcon).toBeTruthy();
    });
  });

  describe("Accessibilité", () => {
    test("devrait avoir un label d'accessibilité approprié", () => {
      render(
        <FavoritesProvider>
          <FavoriteButton favoriteData={mockFavorite} />
        </FavoritesProvider>
      );

      const button = screen.getByTestId("favorite-button");
      expect(button.props.accessibilityLabel).toBeTruthy();
    });

    test("devrait être accessible aux lecteurs d'écran", () => {
      render(
        <FavoritesProvider>
          <FavoriteButton favoriteData={mockFavorite} />
        </FavoritesProvider>
      );

      const button = screen.getByTestId("favorite-button");
      expect(button.props.accessibilityRole).toBe("button");
    });
  });

  describe("Gestion des erreurs", () => {
    test("devrait gérer les erreurs lors de l'ajout aux favoris", async () => {
      mockIsFavorite.mockReturnValue(false);
      mockAddFavorite.mockRejectedValue(new Error("Erreur"));

      render(
        <FavoritesProvider>
          <FavoriteButton favoriteData={mockFavorite} />
        </FavoritesProvider>
      );

      const button = screen.getByTestId("favorite-button");
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockAddFavorite).toHaveBeenCalled();
      });
    });
  });
});
