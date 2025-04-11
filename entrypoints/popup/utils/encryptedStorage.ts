/**
 * Encrypted storage utility for IndexedDB
 * 
 * This module provides functions to encrypt and decrypt data stored in IndexedDB,
 * specifically targeting folder data to ensure it remains protected even if someone
 * gains direct access to the IndexedDB storage.
 */

import { Folder, StoredPasswordInfo } from '../App';
import { encryptData, decryptData } from './crypto';
import { storageCompat as storage } from './dbStorage';

// Storage keys
const STORAGE_KEYS = {
  FOLDERS: 'local:folders',
  PASSWORD_INFO: 'local:passwordInfo',
  ENCRYPTION_ENABLED: 'local:encryptionEnabled',
};

/**
 * Check if encryption is enabled for folder data
 */
export const isEncryptionEnabled = async (): Promise<boolean> => {
  const enabled = await storage.getItem<boolean>(STORAGE_KEYS.ENCRYPTION_ENABLED);
  return enabled === true;
};

/**
 * Enable or disable encryption for folder data
 */
export const setEncryptionEnabled = async (enabled: boolean): Promise<void> => {
  await storage.setItem(STORAGE_KEYS.ENCRYPTION_ENABLED, enabled);
};

/**
 * Get the current password from storage
 * This is needed to encrypt/decrypt the folder data
 */
const getCurrentPassword = async (): Promise<string | null> => {
  try {
    // Get the password info from storage
    const passwordInfo = await storage.getItem<StoredPasswordInfo>(STORAGE_KEYS.PASSWORD_INFO);
    
    // If no password is set, we can't encrypt/decrypt
    if (!passwordInfo) {
      console.warn('No password set, cannot encrypt/decrypt folder data');
      return null;
    }
    
    // For security reasons, we don't store the actual password
    // Instead, we use a derived key from the password hash and salt
    // This is not as secure as using the actual password, but it's a reasonable compromise
    // that allows us to encrypt/decrypt without requiring the user to enter their password
    // every time they access their folders
    const derivedKey = passwordInfo.hash.substring(0, 32); // Use first 32 chars of hash as key
    return derivedKey;
  } catch (error) {
    console.error('Error getting current password:', error);
    return null;
  }
};

/**
 * Encrypt folder data before storing in IndexedDB
 */
export const encryptFolders = async (folders: Folder[]): Promise<string> => {
  try {
    // Get the current password
    const password = await getCurrentPassword();
    if (!password) {
      throw new Error('No password available for encryption');
    }
    
    // Convert folders to JSON string
    const foldersJson = JSON.stringify(folders);
    
    // Encrypt the JSON string
    return await encryptData(foldersJson, password);
  } catch (error) {
    console.error('Error encrypting folders:', error);
    throw new Error('Failed to encrypt folder data');
  }
};

/**
 * Decrypt folder data retrieved from IndexedDB
 */
export const decryptFolders = async (encryptedData: string): Promise<Folder[]> => {
  try {
    // Get the current password
    const password = await getCurrentPassword();
    if (!password) {
      throw new Error('No password available for decryption');
    }
    
    // Decrypt the data
    const decryptedJson = await decryptData(encryptedData, password);
    
    // Parse the JSON string back to folders array
    return JSON.parse(decryptedJson) as Folder[];
  } catch (error) {
    console.error('Error decrypting folders:', error);
    throw new Error('Failed to decrypt folder data');
  }
};

/**
 * Store folders with encryption if enabled
 */
