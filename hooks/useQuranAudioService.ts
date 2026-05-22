import { useState, useEffect, useCallback } from "react";
import {
  NativeModules,
  Platform,
  DeviceEventEmitter,
  NativeEventEmitter,
} from "react-native";
import { addPlaybackDebugLog } from "../utils/playbackDebugLogs";
import { logQuranSeek } from "../utils/quranSeekDebug";
import { mergeDurationMillis } from "../utils/audioDurationUtils";

// Vérifier si nous sommes en mode test
const isTestEnvironment = () => {
  const result = process.env.NODE_ENV === "test";
  return result;
};

interface QuranAudioState {
  isPlaying: boolean;
  currentSurah: string;
  currentReciter: string;
  position: number;
  duration: number;
  totalDuration?: number; // 🍎 Ajouté pour compatibilité iOS
  isPremium: boolean;
  isServiceRunning: boolean;
}

interface QuranAudioServiceInterface {
  // État actuel
  audioState: QuranAudioState;

  // Actions de contrôle
  startService: () => Promise<void>;
  stopService: () => Promise<void>;
  loadAudio: (
    audioPath: string,
    surah: string,
    reciter: string,
    durationMs?: number
  ) => Promise<void>;
  playAudio: () => Promise<void>;
  pauseAudio: () => Promise<void>;
  stopAudio: () => Promise<void>;
  seekToPosition: (position: number) => Promise<void>;

  // Navigation entre sourates
  navigateToNextSurah: () => Promise<void>;
  navigateToPreviousSurah: () => Promise<void>;

  // Synchronisation avec le widget
  getCurrentWidgetSurah: () => Promise<{
    surahNumber: number;
    surahName: string;
    reciter: string;
    timestamp: number;
    hasData: boolean;
  }>;
  syncWithWidgetSurah: () => Promise<boolean>;

  // Gestion du statut premium
  updatePremiumStatus: (isPremium: boolean) => Promise<void>;

  // Utilitaires
  isServiceAvailable: () => boolean;
  getCurrentState: () => QuranAudioState;
}

// Mock pour les tests et fallback
const createMockService = () => ({
  startAudioService: () => Promise.resolve(true),
  stopAudioService: () => Promise.resolve(true),
  loadAudioInService: () => Promise.resolve(true),
  playAudio: () => Promise.resolve(true),
  pauseAudio: () => Promise.resolve(true),
  stopAudio: () => Promise.resolve(true),
  seekToPosition: () => Promise.resolve(true),
  navigateToNextSurah: () => Promise.resolve(true),
  navigateToPreviousSurah: () => Promise.resolve(true),
  getCurrentWidgetSurah: () =>
    Promise.resolve({
      surahNumber: 1,
      surahName: "Al-Fatiha",
      reciter: "AbdelBasset Abdelsamad",
      timestamp: Date.now(),
      hasData: true,
    }),
  syncWithWidgetSurah: () => Promise.resolve(true),
  updatePremiumStatus: () => Promise.resolve(true),
  getCurrentState: () =>
    Promise.resolve({
      isPlaying: false,
      currentSurah: "",
      currentReciter: "",
      position: 0,
      duration: 0,
      totalDuration: 0,
      isPremium: false,
      isServiceRunning: false,
    }),
});

// Récupérer le module natif ou utiliser le mock
const QuranAudioServiceModule = (() => {
  // En mode test, utiliser le mock
  if (isTestEnvironment()) {
    return createMockService();
  }

  // En production, utiliser le module natif si disponible (iOS ET Android)
  if (NativeModules.QuranAudioServiceModule) {
    return NativeModules.QuranAudioServiceModule;
  }

  // Fallback vers le mock
  return createMockService();
})();

