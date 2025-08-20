import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Platform } from "react-native";
import { ExternalLink } from "../../components/ExternalLink";

// Mock des dépendances
jest.mock("expo-router", () => ({
  Link: ({ children, onPress, href, testID, ...props }: any) => {
    const { Pressable, Text } = require("react-native");
    const handlePress = () => {
      if (onPress) {
        const mockEvent = {
          preventDefault: jest.fn(),
        };
        onPress(mockEvent);
      }
    };
    return (
      <Pressable onPress={handlePress} testID={testID} {...props}>
        <Text>{children}</Text>
      </Pressable>
    );
  },
}));

jest.mock("expo-web-browser", () => ({
  openBrowserAsync: jest.fn(),
}));

describe("ExternalLink", () => {
  const mockOpenBrowserAsync = require("expo-web-browser").openBrowserAsync;

  beforeEach(() => {
    jest.clearAllMocks();
    // Par défaut, on simule un environnement non-web
    Platform.OS = "ios";
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("renders correctly with href", () => {
    const { getByText } = render(
      <ExternalLink href="https://example.com">Example Link</ExternalLink>
    );

    expect(getByText("Example Link")).toBeTruthy();
  });

  it("opens browser on native platforms", async () => {
    Platform.OS = "ios";

    const { getByText } = render(
      <ExternalLink href="https://example.com">Example Link</ExternalLink>
    );

    const link = getByText("Example Link");
    fireEvent.press(link);

    expect(mockOpenBrowserAsync).toHaveBeenCalledWith("https://example.com");
  });

  it("does not open browser on web platform", async () => {
    Platform.OS = "web";

    const { getByText } = render(
      <ExternalLink href="https://example.com">Example Link</ExternalLink>
    );

    const link = getByText("Example Link");
    fireEvent.press(link);

    expect(mockOpenBrowserAsync).not.toHaveBeenCalled();
  });

  it("handles Android platform", async () => {
    Platform.OS = "android";

    const { getByText } = render(
      <ExternalLink href="https://example.com">Example Link</ExternalLink>
    );

    const link = getByText("Example Link");
    fireEvent.press(link);

    expect(mockOpenBrowserAsync).toHaveBeenCalledWith("https://example.com");
  });

  it("passes through additional props", () => {
    const { getByTestId } = render(
      <ExternalLink
        href="https://example.com"
        testID="external-link"
        accessibilityLabel="Test Link"
      >
        Example Link
      </ExternalLink>
    );

    const link = getByTestId("external-link");
    expect(link.props.accessibilityLabel).toBe("Test Link");
  });

  it("renders with different href formats", () => {
    const { getByText } = render(
      // @ts-ignore
      <ExternalLink href="/local-path">Local Link</ExternalLink>
    );

    expect(getByText("Local Link")).toBeTruthy();
  });

  it("handles press event correctly", async () => {
    const { getByTestId } = render(
      <ExternalLink href="https://example.com" testID="link">
        Test Link
      </ExternalLink>
    );

    const link = getByTestId("link");

    // Simuler l'événement press
    await fireEvent.press(link);

    expect(mockOpenBrowserAsync).toHaveBeenCalledTimes(1);
  });
});
