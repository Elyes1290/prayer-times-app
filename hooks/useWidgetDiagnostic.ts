/**
 * 🔍 Hook Unifié pour le Diagnostic du Widget Audio Coran
 *
 * Ce hook centralise toutes les fonctionnalités de diagnostic et de correction
 * du widget audio du Coran.
 */

import { useState, useCallback } from "react";
import { Platform } from "react-native";
import WidgetDiagnostic from "../utils/widgetDiagnostic";
import { usePremium } from "../contexts/PremiumContext";
import { useToast } from "../contexts/ToastContext";
import { useTranslation } from "react-i18next";

interface DiagnosticState {
  isRunning: boolean;
  lastResult: any | null;
  quickState: any | null;
  blockages: any[];
}

export const useWidgetDiagnostic = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user } = usePremium();
  const [diagnosticState, setDiagnosticState] = useState<DiagnosticState>({
    isRunning: false,
    lastResult: null,
    quickState: null,
    blockages: [],
  });

  /**
   * 🔍 Diagnostic complet avec rapport détaillé
   */
  const runFullDiagnostic = useCallback(async () => {
    if (Platform.OS !== "android") {
      showToast?.({
        type: "warning",
        title: t("toast_widget_android_only_title"),
        message: t("toast_widget_android_only_message"),
      });
      return;
    }

    setDiagnosticState((prev) => ({ ...prev, isRunning: true }));

    try {
      console.log("🔍 Démarrage diagnostic complet...");
      const result = await WidgetDiagnostic.runFullDiagnostic();

      setDiagnosticState((prev) => ({
        ...prev,
        lastResult: result,
        isRunning: false,
      }));

      // Afficher le résultat à l'utilisateur
      if (result.success) {
        showToast?.({
          type: "success",
          title: "✅ Diagnostic réussi",
          message: `Widget fonctionnel. ${result.recommendations.length} recommandation(s).`,
        });
      } else {
        showToast?.({
          type: "error",
          title: "❌ Problèmes détectés",
          message: `${result.errors.length} erreur(s), ${result.fixes.length} correction(s) proposée(s).`,
        });
      }

      console.log("🔍 Résultat diagnostic:", result);
      return result;
    } catch (error) {
      console.error("❌ Erreur diagnostic:", error);
      setDiagnosticState((prev) => ({ ...prev, isRunning: false }));

      showToast?.({
        type: "error",
        title: t("toast_diagnostic_error_title"),
        message: t("toast_diagnostic_error_message"),
      });
    }
  }, [showToast]);

  /**
   * ⚡ Diagnostic rapide pour l'état actuel
   */
  const runQuickDiagnostic = useCallback(async () => {
    try {
      console.log("⚡ Diagnostic rapide...");
      const state = await WidgetDiagnostic.quickDiagnostic();

      setDiagnosticState((prev) => ({
        ...prev,
        quickState: state,
      }));

      console.log("⚡ État rapide:", state);
      return state;
    } catch (error) {
      console.error("❌ Erreur diagnostic rapide:", error);
    }
  }, []);

  /**
   * 🚫 Vérifier les blocages spécifiques
   */
  const checkBlockages = useCallback(async () => {
    try {
      console.log("🚫 Vérification blocages...");
      const blockages = await WidgetDiagnostic.checkBlockages();

      setDiagnosticState((prev) => ({
        ...prev,
        blockages,
      }));

      if (blockages.length > 0) {
        showToast?.({
          type: "warning",
          title: `${blockages.length} blocage(s) détecté(s)`,
          message: blockages[0].description,
        });
      }

      console.log("🚫 Blocages trouvés:", blockages);
      return blockages;
    } catch (error) {
      console.error("❌ Erreur vérification blocages:", error);
    }
  }, [showToast]);

  /**
   * 🛠️ Correction automatique des problèmes courants
   */
  const autoFix = useCallback(async () => {
    try {
      console.log("🛠️ Correction automatique...");

      // Exécuter un diagnostic complet qui inclut les corrections
      const result = await WidgetDiagnostic.runFullDiagnostic();

      const fixesApplied = result.recommendations.filter((r) =>
        r.includes("🔧")
      ).length;

      if (fixesApplied > 0) {
        showToast?.({
          type: "success",
          title: "🛠️ Corrections appliquées",
          message: `${fixesApplied} correction(s) automatique(s) appliquée(s)`,
        });
      } else {
        showToast?.({
          type: "info",
          title: t("toast_no_auto_fix_title"),
          message: t("toast_no_auto_fix_message"),
        });
      }

      return result;
    } catch (error) {
      console.error("❌ Erreur correction automatique:", error);
      showToast?.({
        type: "error",
        title: t("toast_auto_fix_error_title"),
        message: t("toast_auto_fix_error_message"),
      });
    }
  }, [showToast]);

  /**
   * 📊 Obtenir un résumé de l'état du widget
   */
  const getWidgetSummary = useCallback(() => {
    const { quickState, blockages } = diagnosticState;

    if (!quickState) {
      return {
        status: "unknown",
        message: "État non vérifié",
        color: "#999",
      };
    }

    if (blockages.length > 0) {
      return {
        status: "blocked",
        message: `${blockages.length} blocage(s)`,
        color: "#ff4444",
      };
    }

    if (
      quickState.isPremium &&
      quickState.hasWidget &&
      quickState.serviceRunning
    ) {
      return {
        status: "optimal",
        message: "Fonctionnel ✅",
        color: "#4caf50",
      };
    }

    if (quickState.isPremium && quickState.hasWidget) {
      return {
        status: "partial",
        message: "Partiellement fonctionnel",
        color: "#ff9800",
      };
    }

    return {
      status: "error",
      message: "Non fonctionnel",
      color: "#ff4444",
    };
  }, [diagnosticState]);

  /**
   * 🏥 Diagnostic complet avec recommandations d'action
   */
  const getRecommendedActions = useCallback(() => {
    const { lastResult, quickState, blockages } = diagnosticState;
    const actions: string[] = [];

    if (!user?.isPremium) {
      actions.push("Activer le statut premium");
    }

    if (quickState && !quickState.hasWidget) {
      actions.push("Ajouter le widget à l'écran d'accueil");
    }

    if (quickState && !quickState.serviceRunning) {
      actions.push("Démarrer le service audio");
    }

    if (blockages.length > 0) {
      actions.push("Résoudre les blocages détectés");
    }

    if (lastResult?.errors?.length > 0) {
      actions.push("Corriger les erreurs détectées");
    }

    if (actions.length === 0) {
      actions.push("Widget fonctionnel ✅");
    }

    return actions;
  }, [diagnosticState, user]);

  return {
    // État
    isRunning: diagnosticState.isRunning,
    lastResult: diagnosticState.lastResult,
    quickState: diagnosticState.quickState,
    blockages: diagnosticState.blockages,

    // Actions de diagnostic
    runFullDiagnostic,
    runQuickDiagnostic,
    checkBlockages,
    autoFix,

    // Utilitaires
    getWidgetSummary,
    getRecommendedActions,

    // Flags utiles
    isAvailable: Platform.OS === "android",
    hasPremium: user?.isPremium || false,
    hasErrors: diagnosticState.lastResult?.errors?.length > 0,
    hasWarnings: diagnosticState.lastResult?.warnings?.length > 0,
  };
};

export default useWidgetDiagnostic;
