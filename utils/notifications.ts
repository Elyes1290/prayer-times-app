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

  const reminders = Object.entries(prayerTimes).flatMap(([prayer, time]) => {
    const timestamp = time.getTime();
    const reminderTime = timestamp - reminderOffset * 60 * 1000;

    if (reminderTime <= now.getTime()) {
      return [];
    }

    const adjustedReminderTime =
      reminderTime - now.getTime() < minTimeGap
        ? now.getTime() + minTimeGap
        : reminderTime;

    const uniqueKey = dateKey
      ? `reminder_${prayer}_${dateKey}`
      : `reminder_${prayer}_${Date.now()}`;

    return [
      {
        key: uniqueKey,
        prayer,
        triggerMillis: adjustedReminderTime,
        triggerAtMillis: adjustedReminderTime,
        title: i18n.t("prayer_reminder_title"),
        body: i18n.t("prayer_reminder_body", {
          prayer,
          minutes: reminderOffset,
        }),
        isToday: true,
      },
    ];
  });

  // 2. Si remindersEnabled, on programme
  if (!remindersEnabled) return;

  if (reminders.length > 0) {
    // IMPORTANT: Sauvegarde le reminderOffset avant de programmer
    // pour que PrayerReminderService puisse le lire correctement
    await NativeModules.AdhanModule.saveNotificationSettings({
      reminderOffset: reminderOffset,
    });

    // 🍎 Sur iOS, on ne programme pas ici car on aggrège tout à la fin
    // (pour éviter d'écraser les notifs précédentes)
    if (Platform.OS !== "ios") {
      NativeModules.AdhanModule.schedulePrayerReminders(reminders);
    }
  }
  return reminders; // 🔔 Retourner les reminders créés
}
