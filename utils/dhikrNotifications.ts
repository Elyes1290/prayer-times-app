import { NativeModules } from "react-native";
import i18n from "../locales/i18n-optimized";

type DhikrItem = {
  arabic: string;
  translation?: string;
  latin?: string;
};

// type PrayerLabel = "Fajr" | "Dhuhr" | "Asr" | "Maghrib" | "Isha"; // inutilisé
// type PrayerTimes = Record<PrayerLabel, Date>; // inutilisé

type DhikrSettings = {
  enabledAfterSalah: boolean;
  delayAfterSalah: number;
  enabledMorningDhikr: boolean;
  delayMorningDhikr: number;
  enabledEveningDhikr: boolean;
  delayEveningDhikr: number;
  enabledSelectedDua: boolean;
  delaySelectedDua: number;
};

function getRandomDhikrFromNamespace(
  namespace: string,
  language = i18n.language
): DhikrItem | null {
  const raw = i18n.getResource(language, namespace, "");
  if (Array.isArray(raw) && raw.length) {
    const arr = raw as DhikrItem[];
    return arr[Math.floor(Math.random() * arr.length)];
  }
  return null;
}

function buildDhikrNotifText(namespace: string, dhikr: DhikrItem): string {
  // Résolution robuste des libellés pour éviter l'affichage des clés brutes
  const resolveLabel = (key: string, fallbackKey?: string): string => {
    const value = i18n.t(key);
    if (value === key && fallbackKey) {
      const fb = i18n.t(fallbackKey);
      if (fb !== fallbackKey) return fb;
    }
    return value !== key ? value : "Dhikr";
  };

  const labelMap: Record<string, string> = {
    dhikrMorning: resolveLabel("dhikr.categories.morning"),
    eveningDhikr: resolveLabel("dhikr.categories.evening"),
    selectedDua: resolveLabel("dhikr.categories.selectedDua"),
    // Fallback spécifique vers une autre clé existante si jamais la catégorie n'est pas chargée à temps
    afterSalah: resolveLabel(
      "dhikr.categories.afterSalah",
      "dhikr.after_prayer"
    ),
  };
  const notifLabel = `[${labelMap[namespace] || ""}]`;
  return (
    notifLabel +
    "\n" +
    (dhikr.arabic || "") +
    (dhikr.translation ? "\n\n" + dhikr.translation : "") +
    (dhikr.latin ? "\n" + dhikr.latin : "")
  );
}

