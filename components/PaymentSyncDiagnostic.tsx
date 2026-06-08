import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import { checkUserSyncStatus, retryUserSync } from "../utils/paymentSync";

interface SyncStatus {
  hasUserData: boolean;
  hasAuthToken: boolean;
  hasRefreshToken: boolean;
  isLoggedIn: boolean;
  explicitConnection: boolean;
}

const getStatusColor = (value: boolean) => (value ? "#4CAF50" : "#FF6B6B");
const getStatusText = (value: boolean) => (value ? "✅ OUI" : "❌ NON");

const PaymentSyncDiagnostic: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [retryResult, setRetryResult] = useState<string>("");

  const checkStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      const status = await checkUserSyncStatus();
      setSyncStatus(status);
      setRetryResult("");
    } catch (error) {
      console.error("❌ Erreur lors de la vérification:", error);
    } finally {
      setIsChecking(false);
    }
  }, []);

  const handleRetry = async () => {
    setIsChecking(true);
    try {
      const result = await retryUserSync(2);
      setRetryResult(
        result.success
          ? "✅ Retry réussi !"
          : `❌ Retry échoué: ${result.message}`
      );

      // Re-vérifier le statut après retry
      if (result.success) {
        setTimeout(checkStatus, 1000);
      }
    } catch (error) {
      setRetryResult(`❌ Erreur retry: ${error}`);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  if (!syncStatus) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🔍 Diagnostic de synchronisation</Text>
        <Text style={styles.message}>Chargement…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔍 Diagnostic de synchronisation</Text>

      <View style={styles.statusContainer}>
        <Text style={styles.sectionTitle}>État de la synchronisation :</Text>

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

      <View style={styles.actionsContainer}>
        <Pressable
          style={[styles.button, isChecking && styles.buttonDisabled]}
          onPress={checkStatus}
          disabled={isChecking}
        >
          <Text style={styles.buttonText}>
            {isChecking ? `Vérification...` : `Actualiser le statut`}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.retryButton, isChecking && styles.buttonDisabled]}
          onPress={handleRetry}
          disabled={isChecking}
        >
          <Text style={styles.buttonText}>
            {isChecking ? `Tentative...` : `Tenter la synchronisation`}
          </Text>
        </Pressable>
      </View>

      {retryResult && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>{retryResult}</Text>
        </View>
      )}

      <View style={styles.helpContainer}>
        <Text style={styles.helpTitle}>💡 Aide :</Text>
        <Text style={styles.helpText}>
          • Si &quot;Token d&apos;authentification&quot; est ❌ NON, c&apos;est
          la cause de l&apos;erreur 401
        </Text>
        <Text style={styles.helpText}>
          • Utilisez &quot;Tenter la synchronisation&quot; pour résoudre
          automatiquement
        </Text>
        <Text style={styles.helpText}>
          • Si le problème persiste, déconnectez-vous et reconnectez-vous
          manuellement
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
  statusContainer: {
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
  actionsContainer: {
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
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
  resultContainer: {
    backgroundColor: "#333333",
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  resultText: {
    fontSize: 14,
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

export default PaymentSyncDiagnostic;
