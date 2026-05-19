import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { get } from '@/lib/api';
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'PatientDetail'>;

interface Patient {
  id: string; first_name: string; last_name: string;
  date_of_birth: string; state_code: string;
  medicaid_id: string | null; email: string | null; phone: string | null;
}

export default function PatientDetailScreen({ route, navigation }: Props): React.ReactElement {
  const { patientId } = route.params;
  const [p, setP] = useState<Patient | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    get<Patient>(`/v1/patients/${patientId}`)
      .then(setP).catch(err => setError(err.message));
  }, [patientId]);

  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;
  if (!p)    return <View style={styles.center}><Text>Loading…</Text></View>;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{p.last_name}, {p.first_name}</Text>
        <Text style={styles.meta}>DOB {p.date_of_birth}  •  {p.state_code}</Text>
        {p.medicaid_id && <Text style={styles.meta}>Medicaid {p.medicaid_id}</Text>}
      </View>

      <View style={styles.actions}>
        <ActionTile
          icon="document-text" label="Start encounter"
          onPress={() => navigation.navigate('Encounter', { encounterId: undefined })}
        />
        <ActionTile
          icon="clipboard" label="Request PA"
          onPress={() => Alert.alert('Not yet', 'PA flow coming next')}
        />
        <ActionTile
          icon="cash" label="View claims"
          onPress={() => Alert.alert('Not yet', 'Claims drill-down coming next')}
        />
        <ActionTile
          icon="medkit" label="Crisis plan"
          onPress={() => Alert.alert('Biometric required', 'Crisis plans require biometric verification')}
        />
      </View>

      {p.email && (
        <View style={styles.card}>
          <Text style={styles.section}>Contact</Text>
          <Text style={styles.field}>Email: {p.email}</Text>
          {p.phone && <Text style={styles.field}>Phone: {p.phone}</Text>}
        </View>
      )}
    </ScrollView>
  );
}

function ActionTile({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }): React.ReactElement {
  return (
    <TouchableOpacity style={styles.tile} onPress={onPress}>
      <Ionicons name={icon} size={26} color="#2168e3" />
      <Text style={styles.tileLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  error:     { color: '#b91c1c' },
  header:    { padding: 20, backgroundColor: 'white' },
  name:      { fontSize: 20, fontWeight: '600', color: '#0f172a' },
  meta:      { fontSize: 13, color: '#64748b', marginTop: 4 },
  actions:   { padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile:      { width: '48%', alignItems: 'center', padding: 16, backgroundColor: 'white', borderRadius: 10 },
  tileLabel: { fontSize: 13, fontWeight: '500', color: '#334155', marginTop: 8 },
  card:      { margin: 16, padding: 16, backgroundColor: 'white', borderRadius: 10 },
  section:   { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  field:     { fontSize: 14, color: '#334155', marginTop: 4 },
});
