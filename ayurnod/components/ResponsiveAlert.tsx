import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../lib/theme';

interface ResponsiveAlertProps {
  children: React.ReactNode;
  type?: 'info' | 'success' | 'warning' | 'error';
  style?: any;
}

export default function ResponsiveAlert({ 
  children, 
  type = 'info',
  style 
}: ResponsiveAlertProps) {
  const getTypeColor = () => {
    switch (type) {
      case 'success':
        return theme.colors.success;
      case 'warning':
        return theme.colors.warning;
      case 'error':
        return theme.colors.error;
      default:
        return theme.colors.primary;
    }
  };

  return (
    <View style={[styles.alert, { backgroundColor: getTypeColor() }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  alert: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    color: '#ffffff',
  },
});