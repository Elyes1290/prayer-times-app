import { useEffect, useCallback, useState } from "react";
import { NativeModules, NativeEventEmitter, Platform } from "react-native";
import { usePremium } from "../contexts/PremiumContext";

const { QuranWidgetModule } = NativeModules;

interface QuranWidgetData {
  surah: string;
  reciter: string;
  audioPath: string;
  isPlaying: boolean;
  position: number;
  duration: number;
}

export const useQuranWidget = () => {
  const { user } = usePremium();
  const [isWidgetAvailable, setIsWidgetAvailable] = useState(false);
  const [widgetData, setWidgetData] = useState<QuranWidgetData | null>(null);

  // Vérifier si le widget est disponible
  const checkWidgetAvailability = useCallback(async () => {
    if (Platform.OS !== "android") {
      setIsWidgetAvailable(false);
      return;
    }

    try {
      const available = await QuranWidgetModule.isWidgetAvailable();
      setIsWidgetAvailable(available);
      console.log("📱 Widget Coran disponible:", available);
    } catch (error) {
      console.error("❌ Erreur vérification widget:", error);
      setIsWidgetAvailable(false);
    }
  }, []);

  // Mettre à jour les informations audio dans le widget
  const updateWidgetAudio = useCallback(
    async (surah: string, reciter: string, audioPath: string) => {
      console.log("🎯 updateWidgetAudio appelé avec:", {
        surah,
        reciter,
        audioPath,
      });
      console.log(
        "🎯 État actuel - isWidgetAvailable:",
        isWidgetAvailable,
        "user?.isPremium:",
        user?.isPremium
      );

      if (!isWidgetAvailable || !user?.isPremium) {
        console.log("⚠️ Widget non disponible ou utilisateur non premium");
        return;
      }

      try {
        console.log("🎯 Démarrage du service audio...");
        // Démarrer le service audio en premier
        await QuranWidgetModule.startAudioService();
        console.log("🎵 Service audio démarré");

        console.log("🎯 Mise à jour du widget avec les infos audio...");
        // Mettre à jour le widget
        await QuranWidgetModule.updateWidgetAudio(surah, reciter, audioPath);
        console.log("📻 Widget audio mis à jour:", surah, reciter);

        setWidgetData((prev: any) => ({
          ...prev,
          surah,
          reciter,
          audioPath,
        }));

        console.log("🎯 Chargement de l'audio dans le service...");
        // Charger l'audio dans le service
        await QuranWidgetModule.loadAudioInService(audioPath, surah, reciter);
        console.log("✅ Audio chargé dans le service:", surah, reciter);
      } catch (error) {
        console.error("❌ Erreur mise à jour widget audio:", error);
        console.error(
          "❌ Détails de l'erreur:",
          JSON.stringify(error, null, 2)
        );
      }
    },
    [isWidgetAvailable, user?.isPremium]
  );

  // Mettre à jour l'état de lecture dans le widget
  const updateWidgetPlaybackState = useCallback(
    async (isPlaying: boolean, position: number, duration: number) => {
      if (!isWidgetAvailable || !user?.isPremium) {
        return;
      }

      try {
        await QuranWidgetModule.updateWidgetPlaybackState(
          isPlaying,
          position,
          duration
        );
        setWidgetData((prev: any) => ({
          ...prev,
          isPlaying,
          position,
          duration,
        }));
        console.log(
          "🎵 Widget playback mis à jour:",
          isPlaying,
          position,
          duration
        );
      } catch (error) {
        console.error("❌ Erreur mise à jour widget playback:", error);
      }
    },
    [isWidgetAvailable, user?.isPremium]
  );

  // Mettre à jour le statut premium dans le widget
  const updateWidgetPremiumStatus = useCallback(
    async (isPremium: boolean) => {
      if (!isWidgetAvailable) {
        return;
      }

      try {
        await QuranWidgetModule.updateWidgetPremiumStatus(isPremium);
        console.log("👑 Widget premium mis à jour:", isPremium);
      } catch (error) {
        console.error("❌ Erreur mise à jour widget premium:", error);
      }
    },
    [isWidgetAvailable]
  );

  // Vérifier la disponibilité au démarrage
  useEffect(() => {
    checkWidgetAvailability();
  }, [checkWidgetAvailability]);

  // Forcer la synchronisation du statut premium immédiatement
  useEffect(() => {
    if (user && QuranWidgetModule) {
      console.log(
        "🔄 Synchronisation immédiate du statut premium:",
        user.isPremium
      );

      // Méthode simple: forcer directement le statut premium
      QuranWidgetModule.forcePremiumStatus(!!user.isPremium)
        .then(() => {
          console.log("✅ Statut premium forcé avec succès:", user.isPremium);
        })
        .catch((error: any) => {
          console.error("❌ Erreur forçage statut premium:", error);
        });

      // Méthode de fallback: mise à jour normale
      updateWidgetPremiumStatus(!!user.isPremium);

      // Démarrer le service audio si premium
      if (user.isPremium) {
        QuranWidgetModule.startAudioService();
      }
    }
  }, [user, updateWidgetPremiumStatus]);

  // Démarrer le service audio au démarrage de l'app si premium
  useEffect(() => {
    if (user?.isPremium) {
      // Délai pour s'assurer que l'app est complètement chargée
      const timer = setTimeout(() => {
        QuranWidgetModule.startAudioService();
        console.log("🎵 Service audio démarré au démarrage");
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [user?.isPremium]);

  // Mettre à jour le statut premium quand il change ou au démarrage
  useEffect(() => {
    if (isWidgetAvailable && user) {
      updateWidgetPremiumStatus(!!user.isPremium);
    }
  }, [user?.isPremium, isWidgetAvailable, updateWidgetPremiumStatus]);

  // Forcer la synchronisation du statut premium au démarrage
  useEffect(() => {
    if (isWidgetAvailable && user && QuranWidgetModule) {
      // Délai pour s'assurer que l'app est complètement chargée
      const timer = setTimeout(async () => {
        try {
          // Forcer directement le statut premium
          await QuranWidgetModule.forcePremiumStatus(!!user.isPremium);
          console.log("🔄 Statut premium forcé au démarrage:", user.isPremium);
        } catch (error) {
          console.error("❌ Erreur forçage premium au démarrage:", error);
          // Fallback: utiliser la méthode normale
          updateWidgetPremiumStatus(!!user.isPremium);
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isWidgetAvailable, user]);

  // NOUVEAU : Méthode pour lancer le diagnostic du widget
  const runWidgetDiagnostic = useCallback(async (): Promise<void> => {
    try {
      console.log("🔍 Lancement diagnostic widget...");
      await QuranWidgetModule.runDiagnostic();
      console.log("✅ Diagnostic widget lancé");
    } catch (error) {
      console.error("❌ Erreur diagnostic widget:", error);
      throw error;
    }
  }, []);

  return {
    isWidgetAvailable,
    widgetData,
    updateWidgetAudio,
    updateWidgetPlaybackState,
    updateWidgetPremiumStatus,
    checkWidgetAvailability,
    runWidgetDiagnostic, // NOUVEAU
  };
};
