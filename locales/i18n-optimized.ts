import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

// Import seulement des langues principales (en, fr, ar) au démarrage
import en from "./en.json";
import fr from "./fr.json";
import ar from "./ar.json";

// Import des namespaces de base pour les langues principales
import asmaulhusnaEn from "./asmaulhusna.en.json";
import asmaulhusnaFr from "./asmaulhusna.fr.json";
import asmaulhusnaAr from "./asmaulhusna.ar.json";

import dhikrEn from "../assets/data/daily-dua/dhikr.en.json";
import dhikrFr from "../assets/data/daily-dua/dhikr.fr.json";
import dhikrAr from "../assets/data/daily-dua/dhikr.ar.json";

import dhikrMorningEn from "../assets/data/morning-dhikr/morning.en.json";
import dhikrMorningFr from "../assets/data/morning-dhikr/morning.fr.json";
import dhikrMorningAr from "../assets/data/morning-dhikr/morning.ar.json";

import dhikrEveningEn from "../assets/data/evening-dhikr/evening.en.json";
import dhikrEveningFr from "../assets/data/evening-dhikr/evening.fr.json";
import dhikrEveningAr from "../assets/data/evening-dhikr/evening.ar.json";

import dhikrSalahEn from "../assets/data/dhikr-after-salah/aftersalah.en.json";
import dhikrSalahFr from "../assets/data/dhikr-after-salah/aftersalah.fr.json";
import dhikrSalahAr from "../assets/data/dhikr-after-salah/aftersalah.ar.json";

import selectedDuaEn from "../assets/data/selected-dua/selected.en.json";
import selectedDuaFr from "../assets/data/selected-dua/selected.fr.json";
import selectedDuaAr from "../assets/data/selected-dua/selected.ar.json";

