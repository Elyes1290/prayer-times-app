import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "./apiClient";
import SyncManager from "./syncManager";

import RNFS from "react-native-fs";
import { Platform } from "react-native";
import { debugLog, errorLog } from "./logger";
import AudioStreamingManager from "./audioStreaming";
import CDNOptimizer from "./cdnOptimization";
import CustomServerManager from "./customServerManager";
import nativeDownloadManager, { DownloadInfo } from "./nativeDownloadManager";
import {
  LocalStorageManager,
  PREMIUM_STORAGE_KEYS,
} from "./localStorageManager";
import { AppConfig } from "./config";

// Types de contenu premium
export interface PremiumContent {
  id: string;
  type: "adhan" | "quran" | "dhikr" | "theme";
  title: string;
  description: string;
  fileUrl: string;
  fileSize: number; // en MB
  /** Durée réelle lue sur le serveur (ms) — indispensable en streaming HTTP */
  durationMs?: number;
  version: string;
  isDownloaded: boolean;
  downloadPath?: string;
  // Propriétés spécifiques au Quran
  reciter?: string;
  surahNumber?: number;
  surahName?: string;
}

// Catalogue de contenu premium (stocké dans Firestore)
export interface PremiumCatalog {
  adhanVoices: PremiumContent[];
  quranRecitations: PremiumContent[];
  dhikrCollections: PremiumContent[];
  premiumThemes: PremiumContent[];
}

class PremiumContentManager {
  private static instance: PremiumContentManager;
  private downloadDirectory: string;
  private streamingManager: AudioStreamingManager;
  private cdnOptimizer: CDNOptimizer;
  private customServerManager: CustomServerManager;
  // 🚀 NOUVEAU : Protection contre les appels multiples
  private isCheckingDownloads: Set<string> = new Set();
  /** Résolu quand migrate + forceSyncCacheWithFiles ont fini (liste adhan prête). */
  private readonly ready: Promise<void>;

  private constructor() {
    // 🚀 FIX : Utiliser uniquement le stockage interne pour éviter les suppressions automatiques
    this.downloadDirectory = `${RNFS.DocumentDirectoryPath}/premium_content`;
    this.streamingManager = AudioStreamingManager.getInstance();
    this.cdnOptimizer = CDNOptimizer.getInstance();
    this.customServerManager = CustomServerManager.getInstance();
    this.ready = this.initializeDirectory();
    // 🚀 SUPPRIMÉ : Ne pas nettoyer automatiquement au démarrage pour éviter les suppressions intempestives
    // this.cleanupCorruptedDownloads();
  }

  // 🚀 NOUVEAU : Propriété pour le dossier Quran séparé
  private get quranDirectory(): string {
    return `${RNFS.DocumentDirectoryPath}/quran`;
  }

  public static getInstance(): PremiumContentManager {
    if (!PremiumContentManager.instance) {
      PremiumContentManager.instance = new PremiumContentManager();
    }
    return PremiumContentManager.instance;
  }

  /** Attendre la synchro disque → AsyncStorage avant de lire DOWNLOADED_CONTENT. */
  public waitUntilInitialized(): Promise<void> {
    return this.ready;
  }

  // 🚀 NOUVEAU : Helper central pour garantir un chemin unique et cohérent pour les Adhans
  private getAdhanStoragePath(id: string): string {
    // Nettoyage de l'ID pour éviter les doubles préfixes
    const cleanId = id.replace(/^adhan_/, "");
    // Format strict : toujours adhan_xxx.mp3
    const fileName = `adhan_${cleanId}.mp3`;
    return `${this.downloadDirectory}/${fileName}`;
  }

  private async initializeDirectory(): Promise<void> {
    try {
      // 1. Créer le dossier principal
      const exists = await RNFS.exists(this.downloadDirectory);

      if (!exists) {
        // Créer le dossier s'il n'existe pas
        await RNFS.mkdir(this.downloadDirectory);
        debugLog("📁 Répertoire premium content créé");
      } else {
        // 🚀 NOUVEAU : Vérifier si c'est le premier démarrage de cette version
        const isFirstRun = await this.checkIfFirstRun();
        if (isFirstRun) {
          debugLog("🔄 Premier démarrage détecté, marquage de la version...");
          // 🚀 SUPPRIMÉ : Ne plus nettoyer automatiquement le dossier
          // await this.cleanupPremiumDirectory();
          await this.markAsNotFirstRun();
        }
      }

      // 🚀 NOUVEAU : Créer le dossier Quran séparé
      const quranExists = await RNFS.exists(this.quranDirectory);
      if (!quranExists) {
        try {
          await RNFS.mkdir(this.quranDirectory);
          debugLog("📁 Dossier Quran créé");
        } catch (quranError) {
          debugLog("⚠️ Erreur création dossier Quran:", quranError);
        }
      }

      // 🚀 FIX : Ne plus créer le dossier externe pour éviter les suppressions automatiques
      // Le stockage interne est suffisant et persistant

      await Promise.all([
        this.migrateLegacyDownloads(),
        this.forceMigrateExternalQuranFiles(),
        this.forceSyncCacheWithFiles(),
      ]);

      // 🚀 SUPPRIMÉ : Ne pas nettoyer automatiquement au démarrage pour éviter les suppressions intempestives
      // await this.cleanupCorruptedDownloads();
    } catch (error) {
      errorLog("❌ Erreur création répertoire premium:", error);
    }
  }

  // 🚀 Vérifier si c'est le premier démarrage de cette version
  private async checkIfFirstRun(): Promise<boolean> {
    try {
      const versionKey = "premium_content_version";
      const currentVersion = "2.0.0"; // Version actuelle avec Infomaniak
      const savedVersion = await AsyncStorage.getItem(versionKey);

      if (savedVersion !== currentVersion) {
        debugLog(
          `🔄 Mise à jour détectée: ${savedVersion} → ${currentVersion}`,
        );
        return true;
      }

      return false;
    } catch (error) {
      errorLog("❌ Erreur vérification première exécution:", error);
      return true; // En cas d'erreur, considérer comme premier démarrage
    }
  }

  // 🚀 Marquer que ce n'est plus le premier démarrage
  private async markAsNotFirstRun(): Promise<void> {
    try {
      const versionKey = "premium_content_version";
      const currentVersion = "2.0.0";
      await AsyncStorage.setItem(versionKey, currentVersion);
      debugLog("✅ Version marquée comme installée");
    } catch (error) {
      errorLog("❌ Erreur sauvegarde version:", error);
    }
  }

  // 🚀 NOUVEAU : Forcer la sauvegarde de la version actuelle
  public async forceMarkCurrentVersion(): Promise<void> {
    try {
      const versionKey = "premium_content_version";
      const currentVersion = "2.0.0";
      await AsyncStorage.setItem(versionKey, currentVersion);
      debugLog("✅ Version forcée comme installée");
    } catch (error) {
      errorLog("❌ Erreur sauvegarde forcée version:", error);
    }
  }

  // 🚀 NOUVEAU : Synchroniser forcément le cache avec la réalité des fichiers
  public async forceSyncCacheWithFiles(): Promise<{
    totalFiles: number;
    validFiles: number;
    corruptedFiles: number;
    fixedFiles: number;
  }> {
    try {
      debugLog("🔄 Synchronisation forcée du cache avec les fichiers...");

      const result = {
        totalFiles: 0,
        validFiles: 0,
        corruptedFiles: 0,
        fixedFiles: 0,
      };

      // 1. Récupérer tous les fichiers réels sur le disque
      const realFiles = new Map<string, string>();

      // Scanner le dossier principal (adhans)
      try {
        const files = await RNFS.readDir(this.downloadDirectory);
        for (const file of files) {
          if (file.isFile() && file.name.endsWith(".mp3")) {
            const contentId = file.name.replace(/\.mp3$/, "");
            realFiles.set(contentId, file.path);
            debugLog(
              `📁 Fichier trouvé (principal): ${contentId} -> ${file.path}`,
            );
          }
        }
      } catch (error) {
        debugLog("⚠️ Erreur scan dossier principal:", error);
      }

      // 🚀 NOUVEAU : Scanner le dossier Quran avec la nouvelle structure /quran/nom_du_récitateur/
      try {
        const quranFiles = await RNFS.readDir(this.quranDirectory);
        const reciterDirs = quranFiles.filter((f) => f.isDirectory());
        await Promise.all(
          reciterDirs.map(async (reciterFolder) => {
            try {
              const reciterFiles = await RNFS.readDir(reciterFolder.path);
              for (const file of reciterFiles) {
                if (file.isFile() && file.name.endsWith(".mp3")) {
                  const contentId = file.name.replace(/\.mp3$/, "");
                  realFiles.set(contentId, file.path);
                  debugLog(
                    `📖 Fichier Quran trouvé: ${contentId} -> ${file.path}`,
                  );
                }
              }
            } catch (reciterError) {
              debugLog(
                `⚠️ Erreur scan dossier récitateur ${reciterFolder.name}:`,
                reciterError,
              );
            }
          }),
        );
      } catch (error) {
        debugLog("⚠️ Erreur scan dossier Quran:", error);
      }

      // 🚀 FIX : Ne plus scanner le dossier externe pour éviter les suppressions automatiques
      // Le stockage interne est suffisant et persistant

      // 2. Mettre à jour la base de données AsyncStorage avec les fichiers réels
      const updatedDownloads: any = {};
      const fileEntries = [...realFiles.entries()];
      const statResults = await Promise.allSettled(
        fileEntries.map(async ([contentId, filePath]) => {
          const fileStats = await RNFS.stat(filePath);
          return { contentId, filePath, size: fileStats.size };
        }),
      );

      for (const settled of statResults) {
        result.totalFiles++;
        if (settled.status === "rejected") {
          result.corruptedFiles++;
          debugLog(`❌ Erreur vérification fichier: ${settled.reason}`);
          continue;
        }
        const { contentId, filePath, size } = settled.value;

        if (size > 10240) {
          updatedDownloads[contentId] = {
            downloadPath: filePath,
            downloadedAt: new Date().toISOString(),
            fileSize: size,
          };
          result.validFiles++;
          debugLog(
            `✅ Fichier valide synchronisé: ${contentId} (${size} bytes)`,
          );
        } else {
          result.corruptedFiles++;
          debugLog(
            `❌ Fichier trop petit ignoré: ${contentId} (${size} bytes)`,
          );
        }
      }

      // 3. Sauvegarder la base de données mise à jour
      await LocalStorageManager.savePremium(
        "DOWNLOADED_CONTENT",
        updatedDownloads,
        true,
        true,
      );

      await Promise.all([
        this.invalidateAdhanCache(),
        this.invalidateQuranCache(),
      ]);

      // 🚀 SUPPRIMÉ : Ne pas recharger depuis le serveur car cela écrase les infos locales
      // await this.refreshCatalogFromServer();

      result.fixedFiles = result.validFiles;
      debugLog(
        `✅ Synchronisation terminée: ${result.validFiles} fichiers valides, ${result.corruptedFiles} corrompus`,
      );

      return result;
    } catch (error) {
      errorLog("❌ Erreur synchronisation cache:", error);
      return {
        totalFiles: 0,
        validFiles: 0,
        corruptedFiles: 0,
        fixedFiles: 0,
      };
    }
  }

  // 🚀 NOUVEAU : Vérifier et corriger la persistance des téléchargements
  public async verifyAndFixDownloads(): Promise<{
    totalFiles: number;
    validFiles: number;
    corruptedFiles: number;
    fixedFiles: number;
  }> {
    try {
      debugLog("🔍 Vérification et correction des téléchargements...");

      const result = {
        totalFiles: 0,
        validFiles: 0,
        corruptedFiles: 0,
        fixedFiles: 0,
      };

      const downloadedContent =
        await LocalStorageManager.getPremium("DOWNLOADED_CONTENT");

      if (!downloadedContent) {
        debugLog("✅ Aucun téléchargement à vérifier");
        return result;
      }

      const downloaded = JSON.parse(downloadedContent);
      const correctedDownloads: any = {};

      const entries = Object.entries(downloaded) as [string, any][];
      const verifyResults = await Promise.allSettled(
        entries.map(async ([contentId, contentInfo]) => {
          try {
            const info = contentInfo;
            if (!info.downloadPath) {
              return { contentId, outcome: "no_path" as const };
            }
            const fileExists = await RNFS.exists(info.downloadPath);
            if (!fileExists) {
              debugLog(`❌ Fichier manquant: ${contentId}`);
              return { contentId, outcome: "missing" as const };
            }
            const fileStats = await RNFS.stat(info.downloadPath);
            const fileSizeInBytes = fileStats.size;
            if (fileSizeInBytes === 0 || fileSizeInBytes < 10240) {
              debugLog(
                `❌ Fichier corrompu: ${contentId} (${fileSizeInBytes} bytes)`,
              );
              return { contentId, outcome: "corrupt" as const };
            }
            return {
              contentId,
              outcome: "valid" as const,
              info,
              size: fileSizeInBytes,
            };
          } catch (error) {
            debugLog(`❌ Erreur vérification ${contentId}: ${error}`);
            throw error;
          }
        }),
      );

      for (const settled of verifyResults) {
        result.totalFiles++;
        if (settled.status === "rejected") {
          result.corruptedFiles++;
          debugLog(`❌ Erreur vérification entrée: ${settled.reason}`);
          continue;
        }
        const r = settled.value;
        if (r.outcome === "no_path" || r.outcome === "missing") {
          result.corruptedFiles++;
          continue;
        }
        if (r.outcome === "corrupt") {
          result.corruptedFiles++;
          continue;
        }
        correctedDownloads[r.contentId] = r.info;
        result.validFiles++;
        debugLog(`✅ Fichier valide: ${r.contentId} (${r.size} bytes)`);
      }

      // Sauvegarder la version corrigée
      await LocalStorageManager.savePremium(
        "DOWNLOADED_CONTENT",
        correctedDownloads,
        true,
        true,
      );

      result.fixedFiles = result.validFiles;
      debugLog(
        `✅ Vérification terminée: ${result.validFiles} fichiers valides, ${result.corruptedFiles} corrompus`,
      );

      return result;
    } catch (error) {
      errorLog("❌ Erreur vérification téléchargements:", error);
      return {
        totalFiles: 0,
        validFiles: 0,
        corruptedFiles: 0,
        fixedFiles: 0,
      };
    }
  }

  // 🧹 Nettoyer complètement le dossier premium_content
  private async cleanupPremiumDirectory(): Promise<void> {
    try {
      debugLog("🧹 Début nettoyage complet du dossier premium_content...");

      // Lister tous les fichiers dans le dossier
      const files = await RNFS.readDir(this.downloadDirectory);
      const fileEntries = files.filter((f) => f.isFile());

      const results = await Promise.allSettled(
        fileEntries.map((file) => RNFS.unlink(file.path)),
      );

      const deletedCount = results.filter(
        (r) => r.status === "fulfilled",
      ).length;
      results.forEach((r, i) => {
        if (r.status === "rejected") {
          debugLog(
            `⚠️ Impossible de supprimer ${fileEntries[i].name}: ${r.reason}`,
          );
        }
      });

      debugLog(`✅ Nettoyage terminé: ${deletedCount} fichiers supprimés`);

      // Nettoyer aussi la base de données AsyncStorage
      await LocalStorageManager.removePremium("DOWNLOADED_CONTENT");
      debugLog("🗑️ Base de données téléchargements nettoyée");
    } catch (error) {
      errorLog("❌ Erreur nettoyage dossier premium:", error);
    }
  }

  // 📋 Récupérer le catalogue dynamiquement depuis Infomaniak
  async getPremiumCatalog(): Promise<PremiumCatalog | null> {
    try {
      debugLog("📋 Récupération du catalogue premium depuis Infomaniak...");
      // console.log("🔍 getPremiumCatalog() appelée");

      // 🚀 NOUVEAU : Vérifier le cache d'abord, mais recharger si on a un token et que le cache est vide côté Quran
      const cachedCatalog = await this.getCachedCatalog();
      if (cachedCatalog) {
        try {
          const [token, currentUserData, cachedUser] = await Promise.all([
            AsyncStorage.getItem("auth_token"),
            AsyncStorage.getItem("user_data"),
            AsyncStorage.getItem("premium_catalog_user"),
          ]);
          const hasEmptyQuran =
            !cachedCatalog.quranRecitations ||
            cachedCatalog.quranRecitations.length === 0;
          const userChanged = !!(
            currentUserData &&
            cachedUser &&
            currentUserData !== cachedUser
          );
          if (!(token && hasEmptyQuran) && !userChanged) {
            debugLog("✅ Catalogue chargé depuis le cache");
            return cachedCatalog;
          }
          debugLog(
            userChanged
              ? "🔄 Utilisateur changé → cache catalogue invalidé"
              : "🔄 Cache ignoré: token présent et catalogue Quran vide → rechargement serveur",
          );
        } catch {}
      }

      const catalog: PremiumCatalog = {
        adhanVoices: [],
        quranRecitations: [],
        dhikrCollections: [],
        premiumThemes: [],
      };

      // 🎵 Scanner les fichiers d'adhan premium depuis Infomaniak
      catalog.adhanVoices = await this.scanAdhanVoicesOnly();
      // // console.log(
      //   "🎵 Adhans détectés:",
      //   catalog.adhanVoices.length,
      //   catalog.adhanVoices
      // );

      // 📖 NOUVEAU : Scanner seulement les récitateurs (lazy loading)
      catalog.quranRecitations = await this.scanQuranRecitersOnly();

      // 🤲 Scanner les collections de dhikr (désactivé pour l'instant)
      // catalog.dhikrCollections = await this.scanStorageFolder(
      //   "premium/dhikr",
      //   "dhikr"
      // );
      catalog.dhikrCollections = [];

      // 🎨 Scanner les thèmes (désactivé pour l'instant)
      // catalog.premiumThemes = await this.scanStorageFolder(
      //   "premium/themes",
      //   "theme"
      // );
      catalog.premiumThemes = [];

      debugLog(
        `✅ Catalogue généré: ${catalog.adhanVoices.length} adhans, ${catalog.quranRecitations.length} récitateurs, ${catalog.dhikrCollections.length} dhikrs, ${catalog.premiumThemes.length} thèmes`,
      );

      // 💾 Sauvegarder en cache
      await this.saveCatalogToCache(catalog);

      return catalog;
    } catch (error) {
      errorLog("❌ Erreur récupération catalogue premium:", error);
      return null;
    }
  }

