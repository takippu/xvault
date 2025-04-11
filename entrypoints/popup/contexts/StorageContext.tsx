/**
 * StorageContext.tsx
 * 
 * This context provides a unified storage interface that can use either IndexedDB or localStorage
 * It handles initialization, migration, and provides storage methods to components
 * Includes support for encrypted folder data storage
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { storage as wxtStorage } from '@wxt-dev/storage';
import { storageCompat, dbStorage } from '../utils/dbStorage';
import { 
  isEncryptionEnabled, 
  setEncryptionEnabled, 
  storeFoldersSecurely, 
  retrieveFoldersSecurely,
  migrateToEncryptedStorage
} from '../utils/encryptedStorage';
import { Folder } from '../App';

// Define the storage interface that components will use
export interface StorageInterface {
  getItem: <T>(key: string, opts?: any) => Promise<T | null>;
  setItem: <T>(key: string, value: T) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
  isUsingIndexedDB: boolean;
  isReady: boolean;
  isEncryptionEnabled: () => Promise<boolean>;
  enableEncryption: (enable: boolean) => Promise<void>;
  migrateToEncryptedStorage: () => Promise<boolean>;
}

// Create the context with a default value
const StorageContext = createContext<StorageInterface>({
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
  clear: async () => {},
  isUsingIndexedDB: false,
  isReady: false,
  isEncryptionEnabled: async () => false,
  enableEncryption: async () => {},
  migrateToEncryptedStorage: async () => false,
});

// Helper functions for default encryption methods
const defaultIsEncryptionEnabled = async (): Promise<boolean> => {
  return isEncryptionEnabled();
};
const defaultEnableEncryption = async (enable: boolean): Promise<void> => {
  return setEncryptionEnabled(enable);
};
const defaultMigrateToEncryptedStorage = async (): Promise<boolean> => {
  return migrateToEncryptedStorage();
};

// Define a default implementation based on wxtStorage that conforms to StorageInterface
const defaultStorageImpl: StorageInterface = {
  // Define methods using standard object method syntax
  async getItem<T>(key: string, opts?: any): Promise<T | null> {
    // Assuming wxtStorage might have stricter key types (e.g., `local:${string}`)
    // Use 'as any' to bypass strict check during assignment, actual call might work or need adjustment
    return wxtStorage.getItem<T>(key as any, opts);
  },
  async setItem<T>(key: string, value: T): Promise<void> {
    return wxtStorage.setItem<T>(key as any, value);
  },
  async removeItem(key: string): Promise<void> {
    return wxtStorage.removeItem(key as any);
  },
  async clear(): Promise<void> {
    // Attempting fix for TS error: Expected 1 arguments, but got 0.
    return wxtStorage.clear({} as any); // Pass empty object, cast as any if type mismatch persists
  },
  isUsingIndexedDB: false,
  isReady: false, // isReady state is managed by the provider component
  // Assign helper functions for encryption methods
  isEncryptionEnabled: defaultIsEncryptionEnabled,
  enableEncryption: defaultEnableEncryption,
  migrateToEncryptedStorage: defaultMigrateToEncryptedStorage,
};


// Storage provider props
interface StorageProviderProps {
  children: ReactNode;
  useIndexedDB?: boolean; // Allow opting out of IndexedDB if needed
}

/**
 * StorageProvider component that initializes storage and provides the storage interface
 */
