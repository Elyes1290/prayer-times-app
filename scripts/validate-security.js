#!/usr/bin/env node

/**
 * Script de validation de la configuration de sécurité
 * Vérifie que les variables sensibles sont bien configurées
 */

const fs = require("fs");
const path = require("path");

console.log("🔍 Validation de la configuration de sécurité...\n");

let hasErrors = false;

// 1. Vérifier que gradle.properties existe et contient les variables
const gradlePropsPath = path.join(__dirname, "../android/gradle.properties");
if (fs.existsSync(gradlePropsPath)) {
  const gradleContent = fs.readFileSync(gradlePropsPath, "utf8");

  if (gradleContent.includes("MYAPP_RELEASE_STORE_PASSWORD=")) {
    console.log("✅ Variables Android configurées dans gradle.properties");
  } else {
    console.log("❌ Variables Android manquantes dans gradle.properties");
    hasErrors = true;
  }
} else {
  console.log("❌ Fichier android/gradle.properties manquant");
  hasErrors = true;
}

// 2. Vérifier app.config.js
const appConfigPath = path.join(__dirname, "../app.config.js");
if (fs.existsSync(appConfigPath)) {
  const appConfigContent = fs.readFileSync(appConfigPath, "utf8");

  if (appConfigContent.includes("hadithApiKey")) {
    console.log("✅ Configuration API key dans app.config.js");
  } else {
    console.log("❌ Configuration API key manquante dans app.config.js");
    hasErrors = true;
  }
} else {
  console.log("❌ Fichier app.config.js manquant");
  hasErrors = true;
}

// 3. Vérifier que les fichiers sensibles sont dans .gitignore
const gitignorePath = path.join(__dirname, "../.gitignore");
if (fs.existsSync(gitignorePath)) {
  const gitignoreContent = fs.readFileSync(gitignorePath, "utf8");

  if (gitignoreContent.includes("android/gradle.properties")) {
    console.log("✅ gradle.properties ignoré par Git");
  } else {
    console.log("⚠️  gradle.properties pourrait ne pas être ignoré par Git");
  }
} else {
  console.log("❌ Fichier .gitignore manquant");
  hasErrors = true;
}

// 4. Vérifier qu'aucune clé n'est hardcodée dans le code
const checkHardcodedKeys = (dir, exclude = []) => {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !exclude.includes(file)) {
      checkHardcodedKeys(filePath, [
        "node_modules",
        ".git",
        ".expo",
        "android",
        "ios",
      ]);
    } else if (
      file.endsWith(".ts") ||
      file.endsWith(".tsx") ||
      file.endsWith(".js")
    ) {
      const content = fs.readFileSync(filePath, "utf8");

      // Chercher des patterns suspects (mais pas dans les commentaires)
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (
          line.includes("$2y$10$") &&
          !line.trim().startsWith("//") &&
          !line.includes("Constants.expoConfig")
        ) {
          console.log(
            `⚠️  Clé potentiellement hardcodée dans ${filePath}:${i + 1}`
          );
        }
      }
    }
  }
};

console.log("🔍 Recherche de clés hardcodées...");
checkHardcodedKeys(path.join(__dirname, "../screens"));
checkHardcodedKeys(path.join(__dirname, "../utils"));
checkHardcodedKeys(path.join(__dirname, "../contexts"));

console.log("\n" + "=".repeat(50));

if (hasErrors) {
  console.log("❌ Des problèmes de sécurité ont été détectés !");
  console.log(
    "📖 Consultez SECURITY.md pour les instructions de configuration"
  );
  process.exit(1);
} else {
  console.log("✅ Configuration de sécurité valide !");
  console.log("🚀 Votre app est prête pour la production");
}
