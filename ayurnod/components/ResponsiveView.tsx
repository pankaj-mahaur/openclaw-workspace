import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme, responsiveStyles } from '../lib/theme';

interface ResponsiveViewProps {
  children: React.ReactNode;
  style?: any;
  fullWidth?: boolean;
}

export default function ResponsiveView({ children, style, fullWidth = false }: ResponsiveViewProps) {
  return (
    <View style={[styles.container, fullWidth ? null : responsiveStyles.container, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});