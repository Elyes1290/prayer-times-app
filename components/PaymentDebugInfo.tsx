import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { checkUserSyncStatus } from "../utils/paymentSync";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SyncStatus {
  hasUserData: boolean;
  hasAuthToken: boolean;
  hasRefreshToken: boolean;
  isLoggedIn: boolean;
  explicitConnection: boolean;
}

const PaymentDebugInfo: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [rawData, setRawData] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      // Vérifier le statut de synchronisation
      const status = await checkUserSyncStatus();
      setSyncStatus(status);

      // Récupérer les données brutes
      const userData = await AsyncStorage.getItem("user_data");
      const authToken = await AsyncStorage.getItem("auth_token");
      const refreshToken = await AsyncStorage.getItem("refresh_token");
      const isLoggedIn = await AsyncStorage.getItem("is_logged_in");
      const explicitConnection = await AsyncStorage.getItem(
        "explicit_connection"
      );
      const pendingRegistration = await AsyncStorage.getItem(
        "pending_registration"
      );

      setRawData({
        userData: userData ? JSON.parse(userData) : null,
        authToken: authToken ? `${authToken.substring(0, 20)}...` : null,
        refreshToken: refreshToken
          ? `${refreshToken.substring(0, 20)}...`
          : null,
        isLoggedIn,
        explicitConnection,
        pendingRegistration: pendingRegistration
          ? JSON.parse(pendingRegistration)
          : null,
      });
    } catch (error) {
      console.error("❌ Erreur lors du refresh:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 2000); // Refresh toutes les 2 secondes
    return () => clearInterval(interval);
  }, []);

  if (!syncStatus || !rawData) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🔍 Debug Synchronisation</Text>
        <Text style={styles.message}>Chargement...</Text>
      </View>
    );
  }

  const getStatusColor = (value: boolean) => (value ? "#4CAF50" : "#FF6B6B");
  const getStatusText = (value: boolean) => (value ? "✅ OUI" : "❌ NON");

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔍 Debug Synchronisation</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Statut de synchronisation :</Text>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Données utilisateur :</Text>
          <Text
            style={[
              styles.statusValue,
              { color: getStatusColor(syncStatus.hasUserData) },
            ]}
          >
            {getStatusText(syncStatus.hasUserData)}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>
            Token d&apos;authentification :
          </Text>
          <Text
            style={[
              styles.statusValue,
              { color: getStatusColor(syncStatus.hasAuthToken) },
            ]}
          >
            {getStatusText(syncStatus.hasAuthToken)}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Refresh token :</Text>
          <Text
            style={[
              styles.statusValue,
              { color: getStatusColor(syncStatus.hasRefreshToken) },
            ]}
          >
            {getStatusText(syncStatus.hasRefreshToken)}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Connecté :</Text>
          <Text
            style={[
              styles.statusValue,
              { color: getStatusColor(syncStatus.isLoggedIn) },
            ]}
          >
            {getStatusText(syncStatus.isLoggedIn)}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Connexion explicite :</Text>
          <Text
            style={[
              styles.statusValue,
              { color: getStatusColor(syncStatus.explicitConnection) },
            ]}
          >
            {getStatusText(syncStatus.explicitConnection)}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          🔍 Données brutes AsyncStorage :
        </Text>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>User Data :</Text>
          <Text style={styles.dataValue}>
            {rawData.userData ? "Présent" : "Absent"}
          </Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Auth Token :</Text>
          <Text style={styles.dataValue}>{rawData.authToken || "Absent"}</Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Refresh Token :</Text>
          <Text style={styles.dataValue}>
            {rawData.refreshToken || "Absent"}
          </Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Is Logged In :</Text>
          <Text style={styles.dataValue}>{rawData.isLoggedIn || "Absent"}</Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Explicit Connection :</Text>
          <Text style={styles.dataValue}>
            {rawData.explicitConnection || "Absent"}
          </Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Pending Registration :</Text>
          <Text style={styles.dataValue}>
            {rawData.pendingRegistration ? "Présent" : "Absent"}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, isRefreshing && styles.buttonDisabled]}
        onPress={refreshData}
        disabled={isRefreshing}
      >
        <Text style={styles.buttonText}>
          {isRefreshing ? "Actualisation..." : "Actualiser maintenant"}
        </Text>
      </TouchableOpacity>

      <View style={styles.helpContainer}>
        <Text style={styles.helpTitle}>💡 Aide Debug :</Text>
        <Text style={styles.helpText}>
          • Si &quot;Token d&apos;authentification&quot; est ❌ NON, vérifiez
          les logs de l&apos;API
        </Text>
        <Text style={styles.helpText}>
          • Les données se rafraîchissent automatiquement toutes les 2 secondes
        </Text>
        <Text style={styles.helpText}>
          • Vérifiez que l&apos;API retourne bien les tokens dans la réponse
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
  },
  section: {
    backgroundColor: "#333333",
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 15,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#444444",
  },
  statusLabel: {
    fontSize: 14,
    color: "#CCCCCC",
  },
  statusValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#444444",
  },
  dataLabel: {
    fontSize: 14,
    color: "#CCCCCC",
  },
  dataValue: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "bold",
    maxWidth: 150,
    textAlign: "right",
  },
  button: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: "#666666",
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
  },
  helpContainer: {
    backgroundColor: "#2C3E50",
    borderRadius: 10,
    padding: 20,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 10,
  },
  helpText: {
    fontSize: 14,
    color: "#CCCCCC",
    marginBottom: 8,
    lineHeight: 20,
  },
});

export default PaymentDebugInfo;
