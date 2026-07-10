/**
 * Static theme constants — these are the DARK-mode defaults.
 * Used by screens that have not yet migrated to useTheme().
 * For dynamic dark/light support, use ThemeContext instead.
 */
export const theme = {
  deepBlack: '#0A0A0A',
  black: '#000000',
  surface: '#1C1C1E',
  surfaceLight: '#2C2C2E',
  border: '#3A3A3C',
  primary: '#FF4C00',
  crimson: '#FF4C00',       // alias kept for backward compat
  blush: '#FF6584',
  white: '#F5F5F5',
  gray: '#8E8E93',
  darkGray: '#636366',
  lightGray: '#AEAEB2',
  gold: '#FFD60A',
  orange: '#FF4C00',
  green: '#34C759',
  red: '#FF3B30',
  // Semantic aliases
  text: '#F5F5F5',
  textSecondary: '#C7C7CC',
  screenBg: '#0A0A0A',
  cardBg: '#1C1C1E',
  modalBg: '#1C1C1E',
  inputBg: '#2C2C2E',
  tabBarBg: '#2C2C2E',
  isDark: true,
};