// Fonction pour charger dynamiquement les ressources d'une langue
const loadLanguageResources = async (language: string) => {
  const resources: any = {};

  try {
    // Chargement selon la langue avec imports statiques
    switch (language) {
      case "en":
        resources.translation = en;
        resources.asmaulhusna = asmaulhusnaEn;
        resources.dhikr = dhikrEn;
        resources.dhikrMorning = dhikrMorningEn;
        resources.eveningDhikr = dhikrEveningEn;
        resources.afterSalah = dhikrSalahEn;
        resources.selectedDua = selectedDuaEn;
        break;
      case "fr":
        resources.translation = fr;
        resources.asmaulhusna = asmaulhusnaFr;
        resources.dhikr = dhikrFr;
        resources.dhikrMorning = dhikrMorningFr;
        resources.eveningDhikr = dhikrEveningFr;
        resources.afterSalah = dhikrSalahFr;
        resources.selectedDua = selectedDuaFr;
        break;
      case "ar":
        resources.translation = ar;
        resources.asmaulhusna = asmaulhusnaAr;
        resources.dhikr = dhikrAr;
        resources.dhikrMorning = dhikrMorningAr;
        resources.eveningDhikr = dhikrEveningAr;
        resources.afterSalah = dhikrSalahAr;
        resources.selectedDua = selectedDuaAr;
        break;
      case "es":
        // Import statique pour compatibilité Metro
        const es = require("./es.json");
        const asmaulhusnaEs = require("./asmaulhusna.es.json");
        const dhikrEs = require("../assets/data/daily-dua/dhikr.es.json");
        const dhikrMorningEs = require("../assets/data/morning-dhikr/morning.es.json");
        const eveningDhikrEs = require("../assets/data/evening-dhikr/evening.es.json");
        const afterSalahEs = require("../assets/data/dhikr-after-salah/aftersalah.es.json");
        const selectedDuaEs = require("../assets/data/selected-dua/selected.es.json");

        resources.translation = es;
        resources.asmaulhusna = asmaulhusnaEs;
        resources.dhikr = dhikrEs;
        resources.dhikrMorning = dhikrMorningEs;
        resources.eveningDhikr = eveningDhikrEs;
        resources.afterSalah = afterSalahEs;
        resources.selectedDua = selectedDuaEs;
        break;
      case "it":
        const it = require("./it.json");
        const asmaulhusnaIt = require("./asmaulhusna.it.json");
        const dhikrIt = require("../assets/data/daily-dua/dhikr.it.json");
        const dhikrMorningIt = require("../assets/data/morning-dhikr/morning.it.json");
        const eveningDhikrIt = require("../assets/data/evening-dhikr/evening.it.json");
        const afterSalahIt = require("../assets/data/dhikr-after-salah/aftersalah.it.json");
        const selectedDuaIt = require("../assets/data/selected-dua/selected.it.json");

        resources.translation = it;
        resources.asmaulhusna = asmaulhusnaIt;
        resources.dhikr = dhikrIt;
        resources.dhikrMorning = dhikrMorningIt;
        resources.eveningDhikr = eveningDhikrIt;
        resources.afterSalah = afterSalahIt;
        resources.selectedDua = selectedDuaIt;
        break;
      case "ru":
        const ru = require("./ru.json");
        const asmaulhusnaRu = require("./asmaulhusna.ru.json");
        const dhikrRu = require("../assets/data/daily-dua/dhikr.ru.json");
        const dhikrMorningRu = require("../assets/data/morning-dhikr/morning.ru.json");
        const eveningDhikrRu = require("../assets/data/evening-dhikr/evening.ru.json");
        const afterSalahRu = require("../assets/data/dhikr-after-salah/aftersalah.ru.json");
        const selectedDuaRu = require("../assets/data/selected-dua/selected.ru.json");

        resources.translation = ru;
        resources.asmaulhusna = asmaulhusnaRu;
        resources.dhikr = dhikrRu;
        resources.dhikrMorning = dhikrMorningRu;
        resources.eveningDhikr = eveningDhikrRu;
        resources.afterSalah = afterSalahRu;
        resources.selectedDua = selectedDuaRu;
        break;
      case "tr":
        const tr = require("./tr.json");
        const asmaulhusnaTr = require("./asmaulhusna.tr.json");
        const dhikrTr = require("../assets/data/daily-dua/dhikr.tr.json");
        const dhikrMorningTr = require("../assets/data/morning-dhikr/morning.tr.json");
        const eveningDhikrTr = require("../assets/data/evening-dhikr/evening.tr.json");
        const afterSalahTr = require("../assets/data/dhikr-after-salah/aftersalah.tr.json");
        const selectedDuaTr = require("../assets/data/selected-dua/selected.tr.json");

        resources.translation = tr;
        resources.asmaulhusna = asmaulhusnaTr;
        resources.dhikr = dhikrTr;
        resources.dhikrMorning = dhikrMorningTr;
        resources.eveningDhikr = eveningDhikrTr;
        resources.afterSalah = afterSalahTr;
        resources.selectedDua = selectedDuaTr;
        break;
      case "de":
        const de = require("./de.json");
        const asmaulhusnaDe = require("./asmaulhusna.de.json");
        const dhikrDe = require("../assets/data/daily-dua/dhikr.de.json");
        const dhikrMorningDe = require("../assets/data/morning-dhikr/morning.de.json");
        const eveningDhikrDe = require("../assets/data/evening-dhikr/evening.de.json");
        const afterSalahDe = require("../assets/data/dhikr-after-salah/aftersalah.de.json");
        const selectedDuaDe = require("../assets/data/selected-dua/selected.de.json");

        resources.translation = de;
        resources.asmaulhusna = asmaulhusnaDe;
        resources.dhikr = dhikrDe;
        resources.dhikrMorning = dhikrMorningDe;
        resources.eveningDhikr = eveningDhikrDe;
        resources.afterSalah = afterSalahDe;
        resources.selectedDua = selectedDuaDe;
        break;
      case "pt":
        const pt = require("./pt.json");
        const asmaulhusnaPt = require("./asmaulhusna.pt.json");
        const dhikrPt = require("../assets/data/daily-dua/dhikr.pt.json");
        const dhikrMorningPt = require("../assets/data/morning-dhikr/morning.pt.json");
        const eveningDhikrPt = require("../assets/data/evening-dhikr/evening.pt.json");
        const afterSalahPt = require("../assets/data/dhikr-after-salah/aftersalah.pt.json");
        const selectedDuaPt = require("../assets/data/selected-dua/selected.pt.json");

        resources.translation = pt;
        resources.asmaulhusna = asmaulhusnaPt;
        resources.dhikr = dhikrPt;
        resources.dhikrMorning = dhikrMorningPt;
        resources.eveningDhikr = eveningDhikrPt;
        resources.afterSalah = afterSalahPt;
        resources.selectedDua = selectedDuaPt;
        break;
      case "nl":
        const nl = require("./nl.json");
        const asmaulhusnaNl = require("./asmaulhusna.nl.json");
        const dhikrNl = require("../assets/data/daily-dua/dhikr.nl.json");
        const dhikrMorningNl = require("../assets/data/morning-dhikr/morning.nl.json");
        const eveningDhikrNl = require("../assets/data/evening-dhikr/evening.nl.json");
        const afterSalahNl = require("../assets/data/dhikr-after-salah/aftersalah.nl.json");
        const selectedDuaNl = require("../assets/data/selected-dua/selected.nl.json");

        resources.translation = nl;
        resources.asmaulhusna = asmaulhusnaNl;
        resources.dhikr = dhikrNl;
        resources.dhikrMorning = dhikrMorningNl;
        resources.eveningDhikr = eveningDhikrNl;
        resources.afterSalah = afterSalahNl;
        resources.selectedDua = selectedDuaNl;
        break;
      case "ur":
        const ur = require("./ur.json");
        const asmaulhusnaUr = require("./asmaulhusna.ur.json");
        const dhikrUr = require("../assets/data/daily-dua/dhikr.ur.json");
        const dhikrMorningUr = require("../assets/data/morning-dhikr/morning.ur.json");
        const eveningDhikrUr = require("../assets/data/evening-dhikr/evening.ur.json");
        const afterSalahUr = require("../assets/data/dhikr-after-salah/aftersalah.ur.json");
        const selectedDuaUr = require("../assets/data/selected-dua/selected.ur.json");

        resources.translation = ur;
        resources.asmaulhusna = asmaulhusnaUr;
        resources.dhikr = dhikrUr;
        resources.dhikrMorning = dhikrMorningUr;
        resources.eveningDhikr = eveningDhikrUr;
        resources.afterSalah = afterSalahUr;
        resources.selectedDua = selectedDuaUr;
        break;
      case "bn":
        const bn = require("./bn.json");
        const asmaulhusnaBn = require("./asmaulhusna.bn.json");
        const dhikrBn = require("../assets/data/daily-dua/dhikr.bn.json");
        const dhikrMorningBn = require("../assets/data/morning-dhikr/morning.bn.json");
        const eveningDhikrBn = require("../assets/data/evening-dhikr/evening.bn.json");
        const afterSalahBn = require("../assets/data/dhikr-after-salah/aftersalah.bn.json");
        const selectedDuaBn = require("../assets/data/selected-dua/selected.bn.json");

        resources.translation = bn;
        resources.asmaulhusna = asmaulhusnaBn;
        resources.dhikr = dhikrBn;
        resources.dhikrMorning = dhikrMorningBn;
        resources.eveningDhikr = eveningDhikrBn;
        resources.afterSalah = afterSalahBn;
        resources.selectedDua = selectedDuaBn;
        break;
      case "fa":
        const fa = require("./fa.json");
        const asmaulhusnaFa = require("./asmaulhusna.fa.json");
        const dhikrFa = require("../assets/data/daily-dua/dhikr.fa.json");
        const dhikrMorningFa = require("../assets/data/morning-dhikr/morning.fa.json");
        const eveningDhikrFa = require("../assets/data/evening-dhikr/evening.fa.json");
        const afterSalahFa = require("../assets/data/dhikr-after-salah/aftersalah.fa.json");
        const selectedDuaFa = require("../assets/data/selected-dua/selected.fa.json");

        resources.translation = fa;
        resources.asmaulhusna = asmaulhusnaFa;
        resources.dhikr = dhikrFa;
        resources.dhikrMorning = dhikrMorningFa;
        resources.eveningDhikr = eveningDhikrFa;
        resources.afterSalah = afterSalahFa;
        resources.selectedDua = selectedDuaFa;
        break;
      default:
        // Fallback vers EN si erreur
        resources.translation = en;
        resources.asmaulhusna = asmaulhusnaEn;
        resources.dhikr = dhikrEn;
        resources.dhikrMorning = dhikrMorningEn;
        resources.eveningDhikr = dhikrEveningEn;
        resources.afterSalah = dhikrSalahEn;
        resources.selectedDua = selectedDuaEn;
    }
  } catch (error) {
    console.warn(
      `[i18n-optimized] Erreur chargement ${language}, fallback vers EN:`,
      error
    );
    // Fallback vers EN si erreur
    resources.translation = en;
    resources.asmaulhusna = asmaulhusnaEn;
    resources.dhikr = dhikrEn;
    resources.dhikrMorning = dhikrMorningEn;
    resources.eveningDhikr = dhikrEveningEn;
    resources.afterSalah = dhikrSalahEn;
    resources.selectedDua = selectedDuaEn;
  }

  return resources;
};

