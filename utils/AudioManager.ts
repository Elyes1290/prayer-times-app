import {
  Audio,
  AVPlaybackSource,
  AVPlaybackStatus,
  InterruptionModeIOS,
  InterruptionModeAndroid,
} from "expo-av";
import { Platform } from "react-native";

type StatusCallback = (status: AVPlaybackStatus | any) => void;

class AudioManager {
  private static instance: AudioManager;
  private currentSound: Audio.Sound | null = null;
  private statusCallback: StatusCallback | null = null;
  private isInitialized = false;

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /**
   * 🔧 Initialiser le mode audio pour la lecture en arrière-plan
   */
  private async initializeAudioMode(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });

      console.log("🎵 Mode audio initialisé pour lecture en arrière-plan");
      this.isInitialized = true;
    } catch (error) {
      console.error("❌ Erreur initialisation mode audio:", error);
      // Continuer même en cas d'erreur
    }
  }

  public async playSource(
    source: AVPlaybackSource,
    volume: number = 1.0,
    onStatusUpdate?: StatusCallback
  ): Promise<Audio.Sound> {
    try {
      // 🔧 Initialiser le mode audio si pas encore fait
      await this.initializeAudioMode();

      // Arrêter et décharger tout son existant
      await this.stop().catch(() => {});
      await this.unload().catch(() => {});

      console.log(
        "🎵 Création du sound object avec source:",
        typeof source === "string" ? source : "object"
      );

      // 🔧 Configuration optimisée pour la release
      const soundConfig = {
        shouldPlay: true,
        volume,
        rate: 1.0,
        shouldCorrectPitch: true,
        // 🔧 NOUVEAU : Configuration spécifique pour la release
        androidImplementation: "MediaPlayer" as const, // Forcer MediaPlayer sur Android
        progressUpdateIntervalMillis: 100, // Mise à jour plus fréquente
      };

      const { sound } = await Audio.Sound.createAsync(source, soundConfig);

      this.currentSound = sound;
      this.statusCallback = onStatusUpdate || null;

      if (this.statusCallback) {
        sound.setOnPlaybackStatusUpdate(this.statusCallback);
      }

      console.log("✅ Sound object créé avec succès");
      return sound;
    } catch (error) {
      console.error("❌ Erreur création sound object:", error);

      // 🔧 FALLBACK : Essayer avec une configuration plus simple
      try {
        console.log("🔄 Tentative fallback avec configuration simplifiée");
        const { sound } = await Audio.Sound.createAsync(source, {
          shouldPlay: true,
          volume: 1.0,
        });

        this.currentSound = sound;
        this.statusCallback = onStatusUpdate || null;

        if (this.statusCallback) {
          sound.setOnPlaybackStatusUpdate(this.statusCallback);
        }

        console.log("✅ Sound object créé avec fallback");
        return sound;
      } catch (fallbackError) {
        console.error("❌ Erreur fallback:", fallbackError);
        throw new Error(
          `Impossible de créer le sound object: ${
            error instanceof Error ? error.message : "Erreur inconnue"
          }`
        );
      }
    }
  }

  public async pause(): Promise<void> {
    if (this.currentSound) {
      try {
        const status = await this.currentSound.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await this.currentSound.pauseAsync();
          console.log("⏸️ Audio mis en pause");
        }
      } catch (error) {
        console.error("❌ Erreur pause audio:", error);
      }
    }
  }

  public async resume(): Promise<void> {
    if (this.currentSound) {
      try {
        const status = await this.currentSound.getStatusAsync();
        if (status.isLoaded && !status.isPlaying) {
          await this.currentSound.playAsync();
          console.log("▶️ Audio repris");
        }
      } catch (error) {
        console.error("❌ Erreur reprise audio:", error);
      }
    }
  }

  public async stop(): Promise<void> {
    if (this.currentSound) {
      try {
        const status = await this.currentSound.getStatusAsync();
        if (status.isLoaded) {
          await this.currentSound.stopAsync();
          console.log("⏹️ Audio arrêté");
        }
      } catch (error) {
        console.error("❌ Erreur arrêt audio:", error);
      }
    }
  }

  public async unload(): Promise<void> {
    if (this.currentSound) {
      try {
        const status = await this.currentSound.getStatusAsync();
        if (status.isLoaded) {
          await this.currentSound.unloadAsync();
          console.log("🗑️ Audio déchargé");
        }
        this.currentSound = null;
      } catch (error) {
        console.error("❌ Erreur déchargement audio:", error);
        this.currentSound = null;
      }
    }
  }

  public async setVolume(volume: number): Promise<void> {
    if (this.currentSound) {
      try {
        await this.currentSound.setVolumeAsync(volume);
        console.log(`🔊 Volume réglé à: ${volume}`);
      } catch (error) {
        console.error("❌ Erreur réglage volume:", error);
      }
    }
  }

  public setStatusCallback(callback?: StatusCallback): void {
    this.statusCallback = callback || null;
    if (this.currentSound && this.statusCallback) {
      this.currentSound.setOnPlaybackStatusUpdate(this.statusCallback);
    }
  }

  public getSound(): Audio.Sound | null {
    return this.currentSound;
  }

  /**
   * 🔧 NOUVEAU : Vérifier si le sound est valide
   */
  public async isSoundValid(): Promise<boolean> {
    if (!this.currentSound) return false;

    try {
      const status = await this.currentSound.getStatusAsync();
      return status.isLoaded;
    } catch (error) {
      console.error("❌ Erreur vérification sound:", error);
      return false;
    }
  }

  /**
   * 🔧 NOUVEAU : Obtenir le statut actuel du sound
   */
  public async getCurrentStatus(): Promise<any> {
    if (!this.currentSound) return null;

    try {
      return await this.currentSound.getStatusAsync();
    } catch (error) {
      console.error("❌ Erreur obtention statut:", error);
      return null;
    }
  }
}

export default AudioManager.getInstance();
