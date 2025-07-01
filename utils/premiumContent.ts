import AsyncStorage from "@react-native-async-storage/async-storage";
import storage from "@react-native-firebase/storage";
import RNFS from "react-native-fs";
import { Platform } from "react-native";
import { debugLog, errorLog } from "./logger";

// Types de contenu premium
export interface PremiumContent {
  id: string;
  type: "adhan" | "quran" | "dhikr" | "theme";
  title: string;
  description: string;
  fileUrl: string;
  fileSize: number; // en MB
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

  private constructor() {
    this.downloadDirectory = `${RNFS.DocumentDirectoryPath}/premium_content`;
    this.initializeDirectory();
  }

  public static getInstance(): PremiumContentManager {
    if (!PremiumContentManager.instance) {
      PremiumContentManager.instance = new PremiumContentManager();
    }
    return PremiumContentManager.instance;
  }

  private async initializeDirectory(): Promise<void> {
    try {
      const exists = await RNFS.exists(this.downloadDirectory);
      if (!exists) {
        await RNFS.mkdir(this.downloadDirectory);
        debugLog("📁 Répertoire premium content créé");
      }
    } catch (error) {
      errorLog("❌ Erreur création répertoire premium:", error);
    }
  }

  // 📋 Récupérer le catalogue dynamiquement depuis Firebase Storage
  async getPremiumCatalog(): Promise<PremiumCatalog | null> {
    try {
      debugLog(
        "📋 Récupération du catalogue premium depuis Firebase Storage..."
      );

      const catalog: PremiumCatalog = {
        adhanVoices: [],
        quranRecitations: [],
        dhikrCollections: [],
        premiumThemes: [],
      };

      // 🎵 Scanner les fichiers d'adhan
      catalog.adhanVoices = await this.scanStorageFolder(
        "premium/adhan",
        "adhan"
      );

      // 📖 Scanner les récitations du Coran (organisées par récitateur)
      catalog.quranRecitations = await this.scanQuranRecitations();

      // 🤲 Scanner les collections de dhikr
      catalog.dhikrCollections = await this.scanStorageFolder(
        "premium/dhikr",
        "dhikr"
      );

      // 🎨 Scanner les thèmes
      catalog.premiumThemes = await this.scanStorageFolder(
        "premium/themes",
        "theme"
      );

      debugLog(
        `✅ Catalogue généré: ${catalog.adhanVoices.length} adhans, ${catalog.quranRecitations.length} récitations, ${catalog.dhikrCollections.length} dhikrs, ${catalog.premiumThemes.length} thèmes`
      );

      return catalog;
    } catch (error) {
      errorLog("❌ Erreur récupération catalogue premium:", error);
      return null;
    }
  }

  // 📖 Scanner spécialement le dossier Quran avec ses sous-dossiers de récitateurs
  private async scanQuranRecitations(): Promise<PremiumContent[]> {
    try {
      debugLog("🔍 Scan des récitations Quran par récitateur");

      const quranRef = storage().ref("premium/quran");
      const listResult = await quranRef.listAll();

      const recitations: PremiumContent[] = [];

      // Scanner les dossiers de récitateurs (sous-dossiers)
      for (const reciterFolder of listResult.prefixes) {
        const reciterName = reciterFolder.name;
        debugLog(`👤 Scan récitateur: ${reciterName}`);

        const reciterFiles = await reciterFolder.listAll();

        for (const fileItem of reciterFiles.items) {
          try {
            const metadata = await fileItem.getMetadata();
            const fileName = fileItem.name;
            const filePath = fileItem.fullPath;

            // Parser le nom du fichier pour extraire les infos de sourate
            const parsedInfo = this.parseQuranFileName(fileName, reciterName);

            // Créer un ID unique pour cette récitation
            const id = `${reciterName}_surah_${parsedInfo.surahNumber}`
              .replace(/\s+/g, "_")
              .toLowerCase();

            // Calculer la taille en MB
            const fileSizeBytes = metadata.size || 0;
            const fileSizeMB =
              Math.round((fileSizeBytes / (1024 * 1024)) * 10) / 10;

            // Vérifier si déjà téléchargé
            const downloadPath = await this.isContentDownloaded(id);

            const recitation: PremiumContent = {
              id: id,
              type: "quran",
              title: parsedInfo.fullTitle,
              description: `Sourate ${parsedInfo.surahNumber}: ${parsedInfo.surahName} récitée par ${reciterName}`,
              fileUrl: filePath,
              fileSize: fileSizeMB,
              version: "1.0",
              isDownloaded: !!downloadPath,
              downloadPath: downloadPath || undefined,
              // Propriétés spécifiques au Quran
              reciter: reciterName,
              surahNumber: parsedInfo.surahNumber,
              surahName: parsedInfo.surahName,
            };

            recitations.push(recitation);
            debugLog(
              `✅ Récitation trouvée: ${parsedInfo.fullTitle} (${fileSizeMB} MB)`
            );
          } catch (itemError) {
            errorLog(
              `❌ Erreur traitement fichier ${fileItem.name}:`,
              itemError
            );
          }
        }
      }

      // Trier par récitateur puis par numéro de sourate
      recitations.sort((a, b) => {
        if (a.reciter !== b.reciter) {
          return (a.reciter || "").localeCompare(b.reciter || "");
        }
        return (a.surahNumber || 0) - (b.surahNumber || 0);
      });

      debugLog(`📖 Récitations Quran: ${recitations.length} fichiers trouvés`);
      return recitations;
    } catch (error) {
      errorLog("❌ Erreur scan récitations Quran:", error);
      return [];
    }
  }

