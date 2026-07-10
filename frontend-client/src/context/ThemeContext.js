import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@app_theme_mode';

/** Dark mode — rich dark greys, no purple */
const darkTheme = {
  isDark: true,
  deepBlack: '#0A0A0A',
  black: '#000000',
  surface: '#1C1C1E',
  surfaceLight: '#2C2C2E',
  border: '#3A3A3C',
  primary: '#FF4C00',
  crimson: '#FF4C00',
  blush: '#FF6584',
  white: '#F5F5F5',
  gray: '#8E8E93',
  darkGray: '#636366',
  lightGray: '#AEAEB2',
  gold: '#FFD60A',
  orange: '#FF4C00',
  green: '#34C759',
  red: '#FF3B30',
  text: '#F5F5F5',
  textSecondary: '#C7C7CC',
  textMuted: '#8E8E93',
  screenBg: '#0A0A0A',
  cardBg: '#1C1C1E',
  modalBg: '#1C1C1E',
  inputBg: '#2C2C2E',
  tabBarBg: '#2C2C2E',
  searchBarBg: '#2C2C2E',
  lockedCellBg: '#2C2C2E',
  episodeBg: '#1C1C1E',
};

/** Light mode — true light: off-white backgrounds, dark text */
const lightTheme = {
  isDark: false,
  deepBlack: '#F2F2F7',
  black: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceLight: '#E5E5EA',
  border: '#C6C6C8',
  primary: '#FF4C00',
  crimson: '#FF4C00',
  blush: '#FF6584',
  white: '#1C1C1E',          // Inverted: text is dark in light mode
  gray: '#636366',
  darkGray: '#3A3A3C',
  lightGray: '#8E8E93',
  gold: '#D4A600',
  orange: '#FF4C00',
  green: '#248A3D',
  red: '#D70015',
  text: '#1C1C1E',           // Dark text on light bg
  textSecondary: '#3A3A3C',
  textMuted: '#636366',
  screenBg: '#F2F2F7',       // Light grey screen background
  cardBg: '#FFFFFF',
  modalBg: '#FFFFFF',
  inputBg: '#E5E5EA',
  tabBarBg: '#FFFFFF',
  searchBarBg: '#E5E5EA',
  lockedCellBg: '#D1D1D6',
  episodeBg: '#FFFFFF',
};

const ThemeContext = createContext({
  theme: darkTheme,
  isDarkMode: true,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((val) => {
      if (val !== null) {
        setIsDarkMode(val === 'dark');
      }
    }).catch(() => {});
  }, []);

  const toggleTheme = useCallback(async () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    try {
      await AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [isDarkMode]);

  const theme = isDarkMode ? darkTheme : lightTheme;

  const value = useMemo(
    () => ({ theme, isDarkMode, toggleTheme }),
    [theme, isDarkMode, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export { darkTheme, lightTheme };
