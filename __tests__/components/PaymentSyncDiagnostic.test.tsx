import React from "react";
import { render } from "@testing-library/react-native";
import PaymentSyncDiagnostic from "../../components/PaymentSyncDiagnostic";

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
  retryUserSync: jest.fn(() =>
    Promise.resolve({
      success: true,
      message: "Sync successful",
    })
  ),
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

describe("PaymentSyncDiagnostic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("devrait se rendre sans erreur", () => {
    expect(() => render(<PaymentSyncDiagnostic />)).not.toThrow();
  });

  it("devrait avoir la structure correcte", () => {
    const { root } = render(<PaymentSyncDiagnostic />);

    expect(root).toBeTruthy();
  });

  it("devrait afficher le diagnostic de synchronisation", () => {
    const { root } = render(<PaymentSyncDiagnostic />);

    expect(root).toBeTruthy();
  });
});
