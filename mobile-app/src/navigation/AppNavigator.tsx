/**
 * App Navigator
 * React Navigation setup with native stack
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors } from '../themes';

// Screens
import { HomeScreen } from '../screens/HomeScreen';
import { SendScreen } from '../screens/SendScreen';
import { AnalysisScreen } from '../screens/AnalysisScreen';
import { DelayScreen } from '../screens/DelayScreen';
import { PartialApprovalScreen } from '../screens/PartialApprovalScreen';

// Types
import type { RootStackParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.surface,
          },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: Colors.background,
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Send"
          component={SendScreen}
          options={{
            title: 'Send SOL',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="Analysis"
          component={AnalysisScreen}
          options={{
            title: 'Transaction Analysis',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="Delay"
          component={DelayScreen}
          options={{
            title: 'Set Timelock',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="PartialApproval"
          component={PartialApprovalScreen}
          options={{
            title: 'Partial Approval',
            presentation: 'card',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
