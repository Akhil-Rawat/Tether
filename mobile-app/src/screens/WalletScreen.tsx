/**
 * WalletScreen
 * Display wallet address, balance, and import options
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Share,
  Alert,
  TouchableOpacity,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaWrapper, Card, Button } from "../components";
import { Colors, Typography, Spacing, BorderRadius } from "../themes";
import type { RootStackParamList } from "../types";
import { useWalletStore } from "../store/walletStore";
import { walletService } from "../services/solana/walletService";

type Props = NativeStackScreenProps<RootStackParamList, "Wallet">;

export const WalletScreen: React.FC<Props> = ({ navigation }) => {
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [privateKeyDisplay, setPrivateKeyDisplay] = useState("");

  const userAddress = useWalletStore((state) => state.userAddress);
  const balance = useWalletStore((state) => state.balance);
  const logout = useWalletStore((state) => state.logout);
  const fetchBalance = useWalletStore((state) => state.fetchBalance);

  React.useEffect(() => {
    // fetch balance on mount
    fetchBalance().catch(() => {});
  }, []);

  const handleCopyAddress = async () => {
    if (userAddress) {
      try {
        await Share.share({
          message: `My Guardian wallet: ${userAddress}`,
        });
      } catch (error) {
        // Fallback
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
      }
    }
  };

  const handleShowPrivateKey = async () => {
    try {
      Alert.alert(
        "Security Warning",
        "⚠️ NEVER share your private key with anyone!\n\nShow your private key? This action cannot be undone.",
        [
          {
            text: "Cancel",
            onPress: () => {},
            style: "cancel",
          },
          {
            text: "Yes, Show It",
            onPress: async () => {
              try {
                const key = await walletService.exportPrivateKey();
                setPrivateKeyDisplay(key);
                setShowPrivateKey(true);
              } catch (error) {
                Alert.alert("Error", "Failed to export private key");
              }
            },
            style: "destructive",
          },
        ],
      );
    } catch (error) {
      Alert.alert("Error", "Failed to handle private key");
    }
  };

  const handleHidePrivateKey = () => {
    setShowPrivateKey(false);
    setPrivateKeyDisplay("");
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure? Make sure you have backed up your private key!",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          onPress: async () => {
            try {
              await walletService.clearWallets();
              logout();
              navigation.navigate("Login");
            } catch (error) {
              Alert.alert("Error", "Failed to logout");
            }
          },
          style: "destructive",
        },
      ],
    );
  };

  return (
    <SafeAreaWrapper scroll>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[Typography.bodyStrong, { color: Colors.primary }]}>
            ← Back
          </Text>
        </TouchableOpacity>
        <Text
          style={[
            Typography.h3,
            { color: Colors.textPrimary, textAlign: "center", flex: 1 },
          ]}
        >
          Wallet
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Wallet Info Card */}
      <Card variant="elevated" style={styles.walletCard}>
        <View style={styles.balanceContainer}>
          <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
            BALANCE
          </Text>
          <Text
            style={[
              Typography.h1,
              { color: Colors.primary, marginTop: Spacing.sm },
            ]}
          >
            {typeof balance === "number" ? balance.toFixed(4) : "0.0000"} SOL
          </Text>
        </View>

        {/* Address Display */}
        <View style={styles.addressContainer}>
          <Text
            style={[
              Typography.tiny,
              { color: Colors.textSecondary, marginBottom: Spacing.sm },
            ]}
          >
            WALLET ADDRESS
          </Text>
          <TouchableOpacity
            style={styles.addressBox}
            onPress={handleCopyAddress}
          >
            <Text
              style={[
                Typography.caption,
                { color: Colors.textPrimary, fontFamily: "Courier New" },
              ]}
              selectable
            >
              {userAddress || "N/A"}
            </Text>
            <Text
              style={[
                Typography.tiny,
                { color: Colors.textSecondary, marginTop: Spacing.xs },
              ]}
            >
              {copiedAddress ? "✓ Copied" : "Tap to copy"}
            </Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Quick Info */}
      <Card variant="surface" style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoBadge}>
            <Text style={[Typography.tiny, { color: Colors.primary }]}>ℹ️</Text>
          </View>
          <Text
            style={[
              Typography.tiny,
              { color: Colors.textSecondary, marginLeft: Spacing.md, flex: 1 },
            ]}
          >
            Your wallet is secured with expo-secure-store. Keep your private key
            safe!
          </Text>
        </View>
      </Card>

      {/* Private Key Management */}
      <View style={styles.section}>
        <Text
          style={[
            Typography.bodyStrong,
            { color: Colors.textPrimary, marginBottom: Spacing.md },
          ]}
        >
          Security & Backup
        </Text>

        {!showPrivateKey ? (
          <Button
            title="Export Private Key"
            variant="secondary"
            size="lg"
            onPress={handleShowPrivateKey}
            style={styles.button}
          />
        ) : (
          <>
            <Card
              variant="surface"
              style={[
                styles.privateKeyCard,
                { borderLeftColor: Colors.error, borderLeftWidth: 4 },
              ]}
            >
              <Text
                style={[
                  Typography.tiny,
                  {
                    color: Colors.error,
                    marginBottom: Spacing.sm,
                    fontWeight: "600",
                  },
                ]}
              >
                ⚠️ YOUR PRIVATE KEY (KEEP IT SECRET!)
              </Text>
              <View style={styles.privateKeyBox}>
                <Text
                  style={[
                    Typography.tiny,
                    { color: Colors.textPrimary, fontFamily: "Courier New" },
                  ]}
                  selectable
                >
                  {privateKeyDisplay}
                </Text>
              </View>
              <Text
                style={[
                  Typography.tiny,
                  { color: Colors.textSecondary, marginTop: Spacing.md },
                ]}
              >
                Save this safely. Never share it with anyone!
              </Text>
            </Card>
            <Button
              title="Hide Private Key"
              variant="secondary"
              size="lg"
              onPress={handleHidePrivateKey}
              style={styles.button}
            />
          </>
        )}
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <Button
          title="Logout & Clear Wallet"
          variant="secondary"
          size="lg"
          onPress={handleLogout}
          style={[styles.button, { borderColor: Colors.error, borderWidth: 1 }]}
        />
      </View>

      {/* Funding Instructions */}
      <Card variant="surface" style={styles.fundingCard}>
        <Text
          style={[
            Typography.bodyStrong,
            { color: Colors.textPrimary, marginBottom: Spacing.md },
          ]}
        >
          Need SOL?
        </Text>
        <Text
          style={[
            Typography.tiny,
            { color: Colors.textSecondary, lineHeight: 20 },
          ]}
        >
          • Fund your wallet at{" "}
          <Text style={{ color: Colors.primary }}>
            solana.com/cli/transfer-tokens
          </Text>
          {"\n"}• Use faucet for devnet: Use an airdrop command
          {"\n"}• Minimum ~0.01 SOL needed for Guardian transactions
        </Text>
      </Card>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  walletCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  balanceContainer: {
    marginBottom: Spacing.lg,
  },
  addressContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.lg,
  },
  addressBox: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  button: {
    marginBottom: Spacing.md,
  },
  privateKeyCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  privateKeyBox: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginVertical: Spacing.md,
  },
  fundingCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.xl,
    padding: Spacing.md,
  },
});
