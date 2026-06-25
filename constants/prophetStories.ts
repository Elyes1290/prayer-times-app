/**
 * Liste des prophètes pour les Histoires des Prophètes
 * Source unique de vérité pour les labels et l'ordre d'affichage
 */

export type ProphetId =
  | "muhammad"
  | "adam"
  | "idris"
  | "nuh"
  | "hud"
  | "salih"
  | "ibrahim"
  | "lut"
  | "ismail"
  | "ishaq"
  | "yaqub"
  | "yusuf"
  | "shuayb"
  | "ayyub"
  | "dhulkifl"
  | "musa"
  | "harun"
  | "dawud"
  | "sulayman"
  | "yunus"
  | "zakariya"
  | "yahya"
  | "ilyas"
  | "alyasa"
  | "isa";

export interface ProphetConfig {
  id: ProphetId;
  label: string;
  labelShort: string;
  labelArabic: string;
}

export const PROPHETS: ProphetConfig[] = [
  { id: "adam", label: "Adam (عليه السلام) - Paix sur Lui", labelShort: "Adam (AS)", labelArabic: "آدم" },
  { id: "idris", label: "Idris (عليه السلام) - Paix sur Lui", labelShort: "Idris (AS)", labelArabic: "إدريس" },
  { id: "nuh", label: "Noé (عليه السلام) - Paix sur Lui", labelShort: "Noé (AS)", labelArabic: "نوح" },
  { id: "hud", label: "Hud (عليه السلام) - Paix sur Lui", labelShort: "Hud (AS)", labelArabic: "هود" },
  { id: "salih", label: "Salih (عليه السلام) - Paix sur Lui", labelShort: "Salih (AS)", labelArabic: "صالح" },
  { id: "ibrahim", label: "Ibrahim (عليه السلام) - Paix sur Lui", labelShort: "Ibrahim (AS)", labelArabic: "إبراهيم" },
  { id: "lut", label: "Lut (عليه السلام) - Paix sur Lui", labelShort: "Lut (AS)", labelArabic: "لوط" },
  { id: "ismail", label: "Ismaël (عليه السلام) - Paix sur Lui", labelShort: "Ismaël (AS)", labelArabic: "إسماعيل" },
  { id: "ishaq", label: "Ishaq (عليه السلام) - Paix sur Lui", labelShort: "Ishaq (AS)", labelArabic: "إسحاق" },
  { id: "yaqub", label: "Ya'qoub (عليه السلام) - Paix sur Lui", labelShort: "Ya'qoub (AS)", labelArabic: "يعقوب" },
  { id: "yusuf", label: "Yusuf (عليه السلام) - Paix sur Lui", labelShort: "Yusuf (AS)", labelArabic: "يوسف" },
  { id: "shuayb", label: "Shu'ayb (عليه السلام) - Paix sur Lui", labelShort: "Shu'ayb (AS)", labelArabic: "شعيب" },
  { id: "ayyub", label: "Ayyub (عليه السلام) - Paix sur Lui", labelShort: "Ayyub (AS)", labelArabic: "أيوب" },
  { id: "dhulkifl", label: "Dhoul-Kifl (عليه السلام) - Paix sur Lui", labelShort: "Dhoul-Kifl (AS)", labelArabic: "ذو الكفل" },
  { id: "musa", label: "Musa (عليه السلام) - Paix sur Lui", labelShort: "Musa (AS)", labelArabic: "موسى" },
  { id: "harun", label: "Haroun (عليه السلام) - Paix sur Lui", labelShort: "Haroun (AS)", labelArabic: "هارون" },
  { id: "dawud", label: "Dawud (عليه السلام) - Paix sur Lui", labelShort: "Dawud (AS)", labelArabic: "داوود" },
  { id: "sulayman", label: "Sulayman (عليه السلام) - Paix sur Lui", labelShort: "Sulayman (AS)", labelArabic: "سليمان" },
  { id: "ilyas", label: "Ilyas (عليه السلام) - Paix sur Lui", labelShort: "Ilyas (AS)", labelArabic: "إلياس" },
  { id: "alyasa", label: "Al-Yasa (عليه السلام) - Paix sur Lui", labelShort: "Al-Yasa (AS)", labelArabic: "اليسع" },
  { id: "yunus", label: "Yunus (عليه السلام) - Paix sur Lui", labelShort: "Yunus (AS)", labelArabic: "يونس" },
  { id: "zakariya", label: "Zakariya (عليه السلام) - Paix sur Lui", labelShort: "Zakariya (AS)", labelArabic: "زكريا" },
  { id: "yahya", label: "Yahya (عليه السلام) - Paix sur Lui", labelShort: "Yahya (AS)", labelArabic: "يحيى" },
  { id: "isa", label: "Isa (عليه السلام) - Paix sur Lui", labelShort: "Isa (AS)", labelArabic: "عيسى" },
  { id: "muhammad", label: "Mohammad (ﷺ) - Paix et Bénédictions sur Lui", labelShort: "Muhammad (ﷺ)", labelArabic: "محمد" },
];

export const VALID_PROPHET_IDS = PROPHETS.map((p) => p.id);

export const getProphetLabel = (id: ProphetId): string =>
  PROPHETS.find((p) => p.id === id)?.label ?? "Mohammad (ﷺ) - Paix et Bénédictions sur Lui";

const getProphetShortLabel = (id: ProphetId): string =>
  PROPHETS.find((p) => p.id === id)?.labelShort ?? "Muhammad (ﷺ)";
