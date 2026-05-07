/**
 * DelayScreen
 * Screen for confirming delayed execution timelock
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaWrapper, Card, Button, ScoreBar } from '../components';
import { useTransactionStore } from '../store/transactionStore';
import { Colors, Typography, Spacing } from '../themes';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Delay'>;

const DELAY_OPTIONS = [
  { label: '1 Hour', seconds: 3600, description: 'Quick verification window' },
  { label: '6 Hours', seconds: 21600, description: 'Standard timelock' },
  { label: '24 Hours', seconds: 86400, description: 'Full day to verify' },
  { label: '3 Days', seconds: 259200, description: 'Extended review period' },
  { label: '7 Days', seconds: 604800, description: 'Maximum timelock' },
];

export const DelayScreen: React.FC<Props> = ({ navigation, route }) => {
  const { analysisId } = route.params;
  const [selectedDelay, setSelectedDelay] = useState(DELAY_OPTIONS[0]);
  const [confirming, setConfirming] = useState(false);

  const currentAnalysis = useTransactionStore((state) => state.currentAnalysis);
  const confirmDecision = useTransactionStore((state) => state.confirmDecision);

  if (!currentAnalysis) {
    return (
      <SafeAreaWrapper>
        <Text style={[Typography.body, { color: Colors.error }]}>
          No analysis found
        </Text>
      </SafeAreaWrapper>
    );
  }

  const handleConfirm = async () => {
    setConfirming(true);
    // Simulate submission
    await new Promise((resolve) => setTimeout(resolve, 1500));
    confirmDecision(currentAnalysis.decision);
    setConfirming(false);
    navigation.navigate('Home');
  };

  const executeTime = new Date(Date.now() + selectedDelay.seconds * 1000);
  const timeString = executeTime.toLocaleString();

  return (
    <SafeAreaWrapper scroll>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[Typography.h2, { color: Colors.textPrimary }]}>
          Set Timelock
        </Text>
        <Text style={[Typography.body, { color: Colors.textSecondary }]}>
          Choose when to execute this transaction
        </Text>
      </View>

      {/* Transaction Summary */}
      <Card variant="elevated" style={styles.summaryCard}>
        <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
          AMOUNT
        </Text>
        <Text style={[Typography.h3, { color: Colors.textPrimary }]}>
          {currentAnalysis.transaction.amount} SOL
        </Text>
        <View style={styles.divider} />
        <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
          TO
        </Text>
        <Text
          style={[Typography.caption, { color: Colors.textPrimary, fontFamily: 'Menlo' }]}
          numberOfLines={1}
        >
          {currentAnalysis.transaction.recipient}
        </Text>
      </Card>

      {/* Delay Options */}
      <Text style={[Typography.bodyStrong, { color: Colors.textPrimary, marginBottom: Spacing.md }]}>
        Execution Window
      </Text>
      <View style={styles.optionsContainer}>
        {DELAY_OPTIONS.map((option) => (
          <Card
            key={option.seconds}
            variant={selectedDelay.seconds === option.seconds ? 'elevated' : 'surface'}
            onTouchEnd={() => setSelectedDelay(option)}
            style={[
              styles.delayOption,
              selectedDelay.seconds === option.seconds && styles.delayOptionSelected,
            ]}
          >
            <View style={styles.optionContent}>
              <Text
                style={[
                  Typography.bodyStrong,
                  {
                    color:
                      selectedDelay.seconds === option.seconds
                        ? Colors.warning
                        : Colors.textPrimary,
                  },
                ]}
              >
                {option.label}
              </Text>
              <Text
                style={[
                  Typography.caption,
                  { color: Colors.textSecondary, marginTop: Spacing.xs },
                ]}
              >
                {option.description}
              </Text>
            </View>
            {selectedDelay.seconds === option.seconds && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </Card>
        ))}
      </View>

      {/* Execution Time Preview */}
      <Card variant="surface" style={styles.previewCard}>
        <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
          WILL EXECUTE AT
        </Text>
        <Text style={[Typography.bodyStrong, { color: Colors.warning, marginTop: Spacing.sm }]}>
          {timeString}
        </Text>
      </Card>

      {/* Risk Reminder */}
      <Card variant="surface" style={styles.reminderCard}>
        <View style={styles.reminderRow}>
          <Text style={styles.reminderIcon}>⏱️</Text>
          <Text
            style={[Typography.caption, { color: Colors.textSecondary, flex: 1 }]}
          >
            You can cancel this transaction anytime during the timelock period. Execution happens automatically after the delay expires.
          </Text>
        </View>
      </Card>

      {/* Scores */}
      <View style={styles.scoresSection}>
        <Text style={[Typography.bodyStrong, { color: Colors.textPrimary, marginBottom: Spacing.md }]}>
          Risk Assessment
        </Text>
        <Card variant="surface">
          <ScoreBar
            label="Risk Score"
            value={currentAnalysis.scores.riskScore}
          />
          <ScoreBar
            label="Confidence"
            value={currentAnalysis.scores.confidence}
            color={Colors.primary}
          />
        </Card>
      </View>

      {/* Confirm Buttons */}
      <View style={styles.buttonContainer}>
        <Button
          title={confirming ? 'Setting Timelock...' : 'Confirm & Timelock'}
          variant="warning"
          size="lg"
          loading={confirming}
          disabled={confirming}
          onPress={handleConfirm}
          style={{ marginBottom: Spacing.md }}
        />
        <Button
          title="Cancel"
          variant="secondary"
          size="lg"
          disabled={confirming}
          onPress={() => navigation.goBack()}
        />
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: Spacing.xl,
  },
  summaryCard: {
    marginBottom: Spacing.xl,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  optionsContainer: {
    marginBottom: Spacing.xl,
  },
  delayOption: {
    marginBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  delayOptionSelected: {
    borderWidth: 2,
    borderColor: Colors.warning,
  },
  optionContent: {
    flex: 1,
  },
  checkmark: {
    fontSize: 18,
    color: Colors.warning,
    marginLeft: Spacing.md,
  },
  previewCard: {
    marginBottom: Spacing.lg,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  reminderCard: {
    marginBottom: Spacing.xl,
  },
  reminderRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  reminderIcon: {
    fontSize: 18,
  },
  scoresSection: {
    marginBottom: Spacing.xl,
  },
  buttonContainer: {
    paddingBottom: Spacing.xl,
  },
});
