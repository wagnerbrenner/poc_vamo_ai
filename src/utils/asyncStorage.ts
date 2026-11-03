/**
 * Asynchronous Local Storage conforming to @react-native-async-storage/async-storage
 * Provides offline persistence across sessions with localStorage and memory fallback.
 */

class StorageDriver {
  private memoryFallback: Map<string, string> = new Map();

  async getItem(key: string): Promise<string | null> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return this.memoryFallback.get(key) || null;
    } catch (e) {
      console.warn(`[AsyncStorage] Failed to getItem for key: ${key}`, e);
      return this.memoryFallback.get(key) || null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      this.memoryFallback.set(key, value);
    } catch (e) {
      console.warn(`[AsyncStorage] Failed to setItem for key: ${key}`, e);
      this.memoryFallback.set(key, value);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      this.memoryFallback.delete(key);
    } catch (e) {
      console.warn(`[AsyncStorage] Failed to removeItem for key: ${key}`, e);
      this.memoryFallback.delete(key);
    }
  }

  async mergeItem(key: string, value: string): Promise<void> {
    try {
      const existing = await this.getItem(key);
      if (!existing) {
        await this.setItem(key, value);
        return;
      }
      const existingJson = JSON.parse(existing);
      const incomingJson = JSON.parse(value);
      const merged = { ...existingJson, ...incomingJson };
      await this.setItem(key, JSON.stringify(merged));
    } catch (e) {
      console.warn(`[AsyncStorage] Failed to mergeItem for key: ${key}`, e);
    }
  }

  async clear(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
      this.memoryFallback.clear();
    } catch (e) {
      console.warn(`[AsyncStorage] Failed to clear storage`, e);
      this.memoryFallback.clear();
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return Object.keys(window.localStorage);
      }
      return Array.from(this.memoryFallback.keys());
    } catch {
      return Array.from(this.memoryFallback.keys());
    }
  }

  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    const results: [string, string | null][] = [];
    for (const key of keys) {
      const val = await this.getItem(key);
      results.push([key, val]);
    }
    return results;
  }
}

export const AsyncStorage = new StorageDriver();
export default AsyncStorage;
