import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { theme } from '../lib/theme';

interface ResponsiveCardProps {
  children: React.ReactNode;
  style?: any;
  title?: string;
  subtitle?: string;
}

export default function ResponsiveCard({ 
  children, 
  style, 
  title,
  subtitle
}: ResponsiveCardProps) {
  return (
    <View style={[styles.card, style]}>
      {title && (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>>
      )}
      {children}
    </View>>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  header: {
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.muted,
  },
});