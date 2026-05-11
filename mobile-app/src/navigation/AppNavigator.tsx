/**
 * App Navigator
 * React Navigation setup with native stack
 */

import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Colors } from "../themes";
import { useWalletStore } from "../store/walletStore";
import { walletService } from "../services/solana/walletService";

// Screens
import { HomeScreen } from "../screens/HomeScreen";
import { SendScreen } from "../screens/SendScreen";
import { OCRScanScreen } from "../screens/OCRScanScreen";
import { ThreatAnalysisScreen } from "../screens/ThreatAnalysisScreen";
import { AnalysisScreen } from "../screens/AnalysisScreen";
import { DelayScreen } from "../screens/DelayScreen";
import { PartialApprovalScreen } from "../screens/PartialApprovalScreen";
import { TransactionSuccessScreen } from "../screens/TransactionSuccessScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { WalletScreen } from "../screens/WalletScreen";

// Types
import type { RootStackParamList } from "../types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const isAuthenticated = useWalletStore((state) => state.isAuthenticated);
  const setAuthenticated = useWalletStore((state) => state.setAuthenticated);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Check if wallet exists on app start
    const initializeWallet = async () => {
      try {
        const walletExists = await walletService.walletExists();
        if (walletExists) {
          const wallet = await walletService.getUserWallet();
          const address = wallet.publicKey.toBase58();
          setAuthenticated(true, address);
        }
      } catch (error) {
        console.error("Failed to initialize wallet:", error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeWallet();
  }, []);

  if (!isInitialized) {
    return null; // Loading state
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.surface,
          },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: {
            fontWeight: "600",
            fontSize: 18,
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: Colors.background,
          },
        }}
      >
        {!isAuthenticated ? (
          // Auth Stack
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{
              headerShown: false,
              animationEnabled: false,
            }}
          />
        ) : (
          // App Stack
          <>
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
                title: "Send SOL",
                presentation: "card",
              }}
            />
            <Stack.Screen
              name="OCRScan"
              component={OCRScanScreen}
              options={{
                title: "Scan for Threats",
                presentation: "card",
              }}
            />
            <Stack.Screen
              name="ThreatAnalysis"
              component={ThreatAnalysisScreen}
              options={{
                title: "Threat Analysis",
                presentation: "card",
              }}
            />
            <Stack.Screen
              name="Analysis"
              component={AnalysisScreen}
              options={{
                title: "Transaction Analysis",
                presentation: "card",
              }}
            />
            <Stack.Screen
              name="Delay"
              component={DelayScreen}
              options={{
                title: "Set Timelock",
                presentation: "card",
              }}
            />
            <Stack.Screen
              name="PartialApproval"
              component={PartialApprovalScreen}
              options={{
                title: "Partial Approval",
                presentation: "card",
              }}
            />
            <Stack.Screen
              name="Success"
              component={TransactionSuccessScreen}
              options={{
                title: "Execution Complete",
                presentation: "modal",
              }}
            />
            <Stack.Screen
              name="Wallet"
              component={WalletScreen}
              options={{
                title: "Wallet",
                presentation: "card",
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
