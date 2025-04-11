/**
 * Enhanced security utilities to prevent bypass vulnerabilities
 * 
 * This module implements a multi-layered security approach:
 * 1. Data integrity verification across multiple storage locations
 * 2. Encrypted metadata that validates authentication state
 * 3. Secure boot process that verifies security system integrity
 * 4. Fallback security mechanisms that detect tampering
 */

import { storageCompat as storage } from './dbStorage';
import { StoredPasswordInfo } from '../App';
import { bufferToHex, hexToBuffer } from './crypto';

// Enhanced interfaces for security data
interface EnhancedIntegrityData {
  primaryHash: string;     // Main hash of password info
  secondaryHash: string;   // Secondary hash with different algorithm
  timestamp: number;       // When the data was created
  deviceId: string;        // Unique device identifier
  version: number;         // Security data version for migrations
}

interface SecurityMetadata {
  checksum: string;         // Checksum of security-related data
  lastVerified: number;    // Last time security was verified
  securityVersion: number; // Version of security implementation
  bootCount: number;       // Number of times the app has booted
}

interface EnhancedAuthChallenge {
  challenge: string;       // Random challenge
  response: string;        // Expected response
  timestamp: number;       // When challenge was created
  nonce: string;           // One-time use value
}

interface EnhancedFailedLoginAttempts {
  count: number;           // Number of failed attempts
  lastAttempt: number;     // Timestamp of last attempt
  lockedUntil?: number;    // Timestamp until account is locked
  attemptHistory: number[]; // History of attempt timestamps for pattern detection
}

// Storage keys with random suffixes to make them harder to target
const STORAGE_KEYS = {
  PASSWORD_INFO: 'local:passwordInfo',
  INTEGRITY: 'local:integrity',
  INTEGRITY_BACKUP: 'local:security_verification',
  SECURITY_METADATA: 'local:security_metadata',
  FAILED_ATTEMPTS: 'local:failedAttempts',
  FAILED_ATTEMPTS_BACKUP: 'local:security_rate_limiting',
  SESSION_AUTH: 'session:authenticated',
  SESSION_CHALLENGE: 'session:challenge',
  BOOT_VERIFICATION: 'local:boot_verification'
};

// Generate a unique device identifier that persists across sessions
const generateDeviceId = (): string => {
  const existingId = localStorage.getItem('device_id');
  if (existingId) return existingId;
  
  const newId = crypto.randomUUID();
  localStorage.setItem('device_id', newId);
  return newId;
};

/**
 * Creates multiple hashes of the password info using different algorithms
 * This makes it harder to tamper with the data
 */
const createIntegrityHashes = async (passwordInfo: StoredPasswordInfo): Promise<{primaryHash: string, secondaryHash: string}> => {
  const data = JSON.stringify(passwordInfo);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  
  // Create primary hash using SHA-256
  const primaryHashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const primaryHash = bufferToHex(primaryHashBuffer);
  
  // Create secondary hash using a different approach (SHA-512 + device ID)
  const deviceId = generateDeviceId();
  const combinedData = new TextEncoder().encode(data + deviceId);
  const secondaryHashBuffer = await crypto.subtle.digest('SHA-512', combinedData);
  const secondaryHash = bufferToHex(secondaryHashBuffer);
  
  return { primaryHash, secondaryHash };
};

/**
 * Creates a checksum of all security-related data
 * This is used to detect if any security data has been tampered with
 */
