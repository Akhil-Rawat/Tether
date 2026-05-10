import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaWrapper, Card, Button, LoadingOverlay } from '../components';
import { Colors, Typography, Spacing } from '../themes';
import type { RootStackParamList } from '../types';
import { useOCRStore } from '../store/ocrStore';
import { useTransactionStore } from '../store/transactionStore';
import { OCR_DEMO_CASES } from '../services/ocr/demoCases';
import { getThreatColor } from '../services/ocr/threatDatabase';

type Props = NativeStackScreenProps<RootStackParamList, 'OCRScan'>;

export const OCRScanScreen: React.FC<Props> = ({ navigation }) => {
  const loadDemoCase = useOCRStore((state) => state.loadDemoCase);
  const scanImage = useOCRStore((state) => state.scanImage);
  const currentScan = useOCRStore((state) => state.currentScan);
  const currentDemoCase = useOCRStore((state) => state.currentDemoCase);
  const isScanning = useOCRStore((state) => state.isScanning);
  const error = useOCRStore((state) => state.error);
  const setThreatScan = useTransactionStore((state) => state.setThreatScan);

  const openThreatAnalysis = async () => {
    const scan = currentScan;
    if (!scan) return;

    setThreatScan(scan);
    navigation.navigate('ThreatAnalysis', { scanId: scan.analysis.id });
  };

  const handleLaunchPicker = async (mode: 'camera' | 'upload' | 'qr') => {
    const result =
      mode === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 1,
            allowsEditing: false,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 1,
            allowsEditing: false,
            selectionLimit: 1,
          });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return;
    }

    const scan = await scanImage(result.assets[0].uri, mode);
    if (scan) {
      setThreatScan(scan);
      navigation.navigate('ThreatAnalysis', { scanId: scan.analysis.id });
    }
  };

  const handleDemo = async (demoCaseId: string) => {
    const scan = await loadDemoCase(demoCaseId);
    if (scan) {
      setThreatScan(scan);
      navigation.navigate('ThreatAnalysis', { scanId: scan.analysis.id });
    }
  };

  return (
    <SafeAreaWrapper scroll>
      <LoadingOverlay visible={isScanning} title="Scanning locally" subtitle="QVAC OCR and threat analysis run on device" />

      <View style={styles.header}>
        <Text style={[Typography.h2, { color: Colors.textPrimary }]}>OCR Threat Scan</Text>
        <Text style={[Typography.body, { color: Colors.textSecondary, marginTop: Spacing.sm }]}>Scan wallet screenshots, QR codes, phishing pages, and scam token screens offline.</Text>
      </View>

      <Card variant="elevated" style={styles.actionsCard}>
        <Button title="Capture Screenshot" variant="primary" size="lg" onPress={() => handleLaunchPicker('upload')} style={styles.actionButton} />
        <Button title="Use Camera" variant="secondary" size="lg" onPress={() => handleLaunchPicker('camera')} style={styles.actionButton} />
        <Button title="Import QR Image" variant="warning" size="lg" onPress={() => handleLaunchPicker('qr')} />
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={[Typography.bodyStrong, { color: Colors.textPrimary }]}>Demo Mode</Text>
        <Text style={[Typography.caption, { color: Colors.textSecondary, marginTop: Spacing.xs }]}>Reproducible phishing examples for offline testing.</Text>
      </View>

      {OCR_DEMO_CASES.map((demoCase) => (
        <Card key={demoCase.id} variant="surface" style={styles.demoCard}>
          <View style={styles.demoTopRow}>
            <View style={[styles.demoDot, { backgroundColor: getThreatColor('HIGH') }]} />
            <View style={styles.demoTextBlock}>
              <Text style={[Typography.bodyStrong, { color: Colors.textPrimary }]}>{demoCase.title}</Text>
              <Text style={[Typography.caption, { color: Colors.textSecondary, marginTop: Spacing.xs }]}>{demoCase.description}</Text>
            </View>
          </View>

          <Card variant="default" padding={Spacing.md} style={styles.previewCard}>
            <Text style={[Typography.captionStrong, { color: Colors.error, marginBottom: Spacing.xs }]}>{demoCase.previewLabel}</Text>
            <Text style={[Typography.caption, { color: Colors.textSecondary }]} numberOfLines={4}>
              {demoCase.rawText}
            </Text>
          </Card>

          <Button title="Load Demo" variant="partial" size="md" onPress={() => handleDemo(demoCase.id)} />
        </Card>
      ))}

      {currentScan ? (
        <Card variant="surface" style={styles.activeCard}>
          <Text style={[Typography.caption, { color: Colors.textSecondary }]}>LAST SCAN</Text>
          <Text style={[Typography.bodyStrong, { color: Colors.textPrimary, marginTop: Spacing.xs }]}>{currentDemoCase?.title ?? 'Custom scan'}</Text>
          <Text style={[Typography.caption, { color: Colors.textSecondary, marginTop: Spacing.sm }]} numberOfLines={2}>
            {currentScan.analysis.summary}
          </Text>
          <Button title="Review Threat Analysis" variant="primary" size="md" onPress={openThreatAnalysis} style={{ marginTop: Spacing.md }} />
        </Card>
      ) : null}

      {error ? (
        <Card variant="surface" style={styles.errorCard}>
          <Text style={[Typography.caption, { color: Colors.error }]}>{error}</Text>
        </Card>
      ) : null}
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: Spacing.xl,
  },
  actionsCard: {
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  actionButton: {
    marginBottom: Spacing.sm,
  },
  sectionHeader: {
    marginBottom: Spacing.md,
  },
  demoCard: {
    marginBottom: Spacing.md,
  },
  demoTopRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  demoDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
  },
  demoTextBlock: {
    flex: 1,
  },
  previewCard: {
    marginBottom: Spacing.md,
  },
  activeCard: {
    marginTop: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  errorCard: {
    marginTop: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
});