const { withDangerousMod, withPlugins } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Plugin Expo custom pour intégrer les modules natifs iOS
 *
 * Ce plugin :
 * 1. Copie tous les modules Swift depuis ios-native/ vers le projet iOS
 * 2. Ajoute les dépendances au Podfile
 * 3. Copie les sons d'Adhan dans le bundle iOS pour les notifications
 */
const withIosNativeModules = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const iosRoot = config.modRequest.platformProjectRoot;
      const nativeModulesPath = path.join(projectRoot, "ios-native");
      const soundsPath = path.join(projectRoot, "assets", "sounds");

      // Trouver le nom du projet iOS
      const iosProjectFiles = fs
        .readdirSync(iosRoot)
        .filter((f) => f.endsWith(".xcodeproj"));
      if (iosProjectFiles.length === 0) {
        console.error("❌ Aucun projet Xcode trouvé dans", iosRoot);
        return config;
      }
      const projectName = iosProjectFiles[0].replace(".xcodeproj", "");
      const iosProjectTargetDir = path.join(iosRoot, projectName);

      console.log(`📱 Configuration iOS pour: ${projectName}`);

      // 1. COPIE DES MODULES NATIFS
      if (fs.existsSync(nativeModulesPath)) {
        const destNativeModulesPath = path.join(iosRoot, "NativeModules");
        if (!fs.existsSync(destNativeModulesPath)) {
          fs.mkdirSync(destNativeModulesPath, { recursive: true });
        }

        const copyRecursive = (src, dest) => {
          if (!fs.existsSync(src)) return;
          if (fs.statSync(src).isDirectory()) {
            if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
            fs.readdirSync(src).forEach((file) => {
              copyRecursive(path.join(src, file), path.join(dest, file));
            });
          } else {
            fs.copyFileSync(src, dest);
          }
        };

        copyRecursive(nativeModulesPath, destNativeModulesPath);
        console.log("  ✅ Modules natifs copiés");
      }

      // 2. COPIE DES SONS (CRITIQUE POUR IOS)
      if (fs.existsSync(soundsPath)) {
        console.log("  🎵 Copie des sons d'Adhan vers le bundle iOS...");
        // S'assurer que le dossier de destination existe (normalement oui car c'est la racine du projet)
        if (!fs.existsSync(iosProjectTargetDir)) {
          console.warn(
            `⚠️ Dossier cible ${iosProjectTargetDir} introuvable, tentative copie dans racine iOS`
          );
        }

        fs.readdirSync(soundsPath).forEach((file) => {
          if (file.endsWith(".mp3")) {
            const src = path.join(soundsPath, file);
            // Sur iOS, les sons doivent être à la racine du target pour être trouvés par UNNotificationSound
            const dest = path.join(iosProjectTargetDir, file);
            fs.copyFileSync(src, dest);
          }
        });
        console.log("  ✅ Sons copiés avec succès");
      }

      // 3. CONFIGURATION PODFILE
      const podfilePath = path.join(iosRoot, "Podfile");
      if (fs.existsSync(podfilePath)) {
        let podfileContent = fs.readFileSync(podfilePath, "utf8");
        if (!podfileContent.includes("pod 'AdhanModule'")) {
          const nativeModulesPods = `
  # 📱 Modules Natifs iOS MyAdhan
  pod 'Adhan', '~> 1.3.0'
  pod 'AdhanModule', :path => './NativeModules'
  pod 'QuranAudioServiceModule', :path => './NativeModules'
  pod 'DownloadModule', :path => './NativeModules'
  pod 'QuranWidgetModule', :path => './NativeModules'
`;
          podfileContent = podfileContent.replace(
            "use_expo_modules!",
            `use_expo_modules!${nativeModulesPods}`
          );
          fs.writeFileSync(podfilePath, podfileContent);
          console.log("  ✅ Podfile mis à jour");
        }
      }

      return config;
    },
  ]);
};

module.exports = withIosNativeModules;
