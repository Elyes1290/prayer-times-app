import { useAudioPlayer } from "./useAudioPlayer";
import { useCitySearchReducer } from "./useCitySearchReducer";
import { useDownloadReducer } from "./useDownloadReducer";
import { useUIReducer } from "./useUIReducer";
import { usePremiumContentReducer } from "./usePremiumContentReducer";

// Hook central optimisé qui combine tous les reducers
export function useSettingsOptimized() {
  // Utilisation des hooks avec reducers
  const audioPlayer = useAudioPlayer();
  const citySearch = useCitySearchReducer();
  const downloadManager = useDownloadReducer();
  const uiManager = useUIReducer();
  const premiumContent = usePremiumContentReducer();

  return {
    // Audio Player
    audioPlayer,

    // City Search
    citySearch,

    // Download Manager
    downloadManager,

    // UI Manager
    uiManager,

    // Premium Content
    premiumContent,
  };
}

// Export de types pour faciliter l'usage
export type SettingsOptimizedHook = ReturnType<typeof useSettingsOptimized>;