// Configuration avec chargement initial optimisé
const initializeI18n = async () => {
  // Détection de la langue système (API expo-localization v16+)
  const deviceLanguage = Localization.getLocales()[0]?.languageCode || "en";
  const supportedLanguages = [
    "en",
    "fr",
    "ar",
    "es",
    "it",
    "ru",
    "tr",
    "de",
    "pt",
    "nl",
    "ur",
    "bn",
    "fa",
  ];
  const initialLanguage = supportedLanguages.includes(deviceLanguage)
    ? deviceLanguage
    : "en";

  // Configuration identique à l'original
  await i18n.use(initReactI18next).init({
    resources: {
      en: {
        translation: en,
        asmaulhusna: asmaulhusnaEn,
        dhikr: dhikrEn,
        dhikrMorning: dhikrMorningEn,
        eveningDhikr: dhikrEveningEn,
        afterSalah: dhikrSalahEn,
        selectedDua: selectedDuaEn,
      },
      fr: {
        translation: fr,
        asmaulhusna: asmaulhusnaFr,
        dhikr: dhikrFr,
        dhikrMorning: dhikrMorningFr,
        eveningDhikr: dhikrEveningFr,
        afterSalah: dhikrSalahFr,
        selectedDua: selectedDuaFr,
      },
      ar: {
        translation: ar,
        asmaulhusna: asmaulhusnaAr,
        dhikr: dhikrAr,
        dhikrMorning: dhikrMorningAr,
        eveningDhikr: dhikrEveningAr,
        afterSalah: dhikrSalahAr,
        selectedDua: selectedDuaAr,
      },
    },
    lng: initialLanguage,
    fallbackLng: "en",
    ns: [
      "translation",
      "asmaulhusna",
      "dhikr",
      "dhikrMorning",
      "eveningDhikr",
      "afterSalah",
      "selectedDua",
    ],
    defaultNS: "translation",
    interpolation: {
      escapeValue: false,
    },
    // Ajout de propriétés pour de meilleures performances
    load: "languageOnly",
    preload: ["en", "fr", "ar"], // Pré-charger seulement les principales
  });

  // Si la langue système n'est pas dans les 3 principales, la charger dynamiquement
  if (!["en", "fr", "ar"].includes(initialLanguage)) {
    const resources = await loadLanguageResources(initialLanguage);
    i18n.addResourceBundle(
      initialLanguage,
      "translation",
      resources.translation,
      true,
      true
    );
    i18n.addResourceBundle(
      initialLanguage,
      "asmaulhusna",
      resources.asmaulhusna,
      true,
      true
    );
    i18n.addResourceBundle(
      initialLanguage,
      "dhikr",
      resources.dhikr,
      true,
      true
    );
    i18n.addResourceBundle(
      initialLanguage,
      "dhikrMorning",
      resources.dhikrMorning,
      true,
      true
    );
    i18n.addResourceBundle(
      initialLanguage,
      "eveningDhikr",
      resources.eveningDhikr,
      true,
      true
    );
    i18n.addResourceBundle(
      initialLanguage,
      "afterSalah",
      resources.afterSalah,
      true,
      true
    );
    i18n.addResourceBundle(
      initialLanguage,
      "selectedDua",
      resources.selectedDua,
      true,
      true
    );
  }
};

