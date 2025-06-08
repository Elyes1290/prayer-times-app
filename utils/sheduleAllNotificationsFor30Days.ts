// utils/scheduleNotificationsFor2Days.ts

import { NativeModules } from "react-native";
import { computePrayerTimesForDate } from "./prayerTimes"; // Fonction qui retourne { Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha } pour la date donnée
import { schedulePrayerNotifications } from "./notifications";
import { scheduleAllDhikrNotifications } from "./dhikrNotifications";
import i18n from "../locales/i18n";

// Types pour la fonction
type Location = { latitude: number; longitude: number };
type PrayerLabel = "Fajr" | "Sunrise" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";
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

type Params = {
  userLocation: Location;
  calcMethod: string;
  settings: {
    notificationsEnabled: boolean;
    adhanEnabled?: boolean;
  };
  adhanSound: string;
  remindersEnabled: boolean;
  reminderOffset: number;
  dhikrSettings: DhikrSettings;
};

export async function scheduleNotificationsFor2Days({
  userLocation,
  calcMethod,
  settings,
  adhanSound,
  remindersEnabled,
  reminderOffset,
  dhikrSettings,
}: Params) {
  try {
    console.log("[DEBUG] 🚀 Début de la planification des notifications");

    // Si les notifications sont désactivées globalement, on annule tout et on s'arrête là
    if (!settings.notificationsEnabled) {
      console.log("[DEBUG] 🚫 Notifications désactivées, annulation de tout");
      await NativeModules.AdhanModule.cancelAllAdhanAlarms?.();
      await NativeModules.AdhanModule.cancelAllPrayerReminders();
      await NativeModules.AdhanModule.cancelAllDhikrNotifications?.();
      return;
    }

    // 1. Annule tout d'abord toutes les alarmes et notifications existantes
    console.log("[DEBUG] 🗑️ Annulation des alarmes existantes");
    await NativeModules.AdhanModule.cancelAllAdhanAlarms?.();
    await NativeModules.AdhanModule.cancelAllPrayerReminders();
    await NativeModules.AdhanModule.cancelAllDhikrNotifications?.();

    // IMPORTANT: Sauvegarder tous les paramètres AVANT de programmer les notifications
    await NativeModules.AdhanModule.saveNotificationSettings({
      notificationsEnabled: settings.notificationsEnabled,
      remindersEnabled: remindersEnabled,
      enabledAfterSalah: dhikrSettings.enabledAfterSalah,
      enabledMorningDhikr: dhikrSettings.enabledMorningDhikr,
      enabledEveningDhikr: dhikrSettings.enabledEveningDhikr,
      enabledSelectedDua: dhikrSettings.enabledSelectedDua,
      reminderOffset: reminderOffset,
    });

    // IMPORTANT: Sauvegarder aussi le son d'adhan choisi
    await NativeModules.AdhanModule.setAdhanSound(adhanSound);

    // 2. Programme les notifications pour aujourd'hui et demain seulement
    const now = new Date();
    const today = new Date(now);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Si on est après Isha aujourd'hui, on ne calcule que pour demain
    const dates = [];
    const labels = [];

    // Calcule d'abord les horaires d'aujourd'hui pour vérifier si Isha est passé
    const todayTimes = computePrayerTimesForDate(
      today,
      userLocation,
      calcMethod
    );
    const ishaToday = todayTimes.Isha;

    if (now < ishaToday) {
      dates.push(today);
      labels.push("today");
    }

    // Ajoute toujours demain
    dates.push(tomorrow);
    labels.push("tomorrow");

    console.log(
      `[DEBUG] 📅 Dates à traiter: ${dates.map((d) => d.toISOString())}`
    );

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const label = labels[i];

      console.log(`[DEBUG] 🔄 Traitement ${label} (${date.toDateString()})`);

      const prayerTimes = computePrayerTimesForDate(
        date,
        userLocation,
        calcMethod
      );

      // 💾 SAUVEGARDE POUR LE WIDGET : Sauvegarder les horaires d'aujourd'hui pour le widget
      if (label === "today") {
        try {
          // Convertir les dates en heures locales pour le widget Android
          const formattedTimes: Record<string, string> = {};
          Object.entries(prayerTimes).forEach(([prayer, date]) => {
            const hours = date.getHours().toString().padStart(2, "0");
            const minutes = date.getMinutes().toString().padStart(2, "0");
            formattedTimes[prayer] = `${hours}:${minutes}`;
          });

          await NativeModules.AdhanModule.saveTodayPrayerTimes(formattedTimes);
        } catch (error) {
          console.warn("[DEBUG] ⚠️ Erreur sauvegarde widget:", error);
        }
      }

      // 🔄 CALCUL UNIFIÉ : Calcule une seule fois les timestamps ajustés pour tous les services
      const formattedTimes = Object.entries(prayerTimes).reduce(
        (acc, [prayer, time]) => {
          const timestamp = time.getTime();
          const minutesUntilPrayer = Math.round(
            (timestamp - now.getTime()) / 60000
          );

          // Pour aujourd'hui, on ne garde que les prières futures
          // Pour demain, on garde toutes les prières
          const shouldSchedule =
            label === "tomorrow" ||
            (label === "today" && timestamp > now.getTime());

          // Ajoute un délai minimum de 30 secondes pour les notifications proches
          const minTimeGap = 30 * 1000; // 30 secondes en millisecondes
          if (shouldSchedule && minutesUntilPrayer <= 1440) {
            const adjustedTimestamp =
              timestamp - now.getTime() < minTimeGap
                ? now.getTime() + minTimeGap
                : timestamp;

            console.log(
              `[DEBUG] ✅ ${prayer}_${label} programmé dans ${minutesUntilPrayer} minutes (${new Date(
                adjustedTimestamp
              ).toLocaleTimeString()})`
            );

            acc[`${prayer}_${label}`] = {
              time: adjustedTimestamp,
              displayLabel: prayer,
              notifTitle: i18n.t("adhan_notification_title"),
              notifBody: i18n.t("adhan_notification_body", { prayer }),
              isToday: label === "today",
            };
          } else {
            console.log(
              `[DEBUG] ⏭️ ${prayer}_${label} ignoré car ${
                !shouldSchedule
                  ? "déjà passé"
                  : minutesUntilPrayer > 1440
                  ? "trop loin"
                  : "non planifié"
              } (${new Date(timestamp).toLocaleTimeString()})`
            );
          }
          return acc;
        },
        {} as Record<string, any>
      );

      // 🎯 TIMESTAMPS SYNCHRONISÉS : Crée prayerTimes avec les timestamps ajustés pour la synchronisation
      const synchronizedPrayerTimes = Object.entries(formattedTimes).reduce(
        (acc, [key, value]) => {
          const prayer = value.displayLabel as PrayerLabel;
          acc[prayer] = new Date(value.time);
          return acc;
        },
        {} as Record<PrayerLabel, Date>
      );

      // Programme l'adhan si activé
      if (settings.adhanEnabled && Object.keys(formattedTimes).length > 0) {
        console.log(
          `[DEBUG] 🔔 Programmation ${
            Object.keys(formattedTimes).length
          } alarmes adhan:`,
          Object.entries(formattedTimes).map(([key, value]) => ({
            [key]: {
              ...value,
              time: value.time,
              localTime: new Date(value.time).toLocaleTimeString(),
            },
          }))
        );

        await NativeModules.AdhanModule.scheduleAdhanAlarms(
          formattedTimes,
          adhanSound
        );
      } else {
        console.log("[DEBUG] 🔕 Aucune alarme adhan à programmer");
      }

      // Programme les reminders si activés (utilise les timestamps synchronisés)
      if (remindersEnabled && Object.keys(synchronizedPrayerTimes).length > 0) {
        console.log("[DEBUG] ⏰ Programmation des reminders");
        await schedulePrayerNotifications(
          synchronizedPrayerTimes,
          adhanSound,
          remindersEnabled,
          reminderOffset
        );
      } else {
        console.log("[DEBUG] ⏰ Aucun reminder à programmer");
      }

      // Programme les dhikr si au moins un est activé (utilise les timestamps synchronisés)
      const anyDhikrEnabled = Object.entries(dhikrSettings)
        .filter(([key]) => key.startsWith("enabled"))
        .some(([_, value]) => value);

      if (anyDhikrEnabled && Object.keys(synchronizedPrayerTimes).length > 0) {
        console.log("[DEBUG] 📿 Programmation des dhikr");
        await scheduleAllDhikrNotifications(
          synchronizedPrayerTimes,
          dhikrSettings
        );
      } else {
        console.log("[DEBUG] 📿 Aucun dhikr à programmer");
      }
    }

    console.log("[DEBUG] ✨ Planification terminée avec succès");
  } catch (error) {
    console.error("[DEBUG] ❌ Erreur lors de la planification:", error);
  }
}
