import { useCallback } from "react";
import { LocalStorageManager } from "../utils/localStorageManager";

// 🗂️ Hook pour la gestion des fichiers (nettoyage et diagnostic)
export function useFileManager() {
  // 🗑️ FONCTION NETTOYAGE COMPLET
  const createCleanupHandler = useCallback(
    (
      premiumContent: any,
      showToast: any,
      t: any,
      loadAvailableAdhans: (forceRefresh?: boolean) => Promise<void>
    ) => {
      return async () => {
        try {
          showToast({
            type: "info",
            title: t("toast_cleanup_started_title"),
            message: t("toast_cleanup_started_message"),
          });

          const RNFS = await import("react-native-fs");
          const PremiumContentManager = (
            await import("../utils/premiumContent")
          ).default;
          const manager = PremiumContentManager.getInstance();

          // 🗑️ NOUVEAU : Nettoyer complètement le dossier premium_content
          const downloadedContent = await LocalStorageManager.getPremium(
            "DOWNLOADED_CONTENT"
          );
          if (!downloadedContent) {
            showToast({
              type: "info",
              title: t("toast_cleanup_no_files_title"),
              message: t("toast_cleanup_no_files_message"),
            });
            return;
          }

          const downloaded = JSON.parse(downloadedContent);
          const contentIds = Object.keys(downloaded);

          if (contentIds.length === 0) {
            showToast({
              type: "info",
              title: t("toast_cleanup_no_files_title"),
              message: t("toast_cleanup_no_files_message"),
            });
            return;
          }

          // Récupérer le dossier depuis le premier fichier
          const firstFile = downloaded[contentIds[0]];
          const firstFilePath = firstFile.downloadPath?.replace("file://", "");

          if (!firstFilePath) {
            showToast({
              type: "error",
              title: t("toast_error"),
              message: t("toast_cleanup_folder_error_message"),
            });
            return;
          }

          const premiumContentDir = firstFilePath.substring(
            0,
            firstFilePath.lastIndexOf("/")
          );
          // console.log(`🗑️ Dossier à nettoyer: ${premiumContentDir}`);

          let cleanedCount = 0;
          let totalSize = 0;

          // Vérifier si le dossier existe
          const dirExists = await RNFS.default.exists(premiumContentDir);
          if (!dirExists) {
            showToast({
              type: "info",
              title: t("toast_cleanup_empty_folder_title"),
              message: t("toast_cleanup_no_files_message"),
            });
            return;
          }

          // Lister tous les fichiers dans le dossier
          const files = await RNFS.default.readdir(premiumContentDir);
          // console.log(`🗑️ Nettoyage: ${files.length} fichiers trouvés`);

          // Supprimer tous les fichiers
          const settled = await Promise.allSettled(
            files.map(async (fileName) => {
              const filePath = `${premiumContentDir}/${fileName}`;
              const fileStats = await RNFS.default.stat(filePath);
              await RNFS.default.unlink(filePath);
              return fileStats.size;
            })
          );
          for (const r of settled) {
            if (r.status === "fulfilled") {
              cleanedCount++;
              totalSize += r.value;
            } else {
              console.error(`❌ Erreur suppression fichier:`, r.reason);
            }
          }

          // 🧹 Vider complètement les données de téléchargement
          await LocalStorageManager.removePremium("DOWNLOADED_CONTENT");
          await manager.invalidateAdhanCache();

          // 🔄 Mettre à jour immédiatement l'état local
          const updatedAdhans =
            premiumContent.premiumContentState.availableAdhanVoices.map(
              (adhan: any) => ({
                ...adhan,
                isDownloaded: false,
                downloadPath: undefined,
              })
            );
          premiumContent.setAvailableAdhanVoices(updatedAdhans);

          // 📢 NOUVEAU : Notifier immédiatement la mise à jour
          showToast({
            type: "info",
            title: t("toast_cleanup_updating_title"),
            message: t("toast_cleanup_updating_message"),
          });

          // 🔄 Laisser un délai pour que l'interface se mette à jour
          await new Promise((resolve) => setTimeout(resolve, 200));

          // 🔄 Recharger la liste des adhans depuis le serveur
          await loadAvailableAdhans(true);

          const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);

          showToast({
            type: "success",
            title: t("toast_cleanup_completed_title"),
            message: t("toast_cleanup_completed_detailed_message", {
              count: cleanedCount,
              size: sizeInMB,
            }),
          });

          // console.log(
          //   `✅ Nettoyage terminé: ${cleanedCount} fichiers, ${sizeInMB} MB libérés`
          // );
        } catch (error) {
          console.error("❌ Erreur nettoyage:", error);
          showToast({
            type: "error",
            title: t("toast_cleanup_error_title"),
            message: t("toast_cleanup_error_message"),
          });
        }
      };
    },
    []
  );

  // 🔍 FONCTION DIAGNOSTIC COMPLET
  const createDiagnosticHandler = useCallback(
    (
      showToast: any,
      t: any,
      loadAvailableAdhans: (forceRefresh?: boolean) => Promise<void>
    ) => {
      return async () => {
        try {
          showToast({
            type: "info",
            title: t("toast_diagnostic_started_title"),
            message: t("toast_diagnostic_started_message"),
          });

          const PremiumContentManager = (
            await import("../utils/premiumContent")
          ).default;
          const manager = PremiumContentManager.getInstance();

          const [forceResult, persistenceResult, syncResult] =
            await Promise.all([
              manager.forceDownloadWithPersistence("adhan_ibrahim_al_arkani"),
              manager.diagnosePersistenceIssue(),
              manager.forceFullSync(),
            ]);

          await Promise.all([
            manager.forceMarkCurrentVersion(),
            manager.cleanupCorruptedDownloads(),
          ]);

          // Afficher le rapport de diagnostic détaillé
          const recommendations = persistenceResult.recommendations.join(", ");
          const message = `
Téléchargement forcé:
• Succès: ${forceResult.success ? "✅" : "❌"}
• Fichier: ${forceResult.filePath ? "✅" : "❌"}
• Erreur: ${forceResult.error || "Aucune"}

Fichiers trouvés:
• Dossier principal: ${persistenceResult.filesInMainDir.length}
• Dossier natif: ${persistenceResult.filesInNativeDir.length}
• Synchronisés: ${syncResult.syncedFiles}
• Nettoyés: ${syncResult.cleanedFiles}

${
  recommendations
    ? `Recommandations: ${recommendations}`
    : "Tout semble correct !"
}
                `.trim();

          showToast({
            type: syncResult.errors.length > 0 ? "error" : "success",
            title: t("toast_diagnostic_completed_title"),
            message: message,
          });

          // Recharger les adhans pour refléter les changements
          await loadAvailableAdhans(true);
        } catch (error) {
          console.error("Erreur diagnostic:", error);
          showToast({
            type: "error",
            title: t("toast_diagnostic_error_title"),
            message: t("toast_diagnostic_error_message"),
          });
        }
      };
    },
    []
  );

  // 🛠️ FONCTION UTILITAIRE - Obtenir le nom d'affichage d'un son
  const createGetSoundDisplayName = useCallback(
    (t: any, premiumContent: any) => {
      return (soundId: string): string => {
        const translationKey = `sound_${soundId}`;
        const translatedName = t(translationKey, "");

        if (translatedName && translatedName !== translationKey) {
          return translatedName;
        }

        const premiumSoundTitles =
          premiumContent.premiumContentState.premiumSoundTitles;
        if (premiumSoundTitles[soundId]) {
          let cleanTitle = premiumSoundTitles[soundId];
          // Supprimer tous les préfixes connus, même multiples
          const prefixesToRemove = [
            /^Adhan\s*-\s*/i,
            /^Adhan\s*:\s*/i,
            /^Adhan\s+/i,
            /^Son\s*-\s*/i,
            /^Son\s*:\s*/i,
            /^Son\s+/i,
            /^Test\s*:\s*/i,
          ];
          let previous;
          do {
            previous = cleanTitle;
            for (const regex of prefixesToRemove) {
              cleanTitle = cleanTitle.replace(regex, "");
            }
          } while (cleanTitle !== previous);
          // Si le titre contient encore des séparateurs type ' - ' ou ' : ', ne garder que la dernière partie
          if (cleanTitle.includes(" - ") || cleanTitle.includes(" : ")) {
            const parts = cleanTitle.split(/ - | : /);
            cleanTitle = parts[parts.length - 1];
          }
          return cleanTitle.trim();
        }

        // Fallback : transformer l'ID en nom lisible (remplacer tous les caractères non alphanumériques par un espace)
        return soundId
          .replace(/[^a-zA-Z0-9]+/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .replace(/\b\w/g, (l) => l.toUpperCase());
      };
    },
    []
  );

  return {
    createCleanupHandler,
    createDiagnosticHandler,
    createGetSoundDisplayName,
  };
}
