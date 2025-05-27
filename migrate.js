// migrate.js
const fs = require("fs");
const path = require("path");

const TO_COPY = [
  "app",
  "assets",
  "components",
  "constants",
  "contexts",
  "hooks",
  "screens",
  "scripts",
  "utils",
  "declarations.d.ts",
  "app.json",
  ".vscode",
  "tsconfig.json",
  "expo-env.d.ts",
  ".eslintrc.js",
  ".eslint.config.js", // selon ton projet
];

const SRC = process.cwd();
const DEST = path.resolve("../prayer-times-clean"); // adapte si besoin !

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest);
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else if (exists) {
    fs.copyFileSync(src, dest);
  }
}

// Copy listed folders/files
TO_COPY.forEach((item) => {
  const from = path.join(SRC, item);
  const to = path.join(DEST, item);
  if (fs.existsSync(from)) {
    console.log(`Copying ${from} -> ${to}`);
    copyRecursiveSync(from, to);
  }
});

// Copy package.json (sans scripts et dépendances natifs)
const srcPkg = path.join(SRC, "package.json");
const destPkg = path.join(DEST, "package.json");
if (fs.existsSync(srcPkg)) {
  const oldPkg = JSON.parse(fs.readFileSync(srcPkg, "utf-8"));
  const newPkg = JSON.parse(fs.readFileSync(destPkg, "utf-8"));
  // Merging dependencies (prend ceux du nouveau projet, rajoute les tiens SANS expo-pedometer, ni trucs natifs)
  newPkg.dependencies = {
    ...newPkg.dependencies,
    ...oldPkg.dependencies,
  };
  // Idem pour devDependencies
  if (oldPkg.devDependencies) {
    newPkg.devDependencies = {
      ...newPkg.devDependencies,
      ...oldPkg.devDependencies,
    };
  }
  fs.writeFileSync(destPkg, JSON.stringify(newPkg, null, 2));
  console.log(`package.json fusionné et copié`);
}
