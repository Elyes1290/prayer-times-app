import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import {
  DeviceEventEmitter,
  Platform,
} from "react-native";
import {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { AudioGifType } from "../constants/quranGifs";
import { addPlaybackDebugLog } from "../utils/playbackDebugLogs";
import {
  parseSurahNumberFromServiceTitle,
  resolvePlaybackDurationMs,
} from "../utils/audioDurationUtils";
import { toPremiumStreamPlaybackUrl } from "../utils/premiumPlaybackUrl";
import { logQuranSeek } from "../utils/quranSeekDebug";
import PremiumContentManager, { PremiumContent } from "../utils/premiumContent";
import audioManager from "../utils/AudioManager";
import { useQuranWidget } from "./useQuranWidget";
import { useQuranAudioService } from "./useQuranAudioService";

type UseQuranPlaybackParams = {
  sourates: any[];
  selectedSourate: number;
  setSelectedSourate: Dispatch<SetStateAction<number>>;
  selectedReciter: string | null;
  setSelectedReciter: Dispatch<SetStateAction<string | null>>;
  scannedQuranFiles: PremiumContent[];
  surahAutoPlayOnChangeRef: MutableRefObject<boolean>;
  offlineAccess: { isOfflineMode: boolean };
  networkStatus: { isConnected: boolean };
  showToast: (payload: { type: string; title: string; message: string }) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
  windowWidth: number;
  isPremium: boolean;
};

export type QuranPlaybackBridge = {
  currentlyPlaying: string | null;
  currentRecitation: PremiumContent | null;
  stopRecitation: () => Promise<void>;
  setCurrentRecitation: Dispatch<SetStateAction<PremiumContent | null>>;
};

export function useQuranPlayback({
  sourates,
  selectedSourate,
  setSelectedSourate,
  selectedReciter,
  setSelectedReciter,
  scannedQuranFiles,
  surahAutoPlayOnChangeRef,
  offlineAccess,
  networkStatus,
  showToast,
  t,
  windowWidth,
  isPremium,
}: UseQuranPlaybackParams) {
  const [playlistMode, setPlaylistMode] = useState(false);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0);
  const [playlistItems, setPlaylistItems] = useState<PremiumContent[]>([]);
  const playlistModeRef = useRef(false);
  const currentPlaylistIndexRef = useRef(0);
  const playlistItemsRef = useRef<PremiumContent[]>([]);

  const [audioControlsModalVisible, setAudioControlsModalVisible] =
    useState(false);
  const [selectedGif, setSelectedGif] = useState<AudioGifType>("audio_wave3");
  const [gifModalVisible, setGifModalVisible] = useState(false);
  const [isAppNavigation, setIsAppNavigation] = useState(false);
  const lastServiceSurahRef = useRef<string | null>(null);
  const lastSyncedServiceRecitationRef = useRef<number | null>(null);
  const surahAutoPlayFallbackTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [showNavigationTooltip, setShowNavigationTooltip] = useState(false);

  const slideAnim = useSharedValue(0);
  const slideAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideAnim.value }],
  }));

  const playNextInPlaylistRef = useRef<() => void>(() => {});
  const playPreviousInPlaylistRef = useRef<() => void>(() => {});
  const lastDurationSurahRef = useRef<number | null>(null);
  const playbackDurationAccumRef = useRef(0);

  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [sound, setSound] = useState<any | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const pendingSeekTargetRef = useRef(0);
  const pendingSeekUntilRef = useRef(0);
  const [manualPlaybackDuration, setManualPlaybackDuration] = useState(0);
  const [currentRecitation, setCurrentRecitation] =
    useState<PremiumContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [prevSelectedSourate, setPrevSelectedSourate] =
    useState(selectedSourate);
  const [prevOfflineSyncKey, setPrevOfflineSyncKey] = useState("");

  const premiumManager = PremiumContentManager.getInstance();

  const {
    isWidgetAvailable,
    updateWidgetAudio,
    updateWidgetPlaybackState,
    runWidgetDiagnostic,
  } = useQuranWidget();

  const {
    audioState: serviceAudioState,
    startService,
    loadAudio: loadAudioInService,
    playAudio: playAudioInService,
    pauseAudio: pauseAudioInService,
    stopAudio: stopAudioInService,
    seekToPosition: seekToPositionInService,
    getCurrentWidgetSurah,
    syncWithWidgetSurah,
    updatePremiumStatus,
    isServiceAvailable,
  } = useQuranAudioService();

  const [prevServiceSurahTitle, setPrevServiceSurahTitle] = useState<
    string | null
  >(serviceAudioState.currentSurah ?? null);

  const usesNativeAudioService = isServiceAvailable() && isPremium;

  if (selectedSourate !== prevSelectedSourate) {
    setPrevSelectedSourate(selectedSourate);
    lastDurationSurahRef.current = null;
    playbackDurationAccumRef.current = 0;
    setManualPlaybackDuration(0);
    setPlaybackPosition(0);
  }

  const displayPlaybackPosition = useMemo(() => {
    if (!usesNativeAudioService) {
      return playbackPosition;
    }
    const servicePos = serviceAudioState.position || 0;
    if (Date.now() < pendingSeekUntilRef.current) {
      const gap = Math.abs(servicePos - pendingSeekTargetRef.current);
      if (gap > 3000) {
        return playbackPosition;
      }
    }
    return servicePos;
  }, [
    usesNativeAudioService,
    serviceAudioState.position,
    playbackPosition,
  ]);

  const displayIsPlaying = usesNativeAudioService
    ? serviceAudioState.isPlaying || false
    : isPlaying;

  if ((serviceAudioState.currentSurah ?? null) !== prevServiceSurahTitle) {
    setPrevServiceSurahTitle(serviceAudioState.currentSurah ?? null);
    if (isAppNavigation && serviceAudioState.currentSurah) {
      const alignedSurah = parseSurahNumberFromServiceTitle(
        serviceAudioState.currentSurah,
        sourates,
      );
      if (alignedSurah === selectedSourate) {
        setIsAppNavigation(false);
      }
    }
  }

  const offlineSyncKey =
    !isLoading &&
    offlineAccess.isOfflineMode &&
    selectedReciter &&
    selectedSourate
      ? `${selectedSourate}:${selectedReciter.toLowerCase()}:${scannedQuranFiles.length}`
      : "";

  if (offlineSyncKey && offlineSyncKey !== prevOfflineSyncKey) {
    setPrevOfflineSyncKey(offlineSyncKey);
    const offlineRec = scannedQuranFiles.find(
      (r) =>
        r.surahNumber === selectedSourate &&
        r.reciter?.toLowerCase() === selectedReciter.toLowerCase(),
    );
    if (offlineRec) {
      setCurrentRecitation((prev) => {
        if (
          prev?.surahNumber === selectedSourate &&
          prev?.reciter?.toLowerCase() === selectedReciter.toLowerCase()
        ) {
          return prev;
        }
        return offlineRec;
      });
    }
  }

  const serviceAudioStateRef = useRef(serviceAudioState);
  const selectedReciterRef = useRef(selectedReciter);
  const selectedSourateRef = useRef(selectedSourate);
  const souratesRef = useRef(sourates);
  const loadSpecificRecitationRef = useRef<
    (reciter: string, surah: number, autoPlay?: boolean) => Promise<void>
  >(async () => {});

  console.log("🎵 Hook useQuranAudioService - État initial:", serviceAudioState);
  console.log(
    "🎵 Hook useQuranAudioService - Service disponible:",
    isServiceAvailable(),
  );

  const serviceSyncedPlaybackDuration = useMemo(() => {
    if (!isServiceAvailable() || !isPremium) {
      return 0;
    }

    const newPosition = serviceAudioState.position || 0;
    const rawDuration =
      serviceAudioState.duration || serviceAudioState.totalDuration || 0;
    const serviceSurahNum = parseSurahNumberFromServiceTitle(
      serviceAudioState.currentSurah,
      sourates,
    );

    // Service encore sur l'ancienne piste → ne pas réutiliser sa durée
    if (serviceSurahNum != null && serviceSurahNum !== selectedSourate) {
      return 0;
    }

    const iosRaw =
      Platform.OS === "ios" &&
      serviceAudioState.totalDuration &&
      serviceAudioState.totalDuration > 0 &&
      serviceAudioState.totalDuration < 40000
        ? serviceAudioState.totalDuration * 1000
        : rawDuration;

    const resolved = resolvePlaybackDurationMs({
      rawDuration,
      positionMs: newPosition,
      previousMs: playbackDurationAccumRef.current,
      fileSizeMb: currentRecitation?.fileSize,
      catalogDurationMs: currentRecitation?.durationMs,
      selectedSurah: selectedSourate,
      serviceSurah: serviceSurahNum,
      iosScaledRaw: iosRaw,
    });

    if (resolved > 0) {
      playbackDurationAccumRef.current = resolved;
      lastDurationSurahRef.current = selectedSourate;
    }

    return resolved;
  }, [
    serviceAudioState.position,
    serviceAudioState.duration,
    serviceAudioState.totalDuration,
    serviceAudioState.currentSurah,
    isPremium,
    currentRecitation?.fileSize,
    currentRecitation?.durationMs,
    selectedSourate,
    sourates,
    isServiceAvailable,
  ]);

  const playbackDuration = useMemo(
    () =>
      serviceSyncedPlaybackDuration > 0
        ? serviceSyncedPlaybackDuration
        : manualPlaybackDuration,
    [serviceSyncedPlaybackDuration, manualPlaybackDuration],
  );

  const resetSlideAnimation = useCallback(() => {
    slideAnim.value = 0;
    console.log("🔧 Animation slide réinitialisée à 0");
  }, [slideAnim]);

  useEffect(() => {
    if (!audioControlsModalVisible) {
      resetSlideAnimation();
    }
  }, [audioControlsModalVisible, resetSlideAnimation]);

  useEffect(() => {
    return () => {
      if (sound) {
        void sound.unloadAsync();
      }
    };
  }, [sound]);

  useEffect(() => {
    if (isServiceAvailable() && isPremium) {
      console.log("🎵 Initialisation des écouteurs d'événements audio natifs");
      console.log(
        "🎵 Écouteurs d'événements audio initialisés via useQuranAudioService",
      );
      return () => {
        console.log("🎵 Nettoyage des écouteurs d'événements audio");
      };
    }
  }, [isServiceAvailable, isPremium]);

  useEffect(() => {
    const shouldStartService = async () => {
      if (
        isServiceAvailable() &&
        isPremium &&
        !serviceAudioState.isServiceRunning
      ) {
        console.log(
          "🎵 Démarrage automatique du service audio pour utilisateur premium",
        );
        startService().catch((error) => {
          console.error("âŒ Erreur dÃ©marrage service audio:", error);
        });
      }
    };
    void shouldStartService();
  }, [
    isServiceAvailable,
    isPremium,
    serviceAudioState.isServiceRunning,
    startService,
  ]);

  useEffect(() => {
    lastSyncedServiceRecitationRef.current = null;
  }, [selectedReciter]);

  const syncRecitationFromServiceSurah = useCallback(
    async (surahNumber: number, playing: boolean) => {
      if (!selectedReciter || !isPremium) return;
      if (surahNumber !== selectedSourateRef.current) return;
      if (lastSyncedServiceRecitationRef.current === surahNumber) return;
      lastSyncedServiceRecitationRef.current = surahNumber;

      try {
        const rec = await premiumManager.getSpecificRecitation(
          selectedReciter,
          surahNumber,
        );
        if (rec) {
          setCurrentRecitation(rec);
          if (playing) {
            setCurrentlyPlaying(rec.id);
          }
          if (rec.durationMs && rec.durationMs > 0) {
            setManualPlaybackDuration(rec.durationMs);
            lastDurationSurahRef.current = surahNumber;
          }
        }
      } catch (error) {
        console.error("Erreur sync récitation service:", error);
      }
    },
    [selectedReciter, isPremium, premiumManager],
  );

  useEffect(() => {
    if (isServiceAvailable() && isPremium) {
      console.log("🎵 Synchronisation avec useQuranAudioService");
      console.log("ðŸ” Ã‰tat du service:", serviceAudioState);

      const newPosition = serviceAudioState.position || 0;
      const rawDuration =
        serviceAudioState.duration || serviceAudioState.totalDuration || 0;
      const newIsPlaying = serviceAudioState.isPlaying || false;

      console.log(
        "📊 Mise à jour état - position:",
        newPosition,
        "duration:",
        rawDuration,
        "isPlaying:",
        newIsPlaying,
        "currentSurah:",
        serviceAudioState.currentSurah,
      );

      const now = Date.now();
      if (now < pendingSeekUntilRef.current) {
        const target = pendingSeekTargetRef.current;
        const gap = Math.abs(newPosition - target);
        if (gap <= 3000) {
          pendingSeekUntilRef.current = 0;
          logQuranSeek("JS_SYNC_SEEK_OK", {
            target,
            newPosition,
            gap,
          });
        } else {
          logQuranSeek("JS_SYNC_SEEK_WAIT", {
            target,
            newPosition,
            gap,
            remainingMs: pendingSeekUntilRef.current - now,
          });
        }
      }

      const currentSec = Math.floor(newPosition / 1000);
      const totalSec = Math.floor(playbackDuration / 1000);
      if (newPosition >= 0) {
        const shouldLog =
          newPosition === 0 || (currentSec % 2 === 0 && newPosition > 0);
        if (shouldLog) {
          addPlaybackDebugLog("JS Sync", {
            pos: currentSec,
            dur: totalSec,
            playing: newIsPlaying,
          });
          DeviceEventEmitter.emit("AddPlaybackDebugLog", {
            message: `[JS Sync] ${currentSec}s / ${totalSec}s (Play:${
              newIsPlaying ? "OUI" : "NON"
            })`,
            type: "info",
            details: {
              newPosition,
              rawDuration,
              rawServiceDur: serviceAudioState.duration,
              rawServiceTotalDur: serviceAudioState.totalDuration,
              playbackDuration,
            },
          });
        }
      }

      if (
        serviceAudioState.currentSurah &&
        serviceAudioState.currentSurah !== lastServiceSurahRef.current
      ) {
        console.log(
          `🎯 Changement sourate détecté: "${lastServiceSurahRef.current}" → "${serviceAudioState.currentSurah}"`,
        );
        const serviceSurahNum = parseSurahNumberFromServiceTitle(
          serviceAudioState.currentSurah,
          sourates,
        );

        lastServiceSurahRef.current = serviceAudioState.currentSurah;

        if (
          serviceSurahNum !== null &&
          serviceSurahNum === selectedSourate &&
          !isLoading
        ) {
          void syncRecitationFromServiceSurah(
            serviceSurahNum,
            serviceAudioState.isPlaying,
          );
        }

      }

      if (serviceAudioState.currentSurah && !isAppNavigation && !isLoading) {
        console.log(
          `ðŸ” VÃ©rification sync: currentSurah="${serviceAudioState.currentSurah}" selectedSourate=${selectedSourate}`,
        );
        const surahNumber = parseSurahNumberFromServiceTitle(
          serviceAudioState.currentSurah,
          sourates,
        );
        if (surahNumber !== null) {
          console.log(
            `🔍 Sourate extraite: ${surahNumber}, actuelle: ${selectedSourate}`,
          );
          if (surahNumber !== selectedSourate) {
            console.log(
              `🎯 Synchronisation interface: passage sourate ${selectedSourate} → ${surahNumber}`,
            );
            setSelectedSourate(surahNumber);
          }
        }
      } else if (isAppNavigation) {
        console.log(
          "🚫 Synchronisation désactivée - Mode navigation app actif",
        );
      }
    }
  }, [
    serviceAudioState,
    isServiceAvailable,
    isPremium,
    isAppNavigation,
    isLoading,
    currentRecitation,
    currentlyPlaying,
    selectedSourate,
    sourates,
    playbackDuration,
    syncRecitationFromServiceSurah,
    setSelectedSourate,
  ]);

  const isRecitationPlaying = usesNativeAudioService
    ? displayIsPlaying
    : currentlyPlaying === currentRecitation?.id && displayIsPlaying;

  const playRecitation = useCallback(
    async (recitation: PremiumContent) => {
      try {
        setIsLoading(true);
        setIsAppNavigation(true);
        lastSyncedServiceRecitationRef.current = null;
        playbackDurationAccumRef.current = 0;

        let activeRecitation = recitation;
        const shouldUseOffline =
          offlineAccess.isOfflineMode || !networkStatus.isConnected;

        if (
          shouldUseOffline &&
          selectedReciterRef.current &&
          selectedSourateRef.current >= 1
        ) {
          const offlineRec = scannedQuranFiles.find(
            (r) =>
              r.surahNumber === selectedSourateRef.current &&
              r.reciter?.toLowerCase() ===
                selectedReciterRef.current!.toLowerCase(),
          );
          if (offlineRec) {
            activeRecitation = offlineRec;
          }
        } else if (
          activeRecitation.surahNumber !== selectedSourateRef.current &&
          selectedReciterRef.current &&
          selectedSourateRef.current >= 1
        ) {
          const aligned = await premiumManager.getSpecificRecitation(
            selectedReciterRef.current,
            selectedSourateRef.current,
            { forceRefresh: true },
          );
          if (aligned) {
            activeRecitation = aligned;
          }
        }

        if (
          activeRecitation.reciter &&
          activeRecitation.surahNumber &&
          activeRecitation.surahNumber >= 1
        ) {
          const fresh = await premiumManager.getSpecificRecitation(
            activeRecitation.reciter,
            activeRecitation.surahNumber,
            { forceRefresh: true },
          );
          if (fresh) {
            activeRecitation = { ...activeRecitation, ...fresh };
          }
        }

        if (shouldUseOffline && !activeRecitation.isDownloaded) {
          showToast({
            type: "error",
            title: t("audio_offline_only"),
            message: t("offline_access_premium"),
          });
          setIsLoading(false);
          return;
        }

        if (sound) {
          await sound.unloadAsync();
          setSound(null);
        }

        setCurrentlyPlaying(activeRecitation.id);
        setCurrentRecitation(activeRecitation);
        setPlaybackPosition(0);
        if (activeRecitation.durationMs && activeRecitation.durationMs > 0) {
          setManualPlaybackDuration(activeRecitation.durationMs);
        } else {
          setManualPlaybackDuration(0);
        }
        if (activeRecitation.surahNumber) {
          lastDurationSurahRef.current = activeRecitation.surahNumber;
        }
        if (activeRecitation.surahNumber) {
          setSelectedSourate(activeRecitation.surahNumber);
        }

        let audioSource: any;
        const actualDownloadPath = await premiumManager.isContentDownloaded(
          activeRecitation.id,
        );

        if (actualDownloadPath) {
          audioSource = { uri: "file://" + actualDownloadPath };
          if (activeRecitation.reciter) {
            setSelectedReciter(activeRecitation.reciter);
          }
        } else {
          let streamingUrl = toPremiumStreamPlaybackUrl(activeRecitation.fileUrl);
          if (
            activeRecitation.surahNumber &&
            !streamingUrl.includes("surah=") &&
            !streamingUrl.includes("id=")
          ) {
            const surahStr = activeRecitation.surahNumber
              .toString()
              .padStart(3, "0");
            streamingUrl += `&surah=${surahStr}`;
          }
          const token = await AsyncStorage.getItem("auth_token");
          if (token && !streamingUrl.includes("token=")) {
            streamingUrl += `&token=${token}`;
          }
          audioSource = { uri: streamingUrl };
          console.log(`ðŸŒ Streaming URL (Range/seek): ${streamingUrl}`);
          if (activeRecitation.reciter) {
            setSelectedReciter(activeRecitation.reciter);
          }
        }

        let nativePlaybackOk = false;
        if (isServiceAvailable() && isPremium) {
          try {
            console.log("🎵 Utilisation du service audio natif");
            await updatePremiumStatus(true);
            const audioPath = actualDownloadPath
              ? actualDownloadPath
              : toPremiumStreamPlaybackUrl(audioSource.uri);
            console.log(`🎵 loadAudioInService: ${audioPath}`);
            console.log(`🚀 [JS Play] Lancement: ${activeRecitation.title}`);
            addPlaybackDebugLog("JS Play", {
              title: activeRecitation.title,
              path: audioPath,
            });
            DeviceEventEmitter.emit("AddPlaybackDebugLog", {
              message: `[JS Play] Lancement: ${activeRecitation.title}`,
              type: "info",
              details: { path: audioPath, isPremium },
            });

            const catalogDurationMs =
              activeRecitation.durationMs && activeRecitation.durationMs > 0
                ? activeRecitation.durationMs
                : 0;
            if (catalogDurationMs > 0) {
              setManualPlaybackDuration(catalogDurationMs);
            }

            await loadAudioInService(
              audioPath,
              activeRecitation.title,
              activeRecitation.reciter || "",
              catalogDurationMs,
              true,
            );

            setIsPlaying(true);
            setCurrentlyPlaying(activeRecitation.id);

            const mockSound = {
              setOnPlaybackStatusUpdate: (callback: any) => {
                console.log("🎵 Mock sound configuré pour service natif");
                mockSound._callback = callback;
              },
              unloadAsync: async () => {
                console.log("🎵 Mock sound unloadAsync appelé");
                return Promise.resolve();
              },
              playAsync: async () => {
                console.log("🎵 Mock sound playAsync appelé");
                return Promise.resolve();
              },
              pauseAsync: async () => {
                console.log("🎵 Mock sound pauseAsync appelé");
                return Promise.resolve();
              },
              stopAsync: async () => {
                console.log("🎵 Mock sound stopAsync appelé");
                return Promise.resolve();
              },
              setPositionAsync: async (position: number) => {
                console.log("🎵 Mock sound setPositionAsync appelé:", position);
                return Promise.resolve();
              },
              getStatusAsync: async () => {
                console.log("🎵 Mock sound getStatusAsync appelé");
                return Promise.resolve({
                  isLoaded: true,
                  isPlaying: isPlaying,
                  positionMillis: playbackPosition,
                  durationMillis: playbackDuration,
                });
              },
              _callback: null as any,
            };
            setSound(mockSound);
            setIsLoading(false);

            nativePlaybackOk = true;
            console.log("✅ Lecture lancée via service natif");
          } catch (serviceError) {
            console.error("âŒ Erreur service audio natif:", serviceError);
            setIsPlaying(false);
            setCurrentlyPlaying(null);
            console.log("🔄 Fallback vers système audio Expo");
          }
        }

        if (!nativePlaybackOk) {
          console.log("🎵 Utilisation du système audio Expo");
          if (shouldUseOffline) {
            console.log("📱 Mode offline - lecture locale uniquement");
            try {
              const createdSound = await audioManager.playSource(audioSource, 1.0);
              setSound(createdSound);
              setIsPlaying(true);
              setCurrentlyPlaying(activeRecitation.id);
              setIsLoading(false);
              return;
            } catch (playError: any) {
              console.error(
                "âŒ Erreur lecture locale en mode offline:",
                playError,
              );
              showToast({
                type: "error",
                title: t("audio_offline_only"),
                message: "Fichier audio corrompu ou indisponible",
              });
              setIsLoading(false);
              return;
            }
          }

          let createdSound: any | null = null;
          try {
            createdSound = await audioManager.playSource(audioSource, 1.0);
          } catch (playError: any) {
            console.error("Erreur lecture locale, fallback streaming:", playError);
            try {
              const remoteUrl = toPremiumStreamPlaybackUrl(
                currentRecitation?.fileUrl || activeRecitation.fileUrl || "",
              );
              if (!remoteUrl) throw new Error("URL streaming indisponible");
              createdSound = await audioManager.playSource(
                { uri: remoteUrl },
                1.0,
              );
            } catch (fallbackError) {
              console.error("Erreur fallback streaming:", fallbackError);
              setIsPlaying(false);
              setCurrentlyPlaying(null);
              setIsLoading(false);
              return;
            }
          }

          setSound(createdSound);
          setIsPlaying(true);
          setCurrentlyPlaying(activeRecitation.id);
        }

        if (isWidgetAvailable && isPremium) {
          const audioPath = actualDownloadPath || activeRecitation.fileUrl;
          updateWidgetAudio(
            activeRecitation.title,
            activeRecitation.reciter || "",
            audioPath,
          );
          updateWidgetPlaybackState(true, 0, 0);
        }

        if (!nativePlaybackOk) {
          audioManager.setStatusCallback((status: any) => {
            if (status.isLoaded) {
              const posMs = status.positionMillis || 0;
              setPlaybackPosition(posMs);
              setManualPlaybackDuration((prev) =>
                resolvePlaybackDurationMs({
                  rawDuration: status.durationMillis || 0,
                  positionMs: posMs,
                  previousMs: prev,
                  fileSizeMb: currentRecitation?.fileSize,
                  catalogDurationMs: currentRecitation?.durationMs,
                  selectedSurah: selectedSourate,
                  serviceSurah: selectedSourate,
                }),
              );

              if (isWidgetAvailable && isPremium) {
                updateWidgetPlaybackState(
                  isPlaying,
                  status.positionMillis || 0,
                  status.durationMillis || 0,
                );
              }

              if (status.didJustFinish) {
                console.log(
                  "🎵 Audio terminé - didJustFinish détecté (Expo-AV uniquement)",
                );
                console.log("🎵 État playlist:", {
                  playlistMode: playlistModeRef.current,
                  currentIndex: currentPlaylistIndexRef.current,
                  totalItems: playlistItemsRef.current.length,
                });

                setIsPlaying(false);
                setCurrentlyPlaying(null);
                setPlaybackPosition(0);
                setManualPlaybackDuration(0);

                if (playlistModeRef.current) {
                  console.log(
                    "🎵 Mode playlist actif - passage automatique à la suivante (Expo-AV)",
                  );
                  setTimeout(() => {
                    console.log(
                      "🎵 Exécution de playNextInPlaylist après délai (Expo-AV)",
                    );
                    playNextInPlaylistRef.current();
                  }, 1000);
                } else {
                  console.log("🎵 Mode playlist inactif - arrêt de la lecture");
                }
              }
            }
          });
        }

        showToast({
          type: "success",
          title: actualDownloadPath ? t("local_playback") : t("streaming"),
          message: `${activeRecitation.title} - ${
            actualDownloadPath ? t("local_file") : t("streaming_status")
          }`,
        });
      } catch (error) {
        console.error("Erreur lecture récitation:", error);
        showToast({
          type: "error",
          title: t("playback_error"),
          message: t("playback_error_message"),
        });
        setCurrentlyPlaying(null);
        setIsPlaying(false);
      } finally {
        setIsLoading(false);
      }
    },
    [
      sound,
      premiumManager,
      isServiceAvailable,
      isPremium,
      isWidgetAvailable,
      showToast,
      t,
      updatePremiumStatus,
      loadAudioInService,
      isPlaying,
      playbackPosition,
      playbackDuration,
      currentRecitation?.fileUrl,
      currentRecitation?.fileSize,
      currentRecitation?.durationMs,
      updateWidgetAudio,
      updateWidgetPlaybackState,
      offlineAccess.isOfflineMode,
      networkStatus.isConnected,
      scannedQuranFiles,
      selectedSourate,
      setSelectedReciter,
      setSelectedSourate,
    ],
  );

  const loadSpecificRecitation = useCallback(
    async (
      reciterName: string,
      surahNumber: number,
      autoPlay: boolean = false,
    ) => {
      if (!reciterName) return;

      try {
        const recitation = await premiumManager.getSpecificRecitation(
          reciterName,
          surahNumber,
        );
        setCurrentRecitation(recitation);

        if (recitation?.durationMs && recitation.durationMs > 0) {
          setManualPlaybackDuration(recitation.durationMs);
          lastDurationSurahRef.current = surahNumber;
        }

        if (autoPlay && recitation) {
          console.log(
            `🎵 Lecture automatique après chargement: ${recitation.title}`,
          );
          void playRecitation(recitation);
        }
      } catch (error) {
        console.error("Erreur chargement récitation spécifique:", error);
        setCurrentRecitation(null);
      }
    },
    [premiumManager, playRecitation],
  );

  useEffect(() => {
    serviceAudioStateRef.current = serviceAudioState;
  }, [serviceAudioState]);

  useEffect(() => {
    selectedReciterRef.current = selectedReciter;
  }, [selectedReciter]);

  useEffect(() => {
    selectedSourateRef.current = selectedSourate;
  }, [selectedSourate]);

  useEffect(() => {
    souratesRef.current = sourates;
  }, [sourates]);

  useEffect(() => {
    loadSpecificRecitationRef.current = loadSpecificRecitation;
  }, [loadSpecificRecitation]);

  useEffect(() => {
    if (!selectedReciter || !selectedSourate || offlineAccess.isOfflineMode) {
      return;
    }

    if (surahAutoPlayOnChangeRef.current) {
      surahAutoPlayOnChangeRef.current = false;
      return;
    }

    void loadSpecificRecitation(selectedReciter, selectedSourate, false);
    // react-doctor-disable-next-line react-doctor/exhaustive-deps
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pas de rechargement quand loadSpecificRecitation est recréé
  }, [selectedReciter, selectedSourate, offlineAccess.isOfflineMode]);

  const pauseRecitation = useCallback(async () => {
    try {
      if (isServiceAvailable() && isPremium) {
        await pauseAudioInService();
        setIsPlaying(false);
        console.log("✅ Pause via service natif");
      } else if (sound) {
        await audioManager.pause();
        setIsPlaying(false);
        console.log("✅ Pause via Expo-AV");
      }

      if (isWidgetAvailable && isPremium) {
        updateWidgetPlaybackState(false, playbackPosition, playbackDuration);
      }
    } catch (error) {
      console.error("Erreur pause audio:", error);
    }
  }, [
    sound,
    isServiceAvailable,
    isPremium,
    pauseAudioInService,
    isWidgetAvailable,
    updateWidgetPlaybackState,
    playbackPosition,
    playbackDuration,
  ]);

  const resumeRecitation = useCallback(async () => {
    try {
      if (isServiceAvailable() && isPremium) {
        await playAudioInService();
        setIsPlaying(true);
        console.log("✅ Reprise via service natif");
      } else if (sound) {
        await audioManager.resume();
        setIsPlaying(true);
        console.log("✅ Reprise via Expo-AV");
      }

      if (isWidgetAvailable && isPremium) {
        updateWidgetPlaybackState(true, playbackPosition, playbackDuration);
      }
    } catch (error) {
      console.error("Erreur reprise audio:", error);
    }
  }, [
    sound,
    isServiceAvailable,
    isPremium,
    playAudioInService,
    isWidgetAvailable,
    updateWidgetPlaybackState,
    playbackPosition,
    playbackDuration,
  ]);

  const seekToPosition = useCallback(
    async (positionMillis: number) => {
      try {
        pendingSeekTargetRef.current = positionMillis;
        pendingSeekUntilRef.current = Date.now() + 2000;
        setPlaybackPosition(positionMillis);

        logQuranSeek("JS_SEEK_REQUEST", {
          positionMillis,
          playbackDuration,
          playbackPosition,
          surah: selectedSourate,
          reciter: selectedReciter,
          recitationId: currentRecitation?.id,
          url: currentRecitation?.fileUrl
            ? toPremiumStreamPlaybackUrl(currentRecitation.fileUrl).slice(0, 100)
            : "",
          native: isServiceAvailable() && isPremium,
        });

        if (isServiceAvailable() && isPremium) {
          await seekToPositionInService(positionMillis);
          logQuranSeek("JS_SEEK_NATIVE_OK", { positionMillis });
        } else if (sound) {
          await sound.setPositionAsync(positionMillis);
          logQuranSeek("JS_SEEK_EXPO_OK", { positionMillis });
        }
      } catch (error) {
        logQuranSeek("JS_SEEK_ERROR", {
          message: error instanceof Error ? error.message : String(error),
        });
        console.error("Erreur navigation audio:", error);
      }
    },
    [
      sound,
      isServiceAvailable,
      isPremium,
      seekToPositionInService,
      playbackDuration,
      playbackPosition,
      selectedSourate,
      selectedReciter,
      currentRecitation?.id,
      currentRecitation?.fileUrl,
    ],
  );

  const stopRecitation = useCallback(async () => {
    try {
      console.log("🎵 Arrêt de la récitation demandé");

      if (isServiceAvailable() && isPremium) {
        await stopAudioInService();
        console.log("✅ Arrêt via service natif");
      } else if (sound) {
        await audioManager.stop();
        await audioManager.unload();
        setSound(null);
        console.log("✅ Arrêt via Expo-AV");
      }

      setIsPlaying(false);
      setCurrentlyPlaying(null);
      setPlaybackPosition(0);
      setManualPlaybackDuration(0);

      if (isWidgetAvailable && isPremium) {
        updateWidgetPlaybackState(false, 0, 0);
      }

      console.log("🎵 Récitation arrêtée avec succès");
    } catch (error) {
      console.error("âŒ Erreur arrÃªt audio:", error);
    }
  }, [
    sound,
    isServiceAvailable,
    isPremium,
    stopAudioInService,
    isWidgetAvailable,
    updateWidgetPlaybackState,
  ]);

  const selectSourateFromPicker = useCallback(
    async (surahNumber: number) => {
      if (surahNumber < 1 || surahNumber > 114) return;
      setIsAppNavigation(true);

      const audioActive =
        isPremium &&
        !!selectedReciter &&
        (isPlaying ||
          !!currentlyPlaying ||
          (isServiceAvailable() && serviceAudioState.isPlaying));

      surahAutoPlayOnChangeRef.current = audioActive;
      setSelectedSourate(surahNumber);

      if (!isPremium || !selectedReciter) return;
      if (!audioActive) return;

      if (offlineAccess.isOfflineMode) {
        const offlineRec = scannedQuranFiles.find(
          (r) =>
            r.surahNumber === surahNumber &&
            r.reciter?.toLowerCase() === selectedReciter.toLowerCase(),
        );
        if (offlineRec) {
          await playRecitation(offlineRec);
        }
        return;
      }

      await loadSpecificRecitation(selectedReciter, surahNumber, true);
    },
    [
      isPremium,
      selectedReciter,
      isPlaying,
      currentlyPlaying,
      isServiceAvailable,
      serviceAudioState.isPlaying,
      offlineAccess.isOfflineMode,
      scannedQuranFiles,
      playRecitation,
      loadSpecificRecitation,
      setSelectedSourate,
      surahAutoPlayOnChangeRef,
    ],
  );

  const handleSwipeNavigation = useCallback(
    (direction: "next" | "previous", autoPlay: boolean = false) => {
      const currentSurah = selectedSourate;
      let targetSurah: number;

      if (direction === "next") {
        targetSurah = currentSurah >= 114 ? 1 : currentSurah + 1;
        console.log(
          `👆 Navigation SUIVANT: ${currentSurah} → ${targetSurah} (autoPlay: ${autoPlay})`,
        );
      } else {
        targetSurah = currentSurah <= 1 ? 114 : currentSurah - 1;
        console.log(
          `👆 Navigation PRÉCÉDENT: ${currentSurah} → ${targetSurah} (autoPlay: ${autoPlay})`,
        );
      }

      console.log(`🎬 Début animation slide ${direction}`);
      setIsAppNavigation(true);
      console.log("🎯 Mode navigation app activé - Sync automatique désactivée");

      surahAutoPlayOnChangeRef.current = true;
      setSelectedSourate(targetSurah);

      if (autoPlay && selectedReciter) {
        if (offlineAccess.isOfflineMode) {
          const offlineRec = scannedQuranFiles.find(
            (r) =>
              r.surahNumber === targetSurah &&
              r.reciter?.toLowerCase() === selectedReciter.toLowerCase(),
          );
          if (offlineRec) {
            void playRecitation(offlineRec);
          }
        } else {
          void loadSpecificRecitation(selectedReciter, targetSurah, true);
        }
      }

      const exitValue = direction === "next" ? -windowWidth : windowWidth;
      slideAnim.value = withSequence(
        withTiming(exitValue, { duration: 150 }),
        withTiming(0, { duration: 150 }),
      );
    },
    [
      selectedSourate,
      selectedReciter,
      slideAnim,
      windowWidth,
      offlineAccess.isOfflineMode,
      scannedQuranFiles,
      playRecitation,
      loadSpecificRecitation,
      setSelectedSourate,
      surahAutoPlayOnChangeRef,
    ],
  );

  const playNextInPlaylist = useCallback(() => {
    console.log(
      `🎵 playNextInPlaylist - currentIndex: ${currentPlaylistIndexRef.current}, total: ${playlistItemsRef.current.length}, mode: ${playlistModeRef.current}`,
    );

    if (!playlistModeRef.current) {
      handleSwipeNavigation("next", true);
      return;
    }

    if (
      currentPlaylistIndexRef.current >=
      playlistItemsRef.current.length - 1
    ) {
      console.log("🎵 Fin de playlist atteinte");
      setPlaylistMode(false);
      setCurrentPlaylistIndex(0);
      setPlaylistItems([]);
      playlistModeRef.current = false;
      currentPlaylistIndexRef.current = 0;
      playlistItemsRef.current = [];
      void stopRecitation();
      return;
    }

    const nextIndex = currentPlaylistIndexRef.current + 1;
    const nextRecitation = playlistItemsRef.current[nextIndex];

    if (nextRecitation) {
      console.log(
        `🎵 Passage à la récitation suivante: ${nextRecitation.title} (index: ${nextIndex})`,
      );
      setCurrentPlaylistIndex(nextIndex);
      currentPlaylistIndexRef.current = nextIndex;
      void playRecitation(nextRecitation);
    }
  }, [playRecitation, stopRecitation, handleSwipeNavigation]);

  useEffect(() => {
    playNextInPlaylistRef.current = playNextInPlaylist;
  }, [playNextInPlaylist]);

  const playPreviousInPlaylist = useCallback(() => {
    console.log(
      `🎵 playPreviousInPlaylist - currentIndex: ${currentPlaylistIndexRef.current}, mode: ${playlistModeRef.current}`,
    );

    if (!playlistModeRef.current) {
      handleSwipeNavigation("previous", true);
      return;
    }

    if (currentPlaylistIndexRef.current <= 0) {
      console.log("🎵 Début de playlist atteint ou mode playlist inactif");
      void seekToPosition(0);
      return;
    }

    const prevIndex = currentPlaylistIndexRef.current - 1;
    const prevRecitation = playlistItemsRef.current[prevIndex];

    if (prevRecitation) {
      console.log(
        `🎵 Passage à la récitation précédente: ${prevRecitation.title} (index: ${prevIndex})`,
      );
      setCurrentPlaylistIndex(prevIndex);
      currentPlaylistIndexRef.current = prevIndex;
      void playRecitation(prevRecitation);
    }
  }, [playRecitation, seekToPosition, handleSwipeNavigation]);

  useEffect(() => {
    playPreviousInPlaylistRef.current = playPreviousInPlaylist;
  }, [playPreviousInPlaylist]);

  const stopPlaylistMode = useCallback(() => {
    console.log("🎵 Arrêt de la playlist demandé");
    void stopRecitation();
    setPlaylistMode(false);
    setCurrentPlaylistIndex(0);
    setPlaylistItems([]);
    playlistModeRef.current = false;
    currentPlaylistIndexRef.current = 0;
    playlistItemsRef.current = [];
    console.log("🎵 Playlist arrêtée avec succès");
  }, [stopRecitation]);

  const startPlaylistMode = useCallback(
    (reciterRecitations: PremiumContent[]) => {
      console.log(
        `🎵 Démarrage playlist avec ${reciterRecitations.length} récitations`,
      );

      const sortedRecitations = [...reciterRecitations].sort(
        (a, b) => (a.surahNumber || 0) - (b.surahNumber || 0),
      );

      console.log(
        `🎵 Récitations triées: ${sortedRecitations
          .map((r) => r.title)
          .join(", ")}`,
      );

      setPlaylistItems(sortedRecitations);
      setCurrentPlaylistIndex(0);
      setPlaylistMode(true);
      playlistItemsRef.current = sortedRecitations;
      currentPlaylistIndexRef.current = 0;
      playlistModeRef.current = true;

      if (sortedRecitations.length > 0) {
        console.log(
          `🎵 Démarrage de la première récitation: ${sortedRecitations[0].title}`,
        );
        void playRecitation(sortedRecitations[0]);
      }
    },
    [playRecitation],
  );

  // react-doctor-disable-next-line react-doctor/effect-needs-cleanup, react-doctor/exhaustive-deps
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      "QuranSurahCompletedForPlaylist",
      (event: any) => {
        console.log("ðŸ Ã‰vÃ©nement fin de sourate reÃ§u dans QuranScreen:", event);

        DeviceEventEmitter.emit("AddPlaybackDebugLog", {
          message: `[JS Event] SurahCompleted (reason: ${event.reason || "end"})`,
          type: "info",
        });

        const isRemoteCommand =
          event.reason === "next" || event.reason === "previous";

        if (playlistModeRef.current || isRemoteCommand) {
          if (event.reason === "previous") {
            console.log(
              "🎵 Navigation vers la sourate précédente demandée (via Ref)",
            );
            playPreviousInPlaylistRef.current();
          } else {
            console.log("🎵 Passage à la sourate suivante (via Ref)");
            playNextInPlaylistRef.current();
          }
        } else if (event.autoAdvanceEnabled !== false) {
          const completedNum = parseSurahNumberFromServiceTitle(
            event.surah,
            souratesRef.current,
          );
          if (
            completedNum != null &&
            completedNum < 114 &&
            selectedReciterRef.current
          ) {
            const nextSurah = completedNum + 1;
            if (surahAutoPlayFallbackTimerRef.current) {
              clearTimeout(surahAutoPlayFallbackTimerRef.current);
            }
            surahAutoPlayFallbackTimerRef.current = setTimeout(() => {
              surahAutoPlayFallbackTimerRef.current = null;
              if (serviceAudioStateRef.current.isPlaying) {
                return;
              }
              console.log(`🎵 Filet auto-play: lancement sourate ${nextSurah}`);
              void loadSpecificRecitationRef.current(
                selectedReciterRef.current!,
                nextSurah,
                true,
              );
            }, 2500);
          }
        } else {
          console.log("🎵 Auto-avancement désactivé");
        }
      },
    );

    return () => {
      if (surahAutoPlayFallbackTimerRef.current) {
        clearTimeout(surahAutoPlayFallbackTimerRef.current);
      }
      subscription.remove();
    };
  }, []);

  const handleSwipeNavigate = useCallback(
    (direction: "previous" | "next") => {
      handleSwipeNavigation(direction, false);
    },
    [handleSwipeNavigation],
  );

  const selectGif = useCallback(async (gifId: AudioGifType) => {
    try {
      setSelectedGif(gifId);
      await AsyncStorage.setItem("@selected_audio_gif", gifId);
    } catch (err) {
      console.error("Erreur sauvegarde GIF:", err);
    }
  }, []);

  return {
    currentlyPlaying,
    sound,
    isPlaying: displayIsPlaying,
    playbackPosition: displayPlaybackPosition,
    playbackDuration,
    currentRecitation,
    setCurrentRecitation,
    isLoading,
    manualPlaybackDuration,
    isRecitationPlaying,
    usesNativeAudioService,
    serviceAudioState,
    getCurrentWidgetSurah,
    syncWithWidgetSurah,

    audioControlsModalVisible,
    setAudioControlsModalVisible,
    selectedGif,
    gifModalVisible,
    setGifModalVisible,
    selectGif,
    showNavigationTooltip,
    setShowNavigationTooltip,
    slideAnim,
    slideAnimatedStyle,
    resetSlideAnimation,

    playlistMode,
    currentPlaylistIndex,
    playlistItems,
    startPlaylistMode,
    stopPlaylistMode,

    playRecitation,
    pauseRecitation,
    resumeRecitation,
    stopRecitation,
    seekToPosition,
    loadSpecificRecitation,
    selectSourateFromPicker,
    handleSwipeNavigation,
    handleSwipeNavigate,
    playNextInPlaylist,
    playPreviousInPlaylist,
    runWidgetDiagnostic,
  };
}
