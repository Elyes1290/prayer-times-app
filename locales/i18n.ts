import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Langues principales
import en from "./en.json";
import fr from "./fr.json";
import es from "./es.json";
import it from "./it.json";
import ar from "./ar.json";
import ru from "./ru.json";
import tr from "./tr.json";
import de from "./de.json";
import pt from "./pt.json";
import nl from "./nl.json";
import ur from "./ur.json";
import bn from "./bn.json";
import fa from "./fa.json";

// Namespaces Asmaul Husna
import asmaulhusnaEn from "./asmaulhusna.en.json";
import asmaulhusnaFr from "./asmaulhusna.fr.json";
import asmaulhusnaEs from "./asmaulhusna.es.json";
import asmaulhusnaIt from "./asmaulhusna.it.json";
import asmaulhusnaAr from "./asmaulhusna.ar.json";
import asmaulhusnaRu from "./asmaulhusna.ru.json";
import asmaulhusnaTr from "./asmaulhusna.tr.json";
import asmaulhusnaDe from "./asmaulhusna.de.json";
import asmaulhusnaPt from "./asmaulhusna.pt.json";
import asmaulhusnaNl from "./asmaulhusna.nl.json";
import asmaulhusnaUr from "./asmaulhusna.ur.json";
import asmaulhusnaBn from "./asmaulhusna.bn.json";
import asmaulhusnaFa from "./asmaulhusna.fa.json";

// Namespaces Dhikr (Daily Duas)
import dhikrEn from "../assets/data/daily-dua/dhikr.en.json";
import dhikrFr from "../assets/data/daily-dua/dhikr.fr.json";
import dhikrEs from "../assets/data/daily-dua/dhikr.es.json";
import dhikrIt from "../assets/data/daily-dua/dhikr.it.json";
import dhikrAr from "../assets/data/daily-dua/dhikr.ar.json";
import dhikrRu from "../assets/data/daily-dua/dhikr.ru.json";
import dhikrTr from "../assets/data/daily-dua/dhikr.tr.json";
import dhikrDe from "../assets/data/daily-dua/dhikr.de.json";
import dhikrPt from "../assets/data/daily-dua/dhikr.pt.json";
import dhikrNl from "../assets/data/daily-dua/dhikr.nl.json";
import dhikrUr from "../assets/data/daily-dua/dhikr.ur.json";
import dhikrBn from "../assets/data/daily-dua/dhikr.bn.json";
import dhikrFa from "../assets/data/daily-dua/dhikr.fa.json";

// Namespaces Morning Dhikr
import dhikrMorningEn from "../assets/data/morning-dhikr/morning.en.json";
import dhikrMorningFr from "../assets/data/morning-dhikr/morning.fr.json";
import dhikrMorningEs from "../assets/data/morning-dhikr/morning.es.json";
import dhikrMorningIt from "../assets/data/morning-dhikr/morning.it.json";
import dhikrMorningAr from "../assets/data/morning-dhikr/morning.ar.json";
import dhikrMorningRu from "../assets/data/morning-dhikr/morning.ru.json";
import dhikrMorningTr from "../assets/data/morning-dhikr/morning.tr.json";
import dhikrMorningDe from "../assets/data/morning-dhikr/morning.de.json";
import dhikrMorningPt from "../assets/data/morning-dhikr/morning.pt.json";
import dhikrMorningNl from "../assets/data/morning-dhikr/morning.nl.json";
import dhikrMorningUr from "../assets/data/morning-dhikr/morning.ur.json";
import dhikrMorningBn from "../assets/data/morning-dhikr/morning.bn.json";
import dhikrMorningFa from "../assets/data/morning-dhikr/morning.fa.json";

// Namespaces Evening Dhikr
import dhikrEveningEn from "../assets/data/evening-dhikr/evening.en.json";
import dhikrEveningFr from "../assets/data/evening-dhikr/evening.fr.json";
import dhikrEveningEs from "../assets/data/evening-dhikr/evening.es.json";
import dhikrEveningIt from "../assets/data/evening-dhikr/evening.it.json";
import dhikrEveningAr from "../assets/data/evening-dhikr/evening.ar.json";
import dhikrEveningRu from "../assets/data/evening-dhikr/evening.ru.json";
import dhikrEveningTr from "../assets/data/evening-dhikr/evening.tr.json";
import dhikrEveningDe from "../assets/data/evening-dhikr/evening.de.json";
import dhikrEveningPt from "../assets/data/evening-dhikr/evening.pt.json";
import dhikrEveningNl from "../assets/data/evening-dhikr/evening.nl.json";
import dhikrEveningUr from "../assets/data/evening-dhikr/evening.ur.json";
import dhikrEveningBn from "../assets/data/evening-dhikr/evening.bn.json";
import dhikrEveningFa from "../assets/data/evening-dhikr/evening.fa.json";

