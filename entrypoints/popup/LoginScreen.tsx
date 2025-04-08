import React, { useState } from 'react';

interface LoginScreenProps {
  onLogin: (password: string) => Promise<void>; // Function to call when login is attempted
  authError: string | null; // Error message from App component
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, authError }) => {
  const [passwordAttempt, setPasswordAttempt] = useState('');

  const handleSubmit = (event?: React.FormEvent) => {
    event?.preventDefault(); // Prevent default form submission if used in a form
    onLogin(passwordAttempt);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  };

  // Apply Tailwind classes for styling
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 bg-gray-50 text-sm">
      <h2 className="text-lg font-semibold mb-6 text-gray-700">Enter Password</h2>
      {/* Using a form for better semantics */}
      <form onSubmit={handleSubmit} className="w-full max-w-xs">
        <input
          type="password"
          className="w-full p-2 border border-gray-300 rounded text-center mb-4 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          value={passwordAttempt}
          onChange={(e) => setPasswordAttempt(e.target.value)}
          onKeyDown={handleKeyDown} // Keep Enter key functionality
          placeholder="Password"
          aria-label="Password"
          autoFocus
        />
        <button
          type="submit" // Use type="submit" within a form
          className="w-full py-2 px-4 border-none rounded bg-blue-600 text-white cursor-pointer transition-colors duration-200 ease-in-out hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Login
        </button>
        {authError && <p className="text-red-600 text-xs mt-3 text-center">{authError}</p>}
      </form>
    </div>
  );
};

export default LoginScreen;
