import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export async function initNotifications(adhanSound = "adhamalsharqawe") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Permission de notifications refusée");
  }

  // Ici on crée un canal Android qui utilise TON son
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("adhan-test14", {
      name: "adhan-test14",
      importance: Notifications.AndroidImportance.MAX,
      sound: adhanSound, // <- Nom du fichier SANS .mp3 !
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }
}

export async function setAdhanChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("adhan-test14", {
      name: "adhan-test14",
      importance: Notifications.AndroidImportance.MAX,
      // PAS de propriété 'sound' ici pour utiliser le son système par défaut
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }
}

export async function schedulePrayerNotifications(
  prayerTimes: Record<string, Date>,
  adhanSound: string,
  remindersEnabled: boolean,
  reminderOffset: number
) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!remindersEnabled) return;

  for (const [label, date] of Object.entries(prayerTimes)) {
    if (date > new Date()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "⏰ Rappel prière",
          body: `La prière ${label} est dans ${reminderOffset} minutes.`,
          channelId: "adhan-test14",
        } as any,
        trigger: { type: "date", date: date } as any,
      });
    }
  }
}

/**
 * Programme une notification de test dans X secondes
 * @param seconds délai avant affichage
 */
export async function testNotificationIn(seconds: number, adhanSound: string) {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Notifications non autorisées");
  }

  // On (re)crée le canal avec le son voulu
  if (Platform.OS === "android") {
    await setAdhanChannel(); // CRUCIAL
    await Notifications.setNotificationChannelAsync("adhan-test14", {
      name: "adhan-test14",
      importance: Notifications.AndroidImportance.MAX,
      sound: adhanSound, // sans .mp3
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "🔔 Test",
      body: `Arrive dans ${seconds}s`,
      // PAS de "sound" ici pour Android, le canal s'en charge
      sound: adhanSound, // sans .mp3
    },
    trigger: { type: "timeInterval", seconds, repeats: false } as any,
    android: { channelId: "adhan-test14" }, // <-- TS ne connaît pas ce champ, mais c’est OK natif
  } as any);
}
