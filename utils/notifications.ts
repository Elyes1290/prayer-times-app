import { NativeModules, Platform } from "react-native";
import i18n from "../locales/i18n";

export async function initNotifications() {
  // Vide côté Android natif
}
function getBasePrayerLabel(label: string): string {
  return label.replace(/_(today|tomorrow)$/, "");
}

export async function schedulePrayerNotifications(
  prayerTimes: Record<string, Date>,
  adhanSound: string,
  remindersEnabled: boolean,
  reminderOffset: number,
  dateKey?: string // 🔑 Nouvelle param optionnelle pour identifier la date
) {
  const now = new Date();
  const minTimeGap = 30 * 1000; // 30 secondes en millisecondes

  const reminders = Object.entries(prayerTimes)
    .map(([prayer, time]) => {
      const timestamp = time.getTime();
      const reminderTime = timestamp - reminderOffset * 60 * 1000;

      // Ne programme que les rappels futurs
      if (reminderTime <= now.getTime()) {
        return null;
      }

      // Si le rappel est trop proche, ajoute un délai minimum
      const adjustedReminderTime =
        reminderTime - now.getTime() < minTimeGap
          ? now.getTime() + minTimeGap
          : reminderTime;

      // 🔑 Génère une clé unique incluant la date pour éviter les collisions
      const uniqueKey = dateKey
        ? `${prayer}_${dateKey}`
        : `${prayer}_${Date.now()}`;

      return {
        key: uniqueKey, // 🔑 Ajout de la clé unique
        prayer,
        triggerMillis: adjustedReminderTime,
        title: i18n.t("prayer_reminder_title"),
        body: i18n.t("prayer_reminder_body", {
          prayer,
          minutes: reminderOffset,
        }),
        isToday: true,
      };
    })
    .filter(Boolean);

  // 2. Si remindersEnabled, on programme
  if (!remindersEnabled) return;

  if (reminders.length > 0) {
    // IMPORTANT: Sauvegarde le reminderOffset avant de programmer
    // pour que PrayerReminderService puisse le lire correctement
    await NativeModules.AdhanModule.saveNotificationSettings({
      reminderOffset: reminderOffset,
    });

    NativeModules.AdhanModule.schedulePrayerReminders(reminders);
  }
  return;
}