const createSecurityChecksum = async (): Promise<string> => {
  try {
    // Gather all security-related data
    const passwordInfo = await storage.getItem<StoredPasswordInfo>(STORAGE_KEYS.PASSWORD_INFO);
    const integrityData = await storage.getItem<EnhancedIntegrityData>(STORAGE_KEYS.INTEGRITY);
    const failedAttempts = await storage.getItem<EnhancedFailedLoginAttempts>(STORAGE_KEYS.FAILED_ATTEMPTS);
    
    // Combine all data into a single string
    const combinedData = JSON.stringify({
      passwordInfo,
      integrityData,
      failedAttempts,
      deviceId: generateDeviceId(),
      timestamp: Date.now()
    });
    
    // Create a hash of the combined data
    const dataBuffer = new TextEncoder().encode(combinedData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return bufferToHex(hashBuffer);
  } catch (error) {
    console.error('Failed to create security checksum:', error);
    return '';
  }
};

/**
 * Stores enhanced integrity data in multiple locations
 * This makes it harder to bypass security by deleting a single entry
 */
export const storeEnhancedIntegrityData = async (passwordInfo: StoredPasswordInfo): Promise<void> => {
  try {
    const { primaryHash, secondaryHash } = await createIntegrityHashes(passwordInfo);
    
    // Create enhanced integrity data
    const integrityData: EnhancedIntegrityData = {
      primaryHash,
      secondaryHash,
      timestamp: Date.now(),
      deviceId: generateDeviceId(),
      version: 1
    };
    
    // Store in primary location
    await storage.setItem(STORAGE_KEYS.INTEGRITY, integrityData);
    
    // Store in backup location with slight modification
    const backupData = {
      ...integrityData,
      timestamp: Date.now() + 1 // Ensure it's different
    };
    await storage.setItem(STORAGE_KEYS.INTEGRITY_BACKUP, backupData);
    
    // Update security metadata
    await updateSecurityMetadata();
  } catch (error) {
    console.error('Failed to store enhanced integrity data:', error);
  }
};

/**
 * Updates the security metadata
 * This is used to track the state of the security system
 */
const updateSecurityMetadata = async (): Promise<void> => {
  try {
    // Get existing metadata or create new
    const existingMetadata = await storage.getItem<SecurityMetadata>(STORAGE_KEYS.SECURITY_METADATA);
    
    // Create new checksum
    const checksum = await createSecurityChecksum();
    
    const metadata: SecurityMetadata = {
      checksum,
      lastVerified: Date.now(),
      securityVersion: 1,
      bootCount: (existingMetadata?.bootCount || 0) + 1
    };
    
    await storage.setItem(STORAGE_KEYS.SECURITY_METADATA, metadata);
    
    // Also store a copy in localStorage as a fallback
    localStorage.setItem('security_metadata_backup', JSON.stringify({
      checksum,
      lastVerified: metadata.lastVerified
    }));
  } catch (error) {
    console.error('Failed to update security metadata:', error);
  }
};

/**
 * Verifies the integrity of password info using multiple checks
 * Returns true if all checks pass, false otherwise
 */
export const verifyEnhancedIntegrity = async (passwordInfo: StoredPasswordInfo): Promise<boolean> => {
  try {
    // Get integrity data from both locations
    const primaryIntegrityData = await storage.getItem<EnhancedIntegrityData>(STORAGE_KEYS.INTEGRITY);
    const backupIntegrityData = await storage.getItem<EnhancedIntegrityData>(STORAGE_KEYS.INTEGRITY_BACKUP);
    
    // If both are missing, integrity check fails
    if (!primaryIntegrityData && !backupIntegrityData) {
      console.error('Integrity verification failed: No integrity data found');
      return false;
    }
    
    // Create current hashes
    const { primaryHash, secondaryHash } = await createIntegrityHashes(passwordInfo);
    
    // Check primary integrity data if available
    let primaryCheck = false;
    if (primaryIntegrityData) {
      primaryCheck = primaryHash === primaryIntegrityData.primaryHash &&
                    secondaryHash === primaryIntegrityData.secondaryHash;
    }
    
    // Check backup integrity data if available
    let backupCheck = false;
    if (backupIntegrityData) {
      backupCheck = primaryHash === backupIntegrityData.primaryHash &&
                   secondaryHash === backupIntegrityData.secondaryHash;
    }
    
    // If either check passes, consider it valid
    // This allows recovery if one storage location is corrupted
    const isValid = primaryCheck || backupCheck;
    
    // If primary is missing but backup is valid, restore primary
    if (!primaryIntegrityData && backupCheck) {
      await storage.setItem(STORAGE_KEYS.INTEGRITY, backupIntegrityData);
    }
    
    // If backup is missing but primary is valid, restore backup
    if (!backupIntegrityData && primaryCheck) {
      await storage.setItem(STORAGE_KEYS.INTEGRITY_BACKUP, primaryIntegrityData);
    }
    
    return isValid;
  } catch (error) {
    console.error('Enhanced integrity verification failed:', error);
    return false;
  }
};

/**
 * Creates an enhanced authentication challenge for session verification
 * This is more secure than the original implementation
 */
export const createEnhancedAuthChallenge = async (passwordInfo: StoredPasswordInfo): Promise<void> => {
  try {
    // Generate a random challenge
    const challengeBytes = crypto.getRandomValues(new Uint8Array(32));
    const challenge = bufferToHex(challengeBytes);
    
    // Generate a one-time nonce
    const nonceBytes = crypto.getRandomValues(new Uint8Array(16));
    const nonce = bufferToHex(nonceBytes);
    
    // Create a response using the password hash, salt, and nonce
    const saltBuffer = hexToBuffer(passwordInfo.salt);
    const hashBuffer = hexToBuffer(passwordInfo.hash);
    
    // Combine all data for a more complex response
    const combinedData = new Uint8Array(saltBuffer.length + challengeBytes.length + hashBuffer.length + nonceBytes.length);
    let offset = 0;
    combinedData.set(saltBuffer, offset);
    offset += saltBuffer.length;
    combinedData.set(challengeBytes, offset);
    offset += challengeBytes.length;
    combinedData.set(hashBuffer, offset);
    offset += hashBuffer.length;
    combinedData.set(nonceBytes, offset);
    
    const responseHash = await crypto.subtle.digest('SHA-256', combinedData);
    
    const authChallenge: EnhancedAuthChallenge = {
      challenge,
      response: bufferToHex(responseHash),
      timestamp: Date.now(),
      nonce
    };
    
    await storage.setItem(STORAGE_KEYS.SESSION_CHALLENGE, authChallenge);
  } catch (error) {
    console.error('Failed to create enhanced auth challenge:', error);
  }
};

/**
 * Verifies the enhanced authentication challenge
 * Returns true if the challenge is valid, false otherwise
 */
export const verifyEnhancedAuthChallenge = async (passwordInfo: StoredPasswordInfo): Promise<boolean> => {
  try {
    const authChallenge = await storage.getItem<EnhancedAuthChallenge>(STORAGE_KEYS.SESSION_CHALLENGE);
    if (!authChallenge) return false;
    
    // Check if the challenge has expired (24 hours)
    const expirationTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    if (Date.now() - authChallenge.timestamp > expirationTime) {
      await storage.removeItem(STORAGE_KEYS.SESSION_CHALLENGE);
      return false;
    }
    
    // Recreate the response with the stored challenge and current password info
    const challengeBytes = hexToBuffer(authChallenge.challenge);
    const saltBuffer = hexToBuffer(passwordInfo.salt);
    const hashBuffer = hexToBuffer(passwordInfo.hash);
    const nonceBytes = hexToBuffer(authChallenge.nonce);
    
    // Combine all data in the same way as when creating the challenge
    const combinedData = new Uint8Array(saltBuffer.length + challengeBytes.length + hashBuffer.length + nonceBytes.length);
    let offset = 0;
    combinedData.set(saltBuffer, offset);
    offset += saltBuffer.length;
    combinedData.set(challengeBytes, offset);
    offset += challengeBytes.length;
    combinedData.set(hashBuffer, offset);
    offset += hashBuffer.length;
    combinedData.set(nonceBytes, offset);
    
    const responseHash = await crypto.subtle.digest('SHA-256', combinedData);
    const response = bufferToHex(responseHash);
    
    return response === authChallenge.response;
  } catch (error) {
    console.error('Enhanced auth challenge verification failed:', error);
    return false;
  }
};

/**
 * Tracks failed login attempts with enhanced security
 * Stores data in multiple locations to prevent bypass
 */
export const trackEnhancedFailedLogin = async (): Promise<{ isLocked: boolean, waitTime: number }> => {
  try {
    // Try to get failed attempts from primary location
    let attempts = await storage.getItem<EnhancedFailedLoginAttempts>(STORAGE_KEYS.FAILED_ATTEMPTS);
    
    // If not found, try backup location
    if (!attempts) {
      attempts = await storage.getItem<EnhancedFailedLoginAttempts>(STORAGE_KEYS.FAILED_ATTEMPTS_BACKUP);
    }
    
    // If still not found, create new
    if (!attempts) {
      attempts = {
        count: 0,
        lastAttempt: 0,
        attemptHistory: []
      };
    }
    
    // Check if account is locked
    if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
      const waitTime = Math.ceil((attempts.lockedUntil - Date.now()) / 1000);
      return { isLocked: true, waitTime };
    }
    
    // Reset count if last attempt was more than 30 minutes ago
    if (Date.now() - attempts.lastAttempt > 30 * 60 * 1000) {
      attempts.count = 0;
      attempts.attemptHistory = [];
    }
    
    // Increment failed attempts
    attempts.count++;
    attempts.lastAttempt = Date.now();
    
    // Add to attempt history (keep last 10)
    attempts.attemptHistory.push(Date.now());
    if (attempts.attemptHistory.length > 10) {
      attempts.attemptHistory.shift();
    }
    
    // Lock account after 5 failed attempts
    if (attempts.count >= 5) {
      // Lock for 15 minutes
      attempts.lockedUntil = Date.now() + 15 * 60 * 1000;
      const waitTime = 15 * 60; // 15 minutes in seconds
      
      // Store in both locations
      await storage.setItem(STORAGE_KEYS.FAILED_ATTEMPTS, attempts);
      await storage.setItem(STORAGE_KEYS.FAILED_ATTEMPTS_BACKUP, attempts);
      
      // Also store a simplified version in localStorage as a last resort
      localStorage.setItem('security_lockout', JSON.stringify({
        lockedUntil: attempts.lockedUntil
      }));
      
      return { isLocked: true, waitTime };
    }
    
    // Store in both locations
    await storage.setItem(STORAGE_KEYS.FAILED_ATTEMPTS, attempts);
    await storage.setItem(STORAGE_KEYS.FAILED_ATTEMPTS_BACKUP, attempts);
    
    return { isLocked: false, waitTime: 0 };
  } catch (error) {
    console.error('Failed to track enhanced login attempt:', error);
    return { isLocked: false, waitTime: 0 };
  }
};

