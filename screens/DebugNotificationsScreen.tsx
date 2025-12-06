import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  NativeModules,
  Alert,
} from "react-native";
import { useThemeColors } from "../hooks/useThemeAssets";

export default function DebugNotificationsScreen() {
  const colors = useThemeColors();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testNotification = async () => {
    if (Platform.OS !== "ios") {
      Alert.alert("Info", "Ce test est uniquement pour iOS");
      return;
    }

    try {
      setLoading(true);
      console.log("🧪 [TEST] Programmation notification test dans 10 secondes...");

      // Créer une notification de test dans 10 secondes
      const now = new Date();
      const testTime = new Date(now.getTime() + 10000); // +10 secondes

      const testData = {
        Test_notification: {
          triggerAtMillis: testTime.getTime(),
          prayer: "Test",
          label: "test",
        },
      };

      await NativeModules.AdhanModule.scheduleAdhanAlarms(
        testData,
        "azan_madina"
      );

      Alert.alert(
        "✅ Test programmé",
        "Une notification devrait apparaître dans 10 secondes"
      );
      console.log("✅ [TEST] Notification test programmée pour:", testTime);
    } catch (error) {
      console.error("❌ [TEST] Erreur:", error);
      Alert.alert("Erreur", String(error));
    } finally {
      setLoading(false);
    }
  };

  const checkNotifications = async () => {
    if (Platform.OS !== "ios") {
      Alert.alert("Info", "Ce debug est uniquement pour iOS");
      return;
    }

    try {
      setLoading(true);
      console.log("🔍 [DEBUG] Récupération infos notifications...");

      const info = await NativeModules.AdhanModule.debugNotifications();
      setDebugInfo(info);

      console.log("🔍 [DEBUG] Infos reçues:", info);
      Alert.alert(
        "Debug Info",
        `Status: ${info.authorizationStatus}\nNotifications programmées: ${info.pendingCount}`
      );
    } catch (error) {
      console.error("❌ [DEBUG] Erreur:", error);
      Alert.alert("Erreur", String(error));
    } finally {
      setLoading(false);
    }
  };

  const cancelAll = async () => {
    if (Platform.OS !== "ios") {
      Alert.alert("Info", "Ce debug est uniquement pour iOS");
      return;
    }

    try {
      setLoading(true);
      await NativeModules.AdhanModule.cancelAllAdhanAlarms();
      Alert.alert("✅", "Toutes les notifications annulées");
      setDebugInfo(null);
    } catch (error) {
      console.error("❌ Erreur:", error);
      Alert.alert("Erreur", String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
        <Text style={[styles.title, { color: colors.text }]}>
          🔧 Debug Notifications iOS
        </Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={testNotification}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            🧪 Test notification (10 sec)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={checkNotifications}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            🔍 Vérifier notifications programmées
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: "#dc3545" }]}
          onPress={cancelAll}
          disabled={loading}
        >
          <Text style={styles.buttonText}>🗑️ Annuler toutes</Text>
        </TouchableOpacity>

        {debugInfo && (
          <View
            style={[
              styles.debugBox,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.debugTitle, { color: colors.text }]}>
              📊 Résultats
            </Text>
            <Text style={[styles.debugText, { color: colors.text }]}>
              Status: {debugInfo.authorizationStatus}
            </Text>
            <Text style={[styles.debugText, { color: colors.text }]}>
              Notifications programmées: {debugInfo.pendingCount}
            </Text>

            {debugInfo.notifications?.map((notif: any, index: number) => (
              <View key={index} style={styles.notifItem}>
                <Text style={[styles.notifText, { color: colors.text }]}>
                  [{notif.identifier}]
                </Text>
                <Text style={[styles.notifText, { color: colors.text }]}>
                  {notif.title}
                </Text>
                <Text style={[styles.notifText, { color: colors.textSecondary }]}>
                  {notif.trigger}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.infoBox}>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            💡 Instructions:
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            1. Clique sur "Test notification" pour tester
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            2. Attends 10 secondes, une notification devrait apparaître
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            3. Utilise "Vérifier" pour voir toutes les notifications programmées
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            4. Regarde les logs de l'iPhone pour plus de détails
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  button: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  debugBox: {
    marginTop: 20,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
  },
  debugTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  debugText: {
    fontSize: 14,
    marginBottom: 5,
  },
  notifItem: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 5,
  },
  notifText: {
    fontSize: 12,
    marginBottom: 3,
  },
  infoBox: {
    marginTop: 30,
    padding: 15,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 10,
  },
  infoText: {
    fontSize: 12,
    marginBottom: 5,
  },
});

