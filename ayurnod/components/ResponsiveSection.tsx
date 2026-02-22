import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../lib/theme';

interface ResponsiveSectionProps {
  title?: string;
  children: React.ReactNode;
  style?: any;
  titleStyle?: any;
  showDivider?: boolean;
}

export default function ResponsiveSection({ 
  title, 
  children, 
  style, 
  titleStyle,
  showDivider = true
}: ResponsiveSectionProps) {
  return (
    <View style={[styles.section, style]}>
      {showDivider && <View style={styles.divider} />}
      {title && (
        <Text style={[styles.title, titleStyle]}>
          {title}
        </Text>>
      )}
      {children}
    </View>>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
});