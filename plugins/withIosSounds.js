const {
  withDangerousMod,
  withXcodeProject,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Plugin Expo - Étape 1 : Copier les fichiers MP3
 */
const withIosSoundFiles = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const iosRoot = path.join(projectRoot, "ios");
      const androidSoundsDir = path.join(
        projectRoot,
        "android/app/src/main/res/raw"
      );

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

      console.log("🎵 [withIosSounds] Configuration des sons pour iOS...");
      console.log(`📂 Projet: ${projectName}`);
      console.log(`📂 Dossier cible: ${targetDir}`);

      // Créer le dossier cible s'il n'existe pas
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Copier tous les MP3 depuis Android
      if (!fs.existsSync(androidSoundsDir)) {
        console.log(
          `❌ [withIosSounds] Dossier Android ${androidSoundsDir} introuvable`
        );
        return config;
      }

      const mp3Files = fs
        .readdirSync(androidSoundsDir)
        .filter((file) => file.endsWith(".mp3"));

      console.log(
        `🎵 [withIosSounds] Copie de ${mp3Files.length} fichiers MP3...`
      );

      mp3Files.forEach((file) => {
        const sourcePath = path.join(androidSoundsDir, file);
        const destPath = path.join(targetDir, file);
        fs.copyFileSync(sourcePath, destPath);
        console.log(`  ✅ Copié: ${file}`);
      });

      console.log("✅ [withIosSounds] Fichiers MP3 copiés physiquement");

      return config;
    },
  ]);
};

/**
 * Plugin Expo - Étape 2 : Ajouter une phase de build pour copier les MP3
 * Xcode copiera les MP3 dans le bundle à chaque build
 */
const withIosSoundsXcode = (config) => {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;

    console.log("📦 [withIosSoundsXcode] Ajout d'une phase de build...");

    try {
      const target = xcodeProject.getFirstTarget().uuid;

      // Ajouter une phase de script qui copie les MP3 depuis Android vers Resources
      const buildPhase = xcodeProject.addBuildPhase(
        [],
        "PBXShellScriptBuildPhase",
        "Copy Adhan MP3 Sounds",
        target,
        {
          shellPath: "/bin/sh",
          shellScript: `
# Copier les sons Adhan depuis Android vers le bundle
SOUNDS_SRC="$SRCROOT/../android/app/src/main/res/raw"
SOUNDS_DEST="$BUILT_PRODUCTS_DIR/$PRODUCT_NAME.app"

if [ -d "$SOUNDS_SRC" ]; then
  echo "🎵 Copie des sons Adhan dans le bundle..."
  cp "$SOUNDS_SRC"/*.mp3 "$SOUNDS_DEST/" 2>/dev/null || true
  echo "✅ Sons copiés dans: $SOUNDS_DEST"
else
  echo "⚠️ Dossier source introuvable: $SOUNDS_SRC"
fi
`,
        }
      );

      if (buildPhase) {
        console.log(
          "  ✅ Phase de build 'Copy Adhan MP3 Sounds' ajoutée"
        );
        console.log(
          "  ℹ️ Les MP3 seront copiés dans le bundle à chaque build"
        );
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

