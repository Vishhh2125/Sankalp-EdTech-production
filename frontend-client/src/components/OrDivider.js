import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

/**
 * A horizontal "─── OR ───" divider used between the primary
 * action button and social login options.
 */
export default function OrDivider() {
  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <Text style={styles.text}>OR</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: theme.border,
  },
  text: {
    color: theme.gray,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginHorizontal: 14,
  },
});
