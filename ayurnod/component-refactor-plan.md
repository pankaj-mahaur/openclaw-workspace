# Component Refactor Plan

## Goal
Refactor existing components to use responsive design patterns while maintaining functionality.

## Target Components
1. **HomeScreen** (`app/index.tsx`) - Main symptom input screen
2. **ExplainScreen** (`app/explain.tsx`) - Lab parameter entry and explanation
3. **RootLayout** (`app/_layout.tsx`) - App-wide responsive layout
4. **Theme System** (`lib/theme.ts`) - Enhanced responsive utilities

## Refactoring Strategy

### 1. HomeScreen Refactor
**Current Issues:**
- Fixed ScrollView layout
- No responsive typography
- Basic button styling

**Improvements:**
- Use ResponsiveView for container
- Implement responsive typography
- Add responsive spacing
- Enhance button styling with theme colors

### 2. ExplainScreen Refactor
**Current Issues:**
- Static form layout
- No responsive form fields
- Basic list styling

**Improvements:**
- Responsive form grid layout
- Enhanced form validation
- Responsive list styling
- Better mobile touch targets

### 3. RootLayout Enhancement
**Current Issues:**
- Basic SafeAreaProvider only
- No responsive navigation
- Missing mobile menu

**Improvements:**
- Responsive header with navigation
- Mobile menu for smaller screens
- Adaptive SafeArea handling
- Theme integration

### 4. Theme System Expansion
**Current Issues:**
- Basic theme tokens only
- No responsive utilities
- Limited spacing system

**Improvements:**
- Enhanced responsive breakpoints
- CSS Grid utilities
- Better spacing scale
- Additional color variants

## Implementation Plan

### Phase 1: RootLayout Enhancement
```typescript
// app/_layout.tsx
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import ResponsiveView from '../components/ResponsiveView';
import { theme } from '../lib/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <ResponsiveView style={{ backgroundColor: theme.colors.background }}>
        <Slot />
      </ResponsiveView>
    </SafeAreaProvider>
  );
}
```

### Phase 2: HomeScreen Responsive Updates
```typescript
// app/index.tsx
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useAppStore } from '../lib/store';
import { useRouter } from 'expo-router';
import ResponsiveTextInput from '../components/ResponsiveTextInput';
import ResponsiveButton from '../components/ResponsiveButton';
import { theme, responsiveStyles } from '../lib/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { symptoms, addSymptom } = useAppStore();
  const [input, setInput] = useState('');

  const handleAdd = () => {
    if (!input.trim()) return;
    addSymptom(input.trim());
    setInput('');
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, responsiveStyles.container]}>
      <Text style={styles.title}>Ayurnod - AI Health Translator</Text>
      <Text style={styles.subtitle}>Enter your symptoms (one per line)</Text>

      <ResponsiveTextInput
        placeholder="e.g., Headache, fatigue, joint pain..."
        value={input}
        onChangeText={setInput}
        multiline
        numberOfLines={4}
      />

      <ResponsiveButton
        title="Add Symptom"
        onPress={handleAdd}
      />

      <View style={styles.list}>
        {symptoms.map((s) => (
          <View key={s.id} style={styles.item}>
            <Text>• {s.text}</Text>
          </View>
        ))}
      </View>

      {symptoms.length > 0 && (
        <ResponsiveButton
          title="Continue →"
          onPress={() => router.push('/explain')}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  title: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: 10,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.muted,
    marginBottom: 20,
  },
  list: {
    marginTop: 20,
    marginBottom: 20,
  },
  item: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: 8,
  },
});
```

