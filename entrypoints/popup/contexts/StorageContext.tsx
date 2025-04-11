/**
 * StorageContext.tsx
 * 
 * This context provides a unified storage interface that can use either IndexedDB or localStorage
 * It handles initialization, migration, and provides storage methods to components
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { storage as wxtStorage } from '@wxt-dev/storage';
import { storageCompat, dbStorage } from '../utils/dbStorage';

// Define the storage interface that components will use
export interface StorageInterface {
  getItem: <T>(key: string, opts?: any) => Promise<T | null>;
  setItem: <T>(key: string, value: T) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
  isUsingIndexedDB: boolean;
  isReady: boolean;
}

// Create the context with a default value
const StorageContext = createContext<StorageInterface>({
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
  clear: async () => {},
  isUsingIndexedDB: false,
  isReady: false,
});

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
  const [isUsingIndexedDB, setIsUsingIndexedDB] = useState(useIndexedDB);
  const [storageImpl, setStorageImpl] = useState<StorageInterface>(() => {
    // Start with the default implementation
    return {
      ...wxtStorage,
      isUsingIndexedDB: false,
      isReady: false,
    };
  });

  // Initialize storage on component mount
  useEffect(() => {
    const initStorage = async () => {
      try {
        if (useIndexedDB) {
          // Check if IndexedDB is supported
          if (!window.indexedDB) {
            console.warn('IndexedDB is not supported in this browser. Falling back to localStorage.');
            setIsUsingIndexedDB(false);
            setIsReady(true);
            return;
          }

          // Try to initialize IndexedDB
          try {
            // Migrate existing data from localStorage to IndexedDB
            await storageCompat.migrateFromLocalStorage();
            
            // Set the storage implementation to use IndexedDB
            setStorageImpl({
              ...storageCompat,
              isUsingIndexedDB: true,
              isReady: true,
            });
            
            setIsUsingIndexedDB(true);
            console.log('Successfully initialized IndexedDB storage');
          } catch (error) {
            console.error('Failed to initialize IndexedDB:', error);
            console.warn('Falling back to localStorage');
            setIsUsingIndexedDB(false);
          }
        }
        
        setIsReady(true);
      } catch (error) {
        console.error('Error initializing storage:', error);
        setIsReady(true); // Still mark as ready so the app can function
      }
    };

    initStorage();
  }, [useIndexedDB]);

  // The value provided by the context
  const contextValue: StorageInterface = {
    getItem: async <T,>(key: string, opts?: any): Promise<T | null> => {
      if (isUsingIndexedDB) {
        return storageCompat.getItem<T>(key, opts);
      }
      return wxtStorage.getItem<T>(key, opts);
    },
    
    setItem: async <T,>(key: string, value: T): Promise<void> => {
      if (isUsingIndexedDB) {
        return storageCompat.setItem<T>(key, value);
      }
      return wxtStorage.setItem<T>(key, value);
    },
    
    removeItem: async (key: string): Promise<void> => {
      if (isUsingIndexedDB) {
        return storageCompat.removeItem(key);
      }
      return wxtStorage.removeItem(key);
    },
    
    clear: async (): Promise<void> => {
      if (isUsingIndexedDB) {
        return storageCompat.clear();
      }
      return wxtStorage.clear();
    },
    
    isUsingIndexedDB,
    isReady,
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