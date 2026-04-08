const {
  withDangerousMod,
  withEntitlementsPlist,
  withXcodeProject,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Plugin Expo pour configurer le Widget Extension iOS
 * Copie UNIQUEMENT le .xcodeproj depuis le template (avec la config du widget)
 * et laisse Expo gérer le reste
 */
const withPrayerTimesWidget = (config) => {
  const APP_GROUP_ID = "group.com.drogbinho.myadhan";

  // 1. Ajouter l'App Group pour l'app principale
  config = withEntitlementsPlist(config, (config) => {
    if (!config.modResults["com.apple.security.application-groups"]) {
      config.modResults["com.apple.security.application-groups"] = [];
    }

    if (
      !config.modResults["com.apple.security.application-groups"].includes(
        APP_GROUP_ID
      )
    ) {
      config.modResults["com.apple.security.application-groups"].push(
        APP_GROUP_ID
      );
    }

    console.log(`✅ [withPrayerTimesWidget] App Group ajouté: ${APP_GROUP_ID}`);
    return config;
  });

  // 2. Copier UNIQUEMENT le .xcodeproj depuis le template
  config = withDangerousMod(config, [
    "ios",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const templateXcodeproj = path.join(
        projectRoot,
        "ios-native",
        "ios-template",
        "MyAdhanMuslimPrayerApp.xcodeproj"
      );
      const iosRoot = path.join(projectRoot, "ios");
      const targetXcodeproj = path.join(iosRoot, "MyAdhanMuslimPrayerApp.xcodeproj");

      console.log("🕌 [withPrayerTimesWidget] Configuration du widget iOS...");

      // Vérifier que le template .xcodeproj existe
      if (!fs.existsSync(templateXcodeproj)) {
        console.error(
          `❌ [withPrayerTimesWidget] Le template .xcodeproj n'existe pas: ${templateXcodeproj}`
        );
        return config;
      }

      console.log("📋 [withPrayerTimesWidget] Remplacement du .xcodeproj par le template...");

      // Supprimer le .xcodeproj généré par Expo
      if (fs.existsSync(targetXcodeproj)) {
        deleteFolder(targetXcodeproj);
      }

      // Copier le .xcodeproj du template
      copyFolderRecursiveSync(templateXcodeproj, targetXcodeproj);
      console.log("✅ .xcodeproj remplacé avec la config du widget");

          // Copier les fichiers du widget
          const widgetSourceDir = path.join(projectRoot, "ios-native", "PrayerTimesWidget");
          const widgetTargetDir = path.join(iosRoot, "PrayerTimesWidget");

          if (fs.existsSync(widgetSourceDir)) {
            console.log("📂 [withPrayerTimesWidget] Copie des fichiers du widget...");
            copyFolderRecursiveSync(widgetSourceDir, widgetTargetDir);
            console.log("✅ Fichiers du widget copiés");
            
            // 🖼️ NOUVEAU : Copier les Assets (images de fond)
            const assetsSourceDir = path.join(widgetSourceDir, "Assets.xcassets");
            const assetsTargetDir = path.join(widgetTargetDir, "Assets.xcassets");
            
            if (fs.existsSync(assetsSourceDir)) {
              console.log("🖼️ [withPrayerTimesWidget] Copie des assets du widget...");
              copyFolderRecursiveSync(assetsSourceDir, assetsTargetDir);
              console.log("✅ Assets du widget copiés");
            } else {
              console.log("⚠️ [withPrayerTimesWidget] Assets non trouvés (normal si pas encore ajoutés)");
            }
          }

      // Note: PrayerTimesWidgetModule est copié par withIosNativeModules dans ios/NativeModules/
      console.log("ℹ️ PrayerTimesWidgetModule sera copié par withIosNativeModules");

      // Copier l'entitlements du widget
      const entitlementsSource = path.join(
        projectRoot,
        "ios-native",
        "PrayerTimesWidget",
        "PrayerTimesWidgetExtension.entitlements"
      );
      const entitlementsTarget = path.join(iosRoot, "PrayerTimesWidgetExtension.entitlements");

      if (fs.existsSync(entitlementsSource)) {
        fs.copyFileSync(entitlementsSource, entitlementsTarget);
        console.log("✅ Entitlements du widget copiés");
      }

      // Créer un fichier exportOptions.plist pour spécifier les profils
      const exportOptionsPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>provisioningProfiles</key>
    <dict>
        <key>com.drogbinho.myadhan</key>
        <string>ebf79e49-9e26-4a09-b435-3d90f0c482b8</string>
        <key>com.drogbinho.myadhan.PrayerTimesWidget</key>
        <string>49YRG27697</string>
    </dict>
</dict>
</plist>`;

      const exportOptionsPath = path.join(iosRoot, "exportOptions.plist");
      fs.writeFileSync(exportOptionsPath, exportOptionsPlist);
      console.log("✅ exportOptions.plist créé avec les profils du widget");

      // 🔧 CORRECTION : Injecter les versions depuis app.json dans le project.pbxproj
      const pbxprojPath = path.join(iosRoot, "MyAdhanMuslimPrayerApp.xcodeproj", "project.pbxproj");
      
      if (fs.existsSync(pbxprojPath)) {
        console.log("🔄 Injection des versions depuis app.json...");
        
        // Lire les versions depuis la config Expo
        const appVersion = config.version || "1.0.0";
        const buildNumber = config.ios?.buildNumber || appVersion;
        
        console.log(`  📦 Version: ${appVersion}, Build: ${buildNumber}`);
        
        let pbxprojContent = fs.readFileSync(pbxprojPath, "utf8");
        
        // 🎯 INJECTER POUR L'APP PRINCIPALE + LE WIDGET
        
        // 1. Configuration Debug du widget (95A024662F4349D100408651)
        pbxprojContent = pbxprojContent.replace(
          /(95A024662F4349D100408651 \/\* Debug \*\/ = \{[\s\S]*?buildSettings = \{[\s\S]*?)(\s+MARKETING_VERSION = [^;]+;\s+)/,
          '$1'
        );
        pbxprojContent = pbxprojContent.replace(
          /(95A024662F4349D100408651 \/\* Debug \*\/ = \{[\s\S]*?buildSettings = \{[\s\S]*?)(\s+CURRENT_PROJECT_VERSION = [^;]+;\s+)/,
          '$1'
        );
        pbxprojContent = pbxprojContent.replace(
          /(95A024662F4349D100408651 \/\* Debug \*\/ = \{[\s\S]*?buildSettings = \{[\s\S]*?CODE_SIGN_STYLE = Automatic;)/,
          `$1\n\t\t\t\tCURRENT_PROJECT_VERSION = ${buildNumber};\n\t\t\t\tMARKETING_VERSION = ${appVersion};`
        );
        
        // 2. Configuration Release du widget (95A024672F4349D100408651)
        pbxprojContent = pbxprojContent.replace(
          /(95A024672F4349D100408651 \/\* Release \*\/ = \{[\s\S]*?buildSettings = \{[\s\S]*?)(\s+MARKETING_VERSION = [^;]+;\s+)/,
          '$1'
        );
        pbxprojContent = pbxprojContent.replace(
          /(95A024672F4349D100408651 \/\* Release \*\/ = \{[\s\S]*?buildSettings = \{[\s\S]*?)(\s+CURRENT_PROJECT_VERSION = [^;]+;\s+)/,
          '$1'
        );
        pbxprojContent = pbxprojContent.replace(
          /(95A024672F4349D100408651 \/\* Release \*\/ = \{[\s\S]*?buildSettings = \{[\s\S]*?CODE_SIGN_STYLE = Automatic;)/,
          `$1\n\t\t\t\tCURRENT_PROJECT_VERSION = ${buildNumber};\n\t\t\t\tMARKETING_VERSION = ${appVersion};`
        );
        
        // 3. 🆕 Configuration Debug de l'APP PRINCIPALE
        // Remplacer les versions hardcodées dans le template (CURRENT_PROJECT_VERSION = 1; et MARKETING_VERSION = 1.0;)
        pbxprojContent = pbxprojContent.replace(
          /CURRENT_PROJECT_VERSION = 1;/g,
          `CURRENT_PROJECT_VERSION = ${buildNumber};`
        );
        pbxprojContent = pbxprojContent.replace(
          /MARKETING_VERSION = 1\.0;/g,
          `MARKETING_VERSION = ${appVersion};`
        );
        
        fs.writeFileSync(pbxprojPath, pbxprojContent);
        console.log(`✅ Versions injectées pour APP + WIDGET: ${appVersion} (${buildNumber})`);
      }

      console.log("✅ [withPrayerTimesWidget] Configuration terminée !");
      console.log("🎯 Le widget est prêt à être compilé");

      return config;
    },
  ]);

  return config;
};

/**
 * Supprime un dossier récursivement
 */
function deleteFolder(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolder(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(folderPath);
  }
}

/**
 * Copie récursivement un dossier
 */
function copyFolderRecursiveSync(source, target) {
  // Créer le dossier cible s'il n'existe pas
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  // Lire tous les fichiers/dossiers
  const files = fs.readdirSync(source);

  files.forEach((file) => {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);

    try {
      if (fs.statSync(sourcePath).isDirectory()) {
        // Récursion pour les sous-dossiers
        copyFolderRecursiveSync(sourcePath, targetPath);
      } else {
        // Copier le fichier
        fs.copyFileSync(sourcePath, targetPath);
      }
    } catch (error) {
      // Ignorer les erreurs de chemins trop longs
      if (error.code !== "ENAMETOOLONG") {
        console.warn(`⚠️ Erreur lors de la copie de ${file}:`, error.message);
      }
    }
  });
}

module.exports = withPrayerTimesWidget;
