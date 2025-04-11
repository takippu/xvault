import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FiArrowLeft, FiUnlock, FiDownload, FiUpload, FiLock } from 'react-icons/fi';
import { StoredPasswordInfo, Folder } from './App';
import { exportData, importData } from './utils/importExport';
import Toast from './Toast';
import { useStorage } from './contexts/StorageContext';

interface SettingsProps {
  passwordInfo: StoredPasswordInfo | null;
  onSetPassword: (newPassword: string) => Promise<void>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onRemovePassword?: (currentPassword: string) => Promise<void>;
  onBack: () => void;
  authError: string | null;
  folders: Folder[];
  onImportData?: (data: { folders: Folder[], passwordInfo?: StoredPasswordInfo }) => Promise<void>;
}

const Settings: React.FC<SettingsProps> = ({
  passwordInfo,
  onSetPassword,
  onChangePassword,
  onRemovePassword,
  onBack,
  authError,
  folders,
  onImportData
}) => {
  // State for password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  
  // Import/Export states
  const [exportEncrypt, setExportEncrypt] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [importText, setImportText] = useState(''); // Renamed state variable
  const [exportResult, setExportResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Toast state
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>(
    { visible: false, message: '', type: 'success' }
  );
  
  // Encryption settings
  const [isEncryptionEnabled, setIsEncryptionEnabled] = useState(false);
  const [isEncryptionLoading, setIsEncryptionLoading] = useState(false);
  const storage = useStorage();

  // Determine if we're setting a new password or changing existing one
  const isSettingNewPassword = !passwordInfo;

  // Handle form submission for setting/changing password
  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate passwords
    if (!isSettingNewPassword && !currentPassword) {
      setToast({
        visible: true,
        message: 'Current password is required',
        type: 'error'
      });
      return;
    }

    if (!newPassword) {
      setToast({
        visible: true,
        message: 'New password is required',
        type: 'error'
      });
      return;
    }

    if (newPassword.length < 8) {
      setToast({
        visible: true,
        message: 'Password must be at least 8 characters long',
        type: 'error'
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setToast({
        visible: true,
        message: 'New password and confirmation do not match',
        type: 'error'
      });
      return;
    }

    try {
      if (isSettingNewPassword) {
        // Set new password
        await onSetPassword(newPassword);
        // Use toast for success notification
        setToast({
          visible: true,
          message: 'Password set successfully!',
          type: 'success'
        });
      } else {
        // Change existing password
        await onChangePassword(currentPassword, newPassword);
      }

      // Clear form fields after successful operation
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error in password operation:', error);
      // Display error using toast instead of relying on authError prop
      if (authError) {
        setToast({
          visible: true,
          message: authError,
          type: 'error'
        });
      }
    }
  }, [currentPassword, newPassword, confirmPassword, isSettingNewPassword, onSetPassword, onChangePassword]);

  // Handle removing password
  const handleRemovePassword = useCallback(async () => {
    if (!onRemovePassword) return;
    
    setError(null);
    setSuccess(null);
    
    if (!currentPassword) {
      setToast({
        visible: true,
        message: 'Current password is required to remove password protection',
        type: 'error'
      });
      return;
    }
    
    try {
      await onRemovePassword(currentPassword);
      // Use toast for success notification
      setToast({
        visible: true,
        message: 'Password protection removed successfully!',
        type: 'success'
      });
      setCurrentPassword('');
      setShowRemoveConfirm(false);
    } catch (error) {
      console.error('Error removing password:', error);
      // Display error using toast instead of relying on authError prop
      if (authError) {
        setToast({
          visible: true,
          message: authError,
          type: 'error'
        });
      }
    }
  }, [currentPassword, onRemovePassword]);
  
  // Load encryption status on component mount
  useEffect(() => {
    const loadEncryptionStatus = async () => {
      try {
        const enabled = await storage.isEncryptionEnabled();
        setIsEncryptionEnabled(enabled);
      } catch (error) {
        console.error('Error loading encryption status:', error);
      }
    };
    
    loadEncryptionStatus();
  }, [storage]);
  
  // Handle toggling encryption
  const handleToggleEncryption = useCallback(async () => {
    try {
      setIsEncryptionLoading(true);
      
      if (isEncryptionEnabled) {
        // Disable encryption
        await storage.enableEncryption(false);
        setToast({
          visible: true,
          message: 'Folder encryption disabled',
          type: 'success'
        });
      } else {
        // Enable encryption
        if (!passwordInfo) {
          setToast({
            visible: true,
            message: 'You must set a password before enabling encryption',
            type: 'error'
          });
          return;
        }
        
        // Migrate to encrypted storage
        const success = await storage.migrateToEncryptedStorage();
        if (success) {
          setToast({
            visible: true,
            message: 'Folder encryption enabled',
            type: 'success'
          });
        } else {
          setToast({
            visible: true,
            message: 'Failed to enable encryption',
            type: 'error'
          });
          return;
        }
      }
      
      // Update state
      setIsEncryptionEnabled(!isEncryptionEnabled);
    } catch (error) {
      console.error('Error toggling encryption:', error);
      setToast({
        visible: true,
        message: 'Error toggling encryption',
        type: 'error'
      });
    } finally {
      setIsEncryptionLoading(false);
    }
  }, [isEncryptionEnabled, passwordInfo, storage]);

  return (
    <div className="flex flex-col h-full w-full bg-base text-primary text-sm">
      {/* Header with back button */}
      <div className="flex items-center py-3 border-b border-color px-3">
        <button
          onClick={onBack}
          className="mr-2 p-1 rounded-full hover:bg-secondary-base transition-colors duration-200"
          aria-label="Back"
        >
          <FiArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-semibold text-primary flex-grow text-center pr-6">Settings</h1>
      </div>

      {/* Main content */}
      <div className="flex-grow p-4 overflow-y-auto">
        <div className="max-w-md mx-auto">
          <h2 className="text-lg font-medium mb-4 text-primary">
            {isSettingNewPassword ? 'Set Password' : 'Change Password'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current password field - only shown when changing password */}
            {!isSettingNewPassword && (
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-primary mb-1">
                  Current Password
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full p-2 border border-color rounded bg-secondary-base text-primary focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-btn)] focus:border-[var(--color-primary-btn)]"
                />
              </div>
            )}

            {/* New password field */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-primary mb-1">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2 border border-color rounded bg-secondary-base text-primary focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-btn)] focus:border-[var(--color-primary-btn)]"
              />
            </div>

            {/* Confirm password field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-primary mb-1">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2 border border-color rounded bg-secondary-base text-primary focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-btn)] focus:border-[var(--color-primary-btn)]"
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              className="primary w-full py-2 px-4 border-none rounded cursor-pointer transition-colors duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSettingNewPassword ? 'Set Password' : 'Change Password'}
            </button>
          </form>
          
          {/* Remove Password section - only shown when password is set */}
          {!isSettingNewPassword && onRemovePassword && (
            <div className="mt-8 border-t pt-6 border-color">
              <h3 className="text-md font-medium mb-4 flex items-center text-primary">
                <FiUnlock className="mr-2" />
                Remove Password Protection
              </h3>
              
              {!showRemoveConfirm ? (
                <button
                  onClick={() => setShowRemoveConfirm(true)}
                  className="w-full py-2 px-4 border border-red-500 rounded bg-base text-red-500 cursor-pointer transition-colors duration-200 ease-in-out hover:bg-red-100 dark:hover:bg-red-900/50"
                >
                  Remove Password
                </button>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-secondary">
                    Enter your current password to remove password protection. This will allow anyone to access your snippets without authentication.
                  </p>
                  <div>
                    <label htmlFor="removePasswordCurrent" className="block text-sm font-medium text-primary mb-1">
                      Current Password
                    </label>
                    <input
                      id="removePasswordCurrent"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full p-2 border border-color rounded bg-secondary-base text-primary focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-btn)] focus:border-[var(--color-primary-btn)]"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleRemovePassword}
                      className="flex-1 py-2 px-4 border-none rounded bg-red-600 text-white cursor-pointer transition-colors duration-200 ease-in-out hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Confirm Removal
                    </button>
                    <button
                      onClick={() => {
                        setShowRemoveConfirm(false);
                        setCurrentPassword('');
                        setError(null);
                      }}
                      className="secondary flex-1 py-2 px-4 border border-color rounded cursor-pointer transition-colors duration-200 ease-in-out"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Toast component for notifications */}
          <Toast 
            message={toast.message}
            isVisible={toast.visible}
            onClose={() => setToast({ ...toast, visible: false })}
            type={toast.type}
          />
          
          {/* Import/Export Section */}
          <div className="mt-8 border-t pt-6 border-color">
            <h2 className="text-lg font-medium mb-4 text-primary">Import/Export Data</h2>
            
            {/* Export Section */}
            <div className="mb-6">
              <h3 className="text-md font-medium mb-3 flex items-center text-primary">
                <FiDownload className="mr-2" />
                Export Data
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    id="exportEncrypt"
                    type="checkbox"
                    checked={exportEncrypt}
                    onChange={(e) => setExportEncrypt(e.target.checked)}
                    className="mr-2 h-4 w-4 accent-[var(--color-primary-btn)]" // Style checkbox
                  />
                  <label htmlFor="exportEncrypt" className="text-sm text-primary">
                    Encrypt exported data
                  </label>
                </div>
                
                {exportEncrypt && (
                  <div>
                    <label htmlFor="exportPassword" className="block text-sm font-medium text-primary mb-1">
                      Export Password
                    </label>
                    <input
                      id="exportPassword"
                      type="password"
                      value={exportPassword}
                      onChange={(e) => setExportPassword(e.target.value)}
                      className="w-full p-2 border border-color rounded bg-secondary-base text-primary focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-btn)] focus:border-[var(--color-primary-btn)]"
                      placeholder="Enter password for encryption"
                    />
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <button
                    onClick={async () => {
                      try {
                        setError(null);
                        setExportResult(null);
                        
                        if (exportEncrypt && !exportPassword) {
                          setError('Password is required for encrypted export');
                          return;
                        }
                        
                        const dataToExport = {
                          folders,
                          passwordInfo: passwordInfo || undefined
                        };
                        
                        const result = await exportData(dataToExport, exportEncrypt, exportPassword);
                        await navigator.clipboard.writeText(result);
                        setExportResult(result);
                        setToast({
                          visible: true,
                          message: 'Data copied to clipboard successfully!',
                          type: 'success'
                        });
                      } catch (err) {
                        console.error('Export error:', err);
                        setToast({
                          visible: true,
                          message: `Export failed: ${err instanceof Error ? err.message : String(err)}`,
                          type: 'error'
                        });
                      }
                    }}
                    className="primary flex-1 py-2 px-4 border-none rounded cursor-pointer transition-colors duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Copy to Clipboard
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        setError(null);
                        
                        if (exportEncrypt && !exportPassword) {
                          setError('Password is required for encrypted export');
                          return;
                        }
                        
                        const dataToExport = {
                          folders,
                          passwordInfo: passwordInfo || undefined
                        };
                        
                        const result = await exportData(dataToExport, exportEncrypt, exportPassword);
                        
                        // Create blob and download link
                        const blob = new Blob([result], { type: 'text/plain' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `xVault-export${exportEncrypt ? '.txt' : '.json'}`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                        
                        setToast({
                          visible: true,
                          message: 'File downloaded successfully!',
                          type: 'success'
                        });
                      } catch (err) {
                        console.error('Export error:', err);
                        setToast({
                          visible: true,
                          message: `Export failed: ${err instanceof Error ? err.message : String(err)}`,
                          type: 'error'
                        });
                      }
                    }}
                    className="primary flex-1 py-2 px-4 border-none rounded cursor-pointer transition-colors duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save as File
                  </button>
                </div>
                
                {exportResult && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-primary mb-1">
                      Exported Data
                    </label>
                    <textarea
                      readOnly
                      value={exportResult}
                      className="w-full p-2 border border-color rounded bg-secondary-base text-primary focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-btn)] focus:border-[var(--color-primary-btn)] h-32 font-mono text-xs"
                      onClick={(e) => {
                        (e.target as HTMLTextAreaElement).select();
                        navigator.clipboard.writeText(exportResult);
                        setToast({
                          visible: true,
                          message: 'Exported data copied to clipboard!',
                          type: 'success'
                        });
                      }}
                    />
                    <p className="text-xs text-secondary mt-1">Click in the box to copy to clipboard</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Import Section */}
            <div>
              <h3 className="text-md font-medium mb-3 flex items-center text-primary">
                <FiUpload className="mr-2" />
                    Import Data
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label htmlFor="importData" className="block text-sm font-medium text-primary mb-1">
                        Paste exported data
                      </label>
                      <textarea
                        id="importData"
                        value={importText} // Updated state variable reference
                        onChange={(e) => setImportText(e.target.value)} // Updated state setter
                        className="w-full p-2 border border-color rounded bg-secondary-base text-primary focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-btn)] focus:border-[var(--color-primary-btn)] h-32 font-mono text-xs"
                        placeholder="Paste exported data here"
                      />
                </div>
                
                <div>
                  <label htmlFor="importPassword" className="block text-sm font-medium text-primary mb-1">
                    Import Password (only needed for encrypted data)
                  </label>
                  <input
                    id="importPassword"
                    type="password"
                    value={importPassword}
                    onChange={(e) => setImportPassword(e.target.value)}
                    className="w-full p-2 border border-color rounded bg-secondary-base text-primary focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-btn)] focus:border-[var(--color-primary-btn)]"
                    placeholder="Enter password (if data is encrypted)"
                  />
                </div>
                
                <div className="flex flex-col space-y-2">
                  <label className='text-secondary text-xs font-bold'>warning : importing will replace current folders and snippets</label>
                  <button
                    onClick={async () => {
                      try {
                        setError(null);

                        if (!importText.trim()) { // Updated state variable reference
                          setToast({
                            visible: true,
                            message: 'No data to import',
                            type: 'error'
                          });
                          return;
                        }

                        if (onImportData) {
                          // Use the imported function directly (it's no longer shadowed)
                          const parsedData = await importData(importText, importPassword || undefined); // Use imported function and updated state variable

                          await onImportData(parsedData);
                          setToast({
                            visible: true,
                            message: 'Data imported successfully!',
                            type: 'success'
                          });
                          setImportText(''); // Updated state setter
                          setImportPassword('');
                        }
                      } catch (err) {
                        console.error('Import error:', err);
                        setToast({
                          visible: true,
                          message: `Import failed: ${err instanceof Error ? err.message : String(err)}`,
                          type: 'error'
                        });
                      }
                    }}
                    className="primary w-full py-2 px-4 border-none rounded cursor-pointer transition-colors duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Import
                  </button>
                  
                  <div className="text-center">
                    <span className="text-sm text-primary">or</span>
                  </div>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={async (e) => {
                      try {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                          const content = event.target?.result as string;
                          setImportText(content); // Updated state setter
                        };
                        reader.readAsText(file);
                      } catch (err) {
                        console.error('File read error:', err);
                        setToast({
                          visible: true,
                          message: `File read failed: ${err instanceof Error ? err.message : String(err)}`,
                          type: 'error'
                        });
                      }
                    }}
                    className="hidden"
                    accept=".json,text/plain"
                  />
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="secondary w-full py-2 px-4 border border-color rounded cursor-pointer transition-colors duration-200 ease-in-out"
                  >
                    Select File
                  </button>
                </div>
                
                <Toast
                  message={toast.message}
                  isVisible={toast.visible}
                  type={toast.type}
                  onClose={() => setToast(prev => ({ ...prev, visible: false }))}
                />
              </div>
            </div>
          </div>
          
          {/* Encryption Settings Section */}
          <div className="mt-8 border-t pt-6 border-color">
            <h3 className="text-md font-medium mb-4 flex items-center text-primary">
              <FiLock className="mr-2" />
              Folder Encryption
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-primary mb-2">
                When enabled, your folders and snippets will be encrypted in the database.
                This provides additional protection if someone gains access to your browser's storage.
              </p>
              
              {!passwordInfo && (
                <p className="text-sm text-warning mb-2">
                  You must set a password before enabling encryption.
                </p>
              )}
              
              <div className="flex items-center justify-between mt-4">
                <span className="text-primary">Enable folder encryption</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={isEncryptionEnabled}
                    onChange={handleToggleEncryption}
                    disabled={isEncryptionLoading || !passwordInfo}
                  />
                  <div
                    className="w-11 h-6 bg-primary-base peer-focus:outline-none rounded-full peer 
                      peer-checked:bg-[var(--color-switch)] after:content-[''] after:absolute 
                      after:top-[2px] after:left-[2px] after:toggle-switch after:border-gray-300 
                      after:border after:rounded-full after:h-5 after:w-5 after:transition-all 
                      peer-checked:after:translate-x-full peer-checked:after:border-base"
                  >
                  </div>

                </label>
              </div>
              
              {isEncryptionLoading && (
                <p className="text-sm text-secondary mt-2">
                  Processing... This may take a moment.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
