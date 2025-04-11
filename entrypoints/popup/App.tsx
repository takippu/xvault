import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useStorage } from './contexts/StorageContext';
import LoginScreen from './LoginScreen';
import FolderList from './FolderList';
import SnippetList from './SnippetList';
import Toast from './Toast';
import Settings from './Settings';
import { FiPlus, FiSearch, FiSettings, FiCopy, FiEdit, FiTrash2, FiInfo, FiLock } from 'react-icons/fi';
import AdBanner from './components/AdBanner';
import { ThemeProvider } from './contexts/ThemeContext';
import ThemeToggle from './components/ThemeToggle';
import About from './components/About';
import Modal from '../../src/components/Modal';

// --- Crypto Utilities ---

// Function to convert ArrayBuffer or Uint8Array to Hex string
const bufferToHex = (buffer: ArrayBuffer | Uint8Array): string => {
  const uint8Array = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(uint8Array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// Function to convert Hex string to Uint8Array
const hexToBuffer = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
};

// Generate a salt
const generateSalt = (): Uint8Array => {
  return window.crypto.getRandomValues(new Uint8Array(16));
};

// Hash password with salt using PBKDF2
const hashPassword = async (password: string, salt: Uint8Array): Promise<string> => {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw', passwordBuffer, { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey']
  );
  const derivedBits = await window.crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return bufferToHex(derivedBits);
};

// Verify password against stored hash and salt
const verifyPassword = async (password: string, storedHash: string, salt: Uint8Array): Promise<boolean> => {
  const newHash = await hashPassword(password, salt);
  return newHash === storedHash;
};

// --- React Component ---

export interface TextSnippet {
  id: string;
  text: string;
  title?: string; // Optional title for the snippet
}

export interface Folder {
  id: string;
  name: string;
  snippets: TextSnippet[];
}

export interface StoredPasswordInfo {
    hash: string;
    salt: string;
}

