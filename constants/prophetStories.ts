/**
 * Liste des prophètes pour les Histoires des Prophètes
 * Source unique de vérité pour les labels et l'ordre d'affichage
 */

export type ProphetId =
  | "muhammad"
  | "adam"
  | "nuh"
  | "hud"
  | "salih"
  | "ibrahim"
  | "lut"
  | "yusuf"
  | "musa"
  | "dawud"
  | "sulayman"
  | "yunus"
  | "ayyub"
  | "zakariya"
  | "yahya"
  | "ilyas"
  | "alyasa"
  | "shuayb"
  | "isa";

export interface ProphetConfig {
  id: ProphetId;
  label: string;
  labelShort: string;
  labelArabic: string;
}

export const PROPHETS: ProphetConfig[] = [
  { id: "muhammad", label: "Mohammad (ﷺ) - Paix et Bénédictions sur Lui", labelShort: "Muhammad (ﷺ)", labelArabic: "محمد" },
  { id: "adam", label: "Adam (عليه السلام) - Paix sur Lui", labelShort: "Adam (AS)", labelArabic: "آدم" },
  { id: "nuh", label: "Noé (عليه السلام) - Paix sur Lui", labelShort: "Noé (AS)", labelArabic: "نوح" },
  { id: "hud", label: "Hud (عليه السلام) - Paix sur Lui", labelShort: "Hud (AS)", labelArabic: "هود" },
  { id: "salih", label: "Salih (عليه السلام) - Paix sur Lui", labelShort: "Salih (AS)", labelArabic: "صالح" },
  { id: "ibrahim", label: "Ibrahim (عليه السلام) - Paix sur Lui", labelShort: "Ibrahim (AS)", labelArabic: "إبراهيم" },
  { id: "lut", label: "Lut (عليه السلام) - Paix sur Lui", labelShort: "Lut (AS)", labelArabic: "لوط" },
  { id: "yusuf", label: "Yusuf (عليه السلام) - Paix sur Lui", labelShort: "Yusuf (AS)", labelArabic: "يوسف" },
  { id: "musa", label: "Musa (عليه السلام) - Paix sur Lui", labelShort: "Musa (AS)", labelArabic: "موسى" },
  { id: "dawud", label: "Dawud (عليه السلام) - Paix sur Lui", labelShort: "Dawud (AS)", labelArabic: "داوود" },
  { id: "sulayman", label: "Sulayman (عليه السلام) - Paix sur Lui", labelShort: "Sulayman (AS)", labelArabic: "سليمان" },
  { id: "yunus", label: "Yunus (عليه السلام) - Paix sur Lui", labelShort: "Yunus (AS)", labelArabic: "يونس" },
  { id: "ayyub", label: "Ayyub (عليه السلام) - Paix sur Lui", labelShort: "Ayyub (AS)", labelArabic: "أيوب" },
  { id: "zakariya", label: "Zakariya (عليه السلام) - Paix sur Lui", labelShort: "Zakariya (AS)", labelArabic: "زكريا" },
  { id: "yahya", label: "Yahya (عليه السلام) - Paix sur Lui", labelShort: "Yahya (AS)", labelArabic: "يحيى" },
  { id: "ilyas", label: "Ilyas (عليه السلام) - Paix sur Lui", labelShort: "Ilyas (AS)", labelArabic: "إلياس" },
  { id: "alyasa", label: "Al-Yasa (عليه السلام) - Paix sur Lui", labelShort: "Al-Yasa (AS)", labelArabic: "اليسع" },
  { id: "shuayb", label: "Shu'ayb (عليه السلام) - Paix sur Lui", labelShort: "Shu'ayb (AS)", labelArabic: "شعيب" },
  { id: "isa", label: "Isa (عليه السلام) - Paix sur Lui", labelShort: "Isa (AS)", labelArabic: "عيسى" },
];

export const VALID_PROPHET_IDS = PROPHETS.map((p) => p.id);

export const getProphetLabel = (id: ProphetId): string =>
  PROPHETS.find((p) => p.id === id)?.label ?? "Mohammad (ﷺ) - Paix et Bénédictions sur Lui";

export const getProphetShortLabel = (id: ProphetId): string =>
  PROPHETS.find((p) => p.id === id)?.labelShort ?? "Muhammad (ﷺ)";
