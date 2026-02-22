import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { theme } from '../lib/theme';

interface ResponsiveHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export default function ResponsiveHeader({ title, subtitle, children }: ResponsiveHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.muted,
    textAlign: 'center',
  },
});