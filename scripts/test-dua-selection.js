/**
 * 🧪 Script de test pour la nouvelle logique de sélection des duas
 * Simule la logique Java du widget pour vérifier la distribution
 */

// Simulation de la nouvelle formule de sélection
function calculateDuaIndex(dayOfYear, year, month, dayOfMonth, hour) {
  // Même formule que dans le widget Java
  const combinedSeed =
    dayOfYear * 31 + year * 7 + month * 13 + dayOfMonth * 17 + hour * 23;
  return Math.abs(combinedSeed) % 58; // 🆕 CORRIGÉ: 58 duas disponibles (au lieu de 50)
}

// Test de distribution sur 30 jours
function testDistribution() {
  console.log("🎲 Test de distribution des index dua sur 30 jours");
  console.log("📊 Utilisant la nouvelle formule améliorée");
  console.log("=".repeat(60));

  const results = new Map();
  const today = new Date();

  for (let day = 0; day < 30; day++) {
    const testDate = new Date(today);
    testDate.setDate(today.getDate() + day);

    const dayOfYear = Math.floor(
      (testDate - new Date(testDate.getFullYear(), 0, 0)) /
        (1000 * 60 * 60 * 24)
    );
    const year = testDate.getFullYear();
    const month = testDate.getMonth() + 1;
    const dayOfMonth = testDate.getDate();
    const hour = 12; // Heure fixe pour le test

    const index = calculateDuaIndex(dayOfYear, year, month, dayOfMonth, hour);

    // Compter les occurrences
    results.set(index, (results.get(index) || 0) + 1);

    const dateStr = testDate.toISOString().split("T")[0];
    console.log(
      `📅 ${dateStr} → Index: ${index} (jour ${dayOfYear}, mois ${month}, jour ${dayOfMonth})`
    );
  }

  console.log("\n📊 Distribution des index:");
  console.log("=".repeat(60));

  const sortedResults = Array.from(results.entries()).sort(
    (a, b) => a[0] - b[0]
  );
  let totalSelections = 0;

  for (const [index, count] of sortedResults) {
    totalSelections += count;
    const percentage = ((count / 30) * 100).toFixed(1);
    const bar = "█".repeat(Math.round(count / 2));
    console.log(
      `Index ${index.toString().padStart(2)}: ${count
        .toString()
        .padStart(2)} fois (${percentage}%) ${bar}`
    );
  }

  console.log(
    `\n✅ Total: ${totalSelections} sélections sur ${results.size} index uniques`
  );
  console.log(
    `📈 Couverture: ${((results.size / 58) * 100).toFixed(
      1
    )}% des duas utilisés`
  );

  // Vérifier l'équité
  const expectedCount = 30 / 58; // 🆕 CORRIGÉ: 0.52 par index en moyenne (au lieu de 0.6)
  const variance =
    Array.from(results.values()).reduce((sum, count) => {
      return sum + Math.pow(count - expectedCount, 2);
    }, 0) / results.size;

  console.log(
    `📊 Variance: ${variance.toFixed(2)} (plus c'est bas, plus c'est équitable)`
  );

  if (variance < 2) {
    console.log("🎯 Distribution TRÈS ÉQUITABLE ✅");
  } else if (variance < 5) {
    console.log("🎯 Distribution ÉQUITABLE ✅");
  } else {
    console.log("⚠️ Distribution pourrait être améliorée");
  }
}

// Test de comparaison avec l'ancienne formule
function compareWithOldFormula() {
  console.log("\n🔄 Comparaison avec l'ancienne formule");
  console.log("=".repeat(60));

  const today = new Date();
  const dayOfYear = Math.floor(
    (today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24)
  );
  const year = today.getFullYear();

  // Ancienne formule: (dayOfYear + year) % 58 🆕 CORRIGÉ
  const oldIndex = (dayOfYear + year) % 58;

  // Nouvelle formule
  const month = today.getMonth() + 1;
  const dayOfMonth = today.getDate();
  const hour = 12;
  const newIndex = calculateDuaIndex(dayOfYear, year, month, dayOfMonth, hour);

  console.log(`📅 Date: ${today.toISOString().split("T")[0]}`);
  console.log(
    `🔴 Ancienne formule: (${dayOfYear} + ${year}) % 58 = ${oldIndex}`
  );
  console.log(
    `🟢 Nouvelle formule: ${dayOfYear}×31 + ${year}×7 + ${month}×13 + ${dayOfMonth}×17 + ${hour}×23 = ${newIndex}`
  );
  console.log(`📊 Différence: ${Math.abs(newIndex - oldIndex)} positions`);
}

