import { useReducer, useCallback } from "react";

// Types pour l'état UI
export interface UIState {
  showPremiumModal: boolean;
  isApplyingChanges: boolean;
  showSuccessModal: boolean;
}

// Actions du reducer
export type UIAction =
  | { type: "SET_SHOW_PREMIUM_MODAL"; payload: boolean }
  | { type: "SET_IS_APPLYING_CHANGES"; payload: boolean }
  | { type: "SET_SHOW_SUCCESS_MODAL"; payload: boolean }
  | { type: "TOGGLE_PREMIUM_MODAL" }
  | { type: "TOGGLE_SUCCESS_MODAL" }
  | { type: "RESET_UI" };

// État initial
const initialUIState: UIState = {
  showPremiumModal: false,
  isApplyingChanges: false,
  showSuccessModal: false,
};

// Reducer
function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case "SET_SHOW_PREMIUM_MODAL":
      return { ...state, showPremiumModal: action.payload };
    case "SET_IS_APPLYING_CHANGES":
      return { ...state, isApplyingChanges: action.payload };
    case "SET_SHOW_SUCCESS_MODAL":
      return { ...state, showSuccessModal: action.payload };
    case "TOGGLE_PREMIUM_MODAL":
      return { ...state, showPremiumModal: !state.showPremiumModal };
    case "TOGGLE_SUCCESS_MODAL":
      return { ...state, showSuccessModal: !state.showSuccessModal };
    case "RESET_UI":
      return initialUIState;
    default:
      return state;
  }
}

// Hook personnalisé
export function useUIReducer() {
  const [state, dispatch] = useReducer(uiReducer, initialUIState);

  // Actions
  const setShowPremiumModal = useCallback((value: boolean) => {
    dispatch({ type: "SET_SHOW_PREMIUM_MODAL", payload: value });
  }, []);

  const setIsApplyingChanges = useCallback((value: boolean) => {
    dispatch({ type: "SET_IS_APPLYING_CHANGES", payload: value });
  }, []);

  const setShowSuccessModal = useCallback((value: boolean) => {
    dispatch({ type: "SET_SHOW_SUCCESS_MODAL", payload: value });
  }, []);

  const togglePremiumModal = useCallback(() => {
    dispatch({ type: "TOGGLE_PREMIUM_MODAL" });
  }, []);

  const toggleSuccessModal = useCallback(() => {
    dispatch({ type: "TOGGLE_SUCCESS_MODAL" });
  }, []);

  const resetUI = useCallback(() => {
    dispatch({ type: "RESET_UI" });
  }, []);

  return {
    // État
    uiState: state,

    // Actions
    setShowPremiumModal,
    setIsApplyingChanges,
    setShowSuccessModal,
    togglePremiumModal,
    toggleSuccessModal,
    resetUI,
  };
}
