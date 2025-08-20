import React from "react";
import { render, fireEvent, screen } from "@testing-library/react-native";
import ThemedPicker from "../../components/ThemedPicker";

// Mock des dépendances
jest.mock("../../hooks/useThemeAssets", () => ({
  useThemeAssets: () => ({
    theme: "light",
    colors: {
      surface: "#FFFFFF",
      cardBG: "#F5F5F5",
      text: "#000000",
      textSecondary: "#666666",
      border: "#E0E0E0",
      shadow: "#000000",
      surfaceVariant: "#F0F0F0",
    },
  }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: "MaterialCommunityIcons",
}));

describe("ThemedPicker", () => {
  const mockItems = [
    { label: "Option 1", value: "option1" },
    { label: "Option 2", value: "option2" },
    { label: "Option 3", value: "option3" },
  ];

  const defaultProps = {
    visible: true,
    title: "Sélectionner une option",
    items: mockItems,
    selectedValue: "option1",
    onValueChange: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("devrait se rendre sans erreur", () => {
    expect(() => render(<ThemedPicker {...defaultProps} />)).not.toThrow();
  });

  it("devrait afficher le titre", () => {
    render(<ThemedPicker {...defaultProps} />);

    expect(screen.getByText("Sélectionner une option")).toBeTruthy();
  });

  it("devrait afficher tous les éléments", () => {
    render(<ThemedPicker {...defaultProps} />);

    expect(screen.getByText("Option 1")).toBeTruthy();
    expect(screen.getByText("Option 2")).toBeTruthy();
    expect(screen.getByText("Option 3")).toBeTruthy();
  });

  it("devrait afficher le bouton Annuler", () => {
    render(<ThemedPicker {...defaultProps} />);

    expect(screen.getByText("Annuler")).toBeTruthy();
  });

  it("devrait appeler onClose quand on appuie sur Annuler", () => {
    const onClose = jest.fn();
    render(<ThemedPicker {...defaultProps} onClose={onClose} />);

    fireEvent.press(screen.getByText("Annuler"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("devrait appeler onValueChange et onClose quand on sélectionne un élément", () => {
    const onValueChange = jest.fn();
    const onClose = jest.fn();
    render(
      <ThemedPicker
        {...defaultProps}
        onValueChange={onValueChange}
        onClose={onClose}
      />
    );

    fireEvent.press(screen.getByText("Option 2"));

    expect(onValueChange).toHaveBeenCalledWith("option2");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("devrait gérer le cas où visible est false", () => {
    expect(() =>
      render(<ThemedPicker {...defaultProps} visible={false} />)
    ).not.toThrow();
  });

  it("devrait avoir la structure correcte", () => {
    const { root } = render(<ThemedPicker {...defaultProps} />);

    expect(root).toBeTruthy();
  });
});
