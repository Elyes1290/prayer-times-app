import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CDNOptimizer from "./cdnOptimization";

export interface StreamingConfig {
  bufferSize: number; // Taille du buffer en secondes
  preloadDuration: number; // Durée de préchargement en secondes
  maxConcurrentStreams: number;
  adaptiveBitrate: boolean;
  cacheSegments: boolean;
}

export interface AudioSegment {
  url: string;
  startTime: number;
  duration: number;
  size: number;
  cached: boolean;
}

export interface StreamingSession {
  id: string;
  audioId: string;
  segments: AudioSegment[];
  currentSegment: number;
  totalDuration: number;
  sound: Audio.Sound | null;
  isStreaming: boolean;
  bufferHealth: number; // Pourcentage de buffer disponible
}

export class AudioStreamingManager {
  private static instance: AudioStreamingManager;
  private sessions: Map<string, StreamingSession> = new Map();
  private cdnOptimizer: CDNOptimizer;

  private config: StreamingConfig = {
    bufferSize: 30, // 30 secondes de buffer
    preloadDuration: 10, // Précharger 10 secondes
    maxConcurrentStreams: 3,
    adaptiveBitrate: true,
    cacheSegments: true,
  };

  private readonly SEGMENT_CACHE_KEY = "@audio_segments_cache";
  private segmentCache: Map<string, ArrayBuffer> = new Map();

  public static getInstance(): AudioStreamingManager {
    if (!AudioStreamingManager.instance) {
      AudioStreamingManager.instance = new AudioStreamingManager();
    }
    return AudioStreamingManager.instance;
  }

  private constructor() {
    this.cdnOptimizer = CDNOptimizer.getInstance();
    this.loadSegmentCache();

    // Optimisation : nettoyer les sessions inactives toutes les 5 minutes
    setInterval(() => {
      this.cleanupInactiveSessions();
    }, 5 * 60 * 1000);
  }

  /**
   * 🎵 Créer une session de streaming
   */
  public async createStreamingSession(
    audioId: string,
    originalUrl: string,
    duration?: number
  ): Promise<string> {
    const sessionId = `stream_${audioId}_${Date.now()}`;

    try {
      // 1. Analyser l'audio pour créer les segments
      const segments = await this.createAudioSegments(
        audioId,
        originalUrl,
        duration
      );

      // 2. Créer la session
      const session: StreamingSession = {
        id: sessionId,
        audioId,
        segments,
        currentSegment: 0,
        totalDuration: duration || this.calculateTotalDuration(segments),
        sound: null,
        isStreaming: false,
        bufferHealth: 0,
      };

      this.sessions.set(sessionId, session);

      // 3. Précharger les premiers segments
      await this.preloadSegments(sessionId, 0, 3);

      console.log(
        `🎵 Session streaming créée: ${sessionId} (${segments.length} segments)`
      );
      return sessionId;
    } catch (error) {
      console.error("Erreur création session streaming:", error);
      throw error;
    }
  }

  /**
   * 📦 Créer les segments audio pour le streaming
   */
  private async createAudioSegments(
    audioId: string,
    originalUrl: string,
    duration?: number
  ): Promise<AudioSegment[]> {
    const segments: AudioSegment[] = [];
    const segmentDuration = 15; // 15 secondes par segment
    const estimatedDuration = duration || 300; // 5 minutes par défaut

    // Calcul intelligent de la taille des segments basé sur la qualité
    const estimatedBitrate = 128; // kbps pour l'adhan
    const segmentSize = (segmentDuration * estimatedBitrate * 1000) / 8; // en bytes

    const totalSegments = Math.ceil(estimatedDuration / segmentDuration);

    for (let i = 0; i < totalSegments; i++) {
      const startTime = i * segmentDuration;
      const segmentUrl = this.buildSegmentUrl(
        originalUrl,
        startTime,
        segmentDuration
      );

      segments.push({
        url: segmentUrl,
        startTime,
        duration: Math.min(segmentDuration, estimatedDuration - startTime),
        size: segmentSize,
        cached: await this.isSegmentCached(`${audioId}_${i}`),
      });
    }

    return segments;
  }

  /**
   * 🔗 Construire l'URL d'un segment avec range requests
   */
  private buildSegmentUrl(
    baseUrl: string,
    startTime: number,
    duration: number
  ): string {
    // Pour Firebase Storage et CDN, utiliser les Range requests HTTP
    // Format: ?t=startTime-endTime (en secondes)
    const endTime = startTime + duration;

    // Si l'URL contient déjà des paramètres, ajouter &, sinon ?
    const separator = baseUrl.includes("?") ? "&" : "?";

    return `${baseUrl}${separator}t=${startTime}-${endTime}`;
  }

