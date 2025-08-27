/**
 * 🔍 Utilitaire de Diagnostic Centralisé pour le Widget Audio Coran
 *
 * Cet utilitaire permet de diagnostiquer les problèmes du widget audio
 * et de fournir des solutions automatisées.
 */

import { NativeModules, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface DiagnosticResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  fixes: string[];
  recommendations: string[];
}

interface WidgetState {
  isPremium: boolean;
  hasWidget: boolean;
  serviceRunning: boolean;
  audioLoaded: boolean;
  hasLocalAudio: boolean;
  hasToken: boolean;
}

const { QuranWidgetModule, QuranAudioServiceModule } = NativeModules;

export class WidgetDiagnostic {
  /**
   * 🔍 Diagnostic complet du système widget
   */
  static async runFullDiagnostic(): Promise<DiagnosticResult> {
    const result: DiagnosticResult = {
      success: true,
      errors: [],
      warnings: [],
      fixes: [],
      recommendations: [],
    };

    console.log("🔍 Démarrage diagnostic complet widget...");

    try {
      // 1. Vérifier la plateforme
      if (Platform.OS !== "android") {
        result.errors.push("Widget uniquement disponible sur Android");
        result.success = false;
        return result;
      }

      // 2. Diagnostic des modules natifs
      await this.checkNativeModules(result);

      // 3. Diagnostic du statut premium
      await this.checkPremiumStatus(result);

      // 4. Diagnostic du token d'authentification
      await this.checkAuthToken(result);

      // 5. Diagnostic du service audio
      await this.checkAudioService(result);

      // 6. Diagnostic de l'état du widget
      await this.checkWidgetState(result);

      // 7. Appliquer les corrections automatiques
      await this.applyAutomaticFixes(result);
    } catch (error) {
      result.errors.push(`Erreur diagnostic: ${error}`);
      result.success = false;
    }

    console.log("🔍 Diagnostic terminé:", result);
    return result;
  }

  /**
   * ✅ Vérifier les modules natifs
   */
  private static async checkNativeModules(
    result: DiagnosticResult
  ): Promise<void> {
    if (!QuranWidgetModule) {
      result.errors.push("QuranWidgetModule non disponible");
      result.fixes.push("Reconstruire l'application Android");
    }

    if (!QuranAudioServiceModule) {
      result.errors.push("QuranAudioServiceModule non disponible");
      result.fixes.push("Reconstruire l'application Android");
    }

    if (QuranWidgetModule && QuranAudioServiceModule) {
      result.recommendations.push("Modules natifs disponibles ✅");
    }
  }

  /**
   * 👑 Vérifier le statut premium
   */
  private static async checkPremiumStatus(
    result: DiagnosticResult
  ): Promise<void> {
    try {
      const userData = await AsyncStorage.getItem("user_data");
      const premiumUser = await AsyncStorage.getItem(
        "@prayer_app_premium_user"
      );

      let isPremium = false;

      if (userData) {
        const parsedUserData = JSON.parse(userData);
        isPremium = parsedUserData.premium_status === 1;
      } else if (premiumUser) {
        const parsedPremiumUser = JSON.parse(premiumUser);
        isPremium =
          parsedPremiumUser.isPremium || parsedPremiumUser.hasPurchasedPremium;
      }

      if (!isPremium) {
        result.errors.push("Utilisateur non premium");
        result.fixes.push("Activer le statut premium");
        result.success = false;
      } else {
        result.recommendations.push("Statut premium actif ✅");
      }
    } catch (error) {
      result.warnings.push(`Erreur vérification premium: ${error}`);
    }
  }

  /**
   * 🔗 Vérifier le token d'authentification
   */
  private static async checkAuthToken(result: DiagnosticResult): Promise<void> {
    try {
      const token = await AsyncStorage.getItem("auth_token");

      if (!token) {
        result.warnings.push("Token d'authentification manquant");
        result.fixes.push("Synchroniser le token depuis PremiumContext");
      } else {
        result.recommendations.push("Token d'authentification présent ✅");
      }
    } catch (error) {
      result.warnings.push(`Erreur vérification token: ${error}`);
    }
  }

  /**
   * 🎵 Vérifier le service audio
   */
  private static async checkAudioService(
    result: DiagnosticResult
  ): Promise<void> {
    try {
      if (QuranAudioServiceModule?.getCurrentState) {
        const state = await QuranAudioServiceModule.getCurrentState();

        if (!state.isServiceRunning) {
          result.warnings.push("Service audio non démarré");
          result.fixes.push("Démarrer le service audio");
        } else {
          result.recommendations.push("Service audio en cours d'exécution ✅");
        }

        if (!state.currentSurah) {
          result.warnings.push("Aucune sourate chargée");
          result.fixes.push("Charger une sourate dans le service");
        }
      } else {
        result.warnings.push("Impossible de vérifier l'état du service audio");
      }
    } catch (error) {
      result.warnings.push(`Erreur vérification service audio: ${error}`);
    }
  }

