import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../lib/theme';

interface ResponsiveFormProps {
  children: React.ReactNode;
  style?: any;
  spacing?: 'compact' | 'normal' | 'loose';
}

export default function ResponsiveForm({ 
  children, 
  style, 
  spacing = 'normal'
}: ResponsiveFormProps) {
  const getSpacing = () => {
    switch (spacing) {
      case 'compact':
        return theme.spacing.sm;
      case 'loose':
        return theme.spacing.lg;
      default:
        return theme.spacing.md;
    }
  };

  return (
    <View style={[styles.form, style]}>
      {React.Children.map(children, (child, index) => (
        <View key={index} style={{ marginBottom: getSpacing() }}>
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    width: '100%',
  },
});