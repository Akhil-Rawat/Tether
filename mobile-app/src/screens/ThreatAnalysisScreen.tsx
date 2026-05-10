import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaWrapper, Card, Button, ScoreBar } from '../components';
import { Colors, Typography, Spacing } from '../themes';
import type { RootStackParamList } from '../types';
import { useOCRStore } from '../store/ocrStore';
import { useTransactionStore } from '../store/transactionStore';
import { getThreatColor } from '../services/ocr/threatDatabase';
import { truncateAddress } from '../utils';

type Props = NativeStackScreenProps<RootStackParamList, 'ThreatAnalysis'>;

const highlightStyle = (severity: string) => {
  switch (severity) {
    case 'CRITICAL':
      return { color: Colors.error };
    case 'HIGH':
      return { color: Colors.accentLight };
    case 'MEDIUM':
      return { color: Colors.warning };
    default:
      return { color: Colors.textSecondary };
  }
};

export const ThreatAnalysisScreen: React.FC<Props> = ({ navigation }) => {
  const currentScan = useOCRStore((state) => state.currentScan);
  const currentDemoCase = useOCRStore((state) => state.currentDemoCase);
  const setThreatScan = useTransactionStore((state) => state.setThreatScan);

  if (!currentScan) {
    return (
      <SafeAreaWrapper>
        <Card variant="surface">
          <Text style={[Typography.body, { color: Colors.textSecondary }]}>No OCR scan available.</Text>
          <Button title="Back to Scan" variant="primary" size="lg" onPress={() => navigation.navigate('OCRScan')} style={{ marginTop: Spacing.md }} />
        </Card>
      </SafeAreaWrapper>
    );
  }

  const { extraction, analysis } = currentScan;
  const topIndicators = analysis.indicators.slice(0, 3);

  const applyToGuardian = () => {
    setThreatScan(currentScan);
    navigation.navigate('Send');
  };

  return (
    <SafeAreaWrapper scroll>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: getThreatColor(analysis.threatLevel) }]} />
        <Text style={[Typography.h2, { color: Colors.textPrimary, marginTop: Spacing.md }]}>{analysis.summary}</Text>
        <Text style={[Typography.body, { color: Colors.textSecondary, marginTop: Spacing.sm }]}>{currentDemoCase?.title ?? 'Live OCR scan'}</Text>
      </View>

      <Card variant="elevated" style={styles.scoreCard}>
        <ScoreBar label="Phishing Probability" value={analysis.phishingProbability} color={Colors.error} />
        <ScoreBar label="Scam Confidence" value={analysis.scamConfidence} color={Colors.warning} />
        <ScoreBar label="Threat Severity" value={analysis.threatScore} color={Colors.primary} />
      </Card>

      <Card variant="surface" style={styles.recommendationCard}>
        <Text style={[Typography.caption, { color: Colors.textSecondary }]}>RECOMMENDED ACTION</Text>
        <Text style={[Typography.bodyStrong, { color: analysis.recommendedAction === 'REJECT' ? Colors.error : analysis.recommendedAction === 'REVIEW' ? Colors.warning : Colors.success, marginTop: Spacing.xs }]}>
          {analysis.recommendedAction}
        </Text>
        <Text style={[Typography.body, { color: Colors.textSecondary, marginTop: Spacing.sm, lineHeight: 22 }]}>{analysis.reasoning}</Text>
      </Card>

      <Card variant="surface" style={styles.sectionCard}>
        <Text style={[Typography.bodyStrong, { color: Colors.textPrimary, marginBottom: Spacing.sm }]}>Extracted Text</Text>
        <Text style={[Typography.body, { color: Colors.textSecondary, lineHeight: 22 }]} selectable>
          {extraction.rawText}
        </Text>
      </Card>

      <Card variant="surface" style={styles.sectionCard}>
        <Text style={[Typography.bodyStrong, { color: Colors.textPrimary, marginBottom: Spacing.sm }]}>Suspicious Highlights</Text>
        <View style={styles.tagWrap}>
          {extraction.extractedElements.addresses.map((item) => (
            <Text key={item} style={[Typography.caption, styles.tag, { color: Colors.error }]}>Address: {truncateAddress(item, 6)}</Text>
          ))}
          {extraction.extractedElements.urls.map((item) => (
            <Text key={item} style={[Typography.caption, styles.tag, { color: Colors.accentLight }]}>URL: {item}</Text>
          ))}
          {extraction.extractedElements.tokens.map((item) => (
            <Text key={item} style={[Typography.caption, styles.tag, { color: Colors.warning }]}>Token: {item}</Text>
          ))}
          {extraction.extractedElements.phrases.map((item) => (
            <Text key={item} style={[Typography.caption, styles.tag, { color: Colors.textSecondary }]}>Phrase: {item}</Text>
          ))}
        </View>
      </Card>

      {topIndicators.length > 0 ? (
        <Card variant="surface" style={styles.sectionCard}>
          <Text style={[Typography.bodyStrong, { color: Colors.textPrimary, marginBottom: Spacing.sm }]}>Threat Indicators</Text>
          {topIndicators.map((indicator) => (
            <View key={`${indicator.type}-${indicator.highlightedText}`} style={styles.indicatorRow}>
              <View style={styles.indicatorTextWrap}>
                <Text style={[Typography.captionStrong, highlightStyle(indicator.severity)]}>{indicator.type.toUpperCase()}</Text>
                <Text style={[Typography.caption, { color: Colors.textSecondary, marginTop: Spacing.xs }]}>{indicator.description}</Text>
                <Text style={[Typography.caption, { color: Colors.textTertiary, marginTop: Spacing.xs }]}>{indicator.recommendation}</Text>
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      <Card variant="surface" style={styles.sectionCard}>
        <Text style={[Typography.bodyStrong, { color: Colors.textPrimary, marginBottom: Spacing.sm }]}>Guardian Impact</Text>
        <Text style={[Typography.body, { color: Colors.textSecondary, lineHeight: 22 }]}>
          This threat context is stored locally and will influence the next transaction decision. High-confidence phishing findings push Guardian toward REJECT or DELAY automatically.
        </Text>
      </Card>

      <View style={styles.buttonStack}>
        <Button title={analysis.recommendedAction === 'REJECT' ? 'Block and Review Later' : 'Use This Threat Signal in Guardian'} variant={analysis.recommendedAction === 'REJECT' ? 'warning' : 'primary'} size="lg" onPress={applyToGuardian} />
        <Button title="Scan Another Image" variant="secondary" size="lg" onPress={() => navigation.navigate('OCRScan')} />
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: Spacing.xl,
  },
  badge: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  scoreCard: {
    marginBottom: Spacing.xl,
  },
  recommendationCard: {
    marginBottom: Spacing.xl,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  sectionCard: {
    marginBottom: Spacing.xl,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 999,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  indicatorRow: {
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  indicatorTextWrap: {
    flex: 1,
  },
  buttonStack: {
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
});