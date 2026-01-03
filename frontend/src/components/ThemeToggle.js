import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = () => {
  const { isBlackWhite, toggleBlackWhite } = useTheme();

  return (
    <button
      className="theme-toggle-btn"
      onClick={toggleBlackWhite}
      title={isBlackWhite ? 'Switch to Color Mode' : 'Switch to Black & White Mode'}
      aria-label={isBlackWhite ? 'Switch to Color Mode' : 'Switch to Black & White Mode'}
    >
      {isBlackWhite ? '🎨' : '⚫'}
    </button>
  );
};

export default ThemeToggle;

