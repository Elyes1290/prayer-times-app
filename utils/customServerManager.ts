import AsyncStorage from "@react-native-async-storage/async-storage";
import { debugLog, errorLog } from "./logger";
import { PremiumContent } from "./premiumContent";

/**
 * 🏠 Gestionnaire de Serveur Audio Personnel
 *
 * Remplace Firebase Storage par votre propre serveur
 * Économie : 173 CHF → 7 CHF/mois (-96%)
 */

export interface CustomServerConfig {
  enabled: boolean;
  baseUrl: string;
  fallbackUrls: string[];
  apiKey?: string;
  compressionEnabled: boolean;
  cacheEnabled: boolean;
}

export interface ServerResponse {
  success: boolean;
  url?: string;
  error?: string;
  source: "custom" | "cdn" | "firebase";
}

export class CustomServerManager {
  private static instance: CustomServerManager;
  private config: CustomServerConfig;

  private constructor() {
    this.config = {
      enabled: true, // Activer le serveur personnel par défaut
      baseUrl: "https://votre-serveur.com", // À configurer
      fallbackUrls: [
        "https://cdn.bunnycdn.com/prayerapp", // CDN de secours
        "https://cloudflare-cdn.example.com", // Autre CDN
      ],
      compressionEnabled: true,
      cacheEnabled: true,
    };

    this.loadConfig();
  }

  public static getInstance(): CustomServerManager {
    if (!CustomServerManager.instance) {
      CustomServerManager.instance = new CustomServerManager();
    }
    return CustomServerManager.instance;
  }

