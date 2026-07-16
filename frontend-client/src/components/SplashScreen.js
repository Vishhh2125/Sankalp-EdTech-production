import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

/**
 * SplashScreen Component
 * 
 * Shown while the app is initializing auth (checking stored tokens, refreshing if needed).
 * Prevents flashing between screens during app startup.
 */

const SplashScreen = () => {
  const { theme: appTheme } = useTheme();
  const styles = useStyles(appTheme);
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={appTheme.crimson} />
    </View>
  );
};

const useStyles = (appTheme) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: appTheme.deepBlack,
  },
});

export default SplashScreen;