export async function scheduleAllDhikrNotifications(
  prayerTimes: Record<string, Date>,
  dhikrSettings: DhikrSettings,
  dateKey?: string // 🔑 Nouvelle param optionnelle pour identifier la date
): Promise<any[]> {
  const now = new Date();
  const minTimeGap = 30 * 1000; // 30 secondes en millisecondes

  const notifications = Object.entries(prayerTimes).flatMap(
    ([prayer, time]) => {
      const dhikrNotifs = [];
      const timestamp = time.getTime();

      // Pour chaque type de dhikr activé
      if (dhikrSettings.enabledAfterSalah) {
        const dhikrTime = timestamp + dhikrSettings.delayAfterSalah * 60 * 1000;

        // Ne programme que les dhikrs futurs
        if (dhikrTime > now.getTime()) {
          const adjustedDhikrTime =
            dhikrTime - now.getTime() < minTimeGap
              ? now.getTime() + minTimeGap
              : dhikrTime;

          const dhikr = getRandomDhikrFromNamespace("afterSalah");
          if (dhikr) {
            // 🔑 Génère une clé unique incluant la date
            const uniqueKey = dateKey
              ? `afterSalah_${prayer}_${dateKey}`
              : `afterSalah_${prayer}_${Date.now()}`;

            dhikrNotifs.push({
              key: uniqueKey, // 🔑 Ajout de la clé unique
              type: "afterSalah",
              triggerMillis: adjustedDhikrTime, // Pour Android
              triggerAtMillis: adjustedDhikrTime, // 🔧 Pour iOS (même nom que Adhans)
              title: i18n.t("dhikr_dua"),
              body: buildDhikrNotifText("afterSalah", dhikr),
              prayer,
              isToday: true,
            });
          }
        }
      }

      if (dhikrSettings.enabledMorningDhikr && prayer === "Fajr") {
        const notifTime = new Date(
          timestamp + dhikrSettings.delayMorningDhikr * 60 * 1000
        );
        if (notifTime > now) {
          const dhikr = getRandomDhikrFromNamespace("dhikrMorning");
          if (dhikr) {
            // 🔑 Génère une clé unique incluant la date
            const uniqueKey = dateKey
              ? `dhikrMorning_${prayer}_${dateKey}`
              : `dhikrMorning_${prayer}_${Date.now()}`;

            dhikrNotifs.push({
              key: uniqueKey, // 🔑 Ajout de la clé unique
              type: "dhikrMorning",
              triggerMillis: notifTime.getTime(), // Pour Android
              triggerAtMillis: notifTime.getTime(), // 🔧 Pour iOS (même nom que Adhans)
              title: i18n.t("dhikr_dua"),
              body: buildDhikrNotifText("dhikrMorning", dhikr),
              prayer,
            });
          }
        }
      }

      if (dhikrSettings.enabledEveningDhikr && prayer === "Maghrib") {
        const notifTime = new Date(
          timestamp + dhikrSettings.delayEveningDhikr * 60 * 1000
        );
        if (notifTime > now) {
          const dhikr = getRandomDhikrFromNamespace("eveningDhikr");
          if (dhikr) {
            // 🔑 Génère une clé unique incluant la date
            const uniqueKey = dateKey
              ? `eveningDhikr_${prayer}_${dateKey}`
              : `eveningDhikr_${prayer}_${Date.now()}`;

            dhikrNotifs.push({
              key: uniqueKey, // 🔑 Ajout de la clé unique
              type: "eveningDhikr",
              triggerMillis: notifTime.getTime(), // Pour Android
              triggerAtMillis: notifTime.getTime(), // 🔧 Pour iOS (même nom que Adhans)
              title: i18n.t("dhikr_dua"),
              body: buildDhikrNotifText("eveningDhikr", dhikr),
              prayer,
            });
          }
        }
      }

      if (dhikrSettings.enabledSelectedDua && prayer === "Dhuhr") {
        const notifTime = new Date(
          timestamp + dhikrSettings.delaySelectedDua * 60 * 1000
        );
        if (notifTime > now) {
          const dhikr = getRandomDhikrFromNamespace("selectedDua");
          if (dhikr) {
            // 🔑 Génère une clé unique incluant la date
            const uniqueKey = dateKey
              ? `selectedDua_${prayer}_${dateKey}`
              : `selectedDua_${prayer}_${Date.now()}`;

            dhikrNotifs.push({
              key: uniqueKey, // 🔑 Ajout de la clé unique
              type: "selectedDua",
              triggerMillis: notifTime.getTime(), // Pour Android
              triggerAtMillis: notifTime.getTime(), // 🔧 Pour iOS (même nom que Adhans)
              title: i18n.t("dhikr_dua"),
              body: buildDhikrNotifText("selectedDua", dhikr),
              prayer,
            });
          }
        }
      }

      return dhikrNotifs;
    }
  );

  // Log détaillé des délais calculés
  notifications.forEach((notif) => {
    // Logs allégés volontairement en production
    if (notif.type === "afterSalah") {
      // noop
    }
  });

  // 3. Programme SEULEMENT ce qui doit l'être
  // 🍎 Sur iOS, on ne programme pas ici car on aggrège tout à la fin
  if (notifications.length > 0 && Platform.OS !== "ios") {
    NativeModules.AdhanModule.scheduleDhikrNotifications(notifications);
  }
  return notifications; // 🔔 Retourner les notifications créées
}
