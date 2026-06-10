import React from "react";
import {
  View,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Image, type ImageContentFit, type ImageSource } from "expo-image";

type CachedImageBackgroundProps = {
  source: ImageSource;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ViewStyle>;
  contentFit?: ImageContentFit;
  children?: React.ReactNode;
};

export default function CachedImageBackground({
  source,
  style,
  imageStyle,
  contentFit = "cover",
  children,
}: CachedImageBackgroundProps) {
  return (
    <View style={style}>
      <Image
        source={source}
        style={[StyleSheet.absoluteFill, imageStyle]}
        contentFit={contentFit}
      />
      {children}
    </View>
  );
}
