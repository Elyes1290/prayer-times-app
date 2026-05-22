import useRNColorScheme from "react-native/Libraries/Utilities/useColorScheme";
import type { ColorSchemeName } from "react-native";

/**
 * Wrapper personnalisé pour useColorScheme de React Native
 * Permet un mocking plus facile dans les tests
 */
const useColorScheme = (): ColorSchemeName => {
  return useRNColorScheme();
};

export { useColorScheme };
