import { create } from 'zustand';

interface Symptom {
  id: string;
  text: string;
  timestamp: Date;
}

interface LabParameter {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
}

interface HealthMemory {
  symptomLog: Symptom[];
  labEntries: LabParameter[];
}

interface AppState {
  symptoms: Symptom[];
  labParameters: LabParameter[];
  healthMemory: HealthMemory;
  addSymptom: (text: string) => void;
  addLabParameter: (name: string, value: number, unit: string) => void;
  clearSession: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  symptoms: [],
  labParameters: [],
  healthMemory: { symptomLog: [], labEntries: [] },
  addSymptom: (text) =>
    set((state) => {
      const newSymptom: Symptom = {
        id: Date.now().toString(),
        text,
        timestamp: new Date(),
      };
      return {
        symptoms: [...state.symptoms, newSymptom],
        healthMemory: {
          ...state.healthMemory,
          symptomLog: [...state.healthMemory.symptomLog, newSymptom],
        },
      };
    }),
  addLabParameter: (name, value, unit) =>
    set((state) => {
      const newLab: LabParameter = {
        id: Date.now().toString(),
        name,
        value,
        unit,
        timestamp: new Date(),
      };
      return {
        labParameters: [...state.labParameters, newLab],
        healthMemory: {
          ...state.healthMemory,
          labEntries: [...state.healthMemory.labEntries, newLab],
        },
      };
    }),
  clearSession: () =>
    set({
      symptoms: [],
      labParameters: [],
      healthMemory: { symptomLog: [], labEntries: [] },
    }),
}));
