import React from "react";
import { View } from "react-native";

// Mock pour MaterialCommunityIcons
export const MaterialCommunityIcons = ({
  name,
  size,
  color,
  style,
  ...props
}: any) => {
  return React.createElement(View, {
    testID: `icon-${name}`,
    style: [{ width: size, height: size }, style],
    ...props,
  });
};

// Mock pour tous les autres icônes Expo
export const AntDesign = MaterialCommunityIcons;
export const Entypo = MaterialCommunityIcons;
export const EvilIcons = MaterialCommunityIcons;
export const Feather = MaterialCommunityIcons;
export const FontAwesome = MaterialCommunityIcons;
export const FontAwesome5 = MaterialCommunityIcons;
export const Foundation = MaterialCommunityIcons;
export const Ionicons = MaterialCommunityIcons;
export const MaterialIcons = MaterialCommunityIcons;
export const Octicons = MaterialCommunityIcons;
export const SimpleLineIcons = MaterialCommunityIcons;
export const Zocial = MaterialCommunityIcons;
