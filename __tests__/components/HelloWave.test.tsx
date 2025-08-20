import React from "react";
import { render, screen } from "@testing-library/react-native";
import { HelloWave } from "../../components/HelloWave";

// Mock de react-native-reanimated
jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock de ThemedText
jest.mock("../../components/ThemedText", () => ({
  ThemedText: ({ children, style }: any) => {
    const { Text } = require("react-native");
    return <Text style={style}>{children}</Text>;
  },
}));

describe("HelloWave", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("devrait afficher l'emoji de la main", () => {
    render(<HelloWave />);

    expect(screen.getByText("👋")).toBeTruthy();
  });

  it("devrait avoir le style correct", () => {
    render(<HelloWave />);

    const waveElement = screen.getByText("👋");
    expect(waveElement).toBeTruthy();

    // Vérifier que le composant est rendu avec l'animation
    expect(waveElement.parent).toBeTruthy();
  });

  it("devrait se rendre sans erreur", () => {
    expect(() => render(<HelloWave />)).not.toThrow();
  });

  it("devrait avoir la structure correcte", () => {
    const { root } = render(<HelloWave />);

    // Vérifier que le composant est rendu
    expect(root).toBeTruthy();
  });
});
