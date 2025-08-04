import { useReducer, useCallback } from "react";
import { NominatimResult } from "./useCitySearch";

// Types pour l'état de recherche de ville
export interface CitySearchState {
  cityInput: string;
  citySearchResults: NominatimResult[];
  citySearchLoading: boolean;
}

// Actions du reducer
export type CitySearchAction =
  | { type: "SET_CITY_INPUT"; payload: string }
  | { type: "SET_SEARCH_RESULTS"; payload: NominatimResult[] }
  | { type: "SET_SEARCH_LOADING"; payload: boolean }
  | { type: "CLEAR_SEARCH_RESULTS" }
  | { type: "RESET_SEARCH" };

// État initial
const initialCitySearchState: CitySearchState = {
  cityInput: "",
  citySearchResults: [],
  citySearchLoading: false,
};

// Reducer
function citySearchReducer(
  state: CitySearchState,
  action: CitySearchAction
): CitySearchState {
  switch (action.type) {
    case "SET_CITY_INPUT":
      return { ...state, cityInput: action.payload };
    case "SET_SEARCH_RESULTS":
      return { ...state, citySearchResults: action.payload };
    case "SET_SEARCH_LOADING":
      return { ...state, citySearchLoading: action.payload };
    case "CLEAR_SEARCH_RESULTS":
      return { ...state, citySearchResults: [] };
    case "RESET_SEARCH":
      return initialCitySearchState;
    default:
      return state;
  }
}

// Hook personnalisé
export function useCitySearchReducer() {
  const [state, dispatch] = useReducer(
    citySearchReducer,
    initialCitySearchState
  );

  // Actions
  const setCityInput = useCallback((value: string) => {
    dispatch({ type: "SET_CITY_INPUT", payload: value });
  }, []);

  const setSearchResults = useCallback((results: NominatimResult[]) => {
    dispatch({ type: "SET_SEARCH_RESULTS", payload: results });
  }, []);

  const setSearchLoading = useCallback((value: boolean) => {
    dispatch({ type: "SET_SEARCH_LOADING", payload: value });
  }, []);

  const clearSearchResults = useCallback(() => {
    dispatch({ type: "CLEAR_SEARCH_RESULTS" });
  }, []);

  const resetSearch = useCallback(() => {
    dispatch({ type: "RESET_SEARCH" });
  }, []);

  return {
    // État
    citySearchState: state,

    // Actions
    setCityInput,
    setSearchResults,
    setSearchLoading,
    clearSearchResults,
    resetSearch,
  };
}
