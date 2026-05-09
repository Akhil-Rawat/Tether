import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import { Colors, Typography, Spacing } from '../themes';

interface LoadingOverlayProps {
  visible: boolean;
  title: string;
  subtitle?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  title,
  subtitle,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[Typography.bodyStrong, styles.title]}>{title}</Text>
          {subtitle ? (
            <Text style={[Typography.caption, styles.subtitle]}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 20, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    padding: Spacing.xl,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  title: {
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});
