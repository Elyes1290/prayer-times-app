import { useState, useEffect, useCallback, useRef } from "react";
import nativeDownloadManager, {
  DownloadInfo,
  DownloadEvent,
  ActiveDownloadsResult,
} from "../utils/nativeDownloadManager";
import PremiumContentManager from "../utils/premiumContent";
import {
  BUILTIN_ADHAN_SOUND_KEYS,
  mergeAvailableAdhanSounds,
  type DownloadedAdhanRow,
} from "../utils/adhanSoundList";

interface DownloadState {
  isDownloading: boolean;
  progress: number;
  error: string | null;
  localUri?: string;
}

export interface UseNativeDownloadReturn {
  downloadState: Map<string, DownloadState>;
  startDownload: (downloadInfo: DownloadInfo) => Promise<void>;
  cancelDownload: (contentId: string) => Promise<void>;
  isNativeAvailable: boolean;
  activeDownloadsCount: number;
  restoreActiveDownloads: () => Promise<void>;
  forceRefreshAdhans: () => Promise<void>;
  initializeAvailableSounds: () => void;
}

export const useNativeDownload = (
  showToast?: (toast: {
    type: "success" | "error" | "info";
    title: string;
    message: string;
  }) => void,
  updateAvailableSounds?: () => void,
  premiumContent?: any
): UseNativeDownloadReturn => {
  const [downloadState, setDownloadState] = useState<
    Map<string, DownloadState>
  >(new Map());
  const [isNativeAvailable, setIsNativeAvailable] = useState(false);
  const [activeDownloadsCount, setActiveDownloadsCount] = useState(0);

  const handleDownloadCompleted = useCallback(
    async (event: DownloadEvent) => {
      // console.log("✅ Événement downloadCompleted reçu:", event.contentId);

      // Mettre à jour l'état local immédiatement
      setDownloadState((prev) => {
        const newState = new Map(prev);
        newState.set(event.contentId, {
          isDownloading: false,
          progress: 1,
          error: null,
          localUri: event.localUri,
        });
        return newState;
      });
      setActiveDownloadsCount((prev) => Math.max(0, prev - 1));

      // 🚀 CRITIQUE : Marquer immédiatement l'adhan ET mettre à jour la liste déroulante
      if (event.localUri && premiumContent) {
        try {
          // 1. Marquer comme téléchargé dans availableAdhanVoices
          const currentAdhans =
            premiumContent.premiumContentState.availableAdhanVoices;
          const updatedAdhans = currentAdhans.map((adhan: any) =>
            adhan.id === event.contentId
              ? { ...adhan, isDownloaded: true, downloadPath: event.localUri }
              : adhan
          );
          premiumContent.setAvailableAdhanVoices(updatedAdhans);
          // console.log(
          //   `✅ Adhan ${event.contentId} marqué comme téléchargé instantanément`
          // );

          // 2. Déléguer la mise à jour à SettingsScreen (plus simple)
          // console.log(
          //   `🚀 Adhan téléchargé, délégation à updateAvailableSounds`
          // );

          // 3. Optionnel : callback vers SettingsScreen si fourni (mais pas critique)
          if (updateAvailableSounds) {
            updateAvailableSounds();
          }
        } catch (error) {
          console.error("❌ Erreur marquage adhan téléchargé:", error);
        }
      }

      // 🔇 SUPPRIMÉ : Toast déplacé vers SettingsScreen pour éviter la duplication
      // Le toast est maintenant géré dans handleNativeDownloadCompleted de SettingsScreen
      // avec un message plus précis incluant le nom de l'adhan
    },
    [updateAvailableSounds, premiumContent]
  );

  const handleDownloadCompletedRef = useRef(handleDownloadCompleted);
  useEffect(() => {
    handleDownloadCompletedRef.current = handleDownloadCompleted;
  });

  const forceRefreshAdhans = useCallback(async () => {
    try {
      const premiumManager = PremiumContentManager.getInstance();
      await premiumManager.invalidateAdhanCache();
      await premiumManager.forceSyncCacheWithFiles();
      // console.log("🔄 Liste des adhans premium forcée à se mettre à jour");
    } catch (error) {
      console.error("❌ Erreur lors de la mise à jour des adhans:", error);
    }
  }, []);

  // 🚀 INITIALISATION : Configurer la liste des sons disponibles au montage
  const initializeAvailableSounds = useCallback(() => {
    if (!premiumContent) return;

    try {
      const downloadedRows: DownloadedAdhanRow[] = [];

      if (premiumContent.premiumContentState.availableAdhanVoices) {
        premiumContent.premiumContentState.availableAdhanVoices.forEach(
          (adhan: any) => {
            if (adhan.isDownloaded && adhan.downloadPath) {
              downloadedRows.push({
                contentId: adhan.id,
                title: adhan.title || adhan.id,
                downloadPath: adhan.downloadPath,
              });
            }
          }
        );
      }

      const { sounds } = mergeAvailableAdhanSounds(
        BUILTIN_ADHAN_SOUND_KEYS,
        downloadedRows
      );
      premiumContent.setAvailableSounds(sounds);
      // console.log(
      //   `🚀 INIT: ${downloadedPremiumSounds.length} adhans premium trouvés au démarrage`
      // );
    } catch (error) {
      console.error("❌ Erreur initialisation sons:", error);
    }
  }, [premiumContent]);

  const restoreActiveDownloads = useCallback(async () => {
    if (!nativeDownloadManager.isAvailable()) {
      return;
    }

    try {
      const result: ActiveDownloadsResult =
        await nativeDownloadManager.getActiveDownloads();

      setActiveDownloadsCount(result.count);

      setDownloadState((prev) => {
        const newState = new Map(prev);

        Object.values(result.downloads).forEach((download) => {
          newState.set(download.contentId, {
            isDownloading: true,
            progress: 0,
            error: null,
          });
        });

        return newState;
      });
    } catch (error) {
      console.error("❌ Erreur restauration téléchargements actifs:", error);
    }
  }, []);

  useEffect(() => {
    setIsNativeAvailable(nativeDownloadManager.isAvailable());

    if (!nativeDownloadManager.isAvailable()) {
      // console.log("⚠️ Module de téléchargement natif non disponible");
      return;
    }

    restoreActiveDownloads();

    const handleDownloadStarted = (event: DownloadEvent) => {
      setDownloadState((prev) => {
        const newState = new Map(prev);
        newState.set(event.contentId, {
          isDownloading: true,
          progress: 0,
          error: null,
        });
        return newState;
      });
      setActiveDownloadsCount((prev) => prev + 1);
    };

    const handleDownloadProgress = (event: DownloadEvent) => {
      setDownloadState((prev) => {
        const newState = new Map(prev);
        const currentState = newState.get(event.contentId);
        if (currentState) {
          newState.set(event.contentId, {
            ...currentState,
            progress: event.progress,
          });
        }
        return newState;
      });
    };

    const handleDownloadFailed = (event: DownloadEvent) => {
      // console.log("❌ Événement downloadFailed reçu:", event.contentId);
      setDownloadState((prev) => {
        const newState = new Map(prev);
        newState.set(event.contentId, {
          isDownloading: false,
          progress: 0,
          error: "Download failed",
        });
        return newState;
      });
      setActiveDownloadsCount((prev) => Math.max(0, prev - 1));
    };

    const handleDownloadCancelled = (event: DownloadEvent) => {
      // console.log("🚫 Événement downloadCancelled reçu:", event.contentId);
      setDownloadState((prev) => {
        const newState = new Map(prev);
        newState.set(event.contentId, {
          isDownloading: false,
          progress: 0,
          error: null,
        });
        return newState;
      });
      setActiveDownloadsCount((prev) => Math.max(0, prev - 1));
    };

    nativeDownloadManager.addEventListener(
      "downloadStarted",
      handleDownloadStarted
    );
    nativeDownloadManager.addEventListener(
      "downloadProgress",
      handleDownloadProgress
    );
    const onDownloadCompleted = (event: DownloadEvent) => {
      void handleDownloadCompletedRef.current(event);
    };

    nativeDownloadManager.addEventListener(
      "downloadCompleted",
      onDownloadCompleted
    );
    nativeDownloadManager.addEventListener(
      "downloadFailed",
      handleDownloadFailed
    );
    nativeDownloadManager.addEventListener(
      "downloadCancelled",
      handleDownloadCancelled
    );

    return () => {
      nativeDownloadManager.removeEventListener("downloadStarted");
      nativeDownloadManager.removeEventListener("downloadProgress");
      nativeDownloadManager.removeEventListener("downloadCompleted");
      nativeDownloadManager.removeEventListener("downloadFailed");
      nativeDownloadManager.removeEventListener("downloadCancelled");
    };
  }, [restoreActiveDownloads]);

  // 🚀 SUPPRIMÉ : Initialisation automatique pour éviter les boucles infinies
  // La liste se mettra à jour automatiquement après les téléchargements

  const startDownload = useCallback(
    async (downloadInfo: DownloadInfo) => {
      if (!isNativeAvailable) {
        throw new Error("Native download module not available");
      }

      try {
        const isActive = await nativeDownloadManager.isDownloadActive(
          downloadInfo.contentId
        );
        if (isActive) {
          throw new Error("Download already in progress");
        }

        await nativeDownloadManager.startDownload(downloadInfo);
      } catch (error) {
        console.error("❌ Erreur démarrage téléchargement:", error);
        setDownloadState((prev) => {
          const newState = new Map(prev);
          newState.set(downloadInfo.contentId, {
            isDownloading: false,
            progress: 0,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          return newState;
        });
        throw error;
      }
    },
    [isNativeAvailable]
  );

  const cancelDownload = useCallback(
    async (contentId: string) => {
      if (!isNativeAvailable) {
        throw new Error("Native download module not available");
      }

      try {
        await nativeDownloadManager.cancelDownload(contentId);
      } catch (error) {
        console.error("❌ Erreur annulation téléchargement:", error);
        throw error;
      }
    },
    [isNativeAvailable]
  );

  return {
    downloadState,
    startDownload,
    cancelDownload,
    isNativeAvailable,
    activeDownloadsCount,
    restoreActiveDownloads,
    forceRefreshAdhans,
    initializeAvailableSounds,
  };
};