  /**
   * 📱 Vérifier l'état du widget
   */
  private static async checkWidgetState(
    result: DiagnosticResult
  ): Promise<void> {
    try {
      if (QuranWidgetModule?.isWidgetAvailable) {
        const available = await QuranWidgetModule.isWidgetAvailable();

        if (!available) {
          result.warnings.push("Widget non disponible");
          result.fixes.push("Ajouter le widget à l'écran d'accueil");
        } else {
          result.recommendations.push("Widget disponible ✅");
        }
      } else {
        result.warnings.push("Impossible de vérifier l'état du widget");
      }
    } catch (error) {
      result.warnings.push(`Erreur vérification widget: ${error}`);
    }
  }

  /**
   * 🛠️ Appliquer les corrections automatiques
   */
  private static async applyAutomaticFixes(
    result: DiagnosticResult
  ): Promise<void> {
    let fixesApplied = 0;

    // Correction 1: Synchroniser le token
    if (result.fixes.includes("Synchroniser le token depuis PremiumContext")) {
      try {
        const token = await AsyncStorage.getItem("auth_token");
        if (token && QuranAudioServiceModule?.syncAuthToken) {
          await QuranAudioServiceModule.syncAuthToken(token);
          result.recommendations.push("Token synchronisé automatiquement 🔧");
          fixesApplied++;
        }
      } catch (error) {
        result.warnings.push(
          `Erreur synchronisation automatique token: ${error}`
        );
      }
    }

    // Correction 2: Démarrer le service audio
    if (result.fixes.includes("Démarrer le service audio")) {
      try {
        if (QuranAudioServiceModule?.startAudioService) {
          await QuranAudioServiceModule.startAudioService();
          result.recommendations.push(
            "Service audio démarré automatiquement 🔧"
          );
          fixesApplied++;
        }
      } catch (error) {
        result.warnings.push(`Erreur démarrage automatique service: ${error}`);
      }
    }

    // Correction 3: Forcer le statut premium
    if (result.fixes.includes("Activer le statut premium")) {
      try {
        if (QuranWidgetModule?.forcePremiumStatus) {
          await QuranWidgetModule.forcePremiumStatus(true);
          result.recommendations.push(
            "Statut premium forcé automatiquement 🔧"
          );
          fixesApplied++;
        }
      } catch (error) {
        result.warnings.push(`Erreur activation automatique premium: ${error}`);
      }
    }

    if (fixesApplied > 0) {
      result.recommendations.push(
        `${fixesApplied} correction(s) appliquée(s) automatiquement`
      );
    }
  }

  /**
   * 🎯 Diagnostic rapide pour développement
   */
  static async quickDiagnostic(): Promise<WidgetState> {
    const state: WidgetState = {
      isPremium: false,
      hasWidget: false,
      serviceRunning: false,
      audioLoaded: false,
      hasLocalAudio: false,
      hasToken: false,
    };

    try {
      // Vérifier premium
      const userData = await AsyncStorage.getItem("user_data");
      if (userData) {
        const parsed = JSON.parse(userData);
        state.isPremium = parsed.premium_status === 1;
      }

      // Vérifier widget
      if (QuranWidgetModule?.isWidgetAvailable) {
        state.hasWidget = await QuranWidgetModule.isWidgetAvailable();
      }

      // Vérifier service
      if (QuranAudioServiceModule?.getCurrentState) {
        const serviceState = await QuranAudioServiceModule.getCurrentState();
        state.serviceRunning = serviceState.isServiceRunning;
        state.audioLoaded = !!serviceState.currentSurah;
      }

      // Vérifier token
      const token = await AsyncStorage.getItem("auth_token");
      state.hasToken = !!token;
    } catch (error) {
      console.error("Erreur diagnostic rapide:", error);
    }

    return state;
  }

  /**
   * 🎯 Diagnostic des blocages selon le guide
   */
  static async checkBlockages(): Promise<
    { blocage: string; description: string }[]
  > {
    const blocages: { blocage: string; description: string }[] = [];

    try {
      const state = await this.quickDiagnostic();

      if (!state.isPremium) {
        blocages.push({
          blocage: "BLOCAGE 1",
          description:
            "Utilisateur non premium - vérifier la synchronisation du statut premium",
        });
      }

      if (!state.hasLocalAudio && state.audioLoaded) {
        blocages.push({
          blocage: "BLOCAGE 2",
          description:
            "Audio actuel non local - navigation limitée au streaming uniquement",
        });
      }

      if (!state.serviceRunning) {
        blocages.push({
          blocage: "BLOCAGE 3",
          description:
            "Service audio non démarré - impossible de contrôler la lecture",
        });
      }

      if (!state.hasWidget) {
        blocages.push({
          blocage: "BLOCAGE 4",
          description: "Widget non ajouté à l'écran d'accueil",
        });
      }
    } catch (error) {
      blocages.push({
        blocage: "ERREUR DIAGNOSTIC",
        description: `Erreur lors du diagnostic: ${error}`,
      });
    }

    return blocages;
  }
}

export default WidgetDiagnostic;