  // 💾 NOUVEAU : Système de cache pour le catalogue
  private async getCachedCatalog(): Promise<PremiumCatalog | null> {
    try {
      const cached = await AsyncStorage.getItem("premium_catalog_cache");
      const cacheTimestamp = await AsyncStorage.getItem(
        "premium_catalog_timestamp",
      );

      if (cached && cacheTimestamp) {
        const timestamp = parseInt(cacheTimestamp, 10);
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 heures

        if (now - timestamp < maxAge) {
          return JSON.parse(cached);
        }
      }

      return null;
    } catch (error) {
      debugLog("Cache catalogue non disponible:", error);
      return null;
    }
  }

  private async saveCatalogToCache(catalog: PremiumCatalog): Promise<void> {
    try {
      await AsyncStorage.setItem(
        "premium_catalog_cache",
        JSON.stringify(catalog),
      );
      try {
        const currentUserData = await AsyncStorage.getItem("user_data");
        if (currentUserData) {
          await AsyncStorage.setItem("premium_catalog_user", currentUserData);
        }
      } catch {}
      await AsyncStorage.setItem(
        "premium_catalog_timestamp",
        Date.now().toString(),
      );
      debugLog("✅ Catalogue sauvegardé en cache");
    } catch (error) {
      debugLog("Erreur sauvegarde cache:", error);
    }
  }

  // 🚀 NOUVEAU : Récupérer uniquement les adhans (optimisé)
  async getAdhanCatalogOnly(forceRefresh = false): Promise<PremiumContent[]> {
    try {
      debugLog("🎵 Récupération optimisée des adhans uniquement...");
      // console.log("🔍 getAdhanCatalogOnly() appelée - VERSION RAPIDE");

      // Vérifier le cache partiel pour les adhans (sauf si forceRefresh)
      if (!forceRefresh) {
        const cachedAdhans = await this.getCachedAdhans();
        if (cachedAdhans) {
          debugLog("✅ Adhans chargés depuis le cache");
          // console.log("🎵 Adhans depuis cache:", cachedAdhans);

          // 🚀 OPTIMISATION : Vérification rapide des téléchargements sans Promise.all
          // On fait la vérification en arrière-plan pour ne pas bloquer l'UI
          this.updateDownloadStatusInBackground(cachedAdhans);

          return cachedAdhans;
        }
      } else {
        debugLog("🔄 Force refresh activé, cache ignoré");
        // Invalider le cache pour forcer la récupération depuis le serveur
        await this.invalidateAdhanCache();
      }

      // Scanner uniquement les adhans depuis le serveur
      const adhans = await this.scanAdhanVoicesOnly();
      // console.log("🎵 Adhans détectés (scan rapide):", adhans.length, adhans);

      // 🚀 OPTIMISATION : Sauvegarder directement sans vérification lourde
      await this.saveCachedAdhans(adhans);

      // Vérifier les téléchargements en arrière-plan
      this.updateDownloadStatusInBackground(adhans);

      debugLog(`✅ Scan rapide terminé: ${adhans.length} adhans trouvés`);
      return adhans;
    } catch (error) {
      errorLog("❌ Erreur récupération adhans optimisée:", error);
      return [];
    }
  }

  // 🚀 Flag pour éviter les vérifications multiples simultanées
  private isUpdatingDownloadStatus = false;

  // 🚀 NOUVEAU : Mise à jour du statut de téléchargement en arrière-plan
  private async updateDownloadStatusInBackground(
    adhans: PremiumContent[],
  ): Promise<void> {
    // Éviter les appels multiples simultanés
    if (this.isUpdatingDownloadStatus) {
      console.log("⏸️ Vérification déjà en cours, ignorée");
      return;
    }

    this.isUpdatingDownloadStatus = true;

    // Exécuter en arrière-plan pour ne pas bloquer l'UI
    setTimeout(async () => {
      try {
        console.log("🔍 Vérification des téléchargements en arrière-plan...");

        // Vérifications en parallèle (évite await dans une boucle for)
        const updatedAdhans = [...adhans];
        let hasChanges = false;

        const flags = await Promise.all(
          adhans.map(async (adhan, index) => {
            const downloadPath = await this.isContentDownloaded(adhan.id);
            if (downloadPath && !adhan.isDownloaded) {
              updatedAdhans[index] = {
                ...adhan,
                isDownloaded: true,
                downloadPath: downloadPath,
              };
              console.log(`✅ ${adhan.title} trouvé téléchargé`);
              return true;
            }
            return false;
          }),
        );

        hasChanges = flags.some(Boolean);

        // Sauvegarder SEULEMENT s'il y a des changements
        if (hasChanges) {
          await this.saveCachedAdhans(updatedAdhans);
          console.log(
            "✅ Vérification arrière-plan terminée avec mises à jour",
          );
        } else {
          console.log(
            "✅ Vérification arrière-plan terminée, aucun changement",
          );
        }
      } catch (error) {
        console.error("❌ Erreur vérification arrière-plan:", error);
      } finally {
        this.isUpdatingDownloadStatus = false;
      }
    }, 100);
  }

  // 💾 Cache spécifique pour les adhans
  private async getCachedAdhans(): Promise<PremiumContent[] | null> {
    try {
      const cached = await AsyncStorage.getItem("premium_adhans_cache");
      const cacheTimestamp = await AsyncStorage.getItem(
        "premium_adhans_timestamp",
      );

      if (cached && cacheTimestamp) {
        const timestamp = parseInt(cacheTimestamp, 10);
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 heures

        if (now - timestamp < maxAge) {
          return JSON.parse(cached);
        }
      }

      return null;
    } catch (error) {
      debugLog("Cache adhans non disponible:", error);
      return null;
    }
  }