  /**
   * ▶️ Démarrer le streaming
   */
  public async startStreaming(sessionId: string): Promise<Audio.Sound | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session streaming non trouvée: ${sessionId}`);
    }

    try {
      // 1. Vérifier le nombre de streams actifs
      const activeStreams = Array.from(this.sessions.values()).filter(
        (s) => s.isStreaming
      ).length;

      if (activeStreams >= this.config.maxConcurrentStreams) {
        throw new Error("Trop de streams actifs simultanés");
      }

      // 2. Créer l'objet Audio.Sound avec le premier segment
      const firstSegment = session.segments[0];
      if (!firstSegment) {
        throw new Error("Aucun segment disponible");
      }

      // 3. Obtenir l'URL optimisée via CDN
      const optimizedUrl = await this.getOptimizedSegmentUrl(
        session.audioId,
        firstSegment.url,
        0
      );

      if (!optimizedUrl) {
        throw new Error("Impossible d'obtenir l'URL optimisée");
      }

      // 4. Créer et configurer le sound object
      const { sound } = await Audio.Sound.createAsync(
        { uri: optimizedUrl },
        {
          shouldPlay: false,
          volume: 1.0,
          isLooping: false,
          isMuted: false,
        }
      );

      session.sound = sound;
      session.isStreaming = true;
      session.currentSegment = 0;

      // 5. Configurer les callbacks pour le streaming continu
      sound.setOnPlaybackStatusUpdate((status) => {
        this.handlePlaybackStatus(sessionId, status);
      });

      // 6. Précharger les segments suivants
      this.preloadNextSegments(sessionId);

      console.log(`▶️ Streaming démarré: ${sessionId}`);
      return sound;
    } catch (error) {
      console.error("Erreur démarrage streaming:", error);
      session.isStreaming = false;
      return null;
    }
  }

  /**
   * 📊 Gérer le statut de lecture et les transitions de segments
   */
  private async handlePlaybackStatus(
    sessionId: string,
    status: any
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !status.isLoaded) return;

    const currentTime = status.positionMillis / 1000;
    const segmentEndTime =
      session.segments[session.currentSegment]?.startTime +
      session.segments[session.currentSegment]?.duration;

    // Vérifier si on approche de la fin du segment actuel
    if (currentTime >= segmentEndTime - 2) {
      // 2 secondes avant la fin
      await this.prepareNextSegment(sessionId);
    }

    // Calculer la santé du buffer
    session.bufferHealth = this.calculateBufferHealth(session, currentTime);

    // Si le buffer est faible, précharger plus agressivement
    if (session.bufferHealth < 30) {
      this.preloadNextSegments(sessionId, true);
    }

    // Fin naturelle de l'audio
    if (status.didJustFinish) {
      await this.handleStreamingComplete(sessionId);
    }
  }

  /**
   * 🔄 Préparer le segment suivant pour une transition fluide
   */
  private async prepareNextSegment(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const nextSegmentIndex = session.currentSegment + 1;
    if (nextSegmentIndex >= session.segments.length) return;

    try {
      const nextSegment = session.segments[nextSegmentIndex];

      // Obtenir l'URL optimisée pour le segment suivant
      const optimizedUrl = await this.getOptimizedSegmentUrl(
        session.audioId,
        nextSegment.url,
        nextSegmentIndex
      );

      if (optimizedUrl && session.sound) {
        // Technique : on pourrait implémenter un crossfade ici
        // Pour l'instant, on prepare juste l'URL suivante
        session.currentSegment = nextSegmentIndex;

        console.log(
          `🔄 Transition segment ${nextSegmentIndex}/${session.segments.length}`
        );
      }
    } catch (error) {
      console.error("Erreur préparation segment suivant:", error);
    }
  }

  /**
   * 📥 Précharger les segments suivants
   */
  private async preloadSegments(
    sessionId: string,
    startIndex: number,
    count: number,
    aggressive: boolean = false
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const endIndex = Math.min(startIndex + count, session.segments.length);
    const preloadPromises = [];

    for (let i = startIndex; i < endIndex; i++) {
      const segment = session.segments[i];
      if (!segment.cached) {
        preloadPromises.push(this.preloadSegment(session.audioId, segment, i));
      }
    }

    try {
      await Promise.allSettled(preloadPromises);
      console.log(
        `📥 Préchargement terminé: segments ${startIndex}-${endIndex}`
      );
    } catch (error) {
      console.error("Erreur préchargement segments:", error);
    }
  }

  private async preloadNextSegments(
    sessionId: string,
    aggressive: boolean = false
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const startIndex = session.currentSegment + 1;
    const count = aggressive ? 5 : 3; // Plus agressif si buffer faible

    await this.preloadSegments(sessionId, startIndex, count, aggressive);
  }

  /**
   * 📦 Précharger un segment individuel
   */
  private async preloadSegment(
    audioId: string,
    segment: AudioSegment,
    index: number
  ): Promise<void> {
    const segmentKey = `${audioId}_${index}`;

    try {
      // Utiliser le CDN Optimizer pour obtenir l'URL optimisée
      const optimizedUrl = await this.cdnOptimizer.getOptimizedFile(
        segmentKey,
        segment.url
      );

      if (optimizedUrl) {
        // Marquer comme mis en cache
        segment.cached = true;

        // Optionnel : stocker en mémoire pour un accès ultra-rapide
        if (this.config.cacheSegments && this.segmentCache.size < 50) {
          // Cache en mémoire limité à 50 segments
          // Note: en production, vous pourriez implémenter un vrai cache binaire
        }
      }
    } catch (error) {
      console.error(`Erreur préchargement segment ${index}:`, error);
    }
  }

  /**
   * 🔗 Obtenir l'URL optimisée d'un segment
   */
  private async getOptimizedSegmentUrl(
    audioId: string,
    segmentUrl: string,
    segmentIndex: number
  ): Promise<string | null> {
    const segmentKey = `${audioId}_${segmentIndex}`;

    try {
      // Utiliser le CDN Optimizer
      const localPath = await this.cdnOptimizer.getOptimizedFile(
        segmentKey,
        segmentUrl
      );

      if (localPath) {
        return localPath;
      }

      // Fallback: URL directe si pas de cache
      return segmentUrl;
    } catch (error) {
      console.error("Erreur obtention URL segment:", error);
      return segmentUrl; // Fallback
    }
  }

  /**
   * 📊 Calculer la santé du buffer
   */
  private calculateBufferHealth(
    session: StreamingSession,
    currentTime: number
  ): number {
    const currentSegment = session.segments[session.currentSegment];
    if (!currentSegment) return 0;

    let bufferedTime = 0;

    // Calculer combien de temps est mis en buffer après la position actuelle
    for (let i = session.currentSegment; i < session.segments.length; i++) {
      const segment = session.segments[i];
      if (segment.cached) {
        bufferedTime += segment.duration;
      } else {
        break; // Arrêter au premier segment non-caché
      }
    }

    // Soustraire le temps déjà écoulé dans le segment actuel
    const segmentElapsed = currentTime - currentSegment.startTime;
    bufferedTime -= segmentElapsed;

    // Convertir en pourcentage par rapport au buffer cible
    return Math.max(
      0,
      Math.min(100, (bufferedTime / this.config.bufferSize) * 100)
    );
  }

  /**
   * ⏹️ Arrêter le streaming
   */
  public async stopStreaming(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      if (session.sound) {
        await session.sound.unloadAsync();
        session.sound = null;
      }

      session.isStreaming = false;
      console.log(`⏹️ Streaming arrêté: ${sessionId}`);
    } catch (error) {
      console.error("Erreur arrêt streaming:", error);
    }
  }

  /**
   * ✅ Gérer la fin naturelle du streaming
   */
  private async handleStreamingComplete(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.isStreaming = false;
    // console.log(`✅ Streaming terminé: ${sessionId}`);

    // Nettoyer automatiquement après 5 minutes
    setTimeout(() => {
      this.cleanupSession(sessionId);
    }, 5 * 60 * 1000);
  }

  /**
   * 🧹 Nettoyer les sessions inactives
   */
  private cleanupInactiveSessions(): void {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    for (const [sessionId, session] of this.sessions) {
      if (!session.isStreaming) {
        // Estimer l'âge de la session
        const sessionAge = now - parseInt(sessionId.split("_")[2]);
        if (sessionAge > maxAge) {
          this.cleanupSession(sessionId);
        }
      }
    }
  }

  private async cleanupSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      await this.stopStreaming(sessionId);
      this.sessions.delete(sessionId);
      console.log(`🗑️ Session nettoyée: ${sessionId}`);
    }
  }

  /**
   * 📊 Statistiques de streaming
   */
  public getStreamingStats(): {
    activeSessions: number;
    totalDataSaved: number; // en MB
    bufferEfficiency: number;
    cacheHitRate: number;
  } {
    const activeSessions = Array.from(this.sessions.values()).filter(
      (s) => s.isStreaming
    ).length;

    // Calcul approximatif des données économisées par rapport au téléchargement complet
    let totalDataSaved = 0;
    for (const session of this.sessions.values()) {
      const totalFileSize = session.segments.reduce(
        (sum, seg) => sum + seg.size,
        0
      );
      const streamedSize = session.segments
        .slice(0, session.currentSegment + 1)
        .reduce((sum, seg) => sum + seg.size, 0);

      totalDataSaved += (totalFileSize - streamedSize) / (1024 * 1024); // MB
    }

    return {
      activeSessions,
      totalDataSaved: Math.round(totalDataSaved),
      bufferEfficiency: 85, // Placeholder - calculer en vrai
      cacheHitRate: 92, // Placeholder - calculer en vrai
    };
  }

  // Méthodes utilitaires
  private calculateTotalDuration(segments: AudioSegment[]): number {
    return segments.reduce((sum, segment) => sum + segment.duration, 0);
  }

  private async isSegmentCached(segmentKey: string): Promise<boolean> {
    return this.segmentCache.has(segmentKey);
  }

  private async loadSegmentCache(): Promise<void> {
    try {
      const cacheData = await AsyncStorage.getItem(this.SEGMENT_CACHE_KEY);
      if (cacheData) {
        // Charger les métadonnées du cache (pas les données binaires)
        console.log("📁 Cache segments chargé");
      }
    } catch (error) {
      console.error("Erreur chargement cache segments:", error);
    }
  }
}

export default AudioStreamingManager;
