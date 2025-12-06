import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import { scheduleNotificationsFor2Days } from "./sheduleAllNotificationsFor30Days";
import { LocalStorageManager } from "./localStorageManager";
import { safeJsonParse } from "./safeJson";
import { Platform } from "react-native";

const BACKGROUND_FETCH_TASK = "BACKGROUND_NOTIFICATION_UPDATE";

// Définition de la tâche (doit être appelée au niveau global, hors composant)
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    if (Platform.OS !== "ios") {
      // Sur Android, on a déjà le Worker natif qui est plus fiable
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    console.log("🔄 [BackgroundFetch] Réveil silencieux iOS démarré...");
    const now = new Date();

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

    // 2. Reconstruction des objets typés
    const notificationsEnabled = notificationsEnabledStr === "true";

    if (notificationsEnabledStr !== null && !notificationsEnabled) {
      console.log("🚫 [BackgroundFetch] Notifications désactivées, arrêt.");
      return BackgroundFetch.BackgroundFetchResult.NoData;
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
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    // 3. Exécuter la reprogrammation
    // Sur iOS, cela va étendre la planification à 3 jours à partir de "maintenant"
    await scheduleNotificationsFor2Days({
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

    console.log(
      `✅ [BackgroundFetch] Succès ! Notifications étendues à 3 jours à ${now.toLocaleTimeString()}`
    );
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error("❌ [BackgroundFetch] Erreur:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
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
        minimumInterval: 60 * 60 * 12, // Minimum 12 heures (Apple décide du timing réel)
        stopOnTerminate: false, // Tenter de continuer même si l'app est fermée
      });
      console.log("✅ [BackgroundFetch] Tâche iOS enregistrée avec succès");
    }
  } catch (err) {
    console.log("❌ [BackgroundFetch] Erreur enregistrement:", err);
  }
}
