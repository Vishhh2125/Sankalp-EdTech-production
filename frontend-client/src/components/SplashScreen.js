import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

/**
 * SplashScreen Component
 * 
 * Shown while the app is initializing auth (checking stored tokens, refreshing if needed).
 * Prevents flashing between screens during app startup.
 */

const SplashScreen = () => {
  const { theme } = useTheme();
  const styles = useStyles(theme);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );
};

const useStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
  },
});

export default SplashScreen;

