import React from "react";
import { render } from "@testing-library/react-native";
import { ThemedView } from "../../components/ThemedView";

// Mock du hook useThemeColor
jest.mock("../../hooks/useThemeColor", () => ({
  useThemeColor: jest.fn(() => "#FFFFFF"),
}));

describe("ThemedView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correctly with default props", () => {
    const { toJSON } = render(<ThemedView />);
    expect(toJSON()).toMatchSnapshot();
  });

  it("renders with children", () => {
    const { getByTestId } = render(
      <ThemedView>
        <ThemedView testID="child" />
      </ThemedView>
    );

    expect(getByTestId("child")).toBeTruthy();
  });

  it("applies custom style", () => {
    const customStyle = { padding: 16 };
    const { getByTestId } = render(
      <ThemedView testID="themed-view" style={customStyle} />
    );

    const view = getByTestId("themed-view");
    expect(view.props.style).toContainEqual(customStyle);
  });

  it("passes through other props", () => {
    const { getByTestId } = render(
      <ThemedView testID="test-view" accessibilityLabel="Test Label" />
    );

    const view = getByTestId("test-view");
    expect(view.props.accessibilityLabel).toBe("Test Label");
  });

  it("uses light and dark colors", () => {
    const { useThemeColor } = require("../../hooks/useThemeColor");

    render(<ThemedView lightColor="#FF0000" darkColor="#00FF00" />);

    expect(useThemeColor).toHaveBeenCalledWith(
      { light: "#FF0000", dark: "#00FF00" },
      "background"
    );
  });

  it("handles multiple children", () => {
    const { getByTestId } = render(
      <ThemedView testID="parent">
        <ThemedView testID="child1" />
        <ThemedView testID="child2" />
      </ThemedView>
    );

    expect(getByTestId("child1")).toBeTruthy();
    expect(getByTestId("child2")).toBeTruthy();
  });
});