export const useQuranAudioService = (): QuranAudioServiceInterface => {
  const [audioState, setAudioState] = useState<QuranAudioState>({
    isPlaying: false,
    currentSurah: "",
    currentReciter: "",
    position: 0,
    duration: 0,
    isPremium: false,
    isServiceRunning: false,
  });

  // Initialiser l'écouteur d'événements
  // react-doctor-disable-next-line react-doctor/effect-needs-cleanup
  useEffect(() => {
    const subscriptions: Array<{ remove: () => void }> = [];

    if (!isTestEnvironment() && QuranAudioServiceModule) {
    try {
      console.log("🎵 Initialisation des écouteurs d'événements audio...");

      // 🍎 Configuration NativeEventEmitter pour iOS (INDISPENSABLE pour RCTEventEmitter)
      const emitter =
        Platform.OS === "ios"
          ? new NativeEventEmitter(NativeModules.QuranAudioServiceModule)
          : DeviceEventEmitter;

      // 🚀 NOUVEAU : Écouter les logs natifs Swift
      subscriptions.push(
        emitter.addListener(
        "NativeDebugLog",
        (event: any) => {
          // Sauvegarde persistante
          addPlaybackDebugLog("iOS Swift", { message: event.message });
          // Émission temps réel vers debug page
          DeviceEventEmitter.emit("AddPlaybackDebugLog", {
            message: `[iOS Swift] ${event.message}`,
            type: event.message.includes("❌") ? "error" : "info",
          });
        },
        ),
      );

      // Écouter les changements d'état audio
      const audioStateEventName =
        Platform.OS === "ios" ? "AudioStateChanged" : "QuranAudioStateChanged";

      subscriptions.push(
        emitter.addListener(
        audioStateEventName,
        (event: any) => {
          // 🎯 NOUVEAU : Log systématique pour debug
          if (Platform.OS === "ios") {
            DeviceEventEmitter.emit("AddPlaybackDebugLog", {
              message: `[Native Event] StateChanged: ${
                event.isPlaying ? "PLAY" : "PAUSE"
              }`,
              details: {
                pos: event.position || event.currentPosition,
                dur: event.duration || event.totalDuration,
                rate: event.playerRate,
              },
            });
          }

          // 🎯 NOUVEAU : Harmonisation intelligente iOS (secondes) vs Android (ms)
          let rawPos =
            event.position ??
            event.currentPosition ??
            event.positionMillis ??
            0;
          let rawDur =
            event.duration ?? event.totalDuration ?? event.durationMillis ?? 0;

          const position =
            Platform.OS === "ios" && rawPos > 0 && rawPos < 40000
              ? rawPos * 1000
              : rawPos;
          const positionMs = Math.round(position);

          setAudioState((prevState) => {
            const nextSurah =
              event.surah ?? event.currentTitle ?? prevState.currentSurah;
            const rawDurationMs =
              Platform.OS === "ios" && rawDur > 0 && rawDur < 40000
                ? rawDur * 1000
                : rawDur;
            const durationMs = mergeDurationMillis(
              prevState.duration,
              positionMs,
              rawDurationMs,
            );
            return {
            ...prevState,
            isPlaying: event.isPlaying ?? prevState.isPlaying,
            currentSurah: nextSurah,
            currentReciter:
              event.reciter ?? event.currentReciter ?? prevState.currentReciter,
            position: positionMs,
            duration: durationMs,
            totalDuration: durationMs,
            isPremium: event.isPremium ?? prevState.isPremium,
            isServiceRunning:
              event.isServiceRunning ?? prevState.isServiceRunning,
          };
          });
        },
        ),
      );

      // 🤖 NOUVEAU : Écouter la progression audio (Spécifique Android)
      // Sur Android, le timer de progression envoie des événements séparés
      if (Platform.OS === "android") {
        subscriptions.push(
          emitter.addListener("QuranAudioProgress", (event: any) => {
            setAudioState((prevState) => {
              const positionMs = Math.round(
                event.position ?? prevState.position,
              );
              const durationMs = mergeDurationMillis(
                prevState.duration,
                positionMs,
                event.duration ?? event.totalDuration ?? 0,
              );
              return {
                ...prevState,
                position: positionMs,
                duration: durationMs,
                totalDuration: durationMs,
              };
            });
          }),
        );
      }

      // Écouter les erreurs
      const audioErrorEventName =
        Platform.OS === "ios" ? "AudioError" : "QuranAudioError";
      subscriptions.push(
        emitter.addListener(
        audioErrorEventName,
        (event: any) => {
          DeviceEventEmitter.emit("AddPlaybackDebugLog", {
            message: `[Native Error] ${event.error}`,
            type: "error",
          });
        },
        ),
      );

      // NOUVEAU : Écouter la fin de sourate
      const surahCompletedEventName =
        Platform.OS === "ios" ? "AudioCompleted" : "QuranSurahCompleted";
      subscriptions.push(
        emitter.addListener(
        surahCompletedEventName,
        (event: any) => {
          if (Platform.OS === "ios") {
            DeviceEventEmitter.emit("AddPlaybackDebugLog", {
              message: `[Native Event] Completed (reason: ${
                event.reason || "end"
              })`,
              type: "info",
            });
          }

          DeviceEventEmitter.emit("QuranSurahCompletedForPlaylist", {
            surah: event.surah,
            reciter: event.reciter,
            autoAdvanceEnabled: event.autoAdvanceEnabled,
            reason: event.reason, // iOS: "next", "previous", ou undefined
          });
        },
        ),
      );

      // 🛠️ NOUVEAU : Écouter les navigations depuis le widget
      subscriptions.push(
        emitter.addListener(
        "WidgetNavigateNext",
        (event: any) => {
          DeviceEventEmitter.emit("WidgetNavigationNext", {
            surahNumber: event.surahNumber,
            surahName: event.surahName,
            reciter: event.reciter,
          });
        },
        ),
      );

      subscriptions.push(
        emitter.addListener(
        "WidgetNavigatePrevious",
        (event: any) => {
          DeviceEventEmitter.emit("WidgetNavigationPrevious", {
            surahNumber: event.surahNumber,
            surahName: event.surahName,
            reciter: event.reciter,
          });
        },
        ),
      );
    } catch (error) {
      console.error("❌ Erreur initialisation écouteurs audio:", error);
    }
    }

    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, []);

  // Démarrer le service audio
  const startService = useCallback(async (): Promise<void> => {
    try {
      await QuranAudioServiceModule.startAudioService();
      setAudioState((prevState) => ({
        ...prevState,
        isServiceRunning: true,
      }));
    } catch (error) {
      console.error("❌ Erreur démarrage service audio:", error);
      throw error;
    }
  }, []);

  // Arrêter le service audio
  const stopService = useCallback(async (): Promise<void> => {
    try {
      await QuranAudioServiceModule.stopAudioService();
      setAudioState((prevState) => ({
        ...prevState,
        isServiceRunning: false,
        isPlaying: false,
      }));
    } catch (error) {
      console.error("❌ Erreur arrêt service audio:", error);
      throw error;
    }
  }, []);

  // Charger un audio dans le service
  const loadAudio = useCallback(
    async (
      audioPath: string,
      surah: string,
      reciter: string,
      durationMs: number = 0
    ): Promise<void> => {
      try {
        // Démarrer le service s'il n'est pas déjà démarré
        if (!audioState.isServiceRunning) {
          await startService();
        }

        await QuranAudioServiceModule.loadAudioInService(
          audioPath,
          surah,
          reciter,
          Math.round(durationMs) || 0
        );

        setAudioState((prevState) => ({
          ...prevState,
          currentSurah: surah,
          currentReciter: reciter,
        }));
      } catch (error) {
        console.error("❌ Erreur chargement audio:", error);
        throw error;
      }
    },
    [
      audioState.isServiceRunning,
      audioState.position,
      audioState.duration,
      audioState.currentSurah,
      startService,
    ]
  );

  // Lancer la lecture
  const playAudio = useCallback(async (): Promise<void> => {
    try {
      await QuranAudioServiceModule.playAudio();
      setAudioState((prevState) => ({
        ...prevState,
        isPlaying: true,
      }));
    } catch (error) {
      console.error("❌ Erreur lancement lecture:", error);
      throw error;
    }
  }, []);

  // Mettre en pause
  const pauseAudio = useCallback(async (): Promise<void> => {
    try {
      await QuranAudioServiceModule.pauseAudio();
      setAudioState((prevState) => ({
        ...prevState,
        isPlaying: false,
      }));
    } catch (error) {
      console.error("❌ Erreur pause audio:", error);
      throw error;
    }
  }, []);

  // Arrêter la lecture
  const stopAudio = useCallback(async (): Promise<void> => {
    try {
      await QuranAudioServiceModule.stopAudio();
      setAudioState((prevState) => ({
        ...prevState,
        isPlaying: false,
        position: 0,
      }));
    } catch (error) {
      console.error("❌ Erreur arrêt audio:", error);
      throw error;
    }
  }, []);

  // Naviguer vers une position
  const seekToPosition = useCallback(
    async (position: number): Promise<void> => {
      try {
        logQuranSeek("HOOK_SEEK_CALL", {
          position,
          prevPos: audioState.position,
          duration: audioState.duration,
          surah: audioState.currentSurah,
        });
        await QuranAudioServiceModule.seekToPosition(position);
        setAudioState((prevState) => ({
          ...prevState,
          position,
        }));
        logQuranSeek("HOOK_SEEK_DONE", { position });
      } catch (error) {
        logQuranSeek("HOOK_SEEK_FAIL", {
          message: error instanceof Error ? error.message : String(error),
        });
        console.error("❌ Erreur navigation audio:", error);
        throw error;
      }
    },
    [audioState.position, audioState.duration, audioState.currentSurah]
  );

  // Naviguer vers la sourate suivante
  const navigateToNextSurah = useCallback(async (): Promise<void> => {
    try {
      await QuranAudioServiceModule.navigateToNextSurah();
    } catch (error) {
      console.error("❌ Erreur navigation vers sourate suivante:", error);
      throw error;
    }
  }, []);

  // Naviguer vers la sourate précédente
  const navigateToPreviousSurah = useCallback(async (): Promise<void> => {
    try {
      await QuranAudioServiceModule.navigateToPreviousSurah();
    } catch (error) {
      console.error("❌ Erreur navigation vers sourate précédente:", error);
      throw error;
    }
  }, []);

  // Lire la sourate actuelle depuis le widget
  const getCurrentWidgetSurah = useCallback(async () => {
    try {
      const result = await QuranAudioServiceModule.getCurrentWidgetSurah();
      return result;
    } catch (error) {
      console.error("❌ Erreur lecture sourate widget:", error);
      throw error;
    }
  }, []);

  // Synchroniser avec la sourate du widget
  const syncWithWidgetSurah = useCallback(async (): Promise<boolean> => {
    try {
      const result = await QuranAudioServiceModule.syncWithWidgetSurah();
      return result;
    } catch (error) {
      console.error("❌ Erreur synchronisation widget:", error);
      throw error;
    }
  }, []);

  // Mettre à jour le statut premium
  const updatePremiumStatus = useCallback(
    async (isPremium: boolean): Promise<void> => {
      try {
        await QuranAudioServiceModule.updatePremiumStatus(isPremium);
        setAudioState((prevState) => ({
          ...prevState,
          isPremium,
        }));
      } catch (error) {
        console.error("❌ Erreur mise à jour statut premium:", error);
        throw error;
      }
    },
    []
  );

  // Vérifier si le service est disponible (iOS ET Android)
  const isServiceAvailable = useCallback((): boolean => {
    return !!NativeModules.QuranAudioServiceModule;
  }, []);

  // Obtenir l'état actuel
  const getCurrentState = useCallback((): QuranAudioState => {
    return audioState;
  }, [audioState]);

  return {
    audioState,
    startService,
    stopService,
    loadAudio,
    playAudio,
    pauseAudio,
    stopAudio,
    seekToPosition,
    navigateToNextSurah,
    navigateToPreviousSurah,
    getCurrentWidgetSurah,
    syncWithWidgetSurah,
    updatePremiumStatus,
    isServiceAvailable,
    getCurrentState,
  };
};
