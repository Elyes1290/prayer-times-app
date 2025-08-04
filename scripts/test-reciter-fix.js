#!/usr/bin/env node

/**
 * 🧪 Script de test pour valider la correction des conflits de récitateurs
 *
 * Ce script simule le problème et vérifie que notre solution fonctionne
 */

console.log("🧪 Test de la correction des conflits de récitateurs\n");

// Simulation de la fonction AVANT le bug fix
function generateFileNameOLD(content) {
  // 🚨 ANCIEN CODE BUGGÉ : Même nom pour tous les récitateurs
  const fileName =
    content.fileUrl.split("/").pop() || `${content.id}.${content.type}`;
  return fileName;
}

// Simulation de la fonction APRÈS le bug fix
function generateFileNameNEW(content) {
  // ✅ NOUVEAU CODE CORRIGÉ : Nom unique par récitateur
  const originalFileName = content.fileUrl.split("/").pop() || "audio";
  const fileExtension = originalFileName.split(".").pop() || "mp3";
  const fileName = `${content.id}.${fileExtension}`;
  return fileName;
}

// Données de test
const testRecitations = [
  {
    id: "luhaidan_surah_2",
    type: "quran",
    title: "Al-Baqarah - Luhaidan",
    fileUrl: "premium/quran/luhaidan/002.mp3",
    reciter: "Luhaidan",
  },
  {
    id: "shuraim_surah_2",
    type: "quran",
    title: "Al-Baqarah - Shuraim",
    fileUrl: "premium/quran/shuraim/002.mp3",
    reciter: "Shuraim",
  },
  {
    id: "sudais_surah_2",
    type: "quran",
    title: "Al-Baqarah - Sudais",
    fileUrl: "premium/quran/sudais/002.mp3",
    reciter: "Sudais",
  },
];

console.log("📊 Résultats avec l'ANCIEN code (buggé) :");
console.log("=".repeat(50));

const oldResults = testRecitations.map((content) => ({
  reciter: content.reciter,
  fileName: generateFileNameOLD(content),
  id: content.id,
}));

oldResults.forEach((result) => {
  console.log(`🎤 ${result.reciter.padEnd(10)} → 📁 ${result.fileName}`);
});

// Détecter les conflits dans l'ancien système
const oldFileNames = oldResults.map((r) => r.fileName);
const oldDuplicates = oldFileNames.filter(
  (item, index) => oldFileNames.indexOf(item) !== index
);
const oldHasConflicts = oldDuplicates.length > 0;

console.log(`\n🚨 Conflits détectés : ${oldHasConflicts ? "OUI" : "NON"}`);
if (oldHasConflicts) {
  console.log(
    `💥 Fichiers en conflit : ${[...new Set(oldDuplicates)].join(", ")}`
  );
  console.log("⚠️  Le dernier téléchargement ÉCRASE les précédents !");
}

console.log("\n" + "=".repeat(70) + "\n");

console.log("✅ Résultats avec le NOUVEAU code (corrigé) :");
console.log("=".repeat(50));

const newResults = testRecitations.map((content) => ({
  reciter: content.reciter,
  fileName: generateFileNameNEW(content),
  id: content.id,
}));

newResults.forEach((result) => {
  console.log(`🎤 ${result.reciter.padEnd(10)} → 📁 ${result.fileName}`);
});

// Détecter les conflits dans le nouveau système
const newFileNames = newResults.map((r) => r.fileName);
const newDuplicates = newFileNames.filter(
  (item, index) => newFileNames.indexOf(item) !== index
);
const newHasConflicts = newDuplicates.length > 0;

console.log(`\n✅ Conflits détectés : ${newHasConflicts ? "OUI" : "NON"}`);
if (!newHasConflicts) {
  console.log("🎉 Tous les fichiers ont des noms uniques !");
  console.log("💾 Chaque récitateur a sa propre copie locale");
}

console.log("\n" + "=".repeat(70));

// Résumé
console.log("\n📋 RÉSUMÉ DU TEST :");
console.log(
  `🔴 Ancien système : ${oldHasConflicts ? "ÉCHEC" : "OK"} (${
    oldHasConflicts ? "conflits détectés" : "aucun conflit"
  })`
);
console.log(
  `🟢 Nouveau système : ${!newHasConflicts ? "SUCCÈS" : "ÉCHEC"} (${
    !newHasConflicts ? "aucun conflit" : "conflits détectés"
  })`
);

if (!oldHasConflicts || newHasConflicts) {
  console.log("\n❌ Le test n'a pas fonctionné comme attendu !");
  process.exit(1);
} else {
  console.log("\n🎯 Test réussi ! La correction fonctionne correctement.");
  console.log("\n💡 Maintenant :");
  console.log("   1. Al-Baqarah de Luhaidan → luhaidan_surah_2.mp3");
  console.log("   2. Al-Baqarah de Shuraim → shuraim_surah_2.mp3");
  console.log("   3. Al-Baqarah de Sudais → sudais_surah_2.mp3");
  console.log("\n✨ Chaque récitateur a sa propre copie unique !");
  process.exit(0);
}