export const StorageProvider: React.FC<StorageProviderProps> = ({ 
  children, 
  useIndexedDB = true // Default to using IndexedDB
}) => {
  const [isReady, setIsReady] = useState(false);
  // Initialize storageImpl state with the default conforming implementation
  const [storageImpl, setStorageImpl] = useState<StorageInterface>(defaultStorageImpl);
  // isUsingIndexedDB state will be derived from storageImpl after initialization
  const [isUsingIndexedDB, setIsUsingIndexedDB] = useState(defaultStorageImpl.isUsingIndexedDB);


  // Initialize storage on component mount
  useEffect(() => {
    const initStorage = async () => {
      let finalStorageImpl: StorageInterface = defaultStorageImpl; // Start with the default
      let finalIsUsingIndexedDB = false;

      try { // Outer try for overall initialization
        if (useIndexedDB && window.indexedDB) {
          console.log('Attempting to initialize IndexedDB storage...');
          try { // Inner try for IndexedDB specific operations
            await storageCompat.migrateFromLocalStorage();
            // Use storageCompat which should conform to StorageInterface
            finalStorageImpl = {
              ...storageCompat, // Spread the methods from storageCompat
              isUsingIndexedDB: true,
              isReady: true, // Mark this implementation as ready
              // Ensure encryption methods are included if storageCompat doesn't have them
              isEncryptionEnabled: async () => isEncryptionEnabled(),
              enableEncryption: async (enable: boolean) => setEncryptionEnabled(enable),
              migrateToEncryptedStorage: async () => migrateToEncryptedStorage(),
            };
            finalIsUsingIndexedDB = true;
            console.log('Successfully initialized IndexedDB storage');
          } catch (dbError) { // Inner catch for IDB errors
            console.error('Failed to initialize IndexedDB:', dbError);
            console.warn('Falling back to localStorage based storage.');
            // Fallback is handled by keeping the initial defaultStorageImpl
            // No need to explicitly set finalStorageImpl = defaultStorageImpl here as it's the default
          }
        } else { // Handle cases where IDB is not used or not available
          if (useIndexedDB && !window.indexedDB) {
            console.warn('IndexedDB is not supported in this browser. Falling back to localStorage based storage.');
          } else {
            console.log('Using localStorage based storage.');
          }
          // Fallback is handled by keeping the initial defaultStorageImpl
        }
      } catch (error) { // Outer catch for any other unexpected errors during setup
        console.error('Error during storage initialization:', error);
        // Fallback is handled by keeping the initial defaultStorageImpl
        // No need to explicitly set finalStorageImpl = defaultStorageImpl here as it's the default
      } finally {
        // Update state once at the end
        // Ensure the final implementation reflects readiness state correctly
        setStorageImpl({ ...finalStorageImpl, isReady: true });
        setIsUsingIndexedDB(finalIsUsingIndexedDB);
        setIsReady(true); // Mark the provider component as ready
      }
    };

    initStorage();
  }, [useIndexedDB]); // Dependency array is correct

  // The value provided by the context - delegates to the active storageImpl
  const contextValue: StorageInterface = {
    // Delegate methods to the current storageImpl
    getItem: async <T,>(key: string, opts?: any): Promise<T | null> => {
      // Special handling for folder data encryption remains
      if (key === 'local:folders') {
        try {
          // Use the secure retrieval method for folders
          const folders = await retrieveFoldersSecurely();
          return folders as unknown as T;
        } catch (error) {
          console.error('Error retrieving folders securely:', error);
          // Fall back to the current storage implementation
          return storageImpl.getItem<T>(key, opts);
        }
      }
      // Delegate to the current implementation for other keys
      return storageImpl.getItem<T>(key, opts);
    },

    setItem: async <T,>(key: string, value: T): Promise<void> => {
      // Special handling for folder data encryption remains
      if (key === 'local:folders' && Array.isArray(value)) {
        try {
          // Use the secure storage method for folders
          await storeFoldersSecurely(value as unknown as Folder[]);
          return;
        } catch (error) {
          console.error('Error storing folders securely:', error);
          // Fall back to the current storage implementation if secure storage fails
          return storageImpl.setItem<T>(key, value);
        }
      }
      // Delegate to the current implementation for other keys
      return storageImpl.setItem<T>(key, value);
    },

    removeItem: async (key: string): Promise<void> => {
      return storageImpl.removeItem(key);
    },

    clear: async (): Promise<void> => {
      return storageImpl.clear();
    },

    // Pass through state values, sourcing from the active implementation where appropriate
    isUsingIndexedDB: storageImpl.isUsingIndexedDB, // Get from the active storageImpl
    isReady: isReady, // Use the provider's ready state

    // Use the methods defined in the active storageImpl
    isEncryptionEnabled: storageImpl.isEncryptionEnabled,
    enableEncryption: storageImpl.enableEncryption,
    migrateToEncryptedStorage: storageImpl.migrateToEncryptedStorage,
  };

  return (
    <StorageContext.Provider value={contextValue}>
      {children}
    </StorageContext.Provider>
  );
};

/**
 * Custom hook to use the storage context
 */
export const useStorage = (): StorageInterface => {
  const context = useContext(StorageContext);
  if (context === undefined) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
};
