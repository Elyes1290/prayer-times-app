// utils/quranTextLayout.ts
//
// Calcul de la hauteur à réserver pour le texte arabe d'un verset (voir QuranArabicText).

export type MeasuredLine = { width: number; height: number };

/** Une dernière ligne remplie à moins de ce nombre de points du bord est « à risque ». */
export const NEARLY_FULL_LINE_MARGIN = 10;

/**
 * Hauteur minimale à réserver pour afficher tout le texte.
 *
 * - base : le plus grand de « somme des hauteurs de lignes rapportées » et
 *   « nombre de lignes × interligne » (la valeur rapportée peut ignorer l'interligne) ;
 * - si une ligne dépasse la largeur affichée (texte mesuré dans une zone plus large que
 *   celle où il est dessiné), on réserve une ligne de plus ;
 * - si la dernière ligne est presque pleine, un écart d'un pixel entre la mesure et
 *   l'affichage suffit à reporter son dernier mot sur une ligne supplémentaire, qui serait
 *   rognée : on réserve alors une ligne de plus (invisible si elle n'est pas utilisée).
 */
export function computeRequiredTextHeight(
  lines: ReadonlyArray<MeasuredLine>,
  containerWidth: number,
  lineHeight: number,
): number {
  if (lines.length === 0) return 0;

  const reported = lines.reduce((sum, line) => sum + line.height, 0);
  const fromLineHeight = lineHeight > 0 ? lines.length * lineHeight : 0;
  const base = Math.max(reported, fromLineHeight);

  const lastLine = lines[lines.length - 1];
  // Une ligne plus large que la zone affichée prouve que le texte a été mesuré dans une
  // zone plus large que celle où il est dessiné : il se coupera en plus de lignes à l'écran
  // (cas observé : lignes de 313 pt mesurées pour une zone de 306 pt, dernier mot perdu).
  const measuredWiderThanBox =
    containerWidth > 0 && lines.some((line) => line.width > containerWidth + 1);
  const nearlyFull =
    containerWidth > 0 &&
    lastLine.width >= containerWidth - NEARLY_FULL_LINE_MARGIN;
  const extraLine =
    measuredWiderThanBox || nearlyFull ? Math.max(lineHeight, lastLine.height) : 0;

  return Math.ceil(base + extraLine);
}