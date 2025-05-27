import { useContext, useEffect, useState } from "react";
import * as Location from "expo-location";
import { SettingsContext } from "../contexts/SettingsContext";

export function useLocation() {
  const { locationMode, manualLocation } = useContext(SettingsContext);

  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let sub: Location.LocationSubscription | undefined;

    if (locationMode === "manual") {
      if (manualLocation && manualLocation.lat && manualLocation.lon) {
        setLocation({
          coords: {
            latitude: manualLocation.lat,
            longitude: manualLocation.lon,
            altitude: null,
            accuracy: null,
            heading: null,
            speed: null,
            altitudeAccuracy: null,
          },
          timestamp: Date.now(),
        } as Location.LocationObject);
        setError(null);
      } else {
        setLocation(null);
        setError(null);
      }
      return;
    }

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Permission de localisation refusée");
        setLocation(null);
        return;
      }
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Highest, distanceInterval: 10 },
        (loc) => {
          setLocation(loc);
          setError(null);
        }
      );
    })();

    return () => sub?.remove?.();
  }, [locationMode, manualLocation]);

  async function reverseGeocode(coords: Location.LocationObjectCoords) {
    try {
      const results = await Location.reverseGeocodeAsync(coords);
      return results;
    } catch {
      return null;
    }
  }

  return { location, error, reverseGeocode };
}
