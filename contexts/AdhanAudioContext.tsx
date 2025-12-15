import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { Platform, NativeModules, NativeEventEmitter } from "react-native";

interface AdhanAudioState {
  isPlaying: boolean;
  soundName: string | null;
  prayer: string | null;
}

interface AdhanAudioContextType {
  state: AdhanAudioState;
  playAdhan: (soundName: string, prayer: string) => Promise<void>;
  stopAdhan: () => Promise<void>;
  getStatus: () => Promise<AdhanAudioState>;
}

const defaultState: AdhanAudioState = {
  isPlaying: false,
  soundName: null,
  prayer: null,
};

const defaultContext: AdhanAudioContextType = {
  state: defaultState,
  playAdhan: async () => {},
  stopAdhan: async () => {},
  getStatus: async () => defaultState,
};

const AdhanAudioContext = createContext<AdhanAudioContextType>(defaultContext);

interface AdhanAudioProviderProps {
  children: React.ReactNode;
}

export const AdhanAudioProvider: React.FC<AdhanAudioProviderProps> = ({
  children,
}) => {
  const [state, setState] = useState<AdhanAudioState>(defaultState);

  // Initialiser l'event emitter uniquement sur iOS
  const eventEmitter = React.useMemo(() => {
    if (Platform.OS !== "ios") return null;
    const { AdhanAudioPlayer } = NativeModules;
    if (!AdhanAudioPlayer) return null;
    return new NativeEventEmitter(AdhanAudioPlayer);
  }, []);

  // Écouter les événements du module natif
  useEffect(() => {
    if (Platform.OS !== "ios" || !eventEmitter) return;

    console.log("🎵 [AdhanAudioContext] Écoute des événements activée");

    const subscriptions = [
      // Lecture démarrée
      eventEmitter.addListener(
        "AdhanPlaybackStarted",
        (data: { soundName: string; prayer: string }) => {
          console.log("🎵 [AdhanAudioContext] AdhanPlaybackStarted:", data);
          setState({
            isPlaying: true,
            soundName: data.soundName,
            prayer: data.prayer,
          });
        }
      ),

      // Lecture arrêtée
      eventEmitter.addListener(
        "AdhanPlaybackStopped",
        (data: { soundName: string; prayer: string }) => {
          console.log("⏹️ [AdhanAudioContext] AdhanPlaybackStopped:", data);
          setState({
            isPlaying: false,
            soundName: null,
            prayer: null,
          });
        }
      ),

      // Lecture terminée
      eventEmitter.addListener(
        "AdhanPlaybackFinished",
        (data: { soundName: string; prayer: string; success: boolean }) => {
          console.log("✅ [AdhanAudioContext] AdhanPlaybackFinished:", data);
          setState({
            isPlaying: false,
            soundName: null,
            prayer: null,
          });
        }
      ),

      // Erreur
      eventEmitter.addListener(
        "AdhanPlaybackError",
        (data: { soundName: string; prayer: string; error: string }) => {
          console.error("❌ [AdhanAudioContext] AdhanPlaybackError:", data);
          setState({
            isPlaying: false,
            soundName: null,
            prayer: null,
          });
        }
      ),
    ];

    return () => {
      console.log("🔴 [AdhanAudioContext] Nettoyage des listeners");
      subscriptions.forEach((sub) => sub.remove());
    };
  }, [eventEmitter]);

  // Fonction pour jouer l'Adhan
  const playAdhan = useCallback(async (soundName: string, prayer: string) => {
    console.log("🎵 [AdhanAudioContext] playAdhan appelé:", {
      soundName,
      prayer,
      platform: Platform.OS,
    });

    if (Platform.OS !== "ios") {
      console.warn("⚠️ [AdhanAudioContext] playAdhan appelé sur non-iOS");
      return;
    }

    try {
      console.log("🔍 [AdhanAudioContext] Vérification du module natif...");
      const { AdhanAudioPlayer } = NativeModules;
      console.log(
        "🔍 [AdhanAudioContext] NativeModules keys:",
        Object.keys(NativeModules).filter((k) => k.includes("Adhan"))
      );

      if (!AdhanAudioPlayer) {
        console.error(
          "❌ [AdhanAudioContext] AdhanAudioPlayer module not available"
        );
        throw new Error("AdhanAudioPlayer module not available");
      }

      console.log("✅ [AdhanAudioContext] Module natif trouvé");

      // 🎵 NOUVEAU : Charger le MP3 complet depuis assets/soundsComplete-ios/
      // Ces fichiers sont les versions complètes (pas les previews)
      const { Asset } = await import("expo-asset");

      // Mapping des sons complets depuis soundsComplete-ios/
      const soundObjects: Record<string, any> = {
        adhamalsharqawe: require("../assets/soundsComplete-ios/adhamalsharqawe.mp3"),
        adhanaljazaer: require("../assets/soundsComplete-ios/adhanaljazaer.mp3"),
        ahmadnafees: require("../assets/soundsComplete-ios/ahmadnafees.mp3"),
        ahmedelkourdi: require("../assets/soundsComplete-ios/ahmedelkourdi.mp3"),
        dubai: require("../assets/soundsComplete-ios/dubai.mp3"),
        karljenkins: require("../assets/soundsComplete-ios/karljenkins.mp3"),
        mansourzahrani: require("../assets/soundsComplete-ios/mansourzahrani.mp3"),
        misharyrachid: require("../assets/soundsComplete-ios/misharyrachid.mp3"),
        mustafaozcan: require("../assets/soundsComplete-ios/mustafaozcan.mp3"),
        masjidquba: require("../assets/soundsComplete-ios/masjidquba.mp3"),
        islamsobhi: require("../assets/soundsComplete-ios/islamsobhi.mp3"),
      };

      const soundModule = soundObjects[soundName];
      if (!soundModule) {
        throw new Error(`Son introuvable: ${soundName}`);
      }

      // Charger l'asset et obtenir son URI locale
      const asset = Asset.fromModule(soundModule);
      await asset.downloadAsync();

      if (!asset.localUri) {
        throw new Error(`Impossible d'obtenir l'URI locale pour ${soundName}`);
      }

      console.log(
        `🎵 [AdhanAudioContext] playAdhan: ${soundName} pour ${prayer}`
      );
      console.log(`📍 URI locale: ${asset.localUri}`);

      // Passer l'URI au module natif
      console.log(
        "🎵 [AdhanAudioContext] Appel du module natif playAdhanWithURI..."
      );
      const result = await AdhanAudioPlayer.playAdhanWithURI(
        asset.localUri,
        prayer
      );
      console.log("✅ [AdhanAudioContext] playAdhanWithURI retourné:", result);
    } catch (error: any) {
      console.error("❌ [AdhanAudioContext] Erreur playAdhan:", error);
      throw error;
    }
  }, []);

  // Fonction pour arrêter l'Adhan
  const stopAdhan = useCallback(async () => {
    if (Platform.OS !== "ios") {
      console.warn("⚠️ [AdhanAudioContext] stopAdhan appelé sur non-iOS");
      return;
    }

    try {
      const { AdhanAudioPlayer } = NativeModules;
      if (!AdhanAudioPlayer) {
        throw new Error("AdhanAudioPlayer module not available");
      }

      console.log("⏹️ [AdhanAudioContext] stopAdhan");
      AdhanAudioPlayer.stopAdhan();
    } catch (error: any) {
      console.error("❌ [AdhanAudioContext] Erreur stopAdhan:", error);
      throw error;
    }
  }, []);

  // Fonction pour obtenir le statut
  const getStatus = useCallback(async (): Promise<AdhanAudioState> => {
    if (Platform.OS !== "ios") {
      return defaultState;
    }

    try {
      const { AdhanAudioPlayer } = NativeModules;
      if (!AdhanAudioPlayer) {
        return defaultState;
      }

      const status = await AdhanAudioPlayer.getStatus();
      return {
        isPlaying: status.isPlaying || false,
        soundName: status.soundName || null,
        prayer: status.prayer || null,
      };
    } catch (error: any) {
      console.error("❌ [AdhanAudioContext] Erreur getStatus:", error);
      return defaultState;
    }
  }, []);

  const value: AdhanAudioContextType = {
    state,
    playAdhan,
    stopAdhan,
    getStatus,
  };

  return (
    <AdhanAudioContext.Provider value={value}>
      {children}
    </AdhanAudioContext.Provider>
  );
};

export const useAdhanAudio = () => {
  const context = useContext(AdhanAudioContext);
  if (!context) {
    throw new Error("useAdhanAudio must be used within AdhanAudioProvider");
  }
  return context;
};
