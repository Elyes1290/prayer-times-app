import { useEffect, useRef } from "react";
import { NativeEventEmitter, NativeModules } from "react-native";

const { QuranSyncModule } = NativeModules;

interface WidgetSyncData {
  surahNumber: number;
  surahName: string;
  reciter: string;
  timestamp: number;
  hasData: boolean;
}

interface UseQuranWidgetSyncReturn {
  checkWidgetSync: () => Promise<WidgetSyncData>;
  clearWidgetSync: () => Promise<boolean>;
  onWidgetSync: (callback: (data: WidgetSyncData) => void) => void;
  removeWidgetSyncListener: () => void;
}

export const useQuranWidgetSync = (): UseQuranWidgetSyncReturn => {
  const eventEmitter = useRef<NativeEventEmitter | null>(null);
  const subscription = useRef<any>(null);

  useEffect(() => {
    // Créer l'event emitter
    eventEmitter.current = new NativeEventEmitter(QuranSyncModule);

    return () => {
      // Nettoyer la subscription
      if (subscription.current) {
        subscription.current.remove();
        subscription.current = null;
      }
    };
  }, []);

  const checkWidgetSync = async (): Promise<WidgetSyncData> => {
    try {
      console.log("🔍 Vérification synchronisation widget...");
      const result = await QuranSyncModule.checkWidgetSync();
      console.log("🔍 Résultat synchronisation:", result);
      return result;
    } catch (error) {
      console.error("❌ Erreur vérification synchronisation:", error);
      throw error;
    }
  };

  const clearWidgetSync = async (): Promise<boolean> => {
    try {
      console.log("🗑️ Effacement données synchronisation...");
      const result = await QuranSyncModule.clearWidgetSync();
      console.log("✅ Données synchronisation effacées");
      return result;
    } catch (error) {
      console.error("❌ Erreur effacement synchronisation:", error);
      throw error;
    }
  };

  const onWidgetSync = (callback: (data: WidgetSyncData) => void) => {
    if (!eventEmitter.current) {
      console.error("❌ EventEmitter non initialisé");
      return;
    }

    // Supprimer l'ancienne subscription si elle existe
    if (subscription.current) {
      subscription.current.remove();
    }

    // Créer une nouvelle subscription
    subscription.current = eventEmitter.current.addListener(
      "QuranWidgetSync",
      (data: WidgetSyncData) => {
        console.log("🔄 Synchronisation reçue depuis widget:", data);
        callback(data);
      }
    );

    console.log("✅ Listener synchronisation widget enregistré");
  };

  const removeWidgetSyncListener = () => {
    if (subscription.current) {
      subscription.current.remove();
      subscription.current = null;
      console.log("✅ Listener synchronisation widget supprimé");
    }
  };

  return {
    checkWidgetSync,
    clearWidgetSync,
    onWidgetSync,
    removeWidgetSyncListener,
  };
};
