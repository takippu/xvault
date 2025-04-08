import React, { useState, useCallback } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { StoredPasswordInfo } from './App';

interface SettingsProps {
  passwordInfo: StoredPasswordInfo | null;
  onSetPassword: (newPassword: string) => Promise<void>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onBack: () => void;
  authError: string | null;
}

const Settings: React.FC<SettingsProps> = ({
  passwordInfo,
  onSetPassword,
  onChangePassword,
  onBack,
  authError
}) => {
  // State for password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Determine if we're setting a new password or changing existing one
  const isSettingNewPassword = !passwordInfo;

  // Handle form submission
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

          {/* Error messages */}
          {(error || authError) && (
            <p className="text-red-600 text-sm mt-3">{error || authError}</p>
          )}

          {/* Success message */}
          {success && (
            <p className="text-green-600 text-sm mt-3">{success}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;