// Fonction de changement de langue avec chargement dynamique
const changeLanguageOptimized = async (language: string) => {
  // Si la langue n'est pas déjà chargée, la charger dynamiquement
  if (!i18n.hasResourceBundle(language, "translation")) {
    console.log(`[i18n-optimized] Chargement dynamique de ${language}`);
    const resources = await loadLanguageResources(language);

    // Ajouter toutes les ressources comme dans l'original
    i18n.addResourceBundle(
      language,
      "translation",
      resources.translation,
      true,
      true
    );
    i18n.addResourceBundle(
      language,
      "asmaulhusna",
      resources.asmaulhusna,
      true,
      true
    );
    i18n.addResourceBundle(language, "dhikr", resources.dhikr, true, true);
    i18n.addResourceBundle(
      language,
      "dhikrMorning",
      resources.dhikrMorning,
      true,
      true
    );
    i18n.addResourceBundle(
      language,
      "eveningDhikr",
      resources.eveningDhikr,
      true,
      true
    );
    i18n.addResourceBundle(
      language,
      "afterSalah",
      resources.afterSalah,
      true,
      true
    );
    i18n.addResourceBundle(
      language,
      "selectedDua",
      resources.selectedDua,
      true,
      true
    );
  }

  await i18n.changeLanguage(language);
};

// Export de la fonction de changement de langue optimisée
export const changeLanguage = changeLanguageOptimized;

// Initialisation automatique
initializeI18n().catch(console.error);

// Export identique à l'original
export default i18n;
