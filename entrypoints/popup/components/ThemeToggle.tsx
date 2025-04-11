import React from 'react';
import { FiMoon, FiSun } from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-4 rounded-lg hover:bg-opacity-80 transition-colors relative"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <motion.div
        initial={{ opacity: 0, rotate: -90 }}
        animate={{ opacity: theme === 'light' ? 1 : 0, rotate: theme === 'light' ? 0 : -90 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <FiMoon className="w-5 h-5 text-blue-500" />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, rotate: 90 }}
        animate={{ opacity: theme === 'dark' ? 1 : 0, rotate: theme === 'dark' ? 0 : 90 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <FiSun className="w-5 h-5 text-amber-400" />
      </motion.div>
    </button>
  );
};

export default ThemeToggle;