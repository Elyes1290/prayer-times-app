import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";

export interface CDNConfig {
  primaryCDN: string;
  fallbackCDN: string;
  firebaseStorage: string;
  cacheExpiry: number; // en heures
  maxCacheSize: number; // en MB
}

export interface CacheEntry {
  url: string;
  localPath: string;
  downloadedAt: number;
  fileSize: number;
  lastAccessed: number;
  accessCount: number;
}

export class CDNOptimizer {
  private static instance: CDNOptimizer;
  private cacheIndex: Map<string, CacheEntry> = new Map();
  private readonly CACHE_INDEX_KEY = "@cdn_cache_index";
  private readonly CACHE_DIR = `${FileSystem.documentDirectory}cdn_cache/`;

  private config: CDNConfig = {
    // Cloudflare R2 (très économique pour la bande passante)
    primaryCDN: "https://cdn.prayerapp.r2.dev",
    // Bunny CDN comme fallback (excellent rapport qualité/prix)
    fallbackCDN: "https://prayerapp.b-cdn.net",
    // Firebase comme dernier recours
    firebaseStorage: "https://firebasestorage.googleapis.com",
    cacheExpiry: 24 * 7, // 7 jours
    maxCacheSize: 500, // 500MB max cache
  };

  public static getInstance(): CDNOptimizer {
    if (!CDNOptimizer.instance) {
      CDNOptimizer.instance = new CDNOptimizer();
    }
    return CDNOptimizer.instance;
  }

  private constructor() {
    this.initializeCacheDirectory();
    this.loadCacheIndex();
  }

