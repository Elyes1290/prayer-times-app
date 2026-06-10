import React, {
  createContext,
  use,
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
  // react-doctor-disable-next-line react-doctor/effect-needs-cleanup, react-doctor/no-cascading-set-state
  useEffect(() => {
    const subscriptions: Array<{ remove: () => void }> = [];

    if (Platform.OS === "ios" && eventEmitter) {
      console.log("🎵 [AdhanAudioContext] Écoute des événements activée");

      subscriptions.push(
        eventEmitter.addListener(
          "AdhanPlaybackStarted",
          (data: { soundName: string; prayer: string }) => {
            console.log("🎵 [AdhanAudioContext] AdhanPlaybackStarted:", data);
            setState({
              isPlaying: true,
              soundName: data.soundName,
              prayer: data.prayer,
            });
          },
        ),
        eventEmitter.addListener(
          "AdhanPlaybackStopped",
          (data: { soundName: string; prayer: string }) => {
            console.log("⏹️ [AdhanAudioContext] AdhanPlaybackStopped:", data);
            setState({
              isPlaying: false,
              soundName: null,
              prayer: null,
            });
          },
        ),
        eventEmitter.addListener(
          "AdhanPlaybackFinished",
          (data: { soundName: string; prayer: string; success: boolean }) => {
            console.log("✅ [AdhanAudioContext] AdhanPlaybackFinished:", data);
            setState({
              isPlaying: false,
              soundName: null,
              prayer: null,
            });
          },
        ),
        eventEmitter.addListener(
          "AdhanPlaybackError",
          (data: { soundName: string; prayer: string; error: string }) => {
            console.error("❌ [AdhanAudioContext] AdhanPlaybackError:", data);
            setState({
              isPlaying: false,
              soundName: null,
              prayer: null,
            });
          },
        ),
      );
    }

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

      console.log(
        `🎵 [AdhanAudioContext] Recherche du MP3 complet pour: ${soundName}`
      );

      // 🎯 PRIORITÉ : Utiliser PremiumContentManager pour chercher le fichier téléchargé
      // (Exactement la même méthode que dans Settings)
      let localPath: string | null = null;
      try {
        console.log(
          "🔍 [AdhanAudioContext] Vérification fichier téléchargé avec PremiumContentManager..."
        );
        const PremiumContentManager = (await import("../utils/premiumContent"))
          .default;
        const manager = PremiumContentManager.getInstance();

        // Essayer avec l'ID exact
        localPath = await manager.isContentDownloaded(soundName);

        // Si pas trouvé, essayer sans le préfixe 'adhan_' si présent
        if (!localPath && soundName.startsWith("adhan_")) {
          localPath = await manager.isContentDownloaded(
            soundName.replace("adhan_", "")
          );
        }
        // Si pas trouvé, essayer AVEC le préfixe 'adhan_' si absent
        if (!localPath && !soundName.startsWith("adhan_")) {
          localPath = await manager.isContentDownloaded(`adhan_${soundName}`);
        }

        if (localPath) {
          console.log(
            `✅ [AdhanAudioContext] Fichier local trouvé: ${localPath}`
          );

          // Ajouter le préfixe file:// si nécessaire
          const fileUri = localPath.startsWith("file://")
            ? localPath
            : "file://" + localPath;

          console.log(
            "🎵 [AdhanAudioContext] Appel du module natif playAdhanWithURI avec fichier téléchargé..."
          );
          const playResult = await AdhanAudioPlayer.playAdhanWithURI(
            fileUri,
            prayer
          );
          console.log(
            "✅ [AdhanAudioContext] playAdhanWithURI retourné:",
            playResult
          );
          return; // Succès, on sort
        } else {
          console.log(
            "⚠️ [AdhanAudioContext] Aucun fichier téléchargé trouvé, fallback sur assets..."
          );
        }
      } catch (managerError: any) {
        console.warn(
          "⚠️ [AdhanAudioContext] Erreur PremiumContentManager:",
          managerError.message
        );
      }

      // 🔄 FALLBACK : Si pas de fichier téléchargé, charger depuis assets/soundsComplete-ios/
      console.log(
        "🔄 [AdhanAudioContext] Fallback: Chargement depuis les assets..."
      );
      // 🛡️ IMPORTATION SÉLECTIVE : getAdhanIosSound vient de .ios.ts sur iOS et .android.ts sur Android
      // Cela garantit que Metro n'inclut PAS les mp3 sur Android.
      const { getAdhanIosSound } = require("../utils/adhanIosAssets");
      const soundModule = getAdhanIosSound(soundName);

      if (!soundModule) {
        throw new Error(`Son introuvable dans les assets: ${soundName}`);
      }

      const { Asset } = await import("expo-asset");

      // Charger l'asset et obtenir son URI locale
      const asset = Asset.fromModule(soundModule);
      await asset.downloadAsync();

      if (!asset.localUri) {
        throw new Error(`Impossible d'obtenir l'URI locale pour ${soundName}`);
      }

      console.log(
        `📍 [AdhanAudioContext] URI locale (asset): ${asset.localUri}`
      );

      // Passer l'URI au module natif
      console.log(
        "🎵 [AdhanAudioContext] Appel du module natif playAdhanWithURI (asset)..."
      );
      const playResult = await AdhanAudioPlayer.playAdhanWithURI(
        asset.localUri,
        prayer
      );
      console.log(
        "✅ [AdhanAudioContext] playAdhanWithURI retourné:",
        playResult
      );
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
  const context = use(AdhanAudioContext);
  if (!context) {
    throw new Error("useAdhanAudio must be used within AdhanAudioProvider");
  }
  return context;
};
