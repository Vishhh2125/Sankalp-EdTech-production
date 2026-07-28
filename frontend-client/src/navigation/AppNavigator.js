import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import BottomTabNavigator from './BottomTabNavigator';
import ShowPlayerScreen from '../screens/ShowPlayerScreen';
import LiveViewerScreen from '../screens/LiveViewerScreen';
import TopUpScreen from '../screens/TopUpScreen';
import AssignmentDetailScreen from '../screens/AssignmentDetailScreen';
import QuizTakingScreen from '../screens/QuizTakingScreen';
import PackageDetailScreen from '../screens/PackageDetailScreen';
import MyCertificatesScreen from '../screens/MyCertificatesScreen';
import { ROUTES } from '../constants/routes';
import { useTheme } from '../context/ThemeContext';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { theme: appTheme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: appTheme.deepBlack }, // FIX: prevent white flash
      }}
    >
      <Stack.Screen name={ROUTES.MAIN_TABS} component={BottomTabNavigator} />
      <Stack.Screen
        name={ROUTES.SHOW_PLAYER}
        component={ShowPlayerScreen}
        options={{
          animation: 'slide_from_bottom',
          gestureEnabled: true,
          gestureDirection: 'vertical',
        }}
      />
      <Stack.Screen
        name={ROUTES.LIVE_VIEWER}
        component={LiveViewerScreen}
        options={{
          animation: 'slide_from_right',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name={ROUTES.TOP_UP}
        component={TopUpScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: appTheme.deepBlack },
          headerTintColor: appTheme.white,
          headerShadowVisible: false,
          title: 'Top Up',
          animation: 'slide_from_bottom',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name={ROUTES.ASSIGNMENT_DETAIL}
        component={AssignmentDetailScreen}
        options={{
          animation: 'slide_from_right',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name={ROUTES.QUIZ_TAKING}
        component={QuizTakingScreen}
        options={{
          animation: 'slide_from_right',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name={ROUTES.PACKAGE_DETAIL}
        component={PackageDetailScreen}
        options={{
          animation: 'slide_from_right',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name={ROUTES.MY_CERTIFICATES}
        component={MyCertificatesScreen}
        options={{
          animation: 'slide_from_right',
          gestureEnabled: true,
        }}
      />
    </Stack.Navigator>
  );
}