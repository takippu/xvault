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

  return (
    <div className="login-container">
      <h2>Enter Password</h2>
      {/* Consider using a form element for better accessibility */}
      <input
        type="password"
        value={passwordAttempt}
        onChange={(e) => setPasswordAttempt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Password"
        aria-label="Password" // Accessibility
        autoFocus // Focus on input when component mounts
      />
      <button onClick={() => handleSubmit()}>
        Login
      </button>
      {authError && <p className="error-message">{authError}</p>}
    </div>
  );
};

export default LoginScreen;
