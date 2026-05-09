import React from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaWrapper, Card, Button, DecisionBadge } from '../components';
import { Colors, Typography, Spacing } from '../themes';
import type { RootStackParamList } from '../types';
import { DecisionType } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Success'>;

export const TransactionSuccessScreen: React.FC<Props> = ({ navigation, route }) => {
  const { transactionSignature, explorerUrl, decisionHash } = route.params;

  return (
    <SafeAreaWrapper>
      <View style={styles.container}>
        <DecisionBadge decision={DecisionType.ALLOW} size="lg" />
        <Text style={[Typography.h2, styles.title]}>Transaction Confirmed</Text>
        <Text style={[Typography.body, styles.subtitle]}>
          Guardian executed your transaction through devnet.
        </Text>

        <Card variant="elevated" style={styles.card}>
          <Text style={[Typography.caption, styles.label]}>TRANSACTION SIGNATURE</Text>
          <Text style={[Typography.caption, styles.value]} numberOfLines={2}>
            {transactionSignature ?? 'Pending'}
          </Text>

          <View style={styles.divider} />

          <Text style={[Typography.caption, styles.label]}>DECISION HASH</Text>
          <Text style={[Typography.caption, styles.value]} numberOfLines={2}>
            {decisionHash ?? 'Unavailable'}
          </Text>
        </Card>

        {explorerUrl ? (
          <Button
            title="Open Explorer"
            variant="primary"
            size="lg"
            onPress={() => Linking.openURL(explorerUrl)}
            style={styles.button}
          />
        ) : null}

        <Button
          title="Back to Home"
          variant="secondary"
          size="lg"
          onPress={() => navigation.navigate('Home')}
        />
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  title: {
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  card: {
    width: '100%',
  },
  label: {
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  value: {
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  button: {
    width: '100%',
  },
});