// Test de distribution sur 100 jours pour vérifier la couverture complète
function testLongTermCoverage() {
  console.log("\n📊 Test de couverture sur 100 jours");
  console.log("=".repeat(60));

  const results = new Map();
  const today = new Date();

  for (let day = 0; day < 100; day++) {
    const testDate = new Date(today);
    testDate.setDate(today.getDate() + day);

    const dayOfYear = Math.floor(
      (testDate - new Date(testDate.getFullYear(), 0, 0)) /
        (1000 * 60 * 60 * 24)
    );
    const year = testDate.getFullYear();
    const month = testDate.getMonth() + 1;
    const dayOfMonth = testDate.getDate();
    const hour = 12; // Heure fixe pour le test

    const index = calculateDuaIndex(dayOfYear, year, month, dayOfMonth, hour);

    // Compter les occurrences
    results.set(index, (results.get(index) || 0) + 1);
  }

  console.log(`📈 Couverture sur 100 jours: ${results.size}/58 duas utilisés`);
  console.log(
    `📊 Pourcentage de couverture: ${((results.size / 58) * 100).toFixed(1)}%`
  );

  // Vérifier s'il y a des duas jamais utilisés
  const unusedDuas = [];
  for (let i = 0; i < 58; i++) {
    if (!results.has(i)) {
      unusedDuas.push(i);
    }
  }

  if (unusedDuas.length > 0) {
    console.log(`⚠️ Duas jamais utilisés: ${unusedDuas.join(", ")}`);
  } else {
    console.log("✅ Tous les 58 duas ont été utilisés au moins une fois !");
  }

  // Afficher la distribution
  const sortedResults = Array.from(results.entries()).sort(
    (a, b) => a[0] - b[0]
  );
  console.log("\n📊 Distribution détaillée:");
  for (const [index, count] of sortedResults) {
    const percentage = ((count / 100) * 100).toFixed(1);
    const bar = "█".repeat(Math.round(count / 3));
    console.log(
      `Index ${index.toString().padStart(2)}: ${count
        .toString()
        .padStart(2)} fois (${percentage}%) ${bar}`
    );
  }

  // Calculer la variance pour 100 jours
  const expectedCount = 100 / 58; // 1.72 par index en moyenne
  const variance =
    Array.from(results.values()).reduce((sum, count) => {
      return sum + Math.pow(count - expectedCount, 2);
    }, 0) / results.size;

  console.log(`\n📊 Variance sur 100 jours: ${variance.toFixed(2)}`);
  if (variance < 3) {
    console.log("🎯 Distribution EXCELLENTE sur 100 jours ✅");
  } else if (variance < 6) {
    console.log("🎯 Distribution TRÈS BONNE sur 100 jours ✅");
  } else {
    console.log("⚠️ Distribution pourrait être améliorée sur 100 jours");
  }
}

// Exécuter les tests
console.log("🧪 Tests de la nouvelle logique de sélection des duas");
console.log("=".repeat(60));

testDistribution();
compareWithOldFormula();
testLongTermCoverage(); // 🆕 NOUVEAU TEST

console.log("\n🎯 Conclusion:");
console.log(
  "La nouvelle formule utilise plus de facteurs temporels pour créer"
);
console.log(
  "une distribution plus aléatoire et équitable des duas quotidiens."
);
console.log("Elle évite les patterns répétitifs de l'ancienne formule simple.");
console.log(
  "Sur 100 jours, elle devrait couvrir tous les 58 duas disponibles."
);
