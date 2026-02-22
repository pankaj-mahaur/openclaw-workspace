import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../lib/theme';

interface ResponsiveGridProps {
  children: React.ReactNode[];
  columns?: number;
  spacing?: number;
  style?: any;
}

export default function ResponsiveGrid({ 
  children, 
  columns = 2, 
  spacing = theme.spacing.md,
  style 
}: ResponsiveGridProps) {
  const gridStyle = StyleSheet.create({
    grid: {
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing,
    },
    item: {
      flexBasis: `${100 / columns}%`,
      maxWidth: `${100 / columns}%`,
    },
  });

  return (
    <View style={[gridStyle.grid, style]}>
      {children.map((child, index) => (
        <View key={index} style={gridStyle.item}>
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});