const AppContent = () => {
  // Use our custom storage hook instead of direct import
  const storage = useStorage();
  
  const [passwordInfo, setPasswordInfo] = useState<StoredPasswordInfo | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newSnippetText, setNewSnippetText] = useState('');
  const [newSnippetTitle, setNewSnippetTitle] = useState('');
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);
  const [snippetMode, setSnippetMode] = useState<'copy' | 'delete' | 'edit'>('copy');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' }); // Allow 'error' type
  const [showAddFolder, setShowAddFolder] = useState(false); // State to toggle Add Folder section visibility
  const [showAddSnippet, setShowAddSnippet] = useState(false); // State to toggle Add Snippet section visibility
  const [searchQuery, setSearchQuery] = useState(''); // State for search functionality
  const [showSidebar, setShowSidebar] = useState(true); // State to toggle sidebar visibility
  const [showSettings, setShowSettings] = useState(false); // State to toggle Settings page visibility
  const [showAbout, setShowAbout] = useState(false);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [folderIdToEdit, setFolderIdToEdit] = useState<string | null>(null);
  const [folderIdToDelete, setFolderIdToDelete] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');

  const handleEditFolder = useCallback((folderId: string) => {
    setFolderIdToEdit(folderId);
    setEditModalOpen(true);
    const folder = folders.find(f => f.id === folderId);
    setEditFolderName(folder?.name || '');
  }, [folders]);

  const handleDeleteFolder = useCallback((folderId: string) => {
    setFolderIdToDelete(folderId);
    setDeleteModalOpen(true);
  }, []);

  const confirmEditFolder = useCallback(() => {
    if (folderIdToEdit && editFolderName.trim()) {
      const updatedFolders = folders.map(folder => {
        if (folder.id === folderIdToEdit) {
          return { ...folder, name: editFolderName.trim() };
        }
        return folder;
      });
      setFolders(updatedFolders);
      storage.setItem('local:folders', updatedFolders).catch((err: unknown) => {
        console.error("Failed to save folders after editing folder:", err);
        alert(`Failed to save folders: ${err instanceof Error ? err.message : String(err)}`);
      });
    }
    setEditModalOpen(false);
    setFolderIdToEdit(null);
    setEditFolderName('');
  }, [folderIdToEdit, editFolderName, folders, storage]);

  const confirmDeleteFolder = useCallback(() => {
    if (folderIdToDelete) {
      const updatedFolders = folders.filter(folder => folder.id !== folderIdToDelete);
      setFolders(updatedFolders);
      storage.setItem('local:folders', updatedFolders).catch((err: unknown) => {
        console.error("Failed to save folders after deleting folder:", err);
        alert(`Failed to save folders: ${err instanceof Error ? err.message : String(err)}`);
      });
      if (selectedFolderId === folderIdToDelete) {
        setSelectedFolderId(null);
      }
    }
    setDeleteModalOpen(false);
    setFolderIdToDelete(null);
  }, [folderIdToDelete, folders, selectedFolderId, storage]);

  const cancelEditFolder = useCallback(() => {
    setEditModalOpen(false);
    setFolderIdToEdit(null);
    setEditFolderName('');
  }, []);

  const cancelDeleteFolder = useCallback(() => {
    setDeleteModalOpen(false);
    setFolderIdToDelete(null);
  }, []);

  // --- Lock Extension Handler with Enhanced Security ---
  const handleLockExtension = useCallback(() => {
    if (!passwordInfo) {
      console.log("No password set, cannot lock.");
      return;
    }
    console.log("Locking extension with enhanced security: Clearing session authentication and closing popup.");
    
    import('./utils/enhancedSecurity').then(({ lockApplication }) => {
      lockApplication().then(() => {
        setIsAuthenticated(false);
        window.close();
      }).catch(error => {
        console.error("Error locking extension with enhanced security:", error);
      });
    }).catch(error => {
      console.error("Error importing enhanced security utilities:", error);
      
      Promise.all([
        storage.removeItem('session:authenticated'),
        storage.removeItem('session:challenge')
      ]).then(() => {
        setIsAuthenticated(false);
        window.close();
      }).catch(lockError => {
        console.error("Error in fallback lock mechanism:", lockError);
      });
    });
  }, [passwordInfo, storage]);

  const selectedFolder = useMemo(() => {
    return folders.find(folder => folder.id === selectedFolderId) || null;
  }, [folders, selectedFolderId]);
  
  // Filter snippets based on search query
  const filteredSnippets = useMemo(() => {
    if (!selectedFolder || !searchQuery.trim()) {
      return selectedFolder?.snippets || [];
    }
    
    const query = searchQuery.toLowerCase().trim();
    return selectedFolder.snippets.filter(snippet => {
      const titleMatch = snippet.title?.toLowerCase().includes(query) || false;
      const textMatch = snippet.text.toLowerCase().includes(query);
      return titleMatch || textMatch;
    });
  }, [selectedFolder, searchQuery]);

  // Load data from storage with enhanced security
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      // Import enhanced security utilities
      const { 
        performSecurityBootCheck, 
        verifyEnhancedIntegrity, 
        verifyAuthenticationState 
      } = await import('./utils/enhancedSecurity');
      
      // Perform security boot check to verify system integrity
      const isSecuritySystemIntact = await performSecurityBootCheck();
      if (!isSecuritySystemIntact) {
        console.warn("Security system integrity check failed during boot, proceeding with caution");
      }
      
      // Use storage.getItem with prefixed keys and specify types
      const storedPasswordInfo = await storage.getItem<StoredPasswordInfo>('local:passwordInfo');
      const storedFolders = await storage.getItem<Folder[]>('local:folders');
      console.log("Loaded data:", { passwordInfo: !!storedPasswordInfo, folders: !!storedFolders });

      // Check if we have a session-based authentication
      const sessionAuth = await storage.getItem<boolean>('session:authenticated');
      console.log("Session authentication state:", sessionAuth);
      console.log("Using IndexedDB:", storage.isUsingIndexedDB);

      if (storedPasswordInfo?.hash && storedPasswordInfo?.salt) {
        setPasswordInfo(storedPasswordInfo);
        
        // If we have valid session authentication, verify it with enhanced security
        if (sessionAuth === true) {
          try {
            // Verify authentication state with multiple security layers
            const isAuthenticated = await verifyAuthenticationState(storedPasswordInfo);
            
            if (isAuthenticated) {
              console.log("Session authentication verified successfully with enhanced security");
              setIsAuthenticated(true);
            } else {
              console.log("Session authentication failed with enhanced security, requiring password");
              setIsAuthenticated(false);
              // Clear invalid session data
              await storage.removeItem('session:authenticated');
              await storage.removeItem('session:challenge');
            }
          } catch (error) {
            console.error("Error verifying session authentication:", error);
            setIsAuthenticated(false);
          }
        } else {
          console.log("No valid session authentication found, requiring password");
          setIsAuthenticated(false);
        }
      } else {
        setPasswordInfo(null);
        setIsAuthenticated(true);
      }
      setFolders(storedFolders || []);
    } catch (error) {
      console.error("Error loading data from storage:", error);
      setAuthError("Failed to load data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [storage]); // Add storage to dependencies

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Handler Functions ---
  const handleLogin = useCallback(async (passwordAttempt: string, rememberMe: boolean = false) => {
    if (!passwordInfo) {
        setAuthError("Password not set or data corrupted.");
        return;
    }
    setAuthError(null);
    try {
        // Import enhanced security utilities
        const { 
          verifyEnhancedIntegrity, 
          trackEnhancedFailedLogin, 
          resetEnhancedFailedLoginAttempts, 
          createEnhancedAuthChallenge 
        } = await import('./utils/enhancedSecurity');
        
        // Check for rate limiting on failed attempts with enhanced security
        const { isLocked, waitTime } = await trackEnhancedFailedLogin();
        if (isLocked) {
          setAuthError(`Too many failed attempts. Please try again in ${waitTime} seconds.`);
          return;
        }
        
        // Verify integrity of password info with enhanced security
        const isIntegrityValid = await verifyEnhancedIntegrity(passwordInfo);
        if (!isIntegrityValid) {
          console.error("Security alert: Password info integrity check failed with enhanced security");
          setAuthError("Security error: Authentication data may have been tampered with.");
          return;
        }
        
        const saltBuffer = hexToBuffer(passwordInfo.salt);
        const isValid = await verifyPassword(passwordAttempt, passwordInfo.hash, saltBuffer);
        
        if (isValid) {
          // Reset failed login attempts counter with enhanced security
          await resetEnhancedFailedLoginAttempts();
          
          // Always clear previous session authentication first
          await storage.removeItem('session:authenticated');
          await storage.removeItem('session:challenge');
          
          // Create an enhanced cryptographic challenge for session verification
          if (rememberMe) {
            await createEnhancedAuthChallenge(passwordInfo);
            console.log("Setting session authentication with enhanced challenge-response");
            await storage.setItem('session:authenticated', true);
          } else {
            console.log("Remember me not checked, no session persistence");
          }
          
          setIsAuthenticated(true);
        } else {
          setAuthError("Incorrect password.");
          setIsAuthenticated(false);
        }
    } catch (error) {
        console.error("Error verifying password:", error);
        setAuthError("An error occurred during login.");
    }
  }, [passwordInfo, storage]); // Add storage to dependencies

  const handleSetPassword = useCallback(async (newPassword: string) => {
    if (!newPassword) {
        setAuthError("Password cannot be empty.");
        return;
    }
    
    // Enforce minimum password length for better security
    if (newPassword.length < 8) {
        setAuthError("Password must be at least 8 characters long.");
        return;
    }
    
    setAuthError(null);
    try {
        const salt = generateSalt();
        const hash = await hashPassword(newPassword, salt);
        const newPasswordInfo: StoredPasswordInfo = { hash, salt: bufferToHex(salt) };
        
        // Use storage.setItem with prefixed key
        await storage.setItem('local:passwordInfo', newPasswordInfo);
        
        // Import and use enhanced security to create integrity verification
        const { storeEnhancedIntegrityData } = await import('./utils/enhancedSecurity');
        await storeEnhancedIntegrityData(newPasswordInfo);
        
        setPasswordInfo(newPasswordInfo);
        setIsAuthenticated(true); // Assume authenticated after setting
        console.log("Password info saved with enhanced integrity verification");
        setToast({
          visible: true,
          message: 'Password set successfully!',
          type: 'success'
        });
    } catch (error) {
        console.error("Error setting password:", error);
        setAuthError(`Failed to set password: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [storage]); // Add storage to dependencies

  const handleAddFolder = useCallback((folderName: string) => {
    if (!folderName.trim()) {
        alert("Folder name cannot be empty."); return;
    }
    const newFolder: Folder = { id: Date.now().toString(), name: folderName.trim(), snippets: [] };
    const updatedFolders = [...folders, newFolder];
    setFolders(updatedFolders);
    // Use storage.setItem with prefixed key
    storage.setItem('local:folders', updatedFolders).catch((err: unknown) => {
        console.error("Failed to save folders:", err);
        alert(`Failed to save folders: ${err instanceof Error ? err.message : String(err)}`);
        // TODO: Revert state?
    });
    setSelectedFolderId(newFolder.id);
    setNewFolderName('');
  }, [folders, storage]); // Add storage to dependencies

  const handleAddSnippet = useCallback((folderId: string | null, snippetText: string, snippetTitle?: string) => {
    if (!folderId) {
        alert("Please select a folder first."); return;
    }
    if (!snippetText.trim()) {
        alert("Snippet text cannot be empty."); return;
    }
    let snippetAdded = false;
    const updatedFolders = folders.map(folder => {
      if (folder.id === folderId) {
        const newSnippet: TextSnippet = { 
          id: Date.now().toString(), 
          text: snippetText.trim(),
          title: snippetTitle?.trim() || undefined // Only add title if it's not empty
        };
        snippetAdded = true;
        return { ...folder, snippets: [...folder.snippets, newSnippet] };
      }
      return folder;
    });

    if (snippetAdded) {
        setFolders(updatedFolders);
        // Use storage.setItem with prefixed key
        storage.setItem('local:folders', updatedFolders).catch((err: unknown) => {
            console.error("Failed to save folders after adding snippet:", err);
            alert(`Failed to save snippet: ${err instanceof Error ? err.message : String(err)}`);
            // TODO: Revert state?
        });
        setNewSnippetText('');
        setNewSnippetTitle('');
    } else {
        console.error(`Folder with ID ${folderId} not found.`);
    }
  }, [folders, storage]); // Add storage to dependencies

  // Copy handler with feedback
  const handleCopySnippetWithFeedback = useCallback((snippet: TextSnippet) => {
      // If in delete mode, delete the snippet instead of copying
      if (snippetMode === 'delete') {
        handleDeleteSnippet(snippet.id);
        return;
      }
      
      navigator.clipboard.writeText(snippet.text)
        .then(() => {
          console.log("Text copied to clipboard");
          // Show toast notification instead of inline message
          setToast({
            visible: true,
            message: 'Copied to clipboard!',
            type: 'success'
          });
          // Still set copiedSnippetId for visual feedback in the UI
          setCopiedSnippetId(snippet.id);
          setTimeout(() => setCopiedSnippetId(null), 1500);
        })
        .catch(err => {
          console.error("Failed to copy text:", err);
          setToast({
            visible: true,
            message: 'Failed to copy to clipboard',
            type: 'error'
          });
        });
    }, [snippetMode]);
    
  // Delete snippet handler
  const handleDeleteSnippet = useCallback((snippetId: string) => {
    if (!selectedFolderId) return;
    
    const updatedFolders = folders.map(folder => {
      if (folder.id === selectedFolderId) {
        return {
          ...folder,
          snippets: folder.snippets.filter(snippet => snippet.id !== snippetId)
        };
      }
      return folder;
    });
    
    setFolders(updatedFolders);
    // Save to storage
    storage.setItem('local:folders', updatedFolders).catch((err: unknown) => {
      console.error("Failed to save folders after deleting snippet:", err);
      alert(`Failed to delete snippet: ${err instanceof Error ? err.message : String(err)}`);
    });
  }, [folders, selectedFolderId, storage]); // Add storage to dependencies

  // Edit snippet handler
  const handleEditSnippet = useCallback((snippetId: string, updatedText: string, updatedTitle?: string) => {
    if (!selectedFolderId) return;
    
    const updatedFolders = folders.map(folder => {
      if (folder.id === selectedFolderId) {
        return {
          ...folder,
          snippets: folder.snippets.map(snippet => {
            if (snippet.id === snippetId) {
              return {
                ...snippet,
                text: updatedText,
                title: updatedTitle
              };
            }
            return snippet;
          })
        };
      }
      return folder;
    });
    
    setFolders(updatedFolders);
    // Save to storage
    storage.setItem('local:folders', updatedFolders).catch((err: unknown) => {
      console.error("Failed to save folders after editing snippet:", err);
      setToast({
        visible: true,
        message: 'Failed to save changes',
        type: 'error'
      });
    });

    // Show success toast
    setToast({
      visible: true,
      message: 'Snippet updated successfully',
      type: 'success'
    });
  }, [folders, selectedFolderId, storage]); // Add storage to dependencies

  // Handle changing password (verify current + set new) with enhanced security
  const handleChangePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!passwordInfo) {
      setAuthError("No password is currently set.");
      return;
    }
    
    // Enforce minimum password length for better security
    if (newPassword.length < 8) {
      setAuthError("New password must be at least 8 characters long.");
      return;
    }
    
    setAuthError(null);
    try {
      // Import enhanced security utilities
      const { verifyEnhancedIntegrity, storeEnhancedIntegrityData, lockApplication } = await import('./utils/enhancedSecurity');
      
      // Verify integrity of password info with enhanced security
      const isIntegrityValid = await verifyEnhancedIntegrity(passwordInfo);
      if (!isIntegrityValid) {
        console.error("Security alert: Password info integrity check failed during password change");
        setAuthError("Security error: Authentication data may have been tampered with.");
        return;
      }
      
      // Verify current password
      const saltBuffer = hexToBuffer(passwordInfo.salt);
      const isValid = await verifyPassword(currentPassword, passwordInfo.hash, saltBuffer);
      
      if (!isValid) {
        setAuthError("Current password is incorrect.");
        return;
      }
      
      // Set new password
      const salt = generateSalt();
      const hash = await hashPassword(newPassword, salt);
      const newPasswordInfo: StoredPasswordInfo = { hash, salt: bufferToHex(salt) };
      
      // Save to storage
      await storage.setItem('local:passwordInfo', newPasswordInfo);
      
      // Update enhanced integrity verification data
      await storeEnhancedIntegrityData(newPasswordInfo);
      
      // Lock the application with enhanced security
      await lockApplication();
      
      setPasswordInfo(newPasswordInfo);
      
      // Show success message
      setToast({
        visible: true,
        message: 'Password changed successfully!',
        type: 'success'
      });
    } catch (error) {
      console.error("Error changing password:", error);
      setAuthError(`Failed to change password: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [passwordInfo, storage]); // Add storage to dependencies
  
  // Handle removing password protection with enhanced security
  const handleRemovePassword = useCallback(async (currentPassword: string) => {
    if (!passwordInfo) {
      setAuthError("No password is currently set.");
      return;
    }
    
    setAuthError(null);
    try {
      // Import enhanced security utilities
      const { verifyEnhancedIntegrity } = await import('./utils/enhancedSecurity');
      
      // Verify integrity of password info with enhanced security
      const isIntegrityValid = await verifyEnhancedIntegrity(passwordInfo);
      if (!isIntegrityValid) {
        console.error("Security alert: Password info integrity check failed during password removal");
        setAuthError("Security error: Authentication data may have been tampered with.");
        return;
      }
      
      // Verify current password
      const saltBuffer = hexToBuffer(passwordInfo.salt);
      const isValid = await verifyPassword(currentPassword, passwordInfo.hash, saltBuffer);
      
      if (!isValid) {
        setAuthError("Current password is incorrect.");
        return;
      }
      
      // Remove all security-related data from storage with enhanced security
      // Primary locations
      await storage.removeItem('local:passwordInfo');
      await storage.removeItem('local:integrity');
      await storage.removeItem('local:failedAttempts');
      await storage.removeItem('session:authenticated');
      await storage.removeItem('session:challenge');
      
      // Backup locations
      await storage.removeItem('local:security_verification');
      await storage.removeItem('local:security_metadata');
      await storage.removeItem('local:security_rate_limiting');
      await storage.removeItem('local:boot_verification');
      
      // Also clear localStorage backups
      localStorage.removeItem('security_metadata_backup');
      localStorage.removeItem('security_lockout');
      
      setPasswordInfo(null);
      setIsAuthenticated(true); // No password means authenticated
      
      console.log("Cleared all security data on password removal with enhanced security");
      
      // Show success message
      setToast({
        visible: true,
        message: 'Password protection removed successfully!',
        type: 'success'
      });
    } catch (error) {
      console.error("Error removing password:", error);
      setAuthError(`Failed to remove password: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [passwordInfo, storage]); // Add storage to dependencies

  // Handle importing data with enhanced security
  const handleImportData = useCallback(async (data: { folders: Folder[], passwordInfo?: StoredPasswordInfo }) => {
    try {
      // Update folders
      setFolders(data.folders);
      await storage.setItem('local:folders', data.folders);
      
      // Update password info if provided
      if (data.passwordInfo) {
        // Import enhanced security utilities
        const { storeEnhancedIntegrityData, lockApplication } = await import('./utils/enhancedSecurity');
        
        setPasswordInfo(data.passwordInfo);
        await storage.setItem('local:passwordInfo', data.passwordInfo);
        
        // Create new enhanced integrity verification data for the imported password info
        await storeEnhancedIntegrityData(data.passwordInfo);
        
        // Lock the application with enhanced security
        await lockApplication();
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error("Error importing data with enhanced security:", error);
      return Promise.reject(error);
    }
  }, [storage]); // Add storage to dependencies

  // --- Rendering Logic ---
  if (isLoading) {
    // Tailwind classes for loading state
    return <div className="flex justify-center items-center h-full text-lg text-gray-500">Loading...</div>;
  }

  // LoginScreen likely needs its own Tailwind refactoring
  if (passwordInfo && !isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} authError={authError} />;
  }
  
  // Show Settings or About page if they're active
  if (showSettings) {
    return (
      <Settings
        passwordInfo={passwordInfo}
        onSetPassword={handleSetPassword}
        onChangePassword={handleChangePassword}
        onRemovePassword={handleRemovePassword}
        onBack={() => setShowSettings(false)}
        authError={authError}
        folders={folders}
        onImportData={handleImportData}
      />
    );
  }

  if (showAbout) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowAbout(false)}
          className="absolute top-3 right-3 p-2 rounded-full hover:hover-color transition-colors duration-200"
          title="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <About />
      </div>
    );
  }

  // Apply Tailwind classes to the main App structure
  return (
    <div className="flex flex-col h-full w-full bg-base text-primary text-sm overflow-hidden">
      {/* Toast notification */}
      <Toast
        message={toast.message}
        isVisible={toast.visible}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, visible: false }))}
      />

      <div className="flex items-center justify-between py-3 border-b border-color px-3 relative">
        <div className="container" style={{height: '40px'}}>
          <div className="title">
            <h1 style={{fontSize: '1rem'}}>xVault</h1>
          </div>
          {/* <div className="gif-container">
            <img src={oiaGif} alt="oia-oia" className="ghost-gif" />
          </div> */}
        </div>
        <div className="flex items-center gap-2 z-10">
          <ThemeToggle />
          {/* About Button */}
          <button
            onClick={() => setShowAbout(true)}
            className="p-2 rounded-full icon-hover-parent transition-colors duration-200 cursor-pointer"
            title="About"
          >
            <FiInfo size={18} className="text-primary" />
          </button>
          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-full icon-hover-parent transition-colors duration-200 cursor-pointer"
            title="Settings"
          >
            <FiSettings size={18} className="text-primary" />
          </button>
          {/* Lock Button */}
          <button
            onClick={handleLockExtension}
            className={`p-2 rounded-full transition-colors duration-200  ${!passwordInfo ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer icon-hover-parent'}`}
            title={passwordInfo ? "Lock Extension" : "Set a password to enable locking"}
            disabled={!passwordInfo} // Disable if no password is set
          >
            <FiLock size={18} className="text-primary" />
          </button>
        </div>
      </div>
      {authError && <p className="text-red-600 text-xs mt-2 text-center">{authError}</p>}

      {/* Main layout: Sidebar + Content */}
      <div className="flex flex-grow overflow-hidden border-b border-color relative" style={{ minHeight: 0 }}>
        {/* Sidebar toggle button when sidebar is hidden */}
        {!showSidebar && (
          <button
            className="absolute top-2 left-0 z-10 p-1 bg-primary-base text-primary rounded-r-md hover:hover-color transition-all duration-200 cursor-pointer"
            onClick={() => setShowSidebar(true)}
            title="Show folders"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        )}
        
        {/* Sidebar - Conditionally rendered with transition */}
        <div
          className={`border-r border-color p-3 flex flex-col overflow-y-auto bg-secondary-base transition-all duration-300 ease-in-out relative ${showSidebar ? 'w-[160px]' : 'w-0 p-0 overflow-hidden'}`}
        >
            {/* Sidebar Toggle Button - Positioned at the right edge of sidebar */}
            {showSidebar && (
              <button
                className="absolute top-2 right-0 z-10 p-1 bg-secondary text-primary hover:hover-color transition-all duration-200 cursor-pointer"
                onClick={() => setShowSidebar(false)}
                title="Hide folders"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </button>
            )}
            
            {/* FolderList */}
            <FolderList
                folders={folders}
                selectedFolderId={selectedFolderId}
                onSelectFolder={setSelectedFolderId}
                openFolders={openFolders}
                onToggleFolder={(folderId) => {
                  setOpenFolders(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(folderId)) {
                      newSet.delete(folderId);
                    } else {
                      newSet.add(folderId);
                    }
                    return newSet;
                  });
                }}
                snippetMode={snippetMode}
                onEditFolder={handleEditFolder}
                onDeleteFolder={handleDeleteFolder}
            />
            
            {showSidebar && (
              <div className="mt-auto pt-3 border-t border-color"> {/* Pushes form to bottom */}
                  <button
                      className="w-full py-1.5 px-3 mb-1.5 border-none rounded primary text-white cursor-pointer text-xs transition-colors duration-200 ease-in-out hover:hover-color flex items-center justify-center" // Keep specific button colors for now
                      onClick={() => setShowAddFolder(!showAddFolder)}
                  >
                      <FiPlus className="mr-1" size={14} />
                      {showAddFolder ? 'Hide' : 'Add Folder'}
                  </button>
                  
                  {/* Add Folder Form - Conditionally rendered */}
                  {showAddFolder && (
                      <div className="mt-1">
                          <input
                              type="text"
                              className="w-full p-1.5 border border-color rounded text-xs mb-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-base text-primary" // Apply theme to input
                              value={newFolderName}
                              onChange={(e) => setNewFolderName(e.target.value)}
                              placeholder="New folder name"
                          />
                          <button
                              className="w-full py-1.5 px-3 border-none rounded bg-blue-600 text-white cursor-pointer text-xs transition-colors duration-200 ease-in-out hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed" // Keep specific button colors
                              onClick={() => {
                                  handleAddFolder(newFolderName);
                                  setShowAddFolder(false); // Hide form after adding
                              }}
                              disabled={!newFolderName.trim()}
                          >
                              Add Folder
                          </button>
                      </div>
                  )}
              </div>
            )}
        </div>

        {/* Main Content Area */}
        <div className="flex-grow p-3 overflow-y-auto">
            {selectedFolder ? (
                <div className="flex flex-col h-full">
                    {/* Search and Mode toggle buttons */}
                    {/* Removed justify-between, added gap-2. Removed flex-grow and mr-2 from search container */}
                    <div className="flex items-center gap-3 mb-2">
                        {/* Search input - Added flex-1 */}
                        <div className="relative flex-1/2">
                            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                <FiSearch className="text-primary" size={14} />
                            </div>
                            <input
                                type="text"
                                className="w-full py-1 pl-8 pr-2 text-xs border border-color rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-base text-primary" // Apply theme to input
                                placeholder="Search snippets..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Mode toggle button - Added flex-1, flex, justify-center, items-center, gap-1 */}
                        <button
                            className={`flex-1 flex justify-center items-center gap-3 p-1.5 rounded transition-colors duration-200 ease-in-out cursor-pointer ${
                                snippetMode === 'copy' 
                                    ? 'bg-green-600 text-white' 
                                    : snippetMode === 'delete' 
                                        ? 'bg-red-600 text-white' 
                                        : 'bg-yellow-500 text-white'
                            }`}
                            onClick={() => {
                                setSnippetMode(current => {
                                    if (current === 'copy') return 'delete';
                                    if (current === 'delete') return 'edit';
                                    if (current === 'edit') return 'copy';
                                    return 'copy';
                                });
                            }}
                            title={`Mode: ${snippetMode.charAt(0).toUpperCase() + snippetMode.slice(1)}`}
                        >
                            <span>Mode:</span> 
                            {snippetMode === 'copy' && <FiCopy size={14} />}
                            {snippetMode === 'delete' && <FiTrash2 size={14} />}
                            {snippetMode === 'edit' && <FiEdit size={14} />}
                        </button>
                    </div>
                    
                    {/* SnippetList with filtered snippets and handlers */}
                    <SnippetList
                        snippets={filteredSnippets}
                        onCopySnippet={handleCopySnippetWithFeedback} // Use feedback handler
                        copiedSnippetId={copiedSnippetId} // Pass copied ID
                        onDeleteSnippet={handleDeleteSnippet} // Pass delete handler
                        onEditSnippet={handleEditSnippet} // Pass edit handler
                        mode={snippetMode} // Pass current mode
                    />
                     {/* Add Snippet Toggle Button */}
                    <div className="mt-auto pt-3 border-t border-color"> {/* Pushes form to bottom */}
                        <button
                            className="w-full py-1.5 px-3 mb-1.5 border-none rounded secondary text-white cursor-pointer text-xs transition-colors duration-200 ease-in-out hover:bg-green-700 flex items-center justify-center" // Keep specific button colors
                            onClick={() => setShowAddSnippet(!showAddSnippet)}
                        >
                            <FiPlus className="mr-1" size={14} />
                            {showAddSnippet ? 'Hide' : 'Add Snippet'}
                        </button>
                        
                        {/* Add Snippet Form - Conditionally rendered */}
                        {showAddSnippet && (
                            <div className="mt-1">
                                <input
                                    type="text"
                                    className="w-full p-1.5 border border-color rounded text-xs mb-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-base text-primary" // Apply theme to input
                                    value={newSnippetTitle}
                                    onChange={(e) => setNewSnippetTitle(e.target.value)}
                                    placeholder="Snippet title (optional)"
                                />
                                <textarea
                                    className="w-full p-1.5 border border-color rounded text-xs mb-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-h-[60px] bg-base text-primary" // Apply theme to textarea
                                    value={newSnippetText}
                                    onChange={(e) => setNewSnippetText(e.target.value)}
                                    placeholder="Snippet text (required)"
                                />
                                <button
                                    className="w-full py-1.5 px-3 border-none rounded bg-green-600 text-white cursor-pointer text-xs transition-colors duration-200 ease-in-out hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed" // Keep specific button colors
                                    onClick={() => {
                                        handleAddSnippet(selectedFolderId, newSnippetText, newSnippetTitle);
                                        setShowAddSnippet(false); // Hide form after adding
                                    }}
                                    disabled={!newSnippetText.trim()}
                                >
                                    Add Snippet to {selectedFolder.name}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <p className="text-center text-primary mt-6 text-xs">Select a folder to view snippets.</p>
            )}
        </div>
      </div>

      {/* Ad Banner Section */}
      <AdBanner
        onUpgrade={() => {
          setToast({
            visible: true,
            message: 'Upgrade feature coming soon!',
            type: 'success'
          });
        }}
      />

      <Modal
        isOpen={editModalOpen}
        onClose={cancelEditFolder}
        title="Edit Folder Name"
        onConfirm={confirmEditFolder}
        confirmText="Save"
      >
        <input
          type="text"
          className="w-full p-1.5 border border-color rounded text-xs mb-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-base text-primary"
          value={editFolderName}
          onChange={(e) => setEditFolderName(e.target.value)}
          placeholder="New folder name"
        />
      </Modal>

      <Modal
        isOpen={deleteModalOpen}
        onClose={cancelDeleteFolder}
        title="Delete Folder"
        onConfirm={confirmDeleteFolder}
        confirmText="Delete"
      >
        <p className='text-primary'>Are you sure you want to delete this folder and all its snippets?</p>
      </Modal>
    </div>
  );
};

function App() {
  // Function to detect the device's preferred color scheme
  const getInitialTheme = () => {
    const isDarkThemePreferred = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return isDarkThemePreferred ? 'dark' : 'light';
  };

  return (
    <ThemeProvider initialTheme={getInitialTheme()}>
      <AppContent/>
    </ThemeProvider>
  );
}

export default App;
