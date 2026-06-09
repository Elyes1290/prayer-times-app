import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { Alert, Platform } from "react-native";
import RNFS from "react-native-fs";
import { AudioGifType } from "../constants/quranGifs";
import { useNativeDownload } from "../hooks/useNativeDownload";
import { DownloadInfo } from "../utils/nativeDownloadManager";
import PremiumContentManager, { PremiumContent } from "../utils/premiumContent";
import type { QuranPlaybackBridge } from "./useQuranPlayback";

type UseQuranDownloadsParams = {
  sourates: Array<{
    id: number;
    name_simple: string;
    name_arabic: string;
  }>;
  showDownloadsView: boolean;
  isOfflineMode: boolean;
  isPremium: boolean;
  showToast: (payload: { type: string; title: string; message: string }) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
  onSelectGif: (gifId: AudioGifType) => void;
  playbackBridgeRef: MutableRefObject<QuranPlaybackBridge>;
};

export function useQuranDownloads({
  sourates,
  showDownloadsView,
  isOfflineMode,
  isPremium,
  showToast,
  t,
  onSelectGif,
  playbackBridgeRef,
}: UseQuranDownloadsParams) {
  const [availableRecitations, setAvailableRecitations] = useState<
    PremiumContent[]
  >([]);
  const [selectedReciter, setSelectedReciter] = useState<string | null>(null);
  const [scannedQuranFiles, setScannedQuranFiles] = useState<PremiumContent[]>(
    [],
  );
  const [iosDownloadingIds, setIosDownloadingIds] = useState<Set<string>>(
    new Set(),
  );
  const [downloadsSound, setDownloadsSound] = useState<Audio.Sound | null>(null);
  const [downloadsPlaying, setDownloadsPlaying] = useState<string | null>(null);
  const [downloadsIsPlaying, setDownloadsIsPlaying] = useState(false);
  const downloadsPositionRef = useRef(0);
  const downloadsDurationRef = useRef(0);
  const [downloadsPlaylist, setDownloadsPlaylist] = useState<PremiumContent[]>(
    [],
  );
  const [downloadsPlaylistIndex, setDownloadsPlaylistIndex] = useState(0);
  const playNextDownloadedRef = useRef<(() => Promise<void>) | null>(null);

  const premiumManager = PremiumContentManager.getInstance();

  const { downloadState, startDownload, cancelDownload, isNativeAvailable } =
    useNativeDownload();

  const scanDownloadedQuranFiles = useCallback(async (): Promise<
    PremiumContent[]
  > => {
    try {
      const quranDirectory = `${RNFS.DocumentDirectoryPath}/quran`;
      const dirExists = await RNFS.exists(quranDirectory);
      if (!dirExists) {
        console.log("ðŸ“ Dossier /quran/ n'existe pas encore");
        return [];
      }

      const reciterFolders = await RNFS.readDir(quranDirectory);
      const dirs = reciterFolders.filter((folder) => folder.isDirectory());
      const souratesById = new Map(sourates.map((s) => [s.id, s]));
      const perReciter = await Promise.all(
        dirs.map(async (folder) => {
          const reciterName = folder.name;
          const reciterFiles = await RNFS.readDir(folder.path);
          const items: PremiumContent[] = [];

          for (const file of reciterFiles) {
            if (!file.isFile() || !file.name.endsWith(".mp3")) continue;

            const nameWithoutExt = file.name.replace(".mp3", "");
            const parts = nameWithoutExt.split("_");
            const surahNumberStr = parts[parts.length - 1];
            if (!surahNumberStr) continue;

            const surahNumber = parseInt(surahNumberStr, 10);
            if (isNaN(surahNumber)) continue;

            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
            const surahData = souratesById.get(surahNumber);
            const surahName = surahData
              ? `${surahData.name_simple} (${surahData.name_arabic})`
              : `Sourate ${surahNumber}`;

            items.push({
              id: nameWithoutExt,
              type: "quran",
              title: surahName,
              description: `Récitation par ${reciterName}`,
              fileUrl: "",
              fileSize: parseFloat(fileSizeMB),
              version: "1.0",
              isDownloaded: true,
              downloadPath: file.path,
              reciter: reciterName,
              surahNumber,
              surahName,
            });
          }

          return items;
        }),
      );

      const quranRecitations = perReciter.flat();
      console.log(
        `✅ ${quranRecitations.length} récitations Quran trouvées dans ${
          dirs.length
        } récitateurs`,
      );
      return quranRecitations;
    } catch (error) {
      console.error("âŒ Erreur scan dossier rÃ©citations:", error);
      return [];
    }
  }, [sourates]);

  const loadAvailableRecitations = useCallback(
    async (forceRefresh = false) => {
      try {
        const savedGif = await AsyncStorage.getItem("@selected_audio_gif");
        const validGifs: AudioGifType[] = [
          "audio_wave3",
          "chute",
          "riviere",
          "alquds",
          "madina",
          "makka",
        ];
        if (savedGif && validGifs.includes(savedGif as AudioGifType)) {
          onSelectGif(savedGif as AudioGifType);
        }

        if (forceRefresh) {
          await AsyncStorage.removeItem("premium_catalog_cache");
          await premiumManager.invalidateQuranCache();
        }

        const catalog = await premiumManager.getPremiumCatalog();
        if (catalog && catalog.quranRecitations) {
          const recitationsWithStatus = await Promise.all(
            catalog.quranRecitations.map(async (recitation) => {
              const actualDownloadPath = await premiumManager.isContentDownloaded(
                recitation.id,
              );
              return {
                ...recitation,
                isDownloaded: !!actualDownloadPath,
                downloadPath: actualDownloadPath || undefined,
              };
            }),
          );
          setAvailableRecitations(recitationsWithStatus);

          if (!selectedReciter && recitationsWithStatus.length > 0) {
            const firstReciter = recitationsWithStatus[0].reciter;
            if (firstReciter) {
              setSelectedReciter(firstReciter);
            }
          }
        }
      } catch (error) {
        console.error("Erreur chargement récitations:", error);
      }
    },
    [onSelectGif, premiumManager, selectedReciter],
  );

  useEffect(() => {
    void loadAvailableRecitations();
  }, [loadAvailableRecitations]);

  const availableReciters = useMemo(() => {
    const reciters = new Set<string>();
    availableRecitations.forEach((recitation) => {
      if (recitation.reciter && recitation.reciter !== "Récitateur") {
        reciters.add(recitation.reciter);
      }
    });
    return Array.from(reciters).sort();
  }, [availableRecitations]);

  useEffect(() => {
    console.log(
      `ðŸ” useEffect scan - isOfflineMode: ${isOfflineMode}, showDownloadsView: ${showDownloadsView}`,
    );
    if ((isOfflineMode || showDownloadsView) && sourates.length > 0) {
      scanDownloadedQuranFiles().then((files) => {
        console.log(`🎯 Fichiers scannés à setter dans l'état: ${files.length}`);
        setScannedQuranFiles(files);
      });
    }
  }, [isOfflineMode, showDownloadsView, sourates, scanDownloadedQuranFiles]);

  const handleDeleteRecitation = useCallback(
    async (recitation: PremiumContent) => {
      const recitationLabel =
        recitation.surahName ||
        recitation.title ||
        (recitation.surahNumber != null
          ? `${t("surah")} ${recitation.surahNumber}`
          : recitation.id);

      Alert.alert(
        t("delete_download_title"),
        t("delete_download_message", { title: recitationLabel }),
        [
          { text: t("cancel"), style: "cancel" },
          {
            text: t("delete"),
            style: "destructive",
            onPress: async () => {
              try {
                if (playbackBridgeRef.current.currentlyPlaying === recitation.id) {
                  await playbackBridgeRef.current.stopRecitation();
                }

                const success = await premiumManager.deletePremiumContent(
                  recitation.id,
                );

                if (success) {
                  showToast({
                    type: "success",
                    title: t("toast_delete_success"),
                    message: t("toast_delete_completed"),
                  });

                  playbackBridgeRef.current.setCurrentRecitation((prev) =>
                    prev && prev.id === recitation.id
                      ? {
                          ...prev,
                          isDownloaded: false,
                          downloadPath: undefined,
                        }
                      : prev,
                  );

                  scanDownloadedQuranFiles().then(setScannedQuranFiles);
                } else {
                  showToast({
                    type: "error",
                    title: t("toast_error"),
                    message: t("toast_delete_error"),
                  });
                }
              } catch (error) {
                console.error("Erreur suppression récitation:", error);
                showToast({
                  type: "error",
                  title: t("toast_error"),
                  message: t("toast_delete_failed"),
                });
              }
            },
          },
        ],
      );
    },
    [playbackBridgeRef, premiumManager, scanDownloadedQuranFiles, showToast, t],
  );

  const handleNativeDownloadRecitation = useCallback(
    async (recitation: PremiumContent) => {
      if (!isPremium) {
        showToast({
          type: "error",
          title: t("toast_premium_required"),
          message: t("toast_premium_required"),
        });
        return;
      }

      if (Platform.OS === "android" && !isNativeAvailable) {
        showToast({
          type: "error",
          title: t("toast_download_error"),
          message: t("toast_download_failed"),
        });
        return;
      }

      try {
        console.log(`🎯 Début téléchargement: ${recitation.title} (${Platform.OS})`);

        if (Platform.OS === "ios") {
          console.log("ðŸŽ iOS dÃ©tectÃ© - Utilisation de PremiumContentManager");
          setIosDownloadingIds((prev) => new Set(prev).add(recitation.id));

          try {
            const quranContent: PremiumContent = {
              id: recitation.id,
              type: "quran",
              title: recitation.title,
              description: recitation.reciter || "",
              fileUrl: recitation.fileUrl,
              fileSize: 0,
              version: "1.0",
              isDownloaded: false,
              reciter: recitation.reciter,
              surahNumber: recitation.surahNumber,
              surahName: recitation.surahName,
            };

            await premiumManager.downloadPremiumContent(quranContent, (progress) => {
              console.log(`📥 Progression: ${Math.round(progress * 100)}%`);
            });

            console.log("✅ Téléchargement terminé, attente 500ms avant scan...");
            await new Promise((resolve) => setTimeout(resolve, 500));

            console.log("ðŸ“ Scan des fichiers tÃ©lÃ©chargÃ©s...");
            const files = await scanDownloadedQuranFiles();
            console.log(`📊 ${files.length} fichiers trouvés après scan`);
            setScannedQuranFiles([...files]);

            console.log("🔄 Rechargement des récitations pour actualiser l'UI...");
            await loadAvailableRecitations(true);

            if (playbackBridgeRef.current.currentRecitation?.id === recitation.id) {
              const updatedPath = await premiumManager.isContentDownloaded(
                recitation.id,
              );
              playbackBridgeRef.current.setCurrentRecitation((prev) =>
                prev
                  ? {
                      ...prev,
                      isDownloaded: true,
                      downloadPath: updatedPath || undefined,
                    }
                  : prev,
              );
              console.log(
                "✅ currentRecitation mis à jour avec le statut téléchargé",
              );
            }

            showToast({
              type: "success",
              title: t("toast_download_success"),
              message: `${recitation.title} téléchargé avec succès !`,
            });
          } finally {
            setIosDownloadingIds((prev) => {
              const newSet = new Set(prev);
              newSet.delete(recitation.id);
              return newSet;
            });
          }
        } else {
          console.log("🤖 Android détecté - Utilisation de DownloadModule");
          const downloadInfo: DownloadInfo = {
            contentId: recitation.id,
            url: recitation.fileUrl,
            fileName: `${recitation.id}.mp3`,
            title: recitation.title,
          };

          await startDownload(downloadInfo);

          showToast({
            type: "info",
            title: t("toast_download_success"),
            message: t("toast_recitation_loading"),
          });
        }
      } catch (error) {
        console.error("âŒ Erreur tÃ©lÃ©chargement rÃ©citation:", error);
        showToast({
          type: "error",
          title: t("toast_download_error"),
          message: t("toast_download_failed"),
        });
      }
    },
    [
      isPremium,
      isNativeAvailable,
      loadAvailableRecitations,
      playbackBridgeRef,
      premiumManager,
      scanDownloadedQuranFiles,
      showToast,
      startDownload,
      t,
    ],
  );

  const handleNativeDownloadCompleted = useCallback(
    async (contentId: string, localUri: string) => {
      try {
        if (
          contentId.startsWith("quran_") ||
          contentId.startsWith("reciter_")
        ) {
          const migratedPath = await premiumManager.migrateFileToInternal(
            localUri.replace("file://", ""),
            contentId,
          );

          if (migratedPath) {
            await premiumManager.markContentAsDownloaded(contentId, migratedPath);
            if (playbackBridgeRef.current.currentRecitation?.id === contentId) {
              playbackBridgeRef.current.setCurrentRecitation((prev) =>
                prev
                  ? {
                      ...prev,
                      isDownloaded: true,
                      downloadPath: migratedPath,
                    }
                  : prev,
              );
            }
          } else {
            await premiumManager.markContentAsDownloaded(contentId, localUri);
            if (playbackBridgeRef.current.currentRecitation?.id === contentId) {
              playbackBridgeRef.current.setCurrentRecitation((prev) =>
                prev
                  ? {
                      ...prev,
                      isDownloaded: true,
                      downloadPath: localUri.replace("file://", ""),
                    }
                  : prev,
              );
            }
          }
        } else {
          await premiumManager.markContentAsDownloaded(contentId, localUri);
          if (playbackBridgeRef.current.currentRecitation?.id === contentId) {
            playbackBridgeRef.current.setCurrentRecitation((prev) =>
              prev
                ? {
                    ...prev,
                    isDownloaded: true,
                    downloadPath: localUri.replace("file://", ""),
                  }
                : prev,
            );
          }
        }

        showToast({
          type: "success",
          title: t("toast_success"),
          message: t("toast_download_completed_title"),
        });
      } catch (error) {
        console.error("âŒ Erreur lors de la finalisation:", error);
        showToast({
          type: "error",
          title: t("toast_error"),
          message: t("toast_download_error_message"),
        });
      }
    },
    [playbackBridgeRef, premiumManager, showToast, t],
  );

  const handleNativeCancelDownload = useCallback(
    async (recitationId: string) => {
      try {
        await cancelDownload(recitationId);
        showToast({
          type: "info",
          title: t("toast_download_cancelled_title"),
          message: t("toast_download_cancelled_message"),
        });
      } catch (error) {
        console.error("âŒ Erreur annulation tÃ©lÃ©chargement:", error);
        showToast({
          type: "error",
          title: t("toast_download_error_title"),
          message: t("toast_download_failed_message"),
        });
      }
    },
    [cancelDownload, showToast, t],
  );

  useEffect(() => {
    Array.from(downloadState.entries()).forEach(([contentId, state]) => {
      if (
        state.progress === 1 &&
        !state.isDownloading &&
        !state.error &&
        state.localUri
      ) {
        void handleNativeDownloadCompleted(contentId, state.localUri);
        downloadState.delete(contentId);
      }
    });
  }, [downloadState, handleNativeDownloadCompleted]);

  const playDownloadedRecitation = useCallback(
    async (recitation: PremiumContent) => {
      try {
        console.log(`🎵 [DOWNLOADS] Lecture téléchargement: ${recitation.title}`);

        if (downloadsSound) {
          console.log("🎵 [DOWNLOADS] Arrêt son précédent");
          await downloadsSound.unloadAsync();
          setDownloadsSound(null);
        }

        if (recitation.reciter) {
          const downloadedRecitations = scannedQuranFiles
            .filter((r) => r.reciter === recitation.reciter)
            .sort((a, b) => (a.surahNumber || 0) - (b.surahNumber || 0));

          if (downloadedRecitations.length > 0) {
            const currentIndex = downloadedRecitations.findIndex(
              (r) => r.id === recitation.id,
            );

            setDownloadsPlaylist(downloadedRecitations);
            setDownloadsPlaylistIndex(currentIndex >= 0 ? currentIndex : 0);

            console.log(
              `🎵 [DOWNLOADS] Playlist: ${
                downloadedRecitations.length
              } récitations, position: ${currentIndex + 1}`,
            );
          }
        }

        const downloadPath = await premiumManager.isContentDownloaded(
          recitation.id,
        );
        if (!downloadPath) {
          showToast({
            type: "error",
            title: t("error"),
            message: t("file_not_found"),
          });
          return;
        }

        await Audio.setAudioModeAsync({
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
        });

        console.log(`🎵 [DOWNLOADS] Chargement: file://${downloadPath}`);
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: `file://${downloadPath}` },
          {
            shouldPlay: true,
            progressUpdateIntervalMillis: 1000,
          },
          (status) => {
            if (status.isLoaded) {
              downloadsDurationRef.current = status.durationMillis || 0;
              downloadsPositionRef.current = status.positionMillis || 0;
              setDownloadsIsPlaying(status.isPlaying || false);

              if (status.didJustFinish && !status.isLooping) {
                console.log("🎵 [DOWNLOADS] Fichier terminé, passage au suivant");
                if (playNextDownloadedRef.current) {
                  void playNextDownloadedRef.current();
                }
              }
            }
          },
        );

        setDownloadsSound(newSound);
        setDownloadsPlaying(recitation.id);
        setDownloadsIsPlaying(true);

        showToast({
          type: "success",
          title: t("playing"),
          message: recitation.title,
        });
      } catch (error) {
        console.error("âŒ [DOWNLOADS] Erreur lecture:", error);
        showToast({
          type: "error",
          title: t("playback_error"),
          message: t("playback_error_message"),
        });
      }
    },
    [downloadsSound, premiumManager, scannedQuranFiles, showToast, t],
  );

  const pauseDownloadedRecitation = useCallback(async () => {
    try {
      if (downloadsSound) {
        const status = await downloadsSound.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await downloadsSound.pauseAsync();
          setDownloadsIsPlaying(false);
          console.log("â¸ï¸ [DOWNLOADS] Pause");
        }
      }
    } catch (error) {
      console.error("âŒ [DOWNLOADS] Erreur pause:", error);
    }
  }, [downloadsSound]);

  const resumeDownloadedRecitation = useCallback(async () => {
    try {
      if (downloadsSound) {
        const status = await downloadsSound.getStatusAsync();
        if (status.isLoaded && !status.isPlaying) {
          await downloadsSound.playAsync();
          setDownloadsIsPlaying(true);
          console.log("â–¶ï¸ [DOWNLOADS] Resume");
        }
      }
    } catch (error) {
      console.error("âŒ [DOWNLOADS] Erreur resume:", error);
    }
  }, [downloadsSound]);

  const playNextDownloaded = useCallback(async () => {
    const nextIndex = downloadsPlaylistIndex + 1;
    if (nextIndex < downloadsPlaylist.length) {
      console.log(
        `🎵 [DOWNLOADS] Passage à ${nextIndex + 1}/${downloadsPlaylist.length}`,
      );
      setDownloadsPlaylistIndex(nextIndex);
      await playDownloadedRecitation(downloadsPlaylist[nextIndex]);
    } else {
      console.log("🎵 [DOWNLOADS] Fin de la playlist");
      if (downloadsSound) {
        await downloadsSound.unloadAsync();
        setDownloadsSound(null);
      }
      setDownloadsPlaying(null);
      setDownloadsIsPlaying(false);
      setDownloadsPlaylist([]);
      setDownloadsPlaylistIndex(0);
    }
  }, [
    downloadsPlaylist,
    downloadsPlaylistIndex,
    downloadsSound,
    playDownloadedRecitation,
  ]);

  useEffect(() => {
    playNextDownloadedRef.current = playNextDownloaded;
  }, [playNextDownloaded]);

  const handleDownloadedRecitationPress = useCallback(
    (recitation: PremiumContent) => {
      if (downloadsPlaying === recitation.id && downloadsIsPlaying) {
        void pauseDownloadedRecitation();
      } else if (downloadsPlaying === recitation.id && !downloadsIsPlaying) {
        void resumeDownloadedRecitation();
      } else {
        void playDownloadedRecitation(recitation);
      }
    },
    [
      downloadsIsPlaying,
      downloadsPlaying,
      pauseDownloadedRecitation,
      playDownloadedRecitation,
      resumeDownloadedRecitation,
    ],
  );

  const cleanupDownloadsPlayback = useCallback(() => {
    if (!downloadsSound) return;
    console.log("🎵 [DOWNLOADS] Nettoyage à la fermeture");
    void downloadsSound.unloadAsync();
    setDownloadsSound(null);
    setDownloadsPlaying(null);
    setDownloadsIsPlaying(false);
  }, [downloadsSound]);

  return {
    availableRecitations,
    selectedReciter,
    setSelectedReciter,
    availableReciters,
    loadAvailableRecitations,
    scanDownloadedQuranFiles,
    scannedQuranFiles,
    iosDownloadingIds,
    downloadState,
    handleDeleteRecitation,
    handleNativeDownloadRecitation,
    handleNativeCancelDownload,
    handleNativeDownloadCompleted,
    downloadsPlaying,
    downloadsIsPlaying,
    playDownloadedRecitation,
    pauseDownloadedRecitation,
    resumeDownloadedRecitation,
    playNextDownloaded,
    handleDownloadedRecitationPress,
    cleanupDownloadsPlayback,
  };
}
