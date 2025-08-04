import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useBackup } from "../../contexts/BackupContext";
import { useTranslation } from "react-i18next";
import { usePremium } from "../../contexts/PremiumContext";
import ThemedAlert from "../ThemedAlert";

interface BackupSectionProps {
  styles: any;
}

export default function BackupSection({ styles }: BackupSectionProps) {
  const { t } = useTranslation();
  const { user } = usePremium();
  const {
    isSignedIn,
    userEmail,
    lastBackupTime,
    isSyncing,
    backupStatus,
    backupData,
    restoreData,
    enableAutoBackup,
    isAutoBackupEnabled,
    hasCloudData,
    showRestoreDialog,
    dismissRestoreDialog,
  } = useBackup();

  // 🚀 NOUVEAU : État pour les modals ThemedAlert
  const [themedAlert, setThemedAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: Array<{
      text: string;
      onPress: () => void;
      style?: "default" | "cancel" | "destructive";
    }>;
  } | null>(null);

  const formatBackupTime = (timeString: string | null) => {
    if (!timeString) return t("never", "Jamais");
    try {
      const date = new Date(timeString);
      return date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return t("unknown", "Inconnu");
    }
  };

  // 🚀 NOUVEAU : Fonction pour afficher les modals ThemedAlert
  const showThemedAlert = (alert: {
    title: string;
    message: string;
    buttons: Array<{
      text: string;
      onPress: () => void;
      style?: "default" | "cancel" | "destructive";
    }>;
  }) => {
    setThemedAlert({
      visible: true,
      ...alert,
    });
  };

  const handleBackup = async () => {
    showThemedAlert({
      title: t("backup_confirm_title", "Sauvegarde"),
      message: t(
        "backup_confirm_message",
        "Voulez-vous sauvegarder vos données dans le cloud ?"
      ),
      buttons: [
        {
          text: t("cancel", "Annuler"),
          onPress: () => {},
          style: "cancel",
        },
        {
          text: t("backup", "Sauvegarder"),
          onPress: async () => {
            await backupData();
          },
        },
      ],
    });
  };

  const handleRestore = async () => {
    showThemedAlert({
      title: t("restore_confirm_title", "Restauration"),
      message: t(
        "restore_confirm_message",
        "Voulez-vous restaurer vos données depuis le cloud ? Cela remplacera vos données actuelles."
      ),
      buttons: [
        {
          text: t("cancel", "Annuler"),
          onPress: () => {},
          style: "cancel",
        },
        {
          text: t("restore", "Restaurer"),
          style: "destructive",
          onPress: async () => {
            const success = await restoreData();
            if (success) {
              // Message simple et clair avec ThemedAlert
              showThemedAlert({
                title: t("restart_required", "Redémarrage requis"),
                message: t(
                  "restart_message",
                  "Vos données ont été restaurées avec succès. Pour voir tous les changements, veuillez fermer complètement l'application puis la rouvrir."
                ),
                buttons: [
                  {
                    text: t("understood", "Compris"),
                    onPress: () => {},
                  },
                ],
              });
            }
          },
        },
      ],
    });
  };

  const handleAutoBackupToggle = async () => {
    await enableAutoBackup(!isAutoBackupEnabled);
  };

  // Si l'utilisateur n'est pas premium, ne pas afficher la section backup
  if (!user.isPremium) {
    return [];
  }

  // Interface pour les utilisateurs premium
  const sections = [
    {
      key: "backup",
      title: t("backup_cloud", "Sauvegarde Cloud"),
      data: [
        {
          key: "backup_status",
          component: (
            <View style={styles.section}>
              {/* 🚀 NOUVEAU : ThemedAlert personnalisé */}
              {themedAlert && (
                <ThemedAlert
                  visible={themedAlert.visible}
                  title={themedAlert.title}
                  message={themedAlert.message}
                  buttons={themedAlert.buttons}
                  onClose={() => setThemedAlert(null)}
                />
              )}

              {/* Statut de connexion */}
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>
                    {t("connection_status", "Statut de connexion")}
                  </Text>
                  <Text style={styles.settingValue}>
                    {isSignedIn
                      ? userEmail
                      : t("not_connected", "Non connecté")}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusIndicator,
                    { backgroundColor: isSignedIn ? "#4CAF50" : "#FF9800" },
                  ]}
                />
              </View>

              {/* Dernière sauvegarde */}
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>
                    {t("last_backup", "Dernière sauvegarde")}
                  </Text>
                  <Text style={styles.settingValue}>
                    {formatBackupTime(lastBackupTime)}
                  </Text>
                </View>
              </View>

              {/* Données dans le cloud */}
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>
                    {t("cloud_data", "Données dans le cloud")}
                  </Text>
                  <Text style={styles.settingValue}>
                    {hasCloudData
                      ? t("available", "Disponible")
                      : t("not_available", "Non disponible")}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={async () => {
                    // Forcer la vérification des données cloud en rechargeant l'app
                    showThemedAlert({
                      title: "Actualiser",
                      message: "Voulez-vous actualiser les données cloud ?",
                      buttons: [
                        {
                          text: "Annuler",
                          onPress: () => {},
                          style: "cancel",
                        },
                        {
                          text: "Actualiser",
                          onPress: () => {
                            // Recharger l'écran des paramètres
                            // (la vérification se fera automatiquement)
                          },
                        },
                      ],
                    });
                  }}
                >
                  <MaterialCommunityIcons
                    name="refresh"
                    size={16}
                    color={styles.iconColor?.color || "#000"}
                  />
                </TouchableOpacity>
              </View>
            </View>
          ),
        },
        {
          key: "backup_actions",
          component: (
            <View style={styles.section}>
              <View style={styles.backupSectionHeader}>
                <MaterialCommunityIcons
                  name="cog"
                  size={24}
                  color={styles.iconColor?.color || "#000"}
                />
                <Text style={styles.sectionTitle}>
                  {t("backup_actions", "Actions")}
                </Text>
              </View>

              {/* Sauvegarde automatique */}
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>
                    {t("auto_backup", "Sauvegarde automatique")}
                  </Text>
                  <Text style={styles.settingDescription}>
                    {t(
                      "auto_backup_description",
                      "Sauvegarde automatique toutes les 5 minutes"
                    )}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggle,
                    isAutoBackupEnabled && styles.toggleActive,
                  ]}
                  onPress={handleAutoBackupToggle}
                  disabled={isSyncing}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      isAutoBackupEnabled && styles.toggleThumbActive,
                    ]}
                  />
                </TouchableOpacity>
              </View>

              {/* Boutons d'action */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={handleBackup}
                  disabled={isSyncing}
                >
                  {isSyncing && backupStatus === "syncing" ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <MaterialCommunityIcons
                      name="cloud-upload"
                      size={20}
                      color="#fff"
                    />
                  )}
                  <Text style={styles.actionButtonText}>
                    {t("backup_now", "Sauvegarder maintenant")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.secondaryButton]}
                  onPress={handleRestore}
                  disabled={isSyncing || !hasCloudData}
                >
                  <MaterialCommunityIcons
                    name="cloud-download"
                    size={20}
                    color={styles.iconColor?.color || "#000"}
                  />
                  <Text
                    style={[
                      styles.actionButtonText,
                      styles.secondaryButtonText,
                    ]}
                  >
                    {t("restore", "Restaurer")}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Statut de synchronisation */}
              {isSyncing && (
                <View style={styles.syncStatus}>
                  <ActivityIndicator
                    size="small"
                    color={styles.iconColor?.color || "#000"}
                  />
                  <Text style={styles.syncStatusText}>
                    {backupStatus === "syncing"
                      ? t("syncing", "Synchronisation...")
                      : backupStatus === "success"
                      ? t("sync_success", "Synchronisation réussie")
                      : t("sync_error", "Erreur de synchronisation")}
                  </Text>
                </View>
              )}
            </View>
          ),
        },
      ],
    },
  ];

  return sections;
}
