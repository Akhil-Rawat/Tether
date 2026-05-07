/**
 * AnalysisScreen
 * Hero screen displaying AI analysis and decision
 * Shows decision, risk scores, confidence, reasoning, etc.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaWrapper, Card, Button, ScoreBar, DecisionBadge } from '../components';
import { useTransactionStore } from '../store/transactionStore';
import { DecisionExplanations } from '../mocks/analysisData';
import { Colors, Typography, Spacing, BorderRadius } from '../themes';
import type { RootStackParamList, DecisionType } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Analysis'>;

export const AnalysisScreen: React.FC<Props> = ({ navigation, route }) => {
  const { transactionId } = route.params;
  const isLoading = useTransactionStore((state) => state.isLoading);
  const currentAnalysis = useTransactionStore((state) => state.currentAnalysis);

  // Get explanation for current decision
  const explanation = useMemo(() => {
    if (!currentAnalysis) return '';
    return DecisionExplanations[currentAnalysis.decision as DecisionType];
  }, [currentAnalysis]);

  if (isLoading) {
    return (
      <SafeAreaWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text
            style={[
              Typography.body,
              { color: Colors.textSecondary, marginTop: Spacing.lg },
            ]}
          >
            Analyzing your transaction...
          </Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  if (!currentAnalysis) {
    return (
      <SafeAreaWrapper>
        <View style={styles.errorContainer}>
          <Text
            style={[
              Typography.body,
              { color: Colors.error, textAlign: 'center' },
            ]}
          >
            No analysis available
          </Text>
          <Button
            title="Go Back"
            variant="secondary"
            onPress={() => navigation.goBack()}
            style={{ marginTop: Spacing.lg }}
          />
        </View>
      </SafeAreaWrapper>
    );
  }

  const { transaction, decision, scores, reasoning, riskFactors, behaviorAnalysis } =
    currentAnalysis;

  const handleDecisionAction = () => {
    if (decision === 'DELAY') {
      navigation.navigate('Delay', { analysisId: currentAnalysis.id });
    } else if (decision === 'PARTIAL') {
      navigation.navigate('PartialApproval', { analysisId: currentAnalysis.id });
    } else {
      // For ALLOW/REJECT, go back or show confirmation
      navigation.navigate('Home');
    }
  };

  return (
    <SafeAreaWrapper scroll>
      {/* Decision Badge - Hero Element */}
      <View style={styles.badgeContainer}>
        <DecisionBadge decision={decision} size="lg" />
      </View>

      {/* Decision Title & Explanation */}
      <View style={styles.titleContainer}>
        <Text style={[Typography.h2, { color: Colors.textPrimary, textAlign: 'center' }]}>
          {decision === 'ALLOW' && 'Transaction Approved'}
          {decision === 'REJECT' && 'Transaction Blocked'}
          {decision === 'DELAY' && 'Delayed Execution'}
          {decision === 'PARTIAL' && 'Partial Approval'}
        </Text>
        <Text style={[Typography.body, { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.md }]}>
          {explanation}
        </Text>
      </View>

      {/* Transaction Summary */}
      <Card variant="elevated" style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
            AMOUNT
          </Text>
          <Text style={[Typography.bodyStrong, { color: Colors.textPrimary }]}>
            {transaction.amount} SOL
          </Text>
        </View>
        <View style={[styles.summaryRow, { marginTop: Spacing.md }]}>
          <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
            RECIPIENT
          </Text>
          <Text
            style={[Typography.caption, { color: Colors.textPrimary, fontFamily: 'Menlo' }]}
            numberOfLines={1}
          >
            {transaction.recipient}
          </Text>
        </View>
      </Card>

      {/* Score Breakdown - The Key Metrics */}
      <View style={styles.scoresSection}>
        <Text style={[Typography.bodyStrong, { color: Colors.textPrimary, marginBottom: Spacing.lg }]}>
          Analysis Scores
        </Text>
        <Card variant="surface">
          <ScoreBar
            label="Confidence"
            value={scores.confidence}
            color={Colors.primary}
          />
          <ScoreBar
            label="Risk Score"
            value={scores.riskScore}
            color={undefined} // Auto-color based on value
          />
          <ScoreBar
            label="Deviation"
            value={scores.deviationScore}
            color={undefined}
          />
          <ScoreBar
            label="Impact"
            value={scores.impactScore}
            color={undefined}
          />
        </Card>
      </View>

      {/* AI Reasoning */}
      <View style={styles.reasoningSection}>
        <Text style={[Typography.bodyStrong, { color: Colors.textPrimary, marginBottom: Spacing.md }]}>
          AI Reasoning
        </Text>
        <Card variant="surface">
          <Text style={[Typography.body, { color: Colors.textSecondary, lineHeight: 22 }]}>
            {reasoning}
          </Text>
        </Card>
      </View>

      {/* Risk Factors */}
      {riskFactors.length > 0 && (
        <View style={styles.riskSection}>
          <Text style={[Typography.bodyStrong, { color: Colors.textPrimary, marginBottom: Spacing.md }]}>
            Risk Factors
          </Text>
          <Card variant="surface">
            {riskFactors.map((factor, index) => (
              <View key={index} style={styles.riskFactor}>
                <Text style={[Typography.body, { color: Colors.warning }]}>
                  • {factor}
                </Text>
              </View>
            ))}
          </Card>
        </View>
      )}

      {/* Behavior Analysis */}
      <View style={styles.behaviorSection}>
        <Text style={[Typography.bodyStrong, { color: Colors.textPrimary, marginBottom: Spacing.md }]}>
          Your Behavior
        </Text>
        <Card variant="surface">
          <Text style={[Typography.body, { color: Colors.textSecondary, lineHeight: 22 }]}>
            {behaviorAnalysis}
          </Text>
        </Card>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {decision === 'ALLOW' && (
          <Button
            title="Approve & Send"
            variant="success"
            size="lg"
            onPress={handleDecisionAction}
          />
        )}
        {decision === 'REJECT' && (
          <Button
            title="Return to Home"
            variant="secondary"
            size="lg"
            onPress={() => navigation.navigate('Home')}
          />
        )}
        {decision === 'DELAY' && (
          <>
            <Button
              title="Set Timelock"
              variant="warning"
              size="lg"
              onPress={handleDecisionAction}
              style={{ marginBottom: Spacing.md }}
            />
            <Button
              title="Cancel"
              variant="secondary"
              size="lg"
              onPress={() => navigation.navigate('Home')}
            />
          </>
        )}
        {decision === 'PARTIAL' && (
          <>
            <Button
              title="Approve Partial Amount"
              variant="partial"
              size="lg"
              onPress={handleDecisionAction}
              style={{ marginBottom: Spacing.md }}
            />
            <Button
              title="Cancel"
              variant="secondary"
              size="lg"
              onPress={() => navigation.navigate('Home')}
            />
          </>
        )}
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  badgeContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing.lg,
  },
  titleContainer: {
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  summaryCard: {
    marginBottom: Spacing.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoresSection: {
    marginBottom: Spacing.xl,
  },
  reasoningSection: {
    marginBottom: Spacing.xl,
  },
  riskSection: {
    marginBottom: Spacing.xl,
  },
  riskFactor: {
    paddingVertical: Spacing.sm,
  },
  behaviorSection: {
    marginBottom: Spacing.xl,
  },
  buttonContainer: {
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
});
