import { QuranVerseFavorite } from "../contexts/FavoritesContext";

export function formatAudioTime(milliseconds: number): string {
  if (isNaN(milliseconds) || milliseconds <= 0) {
    return "0:00";
  }
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function stripHtml(text: string | undefined) {
  if (!text) return "";
  return (
    text
      .replace(/<sup[^>]*foot_note[^>]*>.*?<\/sup>/gi, "")
      .replace(/<a[^>]*>.*?<\/a>/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

export function normalizeQuranText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u064B-\u0652]/g, "")
    .replace(/[\u0653-\u065F]/g, "")
    .replace(/[\u0670]/g, "")
    .replace(/[\u06D6-\u06ED]/g, "")
    .replace(/[^\w\s\u0600-\u06FF\u0750-\u077F]/gi, "")
    .toLowerCase()
    .trim();
}

export function convertToFavorite(
  item: { verse_key?: string; text_uthmani?: string },
  translationText: string,
  chapterName: string,
): Omit<QuranVerseFavorite, "id" | "dateAdded"> {
  if (!item.verse_key) {
    console.warn("⚠️ verse_key manquant pour l'item:", item);
    return {
      type: "quran_verse" as const,
      chapterNumber: 1,
      verseNumber: 1,
      arabicText: item.text_uthmani || "",
      translation: stripHtml(translationText),
      chapterName: chapterName,
    };
  }

  const verseParts = item.verse_key.split(":");
  return {
    type: "quran_verse" as const,
    chapterNumber: parseInt(verseParts[0]) || 1,
    verseNumber: parseInt(verseParts[1]) || 1,
    arabicText: item.text_uthmani,
    translation: stripHtml(translationText),
    chapterName: chapterName,
  };
}
