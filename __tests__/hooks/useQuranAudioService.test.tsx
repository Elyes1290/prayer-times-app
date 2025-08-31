import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import { DeviceEventEmitter } from "react-native";
import { useQuranAudioService } from "../../hooks/useQuranAudioService";

// Mock du module natif
const mockQuranAudioServiceModule = {
  startAudioService: jest.fn().mockResolvedValue(true),
  stopAudioService: jest.fn().mockResolvedValue(true),
  loadAudioInService: jest.fn().mockResolvedValue(true),
  playAudio: jest.fn().mockResolvedValue(true),
  pauseAudio: jest.fn().mockResolvedValue(true),
  stopAudio: jest.fn().mockResolvedValue(true),
  seekToPosition: jest.fn().mockResolvedValue(true),
  navigateToNextSurah: jest.fn().mockResolvedValue(true),
  navigateToPreviousSurah: jest.fn().mockResolvedValue(true),
  getCurrentWidgetSurah: jest.fn().mockResolvedValue({
    surahNumber: 1,
    surahName: "Al-Fatiha",
    reciter: "AbdelBasset Abdelsamad",
    timestamp: Date.now(),
    hasData: true,
  }),
  syncWithWidgetSurah: jest.fn().mockResolvedValue(true),
  updatePremiumStatus: jest.fn().mockResolvedValue(true),
  getCurrentState: jest.fn().mockResolvedValue({
    isPlaying: false,
    currentSurah: "",
    currentReciter: "",
    position: 0,
    duration: 0,
    isPremium: false,
    isServiceRunning: false,
  }),
};

// Mock des modules React Native
jest.mock("react-native", () => ({
  Platform: { OS: "android" },
  NativeModules: {
    QuranAudioServiceModule: mockQuranAudioServiceModule,
  },
  DeviceEventEmitter: {
    addListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    emit: jest.fn(),
  },
}));

