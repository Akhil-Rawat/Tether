/**
 * DecisionBadge Component
 * Visual representation of decision type (ALLOW, REJECT, DELAY, PARTIAL)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DecisionType } from '../types';
import { Colors, Typography, Spacing, BorderRadius } from '../themes';

interface DecisionBadgeProps {
  decision: DecisionType;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const DecisionBadge: React.FC<DecisionBadgeProps> = ({
  decision,
  size = 'md',
  showLabel = true,
}) => {
  const decisionStyles = {
    [DecisionType.ALLOW]: {
      backgroundColor: Colors.success,
      color: Colors.textPrimary,
      icon: '✓',
    },
    [DecisionType.REJECT]: {
      backgroundColor: Colors.error,
      color: Colors.textPrimary,
      icon: '✕',
    },
    [DecisionType.DELAY]: {
      backgroundColor: Colors.warning,
      color: '#000000',
      icon: '⏱',
    },
    [DecisionType.PARTIAL]: {
      backgroundColor: Colors.partial,
      color: Colors.textPrimary,
      icon: '◐',
    },
  };

  const sizes = {
    sm: {
      badgeSize: 40,
      fontSize: 16,
      labelSize: 11,
    },
    md: {
      badgeSize: 60,
      fontSize: 24,
      labelSize: 13,
    },
    lg: {
      badgeSize: 80,
      fontSize: 32,
      labelSize: 14,
    },
  };

  const style = decisionStyles[decision];
  const sizeStyle = sizes[size];

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.badge,
          {
            width: sizeStyle.badgeSize,
            height: sizeStyle.badgeSize,
            borderRadius: sizeStyle.badgeSize / 2,
            backgroundColor: style.backgroundColor,
          },
        ]}
      >
        <Text
          style={[
            {
              fontSize: sizeStyle.fontSize,
              color: style.color,
              fontWeight: 'bold',
            },
          ]}
        >
          {style.icon}
        </Text>
      </View>
      {showLabel && (
        <Text
          style={[
            Typography.captionStrong,
            {
              color: style.backgroundColor,
              marginTop: Spacing.sm,
            },
          ]}
        >
          {decision}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
