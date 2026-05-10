/**
 * SafeAreaWrapper Component
 * Consistent safe area wrapper with standard padding
 */

import React from 'react';
import { SafeAreaView, StyleSheet, ScrollViewProps, View, ViewProps } from 'react-native';
import { Colors, Spacing } from '../themes';

interface SafeAreaWrapperProps extends ViewProps {
  children: React.ReactNode;
  scroll?: boolean;
  scrollProps?: ScrollViewProps;
}

export const SafeAreaWrapper: React.FC<SafeAreaWrapperProps> = ({
  children,
  scroll = false,
  scrollProps,
  style,
  ...props
}) => {
  const content = (
    <View style={[styles.container, style]} {...props}>
      {children}
    </View>
  );

  if (scroll) {
    const { ScrollView } = require('react-native');
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          {...scrollProps}
        >
          {content}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {content}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
});
