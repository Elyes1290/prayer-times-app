// utils/friday/i18n.ts
//
// Traductions de la fonctionnalité « Vendredi », volontairement SÉPARÉES du système i18n
// principal (aucun fichier de langue existant n'est modifié). Disponible en français,
// anglais et arabe ; les autres langues retombent sur l'anglais.

import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import ar from "../../locales/friday/ar.json";
import bn from "../../locales/friday/bn.json";
import de from "../../locales/friday/de.json";
import en from "../../locales/friday/en.json";
import es from "../../locales/friday/es.json";
import fa from "../../locales/friday/fa.json";
import fr from "../../locales/friday/fr.json";
import it from "../../locales/friday/it.json";
import nl from "../../locales/friday/nl.json";
import pt from "../../locales/friday/pt.json";
import ru from "../../locales/friday/ru.json";
import tr from "../../locales/friday/tr.json";
import ur from "../../locales/friday/ur.json";

type Bundle = Record<string, unknown>;

// Mêmes langues que l'application ; toute autre langue retombe sur l'anglais.
const BUNDLES: Record<string, Bundle> = {
  fr,
  en,
  ar,
  es,
  it,
  ru,
  tr,
  de,
  pt,
  nl,
  ur,
  bn,
  fa,
};
const FALLBACK_LANGUAGE = "en";

export type FridayTranslate = (
  key: string,
  vars?: Record<string, string | number>,
) => string;

function lookup(bundle: Bundle | undefined, key: string): string | undefined {
  if (!bundle) return undefined;
  let node: unknown = bundle;
  for (const part of key.split(".")) {
    if (node && typeof node === "object" && part in (node as Bundle)) {
      node = (node as Bundle)[part];
    } else {
      return undefined;
    }
  }
  return typeof node === "string" ? node : undefined;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

/** Langue de contenu effective ("fr", "en" ou "ar") pour un code de langue de l'app. */
export function resolveFridayLanguage(language: string | undefined): string {
  const code = (language ?? FALLBACK_LANGUAGE).toLowerCase().split("-")[0];
  return code in BUNDLES ? code : FALLBACK_LANGUAGE;
}

/** Traduction hors React (planification de notifications, tests…). */
export function fridayTranslate(
  language: string | undefined,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const lang = resolveFridayLanguage(language);
  const template =
    lookup(BUNDLES[lang], key) ?? lookup(BUNDLES[FALLBACK_LANGUAGE], key) ?? key;
  return interpolate(template, vars);
}

/** Hook : `const t = useFridayT(); t("hero.greeting")`. */
export function useFridayT(): FridayTranslate {
  const { i18n } = useTranslation();
  const language = i18n.language;
  return useCallback((key, vars) => fridayTranslate(language, key, vars), [language]);
}