  // 🔍 Scanner un dossier Firebase Storage et créer les entrées du catalogue
  private async scanStorageFolder(
    folderPath: string,
    type: "adhan" | "quran" | "dhikr" | "theme"
  ): Promise<PremiumContent[]> {
    try {
      debugLog(`🔍 Scan du dossier: ${folderPath}`);

      const storageRef = storage().ref(folderPath);
      const listResult = await storageRef.listAll();

      const contents: PremiumContent[] = [];

      for (const item of listResult.items) {
        try {
          // Récupérer les métadonnées du fichier
          const metadata = await item.getMetadata();
          const fileName = item.name;
          const filePath = item.fullPath;

          // Créer un ID basé sur le nom du fichier (sans extension)
          const id = fileName.replace(/\.[^/.]+$/, "");

          // Générer un titre lisible basé sur le nom du fichier
          const title = this.generateReadableTitle(fileName, type);

          // Calculer la taille en MB
          const fileSizeBytes = metadata.size || 0;
          const fileSizeMB =
            Math.round((fileSizeBytes / (1024 * 1024)) * 10) / 10;

          // Vérifier si déjà téléchargé
          const downloadPath = await this.isContentDownloaded(id);

          const content: PremiumContent = {
            id: id,
            type: type,
            title: title,
            description: this.generateDescription(fileName, type),
            fileUrl: filePath,
            fileSize: fileSizeMB,
            version: "1.0",
            isDownloaded: !!downloadPath,
            downloadPath: downloadPath || undefined,
          };

          contents.push(content);
          debugLog(`✅ Fichier trouvé: ${fileName} (${fileSizeMB} MB)`);
        } catch (itemError) {
          errorLog(`❌ Erreur traitement fichier ${item.name}:`, itemError);
        }
      }

      debugLog(`📁 ${folderPath}: ${contents.length} fichiers trouvés`);
      return contents;
    } catch (error) {
      errorLog(`❌ Erreur scan dossier ${folderPath}:`, error);
      return [];
    }
  }

  // 📖 Parser un nom de fichier Quran pour extraire les informations
  private parseQuranFileName(
    fileName: string,
    reciterName: string
  ): {
    surahNumber: number;
    surahName: string;
    fullTitle: string;
  } {
    // Pattern: "Saoud Shuraim Surah(001) - Al Fatiha"
    const surahMatch = fileName.match(
      /Surah\((\d+)\)\s*-\s*(.+?)(?:\.[^.]+)?$/i
    );

    if (surahMatch) {
      const surahNumber = parseInt(surahMatch[1], 10);
      const surahName = surahMatch[2].trim();
      return {
        surahNumber,
        surahName,
        fullTitle: `${surahName} (${surahNumber}) - ${reciterName}`,
      };
    }

    // Fallback si le pattern ne correspond pas
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
    return {
      surahNumber: 0,
      surahName: nameWithoutExt,
      fullTitle: `${nameWithoutExt} - ${reciterName}`,
    };
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
    onProgress?: (progress: number) => void
  ): Promise<boolean> {
    try {
      debugLog(`📥 Début téléchargement: ${content.title}`);

      const fileName =
        content.fileUrl.split("/").pop() || `${content.id}.${content.type}`;
      const downloadPath = `${this.downloadDirectory}/${fileName}`;

      // Vérifier si déjà téléchargé
      const exists = await RNFS.exists(downloadPath);
      if (exists) {
        debugLog(`✅ Contenu déjà téléchargé: ${content.title}`);
        await this.markAsDownloaded(content.id, downloadPath);
        return true;
      }

      // Télécharger depuis Firebase Storage
      const reference = storage().ref(content.fileUrl);
      const downloadUrl = await reference.getDownloadURL();

      // Télécharger avec RNFS et suivi de progression
      const downloadResult = await RNFS.downloadFile({
        fromUrl: downloadUrl,
        toFile: downloadPath,
        progress: (res: { bytesWritten: number; contentLength: number }) => {
          const progress = (res.bytesWritten / res.contentLength) * 100;
          onProgress?.(Math.round(progress));
        },
      }).promise;

      if (downloadResult.statusCode === 200) {
        await this.markAsDownloaded(content.id, downloadPath);
        debugLog(`✅ Téléchargement terminé: ${content.title}`);
        return true;
      } else {
        throw new Error(`Échec téléchargement: ${downloadResult.statusCode}`);
      }
    } catch (error) {
      errorLog(`❌ Erreur téléchargement ${content.title}:`, error);
      return false;
    }
  }