// Namespaces After Salah
import dhikrSalahEn from "../assets/data/dhikr-after-salah/aftersalah.en.json";
import dhikrSalahFr from "../assets/data/dhikr-after-salah/aftersalah.fr.json";
import dhikrSalahEs from "../assets/data/dhikr-after-salah/aftersalah.es.json";
import dhikrSalahIt from "../assets/data/dhikr-after-salah/aftersalah.it.json";
import dhikrSalahAr from "../assets/data/dhikr-after-salah/aftersalah.ar.json";
import dhikrSalahRu from "../assets/data/dhikr-after-salah/aftersalah.ru.json";
import dhikrSalahTr from "../assets/data/dhikr-after-salah/aftersalah.tr.json";
import dhikrSalahDe from "../assets/data/dhikr-after-salah/aftersalah.de.json";
import dhikrSalahPt from "../assets/data/dhikr-after-salah/aftersalah.pt.json";
import dhikrSalahNl from "../assets/data/dhikr-after-salah/aftersalah.nl.json";
import dhikrSalahUr from "../assets/data/dhikr-after-salah/aftersalah.ur.json";
import dhikrSalahBn from "../assets/data/dhikr-after-salah/aftersalah.bn.json";
import dhikrSalahFa from "../assets/data/dhikr-after-salah/aftersalah.fa.json";

// Namespaces Selected Dua
import selectedDuaEn from "../assets/data/selected-dua/selected.en.json";
import selectedDuaFr from "../assets/data/selected-dua/selected.fr.json";
import selectedDuaEs from "../assets/data/selected-dua/selected.es.json";
import selectedDuaIt from "../assets/data/selected-dua/selected.it.json";
import selectedDuaAr from "../assets/data/selected-dua/selected.ar.json";
import selectedDuaRu from "../assets/data/selected-dua/selected.ru.json";
import selectedDuaTr from "../assets/data/selected-dua/selected.tr.json";
import selectedDuaDe from "../assets/data/selected-dua/selected.de.json";
import selectedDuaPt from "../assets/data/selected-dua/selected.pt.json";
import selectedDuaNl from "../assets/data/selected-dua/selected.nl.json";
import selectedDuaUr from "../assets/data/selected-dua/selected.ur.json";
import selectedDuaBn from "../assets/data/selected-dua/selected.bn.json";
import selectedDuaFa from "../assets/data/selected-dua/selected.fa.json";

i18n.use(initReactI18next).init({
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
    es: {
      translation: es,
      asmaulhusna: asmaulhusnaEs,
      dhikr: dhikrEs,
      dhikrMorning: dhikrMorningEs,
      eveningDhikr: dhikrEveningEs,
      afterSalah: dhikrSalahEs,
      selectedDua: selectedDuaEs,
    },
    it: {
      translation: it,
      asmaulhusna: asmaulhusnaIt,
      dhikr: dhikrIt,
      dhikrMorning: dhikrMorningIt,
      eveningDhikr: dhikrEveningIt,
      afterSalah: dhikrSalahIt,
      selectedDua: selectedDuaIt,
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
    ru: {
      translation: ru,
      asmaulhusna: asmaulhusnaRu,
      dhikr: dhikrRu,
      dhikrMorning: dhikrMorningRu,
      eveningDhikr: dhikrEveningRu,
      afterSalah: dhikrSalahRu,
      selectedDua: selectedDuaRu,
    },
    tr: {
      translation: tr,
      asmaulhusna: asmaulhusnaTr,
      dhikr: dhikrTr,
      dhikrMorning: dhikrMorningTr,
      eveningDhikr: dhikrEveningTr,
      afterSalah: dhikrSalahTr,
      selectedDua: selectedDuaTr,
    },
    de: {
      translation: de,
      asmaulhusna: asmaulhusnaDe,
      dhikr: dhikrDe,
      dhikrMorning: dhikrMorningDe,
      eveningDhikr: dhikrEveningDe,
      afterSalah: dhikrSalahDe,
      selectedDua: selectedDuaDe,
    },
    pt: {
      translation: pt,
      asmaulhusna: asmaulhusnaPt,
      dhikr: dhikrPt,
      dhikrMorning: dhikrMorningPt,
      eveningDhikr: dhikrEveningPt,
      afterSalah: dhikrSalahPt,
      selectedDua: selectedDuaPt,
    },
    nl: {
      translation: nl,
      asmaulhusna: asmaulhusnaNl,
      dhikr: dhikrNl,
      dhikrMorning: dhikrMorningNl,
      eveningDhikr: dhikrEveningNl,
      afterSalah: dhikrSalahNl,
      selectedDua: selectedDuaNl,
    },
    ur: {
      translation: ur,
      asmaulhusna: asmaulhusnaUr,
      dhikr: dhikrUr,
      dhikrMorning: dhikrMorningUr,
      eveningDhikr: dhikrEveningUr,
      afterSalah: dhikrSalahUr,
      selectedDua: selectedDuaUr,
    },
    bn: {
      translation: bn,
      asmaulhusna: asmaulhusnaBn,
      dhikr: dhikrBn,
      dhikrMorning: dhikrMorningBn,
      eveningDhikr: dhikrEveningBn,
      afterSalah: dhikrSalahBn,
      selectedDua: selectedDuaBn,
    },
    fa: {
      translation: fa,
      asmaulhusna: asmaulhusnaFa,
      dhikr: dhikrFa,
      dhikrMorning: dhikrMorningFa,
      eveningDhikr: dhikrEveningFa,
      afterSalah: dhikrSalahFa,
      selectedDua: selectedDuaFa,
    },
  },
  lng: "en",
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
});

export default i18n;
