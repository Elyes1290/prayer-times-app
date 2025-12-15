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

    // 🚀 Fenêtre glissante :
    // - iOS : 3 jours max (~54 notifs à 18/jour) pour rester sous la limite ~64
    // - Android : on garde 2 jours, le worker natif reprogramme déjà quotidiennement
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

    // 🔑 ACCUMULATION : Stocker tous les adhans de tous les jours
    let allAdhanNotifications: Record<string, any> = {};

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

          // 🚀 Limite en minutes basée sur daysToSchedule (3j iOS, 2j Android)
          const maxMinutes = daysToSchedule * 24 * 60;

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

            // 🔑 Identifiant UNIQUE avec la date complète pour éviter les collisions iOS
            const dateKey = date.toISOString().split("T")[0]; // Format: "2025-12-07"
            const uniqueKey = `${prayer}_${dateKey}`;

            acc[uniqueKey] = {
              time: adjustedTimestamp,
              triggerAtMillis: adjustedTimestamp, // 🔧 iOS compatibility
              displayLabel: prayer,
              prayer: prayer, // 🔧 iOS compatibility
              notifTitle: i18n.t("adhan_notification_title"),
              notifBody: i18n.t("adhan_notification_body", { prayer }),
              // ℹ️ Indication iOS uniquement : cliquer pour jouer l'Adhan complet
              notifHintIos:
                Platform.OS === "ios"
                  ? i18n.t("adhan_notification_tap_full")
                  : undefined,
              isToday: label === "today",
            };
          } else {
            const dateKey = date.toISOString().split("T")[0];
            notificationDebugLog(
              `⏭️ ${prayer}_${dateKey} ignoré car ${
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

      // 🔑 ACCUMULATION : Ajouter les adhans de ce jour à la liste globale
      if (settings.adhanEnabled && Object.keys(formattedTimes).length > 0) {
        notificationDebugLog(
          `📝 Accumulation ${
            Object.keys(formattedTimes).length
          } alarmes adhan pour ${label}:`,
          Object.entries(formattedTimes).map(([key, value]) => ({
            [key]: {
              ...value,
              time: value.time,
              localTime: new Date(value.time).toLocaleTimeString(),
            },
          }))
        );

        // Ajouter tous les adhans de ce jour à l'accumulation globale
        Object.assign(allAdhanNotifications, formattedTimes);
      } else {
        notificationDebugLog(`🔕 Aucune alarme adhan pour ${label}`);
      }

      // Programme les reminders si activés (utilise les timestamps synchronisés)
      if (remindersEnabled && Object.keys(synchronizedPrayerTimes).length > 0) {
        notificationDebugLog("⏰ Programmation des reminders");
        // 🔑 Passer le dateKey pour identifier de manière unique chaque reminder
        const dateKey = date.toISOString().split("T")[0]; // Format: "2025-12-08"
        await schedulePrayerNotifications(
          synchronizedPrayerTimes,
          adhanSound,
          remindersEnabled,
          reminderOffset,
          dateKey // 🔑 Clé unique pour éviter les collisions
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
        // 🔑 Passer le dateKey pour identifier de manière unique chaque dhikr
        const dateKey = date.toISOString().split("T")[0]; // Format: "2025-12-08"
        await scheduleAllDhikrNotifications(
          synchronizedPrayerTimes,
          dhikrSettings,
          dateKey // 🔑 Clé unique pour éviter les collisions
        );
      } else {
        notificationDebugLog("📿 Aucun dhikr à programmer");
      }
    }

    // 🔔 PROGRAMMATION GLOBALE : Programmer TOUS les adhans en une seule fois
    let truncated = false;
    // 🧭 Garde-fou iOS : ne jamais dépasser ~54 notifs Adhan (18/jour * 3j)
    if (Platform.OS === "ios") {
      const entries = Object.entries(allAdhanNotifications);
      if (entries.length > 54) {
        truncated = true;
        notificationDebugLog(
          `⚠️ Trop de notifications (${entries.length}) → tronquage à 54`
        );
        const sorted = entries.sort(
          (a, b) => (a[1].time as number) - (b[1].time as number)
        );
        const kept = sorted.slice(0, 54);
        allAdhanNotifications = Object.fromEntries(kept);
      }
    }

    if (
      settings.adhanEnabled &&
      Object.keys(allAdhanNotifications).length > 0
    ) {
      notificationDebugLog(
        `🔔 Programmation FINALE de ${
          Object.keys(allAdhanNotifications).length
        } alarmes adhan pour tous les jours`
      );

      console.log("🔍 [iOS DEBUG] Appel scheduleAdhanAlarms GLOBAL...");
      console.log(
        `🔍 [iOS DEBUG] Total adhans: ${
          Object.keys(allAdhanNotifications).length
        }`
      );
      console.log("🔍 [iOS DEBUG] adhanSound:", adhanSound);

      // 🔥 LOG VISIBLE DANS 3UTOOLS
      if (Platform.OS === "ios" && NativeModules.AdhanModule?.debugLog) {
        NativeModules.AdhanModule.debugLog(
          `🔔 [JS] Appel scheduleAdhanAlarms GLOBAL avec ${
            Object.keys(allAdhanNotifications).length
          } adhans`
        );
      }

      try {
        await NativeModules.AdhanModule.scheduleAdhanAlarms(
          allAdhanNotifications,
          adhanSound
        );
        console.log(
          "✅ [iOS DEBUG] scheduleAdhanAlarms GLOBAL terminé sans erreur"
        );

        // 🔥 LOG VISIBLE DANS 3UTOOLS
        if (Platform.OS === "ios" && NativeModules.AdhanModule?.debugLog) {
          NativeModules.AdhanModule.debugLog(
            "✅ [JS] scheduleAdhanAlarms GLOBAL terminé avec succès"
          );
        }
      } catch (error) {
        console.error(
          "❌ [iOS DEBUG] Erreur scheduleAdhanAlarms GLOBAL:",
          error
        );

        // 🔥 LOG VISIBLE DANS 3UTOOLS
        if (Platform.OS === "ios" && NativeModules.AdhanModule?.debugLog) {
          NativeModules.AdhanModule.debugLog(
            `❌ [JS] Erreur scheduleAdhanAlarms GLOBAL: ${error}`
          );
        }
      }
    } else {
      notificationDebugLog("🔕 Aucune alarme adhan à programmer au total");
    }

    notificationDebugLog("✨ Planification terminée avec succès");

    // ✅ Retourner un résumé (utilisé par le background fetch pour log)
    return {
      adhanCount: Object.keys(allAdhanNotifications).length,
      truncated,
    };
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
