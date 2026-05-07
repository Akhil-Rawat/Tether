/**
 * PartialApprovalScreen
 * Screen for confirming partial amount approval
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import Slider from '@react-native-community/slider';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaWrapper, Card, Button, ScoreBar } from '../components';
import { useTransactionStore } from '../store/transactionStore';
import { Colors, Typography, Spacing, BorderRadius } from '../themes';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'PartialApproval'>;

export const PartialApprovalScreen: React.FC<Props> = ({ navigation, route }) => {
  const { analysisId } = route.params;
  const currentAnalysis = useTransactionStore((state) => state.currentAnalysis);
  const confirmDecision = useTransactionStore((state) => state.confirmDecision);

  const [confirming, setConfirming] = useState(false);

  if (!currentAnalysis) {
    return (
      <SafeAreaWrapper>
        <Text style={[Typography.body, { color: Colors.error }]}>
          No analysis found
        </Text>
      </SafeAreaWrapper>
    );
  }

  const requestedAmount = currentAnalysis.transaction.amount;
  const defaultApproved = Math.ceil(requestedAmount * 0.5); // Start at 50%
  const [approvedAmount, setApprovedAmount] = useState(defaultApproved);
  const remainingAmount = requestedAmount - approvedAmount;

  const percentageApproved = useMemo(
    () => Math.round((approvedAmount / requestedAmount) * 100),
    [approvedAmount, requestedAmount]
  );

  const handleConfirm = async () => {
    setConfirming(true);
    // Simulate submission
    await new Promise((resolve) => setTimeout(resolve, 1500));
    confirmDecision(currentAnalysis.decision);
    setConfirming(false);
    navigation.navigate('Home');
  };

  return (
    <SafeAreaWrapper scroll>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[Typography.h2, { color: Colors.textPrimary }]}>
          Partial Approval
        </Text>
        <Text style={[Typography.body, { color: Colors.textSecondary }]}>
          Choose how much to approve
        </Text>
      </View>

      {/* Amount Summary */}
      <Card variant="elevated" style={styles.summaryCard}>
        <View style={styles.amountRow}>
          <View>
            <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
              REQUESTED
            </Text>
            <Text style={[Typography.h3, { color: Colors.textSecondary }]}>
              {requestedAmount} SOL
            </Text>
          </View>
          <Text style={[Typography.h3, { color: Colors.textSecondary }]}>→</Text>
          <View>
            <Text style={[Typography.caption, { color: Colors.warning }]}>
              APPROVED
            </Text>
            <Text style={[Typography.h3, { color: Colors.warning }]}>
              {approvedAmount} SOL
            </Text>
          </View>
        </View>

        {remainingAmount > 0 && (
          <>
            <View style={styles.divider} />
            <View>
              <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
                REMAINING AFTER APPROVAL
              </Text>
              <Text style={[Typography.bodyStrong, { color: Colors.success }]}>
                {remainingAmount} SOL (can be requested separately)
              </Text>
            </View>
          </>
        )}
      </Card>

      {/* Recipient */}
      <Card variant="surface" style={styles.recipientCard}>
        <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
          RECIPIENT
        </Text>
        <Text
          style={[Typography.caption, { color: Colors.textPrimary, fontFamily: 'Menlo', marginTop: Spacing.sm }]}
          numberOfLines={1}
        >
          {currentAnalysis.transaction.recipient}
        </Text>
      </Card>

      {/* Slider */}
      <View style={styles.sliderSection}>
        <Text style={[Typography.bodyStrong, { color: Colors.textPrimary, marginBottom: Spacing.lg }]}>
          Adjust Amount
        </Text>
        <Card variant="surface" style={styles.sliderCard}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={requestedAmount}
            value={approvedAmount}
            onValueChange={(value: number) => setApprovedAmount(Math.round(value * 100) / 100)}
            step={0.1}
            minimumTrackTintColor={Colors.warning}
            maximumTrackTintColor={Colors.border}
            thumbTintColor={Colors.warning}
          />

          <View style={styles.sliderValues}>
            <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
              0 SOL
            </Text>
            <Text style={[Typography.captionStrong, { color: Colors.warning }]}>
              {percentageApproved}%
            </Text>
            <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
              {requestedAmount} SOL
            </Text>
          </View>
        </Card>
      </View>

      {/* Why Partial */}
      <View style={styles.reasonSection}>
        <Text style={[Typography.bodyStrong, { color: Colors.textPrimary, marginBottom: Spacing.md }]}>
          Why Partial?
        </Text>
        <Card variant="surface">
          <Text style={[Typography.body, { color: Colors.textSecondary, lineHeight: 22 }]}>
            This amount deviates from your typical spending patterns. By approving only part of this transaction, we reduce risk while still letting you send funds.
          </Text>
          <Text
            style={[Typography.body, { color: Colors.textSecondary, marginTop: Spacing.md, lineHeight: 22 }]}
          >
            You can request a new transaction for the remaining {remainingAmount} SOL anytime.
          </Text>
        </Card>
      </View>

      {/* Risk Assessment */}
      <View style={styles.riskSection}>
        <Text style={[Typography.bodyStrong, { color: Colors.textPrimary, marginBottom: Spacing.md }]}>
          Risk Profile
        </Text>
        <Card variant="surface">
          <ScoreBar
            label="Deviation Score"
            value={currentAnalysis.scores.deviationScore}
          />
          <ScoreBar
            label="Impact Score"
            value={currentAnalysis.scores.impactScore}
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
          title={confirming ? 'Processing...' : `Approve ${approvedAmount} SOL`}
          variant="partial"
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
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  recipientCard: {
    marginBottom: Spacing.xl,
  },
  sliderSection: {
    marginBottom: Spacing.xl,
  },
  sliderCard: {
    paddingVertical: Spacing.lg,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  reasonSection: {
    marginBottom: Spacing.xl,
  },
  riskSection: {
    marginBottom: Spacing.xl,
  },
  buttonContainer: {
    paddingBottom: Spacing.xl,
  },
});
