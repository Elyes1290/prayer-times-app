import { useReducer, useCallback } from "react";

// Types pour l'état de téléchargement
export interface DownloadState {
  downloadingAdhans: Set<string>;
  downloadProgress: { [key: string]: number };
  downloadControllers: { [key: string]: () => void };
}

// Actions du reducer
export type DownloadAction =
  | { type: "ADD_DOWNLOADING_ADHAN"; payload: string }
  | { type: "REMOVE_DOWNLOADING_ADHAN"; payload: string }
  | { type: "SET_DOWNLOADING_ADHANS"; payload: Set<string> }
  | {
      type: "SET_DOWNLOAD_PROGRESS";
      payload: { adhanId: string; progress: number };
    }
  | { type: "CLEAR_DOWNLOAD_PROGRESS"; payload: string }
  | {
      type: "SET_DOWNLOAD_CONTROLLER";
      payload: { adhanId: string; controller: () => void };
    }
  | { type: "REMOVE_DOWNLOAD_CONTROLLER"; payload: string }
  | { type: "RESET_DOWNLOADS" };

// État initial
const initialDownloadState: DownloadState = {
  downloadingAdhans: new Set(),
  downloadProgress: {},
  downloadControllers: {},
};

// Reducer
function downloadReducer(
  state: DownloadState,
  action: DownloadAction
): DownloadState {
  switch (action.type) {
    case "ADD_DOWNLOADING_ADHAN":
      return {
        ...state,
        downloadingAdhans: new Set([
          ...state.downloadingAdhans,
          action.payload,
        ]),
      };
    case "REMOVE_DOWNLOADING_ADHAN":
      const newDownloadingAdhans = new Set(state.downloadingAdhans);
      newDownloadingAdhans.delete(action.payload);
      return {
        ...state,
        downloadingAdhans: newDownloadingAdhans,
      };
    case "SET_DOWNLOADING_ADHANS":
      return {
        ...state,
        downloadingAdhans: action.payload,
      };
    case "SET_DOWNLOAD_PROGRESS":
      return {
        ...state,
        downloadProgress: {
          ...state.downloadProgress,
          [action.payload.adhanId]: action.payload.progress,
        },
      };
    case "CLEAR_DOWNLOAD_PROGRESS":
      const newProgress = { ...state.downloadProgress };
      delete newProgress[action.payload];
      return {
        ...state,
        downloadProgress: newProgress,
      };
    case "SET_DOWNLOAD_CONTROLLER":
      return {
        ...state,
        downloadControllers: {
          ...state.downloadControllers,
          [action.payload.adhanId]: action.payload.controller,
        },
      };
    case "REMOVE_DOWNLOAD_CONTROLLER":
      const newControllers = { ...state.downloadControllers };
      delete newControllers[action.payload];
      return {
        ...state,
        downloadControllers: newControllers,
      };
    case "RESET_DOWNLOADS":
      return initialDownloadState;
    default:
      return state;
  }
}

// Hook personnalisé
export function useDownloadReducer() {
  const [state, dispatch] = useReducer(downloadReducer, initialDownloadState);

  // Actions
  const addDownloadingAdhan = useCallback((adhanId: string) => {
    dispatch({ type: "ADD_DOWNLOADING_ADHAN", payload: adhanId });
  }, []);

  const removeDownloadingAdhan = useCallback((adhanId: string) => {
    dispatch({ type: "REMOVE_DOWNLOADING_ADHAN", payload: adhanId });
  }, []);

  const setDownloadingAdhans = useCallback((adhans: Set<string>) => {
    dispatch({ type: "SET_DOWNLOADING_ADHANS", payload: adhans });
  }, []);

  const setDownloadProgress = useCallback(
    (adhanId: string, progress: number) => {
      dispatch({
        type: "SET_DOWNLOAD_PROGRESS",
        payload: { adhanId, progress },
      });
    },
    []
  );

  const clearDownloadProgress = useCallback((adhanId: string) => {
    dispatch({ type: "CLEAR_DOWNLOAD_PROGRESS", payload: adhanId });
  }, []);

  const setDownloadController = useCallback(
    (adhanId: string, controller: () => void) => {
      dispatch({
        type: "SET_DOWNLOAD_CONTROLLER",
        payload: { adhanId, controller },
      });
    },
    []
  );

  const removeDownloadController = useCallback((adhanId: string) => {
    dispatch({ type: "REMOVE_DOWNLOAD_CONTROLLER", payload: adhanId });
  }, []);

  const resetDownloads = useCallback(() => {
    dispatch({ type: "RESET_DOWNLOADS" });
  }, []);

  return {
    // État
    downloadState: state,

    // Actions
    addDownloadingAdhan,
    removeDownloadingAdhan,
    setDownloadingAdhans,
    setDownloadProgress,
    clearDownloadProgress,
    setDownloadController,
    removeDownloadController,
    resetDownloads,
  };
}
