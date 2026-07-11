import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@app_theme_mode';

/** Semantic Dark Mode */
const darkTheme = {
  isDark: true,
  // Core Semantic Colors
  background: '#0F1117',
  surface: '#181B23',
  elevatedSurface: '#21252F',
  card: '#181B23',
  textPrimary: '#F5F6F8',
  textSecondary: '#A7ADBB',
  textMuted: '#667085',
  border: '#303541',
  primary: '#FF5C1A',
  primaryHover: '#FF713D',
  primarySoft: '#3D1A0D',
  accent: '#FFD60A',
  success: '#22C55E',
  warning: '#FBBF24',
  error: '#EF4444',
  info: '#60A5FA',
  tabBarBackground: '#181B23',
  inputBackground: '#21252F',
  
  // Specific Component Backwards Compatibility / Legacy Primitives
  deepBlack: '#0F1117',
  black: '#000000',
  white: '#F5F6F8',
  gray: '#667085',
  darkGray: '#A7ADBB',
  lightGray: '#A7ADBB',
  gold: '#FFD60A',
  orange: '#FF5C1A',
  green: '#22C55E',
  red: '#EF4444',
  blush: '#FF6584',
  lockedCellBg: '#21252F',
  episodeBg: '#181B23',
  // Old aliases (to be phased out where possible, but keeping for safety if missed)
  text: '#F5F6F8',
  screenBg: '#0F1117',
};

/** Semantic Light Mode */
const lightTheme = {
  isDark: false,
  // Core Semantic Colors
  background: '#F8F9FC',
  surface: '#FFFFFF',
  elevatedSurface: '#FFFFFF',
  card: '#FFFFFF',
  textPrimary: '#1A1D29',
  textSecondary: '#667085',
  textMuted: '#A7ADBB',
  border: '#E5E7EB',
  primary: '#FF4C00',
  primaryHover: '#E64400',
  primarySoft: '#FFF0E9',
  accent: '#D4A600',
  success: '#16A34A',
  warning: '#F59E0B',
  error: '#DC2626',
  info: '#2563EB',
  tabBarBackground: '#FFFFFF',
  inputBackground: '#F8F9FC',
  
  // Specific Component Backwards Compatibility / Legacy Primitives
  deepBlack: '#F8F9FC',
  black: '#FFFFFF',
  white: '#1A1D29',
  gray: '#667085',
  darkGray: '#1A1D29',
  lightGray: '#A7ADBB',
  gold: '#D4A600',
  orange: '#FF4C00',
  green: '#16A34A',
  red: '#DC2626',
  blush: '#FF6584',
  lockedCellBg: '#F8F9FC',
  episodeBg: '#FFFFFF',
  // Old aliases (to be phased out where possible, but keeping for safety if missed)
  text: '#1A1D29',
  screenBg: '#F8F9FC',
};

const ThemeContext = createContext({
  theme: darkTheme,
  isDarkMode: true,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const systemTheme = Appearance.getColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemTheme === 'dark');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((val) => {
      if (val !== null) {
        setIsDarkMode(val === 'dark');
      } else if (systemTheme) {
        setIsDarkMode(systemTheme === 'dark');
      }
    }).catch(() => {});
  }, [systemTheme]);

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
