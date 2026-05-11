/**
 * AnalysisScreen
 * Hero screen displaying live Guardian analysis and decision
 */

import React, { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  SafeAreaWrapper,
  Card,
  Button,
  ScoreBar,
  DecisionBadge,
  LoadingOverlay,
} from "../components";
import { useTransactionStore } from "../store/transactionStore";
import { Colors, Typography, Spacing } from "../themes";
import type { RootStackParamList } from "../types";
import { DecisionType } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Analysis">;

const decisionTitles: Record<DecisionType, string> = {
  [DecisionType.ALLOW]: "Transaction Approved",
  [DecisionType.REJECT]: "Transaction Blocked",
  [DecisionType.DELAY]: "Delayed Execution",
  [DecisionType.PARTIAL]: "Partial Approval",
};

export const AnalysisScreen: React.FC<Props> = ({ navigation, route }) => {
  const currentTransaction = useTransactionStore(
    (state) => state.currentTransaction,
  );
  const currentAnalysis = useTransactionStore((state) => state.currentAnalysis);
  const blockchainError = useTransactionStore((state) => state.blockchainError);
  const isAnalyzing = useTransactionStore((state) => state.isAnalyzing);
  const isExecuting = useTransactionStore((state) => state.isExecuting);
  const analyzeCurrentTransaction = useTransactionStore(
    (state) => state.analyzeCurrentTransaction,
  );
  const executeCurrentTransaction = useTransactionStore(
    (state) => state.executeCurrentTransaction,
  );
  const confirmationStatus = useTransactionStore(
    (state) => state.confirmationStatus,
  );
  const transactionSignature = useTransactionStore(
    (s) => s.transactionSignature,
  );
  const explorerUrl = useTransactionStore((s) => s.explorerUrl);

  useEffect(() => {
    if (!currentAnalysis && currentTransaction && !isAnalyzing) {
      void analyzeCurrentTransaction();
    }
  }, [
    analyzeCurrentTransaction,
    currentAnalysis,
    currentTransaction,
    isAnalyzing,
    route.params.transactionId,
  ]);

  useEffect(() => {
    if (confirmationStatus === "confirmed") {
      navigation.replace("Success", {
        transactionSignature:
          useTransactionStore.getState().transactionSignature ?? undefined,
        explorerUrl: useTransactionStore.getState().explorerUrl ?? undefined,
        decisionHash: useTransactionStore.getState().decisionHash ?? undefined,
      });
    }
  }, [confirmationStatus, navigation]);

  const hasAnalysis = Boolean(currentAnalysis);

  if (isAnalyzing || !hasAnalysis) {
    return (
      <SafeAreaWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[Typography.body, styles.loadingText]}>
            Guardian is analyzing your transaction using live devnet state...
          </Text>
        </View>
        <LoadingOverlay
          visible={isExecuting}
          title="Submitting to Devnet"
          subtitle="Building the signed Guardian transaction"
        />
      </SafeAreaWrapper>
    );
  }

  const {
    decision,
    scores,
    reasoning,
    riskFactors,
    behaviorAnalysis,
    recommendedAction,
    decisionHash,
  } = currentAnalysis;

  const handleImmediateExecute = async () => {
    const result = await executeCurrentTransaction();
    if (result?.success && result.transactionSignature) {
      navigation.replace("Success", {
        transactionSignature: result.transactionSignature,
        explorerUrl: result.explorerUrl,
        decisionHash: result.decisionHash,
      });
    }
  };

  const handleDecisionAction = () => {
    if (decision === DecisionType.DELAY) {
      navigation.navigate("Delay", { analysisId: currentAnalysis.id });
      return;
    }

    if (decision === DecisionType.PARTIAL) {
      navigation.navigate("PartialApproval", {
        analysisId: currentAnalysis.id,
      });
      return;
    }

    if (decision === DecisionType.ALLOW) {
      void handleImmediateExecute();
      return;
    }

    navigation.navigate("Home");
  };

  return (
    <SafeAreaWrapper scroll>
      <LoadingOverlay
        visible={isExecuting}
        title="Sending to Devnet"
        subtitle="Guardian is building and submitting the real signed transaction"
      />

      <View style={styles.badgeContainer}>
        <DecisionBadge decision={decision} size="lg" />
      </View>

      <View style={styles.titleContainer}>
        <Text
          style={[
            Typography.h2,
            { color: Colors.textPrimary, textAlign: "center" },
          ]}
        >
          {decisionTitles[decision]}
        </Text>
        <Text
          style={[
            Typography.body,
            {
              color: Colors.textSecondary,
              textAlign: "center",
              marginTop: Spacing.md,
            },
          ]}
        >
          {recommendedAction}
        </Text>
        {decisionHash ? (
          <Text
            style={[
              Typography.caption,
              {
                color: Colors.textTertiary,
                textAlign: "center",
                marginTop: Spacing.sm,
              },
            ]}
          >
            Decision Hash: {decisionHash}
          </Text>
        ) : null}
        {transactionSignature ? (
          <Text
            style={[
              Typography.caption,
              {
                color: Colors.textTertiary,
                textAlign: "center",
                marginTop: Spacing.sm,
              },
            ]}
          >
            Tx: {transactionSignature}
          </Text>
        ) : null}
      </View>

      <Card variant="elevated" style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
            AMOUNT
          </Text>
          <Text style={[Typography.bodyStrong, { color: Colors.textPrimary }]}>
            {currentAnalysis.transaction.amountSol} SOL
          </Text>
        </View>
        <View style={[styles.summaryRow, { marginTop: Spacing.md }]}>
          <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
            RECIPIENT
          </Text>
          <Text
            style={[Typography.caption, styles.monospace]}
            numberOfLines={1}
          >
            {currentAnalysis.transaction.recipient}
          </Text>
        </View>
        <View style={[styles.summaryRow, { marginTop: Spacing.md }]}>
          <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
            BALANCE
          </Text>
          <Text style={[Typography.caption, { color: Colors.textPrimary }]}>
            {(Number(currentAnalysis.balanceLamports) / 1_000_000_000).toFixed(
              4,
            )}{" "}
            SOL
          </Text>
        </View>
      </Card>

      <View style={styles.scoresSection}>
        <Text
          style={[
            Typography.bodyStrong,
            { color: Colors.textPrimary, marginBottom: Spacing.lg },
          ]}
        >
          Analysis Scores
        </Text>
        <Card variant="surface">
          <ScoreBar
            label="Confidence"
            value={scores.confidence}
            color={Colors.primary}
          />
          <ScoreBar label="Risk Score" value={scores.riskScore} />
          <ScoreBar label="Deviation" value={scores.deviationScore} />
          <ScoreBar label="Impact" value={scores.impactScore} />
        </Card>
      </View>

      <View style={styles.reasoningSection}>
        <Text
          style={[
            Typography.bodyStrong,
            { color: Colors.textPrimary, marginBottom: Spacing.md },
          ]}
        >
          AI Reasoning
        </Text>
        <Card variant="surface">
          <Text
            style={[
              Typography.body,
              { color: Colors.textSecondary, lineHeight: 22 },
            ]}
          >
            {reasoning}
          </Text>
        </Card>
      </View>

      {riskFactors.length > 0 && (
        <View style={styles.riskSection}>
          <Text
            style={[
              Typography.bodyStrong,
              { color: Colors.textPrimary, marginBottom: Spacing.md },
            ]}
          >
            Risk Factors
          </Text>
          <Card variant="surface">
            {riskFactors.map((factor) => (
              <View key={factor} style={styles.riskFactor}>
                <Text style={[Typography.body, { color: Colors.warning }]}>
                  • {factor}
                </Text>
              </View>
            ))}
          </Card>
        </View>
      )}

      <View style={styles.behaviorSection}>
        <Text
          style={[
            Typography.bodyStrong,
            { color: Colors.textPrimary, marginBottom: Spacing.md },
          ]}
        >
          Live Behavior Analysis
        </Text>
        <Card variant="surface">
          <Text
            style={[
              Typography.body,
              { color: Colors.textSecondary, lineHeight: 22 },
            ]}
          >
            {behaviorAnalysis}
          </Text>
        </Card>
      </View>

      {blockchainError ? (
        <Card variant="surface" style={styles.errorCard}>
          <Text style={[Typography.caption, { color: Colors.error }]}>
            {blockchainError}
          </Text>
        </Card>
      ) : null}

      {explorerUrl ? (
        <Card variant="surface" style={{ marginTop: Spacing.md }}>
          <Text
            style={[Typography.caption, { color: Colors.primary }]}
            onPress={() => {
              // open explorer link via navigation or Linking
              // Keep behavior simple: copy or inform; for now log
              console.log("[Explorer] Open:", explorerUrl);
            }}
          >
            {explorerUrl}
          </Text>
        </Card>
      ) : null}

      <View style={styles.buttonContainer}>
        {decision === DecisionType.ALLOW && (
          <Button
            title="Send Immediately"
            variant="success"
            size="lg"
            onPress={handleDecisionAction}
          />
        )}
        {decision === DecisionType.REJECT && (
          <Button
            title="Return to Home"
            variant="secondary"
            size="lg"
            onPress={() => navigation.navigate("Home")}
          />
        )}
        {decision === DecisionType.DELAY && (
          <>
            <Button
              title="Configure Delay"
              variant="warning"
              size="lg"
              onPress={handleDecisionAction}
              style={{ marginBottom: Spacing.md }}
            />
            <Button
              title="Cancel"
              variant="secondary"
              size="lg"
              onPress={() => navigation.navigate("Home")}
            />
          </>
        )}
        {decision === DecisionType.PARTIAL && (
          <>
            <Button
              title="Adjust Partial Approval"
              variant="partial"
              size="lg"
              onPress={handleDecisionAction}
              style={{ marginBottom: Spacing.md }}
            />
            <Button
              title="Cancel"
              variant="secondary"
              size="lg"
              onPress={() => navigation.navigate("Home")}
            />
          </>
        )}
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    minHeight: 280,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
    textAlign: "center",
  },
  badgeContainer: {
    alignItems: "center",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  monospace: {
    color: Colors.textPrimary,
    fontFamily: "Menlo",
    flex: 1,
    textAlign: "right",
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
  errorCard: {
    marginBottom: Spacing.xl,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  buttonContainer: {
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
});