### Phase 3: ExplainScreen Responsive Updates
```typescript
// app/explain.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useAppStore } from '../lib/store';
import ResponsiveTextInput from '../components/ResponsiveTextInput';
import ResponsiveButton from '../components/ResponsiveButton';
import { theme, responsiveStyles } from '../lib/theme';

export default function ExplainScreen() {
  const { labParameters, addLabParameter, symptoms } = useAppStore();
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');

  const handleAddLab = () => {
    if (!name.trim() || !value.trim() || !unit.trim()) {
      Alert.alert('Missing fields', 'Please fill all lab fields');
      return;
    }
    addLabParameter(name.trim(), parseFloat(value), unit.trim());
    setName('');
    setValue('');
    setUnit('');
  };

  const handleGetExplanation = () => {
    if (labParameters.length === 0) {
      Alert.alert('No labs', 'Please add at least one lab parameter first.');
      return;
    }
    
    const labList = labParameters.map(l => `${l.name}: ${l.value} ${l.unit}`).join(', ');
    const symptomList = symptoms.map(s => s.text).join(', ') || 'no symptoms provided';

    const explanation = `[Mock AI Explanation]\n\nBased on your symptoms: ${symptomList}\nAnd your lab results: ${labList}\n\nThis is an educational interpretation. In the real app, this would be generated by an LLM with safety checks, providing plain-language explanations, confidence scores, and next-step guidance.`;
    Alert.alert('AI Explanation', explanation);
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, responsiveStyles.container]}>
      <Text style={styles.title}>Lab Entry & Explanation</Text>
      <Text style={styles.subtitle}>Enter lab parameters one by one</Text>

      <View style={styles.formGroup}>
        <ResponsiveTextInput
          placeholder="Parameter name (e.g., Hemoglobin)"
          value={name}
          onChangeText={setName}
        />
        <ResponsiveTextInput
          placeholder="Value (e.g., 12.5)"
          value={value}
          onChangeText={setValue}
          keyboardType="numeric"
        />
        <ResponsiveTextInput
          placeholder="Unit (e.g., g/dL)"
          value={unit}
          onChangeText={setUnit}
        />
      </View>

      <ResponsiveButton
        title="Add Lab Parameter"
        onPress={handleAddLab}
      />

      <View style={styles.list}>
        {labParameters.map((l) => (
          <View key={l.id} style={styles.item}>
            <Text>{l.name}: {l.value} {l.unit}</Text>
          </View>
        ))}
      </View>

      {labParameters.length > 0 && (
        <ResponsiveButton
          title="Get AI Explanation"
          onPress={handleGetExplanation}
        />
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Symptoms (for context)</Text>
        {symptoms.map((s) => (
          <Text key={s.id} style={styles.symptomItem}>
            • {s.text}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  title: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: 10,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.muted,
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  list: {
    marginTop: 20,
    marginBottom: 20,
  },
  item: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: 8,
  },
  section: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  sectionTitle: {
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: 8,
    color: theme.colors.text,
  },
  symptomItem: {
    marginBottom: 4,
  },
});
```

### Phase 4: Theme System Enhancement
```typescript
// lib/theme.ts
export const theme = {
  // ... existing theme tokens ...
  
  // Enhanced responsive utilities
  responsive: {
    containerMaxWidth: '1200px',
    mobilePadding: '20px',
    tabletPadding: '24px',
    desktopPadding: '32px',
    mobileFontSize: '14px',
    desktopFontSize: '16px',
  },
  
  // Additional color variants
  colors: {
    // ... existing colors ...
    mutedLight: '#9e9e9e',
    surfaceLight: '#f5f5f5',
    borderLight: '#e0e0e0',
  },
};
```

## Testing Strategy
1. **Visual Testing**: Check responsive behavior on different screen sizes
2. **Functional Testing**: Ensure all interactions work correctly
3. **Cross-browser Testing**: Test on Chrome, Firefox, Safari, Edge
4. **Mobile Testing**: Test touch interactions and mobile layouts

## Success Criteria
- Components adapt to different screen sizes
- Typography scales appropriately
- Touch targets are finger-friendly on mobile
- Layout remains consistent across devices
- Performance is maintained

---

*Last updated: 2026-02-22*
*Branch: component-refactor*