/**
 * Normalise durée / position renvoyées par le service audio natif ou Expo AV.
 * Android/iOS peuvent envoyer la durée en secondes (< 10000) alors que la position est en ms.
 */
export function normalizeDurationMillis(
  positionMs: number,
  rawDuration: number,
): number {
  if (!Number.isFinite(rawDuration) || rawDuration <= 0) {
    return 0;
  }

  const rounded = Math.round(rawDuration);

  // Déjà en millisecondes (sourate longue typique)
  if (rounded >= 10000) {
    return rounded;
  }

  // Récitation complète : durée en secondes (ex. Al-Fatiha ~99, Baqara ~7000)
  return rounded * 1000;
}

export type SurahCatalogEntry = { id: number; name_simple: string };

/** Ex. "Al-Baqara (002) - Récitateur" → 2 ; "Al-Baqara - Récitateur" avec catalogue */
export function parseSurahNumberFromServiceTitle(
  title: string | null | undefined,
  catalog?: SurahCatalogEntry[],
): number | null {
  if (!title) return null;
  const match = title.match(/\((\d{1,3})\)/);
  if (match) {
    const n = parseInt(match[1], 10);
    return n >= 1 && n <= 114 ? n : null;
  }
  if (!catalog?.length) return null;
  const namePart = title.split(" - ")[0]?.trim().toLowerCase();
  const found = catalog.find(
    (s) =>
      title.toLowerCase().includes(s.name_simple.toLowerCase()) ||
      namePart === s.name_simple.toLowerCase(),
  );
  return found?.id ?? null;
}

/** Ne remplace pas une durée connue par 0 (événements de progression Android). */
export function mergeDurationMillis(
  previousMs: number,
  positionMs: number,
  rawDuration: number,
): number {
  const normalized = normalizeDurationMillis(positionMs, rawDuration);
  if (normalized > 0) {
    return normalized;
  }
  return previousMs > 0 ? previousMs : 0;
}

/** Durée max crédible par sourate (rejette une durée héritée de la piste précédente). */
export function maxPlausibleDurationMs(surahNumber: number): number {
  if (surahNumber === 1) return 6 * 60 * 1000;
  if (surahNumber <= 10) return 45 * 60 * 1000;
  if (surahNumber <= 50) return 90 * 60 * 1000;
  return 6 * 60 * 60 * 1000;
}

/**
 * Estimation grossière (streaming sans métadonnées uniquement).
 * Ne pas utiliser si le lecteur natif fournit une durée.
 */
export function estimateDurationMsFromFileSizeMb(
  fileSizeMb: number,
  bitrateKbps: number = 128,
): number {
  if (!Number.isFinite(fileSizeMb) || fileSizeMb <= 0) {
    return 0;
  }
  const bytes = fileSizeMb * 1024 * 1024;
  const seconds = (bytes * 8) / (bitrateKbps * 1000);
  return Math.round(seconds * 1000);
}

/**
 * Indique si une durée normalisée est incohérente avec la sourate affichée
 * (ex. titre Fatiha mais durée encore celle de Baqara).
 */
export function isStaleOrImplausibleDuration(
  selectedSurah: number,
  serviceSurah: number | null,
  normalizedMs: number,
): boolean {
  if (normalizedMs <= 0) {
    return false;
  }
  if (serviceSurah != null && serviceSurah !== selectedSurah) {
    return true;
  }
  return normalizedMs > maxPlausibleDurationMs(selectedSurah);
}

/**
 * Durée affichée : priorité à la durée réelle du lecteur audio.
 * L'estimation par taille fichier n'est qu'un filet si duration === 0 (stream).
 */
export function resolvePlaybackDurationMs(options: {
  rawDuration: number;
  positionMs: number;
  previousMs: number;
  fileSizeMb?: number;
  /** Durée exacte depuis l'API (fichier lu sur le serveur) */
  catalogDurationMs?: number;
  selectedSurah: number;
  serviceSurah: number | null;
  iosScaledRaw?: number;
}): number {
  const {
    rawDuration,
    positionMs,
    previousMs,
    fileSizeMb,
    catalogDurationMs,
    selectedSurah,
    serviceSurah,
    iosScaledRaw,
  } = options;

  const rawForNormalize = iosScaledRaw ?? rawDuration;
  const normalized = normalizeDurationMillis(positionMs, rawForNormalize);
  const catalogMs =
    catalogDurationMs && catalogDurationMs > 0 ? catalogDurationMs : 0;
  const fallbackMs = catalogMs > 0 ? catalogMs : 0;

  if (normalized > 0) {
    // Titre service ou durée incohérente avec la sourate affichée
    if (isStaleOrImplausibleDuration(selectedSurah, serviceSurah, normalized)) {
      return fallbackMs > 0 ? fallbackMs : 0;
    }
    // Stream : MediaPlayer peut sous-estimer (ex. 27s) → priorité catalogue.
    // Si le catalogue est faux (ex. 5s) et le natif correct (59s) → priorité lecteur.
    const tolerance = 0.2;
    if (catalogMs > 0 && normalized > 0) {
      if (normalized < catalogMs * (1 - tolerance)) {
        return catalogMs;
      }
      if (normalized > catalogMs * (1 + tolerance)) {
        return normalized;
      }
    }
    return normalized;
  }

  if (catalogMs > 0) {
    return mergeDurationMillis(previousMs, positionMs, catalogMs);
  }

  return mergeDurationMillis(previousMs, positionMs, rawForNormalize);
}

