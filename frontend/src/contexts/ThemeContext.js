import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isBlackWhite, setIsBlackWhite] = useState(() => {
    const saved = localStorage.getItem('blackWhiteMode');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('blackWhiteMode', isBlackWhite.toString());
    if (isBlackWhite) {
      document.documentElement.classList.add('black-white-mode');
    } else {
      document.documentElement.classList.remove('black-white-mode');
    }
  }, [isBlackWhite]);

  const toggleBlackWhite = () => {
    setIsBlackWhite(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ isBlackWhite, toggleBlackWhite }}>
      {children}
    </ThemeContext.Provider>
  );
};

