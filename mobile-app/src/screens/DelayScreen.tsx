/**
 * DelayScreen
 * Screen for confirming delayed execution timelock
 */

import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  SafeAreaWrapper,
  Card,
  Button,
  ScoreBar,
  LoadingOverlay,
} from "../components";
import { useTransactionStore } from "../store/transactionStore";
import { Colors, Typography, Spacing } from "../themes";
import type { RootStackParamList } from "../types";

import { DecisionType } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Delay">;

const DELAY_OPTIONS = [
  { label: "1 Hour", seconds: 3600, description: "Quick verification window" },
  { label: "6 Hours", seconds: 21600, description: "Standard timelock" },
  { label: "24 Hours", seconds: 86400, description: "Full day to verify" },
  { label: "3 Days", seconds: 259200, description: "Extended review period" },
  { label: "7 Days", seconds: 604800, description: "Maximum timelock" },
];

export const DelayScreen: React.FC<Props> = ({ navigation, route }) => {
  const [selectedDelay, setSelectedDelay] = useState(DELAY_OPTIONS[0]);
  const [confirming, setConfirming] = useState(false);

  const currentAnalysis = useTransactionStore((state) => state.currentAnalysis);
  const latestExecution = useTransactionStore((state) => state.latestExecution);
  const history = useTransactionStore((state) => state.history);
  const executeCurrentTransaction = useTransactionStore(
    (state) => state.executeCurrentTransaction,
  );
  const isExecuting = useTransactionStore((state) => state.isExecuting);

  const analysisFromRoute =
    history.find((item) => item.id === route.params?.analysisId) ?? null;
  const activeAnalysis = currentAnalysis ?? analysisFromRoute;

  if (!activeAnalysis) {
    return (
      <SafeAreaWrapper>
        <View style={styles.emptyState}>
          <Text
            style={[
              Typography.h3,
              { color: Colors.textPrimary, textAlign: "center" },
            ]}
          >
            Timelock saved
          </Text>
          <Text
            style={[
              Typography.body,
              {
                color: Colors.textSecondary,
                textAlign: "center",
                marginTop: Spacing.md,
                lineHeight: 22,
              },
            ]}
          >
            This transaction has already been handed off to Guardian. You can
            return to the dashboard to review the latest activity.
          </Text>
          {latestExecution?.transactionSignature ? (
            <Card variant="surface" style={styles.previewCard}>
              <Text
                style={[Typography.caption, { color: Colors.textSecondary }]}
              >
                LAST RESULT
              </Text>
              <Text
                style={[
                  Typography.bodyStrong,
                  { color: Colors.primary, marginTop: Spacing.sm },
                ]}
              >
                {latestExecution.success
                  ? "Delayed transaction submitted"
                  : "Delay flow completed"}
              </Text>
              <Text
                style={[
                  Typography.caption,
                  { color: Colors.textSecondary, marginTop: Spacing.sm },
                ]}
                numberOfLines={2}
              >
                {latestExecution.transactionSignature}
              </Text>
            </Card>
          ) : null}
          <Button
            title="Back to Dashboard"
            variant="secondary"
            size="lg"
            onPress={() => navigation.navigate("Home")}
            style={{ marginTop: Spacing.xl }}
          />
        </View>
      </SafeAreaWrapper>
    );
  }

  const handleConfirm = async () => {
    setConfirming(true);
    const result = await executeCurrentTransaction({
      delaySecondsOverride: selectedDelay.seconds,
    });
    setConfirming(false);

    if (result?.success && result.transactionSignature) {
      navigation.replace("Success", {
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
        title="Submitting delayed transaction"
        subtitle="Guardian will create the timelock PDA on devnet"
      />

      <View style={styles.header}>
        <Text style={[Typography.h2, { color: Colors.textPrimary }]}>
          Set Timelock
        </Text>
        <Text style={[Typography.body, { color: Colors.textSecondary }]}>
          Choose when to execute this transaction
        </Text>
      </View>

      <Card variant="elevated" style={styles.summaryCard}>
        <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
          AMOUNT
        </Text>
        <Text style={[Typography.h3, { color: Colors.textPrimary }]}>
          {activeAnalysis.transaction.amountSol} SOL
        </Text>
        <View style={styles.divider} />
        <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
          TO
        </Text>
        <Text
          style={[
            Typography.caption,
            { color: Colors.textPrimary, fontFamily: "Menlo" },
          ]}
          numberOfLines={1}
        >
          {activeAnalysis.transaction.recipient}
        </Text>
      </Card>

      <Text
        style={[
          Typography.bodyStrong,
          { color: Colors.textPrimary, marginBottom: Spacing.md },
        ]}
      >
        Execution Window
      </Text>
      <View style={styles.optionsContainer}>
        {DELAY_OPTIONS.map((option) => (
          <Card
            key={option.seconds}
            variant={
              selectedDelay.seconds === option.seconds ? "elevated" : "surface"
            }
            onTouchEnd={() => setSelectedDelay(option)}
            style={[
              styles.delayOption,
              selectedDelay.seconds === option.seconds &&
                styles.delayOptionSelected,
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
            {selectedDelay.seconds === option.seconds ? (
              <Text style={styles.checkmark}>✓</Text>
            ) : null}
          </Card>
        ))}
      </View>

      <Card variant="surface" style={styles.previewCard}>
        <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
          DELAY WINDOW
        </Text>
        <Text
          style={[
            Typography.bodyStrong,
            { color: Colors.warning, marginTop: Spacing.sm },
          ]}
        >
          Guardian will hold this transfer for{" "}
          {selectedDelay.label.toLowerCase()} before execution.
        </Text>
        <Text
          style={[
            Typography.caption,
            {
              color: Colors.textSecondary,
              marginTop: Spacing.sm,
              lineHeight: 18,
            },
          ]}
        >
          The app shows the relative delay only. The exact clock time depends on
          when you confirm.
        </Text>
      </Card>

      <Card variant="surface" style={styles.reminderCard}>
        <View style={styles.reminderRow}>
          <Text style={styles.reminderIcon}>⏱️</Text>
          <Text
            style={[
              Typography.caption,
              { color: Colors.textSecondary, flex: 1 },
            ]}
          >
            This creates a real delayed transaction PDA on devnet. You can still
            cancel before execution.
          </Text>
        </View>
      </Card>

      <View style={styles.scoresSection}>
        <Text
          style={[
            Typography.bodyStrong,
            { color: Colors.textPrimary, marginBottom: Spacing.md },
          ]}
        >
          Risk Assessment
        </Text>
        <Card variant="surface">
          <ScoreBar
            label="Risk Score"
            value={activeAnalysis.scores.riskScore}
          />
          <ScoreBar
            label="Confidence"
            value={activeAnalysis.scores.confidence}
            color={Colors.primary}
          />
        </Card>
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title={confirming ? "Creating Timelock..." : "Confirm & Timelock"}
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
  emptyState: {
    minHeight: 360,
    justifyContent: "center",
  },
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    flexDirection: "row",
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
