import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { theme } from '../lib/theme';

interface ResponsiveSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  style?: any;
}

export default function ResponsiveSpinner({ 
  size = 'medium',
  color = theme.colors.primary,
  style 
}: ResponsiveSpinnerProps) {
  const getSize = () => {
    switch (size) {
      case 'small':
        return 16;
      case 'large':
        return 32;
      default:
        return 24;
    }
  };

  return (
    <View style={[styles.spinner, style]}>
      <Text style={{ fontSize: getSize(), color }}>⏳</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  spinner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});