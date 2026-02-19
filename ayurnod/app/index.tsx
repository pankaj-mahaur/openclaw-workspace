import { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView } from 'react-native';
import { useAppStore } from '../lib/store';
import { useRouter } from 'expo-router';

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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Ayurnod - AI Health Translator</Text>
      <Text style={styles.subtitle}>Enter your symptoms (one per line)</Text>

      <TextInput
        style={styles.input}
        multiline
        numberOfLines={4}
        placeholder="e.g., Headache, fatigue, joint pain..."
        value={input}
        onChangeText={setInput}
      />

      <Button title="Add Symptom" onPress={handleAdd} />

      <View style={styles.list}>
        {symptoms.map((s) => (
          <View key={s.id} style={styles.item}>
            <Text>• {s.text}</Text>
          </View>
        ))}
      </View>

      {symptoms.length > 0 && (
        <Button title="Continue →" onPress={() => router.push('/explain')} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  list: {
    marginTop: 20,
    marginBottom: 20,
  },
  item: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});
