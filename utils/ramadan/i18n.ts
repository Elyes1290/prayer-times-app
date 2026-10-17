// utils/ramadan/i18n.ts
//
// Traductions de la fonctionnalité Ramadan, volontairement SÉPARÉES du système i18n
// principal (aucun fichier de langue existant n'est modifié). Disponible en français,
// anglais et arabe ; les autres langues retombent sur l'anglais.

import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import ar from "../../locales/ramadan/ar.json";
import bn from "../../locales/ramadan/bn.json";
import de from "../../locales/ramadan/de.json";
import en from "../../locales/ramadan/en.json";
import es from "../../locales/ramadan/es.json";
import fa from "../../locales/ramadan/fa.json";
import fr from "../../locales/ramadan/fr.json";
import it from "../../locales/ramadan/it.json";
import nl from "../../locales/ramadan/nl.json";
import pt from "../../locales/ramadan/pt.json";
import ru from "../../locales/ramadan/ru.json";
import tr from "../../locales/ramadan/tr.json";
import ur from "../../locales/ramadan/ur.json";

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

export type RamadanTranslate = (
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

function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

/** Langue de contenu effective ("fr", "en" ou "ar") pour un code de langue de l'app. */
export function resolveRamadanLanguage(language: string | undefined): string {
  const code = (language ?? FALLBACK_LANGUAGE).toLowerCase().split("-")[0];
  return code in BUNDLES ? code : FALLBACK_LANGUAGE;
}

/** Traduction hors React (planification de notifications, tests…). */
export function ramadanTranslate(
  language: string | undefined,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const lang = resolveRamadanLanguage(language);
  const template =
    lookup(BUNDLES[lang], key) ?? lookup(BUNDLES[FALLBACK_LANGUAGE], key) ?? key;
  return interpolate(template, vars);
}

/** Hook : `const t = useRamadanT(); t("hero.dayOf", { day: 3, total: 30 })`. */
export function useRamadanT(): RamadanTranslate {
  const { i18n } = useTranslation();
  const language = i18n.language;
  return useCallback(
    (key, vars) => ramadanTranslate(language, key, vars),
    [language],
  );
}
