import AsyncStorage from "@react-native-async-storage/async-storage";
// TODO: Installer @react-native-community/netinfo pour la détection réseau
// import NetInfo from "@react-native-community/netinfo";
import { Audio } from "expo-av";
import AudioStreamingManager from "./audioStreaming";
import PremiumContentManager from "./premiumContent";
import CDNOptimizer from "./cdnOptimization";

export interface HybridConfig {
  autoDownloadOnWifi: boolean;
  streamOnMobileData: boolean;
  offlineFirstPriority: boolean;
  maxStreamingBitrate: number;
  downloadQuality: "high" | "medium" | "low";
}

export interface AudioPlaybackOptions {
  mode: "preview" | "full" | "offline" | "auto";
  allowDownload: boolean;
  forceOffline: boolean;
  quality?: "high" | "medium" | "low";
}

export interface PlaybackSession {
  id: string;
  contentId: string;
  mode: "streaming" | "local" | "download";
  sound: Audio.Sound | null;
  isPlaying: boolean;
  canGoOffline: boolean;
  downloadProgress?: number;
}

export class HybridAudioManager {
  private static instance: HybridAudioManager;
  private streamingManager: AudioStreamingManager;
  private contentManager: PremiumContentManager;
  private cdnOptimizer: CDNOptimizer;
  private activeSessions: Map<string, PlaybackSession> = new Map();

  private config: HybridConfig = {
    autoDownloadOnWifi: true,
    streamOnMobileData: true,
    offlineFirstPriority: true,
    maxStreamingBitrate: 128,
    downloadQuality: "high",
  };

  private readonly CONFIG_KEY = "@hybrid_audio_config";

  public static getInstance(): HybridAudioManager {
    if (!HybridAudioManager.instance) {
      HybridAudioManager.instance = new HybridAudioManager();
    }
    return HybridAudioManager.instance;
  }

  private constructor() {
    this.streamingManager = AudioStreamingManager.getInstance();
    this.contentManager = PremiumContentManager.getInstance();
    this.cdnOptimizer = CDNOptimizer.getInstance();
    this.loadConfig();
  }

  /**
   * 🎵 FONCTION PRINCIPALE : Lecture intelligente avec choix optimal
   */
  public async playAudio(
    contentId: string,
    options: AudioPlaybackOptions = {
      mode: "auto",
      allowDownload: true,
      forceOffline: false,
    }
  ): Promise<Audio.Sound | null> {
    console.log(`🎵 Lecture intelligente: ${contentId}, mode: ${options.mode}`);

    // TODO: Implémenter la logique complète
    return null;
  }

  /**
   * 🧠 Déterminer la stratégie optimale de lecture
   */
  private async determinePlaybackStrategy(
    content: any,
    options: AudioPlaybackOptions,
    network: { isOnline: boolean; isWifi: boolean }
  ): Promise<{
    mode: "local" | "streaming" | "download";
    reason: string;
    downloadAfter?: boolean;
  }> {
    // 1. PRIORITÉ ABSOLUE : Fichier local existant
    const localPath = await this.contentManager.isContentDownloaded(content.id);
    if (localPath) {
      return {
        mode: "local",
        reason: "✅ Fichier local disponible (optimal)",
      };
    }

    // 2. MODE HORS LIGNE FORCÉ
    if (options.forceOffline || !network.isOnline) {
      throw new Error("Mode hors ligne demandé mais fichier non téléchargé");
    }

    // 3. PRÉVISUALISATION RAPIDE (streaming)
    if (options.mode === "preview") {
      return {
        mode: "streaming",
        reason: "🎧 Prévisualisation - streaming économique",
        downloadAfter: network.isWifi && this.config.autoDownloadOnWifi,
      };
    }

    // 4. ANALYSE INTELLIGENTE selon contexte

    // Sur WiFi : préférer téléchargement pour usage futur
    if (network.isWifi && options.allowDownload) {
      return {
        mode: "download",
        reason: "📥 WiFi détecté - téléchargement pour usage hors ligne",
      };
    }

    // Sur données mobiles : streaming pour économiser
    if (!network.isWifi && this.config.streamOnMobileData) {
      return {
        mode: "streaming",
        reason: "📱 Données mobiles - streaming pour économiser",
      };
    }

    // Fallback : streaming
    return {
      mode: "streaming",
      reason: "🌐 Streaming par défaut",
    };
  }