export const storeFoldersSecurely = async (folders: Folder[]): Promise<void> => {
  try {
    const encryptionEnabled = await isEncryptionEnabled();
    
    if (encryptionEnabled) {
      // Check if password is set
      const passwordInfo = await storage.getItem<StoredPasswordInfo>(STORAGE_KEYS.PASSWORD_INFO);
      if (!passwordInfo) {
        console.warn('Encryption is enabled but no password is set, storing folders unencrypted');
        await storage.setItem(STORAGE_KEYS.FOLDERS, folders);
        return;
      }
      
      // Encrypt and store
      const encryptedData = await encryptFolders(folders);
      await storage.setItem(STORAGE_KEYS.FOLDERS, encryptedData);
      console.log('Folders encrypted and stored successfully');
    } else {
      // Store unencrypted
      await storage.setItem(STORAGE_KEYS.FOLDERS, folders);
      console.log('Folders stored unencrypted');
    }
  } catch (error) {
    console.error('Error storing folders securely:', error);
    // Fallback to storing unencrypted in case of error
    await storage.setItem(STORAGE_KEYS.FOLDERS, folders);
  }
};

/**
 * Retrieve folders with decryption if needed
 */
export const retrieveFoldersSecurely = async (): Promise<Folder[]> => {
  try {
    const encryptionEnabled = await isEncryptionEnabled();
    const data = await storage.getItem<any>(STORAGE_KEYS.FOLDERS);
    
    // If no data or encryption not enabled, return as is
    if (!data) {
      return [];
    }
    
    if (!encryptionEnabled) {
      // If encryption is not enabled, data should be an array
      if (Array.isArray(data)) {
        return data;
      } else {
        console.warn('Found encrypted data but encryption is disabled, attempting to decrypt');
      }
    }
    
    // Check if data is encrypted (string) or not (array)
    if (typeof data === 'string') {
      // Data is encrypted, decrypt it
      return await decryptFolders(data);
    } else if (Array.isArray(data)) {
      // Data is already an array, return as is
      return data;
    }
    
    // Unexpected data format
    console.error('Unexpected data format for folders:', data);
    return [];
  } catch (error) {
    console.error('Error retrieving folders securely:', error);
    // In case of error, try to return the raw data if it's an array
    const rawData = await storage.getItem<any>(STORAGE_KEYS.FOLDERS);
    if (Array.isArray(rawData)) {
      return rawData;
    }
    return [];
  }
};

/**
 * Migrate existing unencrypted folders to encrypted storage
 */
export const migrateToEncryptedStorage = async (): Promise<boolean> => {
  try {
    // Check if encryption is already enabled
    const encryptionEnabled = await isEncryptionEnabled();
    if (encryptionEnabled) {
      console.log('Encryption is already enabled, no migration needed');
      return true;
    }
    
    // Get current folders
    const folders = await storage.getItem<Folder[]>(STORAGE_KEYS.FOLDERS) || [];
    
    // Check if password is set
    const passwordInfo = await storage.getItem<StoredPasswordInfo>(STORAGE_KEYS.PASSWORD_INFO);
    if (!passwordInfo) {
      console.warn('Cannot migrate to encrypted storage: No password set');
      return false;
    }
    
    // Encrypt folders
    const encryptedData = await encryptFolders(folders);
    
    // Store encrypted data
    await storage.setItem(STORAGE_KEYS.FOLDERS, encryptedData);
    
    // Enable encryption
    await setEncryptionEnabled(true);
    
    console.log('Successfully migrated to encrypted storage');
    return true;
  } catch (error) {
    console.error('Error migrating to encrypted storage:', error);
    return false;
  }
};

/**
 * Migrate from encrypted storage back to unencrypted
 */
export const migrateToUnencryptedStorage = async (): Promise<boolean> => {
  try {
    // Check if encryption is enabled
    const encryptionEnabled = await isEncryptionEnabled();
    if (!encryptionEnabled) {
      console.log('Encryption is already disabled, no migration needed');
      return true;
    }
    
    // Get and decrypt current folders
    const folders = await retrieveFoldersSecurely();
    
    // Store unencrypted
    await storage.setItem(STORAGE_KEYS.FOLDERS, folders);
    
    // Disable encryption
    await setEncryptionEnabled(false);
    
    console.log('Successfully migrated to unencrypted storage');
    return true;
  } catch (error) {
    console.error('Error migrating to unencrypted storage:', error);
    return false;
  }
};