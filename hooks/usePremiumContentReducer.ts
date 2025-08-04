import { useReducer, useCallback } from "react";
import { AdhanSoundKey } from "../contexts/SettingsContext";
import { PremiumContent } from "../utils/premiumContent";

// Types pour l'état du contenu premium
export interface PremiumContentState {
  availableSounds: AdhanSoundKey[];
  premiumSoundTitles: { [key: string]: string };
  availableAdhanVoices: PremiumContent[];
}

// Actions du reducer
export type PremiumContentAction =
  | { type: "SET_AVAILABLE_SOUNDS"; payload: AdhanSoundKey[] }
  | { type: "ADD_SOUND"; payload: AdhanSoundKey }
  | { type: "REMOVE_SOUND"; payload: AdhanSoundKey }
  | { type: "SET_PREMIUM_SOUND_TITLES"; payload: { [key: string]: string } }
  | { type: "SET_SOUND_TITLE"; payload: { soundId: string; title: string } }
  | { type: "SET_AVAILABLE_ADHAN_VOICES"; payload: PremiumContent[] }
  | { type: "ADD_ADHAN_VOICE"; payload: PremiumContent }
  | { type: "REMOVE_ADHAN_VOICE"; payload: string }
  | {
      type: "UPDATE_ADHAN_VOICE";
      payload: { id: string; updates: Partial<PremiumContent> };
    }
  | { type: "RESET_PREMIUM_CONTENT" };

// État initial
const initialPremiumContentState: PremiumContentState = {
  availableSounds: [
    "ahmadnafees",
    "ahmedelkourdi",
    "dubai",
    "karljenkins",
    "mansourzahrani",
    "misharyrachid",
    "mustafaozcan",
    "adhamalsharqawe",
    "adhanaljazaer",
    "masjidquba",
    "islamsobhi",
  ],
  premiumSoundTitles: {},
  availableAdhanVoices: [],
};

// Reducer
function premiumContentReducer(
  state: PremiumContentState,
  action: PremiumContentAction
): PremiumContentState {
  switch (action.type) {
    case "SET_AVAILABLE_SOUNDS":
      return { ...state, availableSounds: action.payload };
    case "ADD_SOUND":
      if (!state.availableSounds.includes(action.payload)) {
        return {
          ...state,
          availableSounds: [...state.availableSounds, action.payload],
        };
      }
      return state;
    case "REMOVE_SOUND":
      return {
        ...state,
        availableSounds: state.availableSounds.filter(
          (sound) => sound !== action.payload
        ),
      };
    case "SET_PREMIUM_SOUND_TITLES":
      return { ...state, premiumSoundTitles: action.payload };
    case "SET_SOUND_TITLE":
      return {
        ...state,
        premiumSoundTitles: {
          ...state.premiumSoundTitles,
          [action.payload.soundId]: action.payload.title,
        },
      };
    case "SET_AVAILABLE_ADHAN_VOICES":
      return { ...state, availableAdhanVoices: action.payload };
    case "ADD_ADHAN_VOICE":
      const existingIndex = state.availableAdhanVoices.findIndex(
        (voice) => voice.id === action.payload.id
      );
      if (existingIndex === -1) {
        return {
          ...state,
          availableAdhanVoices: [...state.availableAdhanVoices, action.payload],
        };
      }
      return state;
    case "REMOVE_ADHAN_VOICE":
      return {
        ...state,
        availableAdhanVoices: state.availableAdhanVoices.filter(
          (voice) => voice.id !== action.payload
        ),
      };
    case "UPDATE_ADHAN_VOICE":
      return {
        ...state,
        availableAdhanVoices: state.availableAdhanVoices.map((voice) =>
          voice.id === action.payload.id
            ? { ...voice, ...action.payload.updates }
            : voice
        ),
      };
    case "RESET_PREMIUM_CONTENT":
      return initialPremiumContentState;
    default:
      return state;
  }
}

// Hook personnalisé
export function usePremiumContentReducer() {
  const [state, dispatch] = useReducer(
    premiumContentReducer,
    initialPremiumContentState
  );

  // Actions pour les sons disponibles
  const setAvailableSounds = useCallback((sounds: AdhanSoundKey[]) => {
    dispatch({ type: "SET_AVAILABLE_SOUNDS", payload: sounds });
  }, []);

  const addSound = useCallback((sound: AdhanSoundKey) => {
    dispatch({ type: "ADD_SOUND", payload: sound });
  }, []);

  const removeSound = useCallback((sound: AdhanSoundKey) => {
    dispatch({ type: "REMOVE_SOUND", payload: sound });
  }, []);

  // Actions pour les titres des sons premium
  const setPremiumSoundTitles = useCallback(
    (titles: { [key: string]: string }) => {
      dispatch({ type: "SET_PREMIUM_SOUND_TITLES", payload: titles });
    },
    []
  );

  const setSoundTitle = useCallback((soundId: string, title: string) => {
    dispatch({ type: "SET_SOUND_TITLE", payload: { soundId, title } });
  }, []);

  // Actions pour les voix d'adhan disponibles
  const setAvailableAdhanVoices = useCallback((voices: PremiumContent[]) => {
    dispatch({ type: "SET_AVAILABLE_ADHAN_VOICES", payload: voices });
  }, []);

  const addAdhanVoice = useCallback((voice: PremiumContent) => {
    dispatch({ type: "ADD_ADHAN_VOICE", payload: voice });
  }, []);

  const removeAdhanVoice = useCallback((voiceId: string) => {
    dispatch({ type: "REMOVE_ADHAN_VOICE", payload: voiceId });
  }, []);

  const updateAdhanVoice = useCallback(
    (id: string, updates: Partial<PremiumContent>) => {
      dispatch({ type: "UPDATE_ADHAN_VOICE", payload: { id, updates } });
    },
    []
  );

  const resetPremiumContent = useCallback(() => {
    dispatch({ type: "RESET_PREMIUM_CONTENT" });
  }, []);

  return {
    // État
    premiumContentState: state,

    // Actions pour les sons disponibles
    setAvailableSounds,
    addSound,
    removeSound,

    // Actions pour les titres des sons premium
    setPremiumSoundTitles,
    setSoundTitle,

    // Actions pour les voix d'adhan disponibles
    setAvailableAdhanVoices,
    addAdhanVoice,
    removeAdhanVoice,
    updateAdhanVoice,

    // Actions de réinitialisation
    resetPremiumContent,
  };
}
