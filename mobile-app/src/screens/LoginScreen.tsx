/**
 * LoginScreen
 * Screen for importing wallet from seed phrase or private key
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaWrapper, Button, Card } from "../components";
import { Colors, Typography, Spacing, BorderRadius } from "../themes";
import type { RootStackParamList } from "../types";
import { walletService } from "../services/solana/walletService";
import { useWalletStore } from "../store/walletStore";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [importMethod, setImportMethod] = useState<"privateKey" | "seedPhrase">(
    "privateKey",
  );
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const setAuthenticated = useWalletStore((state) => state.setAuthenticated);

  const handleImport = async () => {
    try {
      setError("");
      setLoading(true);

      if (!inputValue.trim()) {
        throw new Error(
          importMethod === "privateKey"
            ? "Please enter a private key"
            : "Please enter a seed phrase",
        );
      }

      let keypair;
      if (importMethod === "privateKey") {
        keypair = await walletService.importFromPrivateKey(inputValue.trim());
      } else {
        keypair = await walletService.importFromSeedPhrase(inputValue.trim());
      }

      const address = keypair.publicKey.toBase58();
      setAuthenticated(true, address);

      Alert.alert(
        "Success",
        `Wallet imported successfully!\n\nAddress: ${address.slice(0, 8)}...${address.slice(-8)}`,
        [
          {
            text: "OK",
            onPress: () => navigation.navigate("Home"),
          },
        ],
      );
    } catch (err: any) {
      const errorMsg = err.message || "Failed to import wallet";
      setError(errorMsg);
      Alert.alert("Import Failed", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaWrapper scroll>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text
              style={[
                Typography.h2,
                { color: Colors.textPrimary, textAlign: "center" },
              ]}
            >
              🔐
            </Text>
            <Text
              style={[
                Typography.h3,
                {
                  color: Colors.textPrimary,
                  textAlign: "center",
                  marginTop: Spacing.md,
                },
              ]}
            >
              Import Your Wallet
            </Text>
            <Text
              style={[
                Typography.body,
                {
                  color: Colors.textSecondary,
                  textAlign: "center",
                  marginTop: Spacing.sm,
                },
              ]}
            >
              Enter your private key or seed phrase to access your wallet
            </Text>
          </View>

          {/* Method Selector */}
          <View style={styles.methodContainer}>
            <View style={styles.methodButtons}>
              <Button
                title="Private Key"
                variant={
                  importMethod === "privateKey" ? "primary" : "secondary"
                }
                size="sm"
                onPress={() => {
                  setImportMethod("privateKey");
                  setInputValue("");
                  setError("");
                }}
                style={styles.methodButton}
              />
              <Button
                title="Seed Phrase"
                variant={
                  importMethod === "seedPhrase" ? "primary" : "secondary"
                }
                size="sm"
                onPress={() => {
                  setImportMethod("seedPhrase");
                  setInputValue("");
                  setError("");
                }}
                style={styles.methodButton}
              />
            </View>
          </View>

          {/* Info Card */}
          <Card variant="surface" style={styles.infoCard}>
            <Text
              style={[
                Typography.caption,
                { color: Colors.textSecondary, fontWeight: "600" },
              ]}
            >
              {importMethod === "privateKey" ? "PRIVATE KEY" : "SEED PHRASE"}
            </Text>
            <Text
              style={[
                Typography.tiny,
                { color: Colors.textSecondary, marginTop: Spacing.xs },
              ]}
            >
              {importMethod === "privateKey"
                ? "Paste your private key (base58 encoded). This is a 64-byte key used to sign transactions."
                : `Enter your seed phrase (12 or 24 words). We'll derive your keypair from this.`}
            </Text>
          </Card>

          {/* Input */}
          <TextInput
            style={styles.input}
            placeholder={
              importMethod === "privateKey"
                ? "Paste your private key here..."
                : "Enter your seed phrase here..."
            }
            placeholderTextColor={Colors.textSecondary}
            multiline
            numberOfLines={importMethod === "privateKey" ? 3 : 6}
            value={inputValue}
            onChangeText={(text) => {
              setInputValue(text);
              setError("");
            }}
            editable={!loading}
          />

          {/* Error Message */}
          {error && (
            <Card
              variant="surface"
              style={[
                styles.errorCard,
                { borderLeftColor: Colors.error, borderLeftWidth: 4 },
              ]}
            >
              <Text style={[Typography.caption, { color: Colors.error }]}>
                {error}
              </Text>
            </Card>
          )}

          {/* Import Button */}
          <Button
            title={loading ? "Importing..." : "Import Wallet"}
            variant="primary"
            size="lg"
            onPress={handleImport}
            disabled={loading || !inputValue.trim()}
            style={styles.importButton}
          />

          {/* Security Note */}
          <Card variant="surface" style={styles.securityNote}>
            <Text style={[Typography.tiny, { color: Colors.textSecondary }]}>
              🔒 Your private key is stored securely and never shared. Keep it
              safe!
            </Text>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  methodContainer: {
    marginBottom: Spacing.lg,
  },
  methodButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  methodButton: {
    flex: 1,
  },
  infoCard: {
    marginBottom: Spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    fontSize: 14,
    fontFamily: "Courier New",
    minHeight: 100,
    marginBottom: Spacing.lg,
    textAlignVertical: "top",
  },
  errorCard: {
    marginBottom: Spacing.lg,
  },
  importButton: {
    marginBottom: Spacing.lg,
  },
  securityNote: {
    marginBottom: Spacing.lg,
  },
});
