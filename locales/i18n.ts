import i18n from "i18next";
import { initReactI18next } from "react-i18next";

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
import id from "./id.json";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
    es: { translation: es },
    it: { translation: it },
    ar: { translation: ar },
    ru: { translation: ru },
    tr: { translation: tr },
    de: { translation: de },
    pt: { translation: pt },
    nl: { translation: nl },
    ur: { translation: ur },
    bn: { translation: bn },
    fa: { translation: fa },
    id: { translation: id },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
