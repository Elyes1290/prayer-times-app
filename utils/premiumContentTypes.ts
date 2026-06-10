// Types partagés — évite la dépendance circulaire customServerManager ↔ premiumContent
export interface PremiumContent {
  id: string;
  type: "adhan" | "quran" | "dhikr" | "theme";
  title: string;
  description: string;
  fileUrl: string;
  fileSize: number;
  durationMs?: number;
  version: string;
  isDownloaded: boolean;
  downloadPath?: string;
  reciter?: string;
  surahNumber?: number;
  surahName?: string;
}

export interface PremiumCatalog {
  adhanVoices: PremiumContent[];
  quranRecitations: PremiumContent[];
  dhikrCollections: PremiumContent[];
  premiumThemes: PremiumContent[];
}
