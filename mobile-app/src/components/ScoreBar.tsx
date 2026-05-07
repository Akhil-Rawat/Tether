/**
 * ScoreBar Component
 * Visual representation of scores (risk, confidence, etc.)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../themes';

interface ScoreBarProps {
  label: string;
  value: number; // 0-100
  color?: string;
  showValue?: boolean;
}

export const ScoreBar: React.FC<ScoreBarProps> = ({
  label,
  value,
  color,
  showValue = true,
}) => {
  // Determine color based on value if not provided
  const getColor = () => {
    if (color) return color;
    if (value >= 70) return Colors.success;
    if (value >= 40) return Colors.warning;
    return Colors.error;
  };

  const displayColor = getColor();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[Typography.bodyStrong, { color: Colors.textPrimary }]}>
          {label}
        </Text>
        {showValue && (
          <Text style={[Typography.bodyStrong, { color: displayColor }]}>
            {Math.round(value)}%
          </Text>
        )}
      </View>
      <View style={[styles.barBackground]}>
        <View
          style={[
            styles.barFill,
            {
              width: `${Math.min(value, 100)}%`,
              backgroundColor: displayColor,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  barBackground: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
});
