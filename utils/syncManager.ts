import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "./apiClient";

// 🚀 NOUVEAU : Gestionnaire de synchronisation pour lier AsyncStorage avec la base de données
class SyncManager {
  private static instance: SyncManager;
  private isSyncing = false;
  private lastSyncTime: Date | null = null;

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  // 🚀 NOUVEAU : Synchroniser les favoris
  async syncFavorites(): Promise<boolean> {
    if (this.isSyncing) {
      // console.log("🔄 Synchronisation déjà en cours...");
      return false;
    }

    try {
      this.isSyncing = true;
      // console.log("🔄 Début synchronisation favoris...");

      // Récupérer les favoris locaux
      const favoritesData = await AsyncStorage.getItem(
        "@prayer_app_favorites_local",
      );
      if (!favoritesData) {
        console.log("📭 Aucun favori local à synchroniser");
        return true;
      }

      let favorites: any[] = [];
      try {
        favorites = JSON.parse(favoritesData);
      } catch {
        console.log("⚠️ Erreur parsing favoris, reset à tableau vide");
        favorites = [];
      }

      // Synchroniser avec la base de données
      const result = await apiClient.syncFavorites(favorites);

      if (result.success) {
        // console.log(`✅ ${favorites.length} favoris synchronisés`);
        this.lastSyncTime = new Date();
        return true;
      } else {
        console.error("❌ Erreur synchronisation favoris:", result.message);
        return false;
      }
    } catch (error) {
      console.error("❌ Erreur synchronisation favoris:", error);
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  // 🗑️ SUPPRIMÉ: Synchronisation des téléchargements
  // Cette fonction causait des désynchronisations entre la base de données et la réalité des fichiers
  // Le stockage local (AsyncStorage) est suffisant et plus fiable
  async syncDownloads(): Promise<boolean> {
    console.log(
      "📭 Synchronisation téléchargements désactivée - stockage local uniquement"
    );
    return true; // Toujours réussi car pas de synchronisation
  }

  // 🚀 NOUVEAU : Synchroniser les achats premium
  async syncPremiumPurchase(purchaseData: {
    subscription_type: string;
    subscription_id: string;
    premium_expiry: string;
  }): Promise<boolean> {
    try {
      // console.log("🔄 Synchronisation achat premium...");

      const result = await apiClient.syncPremiumPurchase(purchaseData);

      if (result.success) {
        // console.log("✅ Achat premium synchronisé");
        this.lastSyncTime = new Date();
        return true;
      } else {
        console.error(
          "❌ Erreur synchronisation achat premium:",
          result.message
        );
        return false;
      }
    } catch (error) {
      console.error("❌ Erreur synchronisation achat premium:", error);
      return false;
    }
  }

  // 🚀 NOUVEAU : Synchronisation complète
  async fullSync(): Promise<{
    favorites: boolean;
    downloads: boolean;
    success: boolean;
  }> {
    // console.log("🔄 Début synchronisation complète...");

    const results = {
      favorites: await this.syncFavorites(),
      downloads: await this.syncDownloads(),
      success: false,
    };

    results.success = results.favorites && results.downloads;

    if (results.success) {
      // console.log("✅ Synchronisation complète réussie");
    } else {
      console.log("⚠️ Synchronisation partielle réussie");
    }

    return results;
  }

  // 🚀 NOUVEAU : Synchronisation automatique périodique
  async startAutoSync(intervalMinutes: number = 30): Promise<void> {
    console.log(
      `🔄 Démarrage synchronisation automatique (${intervalMinutes} min)`
    );

    // Synchroniser immédiatement
    await this.fullSync();

    // Puis toutes les X minutes
    const handle = setInterval(async () => {
      await this.fullSync();
    }, intervalMinutes * 60 * 1000);
    // Dans l'app, on ne garde pas de référence globale; en tests, éviter les fuites
    // @ts-ignore
    if (typeof handle?.unref === "function") {
      // @ts-ignore
      handle.unref();
    }
  }

  // 🚀 NOUVEAU : Obtenir le statut de synchronisation
  getSyncStatus(): {
    isSyncing: boolean;
    lastSyncTime: Date | null;
  } {
    return {
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
    };
  }

  // 🚀 NOUVEAU : Forcer une synchronisation
  async forceSync(): Promise<boolean> {
    // console.log("🔄 Synchronisation forcée...");
    const result = await this.fullSync();
    return result.success;
  }
}

export default SyncManager;
