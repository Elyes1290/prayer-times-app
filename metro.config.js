/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */

const { getDefaultConfig } = require("expo/metro-config");

const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver.sourceExts.push("cjs", "mjs", "js", "json", "ts", "tsx");

module.exports = defaultConfig;
