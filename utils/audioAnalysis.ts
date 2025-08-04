// 🎵 Utilitaire d'analyse audio pour la synchronisation Coran (React Native)
// Analyse les pauses et patterns de récitation en temps réel

import { Audio } from "expo-av";

export interface AudioSegment {
  startTime: number;
  endTime: number;
  duration: number;
  isPause: boolean;
  volume: number;
}

export interface VerseTiming {
  verseIndex: number;
  estimatedStartTime: number;
  estimatedEndTime: number;
  confidence: number;
}

export class QuranAudioAnalyzer {
  private isAnalyzing = false;
  private segments: AudioSegment[] = [];
  private pauseThreshold = 0.1; // Seuil pour détecter les pauses
  private minPauseDuration = 500; // Durée minimale d'une pause (ms)
  private versePatterns: number[] = []; // Durées moyennes des versets

  constructor() {
    // Pas d'initialisation AudioContext en React Native
  }

  // 🎯 Analyser un fichier audio existant avec Expo Audio
  async analyzeAudioFile(audioUrl: string): Promise<VerseTiming[]> {
    try {
      console.log("🎵 Début analyse audio:", audioUrl);

      // Créer un objet Sound temporaire pour obtenir les métadonnées
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: false }
      );

      // Obtenir la durée totale
      const status = await sound.getStatusAsync();
      if (!status.isLoaded || !status.durationMillis) {
        throw new Error(
          "Impossible de charger l'audio ou durée non disponible"
        );
      }

      const totalDuration = status.durationMillis / 1000; // Convertir en secondes
      console.log(`🎵 Durée audio: ${totalDuration}s`);

      // Libérer le sound
      await sound.unloadAsync();

      // Pour l'instant, utiliser une estimation basée sur la durée
      // Dans une version future, on pourrait implémenter une analyse plus sophistiquée
      return this.estimateTimingsFromDuration(totalDuration);
    } catch (error) {
      console.error("Erreur analyse fichier audio:", error);
      return [];
    }
  }

  // 🎯 Estimation basée sur la durée totale (méthode principale pour React Native)
  private estimateTimingsFromDuration(totalDuration: number): VerseTiming[] {
    // Estimation basée sur une durée moyenne de 25 secondes par verset
    // Cette durée peut varier selon le récitateur et la sourate
    const averageVerseDuration = 25;
    const estimatedVerseCount = Math.ceil(totalDuration / averageVerseDuration);

    const verseTimings: VerseTiming[] = [];

    for (let i = 0; i < estimatedVerseCount; i++) {
      const startTime = i * averageVerseDuration;
      const endTime = Math.min((i + 1) * averageVerseDuration, totalDuration);

      // Calculer la confiance basée sur la cohérence de la durée
      const verseDuration = endTime - startTime;
      const durationRatio = verseDuration / averageVerseDuration;
      const confidence = Math.max(0.3, 1 - Math.abs(1 - durationRatio));

      verseTimings.push({
        verseIndex: i,
        estimatedStartTime: startTime,
        estimatedEndTime: endTime,
        confidence: confidence,
      });
    }

    console.log(`🎵 Estimation: ${verseTimings.length} versets détectés`);
    return verseTimings;
  }

  // 🎯 Analyser en temps réel pendant la lecture (version React Native)
  startRealTimeAnalysis(sound: Audio.Sound): void {
    if (this.isAnalyzing) return;

    this.isAnalyzing = true;
    this.segments = [];

    console.log("🎵 Début analyse temps réel");

    // En React Native, on utilise les callbacks de status d'Expo Audio
    // L'analyse se fait via les callbacks de progression
  }

  // 🎯 Arrêter l'analyse en temps réel
  stopRealTimeAnalysis(): AudioSegment[] {
    this.isAnalyzing = false;
    console.log("🎵 Fin analyse temps réel");
    return this.segments;
  }

  // 🎯 Obtenir le verset actuel basé sur le temps de lecture
  getCurrentVerse(timings: VerseTiming[], currentTime: number): number {
    for (const timing of timings) {
      if (
        currentTime >= timing.estimatedStartTime &&
        currentTime <= timing.estimatedEndTime
      ) {
        return timing.verseIndex;
      }
    }
    return 0; // Fallback au premier verset
  }

  // 🎯 Ajuster les paramètres de détection
  setDetectionParameters(
    pauseThreshold: number,
    minPauseDuration: number
  ): void {
    this.pauseThreshold = pauseThreshold;
    this.minPauseDuration = minPauseDuration;
  }

  // 🎯 Sauvegarder les patterns appris
  saveVersePatterns(patterns: number[]): void {
    this.versePatterns = patterns;
  }

  // 🎯 Charger les patterns sauvegardés
  loadVersePatterns(): number[] {
    return this.versePatterns;
  }

  // 🎯 Méthode pour améliorer l'estimation avec des données réelles
  improveEstimation(
    actualVerseCount: number,
    totalDuration: number
  ): VerseTiming[] {
    const averageVerseDuration = totalDuration / actualVerseCount;
    const verseTimings: VerseTiming[] = [];

    for (let i = 0; i < actualVerseCount; i++) {
      const startTime = i * averageVerseDuration;
      const endTime = Math.min((i + 1) * averageVerseDuration, totalDuration);

      verseTimings.push({
        verseIndex: i,
        estimatedStartTime: startTime,
        estimatedEndTime: endTime,
        confidence: 0.8, // Confiance élevée avec données réelles
      });
    }

    return verseTimings;
  }

  // 🎯 Méthode pour estimer avec un nombre de versets connu
  estimateWithKnownVerseCount(
    totalDuration: number,
    verseCount: number
  ): VerseTiming[] {
    return this.improveEstimation(verseCount, totalDuration);
  }
}

// 🎯 Instance singleton
export const quranAudioAnalyzer = new QuranAudioAnalyzer();
