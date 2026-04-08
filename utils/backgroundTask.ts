import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { scheduleNotificationsFor2Days } from "./sheduleAllNotificationsFor30Days";
import { LocalStorageManager } from "./localStorageManager";
import { safeJsonParse } from "./safeJson";
import { Platform, NativeModules } from "react-native";

const BACKGROUND_FETCH_TASK = "BACKGROUND_NOTIFICATION_UPDATE";
const BACKGROUND_LOG_KEY = "BACKGROUND_NOTIFICATION_UPDATE_LOGS";

type BackgroundLogEntry = {
  ranAt: string; // ISO date
  success: boolean;
  durationMs?: number;
  adhanCount?: number;
  truncated?: boolean;
  error?: string;
  reason?: string;
};

const appendBackgroundLog = async (entry: BackgroundLogEntry) => {
  try {
    const existing = await AsyncStorage.getItem(BACKGROUND_LOG_KEY);
    const parsed: BackgroundLogEntry[] = existing ? JSON.parse(existing) : [];
    const updated = [entry, ...parsed].slice(0, 30); // garder les 30 derniers
    await AsyncStorage.setItem(BACKGROUND_LOG_KEY, JSON.stringify(updated));
  } catch (err) {
    console.log("⚠️ [BackgroundFetch] Impossible de logger l'historique:", err);
  }
};

const readBackgroundLogs = async (): Promise<BackgroundLogEntry[]> => {
  try {
    const existing = await AsyncStorage.getItem(BACKGROUND_LOG_KEY);
    return existing ? JSON.parse(existing) : [];
  } catch (err) {
    console.log("⚠️ [BackgroundFetch] Lecture des logs impossible:", err);
    return [];
  }
};

