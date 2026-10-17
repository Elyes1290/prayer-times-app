// utils/ramadan/debug.ts
//
// ⚠️ INTERRUPTEUR DE TEST — À REMETTRE À `null` AVANT LA MISE EN PRODUCTION.
//
// Quand une date "YYYY-MM-DD" est renseignée, « Mon Ramadan » simule un Ramadan de 30 jours
// commençant ce jour-là (calcul de la saison, écran, bannière, notifications et planning
// Android compris). Cela permet de tester toute la fonctionnalité hors période réelle.
//
// - Date de début FIXE : pour tester en plein mois, mettez une date passée
//   (ex. "2026-10-08" => aujourd'hui = jour 9).
// - Les données de test sont enregistrées sous une année hijri fictive (1599) :
//   elles ne se mélangent jamais avec le vrai Ramadan 1448.
// - Désactivé automatiquement pendant les tests Jest (NODE_ENV === "test").
// - Un test automatique (`__tests__/utils/ramadan/debug.test.ts`) échoue tant que
//   cette valeur n'est pas `null` : il sert de garde-fou avant la release.

export const RAMADAN_TEST_START_DATE: string | null = null;

/** Année hijri fictive des données de test (acceptée par le serveur : 1400-1600). */
export const RAMADAN_TEST_HIJRI_YEAR = 1599;

/** Durée du Ramadan simulé. */
export const RAMADAN_TEST_LENGTH_DAYS = 30;

/** Date de test effective (null en production et pendant les tests Jest). */
export function getRamadanTestStartDate(): string | null {
  if (process.env.NODE_ENV === "test") return null;
  return RAMADAN_TEST_START_DATE;
}
