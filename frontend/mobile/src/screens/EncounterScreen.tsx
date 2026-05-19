import { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { send } from '@/lib/api';
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Encounter'>;

export default function EncounterScreen({ navigation }: Props): React.ReactElement {
  const [patientId, setPatientId] = useState('');
  const [encounterType, setEncounterType] = useState('office');
  const [note, setNote] = useState('');
  const [encounterId, setEncounterId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const start = async (): Promise<void> => {
    setBusy(true);
    try {
      const result = await send<{ id: string; queued?: true }>('POST', '/v1/clinical-doc/encounters', {
        patientId, providerId: 'self', stateCode: 'NC', encounterType,
      });
      if ('queued' in result) {
        Alert.alert('Offline', 'Encounter queued for sync when you reconnect.');
        return;
      }
      setEncounterId(result.id);
    } catch (err) {
      Alert.alert('Failed', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submitNote = async (): Promise<void> => {
    if (!encounterId) return;
    setBusy(true);
    try {
      await send('POST', `/v1/clinical-doc/encounters/${encounterId}/note`, { text: note });
      Alert.alert('Saved', 'Note saved. Clinical NLP is suggesting codes.');
    } catch (err) {
      Alert.alert('Failed', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.section}>1. Start encounter</Text>
        <Text style={styles.label}>Patient UUID</Text>
        <TextInput
          style={styles.input} placeholder="Search or scan QR…"
          value={patientId} onChangeText={setPatientId}
          editable={!encounterId}
        />
        <Text style={styles.label}>Encounter type</Text>
        <View style={styles.row}>
          {['office', 'telehealth', 'home', 'crisis'].map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, encounterType === t && styles.chipActive]}
              onPress={() => !encounterId && setEncounterType(t)}
            >
              <Text style={[styles.chipText, encounterType === t && { color: 'white' }]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {!encounterId && (
          <TouchableOpacity style={[styles.button, busy && { opacity: 0.5 }]} onPress={start} disabled={busy || !patientId}>
            <Ionicons name="play" size={16} color="white" />
            <Text style={styles.buttonText}>{busy ? 'Starting…' : 'Start encounter'}</Text>
          </TouchableOpacity>
        )}
        {encounterId && (
          <Text style={styles.statusOk}>✓ Encounter {encounterId.slice(0, 8)}… active</Text>
        )}
      </View>

      {encounterId && (
        <View style={styles.card}>
          <Text style={styles.section}>2. Capture note</Text>
          <TextInput
            style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]}
            multiline placeholder="Dictation, observations, plan…"
            value={note} onChangeText={setNote}
          />
          <TouchableOpacity style={[styles.button, busy && { opacity: 0.5 }]} onPress={submitNote} disabled={busy || !note}>
            <Ionicons name="cloud-upload" size={16} color="white" />
            <Text style={styles.buttonText}>{busy ? 'Saving…' : 'Save & code'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  card:      { margin: 16, backgroundColor: 'white', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 },
  section:   { fontSize: 15, fontWeight: '600', color: '#0f172a', marginBottom: 12 },
  label:     { fontSize: 13, fontWeight: '500', color: '#334155', marginTop: 10, marginBottom: 6 },
  input:     { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, fontSize: 15 },
  row:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:      { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive:{ backgroundColor: '#2168e3', borderColor: '#2168e3' },
  chipText:  { fontSize: 13, color: '#334155' },
  button:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingVertical: 12, borderRadius: 8, backgroundColor: '#2168e3' },
  buttonText:{ color: 'white', fontWeight: '600' },
  statusOk:  { marginTop: 12, color: '#15803d', fontWeight: '500' },
});
