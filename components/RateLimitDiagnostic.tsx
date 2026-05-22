import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { verifyAuth } from "../utils/apiClient";

interface RateLimitStatus {
  hasAuthToken: boolean;
  hasRefreshToken: boolean;
  hasUserData: boolean;
  pendingRegistration: boolean;
  lastApiCall: string | null;
  apiErrorCount: number;
}

const RateLimitDiagnostic: React.FC = () => {
  const [status, setStatus] = useState<RateLimitStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const refreshStatus = async () => {
    setIsRefreshing(true);
    try {
      const authToken = await AsyncStorage.getItem("auth_token");
      const refreshToken = await AsyncStorage.getItem("refresh_token");
      const userData = await AsyncStorage.getItem("user_data");
      const pendingRegistration = await AsyncStorage.getItem(
        "pending_registration"
      );
      const lastApiCall = await AsyncStorage.getItem("last_api_call");
      const apiErrorCount = await AsyncStorage.getItem("api_error_count");

      setStatus({
        hasAuthToken: !!authToken,
        hasRefreshToken: !!refreshToken,
        hasUserData: !!userData,
        pendingRegistration: !!pendingRegistration,
        lastApiCall: lastApiCall
          ? new Date(parseInt(lastApiCall)).toLocaleString()
          : null,
        apiErrorCount: apiErrorCount ? parseInt(apiErrorCount) : 0,
      });
    } catch (error) {
      console.error("❌ Erreur lors du rafraîchissement du statut:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const testApiConnection = async () => {
    setIsTesting(true);
    try {
      // Test simple de connexion API
      const result = await verifyAuth();
      Alert.alert(
        "Test API",
        `Connexion API: ${
          result ? "✅ Réussie" : "❌ Échouée"
        }\nMessage: Aucun message`,
        [{ text: "OK" }]
      );
    } catch {
      Alert.alert("Erreur API", `Erreur: Erreur inconnue\nStatus: N/A`, [
        { text: "OK" },
      ]);
    } finally {
      setIsTesting(false);
    }
  };

  const clearApiErrors = async () => {
    try {
      await AsyncStorage.removeItem("api_error_count");
      await AsyncStorage.removeItem("last_api_call");
      Alert.alert("Succès", "Compteurs d'erreur API réinitialisés", [
        { text: "OK" },
      ]);
      refreshStatus();
    } catch {
      Alert.alert("Erreur", "Impossible de réinitialiser les compteurs", [
        { text: "OK" },
      ]);
    }
  };

  const forceReconnect = async () => {
    try {
      // Supprimer tous les tokens et données d'authentification
      await AsyncStorage.multiRemove([
        "auth_token",
        "refresh_token",
        "user_data",
        "explicit_connection",
        "api_error_count",
        "last_api_call",
      ]);

      Alert.alert(
        "Déconnexion forcée",
        "Tous les tokens ont été supprimés. Vous devrez vous reconnecter.",
        [{ text: "OK" }]
      );

      refreshStatus();
    } catch {
      Alert.alert("Erreur", "Impossible de forcer la déconnexion", [
        { text: "OK" },
      ]);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  if (!status) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Chargement…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔍 Diagnostic Rate Limiting</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Statut Actuel</Text>

        <View style={styles.statusRow}>
          <Text style={styles.label}>Token d&apos;authentification:</Text>
          <Text
            style={[
              styles.value,
              status.hasAuthToken ? styles.success : styles.error,
            ]}
          >
            {status.hasAuthToken ? "✅ Présent" : "❌ Absent"}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.label}>Token de rafraîchissement:</Text>
          <Text
            style={[
              styles.value,
              status.hasRefreshToken ? styles.success : styles.error,
            ]}
          >
            {status.hasRefreshToken ? "✅ Présent" : "❌ Absent"}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.label}>Données utilisateur:</Text>
          <Text
            style={[
              styles.value,
              status.hasUserData ? styles.success : styles.error,
            ]}
          >
            {status.hasUserData ? "✅ Présentes" : "❌ Absentes"}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.label}>Inscription en cours:</Text>
          <Text
            style={[
              styles.value,
              status.pendingRegistration ? styles.warning : styles.success,
            ]}
          >
            {status.pendingRegistration ? "⚠️ Oui" : "✅ Non"}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.label}>Dernier appel API:</Text>
          <Text style={styles.value}>{status.lastApiCall || "Jamais"}</Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.label}>Nombre d&apos;erreurs API:</Text>
          <Text
            style={[
              styles.value,
              status.apiErrorCount > 5 ? styles.error : styles.success,
            ]}
          >
            {status.apiErrorCount}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🛠️ Actions</Text>

        <Pressable
          style={styles.button}
          onPress={refreshStatus}
          disabled={isRefreshing}
        >
          <Text style={styles.buttonText}>
            {isRefreshing ? "Actualisation..." : "🔄 Actualiser le statut"}
          </Text>
        </Pressable>

        <Pressable
          style={styles.button}
          onPress={testApiConnection}
          disabled={isTesting}
        >
          <Text style={styles.buttonText}>
            {isTesting ? "Test en cours..." : "🧪 Tester la connexion API"}
          </Text>
        </Pressable>

        <Pressable style={styles.button} onPress={clearApiErrors}>
          <Text style={styles.buttonText}>
            🧹 Réinitialiser les compteurs d&apos;erreur
          </Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.dangerButton]}
          onPress={forceReconnect}
        >
          <Text style={styles.buttonText}>🚨 Forcer la déconnexion</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💡 Recommandations</Text>

        {status.apiErrorCount > 10 && (
          <Text style={styles.recommendation}>
            ⚠️ Trop d&apos;erreurs API détectées. Essayez de vous reconnecter.
          </Text>
        )}

        {status.pendingRegistration && (
          <Text style={styles.recommendation}>
            ⚠️ Inscription en cours détectée. Terminez le processus avant de
            vous reconnecter.
          </Text>
        )}

        {!status.hasAuthToken && !status.pendingRegistration && (
          <Text style={styles.recommendation}>
            ℹ️ Aucun token d&apos;authentification. Connectez-vous normalement.
          </Text>
        )}

        {status.hasAuthToken && status.apiErrorCount > 5 && (
          <Text style={styles.recommendation}>
            🔄 Token présent mais erreurs fréquentes. Essayez de rafraîchir
            votre session.
          </Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  section: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    boxShadow: "0px 2px 4px rgba(0,0,0,0.1)",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  label: {
    fontSize: 16,
    color: "#666",
    flex: 1,
  },
  value: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  success: {
    color: "#4CAF50",
  },
  error: {
    color: "#F44336",
  },
  warning: {
    color: "#FF9800",
  },
  button: {
    backgroundColor: "#2196F3",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: "center",
  },
  dangerButton: {
    backgroundColor: "#F44336",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  recommendation: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    lineHeight: 20,
  },
  loading: {
    textAlign: "center",
    fontSize: 18,
    color: "#666",
    marginTop: 50,
  },
});

export default RateLimitDiagnostic;
