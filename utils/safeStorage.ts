/**
 * 🔒 Wrapper sécurisé pour AsyncStorage
 * Protection contre les erreurs de stockage et corruption de données
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { safeJsonParse, safeJsonStringify } from "./safeJson";

/**
 * Interface pour les opérations de stockage sécurisées
 */
export interface SafeStorage {
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

  /**
   * Récupérer un élément avec retry et gestion d'erreur
   */
  async getItem(key: string): Promise<string | null> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await AsyncStorage.getItem(key);
        return result;
      } catch (error) {
        console.warn(
          `⚠️ Tentative ${attempt}/${this.maxRetries} échouée pour getItem(${key}):`,
          error
        );

        if (attempt === this.maxRetries) {
          console.error(`❌ Échec définitif getItem(${key}):`, error);
          return null;
        }

        await this.delay(this.retryDelay * attempt);
      }
    }
    return null;
  }

  /**
   * Sauvegarder un élément avec retry et gestion d'erreur
   */
  async setItem(key: string, value: string): Promise<boolean> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await AsyncStorage.setItem(key, value);
        return true;
      } catch (error) {
        console.warn(
          `⚠️ Tentative ${attempt}/${this.maxRetries} échouée pour setItem(${key}):`,
          error
        );

        if (attempt === this.maxRetries) {
          console.error(`❌ Échec définitif setItem(${key}):`, error);
          return false;
        }

        await this.delay(this.retryDelay * attempt);
      }
    }
    return false;
  }

  /**
   * Supprimer un élément avec retry et gestion d'erreur
   */
  async removeItem(key: string): Promise<boolean> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await AsyncStorage.removeItem(key);
        return true;
      } catch (error) {
        console.warn(
          `⚠️ Tentative ${attempt}/${this.maxRetries} échouée pour removeItem(${key}):`,
          error
        );

        if (attempt === this.maxRetries) {
          console.error(`❌ Échec définitif removeItem(${key}):`, error);
          return false;
        }

        await this.delay(this.retryDelay * attempt);
      }
    }
    return false;
  }

  /**
   * Vider tout le stockage avec retry et gestion d'erreur
   */
  async clear(): Promise<boolean> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await AsyncStorage.clear();
        return true;
      } catch (error) {
        console.warn(
          `⚠️ Tentative ${attempt}/${this.maxRetries} échouée pour clear():`,
          error
        );

        if (attempt === this.maxRetries) {
          console.error(`❌ Échec définitif clear():`, error);
          return false;
        }

        await this.delay(this.retryDelay * attempt);
      }
    }
    return false;
  }

  /**
   * Récupérer toutes les clés avec retry et gestion d'erreur
   */
  async getAllKeys(): Promise<string[]> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await AsyncStorage.getAllKeys();
      } catch (error) {
        console.warn(
          `⚠️ Tentative ${attempt}/${this.maxRetries} échouée pour getAllKeys():`,
          error
        );

        if (attempt === this.maxRetries) {
          console.error(`❌ Échec définitif getAllKeys():`, error);
          return [];
        }

        await this.delay(this.retryDelay * attempt);
      }
    }
    return [];
  }

  /**
   * Récupérer plusieurs éléments avec retry et gestion d'erreur
   */
  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await AsyncStorage.multiGet(keys);
      } catch (error) {
        console.warn(
          `⚠️ Tentative ${attempt}/${this.maxRetries} échouée pour multiGet():`,
          error
        );

        if (attempt === this.maxRetries) {
          console.error(`❌ Échec définitif multiGet():`, error);
          return keys.map((key) => [key, null]);
        }

        await this.delay(this.retryDelay * attempt);
      }
    }
    return keys.map((key) => [key, null]);
  }

  /**
   * Sauvegarder plusieurs éléments avec retry et gestion d'erreur
   */
  async multiSet(keyValuePairs: [string, string][]): Promise<boolean> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await AsyncStorage.multiSet(keyValuePairs);
        return true;
      } catch (error) {
        console.warn(
          `⚠️ Tentative ${attempt}/${this.maxRetries} échouée pour multiSet():`,
          error
        );

        if (attempt === this.maxRetries) {
          console.error(`❌ Échec définitif multiSet():`, error);
          return false;
        }

        await this.delay(this.retryDelay * attempt);
      }
    }
    return false;
  }

  /**
   * Supprimer plusieurs éléments avec retry et gestion d'erreur
   */
  async multiRemove(keys: string[]): Promise<boolean> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await AsyncStorage.multiRemove(keys);
        return true;
      } catch (error) {
        console.warn(
          `⚠️ Tentative ${attempt}/${this.maxRetries} échouée pour multiRemove():`,
          error
        );

        if (attempt === this.maxRetries) {
          console.error(`❌ Échec définitif multiRemove():`, error);
          return false;
        }

        await this.delay(this.retryDelay * attempt);
      }
    }
    return false;
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

    for (const key of allKeys) {
      try {
        const value = await this.getItem(key);
        if (value && typeof value === "string") {
          // Essayer de parser pour vérifier l'intégrité
          JSON.parse(value);
        }
      } catch (error) {
        console.warn(`🧹 Nettoyage données corrompues: ${key}`);
        await this.removeItem(key);
        cleanedKeys.push(key);
      }
    }

    return cleanedKeys;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Instance singleton
export const safeStorage = new SafeStorageWrapper();

// Export direct pour compatibilité
export const getItem = safeStorage.getItem.bind(safeStorage);
export const setItem = safeStorage.setItem.bind(safeStorage);
export const removeItem = safeStorage.removeItem.bind(safeStorage);
export const clear = safeStorage.clear.bind(safeStorage);
export const getAllKeys = safeStorage.getAllKeys.bind(safeStorage);
export const multiGet = safeStorage.multiGet.bind(safeStorage);
export const multiSet = safeStorage.multiSet.bind(safeStorage);
export const multiRemove = safeStorage.multiRemove.bind(safeStorage);
export const getJsonItem = safeStorage.getJsonItem.bind(safeStorage);
export const setJsonItem = safeStorage.setJsonItem.bind(safeStorage);
export const cleanCorruptedData =
  safeStorage.cleanCorruptedData.bind(safeStorage);
