import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { theme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

export default function CategoryPill({ label, selected = false, onPress }) {
  const { theme: appTheme } = useTheme();
  const styles = useStyles(appTheme);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        selected && styles.pillSelected,
        pressed && !selected && styles.pillPressed,
      ]}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = (appTheme) => StyleSheet.create({
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: appTheme.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: appTheme.border,
  },
  pillSelected: {
    borderColor: appTheme.primary,
    backgroundColor: appTheme.border,
  },
  pillPressed: {
    opacity: 0.85,
  },
  text: {
    color: appTheme.white,
    fontWeight: '700',
    fontSize: 13,
  },
  textSelected: {
    color: appTheme.blush,
  },
});

