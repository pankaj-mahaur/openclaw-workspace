import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { theme } from '../lib/theme';

interface ResponsiveListItemProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  disabled?: boolean;
  showDivider?: boolean;
}

export default function ResponsiveListItem({ 
  children, 
  onPress, 
  style, 
  disabled = false,
  showDivider = true
}: ResponsiveListItemProps) {
  return (
    <View style={[styles.container, style]}>
      {showDivider && <View style={styles.divider} />}
      <TouchableOpacity
        style={styles.item}
        onPress={onPress}
        disabled={disabled}
      >
        {children}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  item: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    minHeight: 48,
    justifyContent: 'center',
  },
});