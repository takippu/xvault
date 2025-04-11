/**
 * Utility functions for importing and exporting data
 */

import { Folder, StoredPasswordInfo } from '../App';
import { encryptData, decryptData } from './crypto';

// Interface for the application data structure
export interface AppData {
  folders: Folder[];
  passwordInfo?: StoredPasswordInfo;
}

/**
 * Export application data with optional encryption
 * @param data The application data to export
 * @param encrypt Whether to encrypt the data
 * @param password The password to use for encryption (required if encrypt is true)
 * @returns A string representation of the exported data
 */
export const exportData = async (
  data: AppData,
  encrypt: boolean,
  password?: string
): Promise<string> => {
  try {
    // Convert data to JSON string
    const jsonData = JSON.stringify({ folders: data.folders });
    
    // If encryption is requested, encrypt the data
    if (encrypt) {
      if (!password) {
        throw new Error('Password is required for encrypted export');
      }
      return await encryptData(jsonData, password);
    }
    
    // Otherwise return the JSON string
    return jsonData;
  } catch (error) {
    console.error('Export error:', error);
    throw new Error('Failed to export data');
  }
};

/**
 * Import application data, handling both encrypted and unencrypted formats
 * @param importString The string to import
 * @param password The password to use for decryption (if the data is encrypted)
 * @returns The imported application data
 */
export const importData = async (
  importString: string,
  password?: string
): Promise<AppData> => {
  try {
    let jsonData: string = '';
    let isEncrypted = false;
    
    // First, check if the data appears to be encrypted (not valid JSON)
    try {
      JSON.parse(importString);
      // If we can parse it as JSON, it might be unencrypted
      isEncrypted = false;
    } catch (e) {
      // If not valid JSON, it's likely encrypted
      isEncrypted = true;
    }
    
    // If the data contains passwordInfo, it should require a password to import
    // even if it's in JSON format (to prevent password protection bypass)
    if (!isEncrypted) {
      try {
        const tempData = JSON.parse(importString);
        if (tempData.passwordInfo) {
          // If the JSON data contains password info, require password verification
          if (!password) {
            throw new Error('Password is required to import password-protected data');
          }
          isEncrypted = true; // Treat it as encrypted to force password verification
        } else {
          // Unencrypted data without password info can be imported directly
          jsonData = importString;
        }
      } catch (e) {
        // If there's an error parsing the JSON again, something is wrong
        throw new Error('Invalid data format');
      }
    }
    
    // Handle encrypted data
    if (isEncrypted) {
      if (!password) {
        throw new Error('Password is required to import encrypted data');
      }
      
      // Try to decrypt the data
      try {
        
        jsonData = await decryptData(importString, password);
      } catch (e) {
        throw new Error('Invalid password or corrupted data');
      }
    }
    
    // Parse the JSON data
    const parsedData = JSON.parse(jsonData) as AppData;
    
    // Validate the imported data structure
    if (!parsedData || !Array.isArray(parsedData.folders)) {
      throw new Error('Invalid data format');
    }
    
    return parsedData;
  } catch (error) {
    console.error('Import error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to import data');
  }
};