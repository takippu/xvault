import React, { useState } from 'react';

interface LoginScreenProps {
  onLogin: (password: string, rememberMe?: boolean) => Promise<void>; // Function to call when login is attempted
  authError: string | null; // Error message from App component
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, authError }) => {
  const [passwordAttempt, setPasswordAttempt] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (event?: React.FormEvent) => {
    event?.preventDefault(); // Prevent default form submission if used in a form
    onLogin(passwordAttempt, rememberMe);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  };

  // Apply Tailwind classes for styling
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 bg-base text-sm">
      <h2 className="text-lg font-semibold mb-6 neon-text">Enter Password</h2>
      {/* Using a form for better semantics */}
      <form onSubmit={handleSubmit} className="w-full max-w-xs">
        <input
          type="password"
          className="w-full p-2 border border-color rounded text-center mb-4 focus:outline-none focus:ring-1 focus:ring-primary text-primary bg-secondary-base"
          value={passwordAttempt}
          onChange={(e) => setPasswordAttempt(e.target.value)}
          onKeyDown={handleKeyDown} // Keep Enter key functionality
          placeholder="Password"
          aria-label="Password"
          autoFocus
        />
        <div className="flex items-center mb-4">
          <input
            id="rememberMe"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 text-primary border-color rounded"
          />
          <label htmlFor="rememberMe" className="ml-2 block text-sm text-primary">
            Remember me until browser closes
          </label>
        </div>
        
        <button
          type="submit"
          className="primary w-full py-2 px-4 border-none rounded cursor-pointer transition-colors duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Login
        </button>
        {authError && <p className="text-red-600 text-xs mt-3 text-center">{authError}</p>}
      </form>
    </div>
  );
};

export default LoginScreen;
