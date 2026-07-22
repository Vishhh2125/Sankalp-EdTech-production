import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';

export default function AppCard({ children, style }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  return <View style={[styles.card, style]}>{children}</View>;
}

const useStyles = (theme) => StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
});

