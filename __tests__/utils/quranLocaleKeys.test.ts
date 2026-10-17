import ar from "../../locales/ar.json";
import bn from "../../locales/bn.json";
import de from "../../locales/de.json";
import en from "../../locales/en.json";
import es from "../../locales/es.json";
import fa from "../../locales/fa.json";
import fr from "../../locales/fr.json";
import itLocale from "../../locales/it.json";
import nl from "../../locales/nl.json";
import pt from "../../locales/pt.json";
import ru from "../../locales/ru.json";
import tr from "../../locales/tr.json";
import ur from "../../locales/ur.json";

const LOCALES: Record<string, Record<string, unknown>> = {
  fr, en, ar, es, it: itLocale, ru, tr, de, pt, nl, ur, bn, fa,
};

// Clés du lecteur Coran (précédente/suivante, plein écran, marque-page, affichage).
const QURAN_READER_KEYS = [
  "quran_previous_surah",
  "quran_next_surah",
  "quran_resume_bookmark",
  "quran_show_translation",
  "quran_show_arabic_only",
  "quran_fullscreen",
  "quran_exit_fullscreen",
  "quran_bookmark_saved",
  "quran_bookmark_removed",
  "quran_bookmark",
  "choose_gif",
];

describe("lecteur Coran — traductions", () => {
  it.each(Object.keys(LOCALES))("%s contient toutes les clés du lecteur", (language) => {
    for (const key of QURAN_READER_KEYS) {
      const value = LOCALES[language][key];
      expect({ language, key, ok: typeof value === "string" && value.trim().length > 0 }).toEqual({
        language,
        key,
        ok: true,
      });
    }
  });

  it("les langues autres que le français n'affichent pas le texte français par défaut", () => {
    for (const language of Object.keys(LOCALES).filter((l) => l !== "fr")) {
      expect(LOCALES[language].quran_next_surah).not.toBe(fr.quran_next_surah);
    }
  });
});
