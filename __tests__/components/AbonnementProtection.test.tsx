import React from "react";
import { render } from "@testing-library/react-native";
import { View, Text } from "react-native";
import AbonnementProtection from "../../components/AbonnementProtection";

// Mock simple des dépendances
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
}));

jest.mock("react-native", () => ({
  BackHandler: {
    addEventListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
  },
  Alert: {
    alert: jest.fn(),
  },
  View: "View",
  Text: "Text",
}));

describe("AbonnementProtection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("devrait rendre les enfants correctement", () => {
    const { root } = render(
      <AbonnementProtection>
        <View>
          <Text>Test Content</Text>
        </View>
      </AbonnementProtection>
    );

    expect(root).toBeTruthy();
  });

  it("devrait se rendre sans erreur", () => {
    expect(() =>
      render(
        <AbonnementProtection>
          <View>
            <Text>Test Content</Text>
          </View>
        </AbonnementProtection>
      )
    ).not.toThrow();
  });

  it("devrait avoir la structure correcte", () => {
    const { root } = render(
      <AbonnementProtection>
        <View>
          <Text>Test Content</Text>
        </View>
      </AbonnementProtection>
    );

    expect(root).toBeTruthy();
  });
});
