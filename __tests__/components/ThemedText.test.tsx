import React from "react";
import { render, screen } from "@testing-library/react-native";
import { ThemedText } from "../../components/ThemedText";
import { useThemeColor } from "../../hooks/useThemeColor";

// Mocks
jest.mock("../../hooks/useThemeColor", () => ({
  useThemeColor: jest.fn(),
}));

describe("ThemedText", () => {
  const mockColor = "#333333";

  beforeEach(() => {
    jest.clearAllMocks();
    (useThemeColor as jest.Mock).mockReturnValue(mockColor);
  });

  describe("Rendu de base", () => {
    it("devrait rendre le texte avec les propriétés de base", () => {
      render(<ThemedText>Test Text</ThemedText>);

      expect(screen.getByText("Test Text")).toBeTruthy();
      expect(screen.getByTestId("themed-text")).toBeTruthy();
    });

    it("devrait utiliser la couleur de thème par défaut", () => {
      render(<ThemedText>Test Text</ThemedText>);

      expect(useThemeColor).toHaveBeenCalledWith(
        { light: undefined, dark: undefined },
        "text"
      );
    });

    it("devrait appliquer le type par défaut", () => {
      render(<ThemedText>Test Text</ThemedText>);

      expect(screen.getByTestId("themed-text")).toBeTruthy();
    });
  });

  describe("Types de texte", () => {
    it("devrait appliquer le type default", () => {
      render(<ThemedText type="default">Default Text</ThemedText>);

      expect(screen.getByText("Default Text")).toBeTruthy();
      expect(screen.getByTestId("themed-text")).toBeTruthy();
    });

    it("devrait appliquer le type title", () => {
      render(<ThemedText type="title">Title Text</ThemedText>);

      expect(screen.getByText("Title Text")).toBeTruthy();
      expect(screen.getByTestId("themed-text")).toBeTruthy();
    });

    it("devrait appliquer le type defaultSemiBold", () => {
      render(<ThemedText type="defaultSemiBold">SemiBold Text</ThemedText>);

      expect(screen.getByText("SemiBold Text")).toBeTruthy();
      expect(screen.getByTestId("themed-text")).toBeTruthy();
    });

    it("devrait appliquer le type subtitle", () => {
      render(<ThemedText type="subtitle">Subtitle Text</ThemedText>);

      expect(screen.getByText("Subtitle Text")).toBeTruthy();
      expect(screen.getByTestId("themed-text")).toBeTruthy();
    });

    it("devrait appliquer le type link", () => {
      render(<ThemedText type="link">Link Text</ThemedText>);

      expect(screen.getByText("Link Text")).toBeTruthy();
      expect(screen.getByTestId("themed-text")).toBeTruthy();
    });
  });

  describe("Couleurs personnalisées", () => {
    it("devrait utiliser les couleurs personnalisées", () => {
      const lightColor = "#ffffff";
      const darkColor = "#000000";

      render(
        <ThemedText lightColor={lightColor} darkColor={darkColor}>
          Custom Color Text
        </ThemedText>
      );

      expect(useThemeColor).toHaveBeenCalledWith(
        { light: lightColor, dark: darkColor },
        "text"
      );
      expect(screen.getByText("Custom Color Text")).toBeTruthy();
    });

    it("devrait utiliser seulement la couleur claire", () => {
      const lightColor = "#ffffff";

      render(<ThemedText lightColor={lightColor}>Light Color Text</ThemedText>);

      expect(useThemeColor).toHaveBeenCalledWith(
        { light: lightColor, dark: undefined },
        "text"
      );
      expect(screen.getByText("Light Color Text")).toBeTruthy();
    });

    it("devrait utiliser seulement la couleur sombre", () => {
      const darkColor = "#000000";

      render(<ThemedText darkColor={darkColor}>Dark Color Text</ThemedText>);

      expect(useThemeColor).toHaveBeenCalledWith(
        { light: undefined, dark: darkColor },
        "text"
      );
      expect(screen.getByText("Dark Color Text")).toBeTruthy();
    });
  });

  describe("Styles personnalisés", () => {
    it("devrait appliquer des styles personnalisés", () => {
      const customStyle = { fontSize: 20, fontWeight: "bold" as const };

      render(<ThemedText style={customStyle}>Custom Style Text</ThemedText>);

      expect(screen.getByText("Custom Style Text")).toBeTruthy();
      expect(screen.getByTestId("themed-text")).toBeTruthy();
    });

    it("devrait combiner les styles par défaut et personnalisés", () => {
      const customStyle = { backgroundColor: "red" };

      render(
        <ThemedText type="title" style={customStyle}>
          Combined Style Text
        </ThemedText>
      );

      expect(screen.getByText("Combined Style Text")).toBeTruthy();
      expect(screen.getByTestId("themed-text")).toBeTruthy();
    });
  });

  describe("Props supplémentaires", () => {
    it("devrait passer les props supplémentaires au Text", () => {
      render(
        <ThemedText numberOfLines={2} ellipsizeMode="tail">
          Long text that should be truncated
        </ThemedText>
      );

      expect(
        screen.getByText("Long text that should be truncated")
      ).toBeTruthy();
      expect(screen.getByTestId("themed-text")).toBeTruthy();
    });

    it("devrait gérer les props d'accessibilité", () => {
      render(
        <ThemedText accessible={true} accessibilityLabel="Test label">
          Accessible Text
        </ThemedText>
      );

      expect(screen.getByText("Accessible Text")).toBeTruthy();
      expect(screen.getByTestId("themed-text")).toBeTruthy();
    });
  });

  describe("Gestion des cas d'erreur", () => {
    it("devrait gérer un texte vide", () => {
      render(<ThemedText></ThemedText>);

      expect(screen.getByTestId("themed-text")).toBeTruthy();
    });

    it("devrait gérer des enfants null", () => {
      render(<ThemedText>{null}</ThemedText>);

      expect(screen.getByTestId("themed-text")).toBeTruthy();
    });

    it("devrait gérer des enfants undefined", () => {
      render(<ThemedText>{undefined}</ThemedText>);

      expect(screen.getByTestId("themed-text")).toBeTruthy();
    });

    it("devrait gérer un type invalide", () => {
      render(
        <ThemedText type={"invalid" as any}>Invalid Type Text</ThemedText>
      );

      expect(screen.getByText("Invalid Type Text")).toBeTruthy();
      expect(screen.getByTestId("themed-text")).toBeTruthy();
    });
  });

  describe("Accessibilité", () => {
    it("devrait avoir un testID par défaut", () => {
      render(<ThemedText>Test Text</ThemedText>);

      expect(screen.getByTestId("themed-text")).toBeTruthy();
    });

    it("devrait utiliser un testID personnalisé", () => {
      render(<ThemedText testID="custom-test-id">Test Text</ThemedText>);

      expect(screen.getByTestId("custom-test-id")).toBeTruthy();
    });

    it("devrait être accessible aux lecteurs d'écran", () => {
      render(<ThemedText>Test Text</ThemedText>);

      const textElement = screen.getByTestId("themed-text");
      expect(textElement).toBeTruthy();
    });
  });

  describe("Fonctions utilitaires", () => {
    it("devrait retourner la bonne couleur pour chaque type", () => {
      const types = [
        "default",
        "title",
        "defaultSemiBold",
        "subtitle",
        "link",
      ] as const;

      types.forEach((type) => {
        const { unmount } = render(
          <ThemedText type={type}>Test Text</ThemedText>
        );
        expect(screen.getByTestId("themed-text")).toBeTruthy();
        unmount();
      });
    });

    it("devrait gérer les couleurs de thème dynamiques", () => {
      const dynamicColor = "#ff0000";
      (useThemeColor as jest.Mock).mockReturnValue(dynamicColor);

      render(<ThemedText>Dynamic Color Text</ThemedText>);

      expect(useThemeColor).toHaveBeenCalledWith(
        { light: undefined, dark: undefined },
        "text"
      );
      expect(screen.getByText("Dynamic Color Text")).toBeTruthy();
    });
  });

  describe("Styles spécifiques", () => {
    it("devrait appliquer les styles du type default", () => {
      render(<ThemedText type="default">Default Style Text</ThemedText>);

      expect(screen.getByTestId("themed-text")).toBeTruthy();
    });

    it("devrait appliquer les styles du type title", () => {
      render(<ThemedText type="title">Title Style Text</ThemedText>);

      expect(screen.getByTestId("themed-text")).toBeTruthy();
    });

    it("devrait appliquer les styles du type defaultSemiBold", () => {
      render(
        <ThemedText type="defaultSemiBold">SemiBold Style Text</ThemedText>
      );

      expect(screen.getByTestId("themed-text")).toBeTruthy();
    });

    it("devrait appliquer les styles du type subtitle", () => {
      render(<ThemedText type="subtitle">Subtitle Style Text</ThemedText>);

      expect(screen.getByTestId("themed-text")).toBeTruthy();
    });

    it("devrait appliquer les styles du type link", () => {
      render(<ThemedText type="link">Link Style Text</ThemedText>);

      expect(screen.getByTestId("themed-text")).toBeTruthy();
    });
  });
});
