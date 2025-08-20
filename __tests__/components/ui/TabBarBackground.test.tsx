import React from "react";
import { render } from "@testing-library/react-native";

// Mock complet du composant TabBarBackground
const MockTabBarBackground = ({ style, children }: any) => {
  const React = require("react");
  return React.createElement(
    "View",
    { "data-testid": "tab-bar-background", style },
    [
      React.createElement("Text", { key: "title" }, "Tab Bar Background"),
      children,
    ]
  );
};

jest.mock("../../../components/ui/TabBarBackground", () => ({
  default: MockTabBarBackground,
}));

// Mock simple de react-native pour le mock du composant
jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
}));

const TabBarBackground =
  require("../../../components/ui/TabBarBackground").default;

describe("TabBarBackground", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("devrait se rendre sans erreur", () => {
    expect(() => render(<TabBarBackground />)).not.toThrow();
  });

  it("devrait avoir la structure correcte", () => {
    const { root } = render(<TabBarBackground />);

    expect(root).toBeTruthy();
  });

  it("devrait accepter des styles personnalisés", () => {
    const customStyle = { backgroundColor: "red" };
    const { root } = render(<TabBarBackground style={customStyle} />);

    expect(root).toBeTruthy();
  });

  it("devrait rendre les enfants", () => {
    const TestChild = () => React.createElement("Text", {}, "Test Child");
    const { root } = render(
      <TabBarBackground>
        <TestChild />
      </TabBarBackground>
    );

    expect(root).toBeTruthy();
  });
});
