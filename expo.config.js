const { getDefaultConfig } = require("expo/metro-config");

const defaultConfig = getDefaultConfig(__dirname);

module.exports = {
  ...defaultConfig,
  // 🚨 NOUVEAU : Désactiver complètement le hot reload en mode développement
  development: {
    hot: false,
    fastRefresh: false,
    liveReload: false,
  },
  // Configuration Metro optimisée
  transformer: {
    ...defaultConfig.transformer,
    // Désactiver le hot reload automatique
    hot: false,
    // Réduire la fréquence des vérifications de changements
    watchFolders: [__dirname],
    // Optimiser la détection des changements
    resolver: {
      ...defaultConfig.resolver,
      // Éviter les recompilations automatiques trop fréquentes
      unstable_enableSymlinks: false,
    },
  },
  // Configuration des assets
  resolver: {
    ...defaultConfig.resolver,
    assetExts: [
      ...(defaultConfig.resolver.assetExts || []),
      "db",
      "mp3",
      "wav",
      "ogg",
    ],
    sourceExts: [
      ...(defaultConfig.resolver.sourceExts || []),
      "cjs",
      "mjs",
      "js",
      "json",
      "ts",
      "tsx",
    ],
  },
  // Optimisations pour production
  transformer: {
    ...defaultConfig.transformer,
    minifierConfig: {
      keep_fnames: true,
      mangle: {
        keep_fnames: true,
      },
    },
  },
};
