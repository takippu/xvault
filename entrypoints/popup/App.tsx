import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { storage } from '@wxt-dev/storage';
import LoginScreen from './LoginScreen';
import FolderList from './FolderList';
import SnippetList from './SnippetList';
import Toast from './Toast';
import Settings from './Settings';
import { FiPlus, FiSearch, FiSettings } from 'react-icons/fi';
import { ThemeProvider } from './contexts/ThemeContext';
import ThemeToggle from './components/ThemeToggle';

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
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as const });
  const [showAddFolder, setShowAddFolder] = useState(false); // State to toggle Add Folder section visibility
  const [showAddSnippet, setShowAddSnippet] = useState(false); // State to toggle Add Snippet section visibility
  const [searchQuery, setSearchQuery] = useState(''); // State for search functionality
  const [showSidebar, setShowSidebar] = useState(true); // State to toggle sidebar visibility
  const [showSettings, setShowSettings] = useState(false); // State to toggle Settings page visibility
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set()); // Track which folders are open

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

  // Load data from storage
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      // Use storage.getItem with prefixed keys and specify types
      const storedPasswordInfo = await storage.getItem<StoredPasswordInfo>('local:passwordInfo');
      const storedFolders = await storage.getItem<Folder[]>('local:folders');
      console.log("Loaded data:", { passwordInfo: storedPasswordInfo, folders: storedFolders });

      // Check if we have a session-based authentication
      const sessionAuth = sessionStorage.getItem('authenticated');
      console.log("Session authentication state:", sessionAuth);

      if (storedPasswordInfo?.hash && storedPasswordInfo?.salt) {
        setPasswordInfo(storedPasswordInfo);
        // If we have session authentication, skip password prompt
        // Using loose equality (==) instead of strict equality (===) to handle potential type coercion
        // or simply check if the value exists and is truthy
        if (sessionAuth) {
          console.log("Using session authentication");
          setIsAuthenticated(true);
        } else {
          console.log("No session authentication found, requiring password");
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
  }, []);

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
        const saltBuffer = hexToBuffer(passwordInfo.salt);
        const isValid = await verifyPassword(passwordAttempt, passwordInfo.hash, saltBuffer);
        setIsAuthenticated(isValid);
        
        if (isValid) {
          // Always clear previous session authentication first
          sessionStorage.removeItem('authenticated');
          
          if (rememberMe) {
            // Store authentication state in session storage if remember me is checked
            console.log("Setting session authentication to true");
            sessionStorage.setItem('authenticated', 'true');
          } else {
            console.log("Remember me not checked, no session persistence");
          }
        }
        
        if (!isValid) setAuthError("Incorrect password.");
    } catch (error) {
        console.error("Error verifying password:", error);
        setAuthError("An error occurred during login.");
    }
  }, [passwordInfo]);

  const handleSetPassword = useCallback(async (newPassword: string) => {
    if (!newPassword) {
        setAuthError("Password cannot be empty.");
        return;
    }
    setAuthError(null);
    try {
        const salt = generateSalt();
        const hash = await hashPassword(newPassword, salt);
        const newPasswordInfo: StoredPasswordInfo = { hash, salt: bufferToHex(salt) };
        // Use storage.setItem with prefixed key
        await storage.setItem('local:passwordInfo', newPasswordInfo);
        setPasswordInfo(newPasswordInfo);
        setIsAuthenticated(true); // Assume authenticated after setting
        console.log("Password info saved:", newPasswordInfo);
        setToast({
          visible: true,
          message: 'Password set successfully!',
          type: 'success'
        });
    } catch (error) {
        console.error("Error setting password:", error);
        setAuthError(`Failed to set password: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, []);

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
  }, [folders]);

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
  }, [folders]);

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
  }, [folders, selectedFolderId]);

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
  }, [folders, selectedFolderId]);

  // Handle changing password (verify current + set new)
  const handleChangePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!passwordInfo) {
      setAuthError("No password is currently set.");
      return;
    }
    
    setAuthError(null);
    try {
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
      setPasswordInfo(newPasswordInfo);
      
      setToast({
        visible: true,
        message: 'Password changed successfully!',
        type: 'success'
      });
    } catch (error) {
      console.error("Error changing password:", error);
      setAuthError(`Failed to change password: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [passwordInfo]);
  
  // Handle removing password protection
  const handleRemovePassword = useCallback(async (currentPassword: string) => {
    if (!passwordInfo) {
      setAuthError("No password is currently set.");
      return;
    }
    
    setAuthError(null);
    try {
      // Verify current password
      const saltBuffer = hexToBuffer(passwordInfo.salt);
      const isValid = await verifyPassword(currentPassword, passwordInfo.hash, saltBuffer);
      
      if (!isValid) {
        setAuthError("Current password is incorrect.");
        return;
      }
      
      // Remove password info from storage
      await storage.removeItem('local:passwordInfo');
      setPasswordInfo(null);
      setIsAuthenticated(true); // No password means authenticated
      
      // Clear session storage authentication
      console.log("Clearing session authentication on password removal");
      sessionStorage.removeItem('authenticated');
      
      setToast({
        visible: true,
        message: 'Password protection removed successfully!',
        type: 'success'
      });
    } catch (error) {
      console.error("Error removing password:", error);
      setAuthError(`Failed to remove password: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [passwordInfo]);

  // Handle importing data
  const handleImportData = useCallback(async (data: { folders: Folder[], passwordInfo?: StoredPasswordInfo }) => {
    try {
      // Update folders
      setFolders(data.folders);
      await storage.setItem('local:folders', data.folders);
      
      // Update password info if provided
      if (data.passwordInfo) {
        setPasswordInfo(data.passwordInfo);
        await storage.setItem('local:passwordInfo', data.passwordInfo);
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error("Error importing data:", error);
      return Promise.reject(error);
    }
  }, []);

  // --- Rendering Logic ---
  if (isLoading) {
    // Tailwind classes for loading state
    return <div className="flex justify-center items-center h-full text-lg text-gray-500">Loading...</div>;
  }

  // LoginScreen likely needs its own Tailwind refactoring
  if (passwordInfo && !isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} authError={authError} />;
  }
  
  // Show Settings page if it's active
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

  // Apply Tailwind classes to the main App structure
  return (
    <div className="flex flex-col h-full w-full bg-white text-gray-800 text-sm">
      {/* Toast notification */}
      <Toast 
        message={toast.message}
        isVisible={toast.visible}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, visible: false }))}
      />
      
      <div className="flex items-center justify-between py-3 border-b border-gray-200 px-3">
        <h1 className="text-xl font-semibold text-gray-700">Peti Rahsia</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            title="Settings"
          >
            <FiSettings size={18} className="text-gray-600" />
          </button>
        </div>
      </div>
      {authError && <p className="text-red-600 text-xs mt-2 text-center">{authError}</p>}

      {/* Main layout: Sidebar + Content */}
      <div className="flex flex-grow overflow-hidden border-b border-gray-200 relative">
        {/* Sidebar toggle button when sidebar is hidden */}
        {!showSidebar && (
          <button 
            className="absolute top-2 left-0 z-10 p-1 bg-gray-200 text-gray-700 rounded-r-md hover:bg-gray-300 transition-all duration-200"
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
          className={`border-r border-gray-200 p-3 flex flex-col overflow-y-auto bg-gray-50 transition-all duration-300 ease-in-out relative ${showSidebar ? 'w-[160px]' : 'w-0 p-0 overflow-hidden'}`}
        >
            {/* Sidebar Toggle Button - Positioned at the right edge of sidebar */}
            {showSidebar && (
              <button 
                className="absolute top-2 right-0 z-10 p-1 bg-gray-200 text-gray-700 rounded-l-md hover:bg-gray-300 transition-all duration-200"
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
            />
            
            {/* Add Folder Toggle Button - Only shown when sidebar is visible */}
            {showSidebar && (
              <div className="mt-auto pt-3 border-t border-gray-200"> {/* Pushes form to bottom */}
                  <button
                      className="w-full py-1.5 px-3 mb-1.5 border-none rounded bg-blue-600 text-white cursor-pointer text-xs transition-colors duration-200 ease-in-out hover:bg-blue-700 flex items-center justify-center"
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
                              className="w-full p-1.5 border border-gray-300 rounded text-xs mb-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              value={newFolderName}
                              onChange={(e) => setNewFolderName(e.target.value)}
                              placeholder="New folder name"
                          />
                          <button
                              className="w-full py-1.5 px-3 border-none rounded bg-blue-600 text-white cursor-pointer text-xs transition-colors duration-200 ease-in-out hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
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
                    <div className="flex justify-between items-center mb-2">                        
                        {/* Search input */}
                        <div className="relative flex-grow mr-2">
                            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                <FiSearch className="text-gray-400" size={14} />
                            </div>
                            <input
                                type="text"
                                className="w-full py-1 pl-8 pr-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Search snippets..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        
                        {/* Mode toggle button */}
                        <button
                            className={`py-1 px-2 text-xs rounded transition-colors duration-200 ease-in-out ${
                                snippetMode === 'copy' 
                                    ? 'bg-blue-600 text-white' 
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
                        >
                            Mode: {snippetMode.charAt(0).toUpperCase() + snippetMode.slice(1)}
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
                    <div className="mt-auto pt-3 border-t border-gray-200"> {/* Pushes form to bottom */}
                        <button
                            className="w-full py-1.5 px-3 mb-1.5 border-none rounded bg-green-600 text-white cursor-pointer text-xs transition-colors duration-200 ease-in-out hover:bg-green-700 flex items-center justify-center"
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
                                    className="w-full p-1.5 border border-gray-300 rounded text-xs mb-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    value={newSnippetTitle}
                                    onChange={(e) => setNewSnippetTitle(e.target.value)}
                                    placeholder="Snippet title (optional)"
                                />
                                <textarea
                                    className="w-full p-1.5 border border-gray-300 rounded text-xs mb-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-h-[60px]"
                                    value={newSnippetText}
                                    onChange={(e) => setNewSnippetText(e.target.value)}
                                    placeholder="Snippet text (required)"
                                />
                                <button
                                    className="w-full py-1.5 px-3 border-none rounded bg-green-600 text-white cursor-pointer text-xs transition-colors duration-200 ease-in-out hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
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
                <p className="text-center text-gray-500 mt-6 text-xs">Select a folder to view snippets.</p>
            )}
        </div>
      </div>

      {/* Removed Settings Area - Now in separate Settings component */}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
