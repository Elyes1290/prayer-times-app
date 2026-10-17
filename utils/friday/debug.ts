// utils/friday/debug.ts
//
// ⚠️ INTERRUPTEUR DE TEST — À REMETTRE À `false` AVANT LA MISE EN PRODUCTION.
//
// Quand il vaut `true`, TOUS les jours sont traités comme un vendredi : la carte d'accueil
// est visible tous les jours et la notification est programmée chaque jour (au lieu du
// seul vendredi). Cela permet de tester toute la fonctionnalité sans attendre le vendredi.
//
// - Désactivé automatiquement pendant les tests Jest (NODE_ENV === "test").
// - Un test automatique (`__tests__/utils/friday/debug.test.ts`) échoue tant que cette
//   valeur n'est pas `false` : il sert de garde-fou avant la release.

export const FRIDAY_TEST_EVERY_DAY = false;

/** Vrai si tous les jours doivent être traités comme un vendredi (jamais en prod ni en test). */
export function isFridayTestMode(): boolean {
  if (process.env.NODE_ENV === "test") return false;
  return FRIDAY_TEST_EVERY_DAY;
}
