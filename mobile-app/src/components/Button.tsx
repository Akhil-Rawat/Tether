/**
 * Button Component
 * Reusable button with multiple variants
 */

import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../themes';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'partial';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onPress,
  style,
  ...props
}) => {
  const variants = {
    primary: {
      backgroundColor: Colors.primary,
      color: Colors.textPrimary,
    },
    secondary: {
      backgroundColor: Colors.surface,
      color: Colors.textPrimary,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    success: {
      backgroundColor: Colors.success,
      color: Colors.textPrimary,
    },
    error: {
      backgroundColor: Colors.error,
      color: Colors.textPrimary,
    },
    warning: {
      backgroundColor: Colors.warning,
      color: '#000000',
    },
    partial: {
      backgroundColor: Colors.partial,
      color: Colors.textPrimary,
    },
  };

  const sizes = {
    sm: {
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
    },
    md: {
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
    },
    lg: {
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.xl,
    },
  };

  const variantStyles = variants[variant];
  const sizeStyles = sizes[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[
        {
          ...variantStyles,
          ...sizeStyles,
          borderRadius: BorderRadius.md,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      {...props}
    >
      {loading && (
        <ActivityIndicator
          color={variantStyles.color}
          size="small"
          style={{ marginRight: Spacing.sm }}
        />
      )}
      <Text
        style={[
          Typography.bodyStrong,
          {
            color: variantStyles.color,
          },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
});
