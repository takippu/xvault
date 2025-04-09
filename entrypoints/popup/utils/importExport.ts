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
    const jsonData = JSON.stringify(data);
    
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
    let jsonData: string;
    
    // Try to parse as JSON first (unencrypted data)
    try {
      // Check if the string is valid JSON
      JSON.parse(importString);
      jsonData = importString;
    } catch (e) {
      // If not valid JSON, assume it's encrypted
      if (!password) {
        throw new Error('Password is required to import encrypted data');
      }
      
      // Try to decrypt the data
      jsonData = await decryptData(importString, password);
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
    throw new Error('Failed to import data');
  }
};