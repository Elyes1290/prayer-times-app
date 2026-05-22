/**
 * 🔒 Wrapper sécurisé pour AsyncStorage
 * Protection contre les erreurs de stockage et corruption de données
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { safeJsonParse, safeJsonStringify } from "./safeJson";

/**
 * Interface pour les opérations de stockage sécurisées
 */
interface SafeStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<boolean>;
  removeItem(key: string): Promise<boolean>;
  clear(): Promise<boolean>;
  getAllKeys(): Promise<string[]>;
  multiGet(keys: string[]): Promise<[string, string | null][]>;
  multiSet(keyValuePairs: [string, string][]): Promise<boolean>;
  multiRemove(keys: string[]): Promise<boolean>;
}

/**
 * Wrapper sécurisé pour AsyncStorage
 */
class SafeStorageWrapper implements SafeStorage {
  private readonly maxRetries = 3;
  private readonly retryDelay = 100; // ms

  /** Retry séquentiel (récursion — évite await dans une boucle for). */
  private async withRetry<T>(
    label: string,
    fn: () => Promise<T>,
    onExhausted: (error: unknown) => T
  ): Promise<T> {
    const attempt = async (n: number, lastError: unknown): Promise<T> => {
      try {
        return await fn();
      } catch (error) {
        console.warn(
          `⚠️ Tentative ${n}/${this.maxRetries} échouée pour ${label}:`,
          error
        );
        if (n >= this.maxRetries) {
          console.error(`❌ Échec définitif ${label}:`, error);
          return onExhausted(error);
        }
        await this.delay(this.retryDelay * n);
        return attempt(n + 1, error);
      }
    };
    return attempt(1, undefined);
  }

  /**
   * Récupérer un élément avec retry et gestion d'erreur
   */
  async getItem(key: string): Promise<string | null> {
    return this.withRetry(
      `getItem(${key})`,
      () => AsyncStorage.getItem(key),
      () => null
    );
  }

  /**
   * Sauvegarder un élément avec retry et gestion d'erreur
   */
  async setItem(key: string, value: string): Promise<boolean> {
    return this.withRetry(
      `setItem(${key})`,
      async () => {
        await AsyncStorage.setItem(key, value);
        return true;
      },
      () => false
    );
  }

  /**
   * Supprimer un élément avec retry et gestion d'erreur
   */
  async removeItem(key: string): Promise<boolean> {
    return this.withRetry(
      `removeItem(${key})`,
      async () => {
        await AsyncStorage.removeItem(key);
        return true;
      },
      () => false
    );
  }

  /**
   * Vider tout le stockage avec retry et gestion d'erreur
   */
  async clear(): Promise<boolean> {
    return this.withRetry(
      "clear()",
      async () => {
        await AsyncStorage.clear();
        return true;
      },
      () => false
    );
  }

  /**
   * Récupérer toutes les clés avec retry et gestion d'erreur
   */
  async getAllKeys(): Promise<string[]> {
    return this.withRetry("getAllKeys()", () => AsyncStorage.getAllKeys(), () => []);
  }

  /**
   * Récupérer plusieurs éléments avec retry et gestion d'erreur
   */
  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    return this.withRetry(
      "multiGet()",
      () => AsyncStorage.multiGet(keys),
      () => keys.map((key) => [key, null] as [string, string | null])
    );
  }

  /**
   * Sauvegarder plusieurs éléments avec retry et gestion d'erreur
   */
  async multiSet(keyValuePairs: [string, string][]): Promise<boolean> {
    return this.withRetry(
      "multiSet()",
      async () => {
        await AsyncStorage.multiSet(keyValuePairs);
        return true;
      },
      () => false
    );
  }

  /**
   * Supprimer plusieurs éléments avec retry et gestion d'erreur
   */
  async multiRemove(keys: string[]): Promise<boolean> {
    return this.withRetry(
      "multiRemove()",
      async () => {
        await AsyncStorage.multiRemove(keys);
        return true;
      },
      () => false
    );
  }

  /**
   * Méthodes utilitaires pour JSON
   */
  async getJsonItem<T>(key: string, fallback: T): Promise<T> {
    const value = await this.getItem(key);
    return safeJsonParse(value, fallback);
  }

  async setJsonItem<T>(key: string, data: T): Promise<boolean> {
    const jsonString = safeJsonStringify(data);
    return this.setItem(key, jsonString);
  }

  /**
   * Nettoyer les données corrompues
   */
  async cleanCorruptedData(): Promise<string[]> {
    const cleanedKeys: string[] = [];
    const allKeys = await this.getAllKeys();

    const readResults = await Promise.allSettled(
      allKeys.map(async (key) => ({ key, value: await this.getItem(key) }))
    );

    const keysToRemove: string[] = [];
    for (const result of readResults) {
      if (result.status === "rejected") continue;
      const { key, value } = result.value;
      try {
        if (value && typeof value === "string") {
          JSON.parse(value);
        }
      } catch {
        console.warn(`🧹 Nettoyage données corrompues: ${key}`);
        keysToRemove.push(key);
        cleanedKeys.push(key);
      }
    }

    await Promise.all(keysToRemove.map((key) => this.removeItem(key)));

    return cleanedKeys;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Instance singleton
export const safeStorage = new SafeStorageWrapper();

// Export direct pour compatibilité