  // ✅ Marquer comme téléchargé
  private async markAsDownloaded(
    contentId: string,
    downloadPath: string
  ): Promise<void> {
    try {
      const downloadedContent = await AsyncStorage.getItem(
        "downloaded_premium_content"
      );
      const downloaded = downloadedContent ? JSON.parse(downloadedContent) : {};

      downloaded[contentId] = {
        downloadPath,
        downloadedAt: new Date().toISOString(),
      };

      // Sauvegarder dans AsyncStorage (pour React Native)
      await AsyncStorage.setItem(
        "downloaded_premium_content",
        JSON.stringify(downloaded)
      );

      // 🔧 AUSSI sauvegarder dans SharedPreferences accessibles depuis Android
      if (Platform.OS === "android") {
        const { NativeModules } = require("react-native");
        const { AdhanModule } = NativeModules;

        if (AdhanModule && AdhanModule.savePremiumContentData) {
          try {
            await AdhanModule.savePremiumContentData(
              JSON.stringify(downloaded)
            );
            debugLog("✅ Données premium sauvées pour Android");
          } catch (error) {
            debugLog("❌ Erreur sauvegarde Android, mais AsyncStorage OK");
          }
        }
      }

      debugLog(
        `✅ Son premium ${contentId} marqué comme téléchargé: ${downloadPath}`
      );
    } catch (error) {
      errorLog("❌ Erreur sauvegarde statut téléchargement:", error);
    }
  }

  // 📱 Vérifier si contenu est téléchargé
  async isContentDownloaded(contentId: string): Promise<string | null> {
    try {
      const downloadedContent = await AsyncStorage.getItem(
        "downloaded_premium_content"
      );
      const downloaded = downloadedContent ? JSON.parse(downloadedContent) : {};

      const contentInfo = downloaded[contentId];
      if (contentInfo && (await RNFS.exists(contentInfo.downloadPath))) {
        return contentInfo.downloadPath;
      }
      return null;
    } catch (error) {
      errorLog("❌ Erreur vérification téléchargement:", error);
      return null;
    }
  }

  // 🗑️ Supprimer contenu premium
  async deletePremiumContent(contentId: string): Promise<boolean> {
    try {
      const downloadPath = await this.isContentDownloaded(contentId);
      if (downloadPath) {
        await RNFS.unlink(downloadPath);

        // Retirer de la liste des téléchargés
        const downloadedContent = await AsyncStorage.getItem(
          "downloaded_premium_content"
        );
        const downloaded = downloadedContent
          ? JSON.parse(downloadedContent)
          : {};
        delete downloaded[contentId];
        await AsyncStorage.setItem(
          "downloaded_premium_content",
          JSON.stringify(downloaded)
        );

        debugLog(`🗑️ Contenu supprimé: ${contentId}`);
        return true;
      }
      return false;
    } catch (error) {
      errorLog(`❌ Erreur suppression ${contentId}:`, error);
      return false;
    }
  }

  // 📊 Obtenir l'espace utilisé par le contenu premium
  async getPremiumContentSize(): Promise<number> {
    try {
      const downloadedContent = await AsyncStorage.getItem(
        "downloaded_premium_content"
      );
      const downloaded = downloadedContent ? JSON.parse(downloadedContent) : {};

      let totalSize = 0;
      for (const contentInfo of Object.values(downloaded) as any[]) {
        if (await RNFS.exists(contentInfo.downloadPath)) {
          const stat = await RNFS.stat(contentInfo.downloadPath);
          totalSize += stat.size;
        }
      }

      return totalSize / (1024 * 1024); // Retourner en MB
    } catch (error) {
      errorLog("❌ Erreur calcul taille premium:", error);
      return 0;
    }
  }
}

export default PremiumContentManager;
