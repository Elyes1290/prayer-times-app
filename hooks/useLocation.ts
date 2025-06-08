import { useContext } from "react";
import * as Location from "expo-location";
import { SettingsContext, Coords } from "../contexts/SettingsContext";

function coordsToLocationObject(coords: Coords): Location.LocationObject {
  return {
    coords: {
      latitude: coords.lat,
      longitude: coords.lon,
      altitude: null,
      accuracy: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  };
}

export function useLocation() {
  const {
    locationMode,
    manualLocation,
    autoLocation,
    errorMsg,
    isLoading,
    isRefreshingLocation,
  } = useContext(SettingsContext);

  let location: Location.LocationObject | null = null;

  if (locationMode === "manual" && manualLocation) {
    location = coordsToLocationObject({
      lat: manualLocation.lat,
      lon: manualLocation.lon,
    });
  } else if (locationMode === "auto" && autoLocation) {
    location = coordsToLocationObject(autoLocation);
  }

  async function reverseGeocode(coords: Location.LocationObjectCoords) {
    try {
      const results = await Location.reverseGeocodeAsync(coords);
      return results.length > 0 ? results[0] : null;
    } catch {
      return null;
    }
  }

  return {
    location,
    error: errorMsg,
    isLoading: isLoading || isRefreshingLocation,
    reverseGeocode,
  };
}
