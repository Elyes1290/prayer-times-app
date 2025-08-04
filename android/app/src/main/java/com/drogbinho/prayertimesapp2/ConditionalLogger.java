package com.drogbinho.prayertimesapp2;

import android.util.Log;
import com.facebook.react.BuildConfig;

/**
 * Système de logging conditionnel pour Android
 * - En mode DEBUG (development) : logs visibles normalement
 * - En mode RELEASE (production) : logs complètement désactivés
 * 
 * Même principe que notre logger TypeScript
 */
public class ConditionalLogger {

    // Configuration - se base sur BuildConfig.DEBUG (automatique)
    private static final boolean ENABLE_DEBUG_LOGS = BuildConfig.DEBUG;
    private static final String LOG_PREFIX = "[MyAdhan]";

    /**
     * Log de debugging (équivalent console.log)
     * Désactivé automatiquement en production
     */
    public static void debugLog(String tag, String message) {
        if (ENABLE_DEBUG_LOGS) {
            Log.d(tag, LOG_PREFIX + " " + message);
        }
    }

    /**
     * Log d'information (pour les infos importantes)
     * Désactivé automatiquement en production
     */
    public static void infoLog(String tag, String message) {
        if (ENABLE_DEBUG_LOGS) {
            Log.i(tag, LOG_PREFIX + " " + message);
        }
    }

    /**
     * Log d'avertissement (pour les warnings non-critiques)
     * Désactivé automatiquement en production
     */
    public static void warnLog(String tag, String message) {
        if (ENABLE_DEBUG_LOGS) {
            Log.w(tag, LOG_PREFIX + " " + message);
        }
    }

    /**
     * Log d'erreur (pour les vraies erreurs)
     * TOUJOURS activé même en production (pour crash reports)
     */
    public static void errorLog(String tag, String message) {
        Log.e(tag, LOG_PREFIX + " " + message);
    }

    /**
     * Log d'erreur avec exception
     * TOUJOURS activé même en production (pour crash reports)
     */
    public static void errorLog(String tag, String message, Throwable throwable) {
        Log.e(tag, LOG_PREFIX + " " + message, throwable);
    }

    /**
     * Log spécialisé pour les notifications
     * Désactivé automatiquement en production
     */
    public static void notificationDebugLog(String tag, String message) {
        if (ENABLE_DEBUG_LOGS) {
            Log.d(tag, LOG_PREFIX + " [NOTIFICATIONS] " + message);
        }
    }

    /**
     * Log spécialisé pour les notifications avec exception
     * Désactivé automatiquement en production
     */
    public static void notificationDebugLog(String tag, String message, Throwable throwable) {
        if (ENABLE_DEBUG_LOGS) {
            Log.d(tag, LOG_PREFIX + " [NOTIFICATIONS] " + message, throwable);
        }
    }

    /**
     * Alias pour warnLog (compatibilité)
     */
    public static void warningLog(String tag, String message) {
        warnLog(tag, message);
    }

    /**
     * Log spécialisé pour le widget
     * Désactivé automatiquement en production
     */
    public static void widgetDebugLog(String tag, String message) {
        if (ENABLE_DEBUG_LOGS) {
            Log.d(tag, LOG_PREFIX + " [WIDGET] " + message);
        }
    }

    /**
     * System.out.println conditionnel
     * Désactivé automatiquement en production
     */
    public static void systemOutLog(String message) {
        if (ENABLE_DEBUG_LOGS) {
            System.out.println(LOG_PREFIX + " " + message);
        }
    }
}