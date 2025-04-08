import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number; // Duration in milliseconds
  type?: 'success' | 'error' | 'info';
}

const Toast: React.FC<ToastProps> = ({
  message,
  isVisible,
  onClose,
  duration = 1500,
  type = 'success'
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  // Determine background color based on type
  const bgColor = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600'
  }[type];

  return (
    <div className="fixed top-4 right-4 z-50 transition-opacity duration-300 ease-in-out opacity-100">
      <div className={`${bgColor} text-white px-4 py-2 rounded shadow-lg text-sm flex items-center`}>
        {message}
      </div>
    </div>
  );
};


export default Toast;