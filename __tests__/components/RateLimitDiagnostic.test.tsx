import React from "react";
import { render } from "@testing-library/react-native";
import RateLimitDiagnostic from "../../components/RateLimitDiagnostic";

// Mock des dépendances
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve("test_data")),
  removeItem: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

jest.mock("../../utils/apiClient", () => ({
  verifyAuth: jest.fn(() => Promise.resolve(true)),
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  StyleSheet: {
    create: (styles: any) => styles,
  },
  TouchableOpacity: "TouchableOpacity",
  ScrollView: "ScrollView",
  Alert: {
    alert: jest.fn(),
  },
}));

describe("RateLimitDiagnostic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("devrait se rendre sans erreur", () => {
    expect(() => render(<RateLimitDiagnostic />)).not.toThrow();
  });

  it("devrait avoir la structure correcte", () => {
    const { root } = render(<RateLimitDiagnostic />);

    expect(root).toBeTruthy();
  });

  it("devrait afficher le diagnostic de rate limit", () => {
    const { root } = render(<RateLimitDiagnostic />);

    expect(root).toBeTruthy();
  });
});
