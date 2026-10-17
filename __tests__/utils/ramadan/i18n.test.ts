import ar from "../../../locales/ramadan/ar.json";
import bn from "../../../locales/ramadan/bn.json";
import de from "../../../locales/ramadan/de.json";
import en from "../../../locales/ramadan/en.json";
import es from "../../../locales/ramadan/es.json";
import fa from "../../../locales/ramadan/fa.json";
import fr from "../../../locales/ramadan/fr.json";
import itBundle from "../../../locales/ramadan/it.json";
import nl from "../../../locales/ramadan/nl.json";
import pt from "../../../locales/ramadan/pt.json";
import ru from "../../../locales/ramadan/ru.json";
import tr from "../../../locales/ramadan/tr.json";
import ur from "../../../locales/ramadan/ur.json";
import {
  ramadanTranslate,
  resolveRamadanLanguage,
} from "../../../utils/ramadan/i18n";

const ALL: Record<string, unknown> = { en, ar, es, it: itBundle, ru, tr, de, pt, nl, ur, bn, fa };

// Textes en écriture arabe qui doivent rester identiques dans toutes les langues.
const ARABIC_KEYS = ["dua.arabic", "dua.arabic2", "lastTen.duaArabic"];

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

describe("ramadan/i18n", () => {
  it("résout la langue (région ignorée, fallback anglais)", () => {
    expect(resolveRamadanLanguage("fr-FR")).toBe("fr");
    expect(resolveRamadanLanguage("AR")).toBe("ar");
    expect(resolveRamadanLanguage("tr")).toBe("tr");
    expect(resolveRamadanLanguage("pt-BR")).toBe("pt");
    expect(resolveRamadanLanguage("ja")).toBe("en");
    expect(resolveRamadanLanguage(undefined)).toBe("en");
  });

  it("interpole les variables", () => {
    expect(ramadanTranslate("fr", "hero.dayOf", { day: 3, total: 30 })).toBe("Jour 3 sur 30");
    expect(ramadanTranslate("en", "hero.dayOf", { day: 3, total: 30 })).toContain("3");
  });

  it("retombe sur l'anglais puis sur la clé si la langue ou la traduction manque", () => {
    expect(ramadanTranslate("ja", "title")).toBe(en.title);
    expect(ramadanTranslate("fr", "clé.inexistante")).toBe("clé.inexistante");
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

  it("aucune traduction n'est vide, sauf les translittérations", () => {
    const allowedEmpty = (key: string) => /transliteration|translation/i.test(key);
    for (const [language, bundle] of Object.entries({ fr, ...ALL })) {
      for (const key of flatten(bundle)) {
        if (!allowedEmpty(key)) {
          expect({ language, key, empty: get(bundle, key).trim() === "" }).toEqual({
            language,
            key,
            empty: false,
          });
        }
      }
    }
  });

  it("les textes de notification n'emploient jamais le mot « minutes » (réécrit par le natif Android)", () => {
    for (const [language, bundle] of Object.entries({ fr, ...ALL })) {
      for (const key of flatten(bundle).filter((k) => k.startsWith("notif."))) {
        expect({ language, key, text: get(bundle, key).toLowerCase().includes(" minutes") }).toEqual({
          language,
          key,
          text: false,
        });
      }
    }
  });
});
