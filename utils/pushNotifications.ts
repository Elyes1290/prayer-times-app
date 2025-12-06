/**
 * 🔔 Silent Push Notifications (iOS) - Méthode Topics
 *
 * Permet de reprogrammer automatiquement les notifications tous les jours
 * sans que l'utilisateur ait besoin d'ouvrir l'app.
 *
 * FONCTIONNEMENT :
 * 1. Chaque iPhone s'abonne au topic "ios_notifications"
 * 2. Le serveur envoie UN SEUL push quotidien au topic (minuit)
 * 3. Chaque iPhone se réveille et reprogramme SES notifications localement
 *    avec SES propres réglages (position, son, méthode de calcul...)
 *
 * AVANTAGES :
 * - ✅ Pas besoin de compte utilisateur
 * - ✅ Pas besoin de stocker les tokens en base de données
 * - ✅ Chaque iPhone conserve ses propres réglages
 * - ✅ Gratuit (Firebase Topics)
 * - ✅ Scalable (1 million d'utilisateurs = 1 seul envoi serveur)
 */

import messaging from "@react-native-firebase/messaging";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { scheduleNotificationsFor2Days } from "./sheduleAllNotificationsFor30Days";
import { LocalStorageManager } from "./localStorageManager";
import { safeJsonParse } from "./safeJson";
import { notificationDebugLog } from "./logger";

const IOS_NOTIFICATIONS_TOPIC = "ios_notifications";

/**
 * 🔔 Abonne l'utilisateur iOS au topic de notifications
 * Appelé au démarrage de l'app
 */
export async function subscribeToNotificationsTopic(): Promise<boolean> {
  if (Platform.OS !== "ios") {
    notificationDebugLog("⏭️ [PushNotifications] Abonnement ignoré (Android)");
    return false;
  }

  try {
    // 1. Demander la permission pour les notifications push
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log(
        "❌ [PushNotifications] Permission refusée par l'utilisateur"
      );
      return false;
    }

    // 2. S'abonner au topic Firebase
    await messaging().subscribeToTopic(IOS_NOTIFICATIONS_TOPIC);
    console.log(
      `✅ [PushNotifications] Abonné au topic "${IOS_NOTIFICATIONS_TOPIC}"`
    );

    // 3. Sauvegarder le statut d'abonnement
    await AsyncStorage.setItem("PUSH_TOPIC_SUBSCRIBED", "true");

    return true;
  } catch (error) {
    console.error(
      "❌ [PushNotifications] Erreur lors de l'abonnement au topic:",
      error
    );
    return false;
  }
}

/**
 * 🚫 Désabonne l'utilisateur du topic (si notifications désactivées)
 */
export async function unsubscribeFromNotificationsTopic(): Promise<void> {
  if (Platform.OS !== "ios") return;

  try {
    await messaging().unsubscribeFromTopic(IOS_NOTIFICATIONS_TOPIC);
    console.log(
      `🚫 [PushNotifications] Désabonné du topic "${IOS_NOTIFICATIONS_TOPIC}"`
    );
    await AsyncStorage.setItem("PUSH_TOPIC_SUBSCRIBED", "false");
  } catch (error) {
    console.error(
      "❌ [PushNotifications] Erreur lors du désabonnement:",
      error
    );
  }
}

/**
 * 🔄 Reprogramme les notifications avec les settings locaux de l'utilisateur
 * Appelé automatiquement quand un Silent Push est reçu
 */
async function refreshNotificationsFromLocalSettings(): Promise<void> {
  try {
    console.log("🔄 [PushNotifications] Reprogrammation démarrée...");

    // 1. Récupérer TOUS les settings locaux de CET iPhone
    const [
      locationMode,
      manualLocationJson,
      autoLocationJson,
      calcMethod,
      notificationsEnabledStr,
      adhanSound,
      remindersEnabledStr,
      reminderOffsetStr,
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

    // 2. Vérifier si les notifications sont activées
    const notificationsEnabled = notificationsEnabledStr === "true";
    if (!notificationsEnabled) {
      console.log("🚫 [PushNotifications] Notifications désactivées, abandon.");
      return;
    }

    // 3. Récupérer la localisation de CET utilisateur
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
      console.log(
        "⚠️ [PushNotifications] Aucune localisation disponible, abandon."
      );
      return;
    }

    console.log(
      `📍 [PushNotifications] Position: ${userLocation.latitude}, ${userLocation.longitude}`
    );
    console.log(`🔔 [PushNotifications] Son: ${adhanSound || "misharyrachid"}`);
    console.log(
      `📐 [PushNotifications] Méthode: ${calcMethod || "MuslimWorldLeague"}`
    );

    // 4. Reprogrammer les notifications pour 3 jours avec LES réglages de CET iPhone
    await scheduleNotificationsFor2Days({
      userLocation,
      calcMethod: calcMethod || "MuslimWorldLeague",
      settings: {
        notificationsEnabled: true,
        adhanEnabled: true,
      },
      adhanSound: adhanSound || "misharyrachid",
      remindersEnabled: remindersEnabledStr === "true",
      reminderOffset: Number(reminderOffsetStr || 10),
      dhikrSettings: {
        enabledAfterSalah: enabledAfterSalahStr !== "false", // Default true
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
      "✅ [PushNotifications] Notifications reprogrammées avec succès"
    );
  } catch (error) {
    console.error(
      "❌ [PushNotifications] Erreur lors de la reprogrammation:",
      error
    );
  }
}

/**
 * 🎯 Configure le gestionnaire de notifications silencieuses en arrière-plan
 * Appelé au démarrage de l'app (avant même le premier render)
 */
export function setupBackgroundMessageHandler(): void {
  if (Platform.OS !== "ios") {
    notificationDebugLog(
      "⏭️ [PushNotifications] Background handler ignoré (Android)"
    );
    return;
  }

  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log(
      "🔔 [PushNotifications] Silent Push reçu en arrière-plan:",
      remoteMessage.data
    );

    // Vérifier si c'est une notification de rafraîchissement
    if (remoteMessage.data?.action === "refresh_notifications") {
      const timestamp = remoteMessage.data?.timestamp;
      console.log(
        `⏰ [PushNotifications] Ordre de rafraîchissement reçu (timestamp: ${timestamp})`
      );

      // Reprogrammer les notifications avec les settings locaux
      await refreshNotificationsFromLocalSettings();
    } else {
      console.log("⚠️ [PushNotifications] Action inconnue, ignoré.");
    }

    return Promise.resolve();
  });

  console.log("✅ [PushNotifications] Background message handler configuré");
}

/**
 * 🔍 Obtenir le statut d'abonnement au topic
 */
export async function isSubscribedToTopic(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;

  try {
    const subscribed = await AsyncStorage.getItem("PUSH_TOPIC_SUBSCRIBED");
    return subscribed === "true";
  } catch {
    return false;
  }
}

/**
 * 🧪 Tester la réception d'une notification silencieuse (pour debug)
 */
export async function testSilentPushRefresh(): Promise<void> {
  if (Platform.OS !== "ios") {
    console.log("⚠️ [PushNotifications] Test disponible uniquement sur iOS");
    return;
  }

  console.log("🧪 [PushNotifications] Test de reprogrammation manuelle...");
  await refreshNotificationsFromLocalSettings();
}
