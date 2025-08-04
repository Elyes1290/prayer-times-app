import React from "react";
import { View } from "react-native";

export const LinearGradient = ({ children, style, ...props }: any) => {
  return React.createElement(
    View,
    {
      style: [{ backgroundColor: "#4ECDC4" }, style],
      ...props,
    },
    children
  );
};
