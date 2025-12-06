// utils/scheduleNotificationsFor2Days.ts

import { NativeModules, Platform } from "react-native";
import {
  computePrayerTimesForDate,
  computePrayerTimesForNotifications,
} from "./prayerTimes"; // Fonctions pour calculer les horaires de prière
import { schedulePrayerNotifications } from "./notifications";
import { scheduleAllDhikrNotifications } from "./dhikrNotifications";
import i18n from "../locales/i18n";
import { notificationDebugLog } from "./logger";

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
    console.log("═══════════════════════════════════════");
    console.log("🚀 [scheduleNotificationsFor2Days] DÉBUT");
    console.log("═══════════════════════════════════════");
    console.log("📱 Platform:", Platform.OS);
    console.log("📍 Location:", userLocation);
    console.log("⚙️ Settings:", settings);
    console.log("🔊 AdhanSound:", adhanSound);
    console.log("═══════════════════════════════════════");

    // 🔥 LOG VISIBLE DANS 3UTOOLS pour debug iOS
    if (Platform.OS === "ios" && NativeModules.AdhanModule?.debugLog) {
      NativeModules.AdhanModule.debugLog(
        "🚀 [JS] scheduleNotificationsFor2Days APPELÉ"
      );
    }

    notificationDebugLog("🚀 Début de la planification des notifications");
    notificationDebugLog(`📊 Méthode de calcul: ${calcMethod}`);
    notificationDebugLog(
      `📍 Location: ${userLocation.latitude}, ${userLocation.longitude}`
    );

    // Si les notifications sont désactivées globalement, on annule tout et on s'arrête là
    if (!settings.notificationsEnabled) {
      notificationDebugLog("🚫 Notifications désactivées, annulation de tout");
      await NativeModules.AdhanModule.cancelAllAdhanAlarms?.();
      await NativeModules.AdhanModule.cancelAllPrayerReminders();
      await NativeModules.AdhanModule.cancelAllDhikrNotifications?.();
      // 🛑 Arrêter aussi la maintenance quotidienne automatique
      await NativeModules.AdhanModule.stopDailyMaintenance?.();
      // 🛑 Arrêter aussi le planificateur de widget
      await NativeModules.AdhanModule.stopWidgetUpdateScheduler?.();
      return;
    }

    // 1. Annule tout d'abord toutes les alarmes et notifications existantes
    notificationDebugLog("🗑️ Annulation des alarmes existantes");
    notificationDebugLog("🚫 Appel cancelAllAdhanAlarms...");
    await NativeModules.AdhanModule.cancelAllAdhanAlarms?.();
    notificationDebugLog("🚫 Appel cancelAllPrayerReminders...");
    await NativeModules.AdhanModule.cancelAllPrayerReminders();
    notificationDebugLog("🚫 Appel cancelAllDhikrNotifications...");
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

    // 🔄 DÉMARRE LA MAINTENANCE QUOTIDIENNE AUTOMATIQUE (Android uniquement)
    if (Platform.OS === "android") {
      await NativeModules.AdhanModule.startDailyMaintenance();
      // 📱 DÉMARRE LE PLANIFICATEUR DE WIDGET (pour Samsung/Android récents)
      await NativeModules.AdhanModule.startWidgetUpdateScheduler();
    }

    // 2. Programme les notifications
    const now = new Date();
    const dates = [];
    const labels = [];

    // 🚀 iOS : Programme pour 3 jours (limite 64 notifs : 5×3 Adhans + 5×3 Rappels + 4×3 Dhikrs = 42)
    // 🤖 Android : Programme pour 2 jours (le Worker natif reprogramme quotidiennement)
    const daysToSchedule = Platform.OS === "ios" ? 3 : 2;

    notificationDebugLog(
      `📅 Programmation pour ${daysToSchedule} jours (${Platform.OS})`
    );

    // Calcule d'abord les horaires d'aujourd'hui pour vérifier si Isha est passé
    const today = new Date(now);
    const todayTimes = computePrayerTimesForDate(
      today,
      userLocation,
      calcMethod
    );
    const ishaToday = todayTimes.Isha;

    // Si on est avant Isha, inclure aujourd'hui
    if (now < ishaToday) {
      dates.push(new Date(today));
      labels.push("today");
    }

    // Ajouter les jours suivants
    for (let i = 1; i < daysToSchedule; i++) {
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + i);
      dates.push(futureDate);
      labels.push(i === 1 ? "tomorrow" : `day${i + 1}`);
    }

    notificationDebugLog(
      `📅 Dates à traiter: ${dates.map((d) => d.toISOString())}`
    );

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const label = labels[i];

      notificationDebugLog(`🔄 Traitement ${label} (${date.toDateString()})`);

      // 🔧 CORRECTION : Utiliser la fonction SANS Sunrise pour éviter les rappels sur Sunrise
      const prayerTimesForNotifications = computePrayerTimesForNotifications(
        date,
        userLocation,
        calcMethod
      );

      // 🔧 Pour le widget, on a besoin de Sunrise → utiliser la fonction complète
      const prayerTimesForWidget = computePrayerTimesForDate(
        date,
        userLocation,
        calcMethod
      );

      notificationDebugLog(
        `📅 Horaires calculés pour ${date.toDateString()} avec ${calcMethod}:`
      );
      notificationDebugLog(
        `⏰ Fajr: ${prayerTimesForNotifications.Fajr.toLocaleTimeString()}, Dhuhr: ${prayerTimesForNotifications.Dhuhr.toLocaleTimeString()}, Asr: ${prayerTimesForNotifications.Asr.toLocaleTimeString()}, Maghrib: ${prayerTimesForNotifications.Maghrib.toLocaleTimeString()}, Isha: ${prayerTimesForNotifications.Isha.toLocaleTimeString()}`
      );

      // 💾 SAUVEGARDE POUR LE WIDGET : Sauvegarder les horaires d'aujourd'hui pour le widget (AVEC Sunrise)
      if (label === "today") {
        try {
          // Convertir les dates en heures locales pour le widget Android
          const formattedTimes: Record<string, string> = {};
          Object.entries(prayerTimesForWidget).forEach(([prayer, date]) => {
            const hours = date.getHours().toString().padStart(2, "0");
            const minutes = date.getMinutes().toString().padStart(2, "0");
            formattedTimes[prayer] = `${hours}:${minutes}`;
          });

          await NativeModules.AdhanModule.saveTodayPrayerTimes(formattedTimes);
        } catch (error) {
          notificationDebugLog("⚠️ Erreur sauvegarde widget:", error);
        }
      }

      // 🔄 CALCUL UNIFIÉ : Calcule une seule fois les timestamps ajustés pour tous les services (SANS Sunrise)
      notificationDebugLog(
        `🔄 Traitement ${label}: ${
          Object.keys(prayerTimesForNotifications).length
        } prières`
      );

      const formattedTimes = Object.entries(prayerTimesForNotifications).reduce(
        (acc, [prayer, time]) => {
          const timestamp = time.getTime();
          const minutesUntilPrayer = Math.round(
            (timestamp - now.getTime()) / 60000
          );

          // Pour aujourd'hui, on ne garde que les prières futures
          // Pour les autres jours, on garde toutes les prières
          const shouldSchedule =
            label !== "today" ||
            (label === "today" && timestamp > now.getTime());

          // 🚀 iOS : Limite 3 jours (4320 min), Android : 24h (1440 min)
          const maxMinutes = Platform.OS === "ios" ? 4320 : 1440;

          notificationDebugLog(
            `  🔍 ${prayer} (${label}): ${minutesUntilPrayer}min, shouldSchedule=${shouldSchedule}, inLimit=${
              minutesUntilPrayer <= maxMinutes
            }`
          );

          // Ajoute un délai minimum de 30 secondes pour les notifications proches
          const minTimeGap = 30 * 1000; // 30 secondes en millisecondes
          if (shouldSchedule && minutesUntilPrayer <= maxMinutes) {
            const adjustedTimestamp =
              timestamp - now.getTime() < minTimeGap
                ? now.getTime() + minTimeGap
                : timestamp;

            notificationDebugLog(
              `✅ ${prayer}_${label} programmé dans ${minutesUntilPrayer} minutes (${new Date(
                adjustedTimestamp
              ).toLocaleTimeString()})`
            );

            acc[`${prayer}_${label}`] = {
              time: adjustedTimestamp,
              triggerAtMillis: adjustedTimestamp, // 🔧 iOS compatibility
              displayLabel: prayer,
              prayer: prayer, // 🔧 iOS compatibility
              notifTitle: i18n.t("adhan_notification_title"),
              notifBody: i18n.t("adhan_notification_body", { prayer }),
              isToday: label === "today",
            };
          } else {
            notificationDebugLog(
              `⏭️ ${prayer}_${label} ignoré car ${
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

      // Debug : Vérifier pourquoi formattedTimes pourrait être vide
      notificationDebugLog(
        `📊 Résultat ${label}: ${
          Object.keys(formattedTimes).length
        } adhans à programmer`
      );
      notificationDebugLog(
        `⚙️ settings.adhanEnabled = ${settings.adhanEnabled}`
      );

      // Programme l'adhan si activé
      if (settings.adhanEnabled && Object.keys(formattedTimes).length > 0) {
        notificationDebugLog(
          `🔔 Programmation ${
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

        console.log("🔍 [iOS DEBUG] Appel scheduleAdhanAlarms...");
        console.log(
          "🔍 [iOS DEBUG] formattedTimes:",
          JSON.stringify(formattedTimes, null, 2)
        );
        console.log("🔍 [iOS DEBUG] adhanSound:", adhanSound);
        console.log("🔍 [iOS DEBUG] Platform:", Platform.OS);
        console.log(
          "🔍 [iOS DEBUG] AdhanModule exists?",
          !!NativeModules.AdhanModule
        );

        // 🔥 LOG VISIBLE DANS 3UTOOLS
        if (Platform.OS === "ios" && NativeModules.AdhanModule?.debugLog) {
          NativeModules.AdhanModule.debugLog(
            `🔔 [JS] Appel scheduleAdhanAlarms avec ${
              Object.keys(formattedTimes).length
            } entrées`
          );
        }

        try {
          await NativeModules.AdhanModule.scheduleAdhanAlarms(
            formattedTimes,
            adhanSound
          );
          console.log("✅ [iOS DEBUG] scheduleAdhanAlarms terminé sans erreur");

          // 🔥 LOG VISIBLE DANS 3UTOOLS
          if (Platform.OS === "ios" && NativeModules.AdhanModule?.debugLog) {
            NativeModules.AdhanModule.debugLog(
              "✅ [JS] scheduleAdhanAlarms terminé"
            );
          }
        } catch (error) {
          console.error("❌ [iOS DEBUG] Erreur scheduleAdhanAlarms:", error);

          // 🔥 LOG VISIBLE DANS 3UTOOLS
          if (Platform.OS === "ios" && NativeModules.AdhanModule?.debugLog) {
            NativeModules.AdhanModule.debugLog(
              `❌ [JS] Erreur scheduleAdhanAlarms: ${error}`
            );
          }
        }
      } else {
        notificationDebugLog("🔕 Aucune alarme adhan à programmer");
      }

      // Programme les reminders si activés (utilise les timestamps synchronisés)
      if (remindersEnabled && Object.keys(synchronizedPrayerTimes).length > 0) {
        notificationDebugLog("⏰ Programmation des reminders");
        await schedulePrayerNotifications(
          synchronizedPrayerTimes,
          adhanSound,
          remindersEnabled,
          reminderOffset
        );
      } else {
        notificationDebugLog("⏰ Aucun reminder à programmer");
      }

      // Programme les dhikr si au moins un est activé (utilise les timestamps synchronisés)
      const anyDhikrEnabled = Object.entries(dhikrSettings)
        .filter(([key]) => key.startsWith("enabled"))
        .some(([_, value]) => value);

      if (anyDhikrEnabled && Object.keys(synchronizedPrayerTimes).length > 0) {
        notificationDebugLog("📿 Programmation des dhikr");
        await scheduleAllDhikrNotifications(
          synchronizedPrayerTimes,
          dhikrSettings
        );
      } else {
        notificationDebugLog("📿 Aucun dhikr à programmer");
      }
    }

    notificationDebugLog("✨ Planification terminée avec succès");
  } catch (error: any) {
    console.error("❌ ERREUR CRITIQUE dans scheduleNotificationsFor2Days:");
    console.error("  Message:", error?.message || "Pas de message");
    console.error("  Name:", error?.name || "Pas de nom");
    console.error("  Stack:", error?.stack || "Pas de stack");
    console.error("  Error object:", error);
    notificationDebugLog("❌ Erreur lors de la planification:", error);
    throw error; // Re-throw pour que l'écran de debug capture l'erreur
  }
}
