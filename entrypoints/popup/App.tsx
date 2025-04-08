import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { storage } from '@wxt-dev/storage'; // Correct import path
// Removed App.css import, it's handled in main.tsx
import LoginScreen from './LoginScreen';
import FolderList from './FolderList';   // Import FolderList
import SnippetList from './SnippetList'; // Import SnippetList
import Toast from './Toast'; // Import Toast component

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

function App() {
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

  const selectedFolder = useMemo(() => {
    return folders.find(folder => folder.id === selectedFolderId) || null;
  }, [folders, selectedFolderId]);

  // Load data from storage
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      // Use storage.getItem with prefixed keys and specify types
      const storedPasswordInfo = await storage.getItem<StoredPasswordInfo>('local:passwordInfo');
      const storedFolders = await storage.getItem<Folder[]>('local:folders');
      console.log("Loaded data:", { passwordInfo: storedPasswordInfo, folders: storedFolders });

      if (storedPasswordInfo?.hash && storedPasswordInfo?.salt) {
        setPasswordInfo(storedPasswordInfo);
        setIsAuthenticated(false);
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
  const handleLogin = useCallback(async (passwordAttempt: string) => {
    if (!passwordInfo) {
        setAuthError("Password not set or data corrupted.");
        return;
    }
    setAuthError(null);
    try {
        const saltBuffer = hexToBuffer(passwordInfo.salt);
        const isValid = await verifyPassword(passwordAttempt, passwordInfo.hash, saltBuffer);
        setIsAuthenticated(isValid);
        if (!isValid) setAuthError("Incorrect password.");
    } catch (error) {
        console.error("Error verifying password:", error);
        setAuthError("An error occurred during login.");
    }
  }, [passwordInfo]);

  const handleSetPassword = useCallback(async (newPassword: string) => {
    if (!newPassword) {
        alert("Password cannot be empty."); return;
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
        alert("Password set successfully!");
    } catch (error) {
        console.error("Error setting password:", error);
        alert(`Failed to set password: ${error instanceof Error ? error.message : String(error)}`);
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

  // --- Rendering Logic ---
  if (isLoading) {
    // Tailwind classes for loading state
    return <div className="flex justify-center items-center h-full text-lg text-gray-500">Loading...</div>;
  }

  // LoginScreen likely needs its own Tailwind refactoring
  if (passwordInfo && !isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} authError={authError} />;
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
      
      <h1 className="text-xl font-semibold text-center py-3 border-b border-gray-200 text-gray-700">Peti Rahsia</h1>
      {authError && <p className="text-red-600 text-xs mt-2 text-center">{authError}</p>}

      {/* Main layout: Sidebar + Content */}
      <div className="flex flex-grow overflow-hidden border-b border-gray-200">
        {/* Sidebar */}
        <div className="w-[160px] border-r border-gray-200 p-3 flex flex-col overflow-y-auto bg-gray-50">
            {/* FolderList likely needs its own Tailwind refactoring */}
            <FolderList
                folders={folders}
                selectedFolderId={selectedFolderId}
                onSelectFolder={setSelectedFolderId}
            />
            {/* Add Folder Form */}
            <div className="mt-auto pt-3 border-t border-gray-200"> {/* Pushes form to bottom */}
                <input
                    type="text"
                    className="w-full p-1.5 border border-gray-300 rounded text-xs mb-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="New folder name"
                />
                <button
                    className="w-full py-1.5 px-3 border-none rounded bg-blue-600 text-white cursor-pointer text-xs transition-colors duration-200 ease-in-out hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    onClick={() => handleAddFolder(newFolderName)}
                    disabled={!newFolderName.trim()}
                >
                    Add Folder
                </button>
            </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-grow p-3 overflow-y-auto">
            {selectedFolder ? (
                <div className="flex flex-col h-full">
                    {/* Mode toggle button */}
                    <div className="flex justify-end mb-2">
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
                    
                    {/* SnippetList with mode and handlers */}
                    <SnippetList
                        snippets={selectedFolder.snippets}
                        onCopySnippet={handleCopySnippetWithFeedback} // Use feedback handler
                        copiedSnippetId={copiedSnippetId} // Pass copied ID
                        onDeleteSnippet={handleDeleteSnippet} // Pass delete handler
                        onEditSnippet={handleEditSnippet} // Pass edit handler
                        mode={snippetMode} // Pass current mode
                    />
                     {/* Add Snippet Form */}
                    <div className="mt-auto pt-3 border-t border-gray-200"> {/* Pushes form to bottom */}
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
                            onClick={() => handleAddSnippet(selectedFolderId, newSnippetText, newSnippetTitle)}
                            disabled={!newSnippetText.trim()}
                        >
                            Add Snippet to {selectedFolder.name}
                        </button>
                    </div>
                </div>
            ) : (
                <p className="text-center text-gray-500 mt-6 text-xs">Select a folder to view snippets.</p>
            )}
        </div>
      </div>

      {/* Settings Area */}
      <div className="p-3 bg-gray-100 border-t border-gray-200">
        <h2 className="text-base font-semibold mb-2 text-gray-600">Settings</h2>
        {!passwordInfo && (
          <div className="flex items-center space-x-2">
            <input
                type="password"
                id="newPasswordInput"
                placeholder="Set a password"
                className="flex-grow p-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
                className="py-1.5 px-3 border-none rounded bg-blue-600 text-white cursor-pointer text-xs transition-colors duration-200 ease-in-out hover:bg-blue-700"
                onClick={() => {
                    const input = document.getElementById('newPasswordInput') as HTMLInputElement;
                    if (input) {
                        handleSetPassword(input.value);
                        input.value = ''; // Clear input after attempt
                    }
                }}>Set Password</button>
          </div>
        )}
         {passwordInfo && (
            <p className="text-xs text-gray-600">Password is set. {/* TODO: Add option to change/remove password */}</p>
         )}
      </div>
    </div>
  );
}

export default App;