  private async saveCachedAdhans(adhans: PremiumContent[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        "premium_adhans_cache",
        JSON.stringify(adhans),
      );
      await AsyncStorage.setItem(
        "premium_adhans_timestamp",
        Date.now().toString(),
      );
      debugLog("✅ Adhans sauvegardés en cache");
    } catch (error) {
      debugLog("Erreur sauvegarde cache adhans:", error);
    }
  }

  // 🎵 Scanner les fichiers d'adhan
  private async scanStorageFolder(
    folderPath: string,
    type: "adhan" | "quran" | "dhikr" | "theme",
  ): Promise<PremiumContent[]> {
    try {
      debugLog(`🔍 Scan du dossier: ${folderPath} (type: ${type})`);
      const token = await AsyncStorage.getItem("auth_token");
      const apiUrl = `${
        AppConfig.API_BASE_URL
      }/list-files.php?folder=${encodeURIComponent(folderPath)}`;
      const response = await fetch(apiUrl, {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await response.json();
      if (!data.success || !Array.isArray(data.data?.files)) {
        debugLog(`❌ Réponse API invalide:`, data);
        return [];
      }

      const files = data.data.files as any[];
      const out: PremiumContent[] = [];
      for (const file of files) {
        if (!file.name.endsWith(".mp3")) continue;
        let title = this.generateReadableTitle(file.name, type);
        if (file.name === "audio.mp3") title = "Adhan Premium";
        out.push({
          id: file.name.replace(/\.[^/.]+$/, ""),
          type,
          title,
          description: `Adhan premium disponible sur Infomaniak (${file.name})`,
          fileUrl: file.url,
          fileSize: file.sizeMB || 1,
          version: file.version || "1.0",
          isDownloaded: false,
        });
      }
      return out;
    } catch (error) {
      errorLog(`❌ Erreur scan dossier ${folderPath}:`, error);
      return [];
    }
  }

  // 📖 Parser un nom de fichier Quran pour extraire les informations
  private parseQuranFileName(
    fileName: string,
    reciterName: string,
  ): {
    surahNumber: number;
    surahName: string;
    fullTitle: string;
  } {
    // ✨ NOUVEAU FORMAT: 001.mp3, 002.mp3, etc.
    const newFormatMatch = fileName.match(/^(\d{3})\.mp3$/i);
    if (newFormatMatch) {
      const surahNumber = parseInt(newFormatMatch[1], 10);
      const surahName = this.getSurahNameFromNumber(surahNumber);
      return {
        surahNumber,
        surahName,
        fullTitle: `${surahName} (${String(surahNumber).padStart(
          3,
          "0",
        )}) - ${reciterName}`,
      };
    }

    // Ancien format: "Saoud Shuraim Surah(001) - Al Fatiha"
    const oldFormatMatch = fileName.match(
      /Surah\((\d+)\)\s*-\s*(.+?)(?:\.[^.]+)?$/i,
    );

    if (oldFormatMatch) {
      const surahNumber = parseInt(oldFormatMatch[1], 10);
      const surahName = oldFormatMatch[2].trim();
      return {
        surahNumber,
        surahName,
        fullTitle: `${surahName} (${String(surahNumber).padStart(
          3,
          "0",
        )}) - ${reciterName}`,
      };
    }

    // Fallback si aucun pattern ne correspond
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
    return {
      surahNumber: 0,
      surahName: nameWithoutExt,
      fullTitle: `${nameWithoutExt} - ${reciterName}`,
    };
  }

  // 📖 Obtenir le nom de la sourate à partir de son numéro
  private getSurahNameFromNumber(surahNumber: number): string {
    const surahNames: { [key: number]: string } = {
      1: "Al-Fatiha",
      2: "Al-Baqarah",
      3: "Aal-E-Imran",
      4: "An-Nisa",
      5: "Al-Maidah",
      6: "Al-An'am",
      7: "Al-A'raf",
      8: "Al-Anfal",
      9: "At-Tawbah",
      10: "Yunus",
      11: "Hud",
      12: "Yusuf",
      13: "Ar-Ra'd",
      14: "Ibrahim",
      15: "Al-Hijr",
      16: "An-Nahl",
      17: "Al-Isra",
      18: "Al-Kahf",
      19: "Maryam",
      20: "Ta-Ha",
      21: "Al-Anbiya",
      22: "Al-Hajj",
      23: "Al-Mu'minun",
      24: "An-Nur",
      25: "Al-Furqan",
      26: "Ash-Shu'ara",
      27: "An-Naml",
      28: "Al-Qasas",
      29: "Al-Ankabut",
      30: "Ar-Rum",
      31: "Luqman",
      32: "As-Sajdah",
      33: "Al-Ahzab",
      34: "Saba",
      35: "Fatir",
      36: "Ya-Sin",
      37: "As-Saffat",
      38: "Sad",
      39: "Az-Zumar",
      40: "Ghafir",
      41: "Fussilat",
      42: "Ash-Shura",
      43: "Az-Zukhruf",
      44: "Ad-Dukhan",
      45: "Al-Jathiyah",
      46: "Al-Ahqaf",
      47: "Muhammad",
      48: "Al-Fath",
      49: "Al-Hujurat",
      50: "Qaf",
      51: "Adh-Dhariyat",
      52: "At-Tur",
      53: "An-Najm",
      54: "Al-Qamar",
      55: "Ar-Rahman",
      56: "Al-Waqi'ah",
      57: "Al-Hadid",
      58: "Al-Mujadila",
      59: "Al-Hashr",
      60: "Al-Mumtahanah",
      61: "As-Saff",
      62: "Al-Jumu'ah",
      63: "Al-Munafiqun",
      64: "At-Taghabun",
      65: "At-Talaq",
      66: "At-Tahrim",
      67: "Al-Mulk",
      68: "Al-Qalam",
      69: "Al-Haqqah",
      70: "Al-Ma'arij",
      71: "Nuh",
      72: "Al-Jinn",
      73: "Al-Muzzammil",
      74: "Al-Muddaththir",
      75: "Al-Qiyamah",
      76: "Al-Insan",
      77: "Al-Mursalat",
      78: "An-Naba",
      79: "An-Nazi'at",
      80: "Abasa",
      81: "At-Takwir",
      82: "Al-Infitar",
      83: "Al-Mutaffifin",
      84: "Al-Inshiqaq",
      85: "Al-Buruj",
      86: "At-Tariq",
      87: "Al-A'la",
      88: "Al-Ghashiyah",
      89: "Al-Fajr",
      90: "Al-Balad",
      91: "Ash-Shams",
      92: "Al-Layl",
      93: "Ad-Duha",
      94: "Ash-Sharh",
      95: "At-Tin",
      96: "Al-Alaq",
      97: "Al-Qadr",
      98: "Al-Bayyinah",
      99: "Az-Zalzalah",
      100: "Al-Adiyat",
      101: "Al-Qari'ah",
      102: "At-Takathur",
      103: "Al-Asr",
      104: "Al-Humazah",
      105: "Al-Fil",
      106: "Quraysh",
      107: "Al-Ma'un",
      108: "Al-Kawthar",
      109: "Al-Kafirun",
      110: "An-Nasr",
      111: "Al-Masad",
      112: "Al-Ikhlas",
      113: "Al-Falaq",
      114: "An-Nas",
    };

    return surahNames[surahNumber] || `Sourate ${surahNumber}`;
  }

  // 📝 Générer un titre lisible basé sur le nom de fichier
  private generateReadableTitle(fileName: string, type: string): string {
    // Enlever l'extension
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");

    // Remplacer les underscores et tirets par des espaces
    let title = nameWithoutExt.replace(/[_-]/g, " ");

    // Capitaliser chaque mot
    title = title.replace(/\b\w/g, (l) => l.toUpperCase());

    // Ajouter un préfixe selon le type
    switch (type) {
      case "adhan":
        return `Adhan - ${title}`;
      case "quran":
        return `Récitation - ${title}`;
      case "dhikr":
        return `Collection Dhikr - ${title}`;
      case "theme":
        return `Thème - ${title}`;
      default:
        return title;
    }
  }

  // 📄 Générer une description basée sur le nom de fichier et le type
  private generateDescription(fileName: string, type: string): string {
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");

    switch (type) {
      case "adhan":
        return `Récitation d'adhan de haute qualité - ${nameWithoutExt}`;
      case "quran":
        return `Récitation coranique premium - ${nameWithoutExt}`;
      case "dhikr":
        return `Collection d'invocations et dhikr - ${nameWithoutExt}`;
      case "theme":
        return `Thème visuel premium - ${nameWithoutExt}`;
      default:
        return `Contenu premium - ${nameWithoutExt}`;
    }
  }

  // 📥 Télécharger du contenu premium
  async downloadPremiumContent(
    content: PremiumContent,
    onProgress?: (progress: number) => void,
    onCancel?: () => boolean,
  ): Promise<boolean> {
    // 🚀 FIX : Utiliser le système legacy qui utilise le stockage interne persistant
    // Le système natif utilise le stockage externe qui peut être nettoyé automatiquement
    return this.downloadWithLegacySystem(content, onProgress, onCancel);
  }

  private async downloadWithNativeManager(
    content: PremiumContent,
    onProgress?: (progress: number) => void,
    onCancel?: () => boolean,
  ): Promise<boolean> {
    try {
      debugLog(`🚀 Démarrage téléchargement natif: ${content.title}`);

      // 🚀 FIX : Utiliser l'ID du contenu pour créer un nom de fichier cohérent
      const fileName = `${content.id}.mp3`;

      const downloadInfo: DownloadInfo = {
        url: content.fileUrl,
        fileName: fileName,
        contentId: content.id,
        title: content.title,
      };

      // Démarrer le téléchargement
      const downloadId =
        await nativeDownloadManager.startDownload(downloadInfo);
      debugLog(`📥 Téléchargement démarré avec ID: ${downloadId}`);

      // 🚀 SIMPLIFIÉ : Attendre et vérifier le statut périodiquement (récursion terminale, pas de while + await)
      const maxWaitTime = 300000; // 5 minutes
      const checkInterval = 2000; // 2 secondes

      const poll = async (elapsedTime: number): Promise<boolean> => {
        if (elapsedTime >= maxWaitTime) {
          errorLog(`⏰ Timeout téléchargement: ${content.title}`);
          return false;
        }

        if (onCancel && onCancel()) {
          debugLog(`🛑 Annulation demandée: ${content.title}`);
          await nativeDownloadManager.cancelDownload(content.id);
          return false;
        }

        try {
          const status = await nativeDownloadManager.getDownloadStatus(
            content.id,
          );

          if (status.progress !== undefined) {
            onProgress?.(status.progress);
            debugLog(`📊 Progression: ${(status.progress * 100).toFixed(1)}%`);
          }

          if (status.status === 8) {
            debugLog(`✅ Téléchargement terminé: ${content.title}`);
            onProgress?.(1.0);

            const nativePath = await this.checkNativeDownloadForContent(
              content.id,
            );
            if (nativePath) {
              await this.markAsDownloaded(content.id, nativePath);
              return true;
            }
          } else if (status.status === 16) {
            errorLog(`❌ Téléchargement échoué: ${content.title}`);
            return false;
          }
        } catch {
          debugLog(`⚠️ Statut non disponible: ${content.title}`);
        }

        await new Promise((resolve) => setTimeout(resolve, checkInterval));
        return poll(elapsedTime + checkInterval);
      };

      return await poll(0);
    } catch (error) {
      errorLog(`❌ Erreur téléchargement natif: ${content.title}`, error);
      return false;
    }
  }

  // 🚀 NOUVEAU : Vérifier le chemin de téléchargement natif
  private async checkNativeDownloadForContent(
    contentId: string,
  ): Promise<string | null> {
    try {
      // 1. Pour les récitations Quran (dossier spécifique)
      if (contentId.startsWith("quran_") || contentId.startsWith("reciter_")) {
        const reciterName = this.extractReciterNameFromId(contentId);
        const fileName = `${contentId}.mp3`;
        const quranPath = `${this.quranDirectory}/${reciterName}/${fileName}`;
        if (await RNFS.exists(quranPath)) return quranPath;
        return null;
      }

      // 2. Pour les Adhans : On utilise UNIQUEMENT le chemin standardisé
      const targetPath = this.getAdhanStoragePath(contentId);

      if (await RNFS.exists(targetPath)) {
        debugLog(`✅ Adhan trouvé (Standard): ${targetPath}`);
        return targetPath;
      }

      return null;
    } catch (error) {
      errorLog("❌ Erreur vérification chemin:", error);
      return null;
    }
  }

  private async downloadWithLegacySystem(
    content: PremiumContent,
    onProgress?: (progress: number) => void,
    onCancel?: () => boolean,
  ): Promise<boolean> {
    try {
      debugLog(`📥 Début téléchargement PROPRE: ${content.title}`);
      debugLog(`🔗 URL source: ${content.fileUrl}`);

      let downloadPath: string;
      let tempPathInCorrectDir: string;
      // Nom temporaire avec extension mp3 forcée
      const tempFileName = `temp_${content.id}_${Date.now()}.mp3`;

      // Gestion différenciée Quran vs Adhan
      if (
        content.type === "quran" ||
        content.id.startsWith("quran_") ||
        content.id.startsWith("reciter_")
      ) {
        const fileName = `${content.id}.mp3`;
        const reciterName = this.extractReciterNameFromId(content.id);
        // 🚀 FIX : Pour le Coran, utiliser un dossier spécifique mais la même logique de téléchargement
        // const reciterDir = `${this.quranDirectory}/${reciterName}`;
        // await RNFS.mkdir(reciterDir);
        downloadPath = `${this.quranDirectory}/${reciterName}/${fileName}`;
        // Créer le répertoire parent
        await RNFS.mkdir(`${this.quranDirectory}/${reciterName}`);

        tempPathInCorrectDir = `${this.quranDirectory}/${reciterName}/${tempFileName}`;
      } else {
        // 🎯 ADHAN : Utilisation du chemin standardisé forcé via le helper
        downloadPath = this.getAdhanStoragePath(content.id);
        // Le fichier temporaire va aussi dans le même dossier
        tempPathInCorrectDir = `${this.downloadDirectory}/${tempFileName}`;
      }

      debugLog(`🎯 Cible : ${downloadPath}`);

      // Nettoyage préventif du fichier cible
      if (await RNFS.exists(downloadPath)) {
        await RNFS.unlink(downloadPath);
      }

      // Récupérer le token d'authentification pour les headers
      const token = await AsyncStorage.getItem("auth_token");

      // 🚀 NOUVEAU : Gestion des URLs signées/redirections JSON
      // Certaines URLs renvoient un JSON avec la vraie URL de téléchargement (ex: adhans)
      let finalUrl = content.fileUrl;

      try {
        // Faire une requête HEAD/GET légère pour voir le type de contenu
        const response = await fetch(content.fileUrl, {
          method: "GET",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "User-Agent": "PrayerTimesApp/1.0 Android",
            Accept: "application/json",
          },
        });

        const contentType = response.headers.get("content-type");

        if (contentType && contentType.includes("application/json")) {
          const jsonResponse = await response.json();
          debugLog(
            "🔄 URL initiale renvoie du JSON, extraction de l'URL de téléchargement...",
          );

          if (
            jsonResponse.success &&
            jsonResponse.data &&
            jsonResponse.data.downloadUrl
          ) {
            finalUrl = jsonResponse.data.downloadUrl;
            debugLog(`🔗 Nouvelle URL cible: ${finalUrl}`);
          }
        }
      } catch (e) {
        debugLog(
          "⚠️ Impossible de vérifier le type de contenu avant téléchargement, utilisation URL directe",
        );
      }

      // Télécharger
      const options: RNFS.DownloadFileOptions = {
        fromUrl: finalUrl,
        toFile: tempPathInCorrectDir,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "User-Agent": "PrayerTimesApp/1.0 Android",
          Accept: "*/*",
        },
        progress: (res) => {
          if (onProgress) {
            // Vérifier l'annulation dans le callback de progression
            if (onCancel && onCancel()) return;
            const progress = (res.bytesWritten / res.contentLength) * 100;
            onProgress(Math.round(progress));
          }
        },
        progressDivider: 5,
      };

      const result = RNFS.downloadFile(options);

      // Attendre la promesse
      const finalRes = await result.promise;

      if (finalRes.statusCode === 200) {
        // Renommage final atomique
        await RNFS.moveFile(tempPathInCorrectDir, downloadPath);

        if (await RNFS.exists(downloadPath)) {
          const fileStat = await RNFS.stat(downloadPath);
          debugLog(
            `✅ Téléchargement réussi : ${downloadPath} (Taille: ${fileStat.size} octets)`,
          );

          // 🔍 DIAGNOSTIC CRITIQUE : Vérifier l'en-tête et la TAILLE du fichier
          try {
            // 2. Lire les 50 premiers caractères pour voir si c'est du HTML/PHP
            const header = await RNFS.read(downloadPath, 330, 0, "utf8");
            debugLog(
              `🔍 HEADER FICHIER (330 premiers caractères): ${header.replace(
                /\n/g,
                "\\n",
              )}`,
            );

            if (fileStat.size < 10000) {
              errorLog(
                `❌ FICHIER TROP PETIT (${fileStat.size} octets) - Ce n'est pas un MP3 valide !`,
              );
              // Afficher le contenu pour débogage
              errorLog(`📄 CONTENU DU FICHIER ERREUR: ${header}`);

              await RNFS.unlink(downloadPath);
              return false;
            }

            if (
              header.trim().startsWith("<") ||
              header.includes("<?php") ||
              header.includes("Error") ||
              header.startsWith("{") // JSON error
            ) {
              errorLog(
                "❌ LE FICHIER SEMBLE ÊTRE DU TEXTE/HTML/JSON ET NON UN MP3 !",
              );
              // 🚀 AUTO-FIX : Supprimer le fichier corrompu immédiatement
              await RNFS.unlink(downloadPath);
              return false;
            }
          } catch (hErr) {
            debugLog("⚠️ Impossible de lire le header ou la taille");
          }

          await this.markAsDownloaded(content.id, downloadPath);
          return true;
        }
      }

      // Nettoyage en cas d'échec (si le fichier temporaire existe encore)
      if (await RNFS.exists(tempPathInCorrectDir)) {
        await RNFS.unlink(tempPathInCorrectDir);
      }

      errorLog(`❌ Erreur téléchargement (Status: ${finalRes.statusCode})`);
      return false;
    } catch (error) {
      errorLog("❌ Exception téléchargement:", error);
      return false;
    }
  }

  // ✅ Marquer comme téléchargé
  private async markAsDownloaded(
    contentId: string,
    downloadPath: string,
  ): Promise<void> {
    try {
      // Utiliser le gestionnaire stratifié
      const downloadedContentRaw =
        await LocalStorageManager.getPremium("DOWNLOADED_CONTENT");
      const downloaded = downloadedContentRaw
        ? JSON.parse(downloadedContentRaw)
        : {};

      // 🚀 NOUVEAU : Enregistrer TOUTES les variantes possibles du nom pour garantir que Android le trouve
      const variants: string[] = [contentId];

      if (contentId.startsWith("adhan_")) {
        // Si ça commence par "adhan_", ajouter aussi la version sans préfixe
        const withoutPrefix = contentId.substring(6);
        variants.push(withoutPrefix);
        debugLog(`🔄 Variante AsyncStorage ajoutée: ${withoutPrefix}`);
      } else if (contentId.startsWith("azan_") || contentId.startsWith("al_")) {
        // Si ça commence par "azan_" ou autre, ajouter aussi la version avec préfixe "adhan_"
        const withPrefix = `adhan_${contentId}`;
        variants.push(withPrefix);
        debugLog(`🔄 Variante AsyncStorage ajoutée: ${withPrefix}`);
      }

      // Enregistrer toutes les variantes avec le même chemin
      for (const variant of variants) {
        downloaded[variant] = {
          downloadPath,
          downloadedAt: new Date().toISOString(),
        };
      }

      // Sauvegarder dans le gestionnaire stratifié (toujours premium + explicite)
      await LocalStorageManager.savePremium(
        "DOWNLOADED_CONTENT",
        downloaded,
        true,
        true,
      );

      // 🔧 AUSSI sauvegarder dans SharedPreferences accessibles depuis Android
      if (Platform.OS === "android") {
        const { NativeModules } = require("react-native");
        const { AdhanModule } = NativeModules;

        if (AdhanModule && AdhanModule.savePremiumContentData) {
          try {
            await AdhanModule.savePremiumContentData(
              JSON.stringify(downloaded),
            );
            debugLog(
              `✅ Données premium sauvées pour Android (${
                variants.length
              } variantes: ${variants.join(", ")})`,
            );
          } catch (error) {
            debugLog("❌ Erreur sauvegarde Android, mais AsyncStorage OK");
          }
        }
      }

      debugLog(
        `✅ Son premium ${contentId} marqué comme téléchargé: ${downloadPath} (${variants.length} variantes enregistrées)`,
      );
    } catch (error) {
      errorLog("❌ Erreur sauvegarde statut téléchargement:", error);
    }
  }

  // 🔧 FIX: Nettoyer l'ID pour éviter les doubles préfixes
  private cleanContentId(contentId: string): string {
    // Supprimer les doubles préfixes comme "adhan_adhan_" → "adhan_"
    if (contentId.startsWith("adhan_adhan_")) {
      return contentId.replace("adhan_adhan_", "adhan_");
    }
    if (contentId.startsWith("quran_quran_")) {
      return contentId.replace("quran_quran_", "quran_");
    }
    return contentId;
  }

  // 🚀 NOUVEAU : Méthode publique pour marquer comme téléchargé
  async markContentAsDownloaded(
    contentId: string,
    localPath: string,
  ): Promise<boolean> {
    try {
      // 🔧 FIX: Nettoyer l'ID avant utilisation
      const cleanId = this.cleanContentId(contentId);
      console.log(`📝 Marquer comme téléchargé: ${contentId} → ${cleanId}`);

      // Mettre à jour le catalogue local
      const catalog = await this.getPremiumCatalog();
      if (!catalog) {
        console.error("❌ Catalogue non disponible");
        return false;
      }

      // Trouver et mettre à jour le contenu
      let contentUpdated = false;

      // 🚀 NOUVEAU : Vérifier d'abord les adhans
      if (catalog.adhanVoices) {
        catalog.adhanVoices = catalog.adhanVoices.map((item) => {
          // 🔧 FIX: Comparer avec l'ID nettoyé ET l'ID original
          if (item.id === cleanId || item.id === contentId) {
            contentUpdated = true;
            return {
              ...item,
              isDownloaded: true,
              downloadPath: localPath.replace("file://", ""),
            };
          }
          return item;
        });
      }

      // Vérifier ensuite les récitations Quran
      if (!contentUpdated && catalog.quranRecitations) {
        catalog.quranRecitations = catalog.quranRecitations.map((item) => {
          // 🚀 FIX : Gérer les IDs de sourates spécifiques (quran_reciter_surah)
          if (
            item.id === cleanId ||
            item.id === contentId ||
            (cleanId.startsWith("quran_") &&
              item.id.startsWith("reciter_") &&
              cleanId.includes(item.id.replace("reciter_", "")))
          ) {
            contentUpdated = true;
            return {
              ...item,
              isDownloaded: true,
              downloadPath: localPath.replace("file://", ""),
            };
          }
          return item;
        });
      }

      if (!contentUpdated) {
        console.error(
          `❌ Contenu non trouvé: ${contentId} (nettoyé: ${cleanId})`,
        );
        return false;
      }

      // Sauvegarder le catalogue mis à jour
      await AsyncStorage.setItem(
        "premium_catalog_cache",
        JSON.stringify(catalog),
      );

      // 🚀 FIX : Sauvegarder aussi dans downloaded_premium_content
      await this.markAsDownloaded(contentId, localPath.replace("file://", ""));

      // 🚀 NOUVEAU : Synchroniser avec la base de données
      try {
        const syncManager = SyncManager.getInstance();
        await syncManager.syncDownloads();
      } catch (error) {
        console.log("Erreur synchronisation téléchargements:", error);
      }

      // console.log(`✅ Contenu marqué comme téléchargé: ${contentId}`);
      return true;
    } catch (error) {
      console.error("❌ Erreur marquage téléchargé:", error);
      return false;
    }
  }

  // 📱 Vérifier si contenu est téléchargé
  async isContentDownloaded(contentId: string): Promise<string | null> {
    if (this.isCheckingDownloads.has(contentId)) {
      debugLog(`🔄 Vérification déjà en cours pour: ${contentId}`);
      return null;
    }

    try {
      this.isCheckingDownloads.add(contentId);

      // Utiliser le gestionnaire stratifié
      const downloadedContentRaw =
        await LocalStorageManager.getPremium("DOWNLOADED_CONTENT");
      const downloaded = downloadedContentRaw
        ? JSON.parse(downloadedContentRaw)
        : {};

      const contentInfo = downloaded[contentId];
      if (!contentInfo || !contentInfo.downloadPath) {
        debugLog(`🔍 Contenu non téléchargé dans AsyncStorage: ${contentId}`);

        // 🚀 NOUVEAU : Vérifier aussi les téléchargements natifs
        const nativePath = await this.checkNativeDownloadForContent(contentId);
        if (nativePath) {
          debugLog(`✅ Fichier natif trouvé: ${nativePath}`);
          // Marquer comme téléchargé avec le chemin natif
          await this.markAsDownloaded(contentId, nativePath);
          return nativePath;
        }

        return null;
      }

      // Vérifier si le fichier existe réellement
      const fileExists = await RNFS.exists(contentInfo.downloadPath);
      if (!fileExists) {
        debugLog(`❌ Fichier manquant: ${contentInfo.downloadPath}`);
        return null;
      }

      return contentInfo.downloadPath;
    } catch (error) {
      errorLog("❌ Erreur vérification téléchargement:", error);
      return null;
    } finally {
      this.isCheckingDownloads.delete(contentId);
    }
  }

  // 🗑️ Supprimer contenu premium
  async deletePremiumContent(contentId: string): Promise<boolean> {
    try {
      console.log(`🗑️ Tentative de suppression: ${contentId}`);

      // Récupérer les informations de téléchargement
      const downloadedContent =
        await LocalStorageManager.getPremium("DOWNLOADED_CONTENT");
      const downloaded = downloadedContent ? JSON.parse(downloadedContent) : {};

      const contentInfo = downloaded[contentId];
      if (!contentInfo) {
        console.log(`⚠️ Contenu non trouvé dans la base: ${contentId}`);
        return false;
      }

      const downloadPath = contentInfo.downloadPath;
      if (!downloadPath) {
        console.log(`⚠️ Pas de chemin de fichier pour: ${contentId}`);
        // Supprimer quand même l'entrée de la base
        delete downloaded[contentId];
        await LocalStorageManager.savePremium(
          "DOWNLOADED_CONTENT",
          downloaded,
          true,
          true,
        );
        return true;
      }

      // 🚀 NOUVEAU : Supprimer le fichier du chemin enregistré
      const fileExists = await RNFS.exists(downloadPath);
      if (fileExists) {
        try {
          await RNFS.unlink(downloadPath);
          console.log(`🗑️ Fichier supprimé: ${downloadPath}`);
        } catch (unlinkError) {
          console.log(`⚠️ Erreur suppression fichier: ${unlinkError}`);
          // Continuer même si le fichier ne peut pas être supprimé
        }
      } else {
        console.log(`⚠️ Fichier n'existe pas: ${downloadPath}`);
      }

      // 🚀 FIX : Supprimer uniquement du stockage interne
      const possiblePaths = [`${this.downloadDirectory}/${contentId}.mp3`];

      await Promise.all(
        possiblePaths.map(async (path) => {
          if (path === downloadPath) return;
          try {
            const exists = await RNFS.exists(path);
            if (exists) {
              await RNFS.unlink(path);
              console.log(`🗑️ Fichier supprimé (dossier alternatif): ${path}`);
            }
          } catch (error) {
            console.log(`⚠️ Erreur suppression fichier alternatif: ${error}`);
          }
        }),
      );

      // Retirer de la liste des téléchargés
      delete downloaded[contentId];
      await LocalStorageManager.savePremium(
        "DOWNLOADED_CONTENT",
        downloaded,
        true,
        true,
      );

      // 🚀 NOUVEAU : Synchroniser avec la base de données
      try {
        const syncManager = SyncManager.getInstance();
        await syncManager.syncDownloads();
      } catch (error) {
        console.log("Erreur synchronisation téléchargements:", error);
      }

      // 🚀 CRITIQUE : Mettre à jour le catalogue en cache pour refléter la suppression
      try {
        const catalog = await this.getPremiumCatalog();
        if (catalog) {
          let updated = false;

          // Mettre à jour les Adhans
          if (catalog.adhanVoices) {
            catalog.adhanVoices = catalog.adhanVoices.map((item) => {
              if (
                item.id === contentId ||
                item.id === this.cleanContentId(contentId)
              ) {
                updated = true;
                return {
                  ...item,
                  isDownloaded: false,
                  downloadPath: undefined,
                };
              }
              return item;
            });
          }

          // Mettre à jour le Quran
          if (catalog.quranRecitations) {
            catalog.quranRecitations = catalog.quranRecitations.map((item) => {
              if (
                item.id === contentId ||
                item.id === this.cleanContentId(contentId)
              ) {
                updated = true;
                return {
                  ...item,
                  isDownloaded: false,
                  downloadPath: undefined,
                };
              }
              return item;
            });
          }

          if (updated) {
            await AsyncStorage.setItem(
              "premium_catalog_cache",
              JSON.stringify(catalog),
            );
            debugLog(
              `✅ Catalogue cache mis à jour après suppression: ${contentId}`,
            );
          }
        }
      } catch (catError) {
        console.log("Erreur mise à jour catalogue cache:", catError);
      }

      // console.log(`✅ Contenu supprimé: ${contentId}`);
      return true;
    } catch (error) {
      errorLog(`❌ Erreur suppression ${contentId}:`, error);
      return false;
    }
  }

  // 🔄 NOUVELLE FONCTION : Migration des anciens fichiers pour éviter les conflits
  async migrateLegacyDownloads(): Promise<void> {
    try {
      debugLog("🔄 Début migration des téléchargements existants...");

      const downloadedContent =
        await LocalStorageManager.getPremium("DOWNLOADED_CONTENT");
      if (!downloadedContent) {
        debugLog("✅ Aucun téléchargement existant à migrer");
        return;
      }

      const downloaded = JSON.parse(downloadedContent);
      const migrationEntries = Object.entries(downloaded) as [string, any][];

      const migrationPlans = await Promise.all(
        migrationEntries.map(async ([contentId, info]) => {
          const currentPath = info.downloadPath;
          if (!currentPath || !(await RNFS.exists(currentPath))) {
            return null;
          }
          const fileName = currentPath.split("/").pop() || "";
          if (fileName.includes(contentId.replace(/\s+/g, "_").toLowerCase())) {
            return null;
          }
          const fileExtension = fileName.split(".").pop() || "mp3";
          const newFileName = `${contentId
            .replace(/\s+/g, "_")
            .toLowerCase()}.${fileExtension}`;

          let newPath: string;
          if (
            contentId.startsWith("quran_") ||
            contentId.startsWith("reciter_")
          ) {
            newPath = `${this.quranDirectory}/${newFileName}`;
            debugLog(`📖 Migration Quran: ${contentId} -> ${newPath}`);
          } else {
            newPath = `${this.downloadDirectory}/${newFileName}`;
            debugLog(`🎵 Migration Adhan: ${contentId} -> ${newPath}`);
          }

          return {
            oldPath: currentPath,
            newPath: newPath,
            contentId: contentId,
          };
        }),
      );

      const migrations = migrationPlans.filter(
        (m): m is { oldPath: string; newPath: string; contentId: string } =>
          m != null,
      );

      const execResults = await Promise.allSettled(
        migrations.map(async (migration) => {
          await RNFS.copyFile(migration.oldPath, migration.newPath);
          downloaded[migration.contentId] = {
            ...downloaded[migration.contentId],
            downloadPath: migration.newPath,
            migratedAt: new Date().toISOString(),
          };
          await RNFS.unlink(migration.oldPath);
          debugLog(`✅ Migré: ${migration.contentId}`);
        }),
      );

      let migratedCount = 0;
      execResults.forEach((r, i) => {
        if (r.status === "fulfilled") {
          migratedCount++;
        } else {
          errorLog(`❌ Erreur migration ${migrations[i].contentId}:`, r.reason);
        }
      });

      // Sauvegarder les changements
      if (migratedCount > 0) {
        await LocalStorageManager.savePremium(
          "DOWNLOADED_CONTENT",
          downloaded,
          true,
          true,
        );
        debugLog(`🔄 Migration terminée: ${migratedCount} fichiers migrés`);
      } else {
        debugLog("✅ Aucun fichier à migrer");
      }
    } catch (error) {
      errorLog("❌ Erreur lors de la migration:", error);
    }
  }

  // 📊 Obtenir l'espace utilisé par le contenu premium
  async getPremiumContentSize(): Promise<number> {
    try {
      const downloadedContent =
        await LocalStorageManager.getPremium("DOWNLOADED_CONTENT");
      const downloaded = downloadedContent ? JSON.parse(downloadedContent) : {};

      const values = Object.values(downloaded) as any[];
      const sizes = await Promise.all(
        values.map(async (contentInfo) => {
          if (!contentInfo?.downloadPath) return 0;
          if (!(await RNFS.exists(contentInfo.downloadPath))) return 0;
          const stat = await RNFS.stat(contentInfo.downloadPath);
          return stat.size;
        }),
      );
      const totalSize = sizes.reduce((sum, n) => sum + n, 0);

      return totalSize / (1024 * 1024); // Retourner en MB
    } catch (error) {
      errorLog("❌ Erreur calcul taille premium:", error);
      return 0;
    }
  }

  // 🎵 NOUVELLES MÉTHODES STREAMING - Réduction 70% bande passante

  /**
   * 🎵 Créer une session de streaming au lieu de télécharger
   * Économise ~70% de bande passante par rapport au téléchargement complet
   */
  async createStreamingSession(
    content: PremiumContent,
  ): Promise<string | null> {
    try {
      debugLog(`🎵 Création session streaming pour: ${content.title}`);

      // 🚀 NOUVEAU : Obtenir l'URL optimale (Serveur Personnel → Firebase)
      const optimalUrl = await this.getOptimalAudioUrl(content);
      if (!optimalUrl) {
        errorLog("❌ Impossible d'obtenir une URL audio valide");
        return null;
      }

      // Estimer la durée basée sur le type de contenu
      const estimatedDuration = this.estimateContentDuration(content);

      // Créer la session de streaming avec l'URL optimale
      const sessionId = await this.streamingManager.createStreamingSession(
        content.id,
        optimalUrl,
        estimatedDuration,
      );

      debugLog(`✅ Session streaming créée: ${sessionId}`);
      return sessionId;
    } catch (error) {
      errorLog("❌ Erreur création session streaming:", error);
      return null;
    }
  }

  /**
   * 🚀 Démarrer le streaming optimisé avec CDN
   */
  async startOptimizedStreaming(sessionId: string): Promise<any> {
    try {
      debugLog(`▶️ Démarrage streaming optimisé: ${sessionId}`);

      const sound = await this.streamingManager.startStreaming(sessionId);
      if (sound) {
        debugLog("✅ Streaming démarré avec succès");
        return sound;
      } else {
        errorLog("❌ Échec démarrage streaming");
        return null;
      }
    } catch (error) {
      errorLog("❌ Erreur streaming optimisé:", error);
      return null;
    }
  }

  /**
   * ⏹️ Arrêter le streaming
   */
  async stopStreaming(sessionId: string): Promise<void> {
    try {
      await this.streamingManager.stopStreaming(sessionId);
      debugLog(`⏹️ Streaming arrêté: ${sessionId}`);
    } catch (error) {
      errorLog("❌ Erreur arrêt streaming:", error);
    }
  }

  /**
   * 📊 Obtenir les statistiques de données économisées
   */
  getDataSavingsStats(): {
    totalSavedMB: number;
    bandwidthReduction: string;
    streamsActive: number;
    estimatedCostSavings: string;
  } {
    const stats = this.streamingManager.getStreamingStats();

    // Calculs approximatifs des économies
    const totalSavedMB = stats.totalDataSaved;
    const bandwidthReduction = "~70%"; // Réduction typique du streaming vs téléchargement
    const estimatedCostSavings = `~${Math.round(totalSavedMB * 0.05)}€`; // ~0.05€/GB Infomaniak

    return {
      totalSavedMB,
      bandwidthReduction,
      streamsActive: stats.activeSessions,
      estimatedCostSavings,
    };
  }

  // Méthodes utilitaires privées pour le streaming

  /**
   * 🔗 Obtenir l'URL audio depuis Infomaniak
   */
  private async getOptimalAudioUrl(
    content: PremiumContent,
  ): Promise<string | null> {
    try {
      debugLog(`🔍 Recherche URL optimale pour: ${content.title}`);

      // 🥇 PRIORITÉ 1 : Serveur personnel (96% d'économie)
      const customServerResponse =
        await this.customServerManager.getAudioUrl(content);
      if (customServerResponse.success && customServerResponse.url) {
        await this.customServerManager.recordUsage(customServerResponse.source);
        debugLog(`✅ Serveur personnel: ${customServerResponse.url}`);
        return customServerResponse.url;
      }

      // 🥈 PRIORITÉ 2 : Infomaniak (fallback)
      debugLog("🔄 Fallback vers Infomaniak...");
      if (content.fileUrl) {
        debugLog(`✅ Infomaniak: ${content.fileUrl}`);
        return content.fileUrl;
      }

      errorLog("❌ Aucune source audio disponible pour:", content.title);
      return null;
    } catch (error) {
      errorLog("❌ Erreur obtention URL optimale:", error);
      return null;
    }
  }

  /**
   * 🔗 Obtenir l'URL complète depuis Infomaniak
   */
  private async getInfomaniakUrl(filePath: string): Promise<string | null> {
    debugLog("🔍 getInfomaniakUrl - Méthode pour Infomaniak");
    return filePath;
  }

  // 🔧 NOUVEAU : Synchroniser le JSON avec les fichiers physiques
  public async syncDownloadedContentWithFiles(): Promise<{
    fixed: number;
    errors: string[];
  }> {
    try {
      debugLog("🔄 Synchronisation JSON ↔ Fichiers physiques...");

      const result = { fixed: 0, errors: [] as string[] };

      // 1. Charger le JSON actuel
      const downloadedContentRaw =
        await LocalStorageManager.getPremium("DOWNLOADED_CONTENT");
      const downloaded = downloadedContentRaw
        ? JSON.parse(downloadedContentRaw)
        : {};

      // 2. Scanner le dossier premium_content
      try {
        const files = await RNFS.readDir(this.downloadDirectory);

        for (const file of files) {
          if (file.isFile() && file.name.endsWith(".mp3")) {
            // Extraire l'ID depuis le nom de fichier (ex: adhan_azan_madina.mp3 → adhan_azan_madina)
            const contentId = file.name.replace(".mp3", "");

            // Vérifier si cette entrée existe dans le JSON
            if (!downloaded[contentId]) {
              debugLog(`🔧 Fichier orphelin trouvé: ${file.name}`);

              // Ajouter l'entrée manquante
              downloaded[contentId] = {
                downloadPath: file.path,
                downloadedAt: new Date(file.mtime || Date.now()).toISOString(),
                fileSize: file.size,
                syncedAt: new Date().toISOString(),
              };

              result.fixed++;
              debugLog(`✅ Entrée ajoutée pour: ${contentId}`);
            }
          }
        }

        // 3. Sauvegarder le JSON mis à jour
        if (result.fixed > 0) {
          await LocalStorageManager.savePremium(
            "DOWNLOADED_CONTENT",
            downloaded,
            true,
            true,
          );

          // 🔧 AUSSI sauvegarder dans SharedPreferences accessibles depuis Android
          if (Platform.OS === "android") {
            const { NativeModules } = require("react-native");
            const { AdhanModule } = NativeModules;

            if (AdhanModule && AdhanModule.savePremiumContentData) {
              try {
                await AdhanModule.savePremiumContentData(
                  JSON.stringify(downloaded),
                );
                debugLog("✅ Données premium synchronisées pour Android");
              } catch (error) {
                debugLog("❌ Erreur sauvegarde Android:", error);
              }
            }
          }

          debugLog(
            `🎉 Synchronisation terminée: ${result.fixed} entrées ajoutées`,
          );
        } else {
          debugLog("✅ Aucune désynchronisation détectée");
        }
      } catch (readError) {
        result.errors.push(`Erreur lecture dossier: ${readError}`);
      }

      return result;
    } catch (error) {
      errorLog("❌ Erreur synchronisation:", error);
      return { fixed: 0, errors: [`Erreur générale: ${error}`] };
    }
  }

  // 🧹 Nettoyer les téléchargements corrompus
  public async cleanupCorruptedDownloads(): Promise<void> {
    try {
      debugLog("🧹 Début nettoyage des téléchargements corrompus...");

      const downloadedContent =
        await LocalStorageManager.getPremium("DOWNLOADED_CONTENT");
      if (!downloadedContent) {
        debugLog("✅ Aucun téléchargement à nettoyer");
        return;
      }

      const downloaded = JSON.parse(downloadedContent);
      let hasCorruptedFiles = false;
      let cleanedCount = 0;

      const entries = Object.entries(downloaded) as [string, any][];

      const inspections = await Promise.all(
        entries.map(async ([contentId, contentInfo]) => {
          const info = contentInfo;
          if (!info.downloadPath) {
            return { contentId, info, shouldDelete: false, fileName: "" };
          }

          const fileName = info.downloadPath.split("/").pop() || "";
          const isNameCorrupted =
            fileName.includes("?") ||
            fileName.includes("&") ||
            fileName.includes("+") ||
            fileName.includes("%") ||
            fileName.length > 100;

          if (isNameCorrupted) {
            debugLog(`🧹 Nom de fichier corrompu détecté: ${fileName}`);
            return { contentId, info, shouldDelete: true, fileName };
          }

          try {
            const fileExists = await RNFS.exists(info.downloadPath);
            if (!fileExists) {
              debugLog(`🧹 Fichier manquant détecté: ${fileName}`);
              return { contentId, info, shouldDelete: true, fileName };
            }
            const fileStats = await RNFS.stat(info.downloadPath);
            const fileSizeInBytes = fileStats.size;
            const fileSizeInKB = fileSizeInBytes / 1024;

            if (fileSizeInBytes === 0) {
              debugLog(`🧹 Fichier vide détecté: ${fileName} (0 bytes)`);
              return { contentId, info, shouldDelete: true, fileName };
            }
            if (fileSizeInKB < 10) {
              debugLog(
                `🧹 Fichier trop petit détecté: ${fileName} (${fileSizeInKB.toFixed(
                  1,
                )}KB)`,
              );
              return { contentId, info, shouldDelete: true, fileName };
            }
            if (!fileName.toLowerCase().endsWith(".mp3")) {
              debugLog(`🧹 Format de fichier non supporté: ${fileName}`);
              return { contentId, info, shouldDelete: true, fileName };
            }
          } catch {
            debugLog(
              `🧹 Erreur accès fichier, considéré comme corrompu: ${fileName}`,
            );
            return { contentId, info, shouldDelete: true, fileName };
          }

          return { contentId, info, shouldDelete: false, fileName };
        }),
      );

      const toClean = inspections.filter((x) => x.shouldDelete);
      hasCorruptedFiles = toClean.length > 0;
      cleanedCount = toClean.length;

      for (const row of toClean) {
        delete downloaded[row.contentId];
      }

      await Promise.all(
        toClean.map(async (row) => {
          try {
            const fileExists = await RNFS.exists(row.info.downloadPath);
            if (fileExists) {
              await RNFS.unlink(row.info.downloadPath);
              debugLog(
                `🗑️ Fichier corrompu supprimé: ${row.info.downloadPath}`,
              );
            }
          } catch (unlinkError) {
            debugLog(`⚠️ Erreur suppression fichier corrompu: ${unlinkError}`);
          }
          await this.cleanupFileFromAllLocations(row.fileName);
        }),
      );

      if (hasCorruptedFiles) {
        // Sauvegarder la base nettoyée
        await LocalStorageManager.savePremium(
          "DOWNLOADED_CONTENT",
          downloaded,
          true,
          true,
        );
        debugLog(
          `✅ Nettoyage terminé: ${cleanedCount} fichiers corrompus supprimés`,
        );
      } else {
        debugLog("✅ Aucun fichier corrompu trouvé");
      }
    } catch (error) {
      errorLog("❌ Erreur nettoyage fichiers corrompus:", error);
    }
  }

  // 🚀 NOUVEAU : Nettoyer un fichier de tous les emplacements possibles
  private async cleanupFileFromAllLocations(fileName: string): Promise<void> {
    try {
      const locations = [
        this.downloadDirectory,
        `${RNFS.ExternalDirectoryPath}/Downloads/premium_content`,
        `${RNFS.ExternalDirectoryPath}/Downloads`,
        `${RNFS.DocumentDirectoryPath}/Downloads`,
      ];

      await Promise.all(
        locations.map(async (location) => {
          try {
            const filePath = `${location}/${fileName}`;
            const exists = await RNFS.exists(filePath);
            if (exists) {
              await RNFS.unlink(filePath);
              debugLog(`🗑️ Fichier supprimé de ${location}: ${fileName}`);
            }
          } catch {
            // Ignorer les erreurs pour les dossiers qui n'existent pas
          }
        }),
      );
    } catch (error) {
      debugLog(`⚠️ Erreur nettoyage multi-emplacements: ${error}`);
    }
  }

  /**
   * ⏱️ Estimer la durée du contenu basé sur le type et la taille
   */
  private estimateContentDuration(content: PremiumContent): number {
    // Estimations basées sur des moyennes réelles
    switch (content.type) {
      case "adhan":
        return 180; // 3 minutes pour un adhan typique
      case "quran":
        // Estimation basée sur la taille du fichier (1MB ≈ 1 minute d'audio compressé)
        return Math.max(60, content.fileSize * 60);
      case "dhikr":
        return 300; // 5 minutes pour une collection de dhikr
      default:
        return 300; // 5 minutes par défaut
    }
  }

  // 📖 Scanner seulement les récitateurs depuis Infomaniak + Locaux
  private async scanQuranRecitersOnly(): Promise<PremiumContent[]> {
    try {
      debugLog("🔍 Scan des récitateurs Quran depuis Infomaniak + Locaux");

      const reciters: PremiumContent[] = [];
      const reciterNames = new Set<string>();

      // 1. Scanner depuis Infomaniak (centralisé)
      try {
        const response = await apiClient.getRecitationsCatalog();
        if (response.success && response.data) {
          const availableReciters =
            (response.data as any).availableReciters || [];
          for (const reciterName of availableReciters) {
            reciterNames.add(reciterName);
            debugLog(`🌐 Récitateur Infomaniak: ${reciterName}`);
          }
        }
      } catch (error) {
        debugLog(
          "⚠️ Erreur API Infomaniak, utilisation des récitateurs locaux uniquement",
        );
      }

      // 2. Scanner les récitateurs locaux (dossiers téléchargés)
      try {
        const localReciters = await this.scanLocalReciters();
        for (const reciterName of localReciters) {
          reciterNames.add(reciterName);
          debugLog(`📁 Récitateur local: ${reciterName}`);
        }
      } catch (error) {
        debugLog("⚠️ Erreur scan récitateurs locaux");
      }

      // 3. Créer les entrées pour tous les récitateurs trouvés
      for (const reciterName of reciterNames) {
        const reciterEntry: PremiumContent = {
          id: `reciter_${reciterName.replace(/\s+/g, "_").toLowerCase()}`,
          type: "quran",
          title: reciterName,
          description: `Récitateur: ${reciterName}`,
          fileUrl: `${
            AppConfig.RECITATIONS_API
          }?action=catalog&reciter=${encodeURIComponent(reciterName)}`,
          fileSize: 0, // Pas applicable pour un récitateur
          version: "1.0",
          isDownloaded: false, // Sera calculé à la demande
          reciter: reciterName,
          surahNumber: 0, // Pas de sourate spécifique
          surahName: "Récitateur",
        };

        reciters.push(reciterEntry);
      }

      debugLog(
        `📖 Récitateurs Quran: ${reciters.length} récitateurs trouvés (Infomaniak + Locaux)`,
      );
      return reciters;
    } catch (error) {
      errorLog("❌ Erreur scan récitateurs:", error);
      return [];
    }
  }

  // 🎵 NOUVEAU : Scanner les adhans premium depuis Infomaniak (VERSION OPTIMISÉE)
  private async scanAdhanVoicesOnly(): Promise<PremiumContent[]> {
    try {
      debugLog("🔍 Scan des adhans premium depuis Infomaniak");

      const adhans: PremiumContent[] = [];

      // 🚀 OPTIMISATION : Récupérer la liste des téléchargements une seule fois
      const downloadedContent = await this.getAllDownloadedContent();
      debugLog(
        `💾 Téléchargements trouvés: ${downloadedContent.size} fichiers`,
      );

      // Scanner depuis Infomaniak (centralisé)
      try {
        const result = await apiClient.getAdhanCatalog();
        if (result.success && result.data) {
          // 🔧 NOUVEAU : Utiliser les détails complets avec vraies tailles depuis l'API
          const adhanDetails = (result.data as any).adhanDetails || [];
          const availableAdhans = (result.data as any).availableAdhans || []; // Fallback compatibilité

          debugLog(
            `🎵 ${
              adhanDetails.length || availableAdhans.length
            } adhans trouvés sur Infomaniak`,
          );

          const token = await AsyncStorage.getItem("auth_token");
          const tokenParam = token ? `&token=${encodeURIComponent(token)}` : "";

          // 🔧 NOUVEAU : Utiliser les détails complets si disponibles, sinon fallback sur ancienne méthode
          let adhanPromises: Promise<PremiumContent>[];

          if (adhanDetails.length > 0) {
            // 🚀 NOUVEAU : Traiter les adhans avec vraies tailles depuis l'API
            adhanPromises = adhanDetails.map(async (adhanDetail: any) => {
              const adhanName = adhanDetail.name;
              const realFileSize = adhanDetail.sizeMB; // 🔧 VRAIE taille depuis l'API !

              // 🔧 FIX: Éviter la duplication du préfixe "adhan_"
              const cleanName = adhanName.toLowerCase().replace(/\s+/g, "_");
              const adhanId = cleanName.startsWith("adhan_")
                ? cleanName
                : `adhan_${cleanName}`;

              // 🚀 Vérification rapide du téléchargement (depuis le cache)
              const downloadPath = downloadedContent.get(adhanId);
              const isDownloaded = !!downloadPath;

              debugLog(
                `📏 ${adhanName}: ${realFileSize} MB (taille réelle depuis API)`,
              );

              // 🍎 Ajouter le paramètre platform pour iOS/Android
              const platformParam =
                Platform.OS === "ios" ? "&platform=ios" : "&platform=android";

              const adhanEntry: PremiumContent = {
                id: adhanId,
                type: "adhan",
                title: adhanName,
                description: `Adhan premium: ${adhanName}`,
                fileUrl: `${
                  AppConfig.ADHANS_API
                }?action=download&adhan=${encodeURIComponent(
                  adhanName,
                )}${tokenParam}${platformParam}`,
                fileSize: realFileSize, // 🔧 VRAIE taille depuis l'API !
                version: "1.0",
                isDownloaded: isDownloaded,
                downloadPath: downloadPath || undefined,
              };

              return adhanEntry;
            });
          } else {
            // 🔧 FALLBACK : Utiliser l'ancienne méthode si pas de détails disponibles
            debugLog(
              "⚠️ Pas de détails d'adhans dans l'API, utilisation de l'ancienne méthode",
            );
            const adhanMeta = availableAdhans.map((adhanName: string) => {
              const cleanName = adhanName.toLowerCase().replace(/\s+/g, "_");
              const adhanId = cleanName.startsWith("adhan_")
                ? cleanName
                : `adhan_${cleanName}`;
              const downloadPath = downloadedContent.get(adhanId);
              return {
                adhanName,
                adhanId,
                downloadPath,
                isDownloaded: !!downloadPath,
              };
            });

            const realFileSizes = await Promise.all(
              adhanMeta.map(
                async ({
                  adhanName,
                  downloadPath,
                  isDownloaded,
                }: {
                  adhanName: string;
                  downloadPath: string;
                  isDownloaded: boolean;
                }) => {
                  if (isDownloaded && downloadPath) {
                    try {
                      const fileStats = await RNFS.stat(downloadPath);
                      const size =
                        Math.round((fileStats.size / 1024 / 1024) * 100) / 100;
                      debugLog(`📏 Taille réelle de ${adhanName}: ${size} MB`);
                      return size;
                    } catch {
                      debugLog(
                        `⚠️ Impossible de lire la taille de ${adhanName}, utilisation de l'estimation`,
                      );
                      return this.estimateAdhanFileSize(adhanName);
                    }
                  }
                  return this.estimateAdhanFileSize(adhanName);
                },
              ),
            );

            adhanPromises = adhanMeta.map(
              (
                m: {
                  adhanId: string;
                  adhanName: string;
                  downloadPath: string;
                  isDownloaded: boolean;
                },
                i: number,
              ) => {
                const realFileSize = realFileSizes[i];
                const platformParam =
                  Platform.OS === "ios" ? "&platform=ios" : "&platform=android";
                const adhanEntry: PremiumContent = {
                  id: m.adhanId,
                  type: "adhan",
                  title: m.adhanName,
                  description: `Adhan premium: ${m.adhanName}`,
                  fileUrl: `${
                    AppConfig.ADHANS_API
                  }?action=download&adhan=${encodeURIComponent(
                    m.adhanName,
                  )}${tokenParam}${platformParam}`,
                  fileSize: realFileSize,
                  version: "1.0",
                  isDownloaded: m.isDownloaded,
                  downloadPath: m.downloadPath || undefined,
                };
                return Promise.resolve(adhanEntry);
              },
            );
          }

          // 🚀 Attendre tous les adhans en parallèle
          const adhanResults = await Promise.all(adhanPromises);
          adhans.push(...adhanResults);

          debugLog(`🎵 ${adhans.length} adhans traités en parallèle`);
        }
      } catch (error) {
        debugLog("⚠️ Erreur API Infomaniak pour les adhans");
      }

      debugLog(`✅ Scan terminé: ${adhans.length} adhans trouvés`);
      return adhans;
    } catch (error) {
      errorLog("❌ Erreur scan adhans:", error);
      return [];
    }
  }

  // 🚀 NOUVEAU : Récupérer tous les téléchargements en une seule fois (optimisé)
  private async getAllDownloadedContent(): Promise<Map<string, string>> {
    const downloadedContent = new Map<string, string>();

    try {
      // Utiliser le gestionnaire stratifié
      const stored = await LocalStorageManager.getPremium("DOWNLOADED_CONTENT");
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([id, data]) => {
          if (typeof data === "string") {
            downloadedContent.set(id, data);
          } else if (
            data &&
            typeof data === "object" &&
            (data as any).downloadPath
          ) {
            downloadedContent.set(id, (data as any).downloadPath);
          }
        });
      }

      // 2. Scanner rapidement le dossier de téléchargement principal
      try {
        const files = await RNFS.readDir(this.downloadDirectory);
        for (const file of files) {
          if (file.isFile() && file.name.endsWith(".mp3")) {
            const contentId = file.name.replace(/\.mp3$/, "");
            downloadedContent.set(contentId, file.path);
          }
        }
      } catch (error) {
        debugLog("⚠️ Erreur scan dossier principal:", error);
      }

      // 🚀 NOUVEAU : 3. Scanner aussi le dossier des téléchargements natifs
      try {
        const nativeDownloadDir = `${RNFS.ExternalDirectoryPath}/Downloads/premium_content`;
        const nativeExists = await RNFS.exists(nativeDownloadDir);

        if (nativeExists) {
          const nativeFiles = await RNFS.readDir(nativeDownloadDir);
          for (const file of nativeFiles) {
            if (file.isFile() && file.name.endsWith(".mp3")) {
              const contentId = file.name.replace(/\.mp3$/, "");
              // Ne pas écraser si déjà trouvé dans le dossier principal
              if (!downloadedContent.has(contentId)) {
                downloadedContent.set(contentId, file.path);
              }
            }
          }
          debugLog(
            `🎯 Téléchargements natifs trouvés: ${
              nativeFiles.filter((f) => f.isFile() && f.name.endsWith(".mp3"))
                .length
            } fichiers`,
          );
        } else {
          debugLog("📁 Dossier téléchargements natifs n'existe pas encore");
        }
      } catch (error) {
        debugLog("⚠️ Erreur scan dossier natif:", error);
      }

      debugLog(
        `💾 Téléchargements trouvés dans getAllDownloadedContent: ${downloadedContent.size} fichiers`,
      );
      return downloadedContent;
    } catch (error) {
      debugLog("⚠️ Erreur récupération téléchargements:", error);
      return new Map();
    }
  }

  // 🎯 NOUVEAU : Scanner les récitateurs locaux
  private async scanLocalReciters(): Promise<string[]> {
    try {
      const localReciters: string[] = [];

      // Scanner le dossier premium_content pour les récitations téléchargées
      const files = await RNFS.readDir(this.downloadDirectory);

      for (const file of files) {
        if (file.isFile() && file.name.endsWith(".mp3")) {
          // Extraire le nom du récitateur depuis l'ID du fichier
          // Format: quran_[reciter]_[surah].mp3
          const match = file.name.match(/^quran_(.+?)_\d+\.mp3$/);
          if (match) {
            const reciterName = match[1]
              .replace(/_/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase());
            if (!localReciters.includes(reciterName)) {
              localReciters.push(reciterName);
            }
          }
        }
      }

      return localReciters;
    } catch (error) {
      errorLog("❌ Erreur scan récitateurs locaux:", error);
      return [];
    }
  }

  /** Taille réelle d'un MP3 local (Mo), arrondie à 2 décimales. */
  private async getLocalFileSizeMb(filePath: string): Promise<number> {
    try {
      const exists = await RNFS.exists(filePath);
      if (!exists) return 0;
      const stat = await RNFS.stat(filePath);
      const bytes = Number(stat.size) || 0;
      if (bytes <= 0) return 0;
      return Math.round((bytes / (1024 * 1024)) * 100) / 100;
    } catch {
      return 0;
    }
  }

  // 🎯 NOUVEAU : Scanner une sourate spécifique pour un récitateur (à la demande)
  async getSpecificRecitation(
    reciterName: string,
    surahNumber: number,
    options?: { forceRefresh?: boolean },
  ): Promise<PremiumContent | null> {
    try {
      debugLog(
        `🔍 Recherche sourate ${surahNumber} pour ${reciterName} depuis Infomaniak`,
      );

      const surahCode = surahNumber.toString().padStart(3, "0");
      const cacheBust =
        options?.forceRefresh !== false ? `&_=${Date.now()}` : "";

      // 🚀 NOUVEAU : Utiliser l'API Infomaniak pour récupérer les infos de la sourate
      const token = await AsyncStorage.getItem("auth_token");
      const response = await fetch(
        `${AppConfig.RECITATIONS_API}?action=surah&reciter=${encodeURIComponent(
          reciterName,
        )}&surah=${surahCode}${cacheBust}`,
        {
          headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );
      const result = await response.json();

      if (!result.success) {
        debugLog(`❌ Erreur API Infomaniak: ${result.message}`);
        return null;
      }

      const surahData = result.data;
      const recitationId = `quran_${reciterName
        .replace(/\s+/g, "_")
        .toLowerCase()}_${surahNumber}`;

      // Vérifier si le fichier est téléchargé localement
      const downloadPath = await this.isContentDownloaded(recitationId);
      const isDownloaded = !!downloadPath;

      let fileSizeMb =
        typeof surahData.fileSizeMB === "number"
          ? surahData.fileSizeMB
          : parseFloat(surahData.fileSizeMB) || 0;

      // Fichier local : priorité à la taille réelle (ex. remplacement 40 Mo → 171 Mo sur le serveur)
      if (downloadPath) {
        const localMb = await this.getLocalFileSizeMb(downloadPath);
        if (localMb > 0) {
          fileSizeMb = localMb;
          debugLog(`📏 Taille locale ${recitationId}: ${localMb} Mo`);
        }
      }

      // Parser les infos de la sourate
      const parsedInfo = this.parseQuranFileName(
        `${surahCode}.mp3`,
        reciterName,
      );

      let durationMs = 0;
      if (typeof surahData.durationMs === "number" && surahData.durationMs > 0) {
        durationMs = Math.round(surahData.durationMs);
      } else if (
        typeof surahData.durationSeconds === "number" &&
        surahData.durationSeconds > 0
      ) {
        durationMs = Math.round(surahData.durationSeconds * 1000);
      }

      const recitation: PremiumContent = {
        id: recitationId,
        type: "quran",
        title: parsedInfo.fullTitle,
        description: `Sourate ${parsedInfo.surahNumber}: ${parsedInfo.surahName} récitée par ${reciterName}`,
        fileUrl:
          surahData.streamUrl ||
          (typeof surahData.downloadUrl === "string"
            ? surahData.downloadUrl.replace(/action=download/g, "action=stream")
            : surahData.downloadUrl),
        fileSize: fileSizeMb,
        durationMs: durationMs > 0 ? durationMs : undefined,
        version: "1.0",
        isDownloaded: isDownloaded,
        downloadPath: downloadPath || undefined,
        reciter: reciterName,
        surahNumber: parsedInfo.surahNumber,
        surahName: parsedInfo.surahName,
      };

      debugLog(
        `✅ Récitation trouvée: ${parsedInfo.fullTitle} (${
          isDownloaded ? "Téléchargée" : "Streaming"
        })`,
      );
      return recitation;
    } catch (error) {
      errorLog(
        `❌ Erreur recherche récitation ${reciterName}/${surahNumber}:`,
        error,
      );
      // 🚀 FALLBACK : Essayer une autre source si Infomaniak échoue
      return null;
    }
  }

  // 🎯 Estimation intelligente de la taille des sourates
  private estimateQuranFileSize(surahNumber: number): number {
    // Basé sur les données réelles de vos fichiers turki/
    const sizeEstimates: { [key: number]: number } = {
      1: 0.4, // Al-Fatiha
      2: 171, // Al-Baqara (qualité haute / non compressée)
      3: 35, // Al-Imran
      4: 40, // An-Nisa
      5: 30, // Al-Maidah
      // Sourates moyennes (6-50)
      // Petites sourates (51-114)
    };

    // Si on a une estimation précise, l'utiliser
    if (sizeEstimates[surahNumber]) {
      return sizeEstimates[surahNumber];
    }

    // Sinon, estimation basée sur la longueur typique
    if (surahNumber <= 5) return 35; // Longues sourates
    if (surahNumber <= 30) return 15; // Sourates moyennes
    if (surahNumber <= 60) return 5; // Sourates courtes
    return 1; // Très courtes sourates
  }

  // 🔧 NOUVEAU : Estimer la taille d'un adhan basé sur son nom
  private estimateAdhanFileSize(adhanName: string): number {
    const name = adhanName.toLowerCase();

    // Estimation basée sur des patterns typiques observés dans les logs
    if (name.includes("fajr2") || name.includes("azan18")) return 5.5; // Adhans très longs
    if (name.includes("fajr1") || name.includes("fajr")) return 2.0; // Adhans Fajr
    if (name.includes("ibrahim") || name.includes("arkani")) return 1.9; // Ibrahim Al Arkani
    if (name.includes("nasser") || name.includes("qatami")) return 1.1; // Nasser AlQatami
    if (name.includes("azan11")) return 1.0; // Azan11
    if (name.includes("azan10")) return 0.85; // Azan10
    if (name.includes("azan9")) return 0.68; // Azan9
    if (name.includes("azan1")) return 0.67; // Azan1
    if (name.includes("azan")) return 0.75; // Autres Azan (moyenne)

    // Valeur par défaut pour les adhans inconnus
    return 0.6;
  }

  // 🔍 NOUVELLE FONCTION : Diagnostiquer les conflits de noms de fichiers
  async diagnoseFileNamingConflicts(): Promise<{
    hasConflicts: boolean;
    conflicts: { fileName: string; contentIds: string[] }[];
    totalDownloaded: number;
    legacyFilesFound: number;
  }> {
    try {
      const downloadedContent =
        await LocalStorageManager.getPremium("DOWNLOADED_CONTENT");
      if (!downloadedContent) {
        return {
          hasConflicts: false,
          conflicts: [],
          totalDownloaded: 0,
          legacyFilesFound: 0,
        };
      }

      const downloaded = JSON.parse(downloadedContent);
      const fileNameMap: { [fileName: string]: string[] } = {};
      let legacyFilesFound = 0;

      // Analyser tous les téléchargements
      for (const [contentId, info] of Object.entries(downloaded) as [
        string,
        any,
      ][]) {
        const filePath = info.downloadPath as string;
        const fileName = filePath.split("/").pop() || "";

        // Détecter les anciens formats
        if (!fileName.includes(contentId.replace(/\s+/g, "_").toLowerCase())) {
          legacyFilesFound++;
        }

        if (!fileNameMap[fileName]) {
          fileNameMap[fileName] = [];
        }
        fileNameMap[fileName].push(contentId);
      }

      // Identifier les conflits
      const conflicts = Object.entries(fileNameMap).reduce<
        { fileName: string; contentIds: string[] }[]
      >((acc, [fileName, contentIds]) => {
        if (contentIds.length > 1) {
          acc.push({ fileName, contentIds });
        }
        return acc;
      }, []);

      debugLog(`🔍 Diagnostic noms de fichiers:`);
      debugLog(
        `   📊 Total téléchargements: ${Object.keys(downloaded).length}`,
      );
      debugLog(`   ⚠️ Fichiers legacy: ${legacyFilesFound}`);
      debugLog(`   🔴 Conflits détectés: ${conflicts.length}`);

      conflicts.forEach((conflict) => {
        debugLog(
          `   💥 Conflit: ${conflict.fileName} → ${conflict.contentIds.join(
            ", ",
          )}`,
        );
      });

      return {
        hasConflicts: conflicts.length > 0,
        conflicts,
        totalDownloaded: Object.keys(downloaded).length,
        legacyFilesFound,
      };
    } catch (error) {
      errorLog("❌ Erreur diagnostic noms de fichiers:", error);
      return {
        hasConflicts: false,
        conflicts: [],
        totalDownloaded: 0,
        legacyFilesFound: 0,
      };
    }
  }

  // 💰 NOUVEAU : Optimisations de coût pour Infomaniak

  /**
   * 📊 Calculer les coûts de bande passante estimés
   */
  calculateBandwidthCosts(
    fileSizeMB: number,
    downloadCount: number,
    strategy: "download" | "streaming" | "progressive",
  ): {
    costCHF: number;
    costUSD: number;
    recommendedStrategy: string;
  } {
    // Tarifs Infomaniak (approximatifs)
    const costPerGB_CHF = 0.05; // ~0.05 CHF par GB transféré

    let effectiveSize = fileSizeMB;
    let recommendedStrategy = "streaming";

    switch (strategy) {
      case "download":
        effectiveSize = fileSizeMB; // Taille complète
        break;
      case "streaming":
        effectiveSize = fileSizeMB * 0.3; // 70% d'économie
        break;
      case "progressive":
        effectiveSize = fileSizeMB * 0.15; // 85% d'économie avec cache intelligent
        recommendedStrategy = "progressive";
        break;
    }

    const totalGB = (effectiveSize * downloadCount) / 1024;
    const costCHF = totalGB * costPerGB_CHF;
    const costUSD = costCHF * 1.1; // Conversion approximative

    return {
      costCHF: Math.round(costCHF * 100) / 100,
      costUSD: Math.round(costUSD * 100) / 100,
      recommendedStrategy,
    };
  }

  /**
   * 🎵 Streaming progressif avec cache intelligent
   * Économise jusqu'à 85% de bande passante
   */
  async createProgressiveStreamingSession(
    content: PremiumContent,
    userPreferences: {
      quality: "low" | "medium" | "high";
      allowCaching: boolean;
      connectionType: "wifi" | "mobile";
    },
  ): Promise<string | null> {
    try {
      debugLog(`🎵 Streaming progressif pour: ${content.title}`);

      // Ajuster la qualité selon la connexion et les préférences
      const optimalQuality = this.determineOptimalQuality(userPreferences);

      // 🚀 NOUVEAU : Utiliser l'URL optimale (Serveur Personnel → Infomaniak)
      const optimalUrl = await this.getOptimalAudioUrl(content);
      if (!optimalUrl) {
        throw new Error("Impossible d'obtenir une URL audio valide");
      }

      const sessionId = await this.streamingManager.createStreamingSession(
        content.id,
        optimalUrl,
        this.estimateContentDuration(content),
      );

      debugLog(`✅ Session streaming progressif créée: ${sessionId}`);
      return sessionId;
    } catch (error) {
      errorLog("❌ Erreur streaming progressif:", error);
      return null;
    }
  }

  /**
   * 🔧 Déterminer la qualité optimale selon le contexte
   */
  private determineOptimalQuality(userPreferences: {
    quality: "low" | "medium" | "high";
    connectionType: "wifi" | "mobile";
  }): "low" | "medium" | "high" {
    // Sur données mobiles, favoriser la qualité basse/moyenne
    if (userPreferences.connectionType === "mobile") {
      return userPreferences.quality === "high"
        ? "medium"
        : userPreferences.quality;
    }

    // Sur WiFi, respecter les préférences utilisateur
    return userPreferences.quality;
  }

  /**
   * 💾 Compression à la volée pour réduire les coûts
   */
  async getCompressedAudioUrl(
    originalUrl: string,
    compressionLevel: "light" | "medium" | "aggressive",
  ): Promise<string> {
    try {
      // Utiliser le CDN Optimizer pour la compression à la volée
      const optimizedPath = await this.cdnOptimizer.getOptimizedFile(
        `compressed_${compressionLevel}`,
        originalUrl,
      );
      return optimizedPath || originalUrl;
    } catch (error) {
      errorLog("❌ Erreur compression audio:", error);
      return originalUrl; // Fallback vers l'URL originale
    }
  }

  // 🚀 NOUVEAU : Synchroniser les fichiers locaux avec AsyncStorage
  private async syncLocalFilesWithAsyncStorage(): Promise<void> {
    try {
      debugLog("🔄 Synchronisation des fichiers locaux avec AsyncStorage...");

      // Récupérer le catalogue des adhans
      const catalog = await this.getPremiumCatalog();
      if (!catalog) {
        debugLog("⚠️ Aucun catalogue disponible pour la synchronisation");
        return;
      }

      // Récupérer les fichiers téléchargés depuis AsyncStorage
      const downloadedContent =
        await LocalStorageManager.getPremium("DOWNLOADED_CONTENT");
      const downloaded = downloadedContent ? JSON.parse(downloadedContent) : {};

      let syncedCount = 0;
      let updatedCount = 0;
      let migratedCount = 0;

      // 🚀 NOUVEAU : Synchroniser les adhans ET les récitations Quran
      const allContent = [
        ...catalog.adhanVoices.map((item) => ({ ...item, type: "adhan" })),
        ...catalog.quranRecitations.map((item) => ({ ...item, type: "quran" })),
      ];

      type SyncOutcome = {
        id: string;
        migratedDelta: number;
        syncedHit: boolean;
        updated: boolean;
        setEntry?: {
          downloadPath: string;
          downloadDate: string;
          fileSize: number;
          version: string;
        };
        del?: boolean;
      };

      const outcomes: SyncOutcome[] = await Promise.all(
        allContent.map(async (content): Promise<SyncOutcome> => {
          let migratedDelta = 0;
          let localPath = await this.checkNativeDownloadForContent(content.id);

          if (!localPath) {
            const externalPath = await this.checkExternalDownloadPath(
              content.id,
            );
            if (externalPath) {
              debugLog(
                `🔄 Fichier trouvé en externe, migration vers interne: ${content.id}`,
              );
              localPath = await this.migrateFileToInternal(
                externalPath,
                content.id,
              );
              if (localPath) {
                migratedDelta += 1;
                debugLog(`✅ Fichier migré: ${content.id} -> ${localPath}`);
              }
            }
          }

          if (localPath) {
            const needsUpdate =
              !downloaded[content.id] ||
              downloaded[content.id].downloadPath !== localPath;
            if (needsUpdate) {
              debugLog(`✅ Synchronisé: ${content.id} -> ${localPath}`);
              return {
                id: content.id,
                migratedDelta,
                syncedHit: true,
                updated: true,
                setEntry: {
                  downloadPath: localPath,
                  downloadDate: new Date().toISOString(),
                  fileSize: content.fileSize,
                  version: content.version,
                },
              };
            }
            return {
              id: content.id,
              migratedDelta,
              syncedHit: true,
              updated: false,
            };
          }

          const externalPath2 = await this.checkExternalDownloadPath(
            content.id,
          );
          if (externalPath2) {
            debugLog(
              `🔄 Fichier trouvé en externe, migration vers interne: ${content.id}`,
            );
            const migratedPath = await this.migrateFileToInternal(
              externalPath2,
              content.id,
            );
            if (migratedPath) {
              debugLog(`✅ Fichier migré: ${content.id} -> ${migratedPath}`);
              return {
                id: content.id,
                migratedDelta: migratedDelta + 1,
                syncedHit: true,
                updated: true,
                setEntry: {
                  downloadPath: migratedPath,
                  downloadDate: new Date().toISOString(),
                  fileSize: content.fileSize,
                  version: content.version,
                },
              };
            }
            debugLog(`🧹 Nettoyé: ${content.id} (migration échouée)`);
            return {
              id: content.id,
              migratedDelta,
              syncedHit: false,
              updated: true,
              del: true,
            };
          }

          if (downloaded[content.id]) {
            debugLog(`🧹 Nettoyé: ${content.id} (fichier manquant)`);
            return {
              id: content.id,
              migratedDelta,
              syncedHit: false,
              updated: true,
              del: true,
            };
          }

          return {
            id: content.id,
            migratedDelta,
            syncedHit: false,
            updated: false,
          };
        }),
      );

      for (const o of outcomes) {
        migratedCount += o.migratedDelta;
        if (o.syncedHit) syncedCount++;
        if (o.updated) updatedCount++;
        if (o.setEntry) {
          downloaded[o.id] = o.setEntry;
        }
        if (o.del) {
          delete downloaded[o.id];
        }
      }

      // Sauvegarder les modifications dans AsyncStorage
      if (updatedCount > 0) {
        await LocalStorageManager.savePremium(
          "DOWNLOADED_CONTENT",
          downloaded,
          true,
          true,
        );
        debugLog(
          `✅ Synchronisation terminée: ${syncedCount} fichiers trouvés, ${updatedCount} mises à jour, ${migratedCount} migrés`,
        );
      } else {
        debugLog(
          `✅ Synchronisation terminée: ${syncedCount} fichiers trouvés, aucune mise à jour nécessaire`,
        );
      }
    } catch (error) {
      errorLog("❌ Erreur synchronisation fichiers locaux:", error);
    }
  }

  // 🚀 NOUVEAU : Normaliser les IDs Quran pour la compatibilité
  private normalizeQuranId(contentId: string): string[] {
    const possibleIds: string[] = [contentId];

    // Si c'est un ID de récitateur (reciter_xxx), générer les IDs de sourates possibles
    if (contentId.startsWith("reciter_")) {
      const reciterName = contentId.replace("reciter_", "");
      // Générer les IDs pour les sourates 1-114
      for (let surah = 1; surah <= 114; surah++) {
        possibleIds.push(`quran_${reciterName}_${surah}`);
      }
    }

    // Si c'est un ID de sourate (quran_xxx_1), générer l'ID de récitateur
    if (contentId.startsWith("quran_")) {
      const match = contentId.match(/^quran_(.+?)_\d+$/);
      if (match) {
        const reciterName = match[1];
        possibleIds.push(`reciter_${reciterName}`);
      }
    }

    return possibleIds;
  }

  // 🚀 NOUVEAU : Vérifier le stockage externe pour un fichier
  private async checkExternalDownloadPath(
    contentId: string,
  ): Promise<string | null> {
    try {
      // 🚀 NOUVEAU : Vérifier le dossier Quran externe pour les récitations
      if (contentId.startsWith("quran_") || contentId.startsWith("reciter_")) {
        const possibleIds = this.normalizeQuranId(contentId);
        const externalPremiumDir = `${RNFS.ExternalDirectoryPath}/Downloads/premium_content`;
        const externalPremiumDirAlt = `${RNFS.ExternalDirectoryPath}/Download/premium_content`;
        const externalQuranDir = `${RNFS.ExternalDirectoryPath}/Downloads/quran`;
        const externalQuranDirAlt = `${RNFS.ExternalDirectoryPath}/Download/quran`;

        const checks: { path: string; label: string }[] = [];
        for (const id of possibleIds) {
          checks.push({
            path: `${externalPremiumDir}/${id}.mp3`,
            label: "premium",
          });
          checks.push({
            path: `${externalPremiumDirAlt}/${id}.mp3`,
            label: "premium alt",
          });
          checks.push({
            path: `${externalQuranDir}/${id}.mp3`,
            label: "quran",
          });
          checks.push({
            path: `${externalQuranDirAlt}/${id}.mp3`,
            label: "quran alt",
          });
        }

        const existsFlags = await Promise.all(
          checks.map((c) => RNFS.exists(c.path)),
        );
        for (let i = 0; i < checks.length; i++) {
          if (existsFlags[i]) {
            debugLog(
              `✅ Fichier Quran externe trouvé (${checks[i].label}): ${checks[i].path}`,
            );
            return checks[i].path;
          }
        }
      }

      // Vérifier le dossier Downloads du stockage externe (pour les adhans)
      const externalDownloadDir = `${RNFS.ExternalDirectoryPath}/Downloads/premium_content`;
      const filePath = `${externalDownloadDir}/${contentId}.mp3`;
      const externalDownloadDirAlt = `${RNFS.ExternalDirectoryPath}/Download/premium_content`;
      const filePathAlt = `${externalDownloadDirAlt}/${contentId}.mp3`;

      const [exists, existsAlt] = await Promise.all([
        RNFS.exists(filePath),
        RNFS.exists(filePathAlt),
      ]);

      if (exists) {
        debugLog(`✅ Fichier externe trouvé: ${filePath}`);
        return filePath;
      }

      if (existsAlt) {
        debugLog(`✅ Fichier externe trouvé (alt): ${filePathAlt}`);
        return filePathAlt;
      }

      return null;
    } catch (error) {
      debugLog(
        `❌ Erreur vérification stockage externe pour ${contentId}:`,
        error,
      );
      return null;
    }
  }

  // 🚀 NOUVEAU : Migrer un fichier du stockage externe vers le stockage interne
  public async migrateFileToInternal(
    externalPath: string,
    contentId: string,
  ): Promise<string | null> {
    try {
      debugLog(`🔄 Migration de ${externalPath} vers le stockage interne...`);

      // 🚀 NOUVEAU : Utiliser le bon dossier de destination selon le type de contenu
      let internalPath: string;

      if (contentId.startsWith("quran_") || contentId.startsWith("reciter_")) {
        // 🚀 CORRECTION : Pour les récitations Quran, créer la structure /quran/nom_du_récitateur/audio.mp3
        const reciterName = this.extractReciterNameFromId(contentId);
        const reciterFolder = `${this.quranDirectory}/${reciterName}`;

        // Créer le dossier du récitateur s'il n'existe pas
        try {
          await RNFS.mkdir(reciterFolder);
          debugLog(`📁 Dossier récitateur créé: ${reciterFolder}`);
        } catch (mkdirError) {
          // Le dossier existe déjà, c'est normal
          debugLog(`📁 Dossier récitateur existe déjà: ${reciterFolder}`);
        }

        // Garder le nom original du fichier avec le numéro de sourate
        const fileName = contentId + ".mp3";
        internalPath = `${reciterFolder}/${fileName}`;
        debugLog(`📖 Migration Quran vers: ${internalPath}`);
      } else {
        // Pour les adhans et autres contenus, utiliser le dossier principal
        internalPath = `${this.downloadDirectory}/${contentId}.mp3`;
        debugLog(`🎵 Migration Adhan vers: ${internalPath}`);
      }

      // Copier le fichier
      await RNFS.copyFile(externalPath, internalPath);

      // Vérifier que la copie a réussi
      const exists = await RNFS.exists(internalPath);
      if (exists) {
        debugLog(`✅ Migration réussie: ${internalPath}`);

        // Supprimer le fichier externe pour éviter la duplication
        try {
          await RNFS.unlink(externalPath);
          debugLog(`🗑️ Fichier externe supprimé: ${externalPath}`);
        } catch (deleteError) {
          debugLog(`⚠️ Erreur suppression fichier externe:`, deleteError);
        }

        return internalPath;
      } else {
        debugLog(`❌ Échec migration: fichier non trouvé à destination`);
        return null;
      }
    } catch (error) {
      debugLog(`❌ Erreur migration fichier ${contentId}:`, error);
      return null;
    }
  }

  // 🚀 NOUVEAU : Extraire le nom du récitateur depuis l'ID
  private extractReciterNameFromId(contentId: string): string {
    // Exemples d'IDs: "reciter_abdelbasset_abdelsamad", "quran_abdelbasset_abdelsamad_1"
    let reciterName = contentId;

    // Supprimer les préfixes
    if (reciterName.startsWith("reciter_")) {
      reciterName = reciterName.replace("reciter_", "");
    } else if (reciterName.startsWith("quran_")) {
      reciterName = reciterName.replace("quran_", "");
    }

    // Supprimer les suffixes numériques (_1, _2, etc.)
    reciterName = reciterName.replace(/_\d+$/, "");

    // Convertir les underscores en espaces et capitaliser
    reciterName = reciterName.replace(/_/g, " ");
    reciterName = reciterName.replace(/\b\w/g, (char) => char.toUpperCase());

    debugLog(`📝 Nom récitateur extrait: "${contentId}" -> "${reciterName}"`);
    return reciterName;
  }

  // 🚀 NOUVEAU : Récupérer uniquement les récitations Quran (optimisé)
  async getQuranCatalogOnly(): Promise<PremiumContent[]> {
    try {
      debugLog("📖 Récupération optimisée des récitations Quran uniquement...");
      // console.log("🔍 getQuranCatalogOnly() appelée - VERSION RAPIDE");

      // Vérifier le cache partiel pour les récitations Quran
      const cachedQuran = await this.getCachedQuran();
      if (cachedQuran) {
        debugLog("✅ Récitations Quran chargées depuis le cache");
        console.log("📖 Récitations depuis cache:", cachedQuran);

        // 🚀 FIX : Vérifier et mettre à jour le statut de téléchargement
        const updatedQuran = await Promise.all(
          cachedQuran.map(async (recitation) => {
            const downloadPath = await this.isContentDownloaded(recitation.id);
            return {
              ...recitation,
              isDownloaded: !!downloadPath,
              downloadPath: downloadPath || undefined,
            };
          }),
        );

        console.log("📖 Récitations mises à jour:", updatedQuran);
        return updatedQuran;
      }

      // Si pas de cache, récupérer depuis le serveur
      debugLog("🔄 Récupération des récitations depuis le serveur...");
      const recitations = await this.scanQuranRecitersOnly();

      if (recitations && recitations.length > 0) {
        // Sauvegarder en cache
        await this.saveCachedQuran(recitations);
        debugLog("✅ Récitations sauvegardées en cache");
        console.log("📖 Récitations depuis serveur:", recitations);
      }

      return recitations || [];
    } catch (error) {
      errorLog("❌ Erreur récupération récitations Quran:", error);
      return [];
    }
  }

  // 🚀 NOUVEAU : Récupérer le cache des récitations Quran
  private async getCachedQuran(): Promise<PremiumContent[] | null> {
    try {
      const cached = await AsyncStorage.getItem("premium_quran_cache");
      const timestamp = await AsyncStorage.getItem("premium_quran_timestamp");

      if (cached && timestamp) {
        const age = Date.now() - parseInt(timestamp);
        const maxAge = 30 * 60 * 1000; // 30 minutes

        if (age < maxAge) {
          const parsed = JSON.parse(cached);
          debugLog("✅ Cache récitations Quran valide");
          return parsed;
        }
      }

      return null;
    } catch (error) {
      debugLog("❌ Erreur lecture cache récitations Quran:", error);
      return null;
    }
  }

  // 🚀 NOUVEAU : Sauvegarder le cache des récitations Quran
  private async saveCachedQuran(recitations: PremiumContent[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        "premium_quran_cache",
        JSON.stringify(recitations),
      );
      await AsyncStorage.setItem(
        "premium_quran_timestamp",
        Date.now().toString(),
      );
      debugLog("✅ Cache récitations Quran sauvegardé");
    } catch (error) {
      debugLog("❌ Erreur sauvegarde cache récitations Quran:", error);
    }
  }

  // 🚀 NOUVEAU : Invalider le cache adhans spécifiquement
  async invalidateAdhanCache(): Promise<void> {
    try {
      debugLog("🧹 Invalidation du cache adhans...");
      await Promise.all([
        AsyncStorage.removeItem("premium_adhans_cache"),
        AsyncStorage.removeItem("premium_catalog_cache"),
        AsyncStorage.removeItem("premium_catalog_timestamp"),
        AsyncStorage.removeItem("cached_adhans"),
        AsyncStorage.removeItem("cached_adhans_timestamp"),
      ]);
      debugLog("✅ Cache adhans invalidé");
    } catch (error) {
      errorLog("❌ Erreur invalidation cache adhans:", error);
    }
  }

  // 🚀 NOUVEAU : Invalider le cache Quran spécifiquement
  async invalidateQuranCache(): Promise<void> {
    try {
      debugLog("🧹 Invalidation du cache Quran...");
      await Promise.all([
        AsyncStorage.removeItem("premium_quran_cache"),
        AsyncStorage.removeItem("premium_quran_timestamp"),
      ]);
      debugLog("✅ Cache Quran invalidé");
    } catch (error) {
      errorLog("❌ Erreur invalidation cache Quran:", error);
    }
  }

  // 🚀 NOUVEAU : Forcer le rechargement du catalogue depuis le serveur
  async refreshCatalogFromServer(): Promise<void> {
    try {
      debugLog("🔄 Rechargement forcé du catalogue depuis le serveur...");

      // Invalider tous les caches
      await this.invalidateAdhanCache();

      // Forcer la régénération du catalogue
      const catalog = await this.getPremiumCatalog();
      if (catalog) {
        debugLog("✅ Catalogue rechargé avec succès");
      } else {
        debugLog("⚠️ Erreur rechargement catalogue");
      }
    } catch (error) {
      errorLog("❌ Erreur rechargement catalogue:", error);
    }
  }

  // 🚀 NOUVEAU : Diagnostic complet des téléchargements
  public async diagnosePersistenceIssue(): Promise<{
    asyncStorageData: any;
    catalogCacheData: any;
    filesInMainDir: string[];
    filesInNativeDir: string[];
    missingFiles: string[];
    orphanedFiles: string[];
    recommendations: string[];
  }> {
    try {
      debugLog("🔍 Début diagnostic complet de persistance...");

      const result = {
        asyncStorageData: {},
        catalogCacheData: {},
        filesInMainDir: [] as string[],
        filesInNativeDir: [] as string[],
        missingFiles: [] as string[],
        orphanedFiles: [] as string[],
        recommendations: [] as string[],
      };

      // 1. Vérifier AsyncStorage
      const storedData =
        await LocalStorageManager.getPremium("DOWNLOADED_CONTENT");
      if (storedData) {
        result.asyncStorageData = JSON.parse(storedData);
        debugLog("📦 AsyncStorage data:", result.asyncStorageData);
      } else {
        debugLog("❌ Aucune donnée AsyncStorage trouvée");
      }

      // 2. Vérifier le cache du catalogue
      const catalogCache = await AsyncStorage.getItem("premium_catalog_cache");
      if (catalogCache) {
        const parsed = JSON.parse(catalogCache);
        result.catalogCacheData = {
          adhanCount: parsed.adhanVoices?.length || 0,
          downloadedAdhans:
            parsed.adhanVoices?.filter((a: any) => a.isDownloaded) || [],
        };
        debugLog("📋 Catalogue cache:", result.catalogCacheData);
      } else {
        debugLog("❌ Aucun cache catalogue trouvé");
      }

      // 3. Scanner le dossier principal
      try {
        const mainDirExists = await RNFS.exists(this.downloadDirectory);
        if (mainDirExists) {
          const mainFiles = await RNFS.readDir(this.downloadDirectory);
          const mainNames: string[] = [];
          for (const f of mainFiles) {
            if (f.isFile() && f.name.endsWith(".mp3")) {
              mainNames.push(f.name);
            }
          }
          result.filesInMainDir = mainNames;
          debugLog(
            `📁 Dossier principal: ${result.filesInMainDir.length} fichiers`,
          );
        } else {
          debugLog("❌ Dossier principal n'existe pas");
        }
      } catch (error) {
        debugLog("❌ Erreur scan dossier principal:", error);
      }

      // 4. Scanner le dossier natif
      try {
        const nativeDir = `${RNFS.ExternalDirectoryPath}/Downloads/premium_content`;
        const nativeDirExists = await RNFS.exists(nativeDir);
        if (nativeDirExists) {
          const nativeFiles = await RNFS.readDir(nativeDir);
          const nativeNames: string[] = [];
          for (const f of nativeFiles) {
            if (f.isFile() && f.name.endsWith(".mp3")) {
              nativeNames.push(f.name);
            }
          }
          result.filesInNativeDir = nativeNames;
          debugLog(
            `📁 Dossier natif: ${result.filesInNativeDir.length} fichiers`,
          );
        } else {
          debugLog("❌ Dossier natif n'existe pas");
        }
      } catch (error) {
        debugLog("❌ Erreur scan dossier natif:", error);
      }

      // 5. Analyser les incohérences
      const allPhysicalFiles = [
        ...result.filesInMainDir,
        ...result.filesInNativeDir,
      ];
      const asyncStorageFiles = Object.keys(result.asyncStorageData).map(
        (id) => `${id}.mp3`,
      );

      // Fichiers manquants (dans AsyncStorage mais pas sur disque)
      result.missingFiles = asyncStorageFiles.filter(
        (file) => !allPhysicalFiles.includes(file),
      );

      // Fichiers orphelins (sur disque mais pas dans AsyncStorage)
      result.orphanedFiles = allPhysicalFiles.filter(
        (file) => !asyncStorageFiles.includes(file),
      );

      // 6. Générer des recommandations
      if (result.missingFiles.length > 0) {
        result.recommendations.push(
          `${result.missingFiles.length} fichiers manquants détectés - nettoyage AsyncStorage recommandé`,
        );
      }

      if (result.orphanedFiles.length > 0) {
        result.recommendations.push(
          `${result.orphanedFiles.length} fichiers orphelins détectés - synchronisation recommandée`,
        );
      }

      if (
        result.filesInMainDir.length === 0 &&
        result.filesInNativeDir.length === 0
      ) {
        result.recommendations.push(
          "Aucun fichier téléchargé trouvé - les téléchargements ne persistent pas",
        );
      }

      if (Object.keys(result.asyncStorageData).length === 0) {
        result.recommendations.push(
          "AsyncStorage vide - les métadonnées ne persistent pas",
        );
      }

      debugLog("✅ Diagnostic terminé:", result);
      return result;
    } catch (error) {
      errorLog("❌ Erreur diagnostic persistance:", error);
      throw error;
    }
  }

  // 🚀 NOUVEAU : Forcer la synchronisation complète
  public async forceFullSync(): Promise<{
    syncedFiles: number;
    cleanedFiles: number;
    errors: string[];
  }> {
    try {
      debugLog("🔄 Début synchronisation complète forcée...");

      const result = {
        syncedFiles: 0,
        cleanedFiles: 0,
        errors: [] as string[],
      };

      // 1. Scanner tous les fichiers physiques
      const allFiles = new Map<string, string>();

      // Scanner dossier principal
      try {
        const mainDirExists = await RNFS.exists(this.downloadDirectory);
        if (mainDirExists) {
          const mainFiles = await RNFS.readDir(this.downloadDirectory);
          mainFiles.forEach((file) => {
            if (file.isFile() && file.name.endsWith(".mp3")) {
              const contentId = file.name.replace(/\.mp3$/, "");
              allFiles.set(contentId, file.path);
            }
          });
        }
      } catch (error) {
        result.errors.push(`Erreur scan dossier principal: ${error}`);
      }

      // Scanner dossier natif
      try {
        const nativeDir = `${RNFS.ExternalDirectoryPath}/Downloads/premium_content`;
        const nativeDirExists = await RNFS.exists(nativeDir);
        if (nativeDirExists) {
          const nativeFiles = await RNFS.readDir(nativeDir);
          nativeFiles.forEach((file) => {
            if (file.isFile() && file.name.endsWith(".mp3")) {
              const contentId = file.name.replace(/\.mp3$/, "");
              // Priorité au dossier principal
              if (!allFiles.has(contentId)) {
                allFiles.set(contentId, file.path);
              }
            }
          });
        }
      } catch (error) {
        result.errors.push(`Erreur scan dossier natif: ${error}`);
      }

      // 2. Mettre à jour AsyncStorage avec les fichiers réels
      const newAsyncStorageData: any = {};

      const fileEntries = [...allFiles.entries()];
      const processResults = await Promise.allSettled(
        fileEntries.map(async ([contentId, filePath]) => {
          try {
            const fileExists = await RNFS.exists(filePath);
            if (!fileExists) {
              return { contentId, action: "skip" as const };
            }

            const stats = await RNFS.stat(filePath);
            if (stats.size < 1000) {
              await RNFS.unlink(filePath);
              return { contentId, action: "cleaned" as const };
            }

            return {
              contentId,
              action: "sync" as const,
              entry: {
                downloadPath: filePath,
                downloadedAt: new Date().toISOString(),
                fileSize: stats.size,
              },
            };
          } catch (error) {
            return { contentId, action: "error" as const, error };
          }
        }),
      );

      for (const settled of processResults) {
        if (settled.status === "rejected") {
          result.errors.push(`Erreur traitement: ${settled.reason}`);
          continue;
        }
        const r = settled.value;
        if (r.action === "error") {
          result.errors.push(`Erreur traitement ${r.contentId}: ${r.error}`);
          continue;
        }
        if (r.action === "cleaned") {
          result.cleanedFiles++;
          continue;
        }
        if (r.action === "skip") continue;
        newAsyncStorageData[r.contentId] = r.entry;
        result.syncedFiles++;
      }

      // 3. Sauvegarder les nouvelles données
      await LocalStorageManager.savePremium(
        "DOWNLOADED_CONTENT",
        newAsyncStorageData,
        true,
        true,
      );

      await Promise.all([
        this.invalidateAdhanCache(),
        this.invalidateQuranCache(),
      ]);

      debugLog("✅ Synchronisation forcée terminée:", result);
      return result;
    } catch (error) {
      errorLog("❌ Erreur synchronisation forcée:", error);
      throw error;
    }
  }

  // 🚀 NOUVEAU : Test de téléchargement et persistance
  public async testDownloadAndPersistence(contentId: string): Promise<{
    downloadSuccess: boolean;
    fileExists: boolean;
    filePath: string | null;
    asyncStorageUpdated: boolean;
    catalogUpdated: boolean;
    details: string[];
  }> {
    try {
      debugLog(`🧪 Test de téléchargement et persistance pour: ${contentId}`);

      const result = {
        downloadSuccess: false,
        fileExists: false,
        filePath: null as string | null,
        asyncStorageUpdated: false,
        catalogUpdated: false,
        details: [] as string[],
      };

      // 1. Récupérer le contenu à télécharger
      const catalog = await this.getPremiumCatalog();
      if (!catalog) {
        result.details.push("❌ Catalogue non disponible");
        return result;
      }

      const content = catalog.adhanVoices?.find((a) => a.id === contentId);
      if (!content) {
        result.details.push(`❌ Contenu non trouvé: ${contentId}`);
        return result;
      }

      result.details.push(`✅ Contenu trouvé: ${content.title}`);

      // 2. Vérifier l'état avant téléchargement
      const beforeDownload = await this.isContentDownloaded(contentId);
      result.details.push(
        `📊 Avant téléchargement: ${
          beforeDownload ? "déjà téléchargé" : "non téléchargé"
        }`,
      );

      // 3. Effectuer le téléchargement
      result.details.push("📥 Début téléchargement...");
      const downloadSuccess = await this.downloadWithLegacySystem(
        content,
        (progress) => {
          result.details.push(`📊 Progression: ${progress}%`);
        },
      );

      result.downloadSuccess = downloadSuccess;
      result.details.push(
        downloadSuccess
          ? "✅ Téléchargement réussi"
          : "❌ Téléchargement échoué",
      );

      // 4. Vérifier si le fichier existe
      const expectedFileName = `${contentId}.mp3`;
      const expectedPath = `${this.downloadDirectory}/${expectedFileName}`;
      const fileExists = await RNFS.exists(expectedPath);

      result.fileExists = fileExists;
      result.filePath = fileExists ? expectedPath : null;
      result.details.push(
        fileExists
          ? `✅ Fichier trouvé: ${expectedPath}`
          : `❌ Fichier manquant: ${expectedPath}`,
      );

      // 5. Vérifier AsyncStorage
      const asyncStorageData =
        await LocalStorageManager.getPremium("DOWNLOADED_CONTENT");
      const downloaded = asyncStorageData ? JSON.parse(asyncStorageData) : {};
      const isInAsyncStorage =
        downloaded[contentId] && downloaded[contentId].downloadPath;

      result.asyncStorageUpdated = isInAsyncStorage;
      result.details.push(
        isInAsyncStorage
          ? "✅ AsyncStorage mis à jour"
          : "❌ AsyncStorage non mis à jour",
      );

      // 6. Vérifier le cache du catalogue
      const updatedCatalog = await this.getPremiumCatalog();
      const catalogItem = updatedCatalog?.adhanVoices?.find(
        (a) => a.id === contentId,
      );
      const isInCatalog = catalogItem?.isDownloaded;

      result.catalogUpdated = !!isInCatalog;
      result.details.push(
        isInCatalog ? "✅ Catalogue mis à jour" : "❌ Catalogue non mis à jour",
      );

      // 7. Vérifier avec isContentDownloaded
      const afterDownload = await this.isContentDownloaded(contentId);
      result.details.push(
        `📊 Après téléchargement: ${
          afterDownload ? "détecté comme téléchargé" : "non détecté"
        }`,
      );

      debugLog("🧪 Test terminé:", result);
      return result;
    } catch (error) {
      errorLog("❌ Erreur test téléchargement:", error);
      return {
        downloadSuccess: false,
        fileExists: false,
        filePath: null,
        asyncStorageUpdated: false,
        catalogUpdated: false,
        details: [`❌ Erreur: ${error}`],
      };
    }
  }

  // 🚀 NOUVEAU : Téléchargement forcé avec garantie de persistance
  public async forceDownloadWithPersistence(
    contentId: string,
    onProgress?: (progress: number) => void,
  ): Promise<{
    success: boolean;
    filePath: string | null;
    error: string | null;
    details: string[];
  }> {
    try {
      debugLog(`🚀 Téléchargement forcé pour: ${contentId}`);

      const result = {
        success: false,
        filePath: null as string | null,
        error: null as string | null,
        details: [] as string[],
      };

      // 1. Récupérer le contenu
      const catalog = await this.getPremiumCatalog();
      if (!catalog) {
        result.error = "Catalogue non disponible";
        result.details.push("❌ Catalogue non disponible");
        return result;
      }

      const content = catalog.adhanVoices?.find((a) => a.id === contentId);
      if (!content) {
        result.error = "Contenu non trouvé";
        result.details.push(`❌ Contenu non trouvé: ${contentId}`);
        return result;
      }

      result.details.push(`✅ Contenu trouvé: ${content.title}`);

      // 2. Créer le nom de fichier et le chemin
      const fileName = `${contentId}.mp3`;
      const downloadPath = `${this.downloadDirectory}/${fileName}`;

      result.details.push(`📁 Chemin de téléchargement: ${downloadPath}`);

      // 3. Vérifier si le dossier existe, sinon le créer
      const dirExists = await RNFS.exists(this.downloadDirectory);
      if (!dirExists) {
        await RNFS.mkdir(this.downloadDirectory);
        result.details.push("📁 Dossier créé");
      }

      // 4. Vérifier si le fichier existe déjà
      const fileExists = await RNFS.exists(downloadPath);
      if (fileExists) {
        result.details.push("✅ Fichier existe déjà");
        result.filePath = downloadPath;
        result.success = true;

        // Marquer comme téléchargé même s'il existe déjà
        await this.markAsDownloaded(contentId, downloadPath);
        result.details.push("✅ Marqué comme téléchargé");
        return result;
      }

      // 5. Télécharger avec fetch (plus fiable que RNFS.downloadFile)
      result.details.push("📥 Début téléchargement avec fetch...");

      try {
        // Si l'URL pointe vers l'API sécurisée avec token, tenter d'abord le stream direct
        let downloadUrl = content.fileUrl;
        if (
          downloadUrl.includes("/adhans.php") &&
          downloadUrl.includes("action=download")
        ) {
          // Utiliser 'serve' côté API, déjà sécurisé
          downloadUrl = downloadUrl.replace("action=download", "action=serve");
        }
        const response = await fetch(downloadUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        result.details.push(`📊 Téléchargé: ${uint8Array.length} bytes`);

        // 6. Écrire le fichier
        const base64Data = Buffer.from(uint8Array).toString("base64");
        await RNFS.writeFile(downloadPath, base64Data, "base64");
        result.details.push("💾 Fichier écrit sur disque");

        // 7. Vérifier que le fichier a été écrit
        const writtenFileExists = await RNFS.exists(downloadPath);
        if (!writtenFileExists) {
          throw new Error("Fichier non trouvé après écriture");
        }

        const stats = await RNFS.stat(downloadPath);
        result.details.push(`📊 Taille du fichier: ${stats.size} bytes`);

        // 8. Marquer comme téléchargé
        await this.markAsDownloaded(contentId, downloadPath);
        result.details.push("✅ Marqué comme téléchargé dans AsyncStorage");

        // 9. Mettre à jour le catalogue
        await this.markContentAsDownloaded(contentId, downloadPath);
        result.details.push("✅ Catalogue mis à jour");

        result.filePath = downloadPath;
        result.success = true;

        debugLog("✅ Téléchargement forcé réussi:", result);
        return result;
      } catch (downloadError) {
        result.error = `Erreur téléchargement: ${downloadError}`;
        result.details.push(`❌ Erreur téléchargement: ${downloadError}`);
        return result;
      }
    } catch (error) {
      const errorMsg = `Erreur générale: ${error}`;
      debugLog("❌ Erreur téléchargement forcé:", error);
      return {
        success: false,
        filePath: null,
        error: errorMsg,
        details: [`❌ ${errorMsg}`],
      };
    }
  }

  // 🚀 NOUVEAU : Forcer la migration des fichiers Quran externes
  async forceMigrateExternalQuranFiles(): Promise<void> {
    try {
      debugLog("🔄 Début migration forcée des fichiers Quran externes...");

      const externalPaths = [
        `${RNFS.ExternalDirectoryPath}/Download/premium_content`,
        `${RNFS.ExternalDirectoryPath}/Downloads/premium_content`,
      ];

      const dirLists = await Promise.all(
        externalPaths.map(async (externalPath) => {
          try {
            return await RNFS.readDir(externalPath);
          } catch (error) {
            debugLog(`⚠️ Erreur scan dossier externe ${externalPath}:`, error);
            return [] as Awaited<ReturnType<typeof RNFS.readDir>>;
          }
        }),
      );

      type QuranMigrateJob = {
        fileName: string;
        filePath: string;
        contentId: string;
        newPath: string;
        reciterFolder: string;
      };

      const jobs: QuranMigrateJob[] = [];
      for (let i = 0; i < externalPaths.length; i++) {
        for (const file of dirLists[i]) {
          if (
            file.isFile() &&
            file.name.endsWith(".mp3") &&
            file.name.startsWith("quran_")
          ) {
            const match = file.name.match(/^quran_(.+?)_\d+\.mp3$/);
            if (!match) continue;
            const reciterName = match[1];
            const contentId = `reciter_${reciterName}`;
            const reciterNameFormatted =
              this.extractReciterNameFromId(contentId);
            const reciterFolder = `${this.quranDirectory}/${reciterNameFormatted}`;
            const fileName = contentId + ".mp3";
            const newPath = `${reciterFolder}/${fileName}`;
            jobs.push({
              fileName: file.name,
              filePath: file.path,
              contentId,
              newPath,
              reciterFolder,
            });
          }
        }
      }

      const downloadedContentRaw =
        await LocalStorageManager.getPremium("DOWNLOADED_CONTENT");
      const downloaded: Record<string, unknown> = downloadedContentRaw
        ? JSON.parse(downloadedContentRaw)
        : {};

      const diskResults = await Promise.allSettled(
        jobs.map(async (job) => {
          debugLog(
            `📖 Migration forcée Quran: ${job.fileName} -> ${job.newPath}`,
          );
          try {
            try {
              await RNFS.mkdir(job.reciterFolder);
              debugLog(`📁 Dossier récitateur créé: ${job.reciterFolder}`);
            } catch {
              debugLog(
                `📁 Dossier récitateur existe déjà: ${job.reciterFolder}`,
              );
            }
            await RNFS.copyFile(job.filePath, job.newPath);
            const exists = await RNFS.exists(job.newPath);
            if (!exists) return null;
            return {
              contentId: job.contentId,
              newPath: job.newPath,
              oldPath: job.filePath,
            };
          } catch (error) {
            debugLog(`❌ Erreur migration fichier ${job.fileName}:`, error);
            return null;
          }
        }),
      );

      const toUnlink: string[] = [];
      let migratedCount = 0;
      for (const r of diskResults) {
        if (r.status !== "fulfilled" || !r.value) continue;
        const { contentId, newPath, oldPath } = r.value;
        downloaded[contentId] = {
          downloadPath: newPath,
          downloadedAt: new Date().toISOString(),
          fileSize: 0,
          migratedAt: new Date().toISOString(),
        };
        toUnlink.push(oldPath);
        migratedCount++;
        debugLog(`✅ Fichier Quran migré: ${contentId}`);
      }

      if (migratedCount > 0) {
        await LocalStorageManager.savePremium(
          "DOWNLOADED_CONTENT",
          downloaded,
          true,
          true,
        );
        await Promise.allSettled(
          toUnlink.map((oldPath) =>
            RNFS.unlink(oldPath).catch((unlinkErr) =>
              debugLog(
                `⚠️ Impossible de supprimer l'ancien fichier:`,
                unlinkErr,
              ),
            ),
          ),
        );
        debugLog(
          `🔄 Migration forcée terminée: ${migratedCount} fichiers Quran migrés`,
        );
      } else {
        debugLog("✅ Aucun fichier Quran externe à migrer");
      }
    } catch (error) {
      errorLog("❌ Erreur migration forcée Quran:", error);
    }
  }

  // 🚀 NOUVEAU : Lister les fichiers Quran téléchargés (pour diagnostic)
  public async listQuranFiles(): Promise<{
    totalFiles: number;
    files: {
      reciterName: string;
      fileName: string;
      filePath: string;
      fileSize: number;
    }[];
  }> {
    try {
      debugLog("📖 Liste des fichiers Quran téléchargés...");

      const result = {
        totalFiles: 0,
        files: [] as {
          reciterName: string;
          fileName: string;
          filePath: string;
          fileSize: number;
        }[],
      };

      // Scanner le dossier Quran
      const quranFiles = await RNFS.readDir(this.quranDirectory);
      const reciterDirs = quranFiles.filter((f) => f.isDirectory());
      const perDir = await Promise.all(
        reciterDirs.map(async (reciterFolder) => {
          try {
            const reciterFiles = await RNFS.readDir(reciterFolder.path);
            const mp3s = reciterFiles.filter(
              (f) => f.isFile() && f.name.endsWith(".mp3"),
            );
            return await Promise.all(
              mp3s.map(async (file) => {
                const fileStats = await RNFS.stat(file.path);
                return {
                  reciterName: reciterFolder.name,
                  fileName: file.name,
                  filePath: file.path,
                  fileSize: fileStats.size,
                };
              }),
            );
          } catch (reciterError) {
            debugLog(
              `⚠️ Erreur scan dossier récitateur ${reciterFolder.name}:`,
              reciterError,
            );
            return [];
          }
        }),
      );
      result.files = perDir.flat();
      result.totalFiles = result.files.length;

      debugLog(`✅ ${result.totalFiles} fichiers Quran trouvés`);
      return result;
    } catch (error) {
      errorLog("❌ Erreur liste fichiers Quran:", error);
      return { totalFiles: 0, files: [] };
    }
  }

  // 🚀 NOUVEAU : Vider complètement le dossier Quran
  public async clearQuranDirectory(): Promise<{
    deletedFiles: number;
    deletedFolders: number;
    errors: string[];
  }> {
    try {
      debugLog("🧹 Début nettoyage complet du dossier Quran...");

      const result = {
        deletedFiles: 0,
        deletedFolders: 0,
        errors: [] as string[],
      };

      // Scanner le dossier Quran
      const quranFiles = await RNFS.readDir(this.quranDirectory);

      const reciterDirs = quranFiles.filter((folder) => folder.isDirectory());
      await Promise.allSettled(
        reciterDirs.map(async (reciterFolder) => {
          try {
            const reciterFiles = await RNFS.readDir(reciterFolder.path);
            const filesToDelete: typeof reciterFiles = [];
            for (const f of reciterFiles) {
              if (f.isFile()) filesToDelete.push(f);
            }
            const fileResults = await Promise.allSettled(
              filesToDelete.map((file) => RNFS.unlink(file.path)),
            );
            fileResults.forEach((r, i) => {
              if (r.status === "fulfilled") {
                result.deletedFiles++;
              } else {
                result.errors.push(
                  `Erreur suppression fichier ${filesToDelete[i].name}: ${r.reason}`,
                );
              }
            });
            await RNFS.unlink(reciterFolder.path);
            result.deletedFolders++;
            debugLog(`🗑️ Dossier supprimé: ${reciterFolder.name}`);
          } catch (reciterError) {
            result.errors.push(
              `Erreur scan/suppression dossier ${reciterFolder.name}: ${reciterError}`,
            );
          }
        }),
      );

      // Nettoyer aussi AsyncStorage des entrées Quran
      try {
        const downloadedContent =
          await LocalStorageManager.getPremium("DOWNLOADED_CONTENT");
        if (downloadedContent) {
          const downloaded = JSON.parse(downloadedContent);
          const cleanedDownloads: any = {};

          for (const [contentId, contentInfo] of Object.entries(downloaded)) {
            const info = contentInfo as any;
            // Garder seulement les entrées qui ne sont pas des récitations Quran
            if (
              !contentId.startsWith("quran_") &&
              !contentId.startsWith("reciter_")
            ) {
              cleanedDownloads[contentId] = info;
            }
          }

          await LocalStorageManager.savePremium(
            "DOWNLOADED_CONTENT",
            cleanedDownloads,
            true,
            true,
          );
          debugLog("🧹 AsyncStorage nettoyé des entrées Quran");
        }
      } catch (storageError) {
        result.errors.push(`Erreur nettoyage AsyncStorage: ${storageError}`);
      }

      debugLog(
        `✅ Nettoyage terminé: ${result.deletedFiles} fichiers, ${result.deletedFolders} dossiers supprimés`,
      );
      return result;
    } catch (error) {
      errorLog("❌ Erreur nettoyage dossier Quran:", error);
      return {
        deletedFiles: 0,
        deletedFolders: 0,
        errors: [`Erreur générale: ${error}`],
      };
    }
  }

  // 🔧 FONCTION PUBLIQUE : Forcer le rechargement du catalogue avec vraies tailles
  public async forceRefreshAdhanSizes(): Promise<{
    success: boolean;
    message: string;
    details: {
      cacheClearedItems: string[];
      newAdhanCount: number;
      adhanWithSizes: Array<{ name: string; size: number }>;
    };
  }> {
    try {
      debugLog("🔧 Début du refresh forcé des tailles d'adhans...");

      const cacheClearedItems: string[] = [];

      // 1. Invalider tous les caches liés aux adhans
      const cacheKeys = [
        "premium_adhans_cache",
        "premium_catalog_cache",
        "premium_catalog_timestamp",
        "cached_adhans",
        "cached_adhans_timestamp",
      ];

      await AsyncStorage.multiRemove(cacheKeys);
      cacheClearedItems.push(...cacheKeys);
      debugLog(`✅ ${cacheKeys.length} clés cache supprimées en batch`);

      // 2. Forcer le rechargement du catalogue depuis le serveur
      debugLog("🔄 Rechargement du catalogue depuis le serveur...");
      const newCatalog = await this.getPremiumCatalog();

      if (!newCatalog || !newCatalog.adhanVoices) {
        throw new Error("Impossible de recharger le catalogue");
      }

      // 3. Extraire les informations de taille
      const adhanWithSizes = newCatalog.adhanVoices.map((adhan) => ({
        name: adhan.title,
        size: adhan.fileSize,
      }));

      debugLog(
        `✅ Catalogue rechargé: ${newCatalog.adhanVoices.length} adhans`,
      );
      adhanWithSizes.forEach((adhan) => {
        debugLog(`📏 ${adhan.name}: ${adhan.size} MB`);
      });

      return {
        success: true,
        message: `Refresh terminé avec succès ! ${newCatalog.adhanVoices.length} adhans rechargés avec les vraies tailles.`,
        details: {
          cacheClearedItems,
          newAdhanCount: newCatalog.adhanVoices.length,
          adhanWithSizes,
        },
      };
    } catch (error) {
      errorLog("❌ Erreur lors du refresh forcé des tailles:", error);
      return {
        success: false,
        message: `Erreur: ${error}`,
        details: {
          cacheClearedItems: [],
          newAdhanCount: 0,
          adhanWithSizes: [],
        },
      };
    }
  }
}

export default PremiumContentManager;
