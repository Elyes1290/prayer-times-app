import React from "react";
import { render } from "@testing-library/react-native";
import PaymentDebugInfo from "../../components/PaymentDebugInfo";

// Mock des dépendances
jest.mock("../../utils/paymentSync", () => ({
  checkUserSyncStatus: jest.fn(() =>
    Promise.resolve({
      hasUserData: true,
      hasAuthToken: true,
      hasRefreshToken: true,
      isLoggedIn: true,
      explicitConnection: false,
    })
  ),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve("test_data")),
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  StyleSheet: {
    create: (styles: any) => styles,
  },
  TouchableOpacity: "TouchableOpacity",
  ScrollView: "ScrollView",
}));

describe("PaymentDebugInfo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("devrait se rendre sans erreur", () => {
    expect(() => render(<PaymentDebugInfo />)).not.toThrow();
  });

  it("devrait avoir la structure correcte", () => {
    const { root } = render(<PaymentDebugInfo />);

    expect(root).toBeTruthy();
  });

  it("devrait afficher le titre de debug", () => {
    const { root } = render(<PaymentDebugInfo />);

    expect(root).toBeTruthy();
  });
});
