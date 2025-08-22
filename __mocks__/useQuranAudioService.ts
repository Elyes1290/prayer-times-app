// Mock pour useQuranAudioService sans dépendance à jest
export const useQuranAudioService = () => {
  return {
    audioState: {
      isPlaying: false,
      currentSurah: "",
      currentReciter: "",
      position: 0,
      duration: 0,
      isPremium: false,
      isServiceRunning: false,
    },
    startService: () => Promise.resolve(),
    stopService: () => Promise.resolve(),
    loadAudio: () => Promise.resolve(),
    playAudio: () => Promise.resolve(),
    pauseAudio: () => Promise.resolve(),
    stopAudio: () => Promise.resolve(),
    seekToPosition: () => Promise.resolve(),
    updatePremiumStatus: () => Promise.resolve(),
    isServiceAvailable: () => false,
    getCurrentState: () => ({
      isPlaying: false,
      currentSurah: "",
      currentReciter: "",
      position: 0,
      duration: 0,
      isPremium: false,
      isServiceRunning: false,
    }),
  };
};
