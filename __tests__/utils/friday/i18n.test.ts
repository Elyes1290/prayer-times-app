import ar from "../../../locales/friday/ar.json";
import bn from "../../../locales/friday/bn.json";
import de from "../../../locales/friday/de.json";
import en from "../../../locales/friday/en.json";
import es from "../../../locales/friday/es.json";
import fa from "../../../locales/friday/fa.json";
import fr from "../../../locales/friday/fr.json";
import itBundle from "../../../locales/friday/it.json";
import nl from "../../../locales/friday/nl.json";
import pt from "../../../locales/friday/pt.json";
import ru from "../../../locales/friday/ru.json";
import tr from "../../../locales/friday/tr.json";
import ur from "../../../locales/friday/ur.json";
import { fridayTranslate, resolveFridayLanguage } from "../../../utils/friday/i18n";

const ALL: Record<string, unknown> = { en, ar, es, it: itBundle, ru, tr, de, pt, nl, ur, bn, fa };

// Textes en écriture arabe qui doivent rester identiques dans toutes les langues.
const ARABIC_KEYS = ["hero.hadithArabic", "kahf.arabic", "tips.salawat.arabic"];

function flatten(node: unknown, prefix = ""): string[] {
  if (typeof node === "string") return [prefix];
  if (node && typeof node === "object") {
    return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
      flatten(value, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [];
}

function get(bundle: unknown, key: string): string {
  return key.split(".").reduce<unknown>((n, p) => (n as Record<string, unknown>)[p], bundle) as string;
}

describe("friday/i18n — 13 langues", () => {
  it("résout la langue (région ignorée, fallback anglais)", () => {
    expect(resolveFridayLanguage("fr-FR")).toBe("fr");
    expect(resolveFridayLanguage("tr")).toBe("tr");
    expect(resolveFridayLanguage("ja")).toBe("en");
    expect(fridayTranslate("ja", "title")).toBe(en.title);
  });

  it("les 13 langues exposent exactement les mêmes clés que le français", () => {
    const reference = flatten(fr).sort();
    for (const [language, bundle] of Object.entries(ALL)) {
      expect({ language, keys: flatten(bundle).sort() }).toEqual({ language, keys: reference });
    }
  });

  it("les variables {{...}} sont les mêmes dans toutes les langues", () => {
    const vars = (text: string) => (text.match(/\{\{\s*\w+\s*\}\}/g) ?? []).sort().join(",");
    for (const key of flatten(fr)) {
      for (const [language, bundle] of Object.entries(ALL)) {
        expect({ language, key, vars: vars(get(bundle, key)) }).toEqual({
          language,
          key,
          vars: vars(get(fr, key)),
        });
      }
    }
  });

  it("les textes arabes sont identiques dans toutes les langues", () => {
    for (const key of ARABIC_KEYS) {
      for (const bundle of Object.values(ALL)) {
        expect(get(bundle, key)).toBe(get(fr, key));
      }
    }
  });

  it("la notification a un titre et un corps, sans le mot « minutes »", () => {
    for (const [language, bundle] of Object.entries({ fr, ...ALL })) {
      const title = get(bundle, "notif.title");
      const body = get(bundle, "notif.body");
      expect({ language, ok: title.length > 0 && body.length > 0 }).toEqual({ language, ok: true });
      expect(body.toLowerCase()).not.toContain("minutes");
    }
  });

  it("chaque hadith cite une source précise (numéro de hadith), dans toutes les langues", () => {
    const SOURCE_KEYS = [
      "hero.hadithSource",
      "kahf.source",
      "tips.ghusl.source",
      "tips.perfume.source",
      "tips.early.source",
      "tips.silence.source",
      "tips.salawat.source",
      "tips.hour.source",
      "tips.fasting.source",
    ];
    for (const [language, bundle] of Object.entries({ fr, ...ALL })) {
      for (const key of SOURCE_KEYS) {
        expect({ language, key, hasNumber: /\d/.test(get(bundle, key)) }).toEqual({
          language,
          key,
          hasNumber: true,
        });
      }
    }
  });
});
