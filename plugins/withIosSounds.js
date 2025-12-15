const { withDangerousMod, withXcodeProject } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Plugin Expo - Étape 1 : Copier les fichiers CAF pour iOS
 * iOS EXIGE le format .caf (Core Audio Format) pour les sons de notification
 * Les MP3 ne fonctionnent PAS avec UNNotificationSound !
 */
const withIosSoundFiles = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const iosRoot = path.join(projectRoot, "ios");
      // ✅ iOS UNIQUEMENT : Utiliser les fichiers .caf depuis assets/sounds-ios/
      const iosSoundsDir = path.join(projectRoot, "assets/sounds-ios");

      // Trouver le nom du projet iOS
      const xcodeProjects = fs
        .readdirSync(iosRoot)
        .filter((file) => file.endsWith(".xcodeproj"));

      if (xcodeProjects.length === 0) {
        console.log("⚠️ [withIosSounds] Aucun projet Xcode trouvé");
        return config;
      }

      const projectName = xcodeProjects[0].replace(".xcodeproj", "");
      const targetDir = path.join(iosRoot, projectName);

      console.log(
        "🎵 [withIosSounds] Configuration des sons iOS (format .caf)..."
      );
      console.log(`📂 Projet: ${projectName}`);
      console.log(`📂 Source: assets/sounds-ios/ (format CAF natif iOS)`);
      console.log(`📂 Destination: ${targetDir}`);

      // Créer le dossier cible s'il n'existe pas
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Vérifier que le dossier assets/sounds-ios existe
      if (!fs.existsSync(iosSoundsDir)) {
        console.log(
          `❌ [withIosSounds] Dossier ${iosSoundsDir} introuvable`
        );
        console.log(`   ℹ️ Créez le dossier assets/sounds-ios/ avec les fichiers .caf`);
        return config;
      }

      // Copier les fichiers .caf (format natif iOS pour notifications)
      const cafFiles = fs
        .readdirSync(iosSoundsDir)
        .filter((file) => file.endsWith(".caf"));

      console.log(
        `🎵 [withIosSounds] Copie de ${cafFiles.length} fichiers .caf...`
      );

      if (cafFiles.length === 0) {
        console.log("⚠️ [withIosSounds] AUCUN fichier .caf trouvé !");
        console.log(`   Vérifiez que ${iosSoundsDir} contient des fichiers .caf`);
      } else {
        cafFiles.forEach((file) => {
          const sourcePath = path.join(iosSoundsDir, file);
          const destPath = path.join(targetDir, file);
          fs.copyFileSync(sourcePath, destPath);
          console.log(`  ✅ Copié (notification): ${file}`);
        });

        console.log(
          `✅ [withIosSounds] ${cafFiles.length} fichiers .caf copiés (format natif iOS)`
        );
      }

      // 🎵 SUPPRIMÉ : Plus besoin de copier les MP3 dans le bundle iOS
      // Les MP3 complets sont maintenant dans assets/soundsComplete-ios/
      // et sont chargés via expo-asset (comme les previews)
      console.log(
        "ℹ️ [withIosSounds] MP3 complets chargés via assets React Native (assets/soundsComplete-ios/)"
      );

      return config;
    },
  ]);
};

/**
 * Plugin Expo - Étape 2 : Ajouter une phase de build pour copier les .caf
 * Xcode copiera les fichiers .caf dans le bundle à chaque build
 */
const withIosSoundsXcode = (config) => {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;

    console.log("📦 [withIosSoundsXcode] Ajout d'une phase de build...");

    try {
      const target = xcodeProject.getFirstTarget().uuid;

      // Ajouter une phase de script qui copie UNIQUEMENT les .caf vers le bundle
      // Les MP3 complets sont maintenant chargés via assets React Native
      const buildPhase = xcodeProject.addBuildPhase(
        [],
        "PBXShellScriptBuildPhase",
        "Copy Adhan Sounds (CAF only)",
        target,
        {
          shellPath: "/bin/sh",
          shellScript: `
# Copier les sons Adhan dans le bundle
SOUNDS_CAF="$SRCROOT/../assets/sounds-ios"
SOUNDS_DEST="$BUILT_PRODUCTS_DIR/$PRODUCT_NAME.app"

# Copier les .caf pour les notifications
if [ -d "$SOUNDS_CAF" ]; then
  echo "🎵 Copie des sons .caf (notifications)..."
  cp "$SOUNDS_CAF"/*.caf "$SOUNDS_DEST/" 2>/dev/null || true
  echo "✅ Sons .caf copiés"
else
  echo "⚠️ Dossier .caf introuvable: $SOUNDS_CAF"
fi

# ℹ️ Les MP3 complets sont chargés via assets React Native (assets/soundsComplete-ios/)
# Plus besoin de les copier dans le bundle

echo "✅ Sons copiés dans: $SOUNDS_DEST"
`,
        }
      );

      if (buildPhase) {
        console.log("  ✅ Phase de build 'Copy Adhan Sounds (CAF only)' ajoutée");
        console.log("  ℹ️ .caf (notifications) copiés à chaque build");
        console.log("  ℹ️ MP3 complets chargés via assets React Native (assets/soundsComplete-ios/)");
      }

      console.log("✅ [withIosSoundsXcode] Configuration Xcode terminée");
    } catch (error) {
      console.log(`❌ [withIosSoundsXcode] Erreur: ${error.message}`);
      console.log(`   Stack: ${error.stack}`);
    }

    return config;
  });
};

module.exports = (config) => {
  // IMPORTANT: Appliquer withDangerousMod EN PREMIER
  // pour que les fichiers soient copiés AVANT que withXcodeProject s'exécute
  config = withIosSoundFiles(config);
  config = withIosSoundsXcode(config);
  return config;
};
