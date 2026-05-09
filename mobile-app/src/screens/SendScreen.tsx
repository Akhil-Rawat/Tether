/**
 * SendScreen
 * Screen for entering transaction details (recipient, amount)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaWrapper, Card, Button, LoadingOverlay } from '../components';
import { useTransactionStore } from '../store/transactionStore';
import { Colors, Typography, Spacing, BorderRadius } from '../themes';
import type { RootStackParamList } from '../types';
import { isValidSolanaAddress } from '../utils';

type Props = NativeStackScreenProps<RootStackParamList, 'Send'>;

export const SendScreen: React.FC<Props> = ({ navigation }) => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const startNewTransaction = useTransactionStore(
    (state) => state.startNewTransaction
  );
  const analyzeCurrentTransaction = useTransactionStore((s) => s.analyzeCurrentTransaction);
  const isAnalyzing = useTransactionStore((s) => s.isAnalyzing);
  const blockchainError = useTransactionStore((s) => s.blockchainError);

  const handleSend = async () => {
    setError('');

    // Validation
    if (!recipient.trim()) {
      setError('Please enter a recipient address');
      return;
    }

    if (!isValidSolanaAddress(recipient.trim())) {
      setError('Please enter a valid Solana address');
      return;
    }

    if (!amount.trim()) {
      setError('Please enter an amount');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);

    try {
      // Create new transaction and run live analysis
      startNewTransaction(recipient, amountNum);

      const analysis = await analyzeCurrentTransaction();

      setLoading(false);

      if (!analysis) {
        setError(blockchainError ?? 'Analysis failed');
        return;
      }

      // Navigate to analysis screen where the real decision is shown
      navigation.navigate('Analysis', { transactionId: analysis.transactionId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating transaction');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <SafeAreaWrapper>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[Typography.h2, { color: Colors.textPrimary }]}>
            Send SOL
          </Text>
          <Text style={[Typography.body, { color: Colors.textSecondary }]}>
            Enter recipient and amount
          </Text>
        </View>

        {/* Form Card */}
        <Card variant="elevated" style={styles.formCard}>
          {/* Recipient Input */}
          <View style={styles.inputGroup}>
            <Text style={[Typography.captionStrong, { color: Colors.textSecondary }]}>
              RECIPIENT ADDRESS
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter wallet address"
              placeholderTextColor={Colors.textTertiary}
              value={recipient}
              onChangeText={setRecipient}
              editable={!loading}
              multiline
            />
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Amount Input */}
          <View style={styles.inputGroup}>
            <Text style={[Typography.captionStrong, { color: Colors.textSecondary }]}>
              AMOUNT (SOL)
            </Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={Colors.textTertiary}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              editable={!loading}
            />
          </View>
        </Card>

        {/* Error Message */}
        {error && (
          <Card variant="surface" style={[styles.errorCard]}>
            <Text style={[Typography.caption, { color: Colors.error }]}>
              {error}
            </Text>
          </Card>
        )}

        {/* Info Box */}
        <Card variant="surface" style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text
              style={[Typography.caption, { color: Colors.textSecondary, flex: 1 }]}
            >
              Your transaction will be analyzed for security before execution. You'll review the AI decision next.
            </Text>
          </View>
        </Card>

        {/* Send Button */}
        <Button
          title={loading || isAnalyzing ? 'Analyzing...' : 'Review & Send'}
          variant="primary"
          size="lg"
          loading={loading || isAnalyzing}
          disabled={loading || isAnalyzing}
          onPress={handleSend}
          style={styles.sendButton}
        />

        <LoadingOverlay visible={loading || isAnalyzing} title="Analyzing transaction" subtitle="Guardian is evaluating risk on Devnet" />
      </SafeAreaWrapper>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  formCard: {
    marginBottom: Spacing.lg,
  },
  inputGroup: {
    marginVertical: Spacing.md,
  },
  input: {
    backgroundColor: Colors.background,
    color: Colors.textPrimary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    fontFamily: 'Menlo',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  errorCard: {
    marginBottom: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  infoCard: {
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  infoIcon: {
    fontSize: 16,
  },
  sendButton: {
    marginTop: 'auto',
  },
});
