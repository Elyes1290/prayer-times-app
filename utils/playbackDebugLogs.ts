import AsyncStorage from "@react-native-async-storage/async-storage";

const PLAYBACK_DEBUG_LOGS_KEY = "PLAYBACK_DEBUG_LOGS";
const MAX_LOG_ENTRIES = 50;

export interface PlaybackDebugLog {
  timestamp: string;
  action: string;
  details: any;
}

/**
 * Ajouter un log de debug de lecture
 */
export async function addPlaybackDebugLog(
  action: string,
  details: any = {}
): Promise<void> {
  try {
    const existingLogsJson = await AsyncStorage.getItem(
      PLAYBACK_DEBUG_LOGS_KEY
    );
    const existingLogs: PlaybackDebugLog[] = existingLogsJson
      ? JSON.parse(existingLogsJson)
      : [];

    const newLog: PlaybackDebugLog = {
      timestamp: new Date().toISOString(),
      action,
      details,
    };

    const updatedLogs = [newLog, ...existingLogs].slice(0, MAX_LOG_ENTRIES);

    await AsyncStorage.setItem(
      PLAYBACK_DEBUG_LOGS_KEY,
      JSON.stringify(updatedLogs)
    );

    console.log(`📝 [PlaybackLog] ${action}`, details);
  } catch (error) {
    console.error("❌ Erreur sauvegarde log playback:", error);
  }
}

/**
 * Récupérer tous les logs de debug
 */
export async function getPlaybackDebugLogs(): Promise<PlaybackDebugLog[]> {
  try {
    const logsJson = await AsyncStorage.getItem(PLAYBACK_DEBUG_LOGS_KEY);
    return logsJson ? JSON.parse(logsJson) : [];
  } catch (error) {
    console.error("❌ Erreur lecture logs playback:", error);
    return [];
  }
}

/**
 * Effacer tous les logs
 */
export async function clearPlaybackDebugLogs(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PLAYBACK_DEBUG_LOGS_KEY);
  } catch (error) {
    console.error("❌ Erreur effacement logs playback:", error);
  }
}
