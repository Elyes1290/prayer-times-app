import { NativeModules, Platform } from "react-native";
import i18n from "../locales/i18n";

type DhikrItem = {
  arabic: string;
  translation?: string;
  latin?: string;
};

type PrayerLabel = "Fajr" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";
type PrayerTimes = Record<PrayerLabel, Date>;

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
  const labelMap: Record<string, string> = {
    dhikrMorning: i18n.t("dhikr.categories.morning"),
    eveningDhikr: i18n.t("dhikr.categories.evening"),
    selectedDua: i18n.t("dhikr.categories.selectedDua"),
    afterSalah: i18n.t("dhikr.categories.afterSalah"),
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
  dhikrSettings: DhikrSettings
): Promise<void> {
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
            dhikrNotifs.push({
              type: "afterSalah",
              triggerMillis: adjustedDhikrTime,
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
            dhikrNotifs.push({
              type: "dhikrMorning",
              triggerMillis: notifTime.getTime(),
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
            dhikrNotifs.push({
              type: "eveningDhikr",
              triggerMillis: notifTime.getTime(),
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
            dhikrNotifs.push({
              type: "selectedDua",
              triggerMillis: notifTime.getTime(),
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
  notifications.forEach((notif, index) => {
    const now = new Date().getTime();
    const delayMinutes = Math.round((notif.triggerMillis - now) / 60000);

    // Pour afterSalah, log aussi le délai configuré vs calculé
    if (notif.type === "afterSalah") {
      // Les logs ont été supprimés
    }
  });

  // 3. Programme SEULEMENT ce qui doit l'être
  if (notifications.length > 0) {
    NativeModules.AdhanModule.scheduleDhikrNotifications(notifications);
  }
}
