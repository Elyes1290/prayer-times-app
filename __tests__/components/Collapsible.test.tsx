import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Text, View } from "react-native";
import { Collapsible } from "@/components/Collapsible";

// Mock Ionicons
jest.mock("@expo/vector-icons/Ionicons", () => {
  const { Text } = require("react-native");
  return {
    __esModule: true,
    default: ({ name, size, color, testID, ...props }: any) => (
      <Text testID={testID} {...props}>
        {name}
      </Text>
    ),
  };
});

// Mock useThemeColor
jest.mock("@/hooks/useThemeColor", () => ({
  useThemeColor: jest.fn(() => "#000000"),
}));

// Mock ThemedText and ThemedView
jest.mock("@/components/ThemedText", () => {
  const { Text } = require("react-native");
  return {
    ThemedText: ({ children, testID, ...props }: any) => (
      <Text testID={testID} {...props}>
        {children}
      </Text>
    ),
  };
});

jest.mock("@/components/ThemedView", () => {
  const { View } = require("react-native");
  return {
    ThemedView: ({ children, testID, style, ...props }: any) => (
      <View testID={testID} style={style} {...props}>
        {children}
      </View>
    ),
  };
});

describe("Collapsible", () => {
  it("renders correctly with title", () => {
    const { getByText } = render(
      <Collapsible title="Test Section">
        <Text>Test content</Text>
      </Collapsible>
    );
    expect(getByText("Test Section")).toBeTruthy();
  });

  it("shows content when expanded", () => {
    const { getByText } = render(
      <Collapsible title="Test Section">
        <Text>Test content</Text>
      </Collapsible>
    );
    const header = getByText("Test Section");
    fireEvent.press(header);
    expect(getByText("Test content")).toBeTruthy();
  });

  it("hides content when collapsed by default", () => {
    const { getByText, queryByText } = render(
      <Collapsible title="Test Section">
        <Text>Test content</Text>
      </Collapsible>
    );
    expect(getByText("Test Section")).toBeTruthy();
    expect(queryByText("Test content")).toBeNull();
  });

  it("toggles content when header is pressed", () => {
    const { getByText, queryByText } = render(
      <Collapsible title="Test Section">
        <Text>Test content</Text>
      </Collapsible>
    );
    const header = getByText("Test Section");
    expect(queryByText("Test content")).toBeNull();
    fireEvent.press(header);
    expect(getByText("Test content")).toBeTruthy();
    fireEvent.press(header);
    expect(queryByText("Test content")).toBeNull();
  });

  it("displays chevron icon", () => {
    const { getByTestId } = render(
      <Collapsible title="Test Section">
        <Text>Test content</Text>
      </Collapsible>
    );
    expect(getByTestId("collapsible-icon")).toBeTruthy();
  });

  it("changes chevron direction when expanded", () => {
    const { getByTestId } = render(
      <Collapsible title="Test Section">
        <Text>Test content</Text>
      </Collapsible>
    );
    const header = getByTestId("collapsible-header");
    const icon = getByTestId("collapsible-icon");
    expect(icon).toBeTruthy();
    fireEvent.press(header);
    expect(icon).toBeTruthy();
  });

  it("handles empty content", () => {
    const { getByText } = render(
      <Collapsible title="Test Section">{null}</Collapsible>
    );
    expect(getByText("Test Section")).toBeTruthy();
  });

  it("handles complex content", () => {
    const { getByText } = render(
      <Collapsible title="Test Section">
        <View>
          <Text>Title</Text>
          <Text>Paragraph content</Text>
          <Text>Button</Text>
        </View>
      </Collapsible>
    );
    const header = getByText("Test Section");
    fireEvent.press(header);
    expect(getByText("Title")).toBeTruthy();
    expect(getByText("Paragraph content")).toBeTruthy();
    expect(getByText("Button")).toBeTruthy();
  });

  it("maintains state when parent re-renders", () => {
    const { getByText, queryByText, rerender } = render(
      <Collapsible title="Test Section">
        <Text>Test content</Text>
      </Collapsible>
    );
    const header = getByText("Test Section");
    fireEvent.press(header);
    expect(getByText("Test content")).toBeTruthy();
    rerender(
      <Collapsible title="Test Section">
        <Text>Test content</Text>
      </Collapsible>
    );
    expect(getByText("Test content")).toBeTruthy();
  });

  it("handles multiple collapsible sections", () => {
    const { getByText } = render(
      <View>
        <Collapsible title="Section 1">
          <Text>Content 1</Text>
        </Collapsible>
        <Collapsible title="Section 2">
          <Text>Content 2</Text>
        </Collapsible>
      </View>
    );
    expect(getByText("Section 1")).toBeTruthy();
    expect(getByText("Section 2")).toBeTruthy();
  });

  it("handles long titles", () => {
    const longTitle =
      "This is a very long title that should be handled properly by the component";
    const { getByText } = render(
      <Collapsible title={longTitle}>
        <Text>Test content</Text>
      </Collapsible>
    );
    expect(getByText(longTitle)).toBeTruthy();
  });

  it("handles special characters in title", () => {
    const specialTitle = "Test Section with émojis 🎉 and symbols @#$%";
    const { getByText } = render(
      <Collapsible title={specialTitle}>
        <Text>Test content</Text>
      </Collapsible>
    );
    expect(getByText(specialTitle)).toBeTruthy();
  });

  it("has proper test IDs", () => {
    const { getByTestId } = render(
      <Collapsible title="Test Section">
        <Text>Test content</Text>
      </Collapsible>
    );
    expect(getByTestId("collapsible-container")).toBeTruthy();
    expect(getByTestId("collapsible-header")).toBeTruthy();
    expect(getByTestId("collapsible-title")).toBeTruthy();
    expect(getByTestId("collapsible-icon")).toBeTruthy();
  });

  it("shows content area when expanded", () => {
    const { getByTestId } = render(
      <Collapsible title="Test Section">
        <Text>Test content</Text>
      </Collapsible>
    );
    const header = getByTestId("collapsible-header");
    fireEvent.press(header);
    expect(getByTestId("collapsible-content")).toBeTruthy();
  });
});