  /**
   * 🔧 Configuration depuis les paramètres ou variables d'environnement
   */
  private async loadConfig(): Promise<void> {
    try {
      const savedConfig = await AsyncStorage.getItem("custom_server_config");
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }

      // Variables d'environnement (pour build)
      if (process.env.CUSTOM_AUDIO_SERVER) {
        this.config.baseUrl = process.env.CUSTOM_AUDIO_SERVER;
      }

      debugLog("🏠 Configuration serveur personnel chargée:", this.config);
    } catch (error) {
      errorLog("❌ Erreur chargement config serveur:", error);
    }
  }

  /**
   * 🔗 Obtenir l'URL audio avec fallback intelligent
   */
  async getAudioUrl(content: PremiumContent): Promise<ServerResponse> {
    if (!this.config.enabled) {
      return {
        success: false,
        error: "Serveur personnel désactivé",
        source: "custom",
      };
    }

    const urls = this.buildAudioUrls(content);

    // Tester chaque URL dans l'ordre
    for (const { url, source } of urls) {
      try {
        const isAccessible = await this.testUrlAccessibility(url);
        if (isAccessible) {
          debugLog(`✅ Audio accessible depuis ${source}: ${url}`);
          return { success: true, url, source: source as any };
        }
      } catch (error) {
        debugLog(`❌ Échec ${source}: ${url}`);
      }
    }

    return {
      success: false,
      error: "Aucune source audio accessible",
      source: "custom",
    };
  }

  /**
   * 🔗 Construire les URLs avec ordre de priorité
   */
  private buildAudioUrls(
    content: PremiumContent
  ): { url: string; source: string }[] {
    const urls: { url: string; source: string }[] = [];

    // 1. Serveur personnel (priorité maximale)
    if (content.reciter && content.surahNumber) {
      // Format Quran: /audio/premium/quran/{reciter}/{surah}.mp3
      const surahFile = String(content.surahNumber).padStart(3, "0") + ".mp3";
      urls.push({
        url: `${this.config.baseUrl}/audio/premium/quran/${content.reciter}/${surahFile}`,
        source: "Serveur personnel",
      });
    } else if (content.type === "adhan") {
      // Format Adhan: /audio/premium/adhan/{filename}.mp3
      const filename = content.fileUrl.split("/").pop() || content.id + ".mp3";
      urls.push({
        url: `${this.config.baseUrl}/audio/premium/adhan/${filename}`,
        source: "Serveur personnel",
      });
    }

    // 2. CDNs de secours
    this.config.fallbackUrls.forEach((cdnUrl, index) => {
      const filename = this.extractFilename(content);
      urls.push({
        url: `${cdnUrl}/audio/${filename}`,
        source: `CDN ${index + 1}`,
      });
    });

    return urls;
  }

  /**
   * 🧪 Tester l'accessibilité d'une URL
   */
  private async testUrlAccessibility(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch(url, {
        method: "HEAD", // Vérifier sans télécharger
        signal: controller.signal,
        headers: {
          "User-Agent": "PrayerApp/1.0",
        },
      });

      clearTimeout(timeoutId);
      return response.ok && response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * 📂 Extraire le nom de fichier selon le type de contenu
   */
  private extractFilename(content: PremiumContent): string {
    if (content.reciter && content.surahNumber) {
      // Format: luhaidan_surah_002.mp3
      const surah = String(content.surahNumber).padStart(3, "0");
      return `${content.reciter.toLowerCase()}_surah_${surah}.mp3`;
    }

    // Pour les adhans et autres
    const originalName = content.fileUrl.split("/").pop() || "";
    return originalName || `${content.id}.mp3`;
  }

  /**
   * 📊 Obtenir les statistiques d'utilisation
   */
  async getUsageStats(): Promise<{
    customServerHits: number;
    cdnHits: number;
    firebaseHits: number;
    totalRequests: number;
    costSavings: string;
  }> {
    try {
      const stats = await AsyncStorage.getItem("server_usage_stats");
      const data = stats
        ? JSON.parse(stats)
        : {
            customServerHits: 0,
            cdnHits: 0,
            firebaseHits: 0,
            totalRequests: 0,
          };

      // Calcul des économies (estimation)
      const firebaseRate = 0.12; // CHF par GB
      const customServerRate = 0.01; // Estimation serveur personnel
      const avgFileSizeMB = 5; // Taille moyenne d'un fichier

      const dataSavedGB =
        ((data.customServerHits + data.cdnHits) * avgFileSizeMB) / 1024;
      const costSavings = (
        dataSavedGB *
        (firebaseRate - customServerRate)
      ).toFixed(2);

      return {
        ...data,
        costSavings: `${costSavings} CHF économisés`,
      };
    } catch (error) {
      errorLog("❌ Erreur lecture stats:", error);
      return {
        customServerHits: 0,
        cdnHits: 0,
        firebaseHits: 0,
        totalRequests: 0,
        costSavings: "0 CHF",
      };
    }
  }

  /**
   * 📈 Enregistrer une utilisation
   */
  async recordUsage(source: "custom" | "cdn" | "firebase"): Promise<void> {
    try {
      const stats = await this.getUsageStats();

      if (source === "custom") stats.customServerHits++;
      else if (source === "cdn") stats.cdnHits++;
      else if (source === "firebase") stats.firebaseHits++;

      stats.totalRequests++;

      await AsyncStorage.setItem("server_usage_stats", JSON.stringify(stats));
      debugLog(
        `📊 Usage enregistré: ${source} (Total: ${stats.totalRequests})`
      );
    } catch (error) {
      errorLog("❌ Erreur enregistrement usage:", error);
    }
  }

  /**
   * ⚙️ Mettre à jour la configuration
   */
  async updateConfig(newConfig: Partial<CustomServerConfig>): Promise<boolean> {
    try {
      this.config = { ...this.config, ...newConfig };
      await AsyncStorage.setItem(
        "custom_server_config",
        JSON.stringify(this.config)
      );
      debugLog("✅ Configuration serveur mise à jour:", this.config);
      return true;
    } catch (error) {
      errorLog("❌ Erreur mise à jour config:", error);
      return false;
    }
  }

  /**
   * 🧪 Tester la connectivité du serveur
   */
  async testServerConnectivity(): Promise<{
    customServer: boolean;
    fallbackCdns: boolean[];
    latency: number;
  }> {
    const startTime = Date.now();

    // Test serveur principal
    const customServerOk = await this.testUrlAccessibility(
      `${this.config.baseUrl}/status`
    );

    // Test CDNs de secours
    const cdnResults = await Promise.all(
      this.config.fallbackUrls.map((url) =>
        this.testUrlAccessibility(`${url}/status`)
      )
    );

    const latency = Date.now() - startTime;

    debugLog(
      `🧪 Test connectivité: Serveur=${customServerOk}, CDNs=${cdnResults}, Latence=${latency}ms`
    );

    return {
      customServer: customServerOk,
      fallbackCdns: cdnResults,
      latency,
    };
  }

  /**
   * 🔧 Diagnostics complets
   */
  async runDiagnostics(): Promise<{
    serverStatus: string;
    recommendations: string[];
    estimatedSavings: string;
  }> {
    const connectivity = await this.testServerConnectivity();
    const stats = await this.getUsageStats();

    let serverStatus = "inconnu";
    const recommendations: string[] = [];

    if (connectivity.customServer) {
      serverStatus = "✅ Opérationnel";
      recommendations.push("Serveur personnel fonctionne parfaitement");
    } else {
      serverStatus = "❌ Inaccessible";
      recommendations.push("Vérifier la configuration du serveur");
      recommendations.push("Vérifier la connexion internet");
    }

    if (connectivity.fallbackCdns.some((cdn) => cdn)) {
      recommendations.push("CDNs de secours disponibles");
    } else {
      recommendations.push("⚠️ Configurer des CDNs de secours");
    }

    if (connectivity.latency > 2000) {
      recommendations.push(
        "⚠️ Latence élevée, optimiser la localisation du serveur"
      );
    }

    const monthlyFirebaseCost = 173; // CHF
    const monthlyServerCost = 7; // CHF
    const estimatedSavings = `${
      monthlyFirebaseCost - monthlyServerCost
    } CHF/mois`;

    return {
      serverStatus,
      recommendations,
      estimatedSavings,
    };
  }

  // Getter pour la configuration actuelle
  get currentConfig(): CustomServerConfig {
    return { ...this.config };
  }
}

export default CustomServerManager;
