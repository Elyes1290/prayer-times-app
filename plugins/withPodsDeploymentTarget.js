const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MARKER = "Pods deployment target floor";
const MIN_TARGET = "15.1";

const PODS_PATCH = `
    # ${MARKER}: les derniers Xcode (SDK récents) refusent les cibles < 15.0.
    # Certains pods (RevenueCat, SDWebImage, AsyncStorage, RNSVG...) déclarent 9.0 à 13.4 :
    # on remonte toutes les cibles des Pods à ${MIN_TARGET} (comme l'app).
    min_pods_target = Gem::Version.new('${MIN_TARGET}')
    installer.pods_project.build_configurations.each do |build_config|
      current = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
      if current.nil? || Gem::Version.new(current.to_s) < min_pods_target
        build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MIN_TARGET}'
      end
    end
    installer.pods_project.targets.each do |pod_target|
      pod_target.build_configurations.each do |build_config|
        current = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current.nil? || Gem::Version.new(current.to_s) < min_pods_target
          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MIN_TARGET}'
        end
      end
    end
`;

/**
 * Corrige l'erreur EAS (Xcode récent) :
 * "IPHONEOS_DEPLOYMENT_TARGET is set to 13.0, but the range of supported deployment target
 *  versions is 15.0 to ..." (RevenueCat, SDWebImage, RNCAsyncStorage, RNSVG...).
 */
const withPodsDeploymentTarget = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, "Podfile");

      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      const podfileContent = fs.readFileSync(podfilePath, "utf8");
      if (podfileContent.includes(MARKER)) {
        return config;
      }

      const updated = podfileContent.replace(
        /(react_native_post_install\([\s\S]*?\)\n)/m,
        `$1${PODS_PATCH}\n`,
      );

      if (updated !== podfileContent) {
        fs.writeFileSync(podfilePath, updated);
        console.log(`  ✅ Podfile: cibles de déploiement des Pods remontées à ${MIN_TARGET}`);
      } else {
        console.warn("  ⚠️ Podfile: bloc react_native_post_install introuvable, correctif non appliqué");
      }

      return config;
    },
  ]);
};

module.exports = withPodsDeploymentTarget;
