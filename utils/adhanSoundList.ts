import type { AdhanSoundKey } from "../contexts/SettingsContext";

export const BUILTIN_ADHAN_SOUND_KEYS: AdhanSoundKey[] = [
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
];

/** ID canonique aligné sur getAdhanStoragePath (un seul entrée par adhan premium). */
export function canonicalAdhanContentId(id: string): string {
  const clean = id.replace(/^adhan_/, "");
  return `adhan_${clean}`;
}

export type DownloadedAdhanRow = {
  contentId: string;
  title: string;
  downloadPath: string;
};

/**
 * markAsDownloaded enregistre parfois 2 clés (adhan_foo + foo) pour le même MP3.
 * On ne garde qu'une ligne par chemin fichier.
 */
export function dedupeDownloadedAdhanRows(
  rows: DownloadedAdhanRow[]
): DownloadedAdhanRow[] {
  const byPath = new Map<string, DownloadedAdhanRow>();

  for (const row of rows) {
    const path = row.downloadPath.replace("file://", "");
    const existing = byPath.get(path);
    if (!existing) {
      byPath.set(path, row);
      continue;
    }
    if (
      row.contentId.startsWith("adhan_") &&
      !existing.contentId.startsWith("adhan_")
    ) {
      byPath.set(path, row);
    }
  }

  return Array.from(byPath.values());
}

export function mergeAvailableAdhanSounds(
  baseSounds: AdhanSoundKey[],
  downloaded: DownloadedAdhanRow[]
): { sounds: AdhanSoundKey[]; titles: Record<string, string> } {
  const titles: Record<string, string> = {};
  const premiumIds: AdhanSoundKey[] = [];
  const seen = new Set<string>(baseSounds);

  for (const row of dedupeDownloadedAdhanRows(downloaded)) {
    const id = canonicalAdhanContentId(row.contentId) as AdhanSoundKey;
    if (seen.has(id)) continue;
    seen.add(id);
    premiumIds.push(id);
    titles[id] = row.title;
  }

  return { sounds: [...baseSounds, ...premiumIds], titles };
}

export function areAdhanSoundListsEqual(
  a: readonly AdhanSoundKey[],
  b: readonly AdhanSoundKey[]
): boolean {
  if (a.length !== b.length) return false;
  return a.every((sound, index) => sound === b[index]);
}

export function arePremiumSoundTitlesEqual(
  a: Record<string, string>,
  b: Record<string, string>
): boolean {
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  return aKeys.every((key) => a[key] === b[key]);
}
