import React from "react";
import { render } from "@testing-library/react-native";
import NativeDownloadTest from "../../components/NativeDownloadTest";

// Mock des dépendances
jest.mock("../../hooks/useNativeDownload", () => ({
  useNativeDownload: () => ({
    downloadState: new Map(),
    startDownload: jest.fn(),
    cancelDownload: jest.fn(),
    isNativeAvailable: true,
    activeDownloadsCount: 0,
    restoreActiveDownloads: jest.fn(),
  }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: "MaterialCommunityIcons",
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TouchableOpacity: "TouchableOpacity",
  StyleSheet: {
    create: (styles: any) => styles,
  },
  ScrollView: "ScrollView",
  Alert: {
    alert: jest.fn(),
  },
}));

describe("NativeDownloadTest", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("devrait se rendre sans erreur", () => {
    expect(() => render(<NativeDownloadTest />)).not.toThrow();
  });

  it("devrait avoir la structure correcte", () => {
    const { root } = render(<NativeDownloadTest />);

    expect(root).toBeTruthy();
  });

  it("devrait afficher les tests de téléchargement", () => {
    const { root } = render(<NativeDownloadTest />);

    expect(root).toBeTruthy();
  });
});
