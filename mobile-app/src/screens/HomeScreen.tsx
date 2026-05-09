/**
 * HomeScreen
 * Initial screen showing recent transaction history and quick actions
 */

import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaWrapper, Card, Button, DecisionBadge } from '../components';
import { useTransactionStore } from '../store/transactionStore';
import { Colors, Typography, Spacing } from '../themes';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const history = useTransactionStore((state) => state.history);

  return (
    <SafeAreaWrapper scroll>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
            Welcome back
          </Text>
          <Text style={[Typography.h2, { color: Colors.textPrimary }]}>
            Guardian
          </Text>
        </View>
        <View style={styles.lockIcon}>
          <Text style={styles.lockText}>🔒</Text>
        </View>
      </View>

      {/* Quick Stats */}
      <Card variant="elevated" style={styles.statsCard}>
        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={[Typography.tiny, { color: Colors.textSecondary }]}>
              TOTAL PROTECTED
            </Text>
            <Text style={[Typography.h3, { color: Colors.success }]}>
              {history.length}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={[Typography.tiny, { color: Colors.textSecondary }]}>
              BLOCKED
            </Text>
            <Text style={[Typography.h3, { color: Colors.error }]}>
              {history.filter((a) => a.decision === 'REJECT').length}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={[Typography.tiny, { color: Colors.textSecondary }]}>
              DELAYED
            </Text>
            <Text style={[Typography.h3, { color: Colors.warning }]}>
              {history.filter((a) => a.decision === 'DELAY').length}
            </Text>
          </View>
        </View>
      </Card>

      {/* Send New Transaction Button */}
      <Button
        title="Send Transaction"
        variant="primary"
        size="lg"
        onPress={() => navigation.navigate('Send')}
        style={styles.sendButton}
      />

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={[Typography.bodyStrong, { color: Colors.textPrimary }]}>
          Recent Activity
        </Text>
      </View>

      {history.length === 0 ? (
        <Card variant="surface" style={styles.emptyCard}>
          <Text
            style={[
              Typography.body,
              { color: Colors.textSecondary, textAlign: 'center' },
            ]}
          >
            No transactions yet. Send one to get started.
          </Text>
        </Card>
      ) : (
        <FlatList
          data={history}
          scrollEnabled={false}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card
              style={styles.historyItem}
              variant="surface"
              onTouchEnd={() =>
                navigation.navigate('Analysis', {
                  transactionId: item.transaction.id,
                })
              }
            >
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('Analysis', {
                    transactionId: item.transaction.id,
                  })
                }
                style={styles.historyContent}
              >
                <View style={styles.historyLeft}>
                  <View style={styles.historyTextContainer}>
                    <Text
                      style={[
                        Typography.bodyStrong,
                        { color: Colors.textPrimary },
                      ]}
                    >
                      {item.transaction.amountSol} SOL
                    </Text>
                    <Text
                      style={[Typography.caption, { color: Colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {item.transaction.recipient.slice(0, 16)}...
                    </Text>
                  </View>
                </View>
                <DecisionBadge decision={item.decision} size="sm" />
              </TouchableOpacity>
            </Card>
          )}
        />
      )}
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
  },
  lockIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockText: {
    fontSize: 24,
  },
  statsCard: {
    marginBottom: Spacing.xl,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  sendButton: {
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  emptyCard: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  historyItem: {
    marginBottom: Spacing.sm,
  },
  historyContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyLeft: {
    flex: 1,
  },
  historyTextContainer: {
    gap: Spacing.xs,
  },
});
