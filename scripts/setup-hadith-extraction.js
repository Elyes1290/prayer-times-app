#!/usr/bin/env node

/**
 * ⚙️ SCRIPT DE CONFIGURATION - Extraction Hadiths
 * Configure l'environnement pour l'extraction des hadiths
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setup() {
  console.log("⚙️  CONFIGURATION DE L'EXTRACTION DES HADITHS");
  console.log("=".repeat(50));
  console.log("Ce script va vous aider à configurer l'extraction des hadiths.");
  console.log("Vous aurez besoin d'une clé API de hadithapi.com\n");

  // 1. Vérifier si une clé existe déjà
  const envFile = path.join(__dirname, "..", ".env");
  let existingKey = "";

  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, "utf8");
    const match = envContent.match(/HADITH_API_KEY=(.+)/);
    if (match) {
      existingKey = match[1];
    }
  }

  if (existingKey) {
    console.log(
      `🔑 Clé API existante trouvée: ${existingKey.substring(0, 8)}...`
    );
    const useExisting = await question(
      "Voulez-vous utiliser cette clé ? (y/n): "
    );
    if (
      useExisting.toLowerCase() === "y" ||
      useExisting.toLowerCase() === "yes"
    ) {
      console.log("✅ Utilisation de la clé existante");
      rl.close();
      return;
    }
  }

  // 2. Demander la nouvelle clé
  console.log("\n📝 Pour obtenir une clé API:");
  console.log("   1. Allez sur https://hadithapi.com/");
  console.log("   2. Créez un compte gratuit");
  console.log("   3. Générez une clé API dans votre dashboard");
  console.log("   4. La clé gratuite permet 1000 requêtes/mois\n");

  const apiKey = await question("Entrez votre clé API hadithapi.com: ");

  if (!apiKey || apiKey.trim().length === 0) {
    console.log(
      "❌ Aucune clé fournie. Utilisation de la clé de démo (limitations)."
    );
    rl.close();
    return;
  }

  // 3. Tester la clé
  console.log("\n🧪 Test de la clé API...");
  try {
    const response = await fetch(
      `https://hadithapi.com/api/books?apiKey=${apiKey}`
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    console.log(
      `✅ Clé valide ! ${data.books?.length || 0} livres disponibles`
    );
  } catch (error) {
    console.log(`❌ Erreur avec la clé: ${error.message}`);
    console.log(
      "⚠️  La clé sera quand même sauvegardée, mais l'extraction pourrait échouer."
    );
  }

  // 4. Sauvegarder la clé
  console.log("\n💾 Sauvegarde de la clé...");

  let envContent = "";
  if (fs.existsSync(envFile)) {
    envContent = fs.readFileSync(envFile, "utf8");
  }

  // Remplacer ou ajouter la clé
  if (envContent.includes("HADITH_API_KEY=")) {
    envContent = envContent.replace(
      /HADITH_API_KEY=.*/,
      `HADITH_API_KEY=${apiKey}`
    );
  } else {
    envContent += `\nHADITH_API_KEY=${apiKey}\n`;
  }

  fs.writeFileSync(envFile, envContent, "utf8");
  console.log(`✅ Clé sauvegardée dans ${envFile}`);

  // 5. Créer le répertoire de sortie
  const outputDir = path.join(__dirname, "..", "assets", "hadith-offline-data");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`✅ Répertoire créé: ${outputDir}`);
  }

  console.log("\n🎉 CONFIGURATION TERMINÉE !");
  console.log("Vous pouvez maintenant lancer l'extraction avec:");
  console.log("   node scripts/extract-hadiths.js");
  console.log("\nOu tester l'API avec:");
  console.log("   node scripts/test-hadith-api.js");

  rl.close();
}

setup().catch(console.error);
