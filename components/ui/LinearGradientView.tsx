import React from "react";
import {
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";

export type LinearGradientPoint = { x: number; y: number };

export type LinearGradientProps = ViewProps & {
  colors: readonly string[];
  locations?: readonly number[] | null;
  start?: LinearGradientPoint | null;
  end?: LinearGradientPoint | null;
};

function normalizePoint(
  point: LinearGradientPoint | null | undefined
): LinearGradientPoint {
  return point ?? { x: 0.5, y: 0.5 };
}

function directionFromPoints(
  start: LinearGradientPoint,
  end: LinearGradientPoint
): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (Math.abs(dx) < 0.01 && dy > 0) return "to bottom";
  if (Math.abs(dx) < 0.01 && dy < 0) return "to top";
  if (Math.abs(dy) < 0.01 && dx > 0) return "to right";
  if (Math.abs(dy) < 0.01 && dx < 0) return "to left";
  const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return `${angle}deg`;
}

function buildGradientImage(
  colors: readonly string[],
  locations: readonly number[] | undefined,
  start: LinearGradientPoint,
  end: LinearGradientPoint
): string {
  const stops = colors.map((color, index) => {
    const pct =
      locations && locations[index] != null
        ? `${Math.round(locations[index]! * 100)}%`
        : colors.length === 1
          ? "0%"
          : `${Math.round((index / (colors.length - 1)) * 100)}%`;
    return `${color} ${pct}`;
  });
  return `linear-gradient(${directionFromPoints(start, end)}, ${stops.join(", ")})`;
}

/** Remplacement de expo-linear-gradient via experimental_backgroundImage (RN New Architecture). */
export function LinearGradient({
  colors,
  locations,
  start,
  end,
  style,
  children,
  ...rest
}: LinearGradientProps) {
  const gradientStart = normalizePoint(start);
  const gradientEnd = normalizePoint(end);
  const backgroundImage = buildGradientImage(
    colors,
    locations ?? undefined,
    gradientStart,
    gradientEnd
  );

  return (
    <View
      {...rest}
      style={[
        style as StyleProp<ViewStyle>,
        { experimental_backgroundImage: backgroundImage },
      ]}
    >
      {children}
    </View>
  );
}
