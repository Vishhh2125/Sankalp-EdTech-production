import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

/**
 * A horizontal "─── OR ───" divider used between the primary
 * action button and social login options.
 */
export default function OrDivider() {
  const { theme } = useTheme();
  const styles = useStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <Text style={styles.text}>OR</Text>
      <View style={styles.line} />
    </View>
  );
}

const useStyles = (theme) => StyleSheet.create({
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
