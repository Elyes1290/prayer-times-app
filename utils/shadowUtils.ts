/**
 * Converts a color string (hex or rgba/rgb) to rgba with the given opacity.
 * Used to build `boxShadow` values from dynamic theme colors.
 */
function colorToRgba(color: string | undefined | null, opacity: number): string {
  if (color == null || typeof color !== "string" || color === "") {
    return `rgba(0,0,0,${opacity})`;
  }
  if (color.startsWith("rgba(")) {
    return color.replace(/,\s*[\d.]+\)$/, `,${opacity})`);
  }
  if (color.startsWith("rgb(")) {
    return color.replace("rgb(", "rgba(").replace(")", `,${opacity})`);
  }
  if (color.startsWith("#")) {
    const hex = color.replace("#", "");
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${opacity})`;
  }
  return color;
}

/**
 * Builds a CSS `boxShadow` string equivalent to React Native legacy shadow props.
 *
 * @param color    Theme color string (hex or rgba)
 * @param offsetX  shadowOffset.width
 * @param offsetY  shadowOffset.height
 * @param blur     shadowRadius
 * @param opacity  shadowOpacity
 */
export function makeBoxShadow(
  color: string | undefined | null,
  offsetX: number,
  offsetY: number,
  blur: number,
  opacity: number
): string {
  return `${offsetX}px ${offsetY}px ${blur}px ${colorToRgba(color, opacity)}`;
}
