import { useReducer, useRef, useCallback } from "react";
import { Audio } from "expo-av";

// Types pour l'état audio
export interface AudioState {
  // Audio principal (preview)
  isPreviewing: boolean;
  isAudioPlaying: boolean;
  currentPlayingAdhan: string | null;
  playbackPosition: number;
  playbackDuration: number;
  isLoadingPreview: boolean;
  isPaused: boolean;
  sound: Audio.Sound | null;

  // Audio premium
  premiumAdhanSound: Audio.Sound | null;
  isPlayingPremiumAdhan: boolean;
  currentPlayingPremiumAdhan: string | null;
  premiumAdhanPlaybackPosition: number;
  premiumAdhanPlaybackDuration: number;
  isLoadingPremiumAdhan: boolean;
}

// Actions du reducer
export type AudioAction =
  | { type: "SET_PREVIEWING"; payload: boolean }
  | { type: "SET_AUDIO_PLAYING"; payload: boolean }
  | { type: "SET_CURRENT_PLAYING_ADHAN"; payload: string | null }
  | { type: "SET_PLAYBACK_POSITION"; payload: number }
  | { type: "SET_PLAYBACK_DURATION"; payload: number }
  | { type: "SET_LOADING_PREVIEW"; payload: boolean }
  | { type: "SET_PAUSED"; payload: boolean }
  | { type: "SET_SOUND"; payload: Audio.Sound | null }
  | { type: "SET_PREMIUM_ADHAN_SOUND"; payload: Audio.Sound | null }
  | { type: "SET_PLAYING_PREMIUM_ADHAN"; payload: boolean }
  | { type: "SET_CURRENT_PLAYING_PREMIUM_ADHAN"; payload: string | null }
  | { type: "SET_PREMIUM_ADHAN_PLAYBACK_POSITION"; payload: number }
  | { type: "SET_PREMIUM_ADHAN_PLAYBACK_DURATION"; payload: number }
  | { type: "SET_LOADING_PREMIUM_ADHAN"; payload: boolean }
  | { type: "RESET_AUDIO" }
  | { type: "RESET_PREMIUM_AUDIO" }
  | {
      type: "UPDATE_PLAYBACK_STATUS";
      payload: { position: number; duration: number };
    }
  | {
      type: "UPDATE_PREMIUM_PLAYBACK_STATUS";
      payload: { position: number; duration: number };
    };

// État initial
const initialAudioState: AudioState = {
  isPreviewing: false,
  isAudioPlaying: false,
  currentPlayingAdhan: null,
  playbackPosition: 0,
  playbackDuration: 0,
  isLoadingPreview: false,
  isPaused: false,
  sound: null,
  premiumAdhanSound: null,
  isPlayingPremiumAdhan: false,
  currentPlayingPremiumAdhan: null,
  premiumAdhanPlaybackPosition: 0,
  premiumAdhanPlaybackDuration: 0,
  isLoadingPremiumAdhan: false,
};

// Reducer
function audioReducer(state: AudioState, action: AudioAction): AudioState {
  switch (action.type) {
    case "SET_PREVIEWING":
      return { ...state, isPreviewing: action.payload };
    case "SET_AUDIO_PLAYING":
      return { ...state, isAudioPlaying: action.payload };
    case "SET_CURRENT_PLAYING_ADHAN":
      return { ...state, currentPlayingAdhan: action.payload };
    case "SET_PLAYBACK_POSITION":
      return { ...state, playbackPosition: action.payload };
    case "SET_PLAYBACK_DURATION":
      return { ...state, playbackDuration: action.payload };
    case "SET_LOADING_PREVIEW":
      return { ...state, isLoadingPreview: action.payload };
    case "SET_PAUSED":
      return { ...state, isPaused: action.payload };
    case "SET_SOUND":
      return { ...state, sound: action.payload };
    case "SET_PREMIUM_ADHAN_SOUND":
      return { ...state, premiumAdhanSound: action.payload };
    case "SET_PLAYING_PREMIUM_ADHAN":
      return { ...state, isPlayingPremiumAdhan: action.payload };
    case "SET_CURRENT_PLAYING_PREMIUM_ADHAN":
      return { ...state, currentPlayingPremiumAdhan: action.payload };
    case "SET_PREMIUM_ADHAN_PLAYBACK_POSITION":
      return { ...state, premiumAdhanPlaybackPosition: action.payload };
    case "SET_PREMIUM_ADHAN_PLAYBACK_DURATION":
      return { ...state, premiumAdhanPlaybackDuration: action.payload };
    case "SET_LOADING_PREMIUM_ADHAN":
      return { ...state, isLoadingPremiumAdhan: action.payload };
    case "UPDATE_PLAYBACK_STATUS":
      return {
        ...state,
        playbackPosition: action.payload.position,
        playbackDuration: action.payload.duration,
      };
    case "UPDATE_PREMIUM_PLAYBACK_STATUS":
      return {
        ...state,
        premiumAdhanPlaybackPosition: action.payload.position,
        premiumAdhanPlaybackDuration: action.payload.duration,
      };
    case "RESET_AUDIO":
      return {
        ...state,
        isPreviewing: false,
        isAudioPlaying: false,
        currentPlayingAdhan: null,
        playbackPosition: 0,
        playbackDuration: 0,
        isLoadingPreview: false,
        isPaused: false,
        sound: null,
      };
    case "RESET_PREMIUM_AUDIO":
      return {
        ...state,
        premiumAdhanSound: null,
        isPlayingPremiumAdhan: false,
        currentPlayingPremiumAdhan: null,
        premiumAdhanPlaybackPosition: 0,
        premiumAdhanPlaybackDuration: 0,
        isLoadingPremiumAdhan: false,
      };
    default:
      return state;
  }
}

