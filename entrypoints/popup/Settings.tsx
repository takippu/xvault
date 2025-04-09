import React, { useState, useCallback, useRef } from 'react';
import { FiArrowLeft, FiUnlock, FiDownload, FiUpload } from 'react-icons/fi';
import { StoredPasswordInfo, Folder } from './App';
import { exportData, importData } from './utils/importExport';

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
  const [importData, setImportData] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine if we're setting a new password or changing existing one
  const isSettingNewPassword = !passwordInfo;

  // Handle form submission for setting/changing password
  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate passwords
    if (!isSettingNewPassword && !currentPassword) {
      setError('Current password is required');
      return;
    }

    if (!newPassword) {
      setError('New password is required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match');
      return;
    }

    try {
      if (isSettingNewPassword) {
        // Set new password
        await onSetPassword(newPassword);
        setSuccess('Password set successfully!');
      } else {
        // Change existing password
        await onChangePassword(currentPassword, newPassword);
        setSuccess('Password changed successfully!');
      }

      // Clear form fields after successful operation
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error in password operation:', error);
      // Error will be handled by the parent component via authError prop
    }
  }, [currentPassword, newPassword, confirmPassword, isSettingNewPassword, onSetPassword, onChangePassword]);

  // Handle removing password
  const handleRemovePassword = useCallback(async () => {
    if (!onRemovePassword) return;
    
    setError(null);
    setSuccess(null);
    
    if (!currentPassword) {
      setError('Current password is required to remove password protection');
      return;
    }
    
    try {
      await onRemovePassword(currentPassword);
      setSuccess('Password protection removed successfully!');
      setCurrentPassword('');
      setShowRemoveConfirm(false);
    } catch (error) {
      console.error('Error removing password:', error);
      // Error will be handled by the parent component via authError prop
    }
  }, [currentPassword, onRemovePassword]);

  return (
    <div className="flex flex-col h-full w-full bg-white text-gray-800 text-sm">
      {/* Header with back button */}
      <div className="flex items-center py-3 border-b border-gray-200 px-3">
        <button
          onClick={onBack}
          className="mr-2 p-1 rounded-full hover:bg-gray-100 transition-colors duration-200"
          aria-label="Back"
        >
          <FiArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-semibold text-gray-700 flex-grow text-center pr-6">Settings</h1>
      </div>

      {/* Main content */}
      <div className="flex-grow p-4 overflow-y-auto">
        <div className="max-w-md mx-auto">
          <h2 className="text-lg font-medium mb-4">
            {isSettingNewPassword ? 'Set Password' : 'Change Password'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current password field - only shown when changing password */}
            {!isSettingNewPassword && (
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            {/* New password field */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Confirm password field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              className="w-full py-2 px-4 border-none rounded bg-blue-600 text-white cursor-pointer transition-colors duration-200 ease-in-out hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isSettingNewPassword ? 'Set Password' : 'Change Password'}
            </button>
          </form>
          
          {/* Remove Password section - only shown when password is set */}
          {!isSettingNewPassword && onRemovePassword && (
            <div className="mt-8 border-t pt-6 border-gray-200">
              <h3 className="text-md font-medium mb-4 flex items-center">
                <FiUnlock className="mr-2" />
                Remove Password Protection
              </h3>
              
              {!showRemoveConfirm ? (
                <button
                  onClick={() => setShowRemoveConfirm(true)}
                  className="w-full py-2 px-4 border border-red-300 rounded bg-white text-red-600 cursor-pointer transition-colors duration-200 ease-in-out hover:bg-red-50"
                >
                  Remove Password
                </button>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Enter your current password to remove password protection. This will allow anyone to access your snippets without authentication.
                  </p>
                  <div>
                    <label htmlFor="removePasswordCurrent" className="block text-sm font-medium text-gray-700 mb-1">
                      Current Password
                    </label>
                    <input
                      id="removePasswordCurrent"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleRemovePassword}
                      className="flex-1 py-2 px-4 border-none rounded bg-red-600 text-white cursor-pointer transition-colors duration-200 ease-in-out hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Confirm Removal
                    </button>
                    <button
                      onClick={() => {
                        setShowRemoveConfirm(false);
                        setCurrentPassword('');
                        setError(null);
                      }}
                      className="flex-1 py-2 px-4 border border-gray-300 rounded bg-white text-gray-700 cursor-pointer transition-colors duration-200 ease-in-out hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error messages */}
          {(error || authError) && (
            <p className="text-red-600 text-sm mt-3">{error || authError}</p>
          )}

          {/* Success message */}
          {success && (
            <p className="text-green-600 text-sm mt-3">{success}</p>
          )}
          
          {/* Import/Export Section */}
          <div className="mt-8 border-t pt-6 border-gray-200">
            <h2 className="text-lg font-medium mb-4">Import/Export Data</h2>
            
            {/* Export Section */}
            <div className="mb-6">
              <h3 className="text-md font-medium mb-3 flex items-center">
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
                    className="mr-2 h-4 w-4"
                  />
                  <label htmlFor="exportEncrypt" className="text-sm text-gray-700">
                    Encrypt exported data
                  </label>
                </div>
                
                {exportEncrypt && (
                  <div>
                    <label htmlFor="exportPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Export Password
                    </label>
                    <input
                      id="exportPassword"
                      type="password"
                      value={exportPassword}
                      onChange={(e) => setExportPassword(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter password for encryption"
                    />
                  </div>
                )}
                
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
                      setExportResult(result);
                      setSuccess('Data exported successfully!');
                    } catch (err) {
                      console.error('Export error:', err);
                      setError(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
                    }
                  }}
                  className="w-full py-2 px-4 border-none rounded bg-blue-600 text-white cursor-pointer transition-colors duration-200 ease-in-out hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Export
                </button>
                
                {exportResult && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Exported Data
                    </label>
                    <textarea
                      readOnly
                      value={exportResult}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 h-32 font-mono text-xs"
                      onClick={(e) => {
                        (e.target as HTMLTextAreaElement).select();
                        navigator.clipboard.writeText(exportResult);
                        setSuccess('Exported data copied to clipboard!');
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">Click in the box to copy to clipboard</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Import Section */}
            <div>
              <h3 className="text-md font-medium mb-3 flex items-center">
                <FiUpload className="mr-2" />
                Import Data
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label htmlFor="importData" className="block text-sm font-medium text-gray-700 mb-1">
                    Paste exported data
                  </label>
                  <textarea
                    id="importData"
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 h-32 font-mono text-xs"
                    placeholder="Paste exported data here"
                  />
                </div>
                
                <div>
                  <label htmlFor="importPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Import Password (only needed for encrypted data)
                  </label>
                  <input
                    id="importPassword"
                    type="password"
                    value={importPassword}
                    onChange={(e) => setImportPassword(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter password (if data is encrypted)"
                  />
                </div>
                
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={async () => {
                      try {
                        setError(null);
                        setImportError(null);
                        
                        if (!importData.trim()) {
                          setImportError('No data to import');
                          return;
                        }
                        
                        if (onImportData) {
                          const parsedData = await import('./utils/importExport').then(module => 
                            module.importData(importData, importPassword || undefined)
                          );
                          
                          await onImportData(parsedData);
                          setSuccess('Data imported successfully!');
                          setImportData('');
                          setImportPassword('');
                        }
                      } catch (err) {
                        console.error('Import error:', err);
                        setImportError(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
                      }
                    }}
                    className="w-full py-2 px-4 border-none rounded bg-blue-600 text-white cursor-pointer transition-colors duration-200 ease-in-out hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Import
                  </button>
                  
                  <div className="text-center">
                    <span className="text-sm text-gray-500">or</span>
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
                          setImportData(content);
                        };
                        reader.readAsText(file);
                      } catch (err) {
                        console.error('File read error:', err);
                        setImportError(`File read failed: ${err instanceof Error ? err.message : String(err)}`);
                      }
                    }}
                    className="hidden"
                    accept=".json,text/plain"
                  />
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2 px-4 border border-blue-300 rounded bg-white text-blue-600 cursor-pointer transition-colors duration-200 ease-in-out hover:bg-blue-50"
                  >
                    Select File
                  </button>
                </div>
                
                {importError && (
                  <p className="text-red-600 text-sm">{importError}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;