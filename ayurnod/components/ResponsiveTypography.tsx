import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { theme } from '../lib/theme';

interface ResponsiveTypographyProps {
  children: React.ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body' | 'caption';
  style?: any;
  color?: string;
}

export default function ResponsiveTypography({ 
  children, 
  variant = 'body',
  style,
  color 
}: ResponsiveTypographyProps) {
  const getTypographyStyle = () => {
    const baseStyle = {
      color: color || theme.colors.text,
      marginBottom: theme.spacing.xs,
    };

    switch (variant) {
      case 'h1':
        return {
          ...baseStyle,
          fontSize: theme.typography.fontSize.xxxl,
          fontWeight: theme.typography.fontWeight.bold,
        };
      case 'h2':
        return {
          ...baseStyle,
          fontSize: theme.typography.fontSize.xxl,
          fontWeight: theme.typography.fontWeight.bold,
        };
      case 'h3':
        return {
          ...baseStyle,
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.medium,
        };
      case 'h4':
        return {
          ...baseStyle,
          fontSize: theme.typography.fontSize.lg,
          fontWeight: theme.typography.fontWeight.medium,
        };
      case 'h5':
        return {
          ...baseStyle,
          fontSize: theme.typography.fontSize.md,
          fontWeight: theme.typography.fontWeight.medium,
        };
      case 'h6':
        return {
          ...baseStyle,
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.medium,
        };
      case 'caption':
        return {
          ...baseStyle,
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.muted,
        };
      default:
        return {
          ...baseStyle,
          fontSize: theme.typography.fontSize.md,
        };
    }
  };

  return (
    <Text style={[getTypographyStyle(), style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});