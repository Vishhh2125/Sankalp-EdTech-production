import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@app_theme_mode';

/** Premium Dark Theme Scheme */
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
  primarySoft: '#81361aff',
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
  crimson: '#FF5C1A',
  blush: '#FF6584',
  surfaceLight: '#21252F',
  text: '#F5F6F8',
  screenBg: '#0F1117',
  cardBg: '#181B23',
  modalBg: '#181B23',
  inputBg: '#21252F',
  tabBarBg: '#181B23',
  searchBarBg: '#21252F',
  lockedCellBg: '#21252F',
  episodeBg: '#181B23',
  disabled: '#303541',
  disabledBg: '#1E1E24',
  disabledText: '#667085',
};

/** Premium Light Theme Scheme */
const lightTheme = {
  isDark: false,
  // Core Semantic Colors
  background: '#F5F5F5', // Soft Light Neutral Gray
  surface: '#FFFFFF',    // Pure White Card/Surface
  elevatedSurface: '#FFFFFF',
  card: '#FFFFFF',
  textPrimary: '#1A1A1A', // Soft Near-black primary text
  textSecondary: '#6B6B6B', // Warm Gray secondary text
  textMuted: '#A7ADBB',
  border: '#E5E7EB',     // Clean Light Gray Border
  primary: '#FF4C00',    // Warm Orange Brand Accent
  primaryHover: '#E64400',
  primarySoft: '#F5F5F5',
  accent: '#D4A600',
  success: '#16A34A',
  warning: '#F59E0B',
  error: '#DC2626',
  info: '#2563EB',
  tabBarBackground: '#FFFFFF',
  inputBackground: '#F5F5F5',

  // Specific Component Backwards Compatibility / Legacy Primitives
  deepBlack: '#F5F5F5',
  black: '#FFFFFF',
  white: '#1A1A1A',
  gray: '#6B6B6B',
  darkGray: '#6B6B6B',
  lightGray: '#A7ADBB',
  gold: '#D4A600',
  orange: '#FF4C00',
  green: '#16A34A',
  red: '#DC2626',
  crimson: '#FF4C00',
  blush: '#FF6584',
  surfaceLight: '#E5E7EB',
  text: '#1A1A1A',
  screenBg: '#F5F5F5',
  cardBg: '#FFFFFF',
  modalBg: '#FFFFFF',
  inputBg: '#F5F5F5',
  tabBarBg: '#FFFFFF',
  searchBarBg: '#E5E7EB',
  lockedCellBg: '#F5F5F5',
  episodeBg: '#FFFFFF',
  disabled: '#CBD5E1',
  disabledBg: '#F1F5F9',
  disabledText: '#A7ADBB',
};

const ThemeContext = createContext({
  theme: darkTheme,
  isDarkMode: true,
  toggleTheme: () => { },
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
    }).catch(() => { });
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
