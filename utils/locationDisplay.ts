import type { LocationGeocodedAddress } from "expo-location";

/** Libellé ville affichable à partir d'un résultat de géocodage. */
export function formatGeocodeLabel(
  result: LocationGeocodedAddress | null | undefined,
): string | null {
  if (!result) {
    return null;
  }

  const cityName = result.city || result.district || result.region;
  const country = result.country;

  if (cityName && country) {
    return `${cityName}, ${country}`;
  }

  if (cityName) {
    return cityName;
  }

  return null;
}

export type StoredAutoLocation = {
  lat: number;
  lon: number;
  city?: string;
};

/** Ville en cache pour le mode auto (iOS « Autoriser une fois », etc.). */
export function getCachedAutoLocationCity(
  autoLocation: StoredAutoLocation | null | undefined,
): string | null {
  const city = autoLocation?.city?.trim();
  return city ? city : null;
}
