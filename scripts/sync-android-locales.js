/**
 * Copie locales/*.json vers android/app/src/main/assets/locales_XX.json
 * (widgets natifs + services Android lisent ces fichiers, pas le bundle Metro).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const LOCALES_DIR = path.join(ROOT, "locales");
const ASSETS_DIR = path.join(ROOT, "android", "app", "src", "main", "assets");

const LANG_FILES = [
  "ar",
  "bn",
  "de",
  "en",
  "es",
  "fa",
  "fr",
  "it",
  "nl",
  "pt",
  "ru",
  "tr",
  "ur",
];

function main() {
  if (!fs.existsSync(ASSETS_DIR)) {
    console.error("❌ Dossier assets introuvable:", ASSETS_DIR);
    process.exit(1);
  }

  let copied = 0;
  for (const lang of LANG_FILES) {
    const src = path.join(LOCALES_DIR, `${lang}.json`);
    const dest = path.join(ASSETS_DIR, `locales_${lang}.json`);
    if (!fs.existsSync(src)) {
      console.warn(`⚠️ Manquant: ${src}`);
      continue;
    }
    fs.copyFileSync(src, dest);
    copied++;
    console.log(`✅ locales_${lang}.json`);
  }

  console.log(`\n📦 ${copied} fichier(s) synchronisé(s) vers android/app/src/main/assets/`);
}

main();