// Fonction commune de reprog + log (utilisée par la tâche et par le bouton debug)
const reprogramFromStoredSettings = async (reason: string) => {
  const start = new Date();

  if (Platform.OS !== "ios") {
    await appendBackgroundLog({
      ranAt: start.toISOString(),
      success: true,
      durationMs: 0,
      reason: "android-noop",
    });
    return {
      result: BackgroundFetch.BackgroundFetchResult.NoData,
      adhanCount: 0,
      truncated: false,
      durationMs: 0,
    };
  }

  try {
    // 1. Récupérer les réglages depuis le stockage persistant
    const [
      locationMode,
      manualLocationJson,
      autoLocationJson,
      calcMethod,
      notificationsEnabledStr,
      adhanSound,
      remindersEnabledStr,
      reminderOffsetStr,
      // ... Dhikr settings
      enabledAfterSalahStr,
      enabledMorningDhikrStr,
      delayMorningDhikrStr,
      enabledEveningDhikrStr,
      delayEveningDhikrStr,
      enabledSelectedDuaStr,
      delaySelectedDuaStr,
    ] = await Promise.all([
      LocalStorageManager.getEssential("LOCATION_MODE"),
      LocalStorageManager.getEssential("MANUAL_LOCATION"),
      LocalStorageManager.getEssential("AUTO_LOCATION"),
      LocalStorageManager.getEssential("CALC_METHOD"),
      LocalStorageManager.getEssential("NOTIFICATIONS_ENABLED"),
      LocalStorageManager.getEssential("ADHAN_SOUND"),
      LocalStorageManager.getEssential("REMINDERS_ENABLED"),
      LocalStorageManager.getEssential("REMINDER_OFFSET"),
      LocalStorageManager.getEssential("ENABLED_AFTER_SALAH"),
      LocalStorageManager.getEssential("ENABLED_MORNING_DHIKR"),
      LocalStorageManager.getEssential("DELAY_MORNING_DHIKR"),
      LocalStorageManager.getEssential("ENABLED_EVENING_DHIKR"),
      LocalStorageManager.getEssential("DELAY_EVENING_DHIKR"),
      LocalStorageManager.getEssential("ENABLED_SELECTED_DUA"),
      LocalStorageManager.getEssential("DELAY_SELECTED_DUA"),
    ]);

    const notificationsEnabled = notificationsEnabledStr === "true";

    if (notificationsEnabledStr !== null && !notificationsEnabled) {
      console.log("🚫 [BackgroundFetch] Notifications désactivées, arrêt.");
      await appendBackgroundLog({
        ranAt: start.toISOString(),
        success: false,
        durationMs: 0,
        reason: "notifications-disabled",
      });
      return {
        result: BackgroundFetch.BackgroundFetchResult.NoData,
        adhanCount: 0,
        truncated: false,
        durationMs: 0,
      };
    }

    const manualLocation = safeJsonParse<{ lat: number; lon: number } | null>(
      manualLocationJson,
      null
    );
    const autoLocation = safeJsonParse<{ lat: number; lon: number } | null>(
      autoLocationJson,
      null
    );

    let userLocation = null;
    if (locationMode === "manual" && manualLocation) {
      userLocation = {
        latitude: manualLocation.lat,
        longitude: manualLocation.lon,
      };
    } else if (autoLocation) {
      userLocation = {
        latitude: autoLocation.lat,
        longitude: autoLocation.lon,
      };
    }

    if (!userLocation) {
      console.log("⚠️ [BackgroundFetch] Aucune localisation trouvée, abandon.");
      await appendBackgroundLog({
        ranAt: start.toISOString(),
        success: false,
        durationMs: 0,
        reason: "no-location",
      });
      return {
        result: BackgroundFetch.BackgroundFetchResult.Failed,
        adhanCount: 0,
        truncated: false,
        durationMs: 0,
      };
    }

    // 3. Exécuter la reprogrammation (3 jours glissants côté iOS)
    const scheduleResult = await scheduleNotificationsFor2Days({
      userLocation,
      calcMethod: calcMethod || "MuslimWorldLeague",
      settings: {
        notificationsEnabled: true, // On a déjà vérifié plus haut
        adhanEnabled: true,
      },
      adhanSound: adhanSound || "misharyrachid",
      remindersEnabled: remindersEnabledStr === "true",
      reminderOffset: Number(reminderOffsetStr || 10),
      dhikrSettings: {
        enabledAfterSalah: enabledAfterSalahStr !== "false", // Default true si null
        delayAfterSalah: 5,
        enabledMorningDhikr: enabledMorningDhikrStr !== "false",
        delayMorningDhikr: Number(delayMorningDhikrStr || 10),
        enabledEveningDhikr: enabledEveningDhikrStr !== "false",
        delayEveningDhikr: Number(delayEveningDhikrStr || 10),
        enabledSelectedDua: enabledSelectedDuaStr !== "false",
        delaySelectedDua: Number(delaySelectedDuaStr || 15),
      },
    });

    // 🕌 NOUVEAU : Calculer et mettre à jour les horaires du widget iOS
    try {
      const { PrayerTimesWidgetModule } = NativeModules;
      if (PrayerTimesWidgetModule?.updatePrayerTimes) {
        // Calculer les horaires du jour et de demain pour le widget
        const { computePrayerTimesForDate } = await import("./prayerTimes");
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const todayPrayerTimes = computePrayerTimesForDate(
          today,
          { latitude: userLocation.latitude, longitude: userLocation.longitude },
          calcMethod || "MuslimWorldLeague"
        );
        
        const tomorrowPrayerTimes = computePrayerTimesForDate(
          tomorrow,
          { latitude: userLocation.latitude, longitude: userLocation.longitude },
          calcMethod || "MuslimWorldLeague"
        );
        
        if (todayPrayerTimes && tomorrowPrayerTimes) {
          // Formater les horaires pour le widget (HH:mm)
          const formatTime = (date: Date): string => {
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
          };
          
          const todayFormatted = {
            Fajr: formatTime(todayPrayerTimes.Fajr),
            Sunrise: formatTime(todayPrayerTimes.Sunrise),
            Dhuhr: formatTime(todayPrayerTimes.Dhuhr),
            Asr: formatTime(todayPrayerTimes.Asr),
            Maghrib: formatTime(todayPrayerTimes.Maghrib),
            Isha: formatTime(todayPrayerTimes.Isha),
          };
          
          const tomorrowFormatted = {
            Fajr: formatTime(tomorrowPrayerTimes.Fajr),
            Sunrise: formatTime(tomorrowPrayerTimes.Sunrise),
            Dhuhr: formatTime(tomorrowPrayerTimes.Dhuhr),
            Asr: formatTime(tomorrowPrayerTimes.Asr),
            Maghrib: formatTime(tomorrowPrayerTimes.Maghrib),
            Isha: formatTime(tomorrowPrayerTimes.Isha),
          };
          
          console.log("🕌 [BackgroundFetch] Mise à jour widget - Aujourd'hui:", todayFormatted);
          console.log("🔮 [BackgroundFetch] Mise à jour widget - Demain:", tomorrowFormatted);
          
          await PrayerTimesWidgetModule.updatePrayerTimes(
            todayFormatted.Fajr,
            todayFormatted.Sunrise,
            todayFormatted.Dhuhr,
            todayFormatted.Asr,
            todayFormatted.Maghrib,
            todayFormatted.Isha,
            tomorrowFormatted.Fajr,
            tomorrowFormatted.Sunrise,
            tomorrowFormatted.Dhuhr,
            tomorrowFormatted.Asr,
            tomorrowFormatted.Maghrib,
            tomorrowFormatted.Isha
          );
          
          console.log("✅ [BackgroundFetch] Widget iOS mis à jour avec les horaires (aujourd'hui + demain)");
        }
      }
    } catch (widgetError) {
      console.log("⚠️ [BackgroundFetch] Erreur mise à jour widget:", widgetError);
      // Non bloquant
    }

    const endTime = new Date();
    const duration = endTime.getTime() - start.getTime();
    console.log("════════════════════════════════════════════════════════");
    console.log(`✅ [BackgroundFetch] Succès en ${duration}ms`);
    console.log("   📅 Notifications: fenêtre glissante 3 jours (iOS)");
    console.log("   🕌 Widget iOS: rafraîchi");
    console.log("   ⏰ Prochain réveil: best effort iOS (~6-24h)");
    console.log("════════════════════════════════════════════════════════");

    await appendBackgroundLog({
      ranAt: start.toISOString(),
      success: true,
      durationMs: duration,
      adhanCount: scheduleResult?.adhanCount,
      truncated: scheduleResult?.truncated,
      reason,
    });

    return {
      result: BackgroundFetch.BackgroundFetchResult.NewData,
      adhanCount: scheduleResult?.adhanCount,
      truncated: scheduleResult?.truncated,
      durationMs: duration,
    };
  } catch (error: any) {
    console.error("❌ [BackgroundFetch] Erreur:", error);
    await appendBackgroundLog({
      ranAt: start.toISOString(),
      success: false,
      error: error?.message || String(error),
      durationMs: 0,
      reason,
    });
    return {
      result: BackgroundFetch.BackgroundFetchResult.Failed,
      adhanCount: 0,
      truncated: false,
      durationMs: 0,
    };
  }
};

// Définition de la tâche (doit être appelée au niveau global, hors composant)
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  const res = await reprogramFromStoredSettings("background-task");
  return res.result;
});

// Fonction d'enregistrement à appeler au démarrage de l'app
export async function registerBackgroundFetchAsync() {
  if (Platform.OS !== "ios") return; // Seulement utile pour iOS

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_FETCH_TASK
    );
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: 60 * 60 * 6, // 6h (iOS best effort - plus fréquent pour plus de fiabilité)
        stopOnTerminate: false, // Continue même si l'app est fermée
        startOnBoot: true,
      });
      console.log(
        "✅ [BackgroundFetch] Tâche iOS enregistrée (réveil toutes les 6h pour reprogrammer 3 jours)"
      );
    }
  } catch (err) {
    console.log("❌ [BackgroundFetch] Erreur enregistrement:", err);
  }
}

// ⚙️ Utilisé par l'écran de debug pour forcer un run immédiat (mêmes logs)
export async function runBackgroundReprogrammingNow() {
  return reprogramFromStoredSettings("manual-debug");
}

// 📜 Récupérer l'historique (affiché dans debugNotifications)
export async function getBackgroundFetchLogs() {
  return readBackgroundLogs();
}
