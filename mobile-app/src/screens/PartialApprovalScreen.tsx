/**
 * PartialApprovalScreen
 * Screen for confirming partial amount approval
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Slider from '@react-native-community/slider';
import { SafeAreaWrapper, Card, Button, ScoreBar, LoadingOverlay } from '../components';
import { useTransactionStore } from '../store/transactionStore';
import { Colors, Typography, Spacing } from '../themes';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'PartialApproval'>;

export const PartialApprovalScreen: React.FC<Props> = ({ navigation }) => {
  const currentAnalysis = useTransactionStore((state) => state.currentAnalysis);
  const executeCurrentTransaction = useTransactionStore((state) => state.executeCurrentTransaction);
  const isExecuting = useTransactionStore((state) => state.isExecuting);
  const [confirming, setConfirming] = useState(false);

  if (!currentAnalysis) {
    return (
      <SafeAreaWrapper>
        <Text style={[Typography.body, { color: Colors.error }]}>No analysis found</Text>
      </SafeAreaWrapper>
    );
  }

  const requestedAmountLamports = currentAnalysis.transaction.amountLamports;
  const requestedAmountSol = currentAnalysis.transaction.amountSol;
  const defaultApprovedLamports = useMemo(() => {
    return requestedAmountLamports / 2n;
  }, [requestedAmountLamports]);
  const [approvedAmountLamports, setApprovedAmountLamports] = useState(defaultApprovedLamports);
  const remainingAmountLamports = requestedAmountLamports - approvedAmountLamports;
  const percentageApproved = Math.max(0, Math.round((Number(approvedAmountLamports) / Number(requestedAmountLamports)) * 100));

  const approvedAmountSol = Number(approvedAmountLamports) / 1_000_000_000;
  const remainingAmountSol = Number(remainingAmountLamports) / 1_000_000_000;

  const handleConfirm = async () => {
    setConfirming(true);
    const result = await executeCurrentTransaction({ approvalAmountLamports: approvedAmountLamports });
    setConfirming(false);

    if (result?.success && result.transactionSignature) {
      navigation.replace('Success', {
        transactionSignature: result.transactionSignature,
        explorerUrl: result.explorerUrl,
        decisionHash: result.decisionHash,
      });
    }
  };

  return (
    <SafeAreaWrapper scroll>
      <LoadingOverlay
        visible={confirming || isExecuting}
        title="Submitting partial approval"
        subtitle="Guardian will cap the transfer on devnet and submit the signed transaction"
      />

      <View style={styles.header}>
        <Text style={[Typography.h2, { color: Colors.textPrimary }]}>Partial Approval</Text>
        <Text style={[Typography.body, { color: Colors.textSecondary }]}>Choose how much to approve</Text>
      </View>

      <Card variant="elevated" style={styles.summaryCard}>
        <View style={styles.amountRow}>
          <View>
            <Text style={[Typography.caption, { color: Colors.textSecondary }]}>REQUESTED</Text>
            <Text style={[Typography.h3, { color: Colors.textSecondary }]}>{requestedAmountSol} SOL</Text>
          </View>
          <Text style={[Typography.h3, { color: Colors.textSecondary }]}>→</Text>
          <View>
            <Text style={[Typography.caption, { color: Colors.warning }]}>APPROVED</Text>
            <Text style={[Typography.h3, { color: Colors.warning }]}>{approvedAmountSol.toFixed(4)} SOL</Text>
          </View>
        </View>

        {remainingAmountLamports > 0n ? (
          <>
            <View style={styles.divider} />
            <View>
              <Text style={[Typography.caption, { color: Colors.textSecondary }]}>REMAINING AFTER APPROVAL</Text>
              <Text style={[Typography.bodyStrong, { color: Colors.success }]}>
                {remainingAmountSol.toFixed(4)} SOL (can be requested separately)
              </Text>
            </View>
          </>
        ) : null}
      </Card>

      <Card variant="surface" style={styles.recipientCard}>
        <Text style={[Typography.caption, { color: Colors.textSecondary }]}>RECIPIENT</Text>
        <Text style={[Typography.caption, { color: Colors.textPrimary, fontFamily: 'Menlo', marginTop: Spacing.sm }]} numberOfLines={1}>
          {currentAnalysis.transaction.recipient}
        </Text>
      </Card>

      <View style={styles.sliderSection}>
        <Text style={[Typography.bodyStrong, { color: Colors.textPrimary, marginBottom: Spacing.lg }]}>Adjust Amount</Text>
        <Card variant="surface" style={styles.sliderCard}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={requestedAmountSol}
            value={approvedAmountSol}
            onValueChange={(value) => {
              const clamped = Math.max(0, Math.min(value, requestedAmountSol));
              setApprovedAmountLamports(BigInt(Math.round(clamped * 1_000_000_000)));
            }}
            step={0.0001}
            minimumTrackTintColor={Colors.warning}
            maximumTrackTintColor={Colors.border}
            thumbTintColor={Colors.warning}
          />

          <View style={styles.sliderValues}>
            <Text style={[Typography.caption, { color: Colors.textSecondary }]}>0 SOL</Text>
            <Text style={[Typography.captionStrong, { color: Colors.warning }]}>{percentageApproved}%</Text>
            <Text style={[Typography.caption, { color: Colors.textSecondary }]}>{requestedAmountSol} SOL</Text>
          </View>
        </Card>
      </View>

      <View style={styles.reasonSection}>
        <Text style={[Typography.bodyStrong, { color: Colors.textPrimary, marginBottom: Spacing.md }]}>Why Partial?</Text>
        <Card variant="surface">
          <Text style={[Typography.body, { color: Colors.textSecondary, lineHeight: 22 }]}>
            Guardian detected elevated risk in the live devnet state. A partial approval reduces exposure while still letting the transfer proceed.
          </Text>
          <Text style={[Typography.body, { color: Colors.textSecondary, marginTop: Spacing.md, lineHeight: 22 }]}>
            You can request the remaining {remainingAmountSol.toFixed(4)} SOL separately.
          </Text>
        </Card>
      </View>

      <View style={styles.riskSection}>
        <Text style={[Typography.bodyStrong, { color: Colors.textPrimary, marginBottom: Spacing.md }]}>Risk Profile</Text>
        <Card variant="surface">
          <ScoreBar label="Deviation Score" value={currentAnalysis.scores.deviationScore} />
          <ScoreBar label="Impact Score" value={currentAnalysis.scores.impactScore} />
          <ScoreBar label="Confidence" value={currentAnalysis.scores.confidence} color={Colors.primary} />
        </Card>
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title={confirming ? 'Processing...' : `Approve ${approvedAmountSol.toFixed(4)} SOL`}
          variant="partial"
          size="lg"
          loading={confirming}
          disabled={confirming}
          onPress={handleConfirm}
          style={{ marginBottom: Spacing.md }}
        />
        <Button title="Cancel" variant="secondary" size="lg" disabled={confirming} onPress={() => navigation.goBack()} />
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
