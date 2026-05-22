import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import type { SymbolWeight } from "expo-symbols";
import type { ComponentProps } from "react";

export type MCIconProps = ComponentProps<typeof MaterialCommunityIcons>;
type IonIconProps = ComponentProps<typeof Ionicons>;
export type IonIconComponentProps = IonIconProps & { weight?: SymbolWeight };
export type MIconProps = ComponentProps<typeof MaterialIcons>;

/**
 * Icônes @expo/vector-icons sur toutes les plateformes (même rendu qu'Android).
 *
 * SF Symbols (expo-symbols) sont volontairement désactivés sur iOS : SymbolView
 * n'utilise `fallback` que sur Android — un symbole SF absent ou trop récent
 * affiche "?" (PrayerScreen volume-high, onglets, réglages, etc.).
 */
export function MCIcon({
  name,
  size = 24,
  color,
  style,
  ...rest
}: MCIconProps) {
  return (
    <MaterialCommunityIcons
      name={name}
      size={size}
      color={color}
      style={style}
      {...rest}
    />
  );
}

export function IonIcon({
  name,
  size = 24,
  color,
  style,
  weight: _weight,
  ...rest
}: IonIconComponentProps) {
  return (
    <Ionicons name={name} size={size} color={color} style={style} {...rest} />
  );
}

export function MIcon({
  name,
  size = 24,
  color,
  style,
  ...rest
}: MIconProps) {
  return (
    <MaterialIcons
      name={name}
      size={size}
      color={color}
      style={style}
      {...rest}
    />
  );
}
