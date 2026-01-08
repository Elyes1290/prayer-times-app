// components/CacheDiagnostic.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useThemeColors } from "../hooks/useThemeAssets";
import { useCurrentTheme } from "../hooks/useThemeColor";
import PrayerTimesCacheService from "../utils/PrayerTimesCacheService";
import PrayerTimesPreloader from "../utils/PrayerTimesPreloader";

interface CacheDiagnosticProps {
  visible: boolean;
  onClose: () => void;
}

export default function CacheDiagnostic({
  visible,
  onClose,
}: CacheDiagnosticProps) {
  const colors = useThemeColors();
  const currentTheme = useCurrentTheme();
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [preloadStats, setPreloadStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const cacheService = PrayerTimesCacheService.getInstance();
  const preloader = PrayerTimesPreloader.getInstance();

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const [cache, preload] = await Promise.all([
        cacheService.getCacheStats(),
        preloader.getPreloadStats(),
      ]);
      setCacheStats(cache);
      setPreloadStats(preload);
    } catch (err) {
      console.error("Erreur chargement stats:", err);
    } finally {
      setIsLoading(false);
    }
  }, [cacheService, preloader]);

  useEffect(() => {
    if (visible) {
      loadStats();
    }
  }, [visible, loadStats]);

  const handleClearCache = () => {
    Alert.alert(
      "Vider le cache",
      "Êtes-vous sûr de vouloir vider complètement le cache des horaires de prière ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Vider",
          style: "destructive",
          onPress: async () => {
            try {
              await cacheService.clearAllCache();
              await loadStats();
              Alert.alert("Succès", "Cache vidé avec succès");
            } catch (err) {
              Alert.alert("Erreur", "Impossible de vider le cache");
            }
          },
        },
      ]
    );
  };

  const handleCleanupCache = async () => {
    try {
      await cacheService.cleanupExpiredCache();
      await loadStats();
      Alert.alert("Succès", "Cache nettoyé avec succès");
    } catch (err) {
      Alert.alert("Erreur", "Impossible de nettoyer le cache");
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (!visible) return null;

  const styles = StyleSheet.create({
    overlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      zIndex: 1000,
    },
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    modal: {
      backgroundColor:
        currentTheme === "light" ? colors.cardBG : "rgba(0, 0, 0, 0.9)",
      borderRadius: 20,
      padding: 20,
      width: "100%",
      maxWidth: 400,
      maxHeight: "80%",
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(255, 255, 255, 0.1)",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    title: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },
    closeButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: colors.surface,
    },
    content: {
      flex: 1,
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 10,
    },
    statRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor:
        currentTheme === "light" ? colors.border : "rgba(255, 255, 255, 0.1)",
    },
    statLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    statValue: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginVertical: 4,
    },
    primaryButton: {
      backgroundColor: colors.primary,
    },
    secondaryButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dangerButton: {
      backgroundColor: "#FF6B6B",
    },
    buttonText: {
      fontSize: 14,
      fontWeight: "600",
      marginLeft: 8,
    },
    primaryButtonText: {
      color: "#FFFFFF",
    },
    secondaryButtonText: {
      color: colors.text,
    },
    dangerButtonText: {
      color: "#FFFFFF",
    },
    loadingText: {
      textAlign: "center",
      color: colors.textSecondary,
      fontStyle: "italic",
    },
  });

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Diagnostic du Cache</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {isLoading ? (
              <Text style={styles.loadingText}>
                Chargement des statistiques...
              </Text>
            ) : (
              <>
                {/* Statistiques du cache */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Cache des Horaires</Text>

                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Entrées totales</Text>
                    <Text style={styles.statValue}>
                      {cacheStats?.totalEntries || 0}
                    </Text>
                  </View>

                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Utilisation mémoire</Text>
                    <Text style={styles.statValue}>
                      {formatBytes(cacheStats?.memoryUsage || 0)}
                    </Text>
                  </View>

                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Plus ancienne entrée</Text>
                    <Text style={styles.statValue}>
                      {cacheStats?.oldestEntry
                        ? new Date(cacheStats.oldestEntry).toLocaleDateString()
                        : "Aucune"}
                    </Text>
                  </View>

                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Plus récente entrée</Text>
                    <Text style={styles.statValue}>
                      {cacheStats?.newestEntry
                        ? new Date(cacheStats.newestEntry).toLocaleDateString()
                        : "Aucune"}
                    </Text>
                  </View>
                </View>

                {/* Statistiques du préchargement */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Préchargement</Text>

                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Préchargement actif</Text>
                    <Text style={styles.statValue}>
                      {preloadStats?.isActive ? "✅ Oui" : "❌ Non"}
                    </Text>
                  </View>

                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Taille de la file</Text>
                    <Text style={styles.statValue}>
                      {preloadStats?.queueLength || 0}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Actions</Text>

                  <TouchableOpacity
                    style={[styles.button, styles.primaryButton]}
                    onPress={loadStats}
                  >
                    <MaterialCommunityIcons
                      name="refresh"
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={[styles.buttonText, styles.primaryButtonText]}>
                      Actualiser les statistiques
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={handleCleanupCache}
                  >
                    <MaterialCommunityIcons
                      name="broom"
                      size={20}
                      color={colors.text}
                    />
                    <Text
                      style={[styles.buttonText, styles.secondaryButtonText]}
                    >
                      Nettoyer le cache expiré
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.dangerButton]}
                    onPress={handleClearCache}
                  >
                    <MaterialCommunityIcons
                      name="delete"
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={[styles.buttonText, styles.dangerButtonText]}>
                      Vider complètement le cache
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}
