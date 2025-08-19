/**
 * 🔒 Utilitaires sécurisés pour la manipulation JSON
 * Protection contre les erreurs de parsing et corruption de données
 */

/**
 * Parse JSON de manière sécurisée avec fallback
 */
export const safeJsonParse = <T>(
  json: string | null | undefined,
  fallback: T
): T => {
  if (!json || typeof json !== "string") {
    return fallback;
  }

  try {
    const parsed = JSON.parse(json);
    return parsed as T;
  } catch (error) {
    console.warn("⚠️ Erreur parsing JSON, utilisation du fallback:", error);
    return fallback;
  }
};

/**
 * Parse JSON avec validation de type
 */
export const safeJsonParseWithValidation = <T>(
  json: string | null | undefined,
  fallback: T,
  validator: (data: any) => data is T
): T => {
  const parsed = safeJsonParse(json, fallback);

  if (validator(parsed)) {
    return parsed;
  }

  console.warn("⚠️ Données JSON invalides, utilisation du fallback");
  return fallback;
};

/**
 * Stringify JSON de manière sécurisée
 */
export const safeJsonStringify = (
  data: any,
  fallback: string = "{}"
): string => {
  try {
    return JSON.stringify(data);
  } catch (error) {
    console.warn("⚠️ Erreur stringify JSON, utilisation du fallback:", error);
    return fallback;
  }
};

/**
 * Parse JSON depuis AsyncStorage de manière sécurisée
 */
export const safeStorageJsonParse = async <T>(
  storageKey: string,
  fallback: T
): Promise<T> => {
  try {
    const { AsyncStorage } = await import(
      "@react-native-async-storage/async-storage"
    );
    const stored = await AsyncStorage.getItem(storageKey);
    return safeJsonParse(stored, fallback);
  } catch (error) {
    console.warn(`⚠️ Erreur lecture AsyncStorage ${storageKey}:`, error);
    return fallback;
  }
};

/**
 * Sauvegarder JSON dans AsyncStorage de manière sécurisée
 */
export const safeStorageJsonSave = async (
  storageKey: string,
  data: any
): Promise<boolean> => {
  try {
    const { AsyncStorage } = await import(
      "@react-native-async-storage/async-storage"
    );
    const jsonString = safeJsonStringify(data);
    await AsyncStorage.setItem(storageKey, jsonString);
    return true;
  } catch (error) {
    console.warn(`⚠️ Erreur sauvegarde AsyncStorage ${storageKey}:`, error);
    return false;
  }
};

/**
 * Nettoyer les données JSON corrompues
 */
export const cleanCorruptedJson = (json: string): string | null => {
  try {
    // Essayer de parser pour vérifier
    JSON.parse(json);
    return json;
  } catch {
    // Essayer de nettoyer les caractères problématiques
    const cleaned = json
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Supprimer caractères de contrôle
      .replace(/\\+/g, "\\") // Normaliser les backslashes
      .trim();

    try {
      JSON.parse(cleaned);
      return cleaned;
    } catch {
      return null;
    }
  }
};
