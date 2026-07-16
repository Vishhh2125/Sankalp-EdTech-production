import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import ReelsScreen from '../screens/ReelsScreen';
import ForYouScreen from '../screens/ForYouScreen';
import LiveScreen from '../screens/LiveScreen';
import MyListScreen from '../screens/MyListScreen';
import ProfileStackNavigator from './ProfileStackNavigator';
import { ROUTES } from '../constants/routes';
import { useTheme } from '../context/ThemeContext';
import { useLandscapePlaybackContext } from '../context/LandscapePlaybackContext';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  [ROUTES.HOME]: { active: 'home', inactive: 'home-outline' },
  [ROUTES.FOR_YOU]: { active: 'play-circle', inactive: 'play-circle-outline' },
  [ROUTES.LIVE]: { active: 'radio', inactive: 'radio-outline' },
  [ROUTES.MY_LIST]: { active: 'bookmark', inactive: 'bookmark-outline' },
  [ROUTES.PROFILE]: { active: 'person-circle', inactive: 'person-circle-outline' },
};

export default function BottomTabNavigator() {
  const insets = useSafeAreaInsets();
  const { isLandscape } = useLandscapePlaybackContext();
  const { theme, isDarkMode } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName={ROUTES.HOME}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.gray,
        tabBarStyle: isLandscape
          ? { display: 'none' }
          : {
              position: 'absolute',
              bottom: Math.max(insets.bottom, 24),
              left: 20,
              right: 20,
              height: 68,
              borderRadius: 34,
              borderWidth: 1,
              borderColor: isDarkMode ? 'rgba(255, 76, 0, 0.3)' : 'rgba(255, 76, 0, 0.2)', // Light orange border
              backgroundColor: 'transparent',
              elevation: 0,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              paddingBottom: 0,
            },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            <BlurView
              tint={isDarkMode ? 'dark' : 'light'}
              intensity={100}
              style={[
                StyleSheet.absoluteFill,
                { 
                  borderRadius: 34, 
                  overflow: 'hidden', 
                  backgroundColor: isDarkMode ? 'rgba(28, 28, 30, 0.4)' : 'rgba(255, 255, 255, 0.4)' 
                }
              ]}
            />
          </View>
        ),
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 8,
        },
        tabBarItemStyle: {
          paddingTop: 8,
        },
        tabBarIcon: ({ focused, color }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons.active : icons.inactive;
          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name={ROUTES.HOME}
        component={ReelsScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      {/* <Tab.Screen
        name={ROUTES.FOR_YOU}
        component={ForYouScreen}
        options={{ tabBarLabel: 'For You' }}
      /> */}
      <Tab.Screen
        name={ROUTES.LIVE}
        component={LiveScreen}
        options={{ tabBarLabel: 'Live' }}
      />
      <Tab.Screen
        name={ROUTES.MY_LIST}
        component={MyListScreen}
        options={{ tabBarLabel: 'My Learning' }}
      />
      <Tab.Screen
        name={ROUTES.PROFILE}
        component={ProfileStackNavigator}
        options={{ tabBarLabel: 'Profile' }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate(ROUTES.PROFILE, { screen: ROUTES.PROFILE });
          },
        })}
      />
    </Tab.Navigator>
  );
}