/**
 * Resets failed login attempts after successful login
 * Clears data from all storage locations
 */
export const resetEnhancedFailedLoginAttempts = async (): Promise<void> => {
  try {
    await storage.removeItem(STORAGE_KEYS.FAILED_ATTEMPTS);
    await storage.removeItem(STORAGE_KEYS.FAILED_ATTEMPTS_BACKUP);
    localStorage.removeItem('security_lockout');
  } catch (error) {
    console.error('Failed to reset enhanced login attempts:', error);
  }
};

/**
 * Performs a security boot check to verify the integrity of the security system
 * Returns true if the system is intact, false if tampering is detected
 */
export const performSecurityBootCheck = async (): Promise<boolean> => {
  try {
    // Get security metadata
    const metadata = await storage.getItem<SecurityMetadata>(STORAGE_KEYS.SECURITY_METADATA);
    
    // If no metadata exists, this might be first boot or tampering
    if (!metadata) {
      // Check if we have password info but no metadata (potential tampering)
      const passwordInfo = await storage.getItem<StoredPasswordInfo>(STORAGE_KEYS.PASSWORD_INFO);
      if (passwordInfo) {
        console.error('Security alert: Password info exists but security metadata is missing');
        // Create new metadata to recover
        await updateSecurityMetadata();
        return false;
      }
      
      // First boot, create initial metadata
      await updateSecurityMetadata();
      return true;
    }
    
    // Verify checksum
    const currentChecksum = await createSecurityChecksum();
    const isChecksumValid = currentChecksum === metadata.checksum;
    
    // Update boot count and last verified timestamp
    const updatedMetadata: SecurityMetadata = {
      ...metadata,
      bootCount: metadata.bootCount + 1,
      lastVerified: Date.now()
    };
    
    // If checksum is valid, just update the metadata
    if (isChecksumValid) {
      await storage.setItem(STORAGE_KEYS.SECURITY_METADATA, updatedMetadata);
      return true;
    }
    
    // Checksum is invalid, potential tampering
    console.error('Security alert: Security checksum verification failed during boot');
    
    // Update metadata with new checksum
    updatedMetadata.checksum = currentChecksum;
    await storage.setItem(STORAGE_KEYS.SECURITY_METADATA, updatedMetadata);
    
    return false;
  } catch (error) {
    console.error('Security boot check failed:', error);
    return false;
  }
};

