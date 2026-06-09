const TRANSLATION_MAP: Record<string, number | null> = {
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

export function resolveQuranApiLang(language: string): string {
  if (language.startsWith("fr")) return "fr";
  if (language.startsWith("en")) return "en";
  if (language.startsWith("ru")) return "ru";
  if (language.startsWith("tr")) return "tr";
  if (language.startsWith("de")) return "de";
  if (language.startsWith("it")) return "it";
  if (language.startsWith("es")) return "es";
  if (language.startsWith("pt")) return "pt";
  if (language.startsWith("ur")) return "ur";
  if (language.startsWith("fa")) return "fa";
  if (language.startsWith("ar")) return "ar";
  if (language.startsWith("nl")) return "nl";
  if (language.startsWith("bn")) return "bn";
  return "en";
}

export async function fetchQuranTranslation(
  chapterNumber: number,
  lang: string,
): Promise<any[]> {
  const translationId = TRANSLATION_MAP[lang] || 85;

  try {
    const res = await fetch(
      `https://api.quran.com/api/v4/quran/translations/${translationId}?chapter_number=${chapterNumber}`,
    );
    const json = await res.json();

    if (json.translations && json.translations.length > 0) {
      return json.translations;
    }
    if (translationId !== 85) {
      const fallbackRes = await fetch(
        `https://api.quran.com/api/v4/quran/translations/85?chapter_number=${chapterNumber}`,
      );
      const fallbackJson = await fallbackRes.json();
      return fallbackJson.translations || [];
    }
    return [];
  } catch {
    if (translationId !== 85) {
      const fallbackRes = await fetch(
        `https://api.quran.com/api/v4/quran/translations/85?chapter_number=${chapterNumber}`,
      );
      const fallbackJson = await fallbackRes.json();
      return fallbackJson.translations || [];
    }
    return [];
  }
}