  /**
   * ⚡ Exécuter la stratégie de lecture choisie
   */
  private async executePlaybackStrategy(
    content: any,
    strategy: {
      mode: "local" | "streaming" | "download";
      reason: string;
      downloadAfter?: boolean;
    }
  ): Promise<PlaybackSession | null> {
    const sessionId = `hybrid_${content.id}_${Date.now()}`;

    switch (strategy.mode) {
      case "local":
        return await this.playFromLocal(sessionId, content);

      case "streaming":
        const streamSession = await this.playFromStreaming(sessionId, content);

        // Téléchargement automatique en arrière-plan si configuré
        if (strategy.downloadAfter) {
          this.scheduleBackgroundDownload(content);
        }

        return streamSession;

      case "download":
        return await this.playWithDownload(sessionId, content);

      default:
        throw new Error(`Stratégie inconnue: ${strategy.mode}`);
    }
  }

  /**
   * 📁 Lecture depuis fichier local (optimal - hors ligne)
   */
  private async playFromLocal(
    sessionId: string,
    content: any
  ): Promise<PlaybackSession | null> {
    try {
      const localPath = await this.contentManager.isContentDownloaded(
        content.id
      );
      if (!localPath) {
        throw new Error("Fichier local introuvable");
      }

      console.log(`📁 Lecture locale: ${localPath}`);

      const { sound } = await Audio.Sound.createAsync(
        { uri: localPath },
        { shouldPlay: false }
      );

      return {
        id: sessionId,
        contentId: content.id,
        mode: "local",
        sound,
        isPlaying: false,
        canGoOffline: true,
      };
    } catch (error) {
      console.error("❌ Erreur lecture locale:", error);
      return null;
    }
  }

  /**
   * 🌐 Lecture en streaming (économique - en ligne)
   */
  private async playFromStreaming(
    sessionId: string,
    content: any
  ): Promise<PlaybackSession | null> {
    try {
      console.log(`🌐 Démarrage streaming: ${content.id}`);

      const streamSessionId = await this.contentManager.createStreamingSession(
        content
      );
      if (!streamSessionId) {
        throw new Error("Impossible de créer session streaming");
      }

      const sound = await this.contentManager.startOptimizedStreaming(
        streamSessionId
      );
      if (!sound) {
        throw new Error("Impossible de démarrer streaming");
      }

      return {
        id: sessionId,
        contentId: content.id,
        mode: "streaming",
        sound,
        isPlaying: false,
        canGoOffline: false,
      };
    } catch (error) {
      console.error("❌ Erreur streaming:", error);
      return null;
    }
  }

  /**
   * 📥 Téléchargement puis lecture (optimal pour usage récurrent)
   */
  private async playWithDownload(
    sessionId: string,
    content: any
  ): Promise<PlaybackSession | null> {
    try {
      console.log(`📥 Téléchargement puis lecture: ${content.id}`);

      // Créer la session avec suivi de progression
      const session: PlaybackSession = {
        id: sessionId,
        contentId: content.id,
        mode: "download",
        sound: null,
        isPlaying: false,
        canGoOffline: false,
        downloadProgress: 0,
      };

      // Télécharger avec suivi de progression
      const downloadSuccess = await this.contentManager.downloadPremiumContent(
        content,
        (progress) => {
          session.downloadProgress = progress;
          this.notifyDownloadProgress(sessionId, progress);
        }
      );

      if (!downloadSuccess) {
        throw new Error("Échec téléchargement");
      }

      // Une fois téléchargé, lire depuis le fichier local
      const localSession = await this.playFromLocal(sessionId, content);
      if (localSession) {
        localSession.mode = "download"; // Garder l'historique du mode
        localSession.downloadProgress = 100;
      }

      console.log(
        `✅ Téléchargement terminé et lecture démarrée: ${content.id}`
      );
      return localSession;
    } catch (error) {
      console.error("❌ Erreur téléchargement+lecture:", error);
      return null;
    }
  }

  /**
   * 🔄 Téléchargement automatique en arrière-plan
   */
  private async scheduleBackgroundDownload(content: any): Promise<void> {
    // Attendre 5 secondes pour ne pas interférer avec la lecture
    setTimeout(async () => {
      try {
        console.log(
          `🔄 Téléchargement automatique en arrière-plan: ${content.id}`
        );

        const isAlreadyDownloaded =
          await this.contentManager.isContentDownloaded(content.id);
        if (isAlreadyDownloaded) {
          console.log(`⏭️ Déjà téléchargé: ${content.id}`);
          return;
        }

        await this.contentManager.downloadPremiumContent(
          content,
          (progress) => {
            console.log(`📥 Arrière-plan: ${content.id} - ${progress}%`);
          }
        );

        // console.log(`✅ Téléchargement arrière-plan terminé: ${content.id}`);
      } catch (error) {
        console.error("❌ Erreur téléchargement arrière-plan:", error);
      }
    }, 5000);
  }

