import { View, type ViewProps } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  morningColor?: string;   // 🌅 NOUVEAU : Support thème matin
  sunsetColor?: string;    // 🌆 NOUVEAU : Support thème crépuscule
};

export function ThemedView({ 
  style, 
  lightColor, 
  darkColor, 
  morningColor, 
  sunsetColor, 
  ...otherProps 
}: ThemedViewProps) {
  const backgroundColor = useThemeColor(
    { 
      light: lightColor, 
      dark: darkColor,
      morning: morningColor,
      sunset: sunsetColor 
    }, 
    'background'
  );

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