// Hook personnalisé
export function useAudioPlayer() {
  const [state, dispatch] = useReducer(audioReducer, initialAudioState);
  const soundRef = useRef<Audio.Sound | null>(null);
  const premiumSoundRef = useRef<Audio.Sound | null>(null);

  // Fonction pour formater le temps
  const formatTime = useCallback((milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  // Actions pour l'audio principal
  const setIsPreviewing = useCallback((value: boolean) => {
    dispatch({ type: "SET_PREVIEWING", payload: value });
  }, []);

  const setIsAudioPlaying = useCallback((value: boolean) => {
    dispatch({ type: "SET_AUDIO_PLAYING", payload: value });
  }, []);

  const setCurrentPlayingAdhan = useCallback((value: string | null) => {
    dispatch({ type: "SET_CURRENT_PLAYING_ADHAN", payload: value });
  }, []);

  const setPlaybackPosition = useCallback((value: number) => {
    dispatch({ type: "SET_PLAYBACK_POSITION", payload: value });
  }, []);

  const setPlaybackDuration = useCallback((value: number) => {
    dispatch({ type: "SET_PLAYBACK_DURATION", payload: value });
  }, []);

  const setIsLoadingPreview = useCallback((value: boolean) => {
    dispatch({ type: "SET_LOADING_PREVIEW", payload: value });
  }, []);

  const setIsPaused = useCallback((value: boolean) => {
    dispatch({ type: "SET_PAUSED", payload: value });
  }, []);

  const setSound = useCallback((value: Audio.Sound | null) => {
    dispatch({ type: "SET_SOUND", payload: value });
  }, []);

  // Actions pour l'audio premium
  const setPremiumAdhanSound = useCallback((value: Audio.Sound | null) => {
    dispatch({ type: "SET_PREMIUM_ADHAN_SOUND", payload: value });
  }, []);

  const setIsPlayingPremiumAdhan = useCallback((value: boolean) => {
    dispatch({ type: "SET_PLAYING_PREMIUM_ADHAN", payload: value });
  }, []);

  const setCurrentPlayingPremiumAdhan = useCallback((value: string | null) => {
    dispatch({ type: "SET_CURRENT_PLAYING_PREMIUM_ADHAN", payload: value });
  }, []);

  const setPremiumAdhanPlaybackPosition = useCallback((value: number) => {
    dispatch({ type: "SET_PREMIUM_ADHAN_PLAYBACK_POSITION", payload: value });
  }, []);

  const setPremiumAdhanPlaybackDuration = useCallback((value: number) => {
    dispatch({ type: "SET_PREMIUM_ADHAN_PLAYBACK_DURATION", payload: value });
  }, []);

  const setIsLoadingPremiumAdhan = useCallback((value: boolean) => {
    dispatch({ type: "SET_LOADING_PREMIUM_ADHAN", payload: value });
  }, []);

  // Actions de réinitialisation
  const resetAudio = useCallback(() => {
    dispatch({ type: "RESET_AUDIO" });
  }, []);

  const resetPremiumAudio = useCallback(() => {
    dispatch({ type: "RESET_PREMIUM_AUDIO" });
  }, []);

  // Actions de mise à jour du statut
  const updatePlaybackStatus = useCallback(
    (position: number, duration: number) => {
      dispatch({
        type: "UPDATE_PLAYBACK_STATUS",
        payload: { position, duration },
      });
    },
    []
  );

  const updatePremiumPlaybackStatus = useCallback(
    (position: number, duration: number) => {
      dispatch({
        type: "UPDATE_PREMIUM_PLAYBACK_STATUS",
        payload: { position, duration },
      });
    },
    []
  );

  return {
    // État
    audioState: state,
    soundRef,
    premiumSoundRef,

    // Actions audio principal
    setIsPreviewing,
    setIsAudioPlaying,
    setCurrentPlayingAdhan,
    setPlaybackPosition,
    setPlaybackDuration,
    setIsLoadingPreview,
    setIsPaused,
    setSound,

    // Actions audio premium
    setPremiumAdhanSound,
    setIsPlayingPremiumAdhan,
    setCurrentPlayingPremiumAdhan,
    setPremiumAdhanPlaybackPosition,
    setPremiumAdhanPlaybackDuration,
    setIsLoadingPremiumAdhan,

    // Actions de réinitialisation
    resetAudio,
    resetPremiumAudio,

    // Actions de mise à jour
    updatePlaybackStatus,
    updatePremiumPlaybackStatus,

    // Utilitaires
    formatTime,
  };
}
