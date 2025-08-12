import { Audio, AVPlaybackSource, AVPlaybackStatus } from "expo-av";

type StatusCallback = (status: AVPlaybackStatus | any) => void;

class AudioManager {
  private static instance: AudioManager;
  private currentSound: Audio.Sound | null = null;
  private statusCallback: StatusCallback | null = null;

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  public async playSource(
    source: AVPlaybackSource,
    volume: number = 1.0,
    onStatusUpdate?: StatusCallback
  ): Promise<Audio.Sound> {
    // Stop and unload any existing sound
    await this.stop().catch(() => {});
    await this.unload().catch(() => {});

    const { sound } = await Audio.Sound.createAsync(source, {
      shouldPlay: true,
      volume,
      rate: 1.0,
      shouldCorrectPitch: true,
    });

    this.currentSound = sound;
    this.statusCallback = onStatusUpdate || null;
    if (this.statusCallback) {
      sound.setOnPlaybackStatusUpdate(this.statusCallback);
    }
    return sound;
  }

  public async pause(): Promise<void> {
    if (this.currentSound) {
      const status = await this.currentSound.getStatusAsync();
      // @ts-ignore
      if (status.isLoaded && status.isPlaying) {
        await this.currentSound.pauseAsync();
      }
    }
  }

  public async resume(): Promise<void> {
    if (this.currentSound) {
      const status = await this.currentSound.getStatusAsync();
      // @ts-ignore
      if (status.isLoaded && !status.isPlaying) {
        await this.currentSound.playAsync();
      }
    }
  }

  public async stop(): Promise<void> {
    if (this.currentSound) {
      const status = await this.currentSound.getStatusAsync();
      // @ts-ignore
      if (status.isLoaded) {
        await this.currentSound.stopAsync();
      }
    }
  }

  public async unload(): Promise<void> {
    if (this.currentSound) {
      const status = await this.currentSound.getStatusAsync();
      // @ts-ignore
      if (status.isLoaded) {
        await this.currentSound.unloadAsync();
      }
      this.currentSound = null;
    }
  }

  public async setVolume(volume: number): Promise<void> {
    if (this.currentSound) {
      await this.currentSound.setVolumeAsync(volume);
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
}

export default AudioManager.getInstance();
