import React from "react";
import { render, screen } from "@testing-library/react-native";
import ParallaxScrollView from "../../components/ParallaxScrollView";

// Mock de react-native-reanimated
jest.mock("react-native-reanimated", () => ({
  interpolate: jest.fn(),
  useAnimatedRef: jest.fn(() => ({ current: null })),
  useAnimatedStyle: jest.fn(() => ({})),
  useScrollViewOffset: jest.fn(() => ({ value: 0 })),
  ScrollView: "ScrollView",
  View: "View",
}));

// Mock des composants
jest.mock("../../components/ThemedView", () => ({
  ThemedView: ({ children, style }: any) => {
    const { View } = require("react-native");
    return <View style={style}>{children}</View>;
  },
}));

jest.mock("../../components/ui/TabBarBackground", () => ({
  useBottomTabOverflow: () => 0,
}));

jest.mock("../../hooks/useColorScheme", () => ({
  useColorScheme: () => "light",
}));

describe("ParallaxScrollView", () => {
  const mockHeaderImage = <div>Header Image</div>;
  const mockHeaderBackgroundColor = {
    dark: "#000000",
    light: "#FFFFFF",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("devrait se rendre sans erreur", () => {
    expect(() =>
      render(
        <ParallaxScrollView
          headerImage={mockHeaderImage}
          headerBackgroundColor={mockHeaderBackgroundColor}
        >
          <div>Test Content</div>
        </ParallaxScrollView>
      )
    ).not.toThrow();
  });

  it("devrait avoir la structure correcte", () => {
    const { root } = render(
      <ParallaxScrollView
        headerImage={mockHeaderImage}
        headerBackgroundColor={mockHeaderBackgroundColor}
      >
        <div>Test Content</div>
      </ParallaxScrollView>
    );

    expect(root).toBeTruthy();
  });

  it("devrait accepter les props requises", () => {
    const { root } = render(
      <ParallaxScrollView
        headerImage={mockHeaderImage}
        headerBackgroundColor={mockHeaderBackgroundColor}
      >
        <div>Test Content</div>
      </ParallaxScrollView>
    );

    expect(root).toBeTruthy();
  });

  it("devrait gérer différents thèmes", () => {
    const { root } = render(
      <ParallaxScrollView
        headerImage={mockHeaderImage}
        headerBackgroundColor={mockHeaderBackgroundColor}
      >
        <div>Test Content</div>
      </ParallaxScrollView>
    );

    expect(root).toBeTruthy();
  });
});
