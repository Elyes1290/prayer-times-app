import { NativeModules, NativeEventEmitter, Platform } from "react-native";

const { DownloadModule } = NativeModules;

// Types pour les événements de téléchargement
export interface DownloadEvent {
  contentId: string;
  progress: number;
  localUri?: string;
}

export interface DownloadInfo {
  url: string;
  fileName: string;
  contentId: string;
  title: string;
}

export interface DownloadStatus {
  contentId: string;
  status: number;
  progress: number;
  bytesDownloaded: number;
  totalBytes: number;
}

// 🚀 NOUVEAU : Types pour les téléchargements actifs
export interface ActiveDownloadInfo {
  contentId: string;
  fileName: string;
  title: string;
  downloadId: number;
}

export interface ActiveDownloadsResult {
  downloads: { [contentId: string]: ActiveDownloadInfo };
  count: number;
}

class NativeDownloadManager {
  private eventEmitter?: NativeEventEmitter;
  private listeners: Map<string, (event: DownloadEvent) => void> = new Map();

  constructor() {
    if (Platform.OS === "android" && DownloadModule) {
      const canPassModule =
        typeof (DownloadModule as any)?.addListener === "function" &&
        typeof (DownloadModule as any)?.removeListeners === "function";
      this.eventEmitter = new NativeEventEmitter(
        canPassModule ? (DownloadModule as any) : undefined
      );
      this.setupEventListeners();
    }
  }

  private setupEventListeners() {
    if (!this.eventEmitter) return;

    // Écouter les événements de téléchargement
    this.eventEmitter.addListener("downloadStarted", (event: DownloadEvent) => {
      this.notifyListeners("downloadStarted", event);
    });

    this.eventEmitter.addListener(
      "downloadProgress",
      (event: DownloadEvent) => {
        this.notifyListeners("downloadProgress", event);
      }
    );

    this.eventEmitter.addListener(
      "downloadCompleted",
      (event: DownloadEvent) => {
        console.log(
          "✅ Téléchargement terminé:",
          event.contentId,
          event.localUri
        );
        this.notifyListeners("downloadCompleted", event);
      }
    );

    this.eventEmitter.addListener("downloadFailed", (event: DownloadEvent) => {
      // console.log("❌ Téléchargement échoué:", event.contentId);
      this.notifyListeners("downloadFailed", event);
    });

    this.eventEmitter.addListener(
      "downloadCancelled",
      (event: DownloadEvent) => {
        console.log("🚫 Téléchargement annulé:", event.contentId);
        this.notifyListeners("downloadCancelled", event);
      }
    );
  }

  private notifyListeners(eventType: string, event: DownloadEvent) {
    const listener = this.listeners.get(eventType);
    if (listener) {
      listener(event);
    }
  }

  // Méthodes publiques
  public addEventListener(
    eventType: string,
    callback: (event: DownloadEvent) => void
  ) {
    this.listeners.set(eventType, callback);
  }

  public removeEventListener(
    eventType: string,
    callback?: (event: DownloadEvent) => void
  ) {
    if (callback) {
      // Si un callback spécifique est fourni, on pourrait l'utiliser pour une suppression plus précise
      // Pour l'instant, on supprime simplement par type d'événement
    }
    this.listeners.delete(eventType);
  }

  public async startDownload(downloadInfo: DownloadInfo): Promise<number> {
    if (Platform.OS !== "android" || !DownloadModule) {
      throw new Error("Module de téléchargement natif non disponible");
    }

    try {
      const downloadId = await DownloadModule.startDownload(downloadInfo);
      return Math.floor(downloadId); // Convertir en entier pour être sûr
    } catch (error) {
      console.error("❌ Erreur démarrage téléchargement:", error);
      throw error;
    }
  }

  public async cancelDownload(contentId: string): Promise<boolean> {
    if (Platform.OS !== "android" || !DownloadModule) {
      throw new Error("Module de téléchargement natif non disponible");
    }

    try {
      const result = await DownloadModule.cancelDownload(contentId);
      return result;
    } catch (error) {
      console.error("❌ Erreur annulation téléchargement:", error);
      throw error;
    }
  }

  public async getDownloadStatus(contentId: string): Promise<DownloadStatus> {
    if (Platform.OS !== "android" || !DownloadModule) {
      throw new Error("Module de téléchargement natif non disponible");
    }

    try {
      const status = await DownloadModule.getDownloadStatus(contentId);
      return status;
    } catch (error) {
      console.error("❌ Erreur récupération statut:", error);
      throw error;
    }
  }

  // 🚀 NOUVEAU : Récupérer tous les téléchargements actifs
  public async getActiveDownloads(): Promise<ActiveDownloadsResult> {
    if (Platform.OS !== "android" || !DownloadModule) {
      throw new Error("Module de téléchargement natif non disponible");
    }

    try {
      const result = await DownloadModule.getActiveDownloads();
      return result;
    } catch (error) {
      console.error("❌ Erreur récupération téléchargements actifs:", error);
      throw error;
    }
  }

  // 🚀 NOUVEAU : Vérifier si un téléchargement est actif
  public async isDownloadActive(contentId: string): Promise<boolean> {
    if (Platform.OS !== "android" || !DownloadModule) {
      return false;
    }

    try {
      const isActive = await DownloadModule.isDownloadActive(contentId);
      return isActive;
    } catch (error) {
      console.error("❌ Erreur vérification téléchargement actif:", error);
      return false;
    }
  }

  public isAvailable(): boolean {
    return Platform.OS === "android" && !!DownloadModule;
  }

  public cleanup() {
    this.listeners.clear();
    if (this.eventEmitter) {
      this.eventEmitter.removeAllListeners("downloadStarted");
      this.eventEmitter.removeAllListeners("downloadProgress");
      this.eventEmitter.removeAllListeners("downloadCompleted");
      this.eventEmitter.removeAllListeners("downloadFailed");
      this.eventEmitter.removeAllListeners("downloadCancelled");
    }
  }
}

// Instance singleton
export const nativeDownloadManager = new NativeDownloadManager();

export default nativeDownloadManager;
