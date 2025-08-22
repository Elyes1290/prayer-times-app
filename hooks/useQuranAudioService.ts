import { useState, useEffect, useCallback, useRef } from "react";
import { NativeModules, Platform, DeviceEventEmitter } from "react-native";

// Vérifier si nous sommes en mode test
const isTestEnvironment = () => {
  console.log("🎵 isTestEnvironment - NODE_ENV:", process.env.NODE_ENV);
  const result = process.env.NODE_ENV === "test";
  console.log("🎵 isTestEnvironment - Résultat:", result);
  return result;
};

interface QuranAudioState {
  isPlaying: boolean;
  currentSurah: string;
  currentReciter: string;
  position: number;
  duration: number;
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
    reciter: string
  ) => Promise<void>;
  playAudio: () => Promise<void>;
  pauseAudio: () => Promise<void>;
  stopAudio: () => Promise<void>;
  seekToPosition: (position: number) => Promise<void>;

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
  updatePremiumStatus: () => Promise.resolve(true),
  getCurrentState: () =>
    Promise.resolve({
      isPlaying: false,
      currentSurah: "",
      currentReciter: "",
      position: 0,
      duration: 0,
      isPremium: false,
      isServiceRunning: false,
    }),
});

// Récupérer le module natif ou utiliser le mock
const QuranAudioServiceModule = (() => {
  console.log("🎵 Initialisation QuranAudioServiceModule...");
  console.log(
    "🎵 NativeModules.QuranAudioServiceModule:",
    !!NativeModules.QuranAudioServiceModule
  );

  // En mode test, utiliser le mock
  if (isTestEnvironment()) {
    console.log("🎵 Utilisation du mock (mode test)");
    return createMockService();
  }

  // En production, utiliser le module natif si disponible
  if (Platform.OS === "android" && NativeModules.QuranAudioServiceModule) {
    console.log("🎵 Utilisation du module natif");
    return NativeModules.QuranAudioServiceModule;
  }

  // Fallback vers le mock
  console.log("🎵 Utilisation du mock (fallback)");
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
  useEffect(() => {
    console.log(
      "🎵 Hook useQuranAudioService - Initialisation des écouteurs..."
    );
    console.log("🎵 isTestEnvironment():", isTestEnvironment());
    console.log(
      "🎵 QuranAudioServiceModule disponible:",
      !!QuranAudioServiceModule
    );
    console.log(
      "🎵 QuranAudioServiceModule type:",
      typeof QuranAudioServiceModule
    );
    console.log("🎵 Platform.OS:", Platform.OS);
    console.log("🎵 Platform.OS === 'android':", Platform.OS === "android");

    // Ne pas initialiser en mode test ou si le module n'est pas disponible
    if (
      isTestEnvironment() ||
      !QuranAudioServiceModule ||
      Platform.OS !== "android"
    ) {
      console.log("🎵 Hook useQuranAudioService - Initialisation annulée");
      console.log("🎵 Raison - isTestEnvironment:", isTestEnvironment());
      console.log(
        "🎵 Raison - !QuranAudioServiceModule:",
        !QuranAudioServiceModule
      );
      console.log(
        "🎵 Raison - Platform.OS !== 'android':",
        Platform.OS !== "android"
      );
      return;
    }

    try {
      console.log("🎵 Initialisation des écouteurs d'événements audio...");

      // Écouter les changements d'état audio
      const audioStateSubscription = DeviceEventEmitter.addListener(
        "QuranAudioStateChanged",
        (event) => {
          console.log("🎵 Événement audio reçu:", event);
          console.log(
            "🎵 Détails événement - isPlaying:",
            event.isPlaying,
            "position:",
            event.position,
            "duration:",
            event.duration
          );
          setAudioState((prevState) => {
            const newState = {
              ...prevState,
              isPlaying: event.isPlaying || false,
              currentSurah: event.surah || "",
              currentReciter: event.reciter || "",
              position: event.position || 0,
              duration: event.duration || 0,
              isPremium: event.isPremium || false,
            };
            console.log("🎵 Nouvel état audio:", newState);
            return newState;
          });
        }
      );

      // Écouter les mises à jour de progression
      const audioProgressSubscription = DeviceEventEmitter.addListener(
        "QuranAudioProgress",
        (event) => {
          console.log("🎵 Progression audio reçue:", event);
          console.log(
            "🎵 Détails progression - position:",
            event.position,
            "duration:",
            event.duration
          );
          setAudioState((prevState) => {
            const newState = {
              ...prevState,
              position: event.position || 0,
              duration: event.duration || 0,
            };
            console.log("🎵 Nouvel état progression:", newState);
            return newState;
          });
        }
      );

      // Écouter les changements de statut du service
      const serviceStatusSubscription = DeviceEventEmitter.addListener(
        "QuranServiceStatusChanged",
        (event) => {
          console.log("🎵 Statut service reçu:", event);
          setAudioState((prevState) => ({
            ...prevState,
            isServiceRunning: event.isRunning || false,
          }));
        }
      );

      console.log("🎵 Écouteurs d'événements audio initialisés");

      // Nettoyer les écouteurs lors du démontage
      return () => {
        audioStateSubscription?.remove();
        audioProgressSubscription?.remove();
        serviceStatusSubscription?.remove();
        console.log("🎵 Écouteurs d'événements audio nettoyés");
      };
    } catch (error) {
      console.error("❌ Erreur initialisation écouteurs audio:", error);
    }
  }, []);

  // Démarrer le service audio
  const startService = useCallback(async (): Promise<void> => {
    try {
      console.log("🎵 Démarrage du service audio...");
      await QuranAudioServiceModule.startAudioService();
      setAudioState((prevState) => ({
        ...prevState,
        isServiceRunning: true,
      }));
      console.log("✅ Service audio démarré");
    } catch (error) {
      console.error("❌ Erreur démarrage service audio:", error);
      throw error;
    }
  }, []);

  // Arrêter le service audio
  const stopService = useCallback(async (): Promise<void> => {
    try {
      console.log("🎵 Arrêt du service audio...");
      await QuranAudioServiceModule.stopAudioService();
      setAudioState((prevState) => ({
        ...prevState,
        isServiceRunning: false,
        isPlaying: false,
      }));
      console.log("✅ Service audio arrêté");
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
      reciter: string
    ): Promise<void> => {
      try {
        console.log("🎵 Chargement audio dans le service:", {
          surah,
          reciter,
          audioPath,
        });

        // Démarrer le service s'il n'est pas déjà démarré
        if (!audioState.isServiceRunning) {
          await startService();
        }

        await QuranAudioServiceModule.loadAudioInService(
          audioPath,
          surah,
          reciter
        );

        setAudioState((prevState) => ({
          ...prevState,
          currentSurah: surah,
          currentReciter: reciter,
        }));

        console.log("✅ Audio chargé dans le service");
      } catch (error) {
        console.error("❌ Erreur chargement audio:", error);
        throw error;
      }
    },
    [audioState.isServiceRunning, startService]
  );

  // Lancer la lecture
  const playAudio = useCallback(async (): Promise<void> => {
    try {
      console.log("🎵 Lancement de la lecture audio...");
      await QuranAudioServiceModule.playAudio();
      setAudioState((prevState) => ({
        ...prevState,
        isPlaying: true,
      }));
      console.log("✅ Lecture audio lancée");
    } catch (error) {
      console.error("❌ Erreur lancement lecture:", error);
      throw error;
    }
  }, []);

  // Mettre en pause
  const pauseAudio = useCallback(async (): Promise<void> => {
    try {
      console.log("🎵 Mise en pause de l'audio...");
      await QuranAudioServiceModule.pauseAudio();
      setAudioState((prevState) => ({
        ...prevState,
        isPlaying: false,
      }));
      console.log("✅ Audio mis en pause");
    } catch (error) {
      console.error("❌ Erreur pause audio:", error);
      throw error;
    }
  }, []);

  // Arrêter la lecture
  const stopAudio = useCallback(async (): Promise<void> => {
    try {
      console.log("🎵 Arrêt de l'audio...");
      await QuranAudioServiceModule.stopAudio();
      setAudioState((prevState) => ({
        ...prevState,
        isPlaying: false,
        position: 0,
      }));
      console.log("✅ Audio arrêté");
    } catch (error) {
      console.error("❌ Erreur arrêt audio:", error);
      throw error;
    }
  }, []);

  // Naviguer vers une position
  const seekToPosition = useCallback(
    async (position: number): Promise<void> => {
      try {
        console.log("🎵 Navigation vers position:", position);
        await QuranAudioServiceModule.seekToPosition(position);
        setAudioState((prevState) => ({
          ...prevState,
          position,
        }));
        console.log("✅ Navigation effectuée");
      } catch (error) {
        console.error("❌ Erreur navigation audio:", error);
        throw error;
      }
    },
    []
  );

  // Mettre à jour le statut premium
  const updatePremiumStatus = useCallback(
    async (isPremium: boolean): Promise<void> => {
      try {
        console.log("👑 Mise à jour statut premium:", isPremium);
        await QuranAudioServiceModule.updatePremiumStatus(isPremium);
        setAudioState((prevState) => ({
          ...prevState,
          isPremium,
        }));
        console.log("✅ Statut premium mis à jour");
      } catch (error) {
        console.error("❌ Erreur mise à jour statut premium:", error);
        throw error;
      }
    },
    []
  );

  // Vérifier si le service est disponible
  const isServiceAvailable = useCallback((): boolean => {
    return Platform.OS === "android" && !!NativeModules.QuranAudioServiceModule;
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
    updatePremiumStatus,
    isServiceAvailable,
    getCurrentState,
  };
};
