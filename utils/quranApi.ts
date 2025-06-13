export const translationMap: Record<string, number | null> = {
  fr: 136,
  en: 85,
  ru: 45,
  tr: 52,
  de: 27,
  ar: null,
  es: 83,
  it: 153,
  pt: 43,
  nl: 144,
  ur: 97,
  bn: 120,
  fa: 135,
};

function detectLang(i18nLang: string): string {
  if (i18nLang.startsWith("fr")) return "fr";
  if (i18nLang.startsWith("en")) return "en";
  if (i18nLang.startsWith("ru")) return "ru";
  if (i18nLang.startsWith("tr")) return "tr";
  if (i18nLang.startsWith("de")) return "de";
  if (i18nLang.startsWith("it")) return "it";
  if (i18nLang.startsWith("es")) return "es";
  if (i18nLang.startsWith("pt")) return "pt";
  if (i18nLang.startsWith("ur")) return "ur";
  if (i18nLang.startsWith("fa")) return "fa";
  if (i18nLang.startsWith("ar")) return "ar";
  if (i18nLang.startsWith("nl")) return "nl";
  if (i18nLang.startsWith("bn")) return "bn";
  return "en";
}

export async function getQuranVersesWithTranslations(
  chapterNumber: number,
  lang: string
) {
  // 1. Récupérer les versets arabes
  const arabicRes = await fetch(
    `https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${chapterNumber}`
  );
  const arabicJson = await arabicRes.json();
  const verses = arabicJson.verses || [];

  // 2. Récupérer la traduction
  const translationId = translationMap[lang] || 85;
  const translationRes = await fetch(
    `https://api.quran.com/api/v4/quran/translations/${translationId}?chapter_number=${chapterNumber}`
  );
  const translationJson = await translationRes.json();
  const translations = translationJson.translations || [];

  // 3. Fusionner par index (comme dans QuranScreen)
  return verses.map((verse: any, idx: number) => ({
    ...verse,
    translation: translations[idx]?.text || "",
  }));
}
