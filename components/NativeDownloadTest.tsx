import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNativeDownload } from "../hooks/useNativeDownload";

export default function NativeDownloadTest() {
  const {
    downloadState,
    startDownload,
    cancelDownload,
    isNativeAvailable,
    activeDownloadsCount,
    restoreActiveDownloads,
  } = useNativeDownload();

  const [testDownloads, setTestDownloads] = useState<
    Array<{
      id: string;
      title: string;
      url: string;
      fileName: string;
    }>
  >([
    {
      id: "test1",
      title: "Test Audio 1",
      url: "https://httpbin.org/delay/3",
      fileName: "test1.mp3",
    },
    {
      id: "test2",
      title: "Test Audio 2",
      url: "https://httpbin.org/delay/5",
      fileName: "test2.mp3",
    },
    {
      id: "test3",
      title: "Test Audio 3",
      url: "https://httpbin.org/delay/2",
      fileName: "test3.mp3",
    },
  ]);

  const handleStartDownload = async (download: (typeof testDownloads)[0]) => {
    try {
      await startDownload({
        url: download.url,
        fileName: download.fileName,
        contentId: download.id,
        title: download.title,
      });
    } catch (error) {
      Alert.alert(
        "Erreur",
        error instanceof Error ? error.message : "Erreur inconnue"
      );
    }
  };

  const handleCancelDownload = async (contentId: string) => {
    try {
      await cancelDownload(contentId);
    } catch (error) {
      Alert.alert(
        "Erreur",
        error instanceof Error ? error.message : "Erreur inconnue"
      );
    }
  };

  const handleRestoreDownloads = async () => {
    try {
      await restoreActiveDownloads();
      // Alert.alert("Succès", "Téléchargements actifs restaurés");
    } catch (error) {
      Alert.alert(
        "Erreur",
        error instanceof Error ? error.message : "Erreur inconnue"
      );
    }
  };

  const getDownloadState = (contentId: string) => {
    return (
      downloadState.get(contentId) || {
        isDownloading: false,
        progress: 0,
        error: null,
      }
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Test Téléchargement Natif</Text>
        <Text style={styles.subtitle}>
          Module natif:{" "}
          {isNativeAvailable ? "✅ Disponible" : "❌ Non disponible"}
        </Text>
        <Text style={styles.subtitle}>
          Téléchargements actifs: {activeDownloadsCount}
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestoreDownloads}
        >
          <MaterialCommunityIcons name="refresh" size={20} color="#fff" />
          <Text style={styles.restoreButtonText}>
            Restaurer téléchargements
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.downloadsContainer}>
        <Text style={styles.sectionTitle}>Tests de téléchargement</Text>

        {testDownloads.map((download) => {
          const state = getDownloadState(download.id);

          return (
            <View key={download.id} style={styles.downloadItem}>
              <View style={styles.downloadHeader}>
                <Text style={styles.downloadTitle}>{download.title}</Text>
                <Text style={styles.downloadId}>ID: {download.id}</Text>
              </View>

              <View style={styles.downloadStatus}>
                {state.isDownloading ? (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${state.progress * 100}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {Math.round(state.progress * 100)}%
                    </Text>
                  </View>
                ) : state.error ? (
                  <Text style={styles.errorText}>❌ {state.error}</Text>
                ) : state.localUri ? (
                  <Text style={styles.successText}>
                    ✅ Terminé: {state.localUri}
                  </Text>
                ) : (
                  <Text style={styles.idleText}>⏸️ En attente</Text>
                )}
              </View>

              <View style={styles.downloadActions}>
                {state.isDownloading ? (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => handleCancelDownload(download.id)}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={16}
                      color="#fff"
                    />
                    <Text style={styles.cancelButtonText}>Annuler</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.startButton}
                    onPress={() => handleStartDownload(download)}
                    disabled={state.error !== null}
                  >
                    <MaterialCommunityIcons
                      name="download"
                      size={16}
                      color="#fff"
                    />
                    <Text style={styles.startButtonText}>Démarrer</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.debugContainer}>
        <Text style={styles.sectionTitle}>Debug - États</Text>
        {Array.from(downloadState.entries()).map(([contentId, state]) => (
          <View key={contentId} style={styles.debugItem}>
            <Text style={styles.debugId}>{contentId}:</Text>
            <Text style={styles.debugState}>
              {state.isDownloading ? "📥" : "⏸️"}{" "}
              {Math.round(state.progress * 100)}%
              {state.error && ` - ❌ ${state.error}`}
              {state.localUri && ` - ✅ ${state.localUri}`}
            </Text>
          </View>
        ))}
        {downloadState.size === 0 && (
          <Text style={styles.debugEmpty}>Aucun téléchargement en cours</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  header: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  controls: {
    marginBottom: 16,
  },
  restoreButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4ECDC4",
    padding: 12,
    borderRadius: 8,
    justifyContent: "center",
  },
  restoreButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },
  downloadsContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  downloadItem: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  downloadHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  downloadTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  downloadId: {
    fontSize: 12,
    color: "#666",
  },
  downloadStatus: {
    marginBottom: 8,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4ECDC4",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    minWidth: 40,
  },
  errorText: {
    fontSize: 12,
    color: "#FF6B6B",
  },
  successText: {
    fontSize: 12,
    color: "#4CAF50",
  },
  idleText: {
    fontSize: 12,
    color: "#666",
  },
  downloadActions: {
    alignItems: "flex-end",
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4ECDC4",
    padding: 8,
    borderRadius: 6,
  },
  startButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF6B6B",
    padding: 8,
    borderRadius: 6,
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  debugContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  debugItem: {
    flexDirection: "row",
    marginBottom: 4,
  },
  debugId: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    minWidth: 80,
  },
  debugState: {
    fontSize: 12,
    color: "#666",
    flex: 1,
  },
  debugEmpty: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
  },
});
