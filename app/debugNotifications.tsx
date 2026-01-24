import React, { useEffect, useState, useCallback } from "react";
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
  DeviceEventEmitter,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSettings } from "../contexts/SettingsContext";
import { computePrayerTimesForNotifications } from "../utils/prayerTimes";
import { useLocation } from "../hooks/useLocation";
import { usePrayerTimes } from "../hooks/usePrayerTimes";
import { usePremium } from "../contexts/PremiumContext";

export default function DebugNotificationsScreen() {
  const router = useRouter();
  // 🚧 Page désactivée pour la production (à réactiver seulement pour le debug local)
  const isDebugAllowed = true;
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [bgRuns, setBgRuns] = useState<any[]>([]);
  const [lastAutoReprog, setLastAutoReprog] = useState<string>("Jamais");
  const [bgRunLoading, setBgRunLoading] = useState(false);
  const [playbackLogs, setPlaybackLogs] = useState<any[]>([]);
  const [playbackLogsLoading, setPlaybackLogsLoading] = useState(false);
  const {
    manualLocation,
    autoLocation,
    calcMethod,
    notificationsEnabled,
    adhanSound,
    remindersEnabled,
    reminderOffset,
    dhikrSettings,
    locationMode,
  } = useSettings();

  // 🕌 Charger les horaires de prière pour debug
  const { location } = useLocation();
  const { user } = usePremium();
  const [today] = useState(new Date());

  const locationToUse =
    locationMode === "manual"
      ? manualLocation
        ? {
            coords: {
              latitude: manualLocation.lat,
              longitude: manualLocation.lon,
            },
          }
        : null
      : locationMode === "auto"
      ? location
      : null;

  const { prayerTimes: currentPrayerTimes, isLoading: isPrayerTimesLoading } =
    usePrayerTimes(locationToUse as any, today, user?.isPremium || false);

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const loadBackgroundLogs = useCallback(async () => {
    try {
      // Charger la dernière auto-reprog depuis HomeScreen
      const { default: AsyncStorage } = await import("@react-native-async-storage/async-storage");
      const lastAuto = await AsyncStorage.getItem("last_notif_reprogram_ios");
      if (lastAuto) {
        setLastAutoReprog(new Date(parseInt(lastAuto)).toLocaleString("fr-FR"));
      }

      if (Platform.OS !== "ios") return;
      const { getBackgroundFetchLogs } = await import(
        "../utils/backgroundTask"
      );
      const history = await getBackgroundFetchLogs();
      setBgRuns(history || []);
      addLog("📜 Historique background fetch chargé");
    } catch (error: any) {
      addLog(`❌ Erreur lecture logs background: ${error.message}`);
    }
  }, []);

  const loadPlaybackLogs = useCallback(async () => {
    try {
      setPlaybackLogsLoading(true);
      const { getPlaybackDebugLogs } = await import(
        "../utils/playbackDebugLogs"
      );
      const logs = await getPlaybackDebugLogs();
      setPlaybackLogs(logs || []);
      addLog(`📜 ${logs.length} logs lecture chargés`);
    } catch (error: any) {
      addLog(`❌ Erreur lecture logs playback: ${error.message}`);
    } finally {
      setPlaybackLogsLoading(false);
    }
  }, []);

  const clearPlaybackLogs = async () => {
    try {
      const { clearPlaybackDebugLogs } = await import(
        "../utils/playbackDebugLogs"
      );
      await clearPlaybackDebugLogs();
      setPlaybackLogs([]);
      addLog("🗑️ Logs lecture effacés");
    } catch (error: any) {
      addLog(`❌ Erreur effacement logs playback: ${error.message}`);
    }
  };

  const forceBackgroundRun = async () => {
    if (Platform.OS !== "ios") {
      addLog("⚠️ Background fetch: iOS uniquement");
      return;
    }
    try {
      setBgRunLoading(true);
      addLog("🔄 [BG] Forcer une reprogrammation (3 jours)...");
      const { runBackgroundReprogrammingNow } = await import(
        "../utils/backgroundTask"
      );
      const res = await runBackgroundReprogrammingNow();
      addLog(
        `✅ [BG] Terminé: ${res.adhanCount ?? 0} adhans (tronqué=${
          res.truncated ? "oui" : "non"
        }) en ${res.durationMs ?? 0}ms`
      );
      await loadBackgroundLogs();
    } catch (error: any) {
      addLog(`❌ [BG] Erreur force run: ${error.message}`);
    } finally {
      setBgRunLoading(false);
    }
  };

  // 🚫 Désactiver l'accès en production
  useEffect(() => {
    if (!isDebugAllowed) {
      router.replace("/");
    }
  }, [router, isDebugAllowed]);

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

  // 🎵 Écouter les logs de lecture en temps réel
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      "AddPlaybackDebugLog",
      (event) => {
        const message = event.message || "Message inconnu";
        console.log(`📡 [DebugPage] Event reçu: ${message}`);

        const newLog = {
          timestamp: new Date().toISOString(),
          action: event.type === "error" ? `❌ ${message}` : `🎵 ${message}`,
          details: event.details || {},
        };

        setPlaybackLogs((prev) => [newLog, ...prev].slice(0, 100));
      }
    );

    // Auto-refresh logs from storage periodically
    const interval = setInterval(loadPlaybackLogs, 5000);

    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, [loadPlaybackLogs]);

  const fetchDebugInfo = useCallback(async () => {
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
  }, []);

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

  const testNotification = async () => {
    /* ... */
  };
  const testAdhan = async () => {
    try {
      addLog("═══════════════════════════════════════");
      addLog("🕌 Test Notification Adhan avec son");
      addLog("═══════════════════════════════════════");
      addLog(`🎵 Son sélectionné: ${adhanSound}.mp3`);
      addLog("⏱️ Notification programmée dans 10 secondes...");
      addLog("🔍 Préparation du payload...");

      const trigger = Date.now() + 10000;
      const payload = {
        Fajr_test: {
          time: trigger, // Pour Android
          triggerAtMillis: trigger, // Pour iOS
          displayLabel: "Fajr", // Pour Android
          prayer: "Fajr", // Pour iOS
          notifTitle: "🕌 Test Adhan",
          notifBody: `Test avec son: ${adhanSound}`,
          isToday: true,
        },
      };

      addLog("📦 Payload préparé:");
      addLog(JSON.stringify(payload, null, 2));
      addLog("");

      if (NativeModules.AdhanModule.scheduleAdhanAlarms) {
        addLog("📡 Envoi vers module natif...");
        addLog(`🎵 Avec son: ${adhanSound}`);
        await NativeModules.AdhanModule.scheduleAdhanAlarms(
          payload,
          adhanSound // ✅ Utilise le son actuellement sélectionné
        );
        addLog("✅ Notification programmée avec succès");
        addLog("");
        addLog("📋 Dans 10 secondes tu devrais:");
        addLog("   1. Voir la notification s'afficher");
        addLog(`   2. Entendre le son .caf (court) automatiquement`);
        addLog("   3. Cliquer sur la notification pour ouvrir l'app");
        addLog(`   4. Le MP3 complet se joue via AVAudioPlayer`);
        addLog("   5. Un bouton flottant rouge apparaît pour arrêter");
        addLog("");
        addLog(
          "🎯 NOUVEAU (iOS) : Clic sur notification → MP3 complet + bouton stop"
        );
        addLog("");
        addLog("💡 Si la notif arrive MAIS pas de son:");
        addLog("   → Clique sur 'Vérifier Sons Bundle'");
        addLog("   → Regarde les logs Swift dans 3uTools");
        addLog("═══════════════════════════════════════");

        setTimeout(() => {
          fetchDebugInfo();
          addLog("🔄 État natif rafraîchi");
        }, 2000);

        Alert.alert(
          "✅ Test programmé",
          `Notification dans 10s avec son: ${adhanSound}`,
          [{ text: "OK" }]
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
    loadBackgroundLogs();
    loadPlaybackLogs();
  }, [fetchDebugInfo, loadBackgroundLogs, loadPlaybackLogs]);

  if (!isDebugAllowed) return null;

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
          <Text style={[styles.status, { color: "#2196F3", fontWeight: "bold" }]}>
            Dernière Auto-Reprog: {lastAutoReprog}
          </Text>
        </View>

        {/* 🕌 DEBUG: Horaires de prière et calcul de la prochaine */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🕌 Debug Horaires de Prière</Text>
          <Text style={styles.logText}>
            ⏰ Heure système: {new Date().toLocaleString("fr-FR")}
          </Text>
          <Text style={styles.logText}>
            📅 Date aujourd&apos;hui: {today.toLocaleDateString("fr-FR")}
          </Text>
          <Text style={styles.logText}>
            📍 Localisation: {locationToUse ? "✅ OK" : "❌ Manquante"}
          </Text>
          {locationToUse && (
            <Text style={styles.logText}>
              Coords: {(locationToUse as any).coords?.latitude.toFixed(4)},{" "}
              {(locationToUse as any).coords?.longitude.toFixed(4)}
            </Text>
          )}
          <Text style={styles.logText}>
            🔄 Chargement:{" "}
            {isPrayerTimesLoading ? "⏳ En cours..." : "✅ Terminé"}
          </Text>

          {currentPrayerTimes ? (
            <>
              <Text
                style={[styles.logText, { marginTop: 10, fontWeight: "bold" }]}
              >
                📖 Horaires du jour:
              </Text>
              {["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"].map(
                (prayer) => {
                  const prayerTime = (currentPrayerTimes as any)[prayer];
                  const now = new Date();
                  const isPast = prayerTime && now >= prayerTime;
                  return (
                    <Text
                      key={prayer}
                      style={[
                        styles.logText,
                        { color: isPast ? "#999" : "#000" },
                      ]}
                    >
                      {prayer.toUpperCase()}:{" "}
                      {prayerTime
                        ? prayerTime.toLocaleTimeString("fr-FR")
                        : "N/A"}{" "}
                      {isPast ? "✓" : ""}
                    </Text>
                  );
                }
              )}

              <Text
                style={[
                  styles.logText,
                  { marginTop: 10, fontWeight: "bold", color: "#E91E63" },
                ]}
              >
                ⏭️ Calcul Prochaine Prière:
              </Text>
              {(() => {
                const now = new Date();
                const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
                let found = false;

                for (const prayer of prayers) {
                  const prayerTime = (currentPrayerTimes as any)[
                    prayer.toLowerCase()
                  ];
                  if (prayerTime && now < prayerTime) {
                    const diff = prayerTime.getTime() - now.getTime();
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const minutes = Math.floor(
                      (diff % (1000 * 60 * 60)) / (1000 * 60)
                    );
                    found = true;

                    return (
                      <>
                        <Text
                          style={[
                            styles.logText,
                            { color: "#4CAF50", fontWeight: "bold" },
                          ]}
                        >
                          ✅ PROCHAINE: {prayer}
                        </Text>
                        <Text style={styles.logText}>
                          Heure: {prayerTime.toLocaleTimeString("fr-FR")}
                        </Text>
                        <Text style={styles.logText}>
                          Dans: {hours}h {minutes}min
                        </Text>
                        <Text style={styles.logText}>
                          Timestamp prière: {prayerTime.getTime()}
                        </Text>
                        <Text style={styles.logText}>
                          Timestamp now: {now.getTime()}
                        </Text>
                        <Text style={styles.logText}>Diff ms: {diff}</Text>
                      </>
                    );
                  }
                }

                if (!found) {
                  return (
                    <Text style={[styles.logText, { color: "red" }]}>
                      ❌ Aucune prière à venir trouvée (toutes passées?)
                    </Text>
                  );
                }
              })()}
            </>
          ) : (
            <Text style={[styles.logText, { color: "red" }]}>
              ❌ Pas d&apos;horaires de prière chargés
            </Text>
          )}
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

            {Platform.OS === "ios" && (
              <>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: "#9C27B0" }]}
                  onPress={async () => {
                    try {
                      addLog("═══════════════════════════════════════");
                      addLog("🔄 [TEST] Simulation Background Fetch iOS");
                      addLog("═══════════════════════════════════════");

                      const { registerBackgroundFetchAsync } = await import(
                        "../utils/backgroundTask"
                      );

                      // Réenregistrer la tâche (au cas où)
                      await registerBackgroundFetchAsync();
                      addLog("✅ Tâche Background Fetch réenregistrée");

                      addLog(
                        "ℹ️ INFO: iOS déclenche le Background Fetch selon:"
                      );
                      addLog("   • Usage de l'app (fréquence d'ouverture)");
                      addLog("   • Niveau de batterie");
                      addLog("   • Connexion réseau");
                      addLog("   • Minimum configuré: 24 heures (quotidien)");
                      addLog("");
                      addLog("💡 Pour tester immédiatement:");
                      addLog("   1. Fermer complètement l'app");
                      addLog("   2. Xcode > Debug > Simulate Background Fetch");
                      addLog("   3. Ou attendre ~24h en usage normal");
                      addLog("═══════════════════════════════════════");
                    } catch (error) {
                      addLog(`❌ ERREUR: ${error}`);
                    }
                  }}
                >
                  <Text style={styles.buttonText}>
                    🔄 Info Background Fetch (iOS)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.button,
                    {
                      backgroundColor: "#3F51B5",
                      opacity: bgRunLoading ? 0.7 : 1,
                    },
                  ]}
                  onPress={forceBackgroundRun}
                  disabled={bgRunLoading}
                >
                  <Text style={styles.buttonText}>
                    🛰️ Forcer reprog 3j (iOS)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, { backgroundColor: "#607D8B" }]}
                  onPress={loadBackgroundLogs}
                >
                  <Text style={styles.buttonText}>📝 Rafraîchir logs BG</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, { backgroundColor: "#FF9800" }]}
                  onPress={async () => {
                    try {
                      addLog("═══════════════════════════════════════");
                      addLog("🎵 [VÉRIFICATION] Sons dans le Bundle iOS");
                      addLog("═══════════════════════════════════════");

                      const { AdhanModule } = NativeModules;

                      if (!AdhanModule?.listAvailableSounds) {
                        addLog(
                          "❌ Module AdhanModule.listAvailableSounds non disponible"
                        );
                        return;
                      }

                      const result = await AdhanModule.listAvailableSounds();

                      addLog(`📂 Bundle Path: ${result.bundlePath}`);
                      addLog(`🎵 Total MP3 dans le bundle: ${result.count}`);
                      addLog("");

                      if (result.sounds && result.sounds.length > 0) {
                        addLog("📋 Liste des MP3 dans le bundle:");
                        result.sounds.forEach((sound: string) => {
                          const isCurrent = sound === `${adhanSound}.mp3`;
                          addLog(
                            `   ${isCurrent ? "👉" : "  "} ${sound}${
                              isCurrent ? " ⭐ (SÉLECTIONNÉ)" : ""
                            }`
                          );
                        });

                        addLog("");
                        addLog(
                          `🎯 Son actuellement sélectionné: ${adhanSound}.mp3`
                        );

                        const currentSoundExists = result.sounds.includes(
                          `${adhanSound}.mp3`
                        );
                        if (currentSoundExists) {
                          addLog(`✅ Le son sélectionné EST dans le bundle`);
                          addLog(`✅ Les notifications devraient jouer ce son`);
                        } else {
                          addLog(
                            `❌ Le son sélectionné N'EST PAS dans le bundle`
                          );
                          addLog(
                            `⚠️ Les notifications utiliseront le son par défaut iOS`
                          );
                          addLog("");
                          addLog(
                            `💡 Sons disponibles: ${result.sounds.join(", ")}`
                          );
                        }
                      } else {
                        addLog("❌ AUCUN MP3 trouvé dans le bundle !");
                        addLog("");
                        addLog("💡 Causes possibles:");
                        addLog(
                          "   1. Le plugin Expo n'a pas copié les fichiers"
                        );
                        addLog("   2. Le build n'a pas inclus les MP3");
                        addLog("   3. Les MP3 ne sont pas dans assets/sounds/");
                        addLog("");
                        addLog("🔧 Solution: Rebuild l'app avec EAS Build");
                      }

                      addLog("═══════════════════════════════════════");
                    } catch (error) {
                      addLog(`❌ ERREUR vérification sons: ${error}`);
                      addLog(`📋 Détails: ${JSON.stringify(error)}`);
                    }
                  }}
                >
                  <Text style={styles.buttonText}>🎵 Vérifier Sons Bundle</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, { backgroundColor: "#E91E63" }]}
                  onPress={async () => {
                    try {
                      addLog("═══════════════════════════════════════");
                      addLog(
                        "📋 [LOGS] Récupération des logs de notifications"
                      );
                      addLog("═══════════════════════════════════════");

                      const { AdhanModule } = NativeModules;

                      if (!AdhanModule?.getNotificationLogs) {
                        addLog(
                          "❌ Module AdhanModule.getNotificationLogs non disponible"
                        );
                        addLog("");
                        addLog(
                          "ℹ️ Alternative: Utilise 3uTools pour voir les logs:"
                        );
                        addLog("   1. Ouvre 3uTools sur PC");
                        addLog("   2. Onglet 'Journaux en temps réel'");
                        addLog("   3. Filtre: 'NotificationDelegate'");
                        return;
                      }

                      const result = await AdhanModule.getNotificationLogs();

                      addLog(`📊 Total de logs capturés: ${result.count}`);
                      addLog("");

                      if (result.logs && result.logs.length > 0) {
                        addLog("📋 LOGS DES NOTIFICATIONS (dernières 100):");
                        addLog("─────────────────────────────────────");
                        result.logs.forEach((log: string) => {
                          addLog(log);
                        });
                        addLog("─────────────────────────────────────");
                        addLog("");
                        addLog(
                          "💡 Ces logs sont capturés QUAND LA NOTIFICATION ARRIVE"
                        );
                        addLog(
                          "   Ils montrent si le son est bien configuré ou non"
                        );
                      } else {
                        addLog("ℹ️ Aucun log capturé pour l'instant");
                        addLog("");
                        addLog("💡 Pour voir des logs:");
                        addLog(
                          "   1. Clique sur 'Test Adhan' (bouton ci-dessus)"
                        );
                        addLog("   2. Attends 10 secondes");
                        addLog(
                          "   3. Quand la notification arrive, elle est loggée"
                        );
                        addLog(
                          "   4. Reclique sur ce bouton pour voir les logs"
                        );
                      }

                      addLog("═══════════════════════════════════════");
                    } catch (error) {
                      addLog(`❌ ERREUR: ${error}`);
                    }
                  }}
                >
                  <Text style={styles.buttonText}>
                    📋 Voir Logs Notifications
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, { backgroundColor: "#4CAF50" }]}
                  onPress={async () => {
                    try {
                      addLog("═══════════════════════════════════════");
                      addLog("📥 [COPIE SONS] Début de la copie...");
                      addLog("═══════════════════════════════════════");

                      // Intercepter console.log temporairement pour capturer TOUS les logs
                      const originalLog = console.log;
                      const originalError = console.error;

                      console.log = (...args: any[]) => {
                        originalLog(...args);
                        const message = args
                          .map((arg) =>
                            typeof arg === "object"
                              ? JSON.stringify(arg, null, 2)
                              : String(arg)
                          )
                          .join(" ");
                        addLog(message);
                      };

                      console.error = (...args: any[]) => {
                        originalError(...args);
                        const message = args
                          .map((arg) =>
                            typeof arg === "object"
                              ? JSON.stringify(arg, null, 2)
                              : String(arg)
                          )
                          .join(" ");
                        addLog(`❌ ${message}`);
                      };

                      // Importer et appeler la fonction
                      const { setupIosSoundsForNotifications } = await import(
                        "../utils/iosSoundsSetup"
                      );
                      await setupIosSoundsForNotifications();

                      // Restaurer console.log
                      console.log = originalLog;
                      console.error = originalError;

                      addLog("═══════════════════════════════════════");
                      addLog("✅ [COPIE SONS] Terminé !");
                      addLog("💡 Utilisez 'Vérifier Sons' pour confirmer");
                      addLog("═══════════════════════════════════════");

                      Alert.alert(
                        "✅ Copie terminée",
                        "Les sons ont été copiés dans Library/Sounds.\n\nVérifiez les logs pour voir le détail."
                      );
                    } catch (error) {
                      addLog(`❌ ERREUR FATALE copie sons: ${error}`);
                      addLog(`Stack: ${(error as Error)?.stack}`);
                      Alert.alert("❌ Erreur", `Échec de la copie: ${error}`);
                    }
                  }}
                >
                  <Text style={styles.buttonText}>
                    📥 Copier Sons Maintenant
                  </Text>
                </TouchableOpacity>
              </>
            )}

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

            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#F44336" }]}
              onPress={async () => {
                try {
                  addLog("═══════════════════════════════════════");
                  addLog("🗑️ [CACHE] Vidage du cache des horaires de prière");
                  addLog("═══════════════════════════════════════");

                  const PrayerTimesCacheService = await import(
                    "../utils/PrayerTimesCacheService"
                  );
                  const cacheService =
                    PrayerTimesCacheService.default.getInstance();

                  await cacheService.clearAllCache();
                  addLog("✅ Cache vidé avec succès");
                  addLog("🔄 Rechargement de la page recommandé...");
                  addLog("═══════════════════════════════════════");

                  Alert.alert(
                    "✅ Cache vidé",
                    "Le cache des horaires a été vidé. Retourne sur la page d'accueil pour recharger les horaires.",
                    [{ text: "OK" }]
                  );
                } catch (error: any) {
                  addLog(`❌ Erreur vidage cache: ${error.message}`);
                  Alert.alert("❌ Erreur", `Échec du vidage: ${error.message}`);
                }
              }}
            >
              <Text style={styles.buttonText}>🗑️ Vider Cache Horaires</Text>
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
                <Text style={styles.cardId}>ID: {n.id || n.identifier}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>
              Aucune notification en attente.
            </Text>
          )}
        </View>

        {/* 🎵 NOUVEAU : Logs Lecture Audio */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎵 Debug Lecture Audio</Text>
          {playbackLogsLoading && (
            <Text style={styles.emptyText}>Chargement...</Text>
          )}
          {!playbackLogsLoading && playbackLogs.length > 0
            ? playbackLogs.slice(0, 20).map((log, i) => (
                <View
                  key={i}
                  style={[styles.card, { backgroundColor: "#f9f9f9" }]}
                >
                  <Text style={styles.cardTitle}>
                    {new Date(log.timestamp).toLocaleTimeString()} -{" "}
                    {log.action}
                  </Text>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <Text style={styles.cardBody}>
                      {JSON.stringify(log.details, null, 2)}
                    </Text>
                  )}
                </View>
              ))
            : !playbackLogsLoading && (
                <Text style={styles.emptyText}>
                  Aucun log de lecture. Essayez de lancer une sourate.
                </Text>
              )}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#2196F3", flex: 1 }]}
              onPress={loadPlaybackLogs}
            >
              <Text style={styles.buttonText}>🔄 Actualiser</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#F44336", flex: 1 }]}
              onPress={clearPlaybackLogs}
            >
              <Text style={styles.buttonText}>🗑️ Effacer</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historique Background (iOS)</Text>
          {Platform.OS !== "ios" ? (
            <Text style={styles.emptyText}>Disponible uniquement sur iOS.</Text>
          ) : bgRuns.length > 0 ? (
            bgRuns.map((run, i) => (
              <View key={i} style={styles.card}>
                <Text style={styles.cardTitle}>
                  {new Date(run.ranAt).toLocaleString()}
                </Text>
                <Text
                  style={[
                    styles.cardBody,
                    { color: run.success ? "green" : "red", fontWeight: "700" },
                  ]}
                >
                  {run.success ? "Succès" : "Échec"}
                </Text>
                <Text style={styles.cardBody}>
                  ⏱️ {run.durationMs ?? 0} ms | 🕌 {run.adhanCount ?? 0} adhans
                  {run.truncated ? " (tronqué)" : ""}
                </Text>
                {run.reason && (
                  <Text style={styles.cardFooter}>Raison: {run.reason}</Text>
                )}
                {run.error && (
                  <Text style={styles.cardFooter}>Erreur: {run.error}</Text>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>
              Aucun run background enregistré pour l&apos;instant.
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
