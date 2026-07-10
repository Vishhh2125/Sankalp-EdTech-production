import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const { theme } = useTheme();

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
              backgroundColor: theme.tabBarBg,
              borderTopWidth: 0,           // Remove top border line
              elevation: 0,               // Remove Android shadow
              shadowOpacity: 0,           // Remove iOS shadow
              height: 60 + insets.bottom,
              paddingBottom: insets.bottom + 4,
              paddingTop: 6,
            },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
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
      <Tab.Screen
        name={ROUTES.FOR_YOU}
        component={ForYouScreen}
        options={{ tabBarLabel: 'For You' }}
      />
      <Tab.Screen
        name={ROUTES.LIVE}
        component={LiveScreen}
        options={{ tabBarLabel: 'Live' }}
      />
      <Tab.Screen
        name={ROUTES.MY_LIST}
        component={MyListScreen}
        options={{ tabBarLabel: 'My List' }}
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
