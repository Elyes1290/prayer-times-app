const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Plugin Expo pour ajouter use_modular_headers! au Podfile iOS
 * Nécessaire pour Firebase avec React Native
 */
module.exports = function withPodfile(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );

      if (!fs.existsSync(podfilePath)) {
        console.warn("⚠️  Podfile not found at", podfilePath);
        return config;
      }

      let podfileContent = fs.readFileSync(podfilePath, "utf-8");

      // Vérifier si use_modular_headers! est déjà présent
      if (podfileContent.includes("use_modular_headers!")) {
        console.log("✅ use_modular_headers! already present in Podfile");
        return config;
      }

      // Ajouter use_modular_headers! après la ligne target
      // Chercher la ligne "target 'NomDuProjet' do"
      const targetRegex = /(target\s+['"][^'"]+['"]\s+do)/;

      if (targetRegex.test(podfileContent)) {
        podfileContent = podfileContent.replace(
          targetRegex,
          "$1\n  use_modular_headers!"
        );

        fs.writeFileSync(podfilePath, podfileContent, "utf-8");
        console.log("✅ Added use_modular_headers! to Podfile");
      } else {
        console.warn("⚠️  Could not find target declaration in Podfile");
      }

      return config;
    },
  ]);
};
