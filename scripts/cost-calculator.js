/**
 * 💰 Calculateur de coûts Firebase Storage pour récitations Quran
 * Outil pour analyser et optimiser les coûts de bande passante
 */

// Configuration des tarifs Firebase Storage (approximatifs)
const PRICING = {
  firebase_storage_per_gb_chf: 0.12, // CHF par GB transféré
  firebase_storage_per_gb_usd: 0.12, // USD par GB transféré
  conversion_rate_chf_to_usd: 1.1,
};

// Tailles estimées des sourates (en MB)
const SURAH_SIZES = {
  1: 0.4, // Al-Fatiha
  2: 60, // Al-Baqarah (la plus longue!)
  3: 35, // Al-Imran
  4: 40, // An-Nisa
  5: 30, // Al-Maidah
  // Estimation pour les autres
  average_medium: 15, // Sourates 6-30
  average_short: 5, // Sourates 31-60
  average_very_short: 1, // Sourates 61-114
};

// Stratégies d'optimisation
const STRATEGIES = {
  full_download: {
    name: "Téléchargement complet",
    bandwidth_factor: 1.0,
    description: "Télécharge le fichier entier",
  },
  basic_streaming: {
    name: "Streaming basique",
    bandwidth_factor: 0.3,
    description: "Streaming avec 70% d'économie",
  },
  progressive_streaming: {
    name: "Streaming progressif",
    bandwidth_factor: 0.15,
    description: "Cache intelligent + compression",
  },
  aggressive_compression: {
    name: "Compression agressive",
    bandwidth_factor: 0.08,
    description: "Bitrate 64kbps + cache",
  },
};

/**
 * 📊 Calculer les coûts pour une sourate spécifique
 */
function calculateSurahCosts(
  surahNumber,
  userCount,
  strategy = "full_download"
) {
  let fileSize = SURAH_SIZES[surahNumber];

  // Estimation pour les sourates non listées
  if (!fileSize) {
    if (surahNumber <= 5) fileSize = 35;
    else if (surahNumber <= 30) fileSize = SURAH_SIZES.average_medium;
    else if (surahNumber <= 60) fileSize = SURAH_SIZES.average_short;
    else fileSize = SURAH_SIZES.average_very_short;
  }

  const strategyConfig = STRATEGIES[strategy];
  const effectiveSize = fileSize * strategyConfig.bandwidth_factor;
  const totalGB = (effectiveSize * userCount) / 1024;

  const costCHF = totalGB * PRICING.firebase_storage_per_gb_chf;
  const costUSD = costCHF * PRICING.conversion_rate_chf_to_usd;

  return {
    surahNumber,
    surahName: getSurahName(surahNumber),
    originalSize: fileSize,
    effectiveSize: Math.round(effectiveSize * 100) / 100,
    userCount,
    strategy: strategyConfig.name,
    totalGB: Math.round(totalGB * 100) / 100,
    costCHF: Math.round(costCHF * 100) / 100,
    costUSD: Math.round(costUSD * 100) / 100,
    savings: Math.round((1 - strategyConfig.bandwidth_factor) * 100),
  };
}

/**
 * 📊 Calculer les coûts pour toutes les sourates
 */
function calculateTotalCosts(userCount, strategy = "full_download") {
  let totalCostCHF = 0;
  let totalCostUSD = 0;
  let totalOriginalSize = 0;
  let totalEffectiveSize = 0;

  const results = [];

  for (let i = 1; i <= 114; i++) {
    const result = calculateSurahCosts(i, userCount, strategy);
    results.push(result);

    totalCostCHF += result.costCHF;
    totalCostUSD += result.costUSD;
    totalOriginalSize += result.originalSize;
    totalEffectiveSize += result.effectiveSize;
  }

  return {
    userCount,
    strategy: STRATEGIES[strategy].name,
    totalSurahs: 114,
    totalOriginalSize: Math.round(totalOriginalSize),
    totalEffectiveSize: Math.round(totalEffectiveSize),
    totalCostCHF: Math.round(totalCostCHF),
    totalCostUSD: Math.round(totalCostUSD),
    savings: Math.round((1 - totalEffectiveSize / totalOriginalSize) * 100),
    results,
  };
}

/**
 * 📈 Comparer toutes les stratégies
 */
function compareStrategies(userCount) {
  console.log(
    `\n💰 ANALYSE DES COÛTS POUR ${userCount.toLocaleString()} UTILISATEURS PREMIUM\n`
  );
  console.log("=".repeat(80));

  const strategies = Object.keys(STRATEGIES);
  const comparisons = [];

  strategies.forEach((strategy) => {
    const result = calculateTotalCosts(userCount, strategy);
    comparisons.push(result);

    console.log(`\n🎯 ${result.strategy.toUpperCase()}`);
    console.log(`   Taille originale : ${result.totalOriginalSize} MB`);
    console.log(`   Taille effective : ${result.totalEffectiveSize} MB`);
    console.log(`   Économie : ${result.savings}%`);
    console.log(
      `   💸 COÛT TOTAL : ${result.totalCostCHF} CHF (${result.totalCostUSD} USD)`
    );
  });

  // Analyse spéciale pour Al-Baqarah
  console.log(`\n🔍 ANALYSE SPÉCIALE - SOURATE AL-BAQARAH (60 MB)`);
  console.log("=".repeat(50));

  strategies.forEach((strategy) => {
    const result = calculateSurahCosts(2, userCount, strategy);
    console.log(`${result.strategy.padEnd(25)} : ${result.costCHF} CHF`);
  });

  return comparisons;
}

