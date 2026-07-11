import React from 'react';
import { StyleSheet, View } from 'react-native';

import { theme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

export default function AppCard({ children, style }) {
  const { theme: appTheme } = useTheme();
  return <View style={[styles.card, { backgroundColor: appTheme.surface, borderColor: appTheme.border }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
});

