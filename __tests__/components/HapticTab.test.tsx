import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { HapticTab } from "../../components/HapticTab";

// Mock des dépendances
jest.mock("@react-navigation/elements", () => ({
  PlatformPressable: ({ children, onPressIn, testID, ...props }: any) => {
    const { Pressable } = require("react-native");
    return (
      <Pressable onPressIn={onPressIn} testID={testID} {...props}>
        {children}
      </Pressable>
    );
  },
}));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: "light",
    Medium: "medium",
    Heavy: "heavy",
  },
}));

describe("HapticTab", () => {
  const mockHaptics = require("expo-haptics");
  const mockOnPressIn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    onPressIn: mockOnPressIn,
    testID: "haptic-tab",
  };

  it("renders correctly", () => {
    // @ts-ignore
    const { getByTestId } = render(<HapticTab {...defaultProps} />);
    expect(getByTestId("haptic-tab")).toBeTruthy();
  });

  it("triggers haptic feedback on iOS", () => {
    // Mock the environment check
    const originalEnv = process.env.EXPO_OS;
    Object.defineProperty(process.env, "EXPO_OS", {
      value: "ios",
      writable: true,
    });

    // @ts-ignore
    const { getByTestId } = render(<HapticTab {...defaultProps} />);
    const tab = getByTestId("haptic-tab");

    fireEvent(tab, "onPressIn", {});

    expect(mockOnPressIn).toHaveBeenCalled();

    // Restore environment
    Object.defineProperty(process.env, "EXPO_OS", {
      value: originalEnv,
      writable: true,
    });
  });

  it("does not trigger haptic feedback on Android", () => {
    // @ts-ignore
    const { getByTestId } = render(<HapticTab {...defaultProps} />);
    const tab = getByTestId("haptic-tab");

    fireEvent(tab, "onPressIn", {});

    expect(mockOnPressIn).toHaveBeenCalled();
  });

  it("does not trigger haptic feedback on web", () => {
    // @ts-ignore
    const { getByTestId } = render(<HapticTab {...defaultProps} />);
    const tab = getByTestId("haptic-tab");

    fireEvent(tab, "onPressIn", {});

    expect(mockOnPressIn).toHaveBeenCalled();
  });

  it("calls original onPressIn when provided", () => {
    // @ts-ignore
    const { getByTestId } = render(<HapticTab {...defaultProps} />);
    const tab = getByTestId("haptic-tab");

    const mockEvent = { test: "event" };
    fireEvent(tab, "onPressIn", mockEvent);

    expect(mockOnPressIn).toHaveBeenCalledWith(mockEvent);
  });

  it("works without onPressIn prop", () => {
    const propsWithoutOnPressIn = { testID: "haptic-tab" };

    // @ts-ignore
    const { getByTestId } = render(<HapticTab {...propsWithoutOnPressIn} />);
    const tab = getByTestId("haptic-tab");

    // Should not throw error
    expect(() => {
      fireEvent(tab, "onPressIn", {});
    }).not.toThrow();
  });

  it("passes through other props to PlatformPressable", () => {
    const extraProps = {
      ...defaultProps,
      accessibilityLabel: "Test Tab",
    };

    // @ts-ignore
    const { getByTestId } = render(<HapticTab {...extraProps} />);
    const tab = getByTestId("haptic-tab");

    expect(tab.props.accessibilityLabel).toBe("Test Tab");
  });

  it("handles multiple rapid presses", () => {
    // @ts-ignore
    const { getByTestId } = render(<HapticTab {...defaultProps} />);
    const tab = getByTestId("haptic-tab");

    fireEvent(tab, "onPressIn", {});
    fireEvent(tab, "onPressIn", {});
    fireEvent(tab, "onPressIn", {});

    expect(mockOnPressIn).toHaveBeenCalledTimes(3);
  });
});
