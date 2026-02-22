import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { theme } from '../lib/theme';

interface ResponsiveTextInputProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  multiline?: boolean;
  numberOfLines?: number;
  style?: any;
  keyboardType?: string;
}

export default function ResponsiveTextInput({ 
  placeholder, 
  value, 
  onChangeText, 
  multiline = false, 
  numberOfLines = 1, 
  style, 
  keyboardType = 'default'
}: ResponsiveTextInputProps) {
  return (
    <TextInput
      style={[styles.input, style]}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      multiline={multiline}
      numberOfLines={numberOfLines}
      keyboardType={keyboardType}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
    minWidth: '100%',
    maxWidth: '100%',
    minHeight: numberOfLines > 1 ? theme.spacing.md * numberOfLines : undefined,
  },
});