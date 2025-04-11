/**
 * Security utilities for preventing password bypass and enhancing authentication security
 */

import { storageCompat as storage } from './dbStorage';
import { StoredPasswordInfo } from '../App';
import { bufferToHex, hexToBuffer } from './crypto';

// Interface for storing integrity verification data
interface IntegrityData {
  hash: string;
  timestamp: number;
  deviceId: string;
}

// Interface for authentication challenge data
interface AuthChallenge {
  challenge: string;
  response: string;
  timestamp: number;
}

// Generate a unique device identifier
const generateDeviceId = (): string => {
  const existingId = localStorage.getItem('device_id');
  if (existingId) return existingId;
  
  const newId = crypto.randomUUID();
  localStorage.setItem('device_id', newId);
  return newId;
};

// Create a hash of the password info to detect tampering
// Create a hash of the password info to detect tampering
const createIntegrityHash = async (passwordInfo: StoredPasswordInfo): Promise<string> => {
  const data = JSON.stringify(passwordInfo);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  
  // Create a SHA-256 hash of the password info
  try {
    const hash = await crypto.subtle.digest('SHA-256', dataBuffer);
    return bufferToHex(hash); // Return the resolved value from the promise
  } catch (err) {
    console.error('Failed to create integrity hash:', err);
    return ''; // Return empty string on error
  }
};


// Store integrity verification data
export const storeIntegrityData = async (passwordInfo: StoredPasswordInfo): Promise<void> => {
  try {
    const hash = await createIntegrityHash(passwordInfo);
    const integrityData: IntegrityData = {
      hash,
      timestamp: Date.now(),
      deviceId: generateDeviceId()
    };
    
    await storage.setItem('local:integrity', integrityData);
  } catch (error) {
    console.error('Failed to store integrity data:', error);
  }
};

// Verify the integrity of password info
export const verifyIntegrity = async (passwordInfo: StoredPasswordInfo): Promise<boolean> => {
  try {
    const integrityData = await storage.getItem<IntegrityData>('local:integrity');
    if (!integrityData) return false;
    
    const currentHash = await createIntegrityHash(passwordInfo);
    return currentHash === integrityData.hash;
  } catch (error) {
    console.error('Integrity verification failed:', error);
    return false;
  }
};

// Create a cryptographic challenge for session verification
export const createAuthChallenge = async (passwordInfo: StoredPasswordInfo): Promise<void> => {
  try {
    // Generate a random challenge string
    const challengeBytes = crypto.getRandomValues(new Uint8Array(32));
    const challenge = bufferToHex(challengeBytes);
    
    // Create a response using the password hash
    const saltBuffer = hexToBuffer(passwordInfo.salt);
    const combinedData = new Uint8Array(saltBuffer.length + challengeBytes.length);
    combinedData.set(saltBuffer);
    combinedData.set(challengeBytes, saltBuffer.length);
    
    const responseHash = await crypto.subtle.digest('SHA-256', combinedData);
    
    const authChallenge: AuthChallenge = {
      challenge,
      response: bufferToHex(responseHash),
      timestamp: Date.now()
    };
    
    await storage.setItem('session:challenge', authChallenge);
  } catch (error) {
    console.error('Failed to create auth challenge:', error);
  }
};

// Verify the authentication challenge
export const verifyAuthChallenge = async (passwordInfo: StoredPasswordInfo): Promise<boolean> => {
  try {
    const authChallenge = await storage.getItem<AuthChallenge>('session:challenge');
    if (!authChallenge) return false;
    
    // Check if the challenge has expired (24 hours)
    const expirationTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    if (Date.now() - authChallenge.timestamp > expirationTime) {
      await storage.removeItem('session:challenge');
      return false;
    }
    
    // Recreate the response with the stored challenge and current password info
    const challengeBytes = hexToBuffer(authChallenge.challenge);
    const saltBuffer = hexToBuffer(passwordInfo.salt);
    
    const combinedData = new Uint8Array(saltBuffer.length + challengeBytes.length);
    combinedData.set(saltBuffer);
    combinedData.set(challengeBytes, saltBuffer.length);
    
    const responseHash = await crypto.subtle.digest('SHA-256', combinedData);
    const response = bufferToHex(responseHash);
    
    return response === authChallenge.response;
  } catch (error) {
    console.error('Auth challenge verification failed:', error);
    return false;
  }
};

// Track failed login attempts
interface FailedLoginAttempts {
  count: number;
  lastAttempt: number;
  lockedUntil?: number;
}

// Rate limiting for failed password attempts
export const trackFailedLogin = async (): Promise<{ isLocked: boolean, waitTime: number }> => {
  try {
    const attempts = await storage.getItem<FailedLoginAttempts>('local:failedAttempts') || {
      count: 0,
      lastAttempt: 0
    };
    
    // Check if account is locked
    if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
      const waitTime = Math.ceil((attempts.lockedUntil - Date.now()) / 1000);
      return { isLocked: true, waitTime };
    }
    
    // Reset count if last attempt was more than 30 minutes ago
    if (Date.now() - attempts.lastAttempt > 30 * 60 * 1000) {
      attempts.count = 0;
    }
    
    // Increment failed attempts
    attempts.count++;
    attempts.lastAttempt = Date.now();
    
    // Lock account after 5 failed attempts
    if (attempts.count >= 5) {
      // Lock for 15 minutes
      attempts.lockedUntil = Date.now() + 15 * 60 * 1000;
      const waitTime = 15 * 60; // 15 minutes in seconds
      await storage.setItem('local:failedAttempts', attempts);
      return { isLocked: true, waitTime };
    }
    
    await storage.setItem('local:failedAttempts', attempts);
    return { isLocked: false, waitTime: 0 };
  } catch (error) {
    console.error('Failed to track login attempt:', error);
    return { isLocked: false, waitTime: 0 };
  }
};

// Reset failed login attempts after successful login
export const resetFailedLoginAttempts = async (): Promise<void> => {
  try {
    await storage.removeItem('local:failedAttempts');
  } catch (error) {
    console.error('Failed to reset login attempts:', error);
  }
};