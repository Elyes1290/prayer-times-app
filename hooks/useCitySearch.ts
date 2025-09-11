// hooks/useCitySearch.ts
import { useRef, useState } from "react";
import removeAccents from "remove-accents";
import * as RNLocalize from "react-native-localize";

export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    country: string;
    [key: string]: any;
  };
}

export function useCitySearch() {
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const language = RNLocalize.getLocales()[0]?.languageTag || "fr-FR";

  async function searchCity(query: string) {
    // 🔧 CORRECTION : Annuler la requête précédente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        // 🔧 CORRECTION : Créer un nouveau AbortController pour cette requête
        abortControllerRef.current = new AbortController();
        let q1 = query;
        let q2 = removeAccents(query);
        let q3 = "";
        if (q1.toLowerCase() === "geneve") q3 = "geneva";
        const queries = [q1, q2];
        if (q3) queries.push(q3);

        let allResults: NominatimResult[] = [];
        for (const q of queries) {
          const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            q
          )}&format=json&addressdetails=1&limit=5&accept-language=${language}`;

          const res = await fetch(url, {
            headers: {
              "User-Agent": "ZayrPrayerApp/1.0 (contact@example.com)",
            },
            signal: abortControllerRef.current?.signal,
          });

          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }

          const data: NominatimResult[] = await res.json();
          allResults = [...allResults, ...data];
        }
        // déduplication
        const unique = allResults.filter(
          (v, i, arr) =>
            arr.findIndex((el) => el.lat === v.lat && el.lon === v.lon) === i
        );
        setResults(unique);
      } catch (e) {
        // 🔧 CORRECTION : Ne pas traiter les erreurs d'annulation comme des erreurs
        if (e instanceof Error && e.name !== "AbortError") {
          console.log("🔍 Erreur recherche ville:", e.message);
        }
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);
  }

  // 🔧 CORRECTION : Nettoyer les références lors du démontage
  const cleanup = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return { results, loading, searchCity, setResults, cleanup };
}