/**
 * 💡 Recommandations d'optimisation
 */
function generateRecommendations(userCount) {
  console.log(`\n💡 RECOMMANDATIONS D'OPTIMISATION\n`);
  console.log("=".repeat(50));

  const fullCost = calculateTotalCosts(userCount, "full_download");
  const streamingCost = calculateTotalCosts(userCount, "basic_streaming");
  const progressiveCost = calculateTotalCosts(
    userCount,
    "progressive_streaming"
  );
  const aggressiveCost = calculateTotalCosts(
    userCount,
    "aggressive_compression"
  );

  const savingsStreaming = fullCost.totalCostCHF - streamingCost.totalCostCHF;
  const savingsProgressive =
    fullCost.totalCostCHF - progressiveCost.totalCostCHF;
  const savingsAggressive = fullCost.totalCostCHF - aggressiveCost.totalCostCHF;

  console.log(`1. 🎵 STREAMING BASIQUE`);
  console.log(
    `   Économie : ${savingsStreaming} CHF (${streamingCost.savings}%)`
  );
  console.log(`   Facilité : ⭐⭐⭐⭐⭐ (déjà implémenté)`);

  console.log(`\n2. 🚀 STREAMING PROGRESSIF`);
  console.log(
    `   Économie : ${savingsProgressive} CHF (${progressiveCost.savings}%)`
  );
  console.log(`   Facilité : ⭐⭐⭐⭐ (modifications moyennes)`);

  console.log(`\n3. 💪 COMPRESSION AGRESSIVE`);
  console.log(
    `   Économie : ${savingsAggressive} CHF (${aggressiveCost.savings}%)`
  );
  console.log(`   Facilité : ⭐⭐⭐ (nécessite recompression)`);

  console.log(`\n🎯 PLAN D'ACTION RECOMMANDÉ :`);
  console.log(`1. Activer le streaming par défaut (IMMÉDIAT)`);
  console.log(`2. Implémenter la compression adaptative (1-2 semaines)`);
  console.log(`3. Ajouter le cache intelligent (2-3 semaines)`);
  console.log(`4. Optimiser les fichiers audio existants (projet long terme)`);
}

/**
 * 📱 Simulation de scénarios réels
 */
function simulateRealWorldScenarios() {
  console.log(`\n📱 SCÉNARIOS RÉELS D'UTILISATION\n`);
  console.log("=".repeat(50));

  const scenarios = [
    { users: 1000, description: "Lancement beta" },
    { users: 5000, description: "Croissance initiale" },
    { users: 20000, description: "Votre scénario actuel" },
    { users: 50000, description: "Succès modéré" },
    { users: 100000, description: "Succès majeur" },
  ];

  scenarios.forEach((scenario) => {
    console.log(
      `\n${scenario.description.toUpperCase()} (${scenario.users.toLocaleString()} utilisateurs)`
    );

    const strategies = [
      "full_download",
      "basic_streaming",
      "progressive_streaming",
    ];
    strategies.forEach((strategy) => {
      const result = calculateTotalCosts(scenario.users, strategy);
      console.log(
        `  ${STRATEGIES[strategy].name.padEnd(
          20
        )} : ${result.totalCostCHF.toLocaleString()} CHF`
      );
    });
  });
}

/**
 * 🎯 Obtenir le nom d'une sourate
 */
function getSurahName(number) {
  const names = {
    1: "Al-Fatiha",
    2: "Al-Baqarah",
    3: "Al-Imran",
    4: "An-Nisa",
    5: "Al-Maidah",
    // ... (liste complète disponible si nécessaire)
  };
  return names[number] || `Sourate ${number}`;
}

// 🚀 EXÉCUTION DES ANALYSES
if (require.main === module) {
  console.log("🎵 ANALYSEUR DE COÛTS FIREBASE STORAGE - RÉCITATIONS QURAN");
  console.log("Développé pour prayer-times-app\n");

  // Votre cas spécifique
  compareStrategies(20000);

  // Recommandations
  generateRecommendations(20000);

  // Scénarios multiples
  simulateRealWorldScenarios();

  console.log(
    `\n✅ Analyse terminée. Pour questions : consultez utils/premiumContent.ts`
  );
}

module.exports = {
  calculateSurahCosts,
  calculateTotalCosts,
  compareStrategies,
  generateRecommendations,
  STRATEGIES,
  SURAH_SIZES,
};
