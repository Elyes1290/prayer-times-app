/**
 * Ordre chronologique traditionnel des prophètes présents dans l'application.
 * Basé sur l'enseignement coranique et la tradition islamique.
 * Liste des 25 prophètes mentionnés par leur nom dans le Coran.
 */

import type { ProphetId } from "./prophetStories";

export interface ProphetTimelineEntry {
  id: ProphetId;
  order: number;
}

/** Prophètes dans l'ordre chronologique (du plus ancien au plus récent). */
export const PROPHETS_TIMELINE: ProphetTimelineEntry[] = [
  { id: "adam", order: 1 },
  { id: "idris", order: 2 },
  { id: "nuh", order: 3 },
  { id: "hud", order: 4 },
  { id: "salih", order: 5 },
  { id: "ibrahim", order: 6 },
  { id: "lut", order: 7 },
  { id: "ismail", order: 8 },
  { id: "ishaq", order: 9 },
  { id: "yaqub", order: 10 },
  { id: "yusuf", order: 11 },
  { id: "shuayb", order: 12 },
  { id: "ayyub", order: 13 },
  { id: "dhulkifl", order: 14 },
  { id: "musa", order: 15 },
  { id: "harun", order: 16 },
  { id: "dawud", order: 17 },
  { id: "sulayman", order: 18 },
  { id: "ilyas", order: 19 },
  { id: "alyasa", order: 20 },
  { id: "yunus", order: 21 },
  { id: "zakariya", order: 22 },
  { id: "yahya", order: 23 },
  { id: "isa", order: 24 },
  { id: "muhammad", order: 25 },
];

export const PROPHETS_TIMELINE_COUNT = PROPHETS_TIMELINE.length;
