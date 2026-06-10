/**
 * Composant ImageBackground thématique
 * Change automatiquement d'image selon le mode jour/nuit
 */

import React from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import { type ImageContentFit, type ImageSource } from "expo-image";
import { useThemeAssets } from "../hooks/useThemeAssets";
import CachedImageBackground from "./CachedImageBackground";

type ThemedImageBackgroundProps = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ViewStyle>;
  contentFit?: ImageContentFit;
  fallbackSource?: ImageSource;
};

export default function ThemedImageBackground({
  children,
  style,
  imageStyle,
  contentFit,
  fallbackSource,
}: ThemedImageBackgroundProps) {
  const { backgroundImage } = useThemeAssets();

  return (
    <CachedImageBackground
      source={backgroundImage || fallbackSource}
      style={style}
      imageStyle={imageStyle}
      contentFit={contentFit}
    >
      {children}
    </CachedImageBackground>
  );
}
