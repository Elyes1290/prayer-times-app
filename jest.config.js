module.exports = {
  preset: "react-native",
  setupFiles: ["./setupTests.js"],
  testEnvironment: "node",
  transformIgnorePatterns: [
    "node_modules/(?!(jest-)?react-native|@react-native|@react-navigation|@expo/vector-icons|expo-.*|@expo/.*|expo-linear-gradient|expo-av|expo-location|expo-notifications|expo-router|expo-constants|expo-font|expo-haptics|expo-image|expo-blur|expo-dev-client|expo-linking|expo-localization|expo-modules-core|expo-navigation-bar|expo-sensors|expo-splash-screen|expo-status-bar|expo-symbols|expo-system-ui|expo-web-browser)",
  ],
  testTimeout: 30000,
  setupFilesAfterEnv: ["@testing-library/jest-native/extend-expect"],
  collectCoverageFrom: [
    "components/**/*.{ts,tsx}",
    "screens/**/*.{ts,tsx}",
    "contexts/**/*.{ts,tsx}",
    "hooks/**/*.{ts,tsx}",
    "utils/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/coverage/**",
    "!**/__tests__/**",
    "!**/__mocks__/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  moduleNameMapper: {
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
      "<rootDir>/__mocks__/fileMock.js",
    // Mocks pour les modules problématiques
    "^../utils/audioStreaming$": "<rootDir>/__mocks__/audioStreaming.ts",
    "^../utils/premiumContent$": "<rootDir>/__mocks__/premiumContent.ts",
    "^../utils/CDNOptimizer$": "<rootDir>/__mocks__/CDNOptimizer.ts",
    // Mock pour @expo/vector-icons
    "^@expo/vector-icons$": "<rootDir>/__mocks__/vectorIcons.ts",
    // Mock pour expo-linear-gradient
    "^expo-linear-gradient$": "<rootDir>/__mocks__/expoLinearGradient.ts",
    // Mock pour expo-av
    "^expo-av$": "<rootDir>/__mocks__/expoAv.ts",
    // Mock pour expo-location
    "^expo-location$": "<rootDir>/__mocks__/expoLocation.ts",
    // Mock pour expo-router
    "^expo-router$": "<rootDir>/__mocks__/expoRouter.ts",
  },
  // Configuration pour les modules ES6
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  globals: {
    "ts-jest": {
      useESM: true,
    },
  },
};
