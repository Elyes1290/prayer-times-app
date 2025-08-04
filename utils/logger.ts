/**
 * Système de logging conditionnel pour MyAdhan Prayer App
 * Permet de contrôler les logs selon l'environnement
 */

// Types pour les niveaux de log
type LogLevel = "debug" | "info" | "warn" | "error";

// Configuration du logger
const LOG_CONFIG = {
  // 🧹 DÉSACTIVÉ : Tous les logs de debug pour une console propre
  enableDebugLogs: false, // __DEV__ || process.env.NODE_ENV !== "production",
  // Préfixe pour identifier nos logs
  prefix: "[MyAdhan]",
};

/**
 * Logger conditionnel qui ne s'affiche qu'en développement
 */
class ConditionalLogger {
  debug(message: string, ...args: any[]): void {
    if (LOG_CONFIG.enableDebugLogs) {
      console.log(`${LOG_CONFIG.prefix} ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    console.info(`${LOG_CONFIG.prefix} ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`${LOG_CONFIG.prefix} ${message}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`${LOG_CONFIG.prefix} ${message}`, ...args);
  }

  /**
   * Log spécialement pour le debug des notifications
   * Peut être complètement désactivé en production
   */
  notificationDebug(message: string, ...args: any[]): void {
    if (LOG_CONFIG.enableDebugLogs) {
      console.log(`${LOG_CONFIG.prefix} [NOTIFICATIONS] ${message}`, ...args);
    }
  }

  /**
   * Log spécialement pour le debug du widget
   */
  widgetDebug(message: string, ...args: any[]): void {
    if (LOG_CONFIG.enableDebugLogs) {
      console.log(`${LOG_CONFIG.prefix} [WIDGET] ${message}`, ...args);
    }
  }
}

// Export d'une instance unique
export const logger = new ConditionalLogger();

// Export également les méthodes pour compatibilité
export const debugLog = logger.debug.bind(logger);
export const infoLog = logger.info.bind(logger);
export const warnLog = logger.warn.bind(logger);
export const errorLog = logger.error.bind(logger);
export const notificationDebugLog = logger.notificationDebug.bind(logger);
export const widgetDebugLog = logger.widgetDebug.bind(logger);
