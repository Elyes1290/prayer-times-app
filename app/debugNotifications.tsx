import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  NativeModules,
  Platform,
  RefreshControl,
  Alert,
} from "react-native";
import { Stack } from "expo-router";
import { useSettings } from "../contexts/SettingsContext";
import { computePrayerTimesForNotifications } from "../utils/prayerTimes";

export default function DebugNotificationsScreen() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const {
    manualLocation,
    autoLocation,
    calcMethod,
    notificationsEnabled,
    adhanSound,
    remindersEnabled,
    reminderOffset,
    dhikrSettings,
  } = useSettings();

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  // 🔥 INTERCEPTER console.log pour capturer TOUS les logs
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args: any[]) => {
      originalLog(...args);
      const message = args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
        )
        .join(" ");
      setLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] 📝 ${message}`,
        ...prev,
      ]);
    };

    console.error = (...args: any[]) => {
      originalError(...args);
      const message = args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
        )
        .join(" ");
      setLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] ❌ ${message}`,
        ...prev,
      ]);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);

  const fetchDebugInfo = async () => {
    if (Platform.OS !== "ios") {
      addLog("⚠️ Ce diagnostic est pour iOS uniquement");
      return;
    }

    try {
      setLoading(true);
      addLog("🔍 Appel de AdhanModule.debugNotifications()...");

      if (!NativeModules.AdhanModule) {
        addLog("❌ AdhanModule est NULL ! Le module natif n'est pas chargé.");
        setLoading(false);
        return;
      }

      const info = await NativeModules.AdhanModule.debugNotifications();
      addLog(`✅ Réponse reçue: ${info.pendingCount} notifs en attente`);
      setDebugInfo(info);
    } catch (error: any) {
      addLog(`❌ Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testFullSave = async () => {
    try {
      addLog("═══════════════════════════════════════");
      addLog("💾 [TEST] Début Test Sauvegarde Complète");
      addLog("═══════════════════════════════════════");

      // Vérifier les prérequis
      if (!manualLocation && !autoLocation) {
        addLog("❌ ERREUR: Aucune localisation disponible");
        Alert.alert(
          "Erreur",
          "Aucune localisation disponible. Configurez votre position dans les paramètres."
        );
        return;
      }

      const userLocation = autoLocation || manualLocation;
      addLog(`📍 Localisation: ${userLocation?.lat}, ${userLocation?.lon}`);
      addLog(`⚙️ Méthode calcul: ${calcMethod}`);
      addLog(`🔊 Son Adhan: ${adhanSound}`);
      addLog(
        `🔔 Notifications: ${notificationsEnabled ? "Activées" : "Désactivées"}`
      );
      addLog(`⏰ Rappels: ${remindersEnabled ? "Activés" : "Désactivés"}`);

      addLog("🚀 Appel de saveAndReprogramAll()...");
      addLog("ℹ️ Cette fonction va :");
      addLog("   1. Annuler toutes les notifications existantes");
      addLog("   2. Calculer les horaires pour 10 jours (iOS)");
      addLog("   3. Programmer les nouvelles notifications");

      const startTime = Date.now();

      // Import dynamique pour éviter les erreurs de dépendance circulaire
      const { scheduleNotificationsFor2Days } = await import(
        "../utils/sheduleAllNotificationsFor30Days"
      );

      const userLocationFormatted = autoLocation
        ? { latitude: autoLocation.lat, longitude: autoLocation.lon }
        : manualLocation
        ? { latitude: manualLocation.lat, longitude: manualLocation.lon }
        : null;

      if (!userLocationFormatted) {
        addLog("❌ Impossible de formater la localisation");
        return;
      }

      addLog("📦 Paramètres envoyés à scheduleNotificationsFor2Days:");
      addLog(`   - userLocation: ${JSON.stringify(userLocationFormatted)}`);
      addLog(`   - calcMethod: ${calcMethod}`);
      addLog(`   - notificationsEnabled: ${notificationsEnabled}`);
      addLog(`   - adhanSound: ${adhanSound}`);
      addLog(`   - remindersEnabled: ${remindersEnabled}`);
      addLog(`   - reminderOffset: ${reminderOffset}`);

      try {
        await scheduleNotificationsFor2Days({
          userLocation: userLocationFormatted,
          calcMethod,
          settings: {
            notificationsEnabled,
            adhanEnabled: true,
          },
          adhanSound,
          remindersEnabled,
          reminderOffset,
          dhikrSettings,
        });

        const duration = Date.now() - startTime;
        addLog(`✅ scheduleNotificationsFor2Days() terminé en ${duration}ms`);
      } catch (error: any) {
        addLog(
          `❌ ERREUR dans scheduleNotificationsFor2Days: ${error.message}`
        );
        addLog(`   Stack: ${error.stack || "N/A"}`);
        throw error;
      }
      addLog("⏳ Attente 2s puis rafraîchissement...");

      setTimeout(async () => {
        await fetchDebugInfo();
        addLog("🔄 État natif rafraîchi");
        addLog("═══════════════════════════════════════");

        const endTime = Date.now();
        Alert.alert(
          "Test Terminé",
          `Sauvegarde complétée en ${
            endTime - startTime
          }ms.\nVérifiez les notifications programmées ci-dessous.`
        );
      }, 2000);
    } catch (e: any) {
      addLog(`❌ ERREUR: ${e.message}`);
      addLog(`Stack: ${e.stack || "N/A"}`);
      Alert.alert("Erreur", `Échec de la sauvegarde: ${e.message}`);
    }
  };

  const analyzeScheduleLogic = () => {
    addLog("📊 ANALYSE DE LA PLANIFICATION JS...");

    // 1. Vérifier la localisation
    const userLocation = manualLocation
      ? { latitude: manualLocation.lat, longitude: manualLocation.lon }
      : autoLocation
      ? { latitude: autoLocation.lat, longitude: autoLocation.lon }
      : null;

    if (!userLocation) {
      addLog("❌ ERREUR CRITIQUE: Aucune localisation disponible !");
      return;
    }
    addLog(
      `📍 Localisation: ${userLocation.latitude.toFixed(
        4
      )}, ${userLocation.longitude.toFixed(4)}`
    );

    // 2. Vérifier les réglages
    addLog(
      `⚙️ Notifications Globales: ${
        notificationsEnabled ? "✅ ACTIVÉES" : "❌ DÉSACTIVÉES"
      }`
    );
    addLog(`⚙️ Rappels: ${remindersEnabled ? "✅ ACTIVÉS" : "❌ DÉSACTIVÉS"}`);
    addLog(`⚙️ Offset Rappel: ${reminderOffset} min`);

    // 3. Simuler le calcul pour aujourd'hui
    const now = new Date();
    const today = new Date();
    addLog(`📅 Date simulée: ${today.toDateString()}`);
    addLog(`🕒 Heure actuelle: ${now.toLocaleTimeString()}`);

    try {
      const prayerTimes = computePrayerTimesForNotifications(
        today,
        userLocation,
        calcMethod
      );
      addLog("✅ Calcul des horaires réussi:");

      let adhanCount = 0;
      let reminderCount = 0;

      Object.entries(prayerTimes).forEach(([prayer, time]) => {
        const timestamp = time.getTime();
        const minutesUntil = Math.round((timestamp - now.getTime()) / 60000);

        let status = "";
        if (timestamp <= now.getTime()) {
          status = "❌ DÉJÀ PASSÉ (Ignoré)";
        } else {
          status = `✅ FUTUR (Dans ${minutesUntil} min)`;
          adhanCount++;
          if (remindersEnabled) reminderCount++;
        }

        addLog(`   - ${prayer}: ${time.toLocaleTimeString()} -> ${status}`);
      });

      addLog(`📊 Bilan théorique pour aujourd'hui:`);
      addLog(`   - Adhans à programmer: ${adhanCount}`);
      addLog(`   - Rappels à programmer: ${reminderCount}`);

      if (adhanCount === 0 && reminderCount === 0) {
        addLog(
          "⚠️ ATTENTION: Rien à programmer pour aujourd'hui (tout est passé ?)"
        );
        addLog("ℹ️ Note: Le système devrait aussi calculer pour demain.");
      }
    } catch (e: any) {
      addLog(`❌ ERREUR CALCUL: ${e.message}`);
    }
  };

  // ... (méthodes de test existantes inchangées) ...
  const requestPermissions = async () => {
    /* ... */
  };
  const testNotification = async () => {
    /* ... */
  };
  const testAdhan = async () => {
    try {
      addLog("🕌 Test Adhan (Fajr) dans 10s...");
      addLog("🔍 Préparation du payload...");

      const trigger = Date.now() + 10000;
      const payload = {
        Fajr_today: {
          time: trigger, // Pour Android
          triggerAtMillis: trigger, // Pour iOS
          displayLabel: "Fajr", // Pour Android
          prayer: "Fajr", // Pour iOS
          notifTitle: "Test Adhan",
          notifBody: "Ceci est un test d'Adhan",
          isToday: true,
        },
      };

      addLog("📦 Payload préparé:");
      addLog(JSON.stringify(payload, null, 2));

      if (NativeModules.AdhanModule.scheduleAdhanAlarms) {
        addLog("📡 Envoi vers Swift...");
        await NativeModules.AdhanModule.scheduleAdhanAlarms(
          payload,
          "misharyrachid"
        );
        addLog("✅ Commande Adhan envoyée à Swift");
        addLog("⏳ Attente 2s puis vérification...");
        setTimeout(() => {
          fetchDebugInfo();
          addLog("🔄 État natif rafraîchi");
        }, 2000);
        Alert.alert(
          "Succès",
          "Adhan de test envoyé (attendre 10s puis vérifier les notifs)"
        );
      } else {
        addLog("❌ Méthode scheduleAdhanAlarms introuvable");
      }
    } catch (e: any) {
      addLog(`❌ Erreur Test Adhan: ${e.message}`);
      addLog(`Stack: ${e.stack}`);
    }
  };

  useEffect(() => {
    fetchDebugInfo();
  }, []);

  // ... (getStatusLabel inchangé) ...
  const getStatusLabel = (status: number) => {
    switch (status) {
      case 0:
        return "Not Determined (0)";
      case 1:
        return "Denied (1) ❌";
      case 2:
        return "Authorized (2) ✅";
      default:
        return `Inconnu (${status})`;
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "🕵️ Debug Notifications iOS" }} />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchDebugInfo} />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Module Natif</Text>
          <Text style={styles.status}>
            AdhanModule:{" "}
            {NativeModules.AdhanModule ? "✅ PRÉSENT" : "❌ ABSENT"}
          </Text>
          <Text style={styles.status}>Plateforme: {Platform.OS}</Text>
        </View>

        {debugInfo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Permissions iOS</Text>
            <Text
              style={[
                styles.value,
                {
                  fontWeight: "bold",
                  color: debugInfo.authorizationStatus === 2 ? "green" : "red",
                },
              ]}
            >
              {getStatusLabel(debugInfo.authorizationStatus)}
            </Text>
            <Text style={styles.logText}>Raw: {JSON.stringify(debugInfo)}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Outils de Diagnostic</Text>
          <View style={styles.buttonColumn}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#9C27B0" }]}
              onPress={analyzeScheduleLogic}
            >
              <Text style={styles.buttonText}>📊 Analyser la Logique JS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#E91E63" }]}
              onPress={testFullSave}
            >
              <Text style={styles.buttonText}>💾 Test Sauvegarde Complète</Text>
            </TouchableOpacity>

            <View style={styles.row}>
              <TouchableOpacity
                style={[
                  styles.button,
                  { flex: 1, backgroundColor: "#2196F3", marginRight: 5 },
                ]}
                onPress={testNotification}
              >
                <Text style={styles.buttonText}>🔔 Test Rappel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  { flex: 1, backgroundColor: "#FF9800", marginLeft: 5 },
                ]}
                onPress={testAdhan}
              >
                <Text style={styles.buttonText}>🕌 Test Adhan</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#607D8B" }]}
              onPress={fetchDebugInfo}
            >
              <Text style={styles.buttonText}>🔄 Rafraîchir État Natif</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Notifications Programmées ({debugInfo?.pendingCount || 0})
          </Text>
          {debugInfo?.notifications?.length > 0 ? (
            debugInfo.notifications.map((n: any, i: number) => (
              <View key={i} style={styles.card}>
                <Text style={styles.cardTitle}>{n.title}</Text>
                <Text style={styles.cardBody}>{n.body}</Text>
                <Text style={styles.cardFooter}>Trigger: {n.trigger}</Text>
                <Text style={styles.cardId}>ID: {n.identifier}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>
              Aucune notification en attente.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Journal d&apos;analyse</Text>
          {logs.length === 0 && (
            <Text style={styles.emptyText}>
              Appuyez sur &quot;Analyser&quot; pour voir les détails...
            </Text>
          )}
          {logs.map((log, i) => (
            <Text key={i} style={styles.logText}>
              {log}
            </Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  scrollView: { padding: 16 },
  section: {
    marginBottom: 20,
    backgroundColor: "white",
    padding: 16,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 5,
  },
  status: { fontSize: 16, marginBottom: 5 },
  value: { fontSize: 16, marginBottom: 5 },
  card: {
    backgroundColor: "#f9f9f9",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  cardTitle: { fontWeight: "bold", fontSize: 14 },
  cardBody: { fontSize: 14, color: "#555" },
  cardFooter: { fontSize: 12, color: "#888", marginTop: 5, fontWeight: "600" },
  cardId: { fontSize: 10, color: "#aaa", marginTop: 2 },
  emptyText: {
    fontStyle: "italic",
    color: "#888",
    textAlign: "center",
    padding: 10,
  },
  buttonColumn: { flexDirection: "column", gap: 10 },
  row: { flexDirection: "row" },
  button: {
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 14 },
  logText: {
    fontFamily: "monospace",
    fontSize: 11,
    marginBottom: 4,
    color: "#333",
    paddingVertical: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
});
