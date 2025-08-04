/**
 * Metro configuration for React Native - OPTIMISÉ
 * https://github.com/facebook/react-native
 *
 * @format
 */

const { getDefaultConfig } = require("expo/metro-config");

const defaultConfig = getDefaultConfig(__dirname);

// Extensions supportées
defaultConfig.resolver.sourceExts.push("cjs", "mjs", "js", "json", "ts", "tsx");

// Optimisations pour production
defaultConfig.transformer = {
  ...defaultConfig.transformer,
  minifierConfig: {
    mangle: {
      keep_fnames: false,
    },
    output: {
      ascii_only: true,
    },
  },
};

// Tree shaking amélioré
defaultConfig.resolver.platforms = ["native", "android", "ios"];

// Cache optimisé
defaultConfig.resetCache = false;

module.exports = defaultConfig;
