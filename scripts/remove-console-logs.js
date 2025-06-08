#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Dossiers à traiter
const dirsToProcess = ["screens", "contexts", "utils", "hooks", "components"];

// Extensions de fichiers à traiter
const extensions = [".ts", ".tsx", ".js", ".jsx"];

function removeConsoleLogsFromFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");

  // Regex plus intelligente pour supprimer les console.log complets
  // Gère les console.log multilignes et préserve la syntaxe
  let cleanContent = content;

  // Supprime les console.log simples sur une ligne
  cleanContent = cleanContent.replace(/^\s*console\.log\([^)]*\);\s*$/gm, "");

  // Supprime les console.log multilignes
  cleanContent = cleanContent.replace(
    /console\.log\s*\(\s*[\s\S]*?\);\s*/g,
    ""
  );

  // Supprime les console.error, console.warn, etc.
  cleanContent = cleanContent.replace(
    /^\s*console\.(error|warn|info|debug)\([^)]*\);\s*$/gm,
    ""
  );

  // Nettoie les lignes vides en trop (max 2 lignes vides consécutives)
  cleanContent = cleanContent.replace(/\n\s*\n\s*\n+/g, "\n\n");

  if (content !== cleanContent) {
    fs.writeFileSync(filePath, cleanContent);
    console.log(`✅ Console.log supprimés de : ${filePath}`);
    return true;
  }

  return false;
}

function processDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`⚠️ Dossier non trouvé : ${dirPath}`);
    return;
  }

  const files = fs.readdirSync(dirPath);
  let processedCount = 0;

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      processDirectory(filePath); // Récursif
    } else if (extensions.some((ext) => file.endsWith(ext))) {
      if (removeConsoleLogsFromFile(filePath)) {
        processedCount++;
      }
    }
  });

  if (processedCount > 0) {
    console.log(`📂 ${dirPath}: ${processedCount} fichiers traités`);
  }
}

console.log(
  "🧹 Suppression intelligente des console.log pour la production...\n"
);

// Traiter chaque dossier
dirsToProcess.forEach((dir) => {
  const fullPath = path.resolve(process.cwd(), dir);
  processDirectory(fullPath);
});

console.log("\n✅ Nettoyage terminé ! Prêt pour la production 🚀");