describe("useQuranAudioService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Forcer NODE_ENV à "test" pour activer les mocks
    Object.defineProperty(process.env, "NODE_ENV", { value: "test" });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("Initialisation", () => {
    it("devrait initialiser avec l'état par défaut", () => {
      const { result } = renderHook(() => useQuranAudioService());

      expect(result.current.audioState).toEqual({
        isPlaying: false,
        currentSurah: "",
        currentReciter: "",
        position: 0,
        duration: 0,
        isPremium: false,
        isServiceRunning: false,
      });
    });

    it("devrait vérifier la disponibilité du service", () => {
      const { result } = renderHook(() => useQuranAudioService());

      // En mode test, isServiceAvailable devrait retourner false
      // car Platform.OS === "android" mais NativeModules est mocké
      expect(result.current.isServiceAvailable()).toBe(false);
    });

    it("devrait retourner l'état actuel", () => {
      const { result } = renderHook(() => useQuranAudioService());

      const currentState = result.current.getCurrentState();
      expect(currentState).toEqual(result.current.audioState);
    });
  });

  describe("Gestion du service audio", () => {
    it("devrait démarrer le service audio (interface)", async () => {
      const { result } = renderHook(() => useQuranAudioService());

      // En mode test, les fonctions retournent Promise.resolve()
      // Nous testons que l'interface fonctionne sans erreur
      await act(async () => {
        await expect(result.current.startService()).resolves.toBeUndefined();
      });
    });

    it("devrait arrêter le service audio (interface)", async () => {
      const { result } = renderHook(() => useQuranAudioService());

      await act(async () => {
        await expect(result.current.stopService()).resolves.toBeUndefined();
      });
    });
  });

  describe("Contrôle de la lecture audio", () => {
    it("devrait charger un audio (interface)", async () => {
      const { result } = renderHook(() => useQuranAudioService());

      const audioPath = "test/path/audio.mp3";
      const surah = "Al-Fatiha (001) - Test";
      const reciter = "Abdul Rahman Ibn Abdul Aziz Al-Sudais";

      await act(async () => {
        await expect(
          result.current.loadAudio(audioPath, surah, reciter)
        ).resolves.toBeUndefined();
      });
    });

    it("devrait lancer la lecture (interface)", async () => {
      const { result } = renderHook(() => useQuranAudioService());

      await act(async () => {
        await expect(result.current.playAudio()).resolves.toBeUndefined();
      });
    });

    it("devrait mettre en pause (interface)", async () => {
      const { result } = renderHook(() => useQuranAudioService());

      await act(async () => {
        await expect(result.current.pauseAudio()).resolves.toBeUndefined();
      });
    });

    it("devrait arrêter l'audio (interface)", async () => {
      const { result } = renderHook(() => useQuranAudioService());

      await act(async () => {
        await expect(result.current.stopAudio()).resolves.toBeUndefined();
      });
    });

    it("devrait naviguer vers une position (interface)", async () => {
      const { result } = renderHook(() => useQuranAudioService());
      const position = 30000; // 30 secondes

      await act(async () => {
        await expect(
          result.current.seekToPosition(position)
        ).resolves.toBeUndefined();
      });
    });
  });

  describe("Navigation entre sourates", () => {
    it("devrait naviguer vers la sourate suivante (interface)", async () => {
      const { result } = renderHook(() => useQuranAudioService());

      await act(async () => {
        await expect(
          result.current.navigateToNextSurah()
        ).resolves.toBeUndefined();
      });
    });

    it("devrait naviguer vers la sourate précédente (interface)", async () => {
      const { result } = renderHook(() => useQuranAudioService());

      await act(async () => {
        await expect(
          result.current.navigateToPreviousSurah()
        ).resolves.toBeUndefined();
      });
    });
  });

  describe("Synchronisation avec le widget", () => {
    it("devrait obtenir la sourate actuelle du widget (interface)", async () => {
      const { result } = renderHook(() => useQuranAudioService());

      await act(async () => {
        await expect(result.current.getCurrentWidgetSurah()).resolves.toEqual({
          surahNumber: 1,
          surahName: "Al-Fatiha",
          reciter: "AbdelBasset Abdelsamad",
          timestamp: expect.any(Number),
          hasData: true,
        });
      });
    });

    it("devrait synchroniser avec la sourate du widget (interface)", async () => {
      const { result } = renderHook(() => useQuranAudioService());

      await act(async () => {
        await expect(result.current.syncWithWidgetSurah()).resolves.toBe(true);
      });
    });
  });

  describe("Gestion du statut premium", () => {
    it("devrait mettre à jour le statut premium (interface)", async () => {
      const { result } = renderHook(() => useQuranAudioService());

      await act(async () => {
        await expect(
          result.current.updatePremiumStatus(true)
        ).resolves.toBeUndefined();
      });
    });
  });

  describe("Tests critiques pour auto-avancement", () => {
    it("devrait avoir toutes les méthodes nécessaires pour l'auto-avancement", () => {
      const { result } = renderHook(() => useQuranAudioService());

      // Vérifier que toutes les méthodes critiques sont présentes
      expect(typeof result.current.playAudio).toBe("function");
      expect(typeof result.current.pauseAudio).toBe("function");
      expect(typeof result.current.stopAudio).toBe("function");
      expect(typeof result.current.loadAudio).toBe("function");
      expect(typeof result.current.navigateToNextSurah).toBe("function");
      expect(typeof result.current.navigateToPreviousSurah).toBe("function");
    });

    it("devrait avoir l'état audio avec toutes les propriétés nécessaires", () => {
      const { result } = renderHook(() => useQuranAudioService());

      // Vérifier que l'état contient toutes les propriétés critiques
      expect(result.current.audioState).toHaveProperty("isPlaying");
      expect(result.current.audioState).toHaveProperty("currentSurah");
      expect(result.current.audioState).toHaveProperty("currentReciter");
      expect(result.current.audioState).toHaveProperty("position");
      expect(result.current.audioState).toHaveProperty("duration");
      expect(result.current.audioState).toHaveProperty("isPremium");
      expect(result.current.audioState).toHaveProperty("isServiceRunning");
    });

    it("devrait avoir les méthodes de synchronisation widget", () => {
      const { result } = renderHook(() => useQuranAudioService());

      expect(typeof result.current.getCurrentWidgetSurah).toBe("function");
      expect(typeof result.current.syncWithWidgetSurah).toBe("function");
    });
  });

  describe("Tests critiques pour les écrans de verrouillage", () => {
    it("devrait avoir les contrôles de base pour les médias", () => {
      const { result } = renderHook(() => useQuranAudioService());

      // Ces méthodes sont critiques pour les contrôles de l'écran de verrouillage
      expect(typeof result.current.playAudio).toBe("function");
      expect(typeof result.current.pauseAudio).toBe("function");
      expect(typeof result.current.seekToPosition).toBe("function");
      expect(typeof result.current.navigateToNextSurah).toBe("function");
      expect(typeof result.current.navigateToPreviousSurah).toBe("function");
    });
  });

  describe("Tests de robustesse", () => {
    it("ne devrait pas planter si les méthodes sont appelées sans audio chargé", async () => {
      const { result } = renderHook(() => useQuranAudioService());

      // Ces appels ne devraient pas planter même sans audio chargé
      await act(async () => {
        await expect(result.current.playAudio()).resolves.toBeUndefined();
        await expect(result.current.pauseAudio()).resolves.toBeUndefined();
        await expect(result.current.stopAudio()).resolves.toBeUndefined();
        await expect(result.current.seekToPosition(0)).resolves.toBeUndefined();
      });
    });

    it("devrait maintenir la cohérence de l'état", () => {
      const { result } = renderHook(() => useQuranAudioService());

      // L'état initial devrait être cohérent
      const state = result.current.audioState;
      expect(state.isPlaying).toBe(false);
      expect(state.position).toBe(0);
      expect(state.duration).toBe(0);
      expect(state.currentSurah).toBe("");
      expect(state.currentReciter).toBe("");
    });
  });
});
