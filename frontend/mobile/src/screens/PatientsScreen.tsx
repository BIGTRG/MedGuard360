import { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { apiFetch } from '../lib/api';
import { cachePatient, getCachedPatients } from '../lib/db';
import { COLORS } from '../constants';

interface Patient { id: string; medicaid_id: string; first_name: string; last_name: string; dob: string; state_code: string; }

export function PatientsScreen() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filtered, setFiltered] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    apiFetch<{ patients: Patient[] }>('/v1/patients')
      .then(d => {
        const list = d.patients ?? [];
        setPatients(list);
        setFiltered(list);
        list.forEach(p => cachePatient(p as any));
      })
      .catch(async () => {
        setOffline(true);
        const cached = await getCachedPatients();
        setPatients(cached as any);
        setFiltered(cached as any);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered(patients); return; }
    const q = search.toLowerCase();
    setFiltered(patients.filter(p => `${p.first_name} ${p.last_name} ${p.medicaid_id}`.toLowerCase().includes(q)));
  }, [search, patients]);

  return (
    <View style={styles.container}>
      {offline && <View style={styles.offlineBanner}><Text style={styles.offlineText}>Offline — showing cached data</Text></View>}
      <TextInput
        style={styles.search}
        value={search} onChangeText={setSearch}
        placeholder="Search by name or Medicaid ID…"
        placeholderTextColor={COLORS.gray[500]}
      />
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.brand[700]} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={p => p.id}
          renderItem={({ item: p }) => (
            <View style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{p.first_name?.[0]}{p.last_name?.[0]}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{p.first_name} {p.last_name}</Text>
                <Text style={styles.sub}>Medicaid ID: {p.medicaid_id} · {p.state_code}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No patients found</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[50] },
  offlineBanner: { backgroundColor: COLORS.warning, padding: 8, alignItems: 'center' },
  offlineText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },
  search: { margin: 16, padding: 12, backgroundColor: COLORS.white, borderRadius: 10, borderWidth: 1, borderColor: COLORS.gray[100], fontSize: 15, color: COLORS.gray[900] },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: COLORS.white, marginHorizontal: 16, marginBottom: 8, borderRadius: 10, elevation: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.brand[50], alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.brand[700], fontWeight: 'bold', fontSize: 16 },
  info: { marginLeft: 12 },
  name: { fontSize: 15, fontWeight: '600', color: COLORS.gray[900] },
  sub: { fontSize: 12, color: COLORS.gray[500], marginTop: 2 },
  empty: { textAlign: 'center', color: COLORS.gray[500], marginTop: 40 },
});