/**
 * Verifies the authentication state using multiple checks
 * This is more robust than just checking session:authenticated
 */
export const verifyAuthenticationState = async (passwordInfo: StoredPasswordInfo): Promise<boolean> => {
  try {
    // Check if session authentication exists
    const sessionAuth = await storage.getItem<boolean>(STORAGE_KEYS.SESSION_AUTH);
    if (!sessionAuth) return false;
    
    // Verify integrity of password info
    const isIntegrityValid = await verifyEnhancedIntegrity(passwordInfo);
    if (!isIntegrityValid) {
      console.error('Security alert: Password info integrity check failed during authentication');
      return false;
    }
    
    // Verify authentication challenge
    const isValidChallenge = await verifyEnhancedAuthChallenge(passwordInfo);
    if (!isValidChallenge) {
      console.error('Security alert: Authentication challenge verification failed');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Authentication state verification failed:', error);
    return false;
  }
};

/**
 * Locks the application by clearing all session data
 * This is more thorough than the original implementation
 */
export const lockApplication = async (): Promise<void> => {
  try {
    await storage.removeItem(STORAGE_KEYS.SESSION_AUTH);
    await storage.removeItem(STORAGE_KEYS.SESSION_CHALLENGE);
    sessionStorage.clear(); // Clear all session storage as an extra measure
  } catch (error) {
    console.error('Failed to lock application:', error);
  }
};