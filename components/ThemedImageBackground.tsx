/**
 * Composant ImageBackground thématique
 * Change automatiquement d'image selon le mode jour/nuit
 */

import React from "react";
import { ImageBackground, ImageBackgroundProps } from "react-native";
import { useThemeAssets } from "@/hooks/useThemeAssets";

interface ThemedImageBackgroundProps
  extends Omit<ImageBackgroundProps, "source"> {
  // On peut ajouter des props personnalisées si nécessaire
  fallbackSource?: any;
}

export default function ThemedImageBackground({
  children,
  style,
  fallbackSource,
  ...props
}: ThemedImageBackgroundProps) {
  const { backgroundImage } = useThemeAssets();

  return (
    <ImageBackground
      source={backgroundImage || fallbackSource}
      style={style}
      {...props}
    >
      {children}
    </ImageBackground>
  );
}
