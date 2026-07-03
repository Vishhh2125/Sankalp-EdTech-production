import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ProfileScreen from '../screens/ProfileScreen';
import MembershipScreen from '../screens/MembershipScreen';
import MyWallet from '../screens/MyWallet';
import TopUpScreen from '../screens/TopUpScreen';
import TransactionHistoryScreen from '../screens/TransactionHistoryScreen';
import EarnRewardsScreen from '../screens/EarnRewardsScreen';
import { ROUTES } from '../constants/routes';
import { theme } from '../constants/theme';

const Stack = createNativeStackNavigator();

// FIX: contentStyle added to every screen (and as a screenOptions default) so
// the navigator background never flashes white before the screen's first paint.
const DARK_HEADER = {
  headerShown: true,
  headerStyle: { backgroundColor: theme.deepBlack },
  headerTintColor: theme.white,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: theme.deepBlack },
};

export default function ProfileStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{ contentStyle: { backgroundColor: theme.deepBlack } }}
    >
      <Stack.Screen
        name={ROUTES.PROFILE}
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={ROUTES.MEMBERSHIP}
        component={MembershipScreen}
        options={{ ...DARK_HEADER, title: 'Membership' }}
      />
      <Stack.Screen
        name={ROUTES.MY_WALLET}
        component={MyWallet}
        options={{ ...DARK_HEADER, title: 'My Wallet' }}
      />
      <Stack.Screen
        name={ROUTES.TOP_UP}
        component={TopUpScreen}
        options={{ ...DARK_HEADER, title: 'Top Up' }}
      />
      <Stack.Screen
        name={ROUTES.TRANSACTION_HISTORY}
        component={TransactionHistoryScreen}
        options={{ ...DARK_HEADER, title: 'Transaction History' }}
      />
      <Stack.Screen
        name={ROUTES.EARN_REWARDS}
        component={EarnRewardsScreen}
        options={{ ...DARK_HEADER, title: 'Earn Rewards' }}
      />
    </Stack.Navigator>
  );
}