  private async initializeCacheDirectory(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.CACHE_DIR, {
          intermediates: true,
        });
      }
    } catch (error) {
      console.error("Erreur création répertoire cache CDN:", error);
    }
  }

  private async loadCacheIndex(): Promise<void> {
    try {
      const indexData = await AsyncStorage.getItem(this.CACHE_INDEX_KEY);
      if (indexData) {
        const entries = JSON.parse(indexData);
        this.cacheIndex = new Map(Object.entries(entries));
        console.log(
          `✅ Index cache CDN chargé: ${this.cacheIndex.size} entrées`
        );
      }
    } catch (error) {
      console.error("Erreur chargement index cache:", error);
    }
  }

  private async saveCacheIndex(): Promise<void> {
    try {
      const indexData = Object.fromEntries(this.cacheIndex);
      await AsyncStorage.setItem(
        this.CACHE_INDEX_KEY,
        JSON.stringify(indexData)
      );
    } catch (error) {
      console.error("Erreur sauvegarde index cache:", error);
    }
  }

  /**
   * 🎯 Fonction principale : récupérer un fichier avec optimisation CDN
   */
  public async getOptimizedFile(
    fileId: string,
    originalUrl: string,
    onProgress?: (progress: number) => void
  ): Promise<string | null> {
    try {
      // 1. Vérifier le cache local d'abord
      const cachedFile = await this.getCachedFile(fileId);
      if (cachedFile) {
        console.log(`📁 Fichier trouvé en cache: ${fileId}`);
        await this.updateAccessStats(fileId);
        return cachedFile;
      }

      // 2. Construire les URLs avec priorité CDN
      const urls = this.buildCDNUrls(fileId, originalUrl);

      // 3. Essayer de télécharger depuis le CDN le plus rapide
      for (const { url, source } of urls) {
        try {
          console.log(`🌐 Tentative téléchargement depuis ${source}: ${url}`);
          const localPath = await this.downloadWithCache(
            fileId,
            url,
            onProgress
          );

          if (localPath) {
            // console.log(`✅ Téléchargement réussi depuis ${source}`);

            // Optimisation : prefetch des fichiers suivants depuis ce CDN
            this.schedulePrefetch(source);

            return localPath;
          }
        } catch (error) {
          // console.log(`❌ Échec ${source}:`, (error as Error).message);
          continue;
        }
      }

      return null;
    } catch (error) {
      console.error("Erreur récupération fichier optimisé:", error);
      return null;
    }
  }

  private buildCDNUrls(
    fileId: string,
    originalUrl: string
  ): Array<{ url: string; source: string }> {
    const filename = this.extractFilename(originalUrl);

    return [
      // 1. CDN principal (le plus rapide et économique)
      {
        url: `${this.config.primaryCDN}/adhans/${filename}`,
        source: "Cloudflare R2",
      },
      // 2. CDN fallback
      {
        url: `${this.config.fallbackCDN}/adhans/${filename}`,
        source: "Bunny CDN",
      },
      // 3. Firebase en dernier recours (plus cher)
      {
        url: originalUrl,
        source: "Firebase Storage",
      },
    ];
  }

  private extractFilename(url: string): string {
    // Extraire le nom de fichier de l'URL Firebase
    const matches = url.match(/([^\/]+)\?/);
    return matches ? matches[1] : url.split("/").pop() || "unknown";
  }

  private async getCachedFile(fileId: string): Promise<string | null> {
    const entry = this.cacheIndex.get(fileId);
    if (!entry) return null;

    // Vérifier si le cache n'a pas expiré
    const now = Date.now();
    const ageHours = (now - entry.downloadedAt) / (1000 * 60 * 60);

    if (ageHours > this.config.cacheExpiry) {
      console.log(`⏰ Cache expiré pour ${fileId} (${ageHours.toFixed(1)}h)`);
      await this.removeFromCache(fileId);
      return null;
    }

    // Vérifier si le fichier existe toujours
    const fileInfo = await FileSystem.getInfoAsync(entry.localPath);
    if (!fileInfo.exists) {
      // console.log(`❌ Fichier cache manquant: ${fileId}`);
      await this.removeFromCache(fileId);
      return null;
    }

    return entry.localPath;
  }

  private async downloadWithCache(
    fileId: string,
    url: string,
    onProgress?: (progress: number) => void
  ): Promise<string | null> {
    const localPath = `${this.CACHE_DIR}${fileId}.mp3`;

    try {
      // Vérifier l'espace disponible avant téléchargement
      await this.ensureCacheSpace(50); // Réserver 50MB

      const downloadResult = await FileSystem.downloadAsync(url, localPath, {
        // Headers pour optimiser le téléchargement
        headers: {
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "max-age=86400", // 24h cache
          "User-Agent": "PrayerApp/1.0",
        },
      });

      if (downloadResult.status === 200) {
        // Obtenir la taille du fichier
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        const fileSize =
          fileInfo.exists && !fileInfo.isDirectory
            ? (fileInfo as any).size || 0
            : 0;

        // Ajouter au cache index
        const entry: CacheEntry = {
          url,
          localPath,
          downloadedAt: Date.now(),
          fileSize: Math.round(fileSize / (1024 * 1024)), // MB
          lastAccessed: Date.now(),
          accessCount: 1,
        };

        this.cacheIndex.set(fileId, entry);
        await this.saveCacheIndex();

        console.log(`💾 Fichier mis en cache: ${fileId} (${entry.fileSize}MB)`);
        return localPath;
      }

      return null;
    } catch (error) {
      // Nettoyer en cas d'erreur
      try {
        await FileSystem.deleteAsync(localPath, { idempotent: true });
      } catch {}

      throw error;
    }
  }

  private async updateAccessStats(fileId: string): Promise<void> {
    const entry = this.cacheIndex.get(fileId);
    if (entry) {
      entry.lastAccessed = Date.now();
      entry.accessCount++;
      this.cacheIndex.set(fileId, entry);

      // Sauvegarder périodiquement (pas à chaque accès)
      if (entry.accessCount % 5 === 0) {
        await this.saveCacheIndex();
      }
    }
  }

  /**
   * 🧹 Gestion intelligente de l'espace cache
   */
  private async ensureCacheSpace(requiredMB: number): Promise<void> {
    const currentSize = await this.getCurrentCacheSize();
    const availableSpace = this.config.maxCacheSize - currentSize;

    if (availableSpace < requiredMB) {
      console.log(
        `🧹 Nettoyage cache requis: ${currentSize}MB/${this.config.maxCacheSize}MB`
      );
      await this.cleanupCache(requiredMB - availableSpace + 10); // +10MB marge
    }
  }

  private async getCurrentCacheSize(): Promise<number> {
    let totalSize = 0;
    for (const entry of this.cacheIndex.values()) {
      totalSize += entry.fileSize;
    }
    return totalSize;
  }

  private async cleanupCache(targetMB: number): Promise<void> {
    // Stratégie LRU + fréquence d'accès
    const entries = Array.from(this.cacheIndex.entries());

    // Trier par priorité (moins récent + moins fréquent = première suppression)
    entries.sort(([, a], [, b]) => {
      const scoreA = a.lastAccessed + a.accessCount * 86400000; // Bonus fréquence
      const scoreB = b.lastAccessed + b.accessCount * 86400000;
      return scoreA - scoreB;
    });

    let freedSpace = 0;
    for (const [fileId, entry] of entries) {
      if (freedSpace >= targetMB) break;

      try {
        await FileSystem.deleteAsync(entry.localPath, { idempotent: true });
        this.cacheIndex.delete(fileId);
        freedSpace += entry.fileSize;
        console.log(`🗑️ Supprimé du cache: ${fileId} (${entry.fileSize}MB)`);
      } catch (error) {
        console.error(`Erreur suppression cache ${fileId}:`, error);
      }
    }

    await this.saveCacheIndex();
    // console.log(`✅ Cache nettoyé: ${freedSpace}MB libérés`);
  }

  private async removeFromCache(fileId: string): Promise<void> {
    const entry = this.cacheIndex.get(fileId);
    if (entry) {
      try {
        await FileSystem.deleteAsync(entry.localPath, { idempotent: true });
      } catch {}
      this.cacheIndex.delete(fileId);
      await this.saveCacheIndex();
    }
  }

  /**
   * 🚀 Prefetch intelligent des fichiers populaires
   */
  private schedulePrefetch(preferredSource: string): void {
    // Implementer une logique de prefetch basée sur :
    // - Historique d'utilisation
    // - Heure de la journée
    // - Préférences utilisateur
    setTimeout(() => {
      this.prefetchPopularFiles(preferredSource);
    }, 5000); // Attendre 5s après le téléchargement principal
  }

  private async prefetchPopularFiles(source: string): Promise<void> {
    // Cette méthode sera appelée par le PremiumContentManager
    console.log(`🔮 Prefetch programmé depuis ${source}`);
  }

  /**
   * 📊 Statistiques et monitoring
   */
  public async getCacheStats(): Promise<{
    totalFiles: number;
    totalSizeMB: number;
    hitRate: number;
    oldestFile: string;
    mostUsedFile: string;
  }> {
    const entries = Array.from(this.cacheIndex.values());
    const totalFiles = entries.length;
    const totalSizeMB = entries.reduce((sum, entry) => sum + entry.fileSize, 0);

    let oldestFile = "";
    let mostUsedFile = "";
    let oldestTime = Date.now();
    let maxAccess = 0;

    for (const [fileId, entry] of this.cacheIndex) {
      if (entry.downloadedAt < oldestTime) {
        oldestTime = entry.downloadedAt;
        oldestFile = fileId;
      }
      if (entry.accessCount > maxAccess) {
        maxAccess = entry.accessCount;
        mostUsedFile = fileId;
      }
    }

    return {
      totalFiles,
      totalSizeMB: Math.round(totalSizeMB),
      hitRate: 0, // À calculer avec les métriques d'usage
      oldestFile,
      mostUsedFile,
    };
  }

  /**
   * 🔧 Configuration et maintenance
   */
  public updateConfig(newConfig: Partial<CDNConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log("📝 Configuration CDN mise à jour:", this.config);
  }

  public async clearCache(): Promise<void> {
    try {
      await FileSystem.deleteAsync(this.CACHE_DIR, { idempotent: true });
      await FileSystem.makeDirectoryAsync(this.CACHE_DIR, {
        intermediates: true,
      });
      this.cacheIndex.clear();
      await AsyncStorage.removeItem(this.CACHE_INDEX_KEY);
      // console.log("🧹 Cache CDN complètement vidé");
    } catch (error) {
      console.error("Erreur vidage cache:", error);
    }
  }
}

export default CDNOptimizer;
