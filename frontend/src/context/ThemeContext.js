import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme] = useState('light'); // Light mode only

  useEffect(() => {
    document.body.setAttribute('data-theme', 'light');
  }, []);

  const toggleTheme = () => {
    // Dark mode coming soon — no-op
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
