// utils/ramadan/sync.ts
//
// Synchronisation de la progression Ramadan avec le serveur (abonnés connectés).
// Hors ligne d'abord : les données locales font foi, la synchro est « au mieux » et ne
// lève jamais d'erreur (un échec réseau ne doit pas gêner l'utilisateur).
//
// La fusion est faite PAR LE SERVEUR : on envoie nos données, il fusionne avec l'existant
// (version la plus récente par clé) et renvoie le résultat, que l'on adopte.

import ApiClient from "../apiClient";
import {
  mergeRamadanData,
  normalizeData,
  saveRamadanData,
  type RamadanData,
} from "./storage";

/** Intervalle minimal entre deux synchronisations automatiques. */
export const RAMADAN_SYNC_MIN_INTERVAL_MS = 60_000;

let lastSyncAt = 0;
let inFlight: Promise<RamadanData | null> | null = null;

/**
 * Envoie `local` au serveur et retourne les données fusionnées (déjà enregistrées en
 * local), ou null si la synchro n'a pas eu lieu (hors ligne, non connecté, non abonné…).
 *
 * @param force ignore l'intervalle minimal (ex. action explicite de l'utilisateur).
 */
export async function syncRamadanData(
  local: RamadanData,
  { force = false }: { force?: boolean } = {},
): Promise<RamadanData | null> {
  if (local.hijriYear <= 0) return null;
  if (inFlight) return inFlight;

  const now = Date.now();
  if (!force && now - lastSyncAt < RAMADAN_SYNC_MIN_INTERVAL_MS) {
    return null;
  }

  inFlight = (async () => {
    try {
      const response = await ApiClient.saveRamadanProgress(local.hijriYear, local);
      const remoteRaw = (response as { data?: { data?: unknown } })?.data?.data;
      if (!remoteRaw) return null;

      lastSyncAt = Date.now();
      const remote = normalizeData(remoteRaw, local.hijriYear);
      // Filet de sécurité : même si le serveur renvoyait moins que ce qu'on a, on ne
      // perd jamais de données locales (la fusion est idempotente).
      const merged = mergeRamadanData(local, remote);
      await saveRamadanData(merged);
      return merged;
    } catch (error) {
      // Hors ligne, 401/403 (non abonné), 5xx… : on réessaiera plus tard.
      console.log("ℹ️ [Ramadan] Synchronisation différée:", error);
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Exposé pour les tests. */
export function __resetRamadanSyncForTests(): void {
  lastSyncAt = 0;
  inFlight = null;
}
