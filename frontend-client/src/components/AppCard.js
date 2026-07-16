import React from 'react';
import { StyleSheet, View } from 'react-native';

import { theme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

export default function AppCard({ children, style }) {
  const { theme: appTheme } = useTheme();
  const styles = useStyles(appTheme);
  return <View style={[styles.card, { backgroundColor: appTheme.surface, borderColor: appTheme.border }, style]}>{children}</View>;
}

const useStyles = (appTheme) => StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
});

