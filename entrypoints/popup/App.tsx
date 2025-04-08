import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { storage } from '@wxt-dev/storage'; // Correct import path
import './App.css'; // We'll update styles later
import LoginScreen from './LoginScreen';
import FolderList from './FolderList';   // Import FolderList
import SnippetList from './SnippetList'; // Import SnippetList

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
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);

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

  const handleAddSnippet = useCallback((folderId: string | null, snippetText: string) => {
    if (!folderId) {
        alert("Please select a folder first."); return;
    }
    if (!snippetText.trim()) {
        alert("Snippet text cannot be empty."); return;
    }
    let snippetAdded = false;
    const updatedFolders = folders.map(folder => {
      if (folder.id === folderId) {
        const newSnippet: TextSnippet = { id: Date.now().toString(), text: snippetText.trim() };
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
    } else {
        console.error(`Folder with ID ${folderId} not found.`);
    }
  }, [folders]);

  // Copy handler with feedback
  const handleCopySnippetWithFeedback = useCallback((snippet: TextSnippet) => {
      navigator.clipboard.writeText(snippet.text)
        .then(() => {
          console.log("Text copied to clipboard");
          setCopiedSnippetId(snippet.id);
          setTimeout(() => setCopiedSnippetId(null), 1500);
        })
        .catch(err => {
          console.error("Failed to copy text:", err);
          alert("Could not copy text to clipboard.");
        });
    }, []);

  // --- Rendering Logic ---
  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (passwordInfo && !isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} authError={authError} />;
  }

  return (
    <div className="app-container">
      <h1>My Text Snippets</h1>
      {authError && <p className="error-message">{authError}</p>}

      <div className="layout-container">
        <div className="sidebar">
            <FolderList
                folders={folders}
                selectedFolderId={selectedFolderId}
                onSelectFolder={setSelectedFolderId}
            />
            <div className="add-folder-form">
                <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="New folder name"
                />
                <button onClick={() => handleAddFolder(newFolderName)} disabled={!newFolderName.trim()}>
                    Add Folder
                </button>
            </div>
        </div>

        <div className="main-content">
            {selectedFolder ? (
                <>
                    <SnippetList
                        snippets={selectedFolder.snippets}
                        onCopySnippet={handleCopySnippetWithFeedback} // Use feedback handler
                        copiedSnippetId={copiedSnippetId} // Pass copied ID
                    />
                    <div className="add-snippet-form">
                        <input
                            type="text"
                            value={newSnippetText}
                            onChange={(e) => setNewSnippetText(e.target.value)}
                            placeholder="New snippet text"
                        />
                        <button onClick={() => handleAddSnippet(selectedFolderId, newSnippetText)} disabled={!newSnippetText.trim()}>
                            Add Snippet to {selectedFolder.name}
                        </button>
                    </div>
                </>
            ) : (
                <p className="placeholder-text">Select a folder to view snippets.</p>
            )}
        </div>
      </div>

      <div className="settings-area">
        <h2>Settings</h2>
        {!passwordInfo && (
          <div className="set-password-form">
            <input type="password" id="newPasswordInput" placeholder="Set a password" />
            <button onClick={() => {
                const input = document.getElementById('newPasswordInput') as HTMLInputElement;
                handleSetPassword(input.value);
                input.value = ''; // Clear input after attempt
            }}>Set Password</button>
          </div>
        )}
         {passwordInfo && (
            <p>Password is set. {/* TODO: Add option to change/remove password */}</p>
         )}
      </div>
    </div>
  );
}

export default App;
