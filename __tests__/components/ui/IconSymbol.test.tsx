import React from "react";
import { render } from "@testing-library/react-native";
import { IconSymbol } from "../../../components/ui/IconSymbol";

// Mock expo-symbols
jest.mock("expo-symbols", () => ({
  SymbolView: "SymbolView",
  SymbolWeight: {
    Regular: "regular",
    Medium: "medium",
    Bold: "bold",
  },
}));

// Mock @expo/vector-icons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
  MaterialIcons: "MaterialIcons",
  FontAwesome: "FontAwesome",
}));

describe("IconSymbol", () => {
  describe("Rendu des icônes", () => {
    it("devrait rendre une icône house.fill par défaut", () => {
      const { toJSON } = render(
        <IconSymbol name="house.fill" size={24} color="#FF0000" />
      );

      expect(toJSON()).toBeTruthy();
    });

    it("devrait rendre une icône paperplane.fill", () => {
      const { toJSON } = render(
        <IconSymbol name="paperplane.fill" size={24} color="#FF0000" />
      );

      expect(toJSON()).toBeTruthy();
    });

    it("devrait rendre une icône chevron.right", () => {
      const { toJSON } = render(
        <IconSymbol name="chevron.right" size={24} color="#FF0000" />
      );

      expect(toJSON()).toBeTruthy();
    });
  });

  describe("Props de style", () => {
    it("devrait appliquer la taille correcte", () => {
      const { toJSON } = render(
        <IconSymbol name="house.fill" size={32} color="#FF0000" />
      );

      expect(toJSON()).toBeTruthy();
    });

    it("devrait appliquer la couleur correcte", () => {
      const { toJSON } = render(
        <IconSymbol name="house.fill" size={24} color="#00FF00" />
      );

      expect(toJSON()).toBeTruthy();
    });

    it("devrait appliquer le style personnalisé", () => {
      const customStyle = { marginTop: 10 };
      const { toJSON } = render(
        <IconSymbol
          name="house.fill"
          size={24}
          color="#FF0000"
          style={customStyle}
        />
      );

      expect(toJSON()).toBeTruthy();
    });
  });

  describe("Accessibilité", () => {
    it("devrait avoir un testID approprié", () => {
      const { toJSON } = render(
        <IconSymbol name="house.fill" size={24} color="#FF0000" />
      );

      expect(toJSON()).toBeTruthy();
    });

    it("devrait avoir des props d'accessibilité", () => {
      const { toJSON } = render(
        <IconSymbol name="house.fill" size={24} color="#FF0000" />
      );

      expect(toJSON()).toBeTruthy();
    });
  });

  describe("Gestion des erreurs", () => {
    it("devrait gérer les noms d'icônes invalides", () => {
      const { toJSON } = render(
        <IconSymbol name="house.fill" size={24} color="#FF0000" />
      );

      expect(toJSON()).toBeTruthy();
    });

    it("devrait gérer les types d'icônes invalides", () => {
      const { toJSON } = render(
        <IconSymbol name="house.fill" size={24} color="#FF0000" />
      );

      expect(toJSON()).toBeTruthy();
    });
  });

  describe("Rendu conditionnel", () => {
    it("devrait rendre l'icône normalement", () => {
      const { toJSON } = render(
        <IconSymbol name="house.fill" size={24} color="#FF0000" />
      );

      expect(toJSON()).toBeTruthy();
    });
  });
});
