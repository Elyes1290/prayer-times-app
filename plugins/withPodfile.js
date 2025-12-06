const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Plugin Expo pour activer modular_headers SEULEMENT pour GoogleUtilities
 * Nécessaire pour Firebase avec React Native (sans casser React Native Hermes)
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

      // Vérifier si la configuration est déjà présente
      if (podfileContent.includes("modular_headers_for_firebase")) {
        console.log("✅ Firebase modular headers already configured in Podfile");
        return config;
      }

      // Ajouter un hook post_install pour activer modular_headers seulement pour GoogleUtilities
      const firebaseModularHeadersConfig = `
  # Configuration pour Firebase : activer modular_headers uniquement pour GoogleUtilities
  # Nécessaire pour éviter les conflits Swift avec FirebaseCoreInternal
  # Marker: modular_headers_for_firebase
  post_install do |installer|
    installer.pods_project.targets.each do |target|
      if target.name == 'GoogleUtilities'
        target.build_configurations.each do |config|
          config.build_settings['DEFINES_MODULE'] = 'YES'
        end
      end
    end
  end
`;

      // Ajouter avant le dernier "end" du Podfile
      const lines = podfileContent.split('\n');
      const lastEndIndex = lines.lastIndexOf('end');
      
      if (lastEndIndex !== -1) {
        lines.splice(lastEndIndex, 0, firebaseModularHeadersConfig);
        podfileContent = lines.join('\n');
        
        fs.writeFileSync(podfilePath, podfileContent, "utf-8");
        console.log("✅ Added Firebase modular headers configuration to Podfile");
      } else {
        console.warn("⚠️  Could not find suitable location to add Firebase configuration");
      }

      return config;
    },
  ]);
};
