/**
 * IndexedDB storage utility for the extension
 * Provides a similar API to the @wxt-dev/storage package but uses IndexedDB for storage
 * This allows for larger storage capacity compared to localStorage (which is limited to ~5MB)
 */

import { StoredPasswordInfo, Folder, TextSnippet } from '../App';

// Database configuration
const DB_NAME = 'petirahsia_db';
const DB_VERSION = 1;
const STORES = {
  settings: 'settings',
  folders: 'folders',
  security: 'security',
  session: 'session'
};

// Type definitions for stored data
type StorageKey = string;
type StorageValue = any;

// Interface for storage operations
export interface IDBStorage {
  getItem<T>(key: StorageKey): Promise<T | null>;
  setItem<T>(key: StorageKey, value: T): Promise<void>;
  removeItem(key: StorageKey): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Opens a connection to the IndexedDB database
 */
const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    // Handle database upgrade (first time or version change)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.settings)) {
        db.createObjectStore(STORES.settings);
      }
      
      if (!db.objectStoreNames.contains(STORES.folders)) {
        db.createObjectStore(STORES.folders);
      }
      
      if (!db.objectStoreNames.contains(STORES.security)) {
        db.createObjectStore(STORES.security);
      }
      
      if (!db.objectStoreNames.contains(STORES.session)) {
        db.createObjectStore(STORES.session);
      }
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };
    
    request.onerror = (event) => {
      console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

/**
 * Determines which object store to use based on the key prefix
 */
const getStoreNameFromKey = (key: StorageKey): string => {
  if (key.startsWith('local:passwordInfo') || key.startsWith('local:integrity')) {
    return STORES.security;
  } else if (key.startsWith('local:folders')) {
    return STORES.folders;
  } else if (key.startsWith('session:')) {
    return STORES.session;
  } else {
    return STORES.settings;
  }
};

/**
 * Extracts the actual key name without the prefix
 */
const getActualKey = (key: StorageKey): string => {
  const parts = key.split(':');
  return parts.length > 1 ? parts.slice(1).join(':') : key;
};

/**
 * IndexedDB implementation of the storage interface
 */
class IndexedDBStorage implements IDBStorage {
  /**
   * Get an item from storage
   */
  async getItem<T>(key: StorageKey): Promise<T | null> {
    try {
      const db = await openDatabase();
      const storeName = getStoreNameFromKey(key);
      const actualKey = getActualKey(key);
      
      return new Promise<T | null>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(actualKey);
        
        request.onsuccess = () => {
          resolve(request.result || null);
          db.close();
        };
        
        request.onerror = () => {
          console.error('Error getting item from IndexedDB:', request.error);
          reject(request.error);
          db.close();
        };
      });
    } catch (error) {
      console.error('Failed to get item from IndexedDB:', error);
      return null;
    }
  }
  
  /**
   * Set an item in storage
   */
  async setItem<T>(key: StorageKey, value: T): Promise<void> {
    try {
      const db = await openDatabase();
      const storeName = getStoreNameFromKey(key);
      const actualKey = getActualKey(key);
      
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(value, actualKey);
        
        request.onsuccess = () => {
          resolve();
          db.close();
        };
        
        request.onerror = () => {
          console.error('Error setting item in IndexedDB:', request.error);
          reject(request.error);
          db.close();
        };
      });
    } catch (error) {
      console.error('Failed to set item in IndexedDB:', error);
      throw error;
    }
  }
  
  /**
   * Remove an item from storage
   */
  async removeItem(key: StorageKey): Promise<void> {
    try {
      const db = await openDatabase();
      const storeName = getStoreNameFromKey(key);
      const actualKey = getActualKey(key);
      
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(actualKey);
        
        request.onsuccess = () => {
          resolve();
          db.close();
        };
        
        request.onerror = () => {
          console.error('Error removing item from IndexedDB:', request.error);
          reject(request.error);
          db.close();
        };
      });
    } catch (error) {
      console.error('Failed to remove item from IndexedDB:', error);
      throw error;
    }
  }
  
  /**
   * Clear all items from storage
   */
  async clear(): Promise<void> {
    try {
      const db = await openDatabase();
      const storeNames = Object.values(STORES);
      
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(storeNames, 'readwrite');
        let completed = 0;
        let hasError = false;
        
        storeNames.forEach(storeName => {
          const store = transaction.objectStore(storeName);
          const request = store.clear();
          
          request.onsuccess = () => {
            completed++;
            if (completed === storeNames.length && !hasError) {
              resolve();
              db.close();
            }
          };
          
          request.onerror = () => {
            if (!hasError) {
              console.error('Error clearing IndexedDB store:', request.error);
              reject(request.error);
              hasError = true;
              db.close();
            }
          };
        });
      });
    } catch (error) {
      console.error('Failed to clear IndexedDB:', error);
      throw error;
    }
  }
  
  /**
   * Migrate data from localStorage to IndexedDB
   */
  async migrateFromLocalStorage(): Promise<void> {
    try {
      // Get all items from localStorage with the 'local:' prefix
      const localStorageItems: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('local:')) {
          const value = localStorage.getItem(key);
          if (value) {
            localStorageItems[key] = value;
          }
        }
      }
      
      // Get all items from sessionStorage with the 'session:' prefix
      const sessionStorageItems: Record<string, string> = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('session:')) {
          const value = sessionStorage.getItem(key);
          if (value) {
            sessionStorageItems[key] = value;
          }
        }
      }
      
      // Migrate items to IndexedDB
      const promises: Promise<void>[] = [];
      
      // Migrate localStorage items
      for (const [key, valueStr] of Object.entries(localStorageItems)) {
        try {
          const value = JSON.parse(valueStr);
          promises.push(this.setItem(key, value));
        } catch (e) {
          // If not JSON, store as string
          promises.push(this.setItem(key, valueStr));
        }
      }
      
      // Migrate sessionStorage items
      for (const [key, valueStr] of Object.entries(sessionStorageItems)) {
        try {
          const value = JSON.parse(valueStr);
          promises.push(this.setItem(key, value));
        } catch (e) {
          // If not JSON, store as string
          promises.push(this.setItem(key, valueStr));
        }
      }
      
      await Promise.all(promises);
      console.log('Migration from localStorage to IndexedDB completed successfully');
    } catch (error) {
      console.error('Failed to migrate data from localStorage to IndexedDB:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
export const dbStorage = new IndexedDBStorage();

// Export a compatibility layer that matches the @wxt-dev/storage API
export const storageCompat = {
  getItem: async <T>(key: string, opts?: any): Promise<T | null> => {
    const value = await dbStorage.getItem<T>(key);
    if (value === null && opts?.fallback !== undefined) {
      return opts.fallback;
    }
    return value;
  },
  
  setItem: async <T>(key: string, value: T): Promise<void> => {
    if (value === null || value === undefined) {
      return dbStorage.removeItem(key);
    }
    return dbStorage.setItem(key, value);
  },
  
  removeItem: async (key: string): Promise<void> => {
    return dbStorage.removeItem(key);
  },
  
  clear: async (): Promise<void> => {
    return dbStorage.clear();
  },
  
  // Add migration function to the compatibility layer
  migrateFromLocalStorage: async (): Promise<void> => {
    return dbStorage.migrateFromLocalStorage();
  }
};