  /**
   * 📊 Obtenir les informations d'un contenu
   */
  private async getContentInfo(contentId: string): Promise<any> {
    try {
      const catalog = await this.contentManager.getPremiumCatalog();
      if (!catalog) return null;

      // Chercher dans toutes les catégories
      const allContent = [
        ...catalog.adhanVoices,
        ...catalog.quranRecitations,
        ...catalog.dhikrCollections,
        ...catalog.premiumThemes,
      ];

      return allContent.find((item) => item.id === contentId);
    } catch (error) {
      console.error("❌ Erreur récupération info contenu:", error);
      return null;
    }
  }

  /**
   * 🔄 Basculer entre streaming et local
   */
  public async switchToOfflineMode(contentId: string): Promise<boolean> {
    // console.log(`🔄 Basculement hors ligne: ${contentId}`);
    return false;
  }

  /**
   * ⏹️ Arrêter la lecture
   */
  public async stopPlayback(contentId: string): Promise<void> {
    const session = this.activeSessions.get(contentId);
    if (session?.sound) {
      await session.sound.unloadAsync();
      this.activeSessions.delete(contentId);
      console.log(`⏹️ Lecture arrêtée: ${contentId}`);
    }
  }

  /**
   * 📋 Obtenir le statut d'une session
   */
  public getSessionStatus(contentId: string): {
    mode: string;
    canGoOffline: boolean;
    downloadProgress?: number;
    isActive: boolean;
  } | null {
    const session = this.activeSessions.get(contentId);
    if (!session) return null;

    return {
      mode: session.mode,
      canGoOffline: session.canGoOffline,
      downloadProgress: session.downloadProgress,
      isActive: true,
    };
  }

  /**
   * 📊 Statistiques globales hybrides
   */
  public async getHybridStats(): Promise<{
    totalDownloaded: number;
    totalStreamingSessions: number;
    offlineCapable: number;
    dataSavedMB: number;
    recommendedActions: string[];
  }> {
    return {
      totalDownloaded: 0,
      totalStreamingSessions: 0,
      offlineCapable: 0,
      dataSavedMB: 0,
      recommendedActions: [],
    };
  }

  /**
   * 💡 Générer des recommandations intelligentes
   */
  private async generateRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];

    try {
      // TODO: Décommenter quand NetInfo sera installé
      // const networkState = await NetInfo.fetch();
      // const isWifi = networkState.type === "wifi";

      // Mock temporaire - à remplacer par NetInfo
      const isWifi = true; // Assumé WiFi pour démo

      if (isWifi) {
        recommendations.push(
          "📶 WiFi détecté - Moment idéal pour télécharger vos favoris"
        );
      }

      const downloadedSize = await this.contentManager.getPremiumContentSize();
      if (downloadedSize > 500) {
        recommendations.push(
          "🧹 Plus de 500MB téléchargés - Pensez à nettoyer l'ancien contenu"
        );
      }

      const activeSessions = this.activeSessions.size;
      if (activeSessions === 0) {
        recommendations.push(
          "🎵 Explorez notre catalogue de récitations premium"
        );
      }
    } catch (error) {
      console.error("❌ Erreur génération recommandations:", error);
    }

    return recommendations;
  }

  /**
   * 🔧 Configuration du système hybride
   */
  public updateConfig(newConfig: Partial<HybridConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
    console.log("⚙️ Configuration hybride mise à jour:", this.config);
  }

  public getConfig(): HybridConfig {
    return { ...this.config };
  }

  private async loadConfig(): Promise<void> {
    try {
      const configData = await AsyncStorage.getItem(this.CONFIG_KEY);
      if (configData) {
        this.config = { ...this.config, ...JSON.parse(configData) };
      }
    } catch (error) {
      console.error("❌ Erreur chargement config hybride:", error);
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.CONFIG_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.error("❌ Erreur sauvegarde config hybride:", error);
    }
  }

  // Callbacks pour l'UI
  private notifyDownloadProgress(sessionId: string, progress: number): void {
    // Cette méthode peut être overridée pour notifier l'UI
    console.log(`📥 Session ${sessionId}: ${progress}%`);
  }
}

export default HybridAudioManager;
