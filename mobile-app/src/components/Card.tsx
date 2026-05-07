/**
 * Card Component
 * Reusable surface for content
 */

import React from 'react';
import { View, ViewProps } from 'react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../themes';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  padding?: number;
  variant?: 'default' | 'elevated' | 'surface';
}

export const Card: React.FC<CardProps> = ({
  children,
  padding = Spacing.lg,
  variant = 'default',
  style,
  ...props
}) => {
  const variants = {
    default: {
      backgroundColor: Colors.surface,
      borderRadius: BorderRadius.lg,
    },
    elevated: {
      backgroundColor: Colors.surface,
      borderRadius: BorderRadius.lg,
      ...Shadows.md,
    },
    surface: {
      backgroundColor: Colors.surfaceLight,
      borderRadius: BorderRadius.lg,
    },
  };

  return (
    <View
      style={[
        {
          padding,
        },
        variants[variant],
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};
