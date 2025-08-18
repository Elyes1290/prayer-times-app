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

// 🚨 NOUVEAU : Configuration pour éviter les reloads automatiques problématiques
defaultConfig.transformer = {
  ...defaultConfig.transformer,
  // Désactiver le hot reload automatique qui peut causer des redirections
  hot: false,
  // Réduire la fréquence des vérifications de changements
  watchFolders: [__dirname],
  // Optimiser la détection des changements
  resolver: {
    ...defaultConfig.resolver,
    // Éviter les recompilations automatiques trop fréquentes
    unstable_enableSymlinks: false,
  },
};

// Optimisations pour production
defaultConfig.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Configuration des assets
defaultConfig.resolver.assetExts.push("db", "mp3", "wav", "ogg");

// Tree shaking amélioré
defaultConfig.resolver.platforms = ["native", "android", "ios"];

// Cache optimisé
defaultConfig.resetCache = false;

module.exports = defaultConfig;
